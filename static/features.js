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
            mimeType = 'image/jpeg',
            // New compression options
            preserveAspectRatio = true,
            compressionLevel = 'medium' // 'low', 'medium', 'high'
        } = options;
        
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                // Calculate new dimensions
                let { width, height } = img;
                
                // Apply compression level adjustments
                let adjustedQuality = quality;
                if (compressionLevel === 'high') {
                    adjustedQuality = 0.7; // Higher compression (lower quality)
                } else if (compressionLevel === 'low') {
                    adjustedQuality = 0.9; // Lower compression (higher quality)
                }
                
                if (width > maxWidth || height > maxHeight) {
                    if (preserveAspectRatio) {
                        const ratio = Math.min(maxWidth / width, maxHeight / height);
                        width *= ratio;
                        height *= ratio;
                    } else {
                        // Don't preserve aspect ratio, just fit in the bounds
                        width = Math.min(width, maxWidth);
                        height = Math.min(height, maxHeight);
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                
                // Draw and compress
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob(resolve, mimeType, adjustedQuality);
            }; 
            
            img.src = URL.createObjectURL(file);
        });
    }
    
    // Enhanced compression with specific quality presets
    static async compressWithPreset(file, preset = 'medium') {
        const options = {};
        
        switch(preset) {
            case 'low':
                options.quality = 0.9;
                options.compressionLevel = 'low';
                break;
            case 'high':
                options.quality = 0.7;
                options.compressionLevel = 'high';
                break;
            case 'max':
                options.quality = 0.5;
                options.compressionLevel = 'high';
                options.maxWidth = 1200;
                options.maxHeight = 800;
                break;
            case 'web':
                options.quality = 0.8;
                options.compressionLevel = 'medium';
                options.mimeType = 'image/webp';
                break;
            default: // medium
                options.quality = 0.8;
                options.compressionLevel = 'medium';
                break;
        }
        
        return this.compress(file, options);
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
        
        // Get compression settings from localStorage or use defaults
        const compressionPreset = localStorage.getItem('imageCompressionPreset') || 'medium';
        
        // Compress image with enhanced options
        const compressedBlob = await ImageCompressor.compressWithPreset(file, compressionPreset);
        const originalSize = file.size;
        const compressedSize = compressedBlob.size;
        
        // Generate ID and save
        const imageId = 'img_' + Date.now() + '_' + (++imageCounter);
        await imageStore.saveImage(imageId, compressedBlob, {
            name: file.name || 'pasted-image',
            originalSize: originalSize,
            type: compressedBlob.type,
            compressionPreset: compressionPreset
        });
        
        // Create object URL and insert markdown
        const objectURL = URL.createObjectURL(compressedBlob);
        const markdownImage = `![${file.name || 'image'}](${objectURL})\n`;
        
        // Insert into editor
        const editor = document.getElementById('editor');
        
        if (window.codeMirrorInstance) {
            const cm = window.codeMirrorInstance;
            const doc = cm.getDoc();
            const cursor = doc.getCursor();
            doc.replaceRange(markdownImage, cursor);
            
            // Trigger preview update
            if (window.renderMarkdown) {
                window.renderMarkdown();
            }
        } else if (editor) {
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
            const presetText = {
                'low': '低压缩',
                'medium': '中等压缩',
                'high': '高压缩',
                'max': '最大压缩',
                'web': 'WebP格式'
            }[compressionPreset] || compressionPreset;
            
            const previewDiv = document.createElement('section');
            previewDiv.className = 'image-preview-container';
            previewDiv.innerHTML = `
                <img src="${objectURL}" class="image-preview" alt="${file.name || 'image'}">
                <div class="image-info">
                    ${file.name || '粘贴的图片'} (${formatFileSize(originalSize)} → ${formatFileSize(compressedSize)}, ${presetText})
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
            // Use rendered content from preview - but we need to include MathJax font definitions
            htmlContent = preview.innerHTML;
            
            // Check if we need to include MathJax font definitions
            if (htmlContent.includes('mjx-container')) {
                // Find and include MathJax font definitions from the document
                const mjxFontDefs = document.querySelector('#MJX-SVG-global-cache');
                if (mjxFontDefs) {
                    // Prepend the font definitions to the content
                    htmlContent = mjxFontDefs.outerHTML + htmlContent;
                }
            }
        } else {
            // Render fresh content
            htmlContent = await renderMarkdownForExport(editor.value, themeSelector?.value);
        }
        
        // Check if content has MathJax elements (either SVG containers or raw formulas)
        const hasMathJaxContainers = htmlContent.includes('mjx-container');
        const hasFormulaDelimiters = htmlContent.includes('$') || htmlContent.includes('\\(') || htmlContent.includes('\\[');
        
        let fullHtml;
        
        if (hasMathJaxContainers || hasFormulaDelimiters) {
            // Include MathJax support for formula rendering
            fullHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Markdown Output</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
    <script>
        mermaid.initialize({ startOnLoad: true });
    </script>
    <!-- MathJax configuration -->
    <script>
        window.MathJax = {
            tex: {
                inlineMath: [['$', '$'], ['\\\\(', '\\\\)']],
                displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']],
                processEscapes: true,
                processEnvironments: true
            },
            svg: {
                fontCache: 'global'
            },
            startup: {
                ready: () => {
                    console.log('MathJax is loaded and ready');
                    MathJax.startup.defaultReady();
                    // Re-render any existing formulas that may have incomplete font definitions
                    if (typeof MathJax !== 'undefined' && MathJax.typesetPromise) {
                        setTimeout(() => {
                            MathJax.typesetPromise().then(() => {
                                console.log('MathJax re-rendering complete');
                            });
                        }, 100);
                    }
                }
            }
        };
    </script>
    <script type="text/javascript" id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js"></script>
</head>
<body>
    ${htmlContent}
</body>
</html>`;
        } else {
            // No formulas detected - simple HTML
            fullHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Markdown Output</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
    <script>
        mermaid.initialize({ startOnLoad: true });
    </script>
</head>
<body>
    ${htmlContent}
</body>
</html>`;
        }
        
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
        
        // Get rendered content from preview to preserve MathJax SVG elements
        const preview = document.getElementById('preview');
        let finalHtmlContent = htmlContent;
        
        if (preview && preview.innerHTML.trim()) {
            finalHtmlContent = preview.innerHTML;
            
            // Include MathJax font definitions if needed
            if (finalHtmlContent.includes('mjx-container')) {
                const mjxFontDefs = document.querySelector('#MJX-SVG-global-cache');
                if (mjxFontDefs) {
                    finalHtmlContent = mjxFontDefs.outerHTML + finalHtmlContent;
                }
            }
        }
        
        // Render content in iframe with MathJax support
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
                    /* Ensure MathJax elements are visible */
                    mjx-container {
                        display: inline-block !important;
                    }
                    mjx-container[display="block"] {
                        display: block !important;
                        text-align: center;
                        margin: 1em 0;
                    }
                </style>
            </head>
            <body>
                ${finalHtmlContent}
            </body>
            </html>
        `);
        iframeDoc.close();
        
        // Wait for content to render, including MathJax
        await new Promise(resolve => {
            iframe.onload = () => {
                // Additional wait for MathJax rendering if present
                if (finalHtmlContent.includes('mjx-container')) {
                    setTimeout(resolve, 2000); // Wait longer for MathJax
                } else {
                    setTimeout(resolve, 500);
                }
            };
            setTimeout(resolve, 3000); // Max wait 3 seconds
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
            scrollY: 0,
            // Enhanced SVG and MathJax support
            foreignObjectRendering: true,
            logging: false,
            imageTimeout: 15000,
            onclone: function(clonedDoc) {
                // Ensure SVG elements are properly handled in the clone
                const svgElements = clonedDoc.querySelectorAll('svg');
                svgElements.forEach(svg => {
                    if (!svg.getAttribute('width') || !svg.getAttribute('height')) {
                        const rect = svg.getBoundingClientRect();
                        if (rect.width && rect.height) {
                            svg.setAttribute('width', rect.width);
                            svg.setAttribute('height', rect.height);
                        }
                    }
                });
                
                // Ensure MathJax containers are visible
                const mathContainers = clonedDoc.querySelectorAll('mjx-container');
                mathContainers.forEach(container => {
                    container.style.display = container.getAttribute('display') === 'block' ? 'block' : 'inline-block';
                    container.style.visibility = 'visible';
                });
            }
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
 * Download content as PDF file
 */
async function downloadPDF() {
    const editor = document.getElementById('editor');
    const themeSelector = document.getElementById('theme-selector');
    
    if (!editor || !editor.value.trim()) {
        alert('请先输入Markdown内容');
        return;
    }

    try {
        updateStatus('正在生成PDF...');
        showLoading();
        
        // Get the preview content
        const preview = document.getElementById('preview');
        let contentHTML = '';
        
        if (preview && preview.innerHTML.trim()) {
            contentHTML = preview.innerHTML;
        } else {
            // Fallback: render content
            const response = await fetch(`${SharedUtils.CONFIG.API_BASE_URL}/render`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    markdown_text: editor.value,
                    theme: themeSelector?.value || SharedUtils.CONFIG.DEFAULT_THEME,
                    mode: SharedUtils.CONFIG.DEFAULT_MODE,
                    platform: SharedUtils.CONFIG.DEFAULT_PLATFORM,
                    dashseparator: false
                })
            });
            
            if (!response.ok) {
                throw new Error(`渲染失败: ${response.status}`);
            }
            
            const data = await response.json();
            contentHTML = data.html;
        }
        
        // Create a new window with the content to print as PDF
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Markdown Content</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        max-width: 740px;
                        margin: 0 auto;
                        padding: 20px;
                        line-height: 1.6;
                    }
                    /* Include MathJax font definitions */
                    #MJX-SVG-global-cache { display: none; }
                    /* Add page break styles */
                    @media print {
                        @page {
                            margin: 2cm;
                        }
                        body {
                            -webkit-print-color-adjust: exact;
                            color-adjust: exact;
                        }
                    }
                </style>
                <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
                <script>
                    mermaid.initialize({ startOnLoad: true });
                </script>
            </head>
            <body>
                ${contentHTML}
            </body>
            </html>
        `);
        
        printWindow.document.close();
        
        // Wait for the content to load
        printWindow.onload = function() {
            // Try to print as PDF
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
                updateStatus('PDF已生成');
                hideLoading();
            }, 1000);
        };
        
        setTimeout(() => {
            if (!printWindow.onload) {
                printWindow.print();
                printWindow.close();
                updateStatus('PDF已生成');
                hideLoading();
            }
        }, 1500);
        
    } catch (error) {
        SharedUtils.logError('Features', '生成PDF失败', error);
        updateStatus('生成PDF失败', true);
        hideLoading();
        alert('生成PDF失败: ' + error.message);
    }
}

/**
 * Download content as DOCX file
 */
async function downloadDOCX() {
    const editor = document.getElementById('editor');
    const themeSelector = document.getElementById('theme-selector');
    
    if (!editor || !editor.value.trim()) {
        alert('请先输入Markdown内容');
        return;
    }

    try {
        updateStatus('正在生成DOCX...');
        showLoading();
        
        // Convert markdown to DOCX using external service or library
        // For now, we'll generate HTML and provide a way to save it
        const response = await fetch(`${SharedUtils.CONFIG.API_BASE_URL}/render`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                markdown_text: editor.value,
                theme: themeSelector?.value || SharedUtils.CONFIG.DEFAULT_THEME,
                mode: SharedUtils.CONFIG.DEFAULT_MODE,
                platform: SharedUtils.CONFIG.DEFAULT_PLATFORM,
                dashseparator: false
            })
        });
        
        if (!response.ok) {
            throw new Error(`渲染失败: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Create a Word document-like HTML
        const docContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Markdown Document</title>
    <style>
        body {
            font-family: "Times New Roman", serif;
            margin: 40px;
            line-height: 1.6;
        }
    </style>
</head>
<body>
    ${data.html}
</body>
</html>`;
        
        const filename = generateFilename('markdown', 'docx', themeSelector?.value || 'default');
        
        // Create a data URI for the document
        const blob = new Blob([docContent], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        updateStatus('DOCX已生成');
        
    } catch (error) {
        SharedUtils.logError('Features', '生成DOCX失败', error);
        updateStatus('生成DOCX失败', true);
        alert('生成DOCX失败: ' + error.message);
    } finally {
        hideLoading();
    }
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
 * Copy preview content to clipboard as rich media format - server-compatible version
 */
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

/**
 * Convert grid layouts to table format for better WeChat compatibility
 */
function convertGridToTable(doc) {
    const gridContainers = doc.querySelectorAll('[style*="display: grid"], [style*="display:grid"]');
    
    gridContainers.forEach(grid => {
        const items = Array.from(grid.children);
        if (items.length === 0) return;
        
        // Create table structure
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
        // Parse the content using DOMParser for better manipulation
        const parser = new DOMParser();
        const doc = parser.parseFromString(preview.innerHTML, 'text/html');

        // Convert grid layouts to table format for WeChat compatibility
        convertGridToTable(doc);

        // Process images: Convert to Base64
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
                    // Keep original URL on failure
                }
            });

            await Promise.all(imagePromises);

            if (failCount > 0) {
                console.warn(`图片处理：${successCount} 成功，${failCount} 失败（保留原链接）`);
            }
        }

        // Process MathJax SVGs
        const mathContainers = doc.querySelectorAll('mjx-container[jax="SVG"]');
        if (mathContainers.length > 0) {
            console.log(`Converting ${mathContainers.length} MathJax SVG elements...`);
            
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

        // Optimize code blocks for better display
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

        // Flatten list items for better compatibility
        const listItems = doc.querySelectorAll('li');
        listItems.forEach(li => {
            let text = li.textContent || li.innerText;
            text = text.replace(/\n/g, ' ').replace(/\r/g, ' ').replace(/\s+/g, ' ').trim();
            li.innerHTML = '';
            li.textContent = text;
        });

        // Get processed content
        const processedHTML = doc.body.innerHTML;
        const plainText = doc.body.textContent || '';

        updateStatus('正在复制到剪贴板...');

        // Try Modern Clipboard API first
        if (navigator.clipboard && window.ClipboardItem) {
            try {
                console.log('Using Modern Clipboard API...');
                
                const htmlBlob = new Blob([processedHTML], { type: 'text/html' });
                const textBlob = new Blob([plainText], { type: 'text/plain' });

                await navigator.clipboard.write([
                    new ClipboardItem({
                        'text/html': htmlBlob,
                        'text/plain': textBlob
                    })
                ]);

                updateStatus('✅ 已复制到剪贴板（富文本格式）');
                console.log('Modern Clipboard API succeeded');
                return;
            } catch (error) {
                console.log('Modern Clipboard API failed:', error);
            }
        }

        // Fallback: ContentEditable method
        try {
            console.log('Using ContentEditable fallback...');
            
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
                console.log('ContentEditable method succeeded');
                return;
            }
        } catch (error) {
            console.log('ContentEditable method failed:', error);
        }

        // Final fallback: Plain text
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(plainText);
            updateStatus('✅ 已复制到剪贴板（纯文本）');
            return;
        }

        throw new Error('所有复制方法都失败了');

    } catch (error) {
        console.error('Copy failed:', error);
        updateStatus('❌ 复制失败', true);
        
        let message = `复制失败: ${error.message}`;
        if (!window.isSecureContext) {
            message += '\n\n建议使用 HTTPS 访问以获得最佳复制体验';
        }
        alert(message);
    }
}


/**
 * Helper function to extract container styles from preview
 */
function getContainerStyleFromPreview() {
    const previewElement = document.getElementById('preview');
    if (!previewElement) return '';
    
    // Look for the markdown-content section
    const contentSection = previewElement.querySelector('.markdown-content');
    if (contentSection && contentSection.style.cssText) {
        return contentSection.style.cssText;
    }
    
    // Fallback: look for any section with container-like styles
    const sections = previewElement.querySelectorAll('section');
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
    
    // Create and show loading overlay to disable UI
    const overlay = document.createElement('div');
    overlay.id = 'ai-generate-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        backdrop-filter: blur(2px);
    `;
    
    const loadingBox = document.createElement('div');
    loadingBox.style.cssText = `
        background: white;
        padding: 40px;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        text-align: center;
        min-width: 300px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
    `;
    
    const spinner = document.createElement('div');
    spinner.style.cssText = `
        width: 40px;
        height: 40px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #3498db;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 20px;
    `;
    
    const text = document.createElement('p');
    text.textContent = 'AI疯狂排版中...';
    text.style.cssText = `
        margin: 0;
        font-size: 16px;
        color: #333;
        font-weight: 500;
    `;
    
    loadingBox.appendChild(spinner);
    loadingBox.appendChild(text);
    overlay.appendChild(loadingBox);
    document.body.appendChild(overlay);
    
    // Add spin animation if not already in stylesheet
    if (!document.getElementById('ai-generate-spin-animation')) {
        const style = document.createElement('style');
        style.id = 'ai-generate-spin-animation';
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
    
    try {
        updateStatus('AI疯狂排版中...');
        
        const aiRequest = {
            prompt: `请基于"${userInput}"这个主题生成一篇完整的Markdown格式文章。要求：
1. 严格围绕"${userInput}"这个主题展开，不要添加任何与主题无关的内容
2. 所有内容必须与"${userInput}"直接相关，不得偏离主题
3. 使用合适的Markdown语法，包括标题、段落、列表、加粗等
4. 内容结构清晰，逻辑连贯，有明确的层次结构
5. 根据"${userInput}"的主题选择合适的内容深度和专业程度
6. 包含引言、主体内容和总结，但所有部分都必须紧扣主题
7. 使用中文撰写，语言流畅自然、专业准确
8. 直接输出Markdown内容，不要包含任何解释、说明或其他非Markdown内容
9. 如果主题比较具体，请深入挖掘相关内容；如果主题比较宽泛，请选择最相关的角度展开

重要：生成的所有内容必须严格基于"${userInput}"，严禁添加任何与"${userInput}"无关的信息、例子或扩展内容。`,
            context: "用户需要生成与指定主题严格相关的Markdown内容，要求内容专业、结构完整且高度相关，不得有任何偏离主题的内容。"
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
        if (window.codeMirrorInstance) {
            window.codeMirrorInstance.setValue(data.response);
            window.codeMirrorInstance.scrollTo(0, 0);
            window.codeMirrorInstance.focus();
            // Also update the hidden textarea for sync
            editor.value = data.response;
        } else {
            editor.value = data.response;
            editor.scrollTop = 0;
            editor.focus();
        }
        
        // Clear input
        input.value = '';
        
        // Trigger re-render and wait for it to complete
        if (window.renderMarkdown) {
            const renderPromise = window.renderMarkdown();
            
            // Wait for rendering to complete
            if (renderPromise && typeof renderPromise.then === 'function') {
                await renderPromise;
            } else {
                // If renderMarkdown doesn't return a promise, wait for DOM updates
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        updateStatus('Markdown已生成');
        
        // Close drawer after content is rendered so user can see the generated markdown
        if (window.closeLeftDrawer) {
            // Delay closing to let user see the content briefly
            await new Promise(resolve => setTimeout(resolve, 500));
            window.closeLeftDrawer();
        }
        
    } catch (error) {
        SharedUtils.logError('Features', '生成Markdown失败', error);
        alert('生成失败: ' + error.message);
        updateStatus('生成失败', true);
    } finally {
        // Remove overlay
        const overlayElement = document.getElementById('ai-generate-overlay');
        if (overlayElement) {
            overlayElement.remove();
        }
        
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
async function convertToWeChatHTML() {
    const editor = document.getElementById('editor');
    
    // Get content from CodeMirror if available, otherwise from textarea
    const content = window.codeMirrorInstance ? window.codeMirrorInstance.getValue() : (editor ? editor.value : '');
    
    if (!content.trim()) {
        alert('请先输入Markdown内容');
        return;
    }
    
    const originalContent = content;
    
    // Create and show loading overlay to disable UI
    const overlay = document.createElement('div');
    overlay.id = 'ai-format-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        backdrop-filter: blur(2px);
    `;
    
    const loadingBox = document.createElement('div');
    loadingBox.style.cssText = `
        background: white;
        padding: 40px;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        text-align: center;
        min-width: 300px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
    `;
    
    const spinner = document.createElement('div');
    spinner.style.cssText = `
        width: 40px;
        height: 40px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #3498db;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 20px;
    `;
    
    const text = document.createElement('p');
    text.textContent = 'AI疯狂排版中...';
    text.style.cssText = `
        margin: 0;
        font-size: 16px;
        color: #333;
        font-weight: 500;
    `;
    
    loadingBox.appendChild(spinner);
    loadingBox.appendChild(text);
    overlay.appendChild(loadingBox);
    document.body.appendChild(overlay);
    
    // Add spin animation if not already in stylesheet
    if (!document.getElementById('ai-format-spin-animation')) {
        const style = document.createElement('style');
        style.id = 'ai-format-spin-animation';
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Disable all interactive elements
    const interactiveElements = document.querySelectorAll('button, input, textarea, select, [contenteditable="true"]');
    const disabledElements = [];
    interactiveElements.forEach(el => {
        if (el !== editor) {  // Don't disable the editor itself
            if (el.tagName === 'BUTTON' || el.tagName === 'INPUT' || el.tagName === 'SELECT') {
                el.disabled = true;
                el.style.opacity = '0.6';
                disabledElements.push(el);
            }
        }
    });
    
    try {
        // Set flag to prevent real-time preview from overwriting AI results
        if (typeof window.isAIFormatting !== 'undefined') {
            window.isAIFormatting = true;
            SharedUtils.log('Features', 'AI formatting started - disabling real-time preview');
        }
        
        updateStatus('正在AI优化格式...');
        
        const aiRequest = {
            prompt: `请根据微信公众号HTML格式约束，将以下Markdown内容转换为符合微信渲染规范的HTML格式：

${originalContent}

必须遵守以下约束：
1. 使用 <section> 标签作为主容器，设置 width: 677px; margin: 0 auto;
2. 背景色使用 linear-gradient 语法，禁止使用 background-color
3. SVG必须内嵌，设置 viewBox，宽高使用百分比
4. 所有样式必须内联，不能使用外部CSS
5. 标题使用 <h1>, <h2>, <h3>，正文使用 <p>
6. 颜色值使用十六进制、RGB或RGBA格式
7. 尺寸单位使用 px 或 %，禁止使用 em, rem, vh, vw
8. 布局使用 flex 或 block，避免使用 CSS Grid
9. 确保在微信内置浏览器中正常显示
10. 支持微信公众号编辑器导入`,
            context: "用户需要将Markdown内容转换为微信公众号HTML格式，必须严格遵守微信渲染约束。"
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
            // Show the result in a modal overlay with copy button
            // Do NOT modify editor or preview pane - keep them unchanged
            try {
                showAIResultModal(data.response);
                updateStatus('AI格式优化完成（在模态框中查看并复制结果）');
            } catch (modalError) {
                throw new Error('模态框显示失败: ' + modalError.message);
            }
        } else {
            throw new Error(data.message || 'AI优化失败');
        }
        
    } catch (error) {
        SharedUtils.logError('Features', '转换失败', error);
        alert('转换失败: ' + error.message);
        updateStatus('转换失败', true);
        
        // Clear flag on error to allow normal rendering
        if (typeof window.isAIFormatting !== 'undefined') {
            window.isAIFormatting = false;
        }
    } finally {
        // Remove overlay and re-enable UI (but keep isAIFormatting = true to preserve AI result)
        const overlayElement = document.getElementById('ai-format-overlay');
        if (overlayElement) {
            overlayElement.remove();
        }
        
        // Re-enable all disabled elements
        disabledElements.forEach(el => {
            el.disabled = false;
            el.style.opacity = '1';
        });
        
        // Note: window.isAIFormatting remains true to prevent overwriting AI result
        // User must manually clear it to re-enable normal rendering
    }
}

/**
 * Show AI result in a modal overlay with copy button
 */
function showAIResultModal(htmlContent) {
    // Create modal backdrop
    const modalBackdrop = document.createElement('div');
    modalBackdrop.id = 'ai-result-modal-backdrop';
    modalBackdrop.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 11000;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
    `;
    
    // Create modal container
    const modal = document.createElement('div');
    modal.id = 'ai-result-modal';
    modal.style.cssText = `
        background: white;
        border-radius: 16px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25), 0 0 1px rgba(0, 0, 0, 0.1);
        max-width: 90%;
        max-height: 90vh;
        width: 900px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        animation: slideUp 0.3s ease-out;
    `;
    
    // Create header with title and close button
    const header = document.createElement('div');
    header.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 24px 30px;
        border-bottom: none;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
    `;
    
    const title = document.createElement('h2');
    title.textContent = 'AI生成结果预览';
    title.style.cssText = `
        margin: 0;
        color: white;
        font-size: 18px;
        font-weight: 600;
    `;
    header.appendChild(title);
    
    // Create header buttons container
    const headerButtons = document.createElement('div');
    headerButtons.style.cssText = `
        display: flex;
        gap: 10px;
    `;
    
    // Copy button
    const copyBtn = document.createElement('button');
    copyBtn.textContent = '📋 复制到剪贴板';
    copyBtn.style.cssText = `
        background: white;
        color: #667eea;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
    `;
    copyBtn.onmouseover = () => {
        copyBtn.style.background = '#f0f0f0';
    };
    copyBtn.onmouseout = () => {
        copyBtn.style.background = 'white';
    };
    copyBtn.onclick = async () => {
        // Copy the HTML content to clipboard
        try {
            copyBtn.textContent = '⏳ 处理中...';
            copyBtn.disabled = true;
            
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlContent, 'text/html');
            
            // Convert grid layouts to table format for WeChat compatibility
            convertGridToTable(doc);
            
            // Process images: Convert to Base64
            const images = doc.querySelectorAll('img');
            if (images.length > 0) {
                const imagePromises = Array.from(images).map(async (img) => {
                    try {
                        const base64 = await convertImageToBase64(img);
                        img.setAttribute('src', base64);
                    } catch (error) {
                        console.error('图片转换失败:', img.getAttribute('src'), error);
                    }
                });
                await Promise.all(imagePromises);
            }
            
            // Get processed content
            const processedHTML = doc.body.innerHTML;
            const plainText = doc.body.textContent || '';
            
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
                    
                    copyBtn.textContent = '✅ 已复制';
                    setTimeout(() => {
                        copyBtn.textContent = '📋 复制到剪贴板';
                        copyBtn.disabled = false;
                    }, 2000);
                    return;
                } catch (error) {
                    console.log('Modern Clipboard API failed:', error);
                }
            }
            
            // Fallback: ContentEditable method
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
                copyBtn.textContent = '✅ 已复制';
                setTimeout(() => {
                    copyBtn.textContent = '📋 复制到剪贴板';
                    copyBtn.disabled = false;
                }, 2000);
                return;
            }
            
            throw new Error('复制失败');
        } catch (error) {
            alert('复制失败: ' + error.message);
            copyBtn.textContent = '📋 复制到剪贴板';
            copyBtn.disabled = false;
        }
    };
    headerButtons.appendChild(copyBtn);
    
    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = `
        background: transparent;
        color: white;
        border: none;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s ease;
    `;
    closeBtn.onmouseover = () => {
        closeBtn.style.transform = 'scale(1.2)';
    };
    closeBtn.onmouseout = () => {
        closeBtn.style.transform = 'scale(1)';
    };
    closeBtn.onclick = () => {
        modalBackdrop.remove();
    };
    headerButtons.appendChild(closeBtn);
    header.appendChild(headerButtons);
    modal.appendChild(header);
    
    // Create content area with better scrolling
    const contentArea = document.createElement('div');
    contentArea.style.cssText = `
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 30px;
        background: #ffffff;
        font-size: 16px;
        line-height: 1.6;
        color: #333;
        -webkit-overflow-scrolling: touch;
    `;
    
    // Add scrollbar styling
    const scrollbarStyle = document.createElement('style');
    scrollbarStyle.textContent = `
        #ai-result-modal div[style*="overflow-y: auto"]::-webkit-scrollbar {
            width: 8px;
        }
        #ai-result-modal div[style*="overflow-y: auto"]::-webkit-scrollbar-track {
            background: #f1f1f1;
        }
        #ai-result-modal div[style*="overflow-y: auto"]::-webkit-scrollbar-thumb {
            background: #667eea;
            border-radius: 4px;
        }
        #ai-result-modal div[style*="overflow-y: auto"]::-webkit-scrollbar-thumb:hover {
            background: #764ba2;
        }
    `;
    document.head.appendChild(scrollbarStyle);
    
    contentArea.innerHTML = htmlContent;
    modal.appendChild(contentArea);
    
    // Create footer
    const footer = document.createElement('div');
    footer.style.cssText = `
        padding: 20px 30px;
        border-top: 1px solid #e8e8f0;
        background: #f8f9fc;
        text-align: right;
        display: flex;
        gap: 12px;
        justify-content: flex-end;
    `;
    
    const closeFooterBtn = document.createElement('button');
    closeFooterBtn.textContent = '关闭';
    closeFooterBtn.style.cssText = `
        background: #667eea;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.3s ease;
    `;
    closeFooterBtn.onmouseover = () => {
        closeFooterBtn.style.background = '#764ba2';
    };
    closeFooterBtn.onmouseout = () => {
        closeFooterBtn.style.background = '#667eea';
    };
    closeFooterBtn.onclick = () => {
        modalBackdrop.remove();
    };
    footer.appendChild(closeFooterBtn);
    modal.appendChild(footer);
    
    // Add animation keyframes
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    `;
    document.head.appendChild(style);
    
    // Assemble and show
    modalBackdrop.appendChild(modal);
    document.body.appendChild(modalBackdrop);
    
    // Close modal on backdrop click
    modalBackdrop.onclick = (e) => {
        if (e.target === modalBackdrop) {
            modalBackdrop.remove();
        }
    };
}

/**
 * Clear AI formatting and return to normal rendering
 */
function clearAIFormatting() {
    // Reset the AI formatting flag
    if (typeof window.isAIFormatting !== 'undefined') {
        window.isAIFormatting = false;
        SharedUtils.log('Features', 'AI formatting cleared - re-enabling real-time preview');
    }
    
    // Hide the clear button
    const clearBtn = document.getElementById('ai-clear-btn');
    if (clearBtn) {
        clearBtn.style.display = 'none';
    }
    
    // Show the AI format button
    const aiBtn = document.getElementById('ai-format-btn');
    if (aiBtn) {
        aiBtn.style.display = 'inline-block';
    }
    
    // Re-render the preview with current editor content
    if (window.renderMarkdown) {
        window.renderMarkdown();
    }
    
    updateStatus('已清除AI排版，返回正常预览模式');
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
    
    // Setup AI format button event listener
    const aiFormatBtn = document.getElementById('ai-format-btn');
    if (aiFormatBtn) {
        aiFormatBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            await _convertToWeChatHTML();
        });
    }
    
    SharedUtils.log('Features', '✅ Features module loaded successfully');
});

