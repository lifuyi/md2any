/**
 * Features Module
 * 
 * This module handles advanced features of the md2any application:
 * - Export/download functionality (HTML, PNG, MD, TXT)
 * - Image handling and processing
 * - Clipboard operations
 * - WeChat integration
 * - AI features
 * - Format customization
 */

// =============================================================================
// IMAGE HANDLING CLASSES
// =============================================================================

/**
 * ImageStore class for handling image operations
 */
class ImageStore {
    constructor() {
        this.storageKey = SharedUtils.CONFIG.IMAGE_STORAGE_KEY;
        this.images = this.loadImages();
    }
    
    init() {
        return Promise.resolve();
    }
    
    loadImages() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            SharedUtils.logError('ImageStore', 'Error loading images', error);
            return {};
        }
    }
    
    saveImages() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.images));
        } catch (error) {
            SharedUtils.logError('ImageStore', 'Error saving images', error);
        }
    }
    
    async saveImage(id, blob, metadata = {}) {
        const reader = new FileReader();
        return new Promise((resolve, reject) => {
            reader.onload = () => {
                try {
                    this.images[id] = {
                        data: reader.result,
                        metadata: {
                            ...metadata,
                            size: blob.size,
                            type: blob.type,
                            timestamp: Date.now()
                        }
                    };
                    this.saveImages();
                    resolve(id);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
        });
    }
    
    getImage(id) {
        return this.images[id] || null;
    }
    
    deleteImage(id) {
        delete this.images[id];
        this.saveImages();
    }
    
    clear() {
        this.images = {};
        this.saveImages();
    }
}

/**
 * ImageCompressor class for handling image compression
 */
class ImageCompressor {
    static async compress(file, options = {}) {
        const {
            maxWidth = SharedUtils.CONFIG.MAX_IMAGE_WIDTH,
            maxHeight = SharedUtils.CONFIG.MAX_IMAGE_HEIGHT,
            quality = SharedUtils.CONFIG.IMAGE_QUALITY,
            mimeType = 'image/jpeg'
        } = options;
        
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                // Calculate new dimensions
                let { width, height } = img;
                
                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width *= ratio;
                    height *= ratio;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                // Draw and compress
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob(resolve, mimeType, quality);
            };
            
            img.src = URL.createObjectURL(file);
        });
    }
}

// Initialize image functionality
const imageStore = new ImageStore();
let imageCounter = 0;

// =============================================================================
// IMAGE PASTE AND DRAG-DROP FUNCTIONALITY
// =============================================================================

/**
 * Initialize image paste and drag-drop functionality
 */
function initImagePaste() {
    const editor = document.getElementById('editor');
    const pasteArea = document.getElementById('imagePasteArea');
    
    // Initialize ImageStore
    imageStore.init().catch(err => {
        SharedUtils.logError('Features', 'Error initializing ImageStore', err);
    });
    
    // Paste event for the entire document
    document.addEventListener('paste', async (event) => {
        const items = event.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.type.indexOf('image') !== -1) {
                event.preventDefault();
                const file = item.getAsFile();
                if (file) {
                    await handleImageUpload(file);
                }
                break;
            }
        }
    });

    // Drag and drop events for editor
    if (editor) {
        editor.addEventListener('dragenter', (e) => {
            e.preventDefault();
            if (pasteArea) {
                pasteArea.style.display = 'block';
                pasteArea.classList.add('dragover');
            }
        });

        editor.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        editor.addEventListener('dragleave', (e) => {
            e.preventDefault();
            if (!editor.contains(e.relatedTarget) && pasteArea) {
                pasteArea.classList.remove('dragover');
                setTimeout(() => {
                    if (!pasteArea.classList.contains('dragover')) {
                        pasteArea.style.display = 'none';
                    }
                }, 100);
            }
        });

        editor.addEventListener('drop', async (e) => {
            e.preventDefault();
            if (pasteArea) {
                pasteArea.classList.remove('dragover');
                pasteArea.style.display = 'none';
            }
            
            const files = e.dataTransfer?.files;
            if (!files || files.length === 0) return;

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                if (file.type.startsWith('image/')) {
                    await handleImageUpload(file);
                }
            }
        });
    }

    // Also handle paste area directly
    if (pasteArea) {
        pasteArea.addEventListener('dragenter', (e) => {
            e.preventDefault();
            pasteArea.classList.add('dragover');
        });

        pasteArea.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        pasteArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            if (!pasteArea.contains(e.relatedTarget)) {
                pasteArea.classList.remove('dragover');
            }
        });

        pasteArea.addEventListener('drop', async (e) => {
            e.preventDefault();
            pasteArea.classList.remove('dragover');
            pasteArea.style.display = 'none';
            
            const files = e.dataTransfer?.files;
            if (!files || files.length === 0) return;

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                if (file.type.startsWith('image/')) {
                    await handleImageUpload(file);
                }
            }
        });
    }
}

