/**
 * Clipboard Module
 * 
 * Handles clipboard operations:
 * - Image to Base64 conversion
 * - Grid layout to table conversion
 * - Rich text clipboard copy
 * - Content processing and optimization
 */

// =============================================================================
// IMAGE CONVERSION
// =============================================================================

/**
 * Convert images to Base64 for better clipboard compatibility
 */
async function convertImageToBase64(img) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const image = new Image();
        image.crossOrigin = 'anonymous';
        
        image.onload = () => {
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            ctx.drawImage(image, 0, 0);
            
            try {
                const base64 = canvas.toDataURL('image/png');
                resolve(base64);
            } catch (error) {
                reject(error);
            }
        };
        
        image.onerror = () => reject(new Error('Failed to load image'));
        image.src = img.src;
    });
}

// =============================================================================
// LAYOUT CONVERSION
// =============================================================================

/**
 * Convert grid layouts to table format for better WeChat compatibility
 */
function convertGridToTable(doc) {
    const gridContainers = doc.querySelectorAll('[style*="display: grid"], [style*="display:grid"]');
    
    gridContainers.forEach(grid => {
        const items = Array.from(grid.children);
        if (items.length === 0) return;
        
        const table = doc.createElement('table');
        table.style.cssText = 'width: 100%; border-collapse: collapse; margin: 16px 0;';
        
        const tbody = doc.createElement('tbody');
        const row = doc.createElement('tr');
        
        items.forEach(item => {
            const cell = doc.createElement('td');
            cell.style.cssText = 'padding: 8px; vertical-align: top; border: none;';
            cell.innerHTML = item.innerHTML;
            row.appendChild(cell);
        });
        
        tbody.appendChild(row);
        table.appendChild(tbody);
        
        grid.parentNode.replaceChild(table, grid);
    });
}

// =============================================================================
// CLIPBOARD OPERATIONS
// =============================================================================

/**
 * Advanced clipboard copy with comprehensive processing
 */
async function copyToClipboard() {
    const preview = document.getElementById('preview');
    if (!preview || !preview.innerHTML.trim()) {
        updateStatus('❌ 没有内容可复制', true);
        return;
    }

    updateStatus('正在处理内容...');

    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(preview.innerHTML, 'text/html');

        convertGridToTable(doc);

        const images = doc.querySelectorAll('img');
        if (images.length > 0) {
            updateStatus(`正在处理 ${images.length} 张图片...`);

            let successCount = 0;
            let failCount = 0;

            const imagePromises = Array.from(images).map(async (img) => {
                try {
                    const base64 = await convertImageToBase64(img);
                    img.setAttribute('src', base64);
                    successCount++;
                } catch (error) {
                    console.error('图片转换失败:', img.getAttribute('src'), error);
                    failCount++;
                }
            });

            await Promise.all(imagePromises);

            if (failCount > 0) {
                console.warn(`图片处理：${successCount} 成功，${failCount} 失败（保留原链接）`);
            }
        }

        const mathContainers = doc.querySelectorAll('mjx-container[jax="SVG"]');
                
                if (mathContainers.length > 0) {
                    for (let i = 0; i < mathContainers.length; i++) {
                const container = mathContainers[i];
                const svgElement = container.querySelector('svg');
                
                if (svgElement && window.convertMathJaxSvgToImage) {
                    try {
                        const imageDataUrl = await window.convertMathJaxSvgToImage(svgElement);
                        if (imageDataUrl) {
                            const img = document.createElement('img');
                            img.src = imageDataUrl;
                            img.style.cssText = svgElement.style.cssText;
                            img.style.display = 'inline-block';
                            img.style.verticalAlign = 'middle';
                            
                            if (svgElement.style.width) img.style.width = svgElement.style.width;
                            if (svgElement.style.height) img.style.height = svgElement.style.height;
                            
                            container.replaceChild(img, svgElement);
                        }
                    } catch (error) {
                        console.error(`MathJax SVG conversion failed:`, error);
                    }
                }
            }
        }

        const codeBlocks = doc.querySelectorAll('pre code, div[style*="border-radius"][style*="background"]');
        codeBlocks.forEach(block => {
            const codeElement = block.tagName === 'CODE' ? block : block.querySelector('code');
            if (codeElement) {
                const codeText = codeElement.textContent || codeElement.innerText;
                const pre = doc.createElement('pre');
                const code = doc.createElement('code');

                pre.style.cssText = `
                    background: linear-gradient(to bottom, #2a2c33 0%, #383a42 8px, #383a42 100%);
                    padding: 0;
                    border-radius: 6px;
                    overflow: hidden;
                    margin: 24px 0;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                `;

                code.style.cssText = `
                    color: #abb2bf;
                    font-family: "SF Mono", Consolas, Monaco, "Courier New", monospace;
                    font-size: 14px;
                    line-height: 1.7;
                    display: block;
                    white-space: pre;
                    padding: 16px 20px;
                    -webkit-font-smoothing: antialiased;
                    -moz-osx-font-smoothing: grayscale;
                `;

                code.textContent = codeText;
                pre.appendChild(code);
                
                const targetElement = block.tagName === 'CODE' ? block.parentElement : block;
                targetElement.parentNode.replaceChild(pre, targetElement);
            }
        });

        const listItems = doc.querySelectorAll('li');
        listItems.forEach(li => {
            let text = li.textContent || li.innerText;
            text = text.replace(/\n/g, ' ').replace(/\r/g, ' ').replace(/\s+/g, ' ').trim();
            li.innerHTML = '';
            li.textContent = text;
        });

        const processedHTML = doc.body.innerHTML;
        const plainText = doc.body.textContent || '';

        updateStatus('正在复制到剪贴板...');

        // Try Modern Clipboard API first
        if (navigator.clipboard && window.ClipboardItem) {
            try {
                const htmlBlob = new Blob([processedHTML], { type: 'text/html' });
                const textBlob = new Blob([plainText], { type: 'text/plain' });

                await navigator.clipboard.write([
                    new ClipboardItem({
                        'text/html': htmlBlob,
                        'text/plain': textBlob
                    })
                ]);

                updateStatus('✅ 已复制到剪贴板（富文本格式）');
                return;
            } catch (error) {
                // Modern Clipboard API failed, will try fallback
            }
        }

        // Fallback: ContentEditable method
        try {
            
            const container = document.createElement('div');
            container.style.cssText = `
                position: fixed;
                left: -9999px;
                top: 0;
                width: 800px;
                opacity: 0;
                pointer-events: none;
                background: white;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            `;
            
            container.innerHTML = processedHTML;
            container.contentEditable = true;
            
            document.body.appendChild(container);
            container.focus();
            
            const range = document.createRange();
            range.selectNodeContents(container);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            
            const success = document.execCommand('copy');
            
            selection.removeAllRanges();
            document.body.removeChild(container);
            
            if (success) {
                updateStatus('✅ 已复制到剪贴板（富文本格式）');
                return;
            }
        } catch (error) {
            // ContentEditable method failed
        }

        // Final fallback: Plain text
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(plainText);
            updateStatus('✅ 已复制到剪贴板（纯文本）');
            return;
        }

        throw new Error('所有复制方法都失败了');

    } catch (error) {
        updateStatus('❌ 复制失败', true);
        
        let message = `复制失败: ${error.message}`;
        alert(message);
        console.error(message, error);
    }
}