// Export all functions to window for global access
Object.assign(window, {
    // Download functions
    downloadHTML,
    downloadPNG,
    downloadPDF,
    downloadDOCX,
    downloadMD,
    downloadTXT,
    
    // Clipboard functions
    copyToClipboard,
    
    // WeChat functions
    sendToWeChatDraft,
    configureWeChat,
    
    // AI functions
    generateMarkdown,
    convertToWeChatHTML,
    showAIResultModal,
    
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

// Store original functions before exposing to window
const _convertToWeChatHTML = convertToWeChatHTML;
const _generateMarkdown = generateMarkdown;
const _copyToClipboard = copyToClipboard;
const _downloadHTML = downloadHTML;
const _downloadPNG = downloadPNG;
const _downloadMD = downloadMD;
const _downloadTXT = downloadTXT;
const _clearAIFormatting = clearAIFormatting;

// Expose key functions to global scope for onclick handlers
window.convertToWeChatHTML = async function() {
    console.log('[TEST] convertToWeChatHTML called from onclick');
    return _convertToWeChatHTML();
};
window.clearAIFormatting = _clearAIFormatting;
window.generateMarkdown = _generateMarkdown;
window.copyToClipboard = _copyToClipboard;
window.downloadHTML = _downloadHTML;
window.downloadPNG = _downloadPNG;
window.downloadMD = _downloadMD;
window.downloadTXT = _downloadTXT;

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
    convertToWeChatHTML,
    showAIResultModal,
    openLeftDrawer,
    closeLeftDrawer,
    fetchAndApplyStyle,
    initImagePaste,
    handleImageUpload,
    ImageStore,
    ImageCompressor
};

console.log('✅ Features module loaded');