/**
 * Handle image upload processing
 */
async function handleImageUpload(file) {
    try {
        showImageStatus('🔄 正在处理图片...', 'info');
        
        // Compress image
        const compressedBlob = await ImageCompressor.compress(file);
        const originalSize = file.size;
        const compressedSize = compressedBlob.size;
        
        // Generate ID and save
        const imageId = 'img_' + Date.now() + '_' + (++imageCounter);
        await imageStore.saveImage(imageId, compressedBlob, {
            name: file.name || 'pasted-image',
            originalSize: originalSize,
            type: compressedBlob.type
        });
        
        // Create object URL and insert markdown
        const objectURL = URL.createObjectURL(compressedBlob);
        const markdownImage = `![${file.name || 'image'}](${objectURL})\n`;
        
        // Insert into editor
        const editor = document.getElementById('editor');
        if (editor) {
            const cursorPos = editor.selectionStart;
            const textBefore = editor.value.substring(0, cursorPos);
            const textAfter = editor.value.substring(cursorPos);
            editor.value = textBefore + markdownImage + textAfter;
            editor.setSelectionRange(cursorPos + markdownImage.length, cursorPos + markdownImage.length);
            
            // Trigger preview update
            if (window.renderMarkdown) {
                window.renderMarkdown();
            }
        }
        
        // Show preview in editor pane
        const previewContainer = document.getElementById('imagePreviewContainer');
        if (previewContainer) {
            const previewDiv = document.createElement('section');
            previewDiv.className = 'image-preview-container';
            previewDiv.innerHTML = `
                <img src="${objectURL}" class="image-preview" alt="${file.name || 'image'}">
                <div class="image-info">
                    ${file.name || '粘贴的图片'} (${formatFileSize(originalSize)} → ${formatFileSize(compressedSize)})
                    <button onclick="this.parentElement.parentElement.remove()" style="margin-left: 10px; background: #f44336; color: white; border: none; padding: 2px 6px; border-radius: 2px; cursor: pointer;">删除</button>
                </div>
            `;
            previewContainer.appendChild(previewDiv);
        }
        
        const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
        showImageStatus(`✅ 图片已插入！压缩率 ${compressionRatio}%`, 'success');
        
    } catch (error) {
        SharedUtils.logError('Features', '图片处理失败', error);
        showImageStatus('❌ 图片处理失败: ' + error.message, 'error');
    }
}

/**
 * Show image status message
 */
function showImageStatus(message, type = 'info') {
    const status = document.getElementById('imagePasteStatus');
    if (status) {
        status.textContent = message;
        status.className = `image-paste-status ${type}`;
        status.style.display = 'block';
        
        setTimeout(() => {
            status.style.display = 'none';
        }, SharedUtils.CONFIG.STATUS_TIMEOUT);
    }
}

// =============================================================================
// DOWNLOAD FUNCTIONS
// =============================================================================

/**
 * Download content as HTML file
 */
