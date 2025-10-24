// MathJax SVG converter - isolated from main frontend code to avoid conflicts
// This file contains functions specifically for converting MathJax SVGs to images
// without interfering with MathJax's internal operations

// Convert MathJax SVG to image data URL
async function convertMathJaxSvgToImage(svgElement) {
    try {
        console.log('Converting MathJax SVG to image...');
        
        // Create a completely isolated clone to avoid any conflicts with MathJax
        const clonedSvg = svgElement.cloneNode(true);
        
        // Ensure proper SVG namespace
        if (!clonedSvg.hasAttribute('xmlns')) {
            clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        }
        
        // Add xlink namespace if needed
        if (clonedSvg.innerHTML && (clonedSvg.innerHTML.includes('xlink:href') || clonedSvg.innerHTML.includes('href')) && 
            !clonedSvg.hasAttribute('xmlns:xlink')) {
            clonedSvg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
        }
        
        // CRITICAL FIX: Resolve <use> elements to actual paths for self-contained SVG
        // First, collect all font definitions from various sources
        const allFontDefs = new Map(); // id -> element
        
        // Check global MathJax font cache
        const globalFontCache = document.getElementById('MathJax-SVG-global-cache');
        if (globalFontCache) {
            console.log('Found global MathJax font cache, collecting font definitions...');
            const globalDefs = globalFontCache.querySelector('defs');
            if (globalDefs) {
                Array.from(globalDefs.children).forEach(child => {
                    const id = child.getAttribute('id');
                    if (id) {
                        allFontDefs.set(id, child);
                    }
                });
                console.log(`Collected ${allFontDefs.size} font definitions from global cache`);
            }
        }
        
        // Check for any other defs elements in the document
        const allDefs = document.querySelectorAll('defs');
        allDefs.forEach(defsElement => {
            Array.from(defsElement.children).forEach(child => {
                const id = child.getAttribute('id');
                if (id && !allFontDefs.has(id)) {
                    allFontDefs.set(id, child);
                }
            });
        });
        
        // Now resolve all <use> elements in the cloned SVG
        const useElements = clonedSvg.querySelectorAll('use');
        console.log(`Found ${useElements.length} <use> elements to resolve`);
        
        useElements.forEach(useElement => {
            const href = useElement.getAttribute('href') || useElement.getAttribute('xlink:href');
            if (href && href.startsWith('#')) {
                const refId = href.substring(1);
                const referencedElement = allFontDefs.get(refId);
                
                if (referencedElement) {
                    console.log(`Resolving <use> reference to ${refId}`);
                    
                    // Create a group to replace the <use> element
                    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                    
                    // Copy attributes from <use> element (except href)
                    Array.from(useElement.attributes).forEach(attr => {
                        if (attr.name !== 'href' && attr.name !== 'xlink:href') {
                            group.setAttribute(attr.name, attr.value);
                        }
                    });
                    
                    // Clone the referenced element's content
                    if (referencedElement.tagName === 'path') {
                        // For path elements, create a new path with the same data
                        const newPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                        Array.from(referencedElement.attributes).forEach(attr => {
                            if (attr.name !== 'id') { // Don't copy the id
                                newPath.setAttribute(attr.name, attr.value);
                            }
                        });
                        group.appendChild(newPath);
                    } else {
                        // For other elements, clone them completely
                        const clonedRef = referencedElement.cloneNode(true);
                        clonedRef.removeAttribute('id'); // Remove id to avoid conflicts
                        group.appendChild(clonedRef);
                    }
                    
                    // Replace the <use> element with the resolved group
                    useElement.parentNode.replaceChild(group, useElement);
                } else {
                    console.warn(`Could not find referenced element: ${refId}`);
                }
            }
        });
        
        // If we still have unresolved <use> elements, keep essential defs as fallback
        const remainingUseElements = clonedSvg.querySelectorAll('use');
        if (remainingUseElements.length > 0) {
            console.warn(`${remainingUseElements.length} <use> elements could not be resolved, keeping defs as fallback`);
            
            // Create a minimal defs section with only the referenced elements
            let fallbackDefs = clonedSvg.querySelector('defs');
            if (!fallbackDefs) {
                fallbackDefs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
                clonedSvg.insertBefore(fallbackDefs, clonedSvg.firstChild);
            } else {
                // Clear existing defs
                fallbackDefs.innerHTML = '';
            }
            
            // Add only the definitions that are actually referenced
            const referencedIds = new Set();
            remainingUseElements.forEach(useElement => {
                const href = useElement.getAttribute('href') || useElement.getAttribute('xlink:href');
                if (href && href.startsWith('#')) {
                    referencedIds.add(href.substring(1));
                }
            });
            
            referencedIds.forEach(refId => {
                const referencedElement = allFontDefs.get(refId);
                if (referencedElement) {
                    const clonedRef = referencedElement.cloneNode(true);
                    fallbackDefs.appendChild(clonedRef);
                }
            });
            
            console.log(`Added ${fallbackDefs.children.length} fallback definitions for unresolved references`);
        } else {
            // Remove any existing defs since we've resolved all references
            const existingDefs = clonedSvg.querySelector('defs');
            if (existingDefs) {
                existingDefs.remove();
                console.log('Removed defs - all <use> elements successfully resolved');
            }
        }
        
        // Get SVG dimensions
        const bbox = clonedSvg.getBoundingClientRect();
        const width = Math.max(bbox.width || parseFloat(clonedSvg.getAttribute('width')) || 100, 50);
        const height = Math.max(bbox.height || parseFloat(clonedSvg.getAttribute('height')) || 50, 20);
        
        console.log(`MathJax SVG dimensions: ${width}x${height}`);
        
        // Create a canvas with higher resolution for better quality
        const scale = 2; // 2x scale for better quality
        const canvas = document.createElement('canvas');
        canvas.width = width * scale;
        canvas.height = height * scale;
        const ctx = canvas.getContext('2d');
        
        // Scale context for high DPI
        ctx.scale(scale, scale);
        
        // Serialize the cloned SVG with font definitions
        const serializer = new XMLSerializer();
        let svgString = serializer.serializeToString(clonedSvg);
        
        // Ensure svgString is valid
        if (!svgString) {
            console.warn('SVG serialization returned empty string, using outerHTML fallback');
            svgString = clonedSvg.outerHTML || '';
        }
        
        // Add proper XML declaration if missing
        if (svgString && !svgString.includes('<?xml')) {
            svgString = '<?xml version="1.0" standalone="no"?>\r\n' + svgString;
        }
        
        // Log SVG string for debugging
        console.log(`SVG string length: ${svgString.length}, contains defs: ${svgString.includes('<defs>')}`);
        
        // Create a blob URL for the SVG
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(svgBlob);
        
        return new Promise((resolve) => {
            const img = new Image();
            
            img.onload = function() {
                try {
                    // Clear canvas with white background
                    ctx.fillStyle = 'white';
                    ctx.fillRect(0, 0, width, height);
                    
                    // Draw the SVG image without scaling context to avoid issues
                    // Reset transform and draw at actual canvas dimensions
                    ctx.setTransform(1, 0, 0, 1, 0, 0);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    
                    // Convert to PNG data URL
                    const pngDataUrl = canvas.toDataURL('image/png');
                    
                    URL.revokeObjectURL(url);
                    console.log('✓ MathJax SVG to PNG conversion successful, size:', pngDataUrl.length);
                    
                    // Validate that we have actual image data
                    if (pngDataUrl && pngDataUrl.length > 100) { // Basic validation
                        resolve(pngDataUrl);
                    } else {
                        console.warn('MathJax SVG to PNG conversion resulted in invalid data');
                        resolve(null);
                    }
                } catch (error) {
                    console.error('Canvas drawing failed:', error);
                    URL.revokeObjectURL(url);
                    resolve(null);
                }
            };
            
            img.onerror = function() {
                console.error('SVG image loading failed');
                URL.revokeObjectURL(url);
                resolve(null);
            };
            
            // Set a timeout to avoid hanging
            setTimeout(() => {
                if (!img.complete) {
                    console.warn('SVG image loading timeout');
                    URL.revokeObjectURL(url);
                    resolve(null);
                }
            }, 3000);
            
            img.src = url;
        }).catch(error => {
            console.error('Canvas conversion promise failed:', error);
            return null;
        });
        
    } catch (error) {
        console.error('MathJax SVG conversion failed:', error);
        return null;
    }
}

// Make function available globally
window.convertMathJaxSvgToImage = convertMathJaxSvgToImage;