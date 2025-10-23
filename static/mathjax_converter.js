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
        
        // Serialize the cloned SVG
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