async function downloadHTML() {
    const editor = document.getElementById('editor');
    const preview = document.getElementById('preview');
    const themeSelector = document.getElementById('theme-selector');
    
    if (!editor || !editor.value.trim()) {
        alert('请先输入Markdown内容');
        return;
    }

    try {
        let htmlContent;
        
        if (preview && preview.innerHTML.trim()) {
            // Use rendered content from preview
            htmlContent = preview.innerHTML;
        } else {
            // Render fresh content
            htmlContent = await renderMarkdownForExport(editor.value, themeSelector?.value);
        }
        
        const fullHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Markdown Output</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
    <script>
        mermaid.initialize({ startOnLoad: true });
    </script>
    <script type="text/javascript" id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js"></script>
</head>
<body>
    ${htmlContent}
</body>
</html>`;
        
        const filename = generateFilename('markdown', 'html', themeSelector?.value || 'default');
        downloadFile(fullHtml, filename, 'text/html');
        
    } catch (error) {
        SharedUtils.logError('Features', '下载HTML失败', error);
        alert('下载HTML失败: ' + error.message);
    }
}

/**
 * Download content as PNG image
 */
async function downloadPNG() {
    const editor = document.getElementById('editor');
    const themeSelector = document.getElementById('theme-selector');
    
    if (!editor || !editor.value.trim()) {
        alert('请先输入Markdown内容');
        return;
    }

    if (typeof html2canvas === 'undefined') {
        SharedUtils.logError('Features', 'html2canvas未定义');
        alert('PNG导出功能不可用，html2canvas库未加载');
        return;
    }

    SharedUtils.log('Features', 'html2canvas已加载，开始生成PNG');
    showLoading();
    updateStatus('正在生成PNG...');

    try {
        // Get rendered content
        const htmlContent = await renderMarkdownForExport(editor.value, themeSelector?.value);
        
        // Create temporary iframe for rendering
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.left = '-9999px';
        iframe.style.top = '0';
        iframe.style.width = '800px';
        iframe.style.height = 'auto';
        iframe.style.backgroundColor = '#ffffff';
        iframe.style.border = 'none';
        
        document.body.appendChild(iframe);
        
        // Render content in iframe
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { 
                        margin: 0; 
                        padding: 20px; 
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        background-color: #ffffff;
                        width: 760px;
                    }
                </style>
            </head>
            <body>
                ${htmlContent}
            </body>
            </html>
        `);
        iframeDoc.close();
        
        // Wait for content to render
        await new Promise(resolve => {
            iframe.onload = resolve;
            setTimeout(resolve, 1000); // Max wait 1 second
        });
        
        // Get iframe body
        const iframeBody = iframeDoc.body;
        iframeBody.style.height = 'auto';
        
        const canvas = await html2canvas(iframeBody, {
            backgroundColor: '#ffffff',
            scale: 2,
            useCORS: true,
            allowTaint: true,
            width: iframeBody.scrollWidth,
            height: iframeBody.scrollHeight,
            scrollX: 0,
            scrollY: 0
        });
        
        // Remove iframe
        document.body.removeChild(iframe);
        
        SharedUtils.log('Features', 'Canvas生成成功，尺寸:', canvas.width, 'x', canvas.height);
        
        const dataURL = canvas.toDataURL('image/png', 1.0);
        const filename = generateFilename('markdown', 'png', themeSelector?.value || 'default');
        
        // Create download link
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        updateStatus('PNG下载完成');
        SharedUtils.log('Features', 'PNG下载完成');
        
    } catch (error) {
        SharedUtils.logError('Features', 'PNG生成失败', error);
        updateStatus('PNG生成失败', true);
        alert('PNG生成失败: ' + error.message);
    } finally {
        hideLoading();
    }
}

/**
 * Download content as Markdown file
 */
function downloadMD() {
    const editor = document.getElementById('editor');
    const themeSelector = document.getElementById('theme-selector');
    
    if (!editor || !editor.value.trim()) {
        alert('请先输入Markdown内容');
        return;
    }

    const filename = generateFilename('markdown', 'md', themeSelector?.value || 'default');
    downloadFile(editor.value, filename, 'text/markdown');
}

/**
 * Download content as plain text file
 */
function downloadTXT() {
    const editor = document.getElementById('editor');
    const themeSelector = document.getElementById('theme-selector');
    
    if (!editor || !editor.value.trim()) {
        alert('请先输入Markdown内容');
        return;
    }

    // Convert markdown to plain text
    const plainText = markdownToPlainText(editor.value);
    
    const filename = generateFilename('markdown', 'txt', themeSelector?.value || 'default');
    downloadFile(plainText, filename, 'text/plain');
}

/**
 * Helper function to render markdown for export
 */
async function renderMarkdownForExport(markdown, theme) {
    // Handle split rendering if needed
    const splitCheckbox = document.getElementById('split-checkbox');
    const shouldSplit = splitCheckbox && splitCheckbox.checked;
    
    if (shouldSplit && markdown.includes('---')) {
        // Split rendering
        const sections = markdown.split(/^---$/gm).filter(section => section.trim());
        let sectionedHtml = '';
        
        for (let i = 0; i < sections.length; i++) {
            const sectionMarkdown = sections[i].trim();
            if (sectionMarkdown) {
                const response = await fetch(`${SharedUtils.CONFIG.API_BASE_URL}/render`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        markdown_text: sectionMarkdown,
                        theme: theme || SharedUtils.CONFIG.DEFAULT_THEME,
                        mode: SharedUtils.CONFIG.DEFAULT_MODE,
                        platform: SharedUtils.CONFIG.DEFAULT_PLATFORM,
                        dashseparator: false
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`渲染第${i+1}部分失败: ${response.status}`);
                }
                
                const data = await response.json();
                sectionedHtml += `<section class="markdown-section" data-section="${i+1}">\n${data.html}\n</section>\n`;
            }
        }
        
        return sectionedHtml;
    } else {
        // Normal rendering
        const response = await fetch(`${SharedUtils.CONFIG.API_BASE_URL}/render`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                markdown_text: markdown,
                theme: theme || SharedUtils.CONFIG.DEFAULT_THEME,
                mode: SharedUtils.CONFIG.DEFAULT_MODE,
                platform: SharedUtils.CONFIG.DEFAULT_PLATFORM,
                dashseparator: false
            })
        });
        
        if (!response.ok) {
            throw new Error(`渲染失败: ${response.status}`);
        }
        
        const data = await response.json();
        return data.html;
    }
}

// =============================================================================
// CLIPBOARD FUNCTIONALITY
// =============================================================================

/**
 * Copy rendered content to clipboard
 */
async function copyToClipboard() {
    const editor = document.getElementById('editor');
    const preview = document.getElementById('preview');
    
    if (!editor || !editor.value.trim()) {
        alert('请先输入Markdown内容');
        return;
    }

    // Check if preview has rendered content
    if (!preview || !preview.innerHTML.trim() || preview.innerHTML.includes('在左侧编辑器输入内容')) {
        alert('请先预览内容后再复制');
        return;
    }

    // Show loading status
    updateStatus('正在准备复制内容...');

    try {
        // Simply use the already rendered preview content
        const htmlContent = preview.innerHTML;
        
        updateStatus('正在处理图片和内容...');
        
        // Process HTML content - create isolated copy to avoid MathJax conflicts
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        
        // Convert MathJax SVG elements to images for better clipboard compatibility
        const mathJaxElements = tempDiv.querySelectorAll('mjx-container[jax="SVG"]');
        
        if (mathJaxElements.length > 0) {
            updateStatus(`正在处理数学公式 (共 ${mathJaxElements.length} 个)...`);
            
            // Process MathJax elements
            for (let index = 0; index < mathJaxElements.length; index++) {
                const container = mathJaxElements[index];
                const svg = container.querySelector('svg');
                
                if (svg) {
                    try {
                        SharedUtils.log('Features', `Processing MathJax element ${index + 1}/${mathJaxElements.length}`);
                        
                        // Convert SVG to base64 data URL
                        const dataURL = await window.convertMathJaxSvgToImage(svg);
                        
                        if (dataURL && dataURL.length > 100) {
                            // Create img element to replace the MathJax container
                            const img = document.createElement('img');
                            img.src = dataURL;
                            img.alt = 'Math formula';
                            img.style.verticalAlign = 'middle';
                            
                            // Copy dimensions from original SVG
                            const width = svg.getAttribute('width');
                            const height = svg.getAttribute('height');
                            const style = svg.getAttribute('style');
                            
                            if (width) img.style.width = width;
                            if (height) img.style.height = height;
                            if (style) img.setAttribute('style', style + '; vertical-align: middle;');
                            
                            // Replace the MathJax container with the image
                            container.parentNode.replaceChild(img, container);
                            SharedUtils.log('Features', `✓ MathJax element ${index + 1} converted successfully`);
                        }
                    } catch (error) {
                        SharedUtils.logError('Features', `Failed to convert MathJax SVG element ${index + 1}`, error);
                    }
                }
                
                // Small delay between processing elements
                await new Promise(resolve => setTimeout(resolve, 10));
            }
        }
        
        // Process regular images for better clipboard compatibility
        const images = tempDiv.querySelectorAll('img');
        if (images.length > 0) {
            updateStatus('正在处理图片 (共 ' + images.length + ' 张)...');
            
            const imagePromises = Array.from(images).map(async (img, index) => {
                try {
                    if (img.src.startsWith('blob:')) {
                        // Convert blob URL to base64 data URL
                        const response = await fetch(img.src);
                        const blob = await response.blob();
                        
                        return new Promise((resolve) => {
                            const reader = new FileReader();
                            reader.onload = () => {
                                const dataURL = reader.result;
                                if (dataURL && dataURL.length > 100) {
                                    img.src = dataURL;
                                    SharedUtils.log('Features', `图片 ${index + 1} 转换成功`);
                                }
                                resolve();
                            };
                            reader.onerror = () => {
                                SharedUtils.logError('Features', `图片 ${index + 1} 转换失败，将移除`);
                                img.remove();
                                resolve();
                            };
                            reader.readAsDataURL(blob);
                        });
                    } else if (img.src.startsWith('data:')) {
                        // Already a data URL
                        SharedUtils.log('Features', `图片 ${index + 1} 已是data URL格式`);
                    }
                } catch (error) {
                    SharedUtils.logError('Features', `处理图片 ${index + 1} 时出错`, error);
                }
            });
            
            await Promise.all(imagePromises.filter(Boolean));
        }
        
        // Clean up content
        tempDiv.querySelectorAll('script, style').forEach(el => el.remove());
        
        // Get container styles and prepare final HTML
        const containerStyle = getContainerStyleFromPreview();
        let cleanHTML;
        if (containerStyle) {
            cleanHTML = `<div style="${containerStyle}">${tempDiv.innerHTML}</div>`;
        } else {
            cleanHTML = tempDiv.innerHTML;
        }
        
        const plainText = tempDiv.textContent || tempDiv.innerText || '';
        
        updateStatus('正在复制到剪贴板...');
        
        // Try different clipboard methods
        if (hasClipboardAPI()) {
            try {
                // Modern Clipboard API (best quality)
                const clipboardHTML = `<html><body>${cleanHTML}</body></html>`;
                
                await navigator.clipboard.write([
                    new ClipboardItem({
                        'text/html': new Blob([clipboardHTML], { type: 'text/html' }),
                        'text/plain': new Blob([plainText], { type: 'text/plain' })
                    })
                ]);
                updateStatus('✅ 已复制到剪贴板（富文本格式）');
                SharedUtils.log('Features', '复制成功: 现代剪贴板API');
                return;
            } catch (error) {
                SharedUtils.logError('Features', '现代剪贴板API失败', error);
            }
        }
        
        // Fallback: ContentEditable method
        try {
            const container = document.createElement('div');
            container.contentEditable = true;
            container.innerHTML = cleanHTML;
            Object.assign(container.style, {
                position: 'fixed',
                left: '-9999px',
                opacity: '0',
                pointerEvents: 'none'
            });
            
            document.body.appendChild(container);
            
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
                SharedUtils.log('Features', '复制成功: ContentEditable方法');
                return;
            }
        } catch (error) {
            SharedUtils.logError('Features', 'ContentEditable复制失败', error);
        }
        
        // Final fallback: Plain text
        try {
            const textarea = document.createElement('textarea');
            textarea.value = plainText;
            Object.assign(textarea.style, {
                position: 'fixed',
                left: '-9999px',
                opacity: '0'
            });
            
            document.body.appendChild(textarea);
            textarea.select();
            
            const success = document.execCommand('copy');
            document.body.removeChild(textarea);
            
            if (success) {
                updateStatus('✅ 已复制到剪贴板（纯文本格式）');
                SharedUtils.log('Features', '复制成功: 纯文本方法');
                return;
            }
        } catch (error) {
            SharedUtils.logError('Features', '纯文本复制失败', error);
        }
        
        throw new Error('所有复制方法都失败了');
        
    } catch (error) {
        SharedUtils.logError('Features', '复制失败', error);
        updateStatus('❌ 复制失败', true);
        
        let message = `复制失败: ${error.message}`;
        
        if (!isSecureContext()) {
            message += '\n\n💡 提示：非安全协议可能限制剪贴板功能，建议使用 HTTPS 或 localhost';
        }
        
        message += '\n\n替代方案：\n• 手动选择预览内容复制\n• 使用下载功能保存文件\n• 刷新页面后重试';
        
        alert(message);
    }
}

/**
 * Helper function to extract container styles from preview
 */
function getContainerStyleFromPreview() {
    const preview = document.getElementById('preview');
    if (!preview) return '';
    
    // Look for the markdown-content section
    const contentSection = preview.querySelector('.markdown-content');
    if (contentSection && contentSection.style.cssText) {
        return contentSection.style.cssText;
    }
    
    // Fallback: look for any section with container-like styles
    const sections = preview.querySelectorAll('section');
    for (const section of sections) {
        if (section.style.cssText && 
            (section.style.cssText.includes('max-width') || 
             section.style.cssText.includes('margin') || 
             section.style.cssText.includes('padding'))) {
            return section.style.cssText;
        }
    }
    
    // Default container styles
    return 'max-width: 740px; margin: 0 auto; padding: 20px; font-family: "Helvetica Neue", Helvetica, Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif; font-size: 16px; line-height: 1.8; color: #333; background-color: #ffffff;';
}

// =============================================================================
// WECHAT INTEGRATION
// =============================================================================

/**
 * Send content to WeChat draft box
 */
async function sendToWeChatDraft() {
    const editor = document.getElementById('editor');
    const themeSelector = document.getElementById('theme-selector');
    
    if (!editor || !editor.value.trim()) {
        alert('请先输入Markdown内容');
        return;
    }

    const appId = localStorage.getItem('wechat_app_id') || '';
    const appSecret = localStorage.getItem('wechat_app_secret') || '';
    const thumbMediaId = localStorage.getItem('wechat_thumb_media_id') || '';
    
    if (!appId || !appSecret || appId.trim() === '' || appSecret.trim() === '') {
        alert('请先配置微信信息（AppID和AppSecret）');
        return;
    }

    showLoading();
    updateStatus('正在发送到微信草稿箱...');

    try {
        const splitCheckbox = document.getElementById('split-checkbox');
        const shouldSplit = splitCheckbox && splitCheckbox.checked;
        const markdown = editor.value;
        
        let finalMarkdown = markdown;
        if (shouldSplit && markdown.includes('---')) {
            // Handle split in frontend, add section markers for backend
            const sections = markdown.split(/^---$/gm).filter(section => section.trim());
            if (sections.length > 1) {
                finalMarkdown = sections.map((section, index) => 
                    `<!-- SECTION ${index + 1} -->\n${section.trim()}`
                ).join('\n\n---\n\n');
            }
        }
        
        const requestData = {
            appid: appId,
            secret: appSecret,
            markdown: finalMarkdown,
            style: themeSelector?.value || SharedUtils.CONFIG.DEFAULT_THEME,
            thumb_media_id: thumbMediaId
        };
        
        const response = await fetch(`${SharedUtils.CONFIG.API_BASE_URL}/wechat/send_draft`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.errcode || data.errcode === 0 || data.media_id) {
            updateStatus('已成功发送到微信草稿箱');
            alert('已成功发送到微信草稿箱\n草稿ID: ' + (data.media_id || '未知'));
        } else {
            throw new Error(`微信API错误: ${data.errmsg || '未知错误'} (${data.errcode})`);
        }
        
    } catch (error) {
        SharedUtils.logError('Features', '发送到微信草稿箱失败', error);
        updateStatus('发送失败', true);
        alert('发送到微信草稿箱失败: ' + error.message);
    } finally {
        hideLoading();
    }
}

/**
 * Configure WeChat settings
 */
function configureWeChat() {
    const appId = localStorage.getItem('wechat_app_id') || '';
    const appSecret = localStorage.getItem('wechat_app_secret') || '';
    const thumbMediaId = localStorage.getItem('wechat_thumb_media_id') || '';
    
    const newAppId = prompt('请输入微信公众号AppID:', appId);
    if (newAppId === null) return; // User cancelled
    
    const newAppSecret = prompt('请输入微信公众号AppSecret:', appSecret);
    if (newAppSecret === null) return; // User cancelled
    
    const newThumbMediaId = prompt('请输入缩略图MediaID (可选):', thumbMediaId);
    if (newThumbMediaId === null) return; // User cancelled
    
    // Save to localStorage
    if (newAppId) localStorage.setItem('wechat_app_id', newAppId);
    if (newAppSecret) localStorage.setItem('wechat_app_secret', newAppSecret);
    if (newThumbMediaId) localStorage.setItem('wechat_thumb_media_id', newThumbMediaId);
    
    alert('微信配置已保存');
}

// =============================================================================
// AI INTEGRATION
// =============================================================================

/**
 * AI-powered markdown generation
 */
async function generateMarkdown() {
    const input = document.getElementById('ai-input');
    const editor = document.getElementById('editor');
    const submitBtn = document.getElementById('ai-submit');
    
    if (!input || !editor) {
        SharedUtils.logError('Features', 'Input or editor element not found');
        return;
    }
    
    const userInput = input.value.trim();
    if (!userInput) {
        alert('请输入您想要的内容描述');
        return;
    }
    
    // Disable button and show loading state
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 生成中...';
    }
    
    try {
        updateStatus('正在生成Markdown...');
        
        const aiRequest = {
            prompt: `请基于"${userInput}"生成一篇完整的Markdown格式文章。要求：
1. 使用合适的Markdown语法，包括标题、段落、列表、加粗等
2. 内容结构清晰，逻辑连贯
3. 根据主题选择合适的内容深度和风格
4. 包含引言、主体内容和总结
5. 使用中文撰写，语言流畅自然
6. 直接输出Markdown内容，不要包含其他说明

主题：${userInput}`,
            context: "用户需要生成高质量的Markdown内容用于发布和分享，要求内容专业且有结构。"
        };
        
        const response = await fetch(`${SharedUtils.CONFIG.API_BASE_URL}/ai`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(aiRequest)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            SharedUtils.logError('Features', 'AI API error:', errorText);
            throw new Error(`AI生成失败: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'AI生成失败');
        }
        
        // Insert generated content into editor
        editor.value = data.response;
        
        // Close drawer if it exists
        if (window.closeLeftDrawer) {
            window.closeLeftDrawer();
        }
        
        // Clear input
        input.value = '';
        
        // Trigger re-render
        if (window.renderMarkdown) {
            window.renderMarkdown();
        }
        
        updateStatus('Markdown已生成');
        
    } catch (error) {
        SharedUtils.logError('Features', '生成Markdown失败', error);
        alert('生成失败: ' + error.message);
        updateStatus('生成失败', true);
    } finally {
        // Restore button state
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-magic"></i> 生成Markdown';
        }
    }
}

/**
 * AI-powered markdown formatting
 */
async function aiFormatMarkdown() {
    const editor = document.getElementById('editor');
    
    if (!editor || !editor.value.trim()) {
        alert('请先输入Markdown内容');
        return;
    }
    
    const originalContent = editor.value;
    
    try {
        updateStatus('正在AI优化格式...');
        
        const aiRequest = {
            prompt: `请优化以下Markdown内容的格式和结构，使其更加规范和易读：

${originalContent}

要求：
1. 保持原有内容含义不变
2. 优化标题层级结构
3. 改善段落分隔和缩进
4. 规范代码块格式
5. 优化列表结构
6. 确保语法正确`,
            context: "用户需要优化Markdown格式，保持内容不变但提升可读性。"
        };
        
        const response = await fetch(`${SharedUtils.CONFIG.API_BASE_URL}/ai`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(aiRequest)
        });
        
        if (!response.ok) {
            throw new Error(`AI优化失败: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            editor.value = data.response;
            
            // Trigger re-render
            if (window.renderMarkdown) {
                window.renderMarkdown();
            }
            
            updateStatus('AI格式优化完成');
        } else {
            throw new Error(data.message || 'AI优化失败');
        }
        
    } catch (error) {
        SharedUtils.logError('Features', 'AI格式优化失败', error);
        alert('AI格式优化失败: ' + error.message);
        updateStatus('AI优化失败', true);
    }
}

// =============================================================================
// LEFT DRAWER FUNCTIONALITY
// =============================================================================

/**
 * Open left drawer
 */
function openLeftDrawer() {
    const drawer = document.getElementById('left-drawer');
    const overlay = document.getElementById('drawer-overlay');
    
    if (drawer) {
        drawer.classList.add('open');
    }
    
    if (overlay) {
        overlay.classList.add('show');
    }
}

/**
 * Close left drawer
 */
function closeLeftDrawer() {
    const drawer = document.getElementById('left-drawer');
    const overlay = document.getElementById('drawer-overlay');
    
    if (drawer) {
        drawer.classList.remove('open');
    }
    
    if (overlay) {
        overlay.classList.remove('show');
    }
}

// Add keyboard shortcut for ESC to close drawer
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const drawer = document.getElementById('left-drawer');
        if (drawer && drawer.classList.contains('open')) {
            closeLeftDrawer();
        }
    }
});

// =============================================================================
// STYLE PORTER ADVANCED FUNCTIONALITY
// =============================================================================

/**
 * Fetch and apply styles from URL
 */
async function fetchAndApplyStyle() {
    const urlInput = document.getElementById('style-url-input');
    const statusDiv = document.getElementById('style-status');
    const fetchBtn = document.getElementById('fetch-style-btn');
    
    const url = urlInput.value.trim();
    if (!url) {
        showStyleStatus('请输入有效的URL', 'error');
        return;
    }
    
    if (!isValidUrl(url)) {
        showStyleStatus('请输入有效的URL格式', 'error');
        return;
    }
    
    // Show loading state
    fetchBtn.disabled = true;
    fetchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 获取中...';
    showStyleStatus('正在获取页面样式...', 'info');
    
    try {
        const response = await fetch('/api/extract-style', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: url })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            // Apply the extracted styles to the format customization
            applyExtractedStyles(result.styles);
            showStyleStatus('样式已成功提取并应用！', 'success');
            
            // Close the dialog after a short delay
            setTimeout(() => {
                if (window.closeStylePorter) {
                    window.closeStylePorter();
                }
            }, 1500);
        } else {
            showStyleStatus(result.error || '提取样式失败', 'error');
        }
    } catch (error) {
        SharedUtils.logError('Features', 'Error fetching style', error);
        showStyleStatus('获取样式时出错: ' + error.message, 'error');
    } finally {
        // Restore button state
        fetchBtn.disabled = false;
        fetchBtn.innerHTML = '<i class="fas fa-download"></i> 获取并应用样式';
    }
}

/**
 * Show style status message
 */
function showStyleStatus(message, type) {
    const statusDiv = document.getElementById('style-status');
    if (!statusDiv) return;
    
    statusDiv.textContent = message;
    statusDiv.style.display = 'block';
    
    // Set color based on type
    if (type === 'error') {
        statusDiv.style.backgroundColor = '#ffebee';
        statusDiv.style.color = '#c62828';
        statusDiv.style.border = '1px solid #ef5350';
    } else if (type === 'success') {
        statusDiv.style.backgroundColor = '#e8f5e8';
        statusDiv.style.color = '#2e7d32';
        statusDiv.style.border = '1px solid #66bb6a';
    } else {
        statusDiv.style.backgroundColor = '#e3f2fd';
        statusDiv.style.color = '#1565c0';
        statusDiv.style.border = '1px solid #42a5f5';
    }
}

/**
 * Apply extracted styles to format customization fields
 */
function applyExtractedStyles(styles) {
    const styleFields = [
        'container', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
        'p', 'strong', 'em', 'code', 'pre', 'blockquote', 
        'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'innercontainer'
    ];
    
    styleFields.forEach(field => {
        const textarea = document.getElementById(`format-${field}`);
        if (textarea && styles[field]) {
            textarea.value = styles[field];
        }
    });
    
    // Trigger format update if FormatCustomizer is available
    if (window.formatCustomizer && typeof window.formatCustomizer.previewCustomFormat === 'function') {
        window.formatCustomizer.previewCustomFormat();
    }
}

// =============================================================================
// INITIALIZATION AND EXPORTS
// =============================================================================

// Initialize features when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize image functionality
    initImagePaste();
    
    SharedUtils.log('Features', '✅ Features module loaded successfully');
});

// Export all functions to window for global access
Object.assign(window, {
    // Download functions
    downloadHTML,
    downloadPNG,
    downloadMD,
    downloadTXT,
    
    // Clipboard functions
    copyToClipboard,
    
    // WeChat functions
    sendToWeChatDraft,
    configureWeChat,
    
    // AI functions
    generateMarkdown,
    aiFormatMarkdown,
    
    // Drawer functions
    openLeftDrawer,
    closeLeftDrawer,
    
    // Style porter functions
    fetchAndApplyStyle,
    
    // Image functions
    initImagePaste,
    handleImageUpload,
    
    // Classes
    ImageStore,
    ImageCompressor
});

// Export features module
window.FeaturesModule = {
    downloadHTML,
    downloadPNG,
    downloadMD,
    downloadTXT,
    copyToClipboard,
    sendToWeChatDraft,
    configureWeChat,
    generateMarkdown,
    aiFormatMarkdown,
    openLeftDrawer,
    closeLeftDrawer,
    fetchAndApplyStyle,
    initImagePaste,
    handleImageUpload,
    ImageStore,
    ImageCompressor
};

console.log('✅ Features module loaded');