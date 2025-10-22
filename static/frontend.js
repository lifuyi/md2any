// Frontend functionality - works with Python backend
// API_BASE_URL is defined in app.js

// ImageStore class for handling image operations
class ImageStore {
    constructor() {
        this.storageKey = 'md2any_images';
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
            console.error('Error loading images:', error);
            return {};
        }
    }
    
    saveImages() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.images));
        } catch (error) {
            console.error('Error saving images:', error);
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

// ImageCompressor class for handling image compression
class ImageCompressor {
    static formatSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    static async compress(file, options = {}) {
        const {
            maxWidth = 1920,
            maxHeight = 1080,
            quality = 0.8,
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

// Image paste and drag-drop functionality
function initImagePaste() {
    const editor = document.getElementById('editor');
    const pasteArea = document.getElementById('imagePasteArea');
    
    // Initialize ImageStore
    imageStore.init().catch(err => {
        console.error('Error initializing ImageStore:', err);
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
                    ${file.name || '粘贴的图片'} (${ImageCompressor.formatSize(originalSize)} → ${ImageCompressor.formatSize(compressedSize)})
                    <button onclick="this.parentElement.parentElement.remove()" style="margin-left: 10px; background: #f44336; color: white; border: none; padding: 2px 6px; border-radius: 2px; cursor: pointer;">删除</button>
                </div>
            `;
            previewContainer.appendChild(previewDiv);
        }
        
        const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
        showImageStatus(`✅ 图片已插入！压缩率 ${compressionRatio}%`, 'success');
        
    } catch (error) {
        showImageStatus('❌ 图片处理失败: ' + error.message, 'error');
    }
}

function showImageStatus(message, type = 'info') {
    const status = document.getElementById('imagePasteStatus');
    if (status) {
        status.textContent = message;
        status.className = `image-paste-status ${type}`;
        status.style.display = 'block';
        
        setTimeout(() => {
            status.style.display = 'none';
        }, 3000);
    }
}

// Export functions
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
            // 处理分隔线拆分（前端实现）
            const splitCheckbox = document.getElementById('split-checkbox');
            const shouldSplit = splitCheckbox && splitCheckbox.checked;
            const markdown = editor.value;
            
            if (shouldSplit && markdown.includes('---')) {
                // 分段渲染并合并
                const sections = markdown.split(/^---$/gm).filter(section => section.trim());
                let sectionedHtml = '';
                
                for (let i = 0; i < sections.length; i++) {
                    const sectionMarkdown = sections[i].trim();
                    if (sectionMarkdown) {
                        const response = await fetch(`${API_BASE_URL}/render`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                markdown_text: sectionMarkdown,
                                theme: themeSelector?.value || 'wechat-default',
                                mode: 'light-mode',
                                platform: 'wechat',
                                dashseparator: false  // 前端已处理
                            })
                        });
                        
                        if (!response.ok) {
                            throw new Error(`渲染第${i+1}部分失败: ${response.status}`);
                        }
                        
                        const data = await response.json();
                        sectionedHtml += `<section class="markdown-section" data-section="${i+1}">\n${data.html}\n</section>\n`;
                    }
                }
                
                htmlContent = sectionedHtml;
            } else {
                // 正常渲染
                const response = await fetch(`${API_BASE_URL}/render`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        markdown_text: markdown,
                        theme: themeSelector?.value || 'wechat-default',
                        mode: 'light-mode',
                        platform: 'wechat',
                        dashseparator: false  // 前端已处理
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`渲染失败: ${response.status}`);
                }
                
                const data = await response.json();
                htmlContent = data.html;
            }
        }
        
        const fullHtml = `

<!DOCTYPE html>
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
        
        const blob = new Blob([fullHtml], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `markdown-${(themeSelector?.value || 'default').replace('.css', '')}-${Date.now()}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
    } catch (error) {
        console.error('下载HTML失败:', error);
        alert('下载HTML失败: ' + error.message);
    }
}

async function downloadPNG() {
    const editor = document.getElementById('editor');
    const themeSelector = document.getElementById('theme-selector');
    
    if (!editor || !editor.value.trim()) {
        alert('请先输入Markdown内容');
        return;
    }

    if (typeof html2canvas === 'undefined') {
        console.error('html2canvas未定义');
        alert('PNG导出功能不可用，html2canvas库未加载');
        return;
    }

    console.log('html2canvas已加载，开始生成PNG');
    showLoading();
    updateStatus('正在生成PNG...');

    try {
        // 处理分隔线拆分（前端实现）
        let htmlContent;
        const splitCheckbox = document.getElementById('split-checkbox');
        const shouldSplit = splitCheckbox && splitCheckbox.checked;
        const markdown = editor.value;
        
        if (shouldSplit && markdown.includes('---')) {
            // 分段渲染并合并
            const sections = markdown.split(/^---$/gm).filter(section => section.trim());
            let sectionedHtml = '';
            
            for (let i = 0; i < sections.length; i++) {
                const sectionMarkdown = sections[i].trim();
                if (sectionMarkdown) {
                    const response = await fetch(`${API_BASE_URL}/render`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            markdown_text: sectionMarkdown,
                            theme: themeSelector?.value || 'wechat-default',
                            mode: 'light-mode',
                            platform: 'wechat',
                            dashseparator: false  // 前端已处理
                        })
                    });
                    
                    if (!response.ok) {
                        throw new Error(`渲染第${i+1}部分失败: ${response.status}`);
                    }
                    
                    const data = await response.json();
                    sectionedHtml += `<section class="markdown-section" data-section="${i+1}">\n${data.html}\n</section>\n`;
                }
            }
            
            htmlContent = sectionedHtml;
        } else {
            // 正常渲染
            const response = await fetch(`${API_BASE_URL}/render`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    markdown_text: markdown,
                    theme: themeSelector?.value || 'wechat-default',
                    mode: 'light-mode',
                    platform: 'wechat',
                    dashseparator: false  // 前端已处理
                })
            });
            
            if (!response.ok) {
                throw new Error(`渲染失败: ${response.status}`);
            }
            
            const data = await response.json();
            htmlContent = data.html;
        }
        
        if (!response.ok) {
            throw new Error(`渲染失败: ${response.status}`);
        }
        
        const data = await response.json();
        
        // 创建一个临时iframe来渲染完整内容
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.left = '-9999px';
        iframe.style.top = '0';
        iframe.style.width = '800px';
        iframe.style.height = 'auto';
        iframe.style.backgroundColor = '#ffffff';
        iframe.style.border = 'none';
        
        document.body.appendChild(iframe);
        
        // 在iframe中渲染内容
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
                ${data.html}
            </body>
            </html>
        `);
        iframeDoc.close();
        
        // 等待内容渲染
        await new Promise(resolve => {
            iframe.onload = resolve;
            setTimeout(resolve, 1000); // 最多等待1秒
        });
        
        // 获取iframe的body元素
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
        
        // 移除iframe
        document.body.removeChild(iframe);
        
        console.log('Canvas生成成功，尺寸:', canvas.width, 'x', canvas.height);
        
        const dataURL = canvas.toDataURL('image/png', 1.0);
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = `markdown-${(themeSelector?.value || 'default')}-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        updateStatus('PNG下载完成');
        console.log('PNG下载完成');
        
    } catch (error) {
        console.error('PNG生成失败:', error);
        updateStatus('PNG生成失败', true);
        alert('PNG生成失败: ' + error.message);
    } finally {
        hideLoading();
    }
}

function downloadMD() {
    const editor = document.getElementById('editor');
    const themeSelector = document.getElementById('theme-selector');
    
    if (!editor || !editor.value.trim()) {
        alert('请先输入Markdown内容');
        return;
    }

    const blob = new Blob([editor.value], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `markdown-${(themeSelector?.value || 'default').replace('.css', '')}-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function downloadTXT() {
    const editor = document.getElementById('editor');
    const themeSelector = document.getElementById('theme-selector');
    
    if (!editor || !editor.value.trim()) {
        alert('请先输入Markdown内容');
        return;
    }

    // Convert markdown to plain text
    const plainText = editor.value
        .replace(/```[\s\S]*?```/g, '') // Remove code blocks
        .replace(/`[^`]*`/g, '') // Remove inline code
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links, keep text
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, '') // Remove images
        .replace(/^#+\s*/gm, '') // Remove headers
        .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
        .replace(/\*([^*]+)\*/g, '$1') // Remove italic
        .replace(/__([^_]+)__/g, '$1') // Remove bold
        .replace(/_([^_]+)_/g, '$1') // Remove italic
        .replace(/~~([^~]+)~~/g, '$1') // Remove strikethrough
        .replace(/^>\s*/gm, '') // Remove quotes
        .replace(/^[\d-]\.\s*/gm, '') // Remove list markers
        .replace(/^[-*]{3,}$/gm, '') // Remove horizontal rules
        .replace(/\n{3,}/g, '\n\n') // Normalize newlines
        .trim();
    
    const blob = new Blob([plainText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `markdown-${(themeSelector?.value || 'default').replace('.css', '')}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

async function copyToClipboard() {
    const editor = document.getElementById('editor');
    const preview = document.getElementById('preview');
    
    if (!editor || !editor.value.trim()) {
        alert('请先输入Markdown内容');
        return;
    }

    // Show loading status
    updateStatus('正在准备复制内容...');

    try {
        let htmlContent;
        
        // Prioritize using already rendered preview content
        if (preview && preview.innerHTML.trim() && !preview.innerHTML.includes('在左侧编辑器输入内容')) {
            htmlContent = preview.innerHTML;
        } else {
            // Re-render content if preview is empty or shows placeholder
            const themeSelector = document.getElementById('theme-selector');
            const splitCheckbox = document.getElementById('split-checkbox');
            const shouldSplit = splitCheckbox && splitCheckbox.checked;
            const markdown = editor.value;
            
            updateStatus('正在渲染内容...');
            
            if (shouldSplit && markdown.includes('---')) {
                // Handle section splitting
                const sections = markdown.split(/^---$/gm).filter(section => section.trim());
                let sectionedHtml = '';
                
                for (let i = 0; i < sections.length; i++) {
                    const sectionMarkdown = sections[i].trim();
                    if (sectionMarkdown) {
                        const response = await fetch(`${API_BASE_URL}/render`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                markdown_text: sectionMarkdown,
                                theme: themeSelector?.value || 'wechat-default',
                                mode: 'light-mode',
                                platform: 'wechat',
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
                htmlContent = sectionedHtml;
            } else {
                // Normal rendering
                const response = await fetch(`${API_BASE_URL}/render`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        markdown_text: markdown,
                        theme: themeSelector?.value || 'wechat-default',
                        mode: 'light-mode',
                        platform: 'wechat',
                        dashseparator: false
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`渲染失败: ${response.status}`);
                }
                
                const data = await response.json();
                htmlContent = data.html;
            }
        }
        
        updateStatus('正在处理图片和内容...');
        
        // Process HTML content
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        
        // Enhanced image processing for better clipboard compatibility
        const images = tempDiv.querySelectorAll('img');
        if (images.length > 0) {
            updateStatus('正在处理图片 (共 ' + images.length + ' 张)...');
            
            const imagePromises = Array.from(images).map(async (img, index) => {
                try {
                    // Handle different image sources
                    if (img.src.startsWith('blob:')) {
                        // Convert blob URL to base64 data URL
                        const response = await fetch(img.src);
                        const blob = await response.blob();
                        
                        return new Promise((resolve) => {
                            const reader = new FileReader();
                            reader.onload = () => {
                                const dataURL = reader.result;
                                img.src = dataURL;
                                
                                // Also set as base64 attribute for better compatibility
                                const base64Data = dataURL.split(',')[1];
                                const mimeType = dataURL.split(';')[0].split(':')[1];
                                img.setAttribute('data-base64', base64Data);
                                img.setAttribute('data-mime-type', mimeType);
                                
                                // Add inline styles for better rendering
                                if (!img.style.maxWidth) {
                                    img.style.maxWidth = '100%';
                                    img.style.height = 'auto';
                                    img.style.display = 'block';
                                }
                                
                                console.log(`图片 ${index + 1} 转换成功: ${mimeType}, 大小: ${Math.round(base64Data.length * 0.75 / 1024)}KB`);
                                resolve();
                            };
                            reader.onerror = () => {
                                console.warn(`图片 ${index + 1} 转换失败，将移除:`, img.src);
                                img.remove();
                                resolve();
                            };
                            reader.readAsDataURL(blob);
                        });
                    } else if (img.src.startsWith('data:')) {
                        // Already a data URL, just ensure it has proper attributes
                        const base64Data = img.src.split(',')[1];
                        const mimeType = img.src.split(';')[0].split(':')[1];
                        img.setAttribute('data-base64', base64Data);
                        img.setAttribute('data-mime-type', mimeType);
                        
                        if (!img.style.maxWidth) {
                            img.style.maxWidth = '100%';
                            img.style.height = 'auto';
                            img.style.display = 'block';
                        }
                        console.log(`图片 ${index + 1} 已是data URL格式`);
                    } else if (img.src.startsWith('http')) {
                        // External URL - try to fetch and convert
                        try {
                            const response = await fetch(img.src, { mode: 'cors' });
                            const blob = await response.blob();
                            
                            return new Promise((resolve) => {
                                const reader = new FileReader();
                                reader.onload = () => {
                                    const dataURL = reader.result;
                                    img.src = dataURL;
                                    
                                    const base64Data = dataURL.split(',')[1];
                                    const mimeType = dataURL.split(';')[0].split(':')[1];
                                    img.setAttribute('data-base64', base64Data);
                                    img.setAttribute('data-mime-type', mimeType);
                                    
                                    if (!img.style.maxWidth) {
                                        img.style.maxWidth = '100%';
                                        img.style.height = 'auto';
                                        img.style.display = 'block';
                                    }
                                    
                                    console.log(`外部图片 ${index + 1} 转换成功`);
                                    resolve();
                                };
                                reader.onerror = () => {
                                    console.warn(`外部图片 ${index + 1} 转换失败，保留原URL`);
                                    resolve();
                                };
                                reader.readAsDataURL(blob);
                            });
                        } catch (error) {
                            console.warn(`无法获取外部图片 ${index + 1}:`, error);
                            // Keep original URL but add warning
                            img.setAttribute('data-warning', '外部图片可能无法在某些应用中显示');
                        }
                    }
                } catch (error) {
                    console.warn(`处理图片 ${index + 1} 时出错:`, error);
                    // Don't remove, just add warning
                    img.setAttribute('data-warning', '图片处理失败');
                }
            });
            
            await Promise.all(imagePromises.filter(Boolean));
            console.log('所有图片处理完成');
        }
        
        // Clean up content
        tempDiv.querySelectorAll('script, style').forEach(el => el.remove());
        
        // Convert MathJax SVG elements to images for better clipboard compatibility
        const mathJaxElements = tempDiv.querySelectorAll('mjx-container[jax="SVG"]');
        
        mathJaxElements.forEach(container => {
            const svg = container.querySelector('svg');
            if (svg) {
                try {
                    // Convert SVG to base64 data URL using our reusable function
                    const dataURL = svgToBase64DataURL(svg);
                    
                    if (dataURL) {
                        // Create img element to replace the MathJax container
                        const img = document.createElement('img');
                        img.src = dataURL;
                        img.alt = 'Math formula';
                        img.style.verticalAlign = 'middle';
                        img.setAttribute('data-math', 'true'); // Mark as math element for debugging
                        
                        // Copy dimensions and important attributes from original SVG
                        const width = svg.getAttribute('width');
                        const height = svg.getAttribute('height');
                        const style = svg.getAttribute('style');
                        
                        if (width) img.style.width = width;
                        if (height) img.style.height = height;
                        if (style) img.setAttribute('style', style + '; vertical-align: middle;');
                        
                        // Replace the MathJax container with the image
                        container.parentNode.replaceChild(img, container);
                    }
                } catch (error) {
                    console.warn('Failed to convert MathJax SVG to image:', error);
                    // Keep original structure as fallback
                }
            }
        });
        
        const cleanHTML = tempDiv.innerHTML;
        const plainText = tempDiv.textContent || tempDiv.innerText || '';

        
        updateStatus('正在复制到剪贴板...');
        
        // Determine available copy methods
        const isSecureContext = location.protocol === 'https:' || 
                               location.hostname === 'localhost' || 
                               location.hostname === '127.0.0.1';
        const hasClipboardAPI = navigator.clipboard && window.ClipboardItem;
        
        // Method 1: Modern Clipboard API (best quality)
        if (hasClipboardAPI && isSecureContext) {
            try {
                // Create a more compatible HTML format for clipboard
                const clipboardHTML = `<html><body>${cleanHTML}</body></html>`;
                
                await navigator.clipboard.write([
                    new ClipboardItem({
                        'text/html': new Blob([clipboardHTML], { type: 'text/html' }),
                        'text/plain': new Blob([plainText], { type: 'text/plain' })
                    })
                ]);
                updateStatus('✅ 已复制到剪贴板（富文本格式）');
                console.log('复制成功: 现代剪贴板API，包含', images.length, '张图片');
                return;
            } catch (error) {
                console.warn('现代剪贴板API失败:', error);
            }
        }
        
        // Method 2: ContentEditable fallback (preserves formatting)
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
                console.log('复制成功: ContentEditable方法');
                return;
            }
        } catch (error) {
            console.warn('ContentEditable复制失败:', error);
        }
        
        // Method 3: Plain text fallback
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
                console.log('复制成功: 纯文本方法');
                return;
            }
        } catch (error) {
            console.warn('纯文本复制失败:', error);
        }
        
        throw new Error('所有复制方法都失败了');
        
    } catch (error) {
        console.error('复制失败:', error);
        updateStatus('❌ 复制失败', true);
        
        let message = `复制失败: ${error.message}`;
        
        if (!location.protocol.startsWith('https') && location.hostname !== 'localhost') {
            message += '\n\n💡 提示：非安全协议可能限制剪贴板功能，建议使用 HTTPS 或 localhost';
        }
        
        message += '\n\n替代方案：\n• 手动选择预览内容复制\n• 使用下载功能保存文件\n• 刷新页面后重试';
        
        // Log detailed info for debugging
        console.log('复制内容预览 (前500字符):', cleanHTML.substring(0, 500));
        if (images.length > 0) {
            console.log('图片信息:');
            images.forEach((img, index) => {
                console.log(`图片 ${index + 1}: src=${img.src.substring(0, 50)}..., 有base64属性=${!!img.getAttribute('data-base64')}`);
            });
        }
        
        alert(message);
    }
}

// Debug function to test clipboard content
function debugClipboardContent() {
    const preview = document.getElementById('preview');
    if (!preview) {
        console.log('预览区域为空');
        return;
    }
    
    const images = preview.querySelectorAll('img');
    console.log('=== 剪贴板内容调试信息 ===');
    console.log('图片总数:', images.length);
    
    images.forEach((img, index) => {
        console.log(`图片 ${index + 1}:`);
        console.log('  - src:', img.src.substring(0, 100) + (img.src.length > 100 ? '...' : ''));
        console.log('  - 是否为data URL:', img.src.startsWith('data:'));
        console.log('  - 是否有base64属性:', !!img.getAttribute('data-base64'));
        console.log('  - MIME类型:', img.getAttribute('data-mime-type'));
        if (img.src.startsWith('data:')) {
            const sizeKB = Math.round(img.src.length * 0.75 / 1024);
            console.log('  - 估计大小:', sizeKB, 'KB');
        }
    });
    
    console.log('=== HTML内容样例 ===');
    console.log(preview.innerHTML.substring(0, 500) + '...');
}

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
        // 处理分隔线拆分（前端实现）
        const splitCheckbox = document.getElementById('split-checkbox');
        const shouldSplit = splitCheckbox && splitCheckbox.checked;
        const markdown = editor.value;
        
        let finalMarkdown = markdown;
        if (shouldSplit && markdown.includes('---')) {
            // 在前端处理分隔线拆分，保持原有markdown结构
            // 但添加section标记以便后端识别
            const sections = markdown.split(/^---$/gm).filter(section => section.trim());
            if (sections.length > 1) {
                // 添加section注释标记
                finalMarkdown = sections.map((section, index) => 
                    `<!-- SECTION ${index + 1} -->\n${section.trim()}`
                ).join('\n\n---\n\n');
            }
        }
        
        const requestData = {
            appid: appId,
            secret: appSecret,
            markdown: finalMarkdown,
            style: themeSelector?.value || 'wechat-default',
            thumb_media_id: thumbMediaId
        };
        
        const response = await fetch(`${API_BASE_URL}/wechat/send_draft`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
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
            updateStatus('发送失败', true);
            let errorMsg = data.errmsg;
            // For WeChat API errors, the errmsg is already in Chinese
            if (data.detail && data.detail.errmsg) {
                errorMsg = data.detail.errmsg;
            }
            alert('发送到微信草稿箱失败: ' + errorMsg);
        }
        
    } catch (error) {
        console.error('发送失败:', error);
        updateStatus('发送失败', true);
        alert('发送到微信草稿箱失败: ' + error.message);
    } finally {
        hideLoading();
    }
}

function configureWeChat() {
    const appId = localStorage.getItem('wechat_app_id') || '';
    const appSecret = localStorage.getItem('wechat_app_secret') || '';
    const thumbMediaId = localStorage.getItem('wechat_thumb_media_id') || '';
    
    const newAppId = prompt('请输入微信公众号AppID:', appId);
    if (newAppId === null) return;
    
    const newAppSecret = prompt('请输入微信公众号AppSecret:', appSecret);
    if (newAppSecret === null) return;
    
    const newThumbMediaId = prompt('请输入缩略图Media ID (必要):', thumbMediaId);
    
    if (newAppId.trim() !== '' && newAppSecret.trim() !== '') {
        localStorage.setItem('wechat_app_id', newAppId.trim());
        localStorage.setItem('wechat_app_secret', newAppSecret.trim());
        if (newThumbMediaId !== null) {
            if (newThumbMediaId.trim() !== '') {
                localStorage.setItem('wechat_thumb_media_id', newThumbMediaId.trim());
            } else {
                localStorage.removeItem('wechat_thumb_media_id');
            }
        }
        alert('微信配置已保存');
    } else if (newAppId.trim() === '' && newAppSecret.trim() === '') {
        localStorage.removeItem('wechat_app_id');
        localStorage.removeItem('wechat_app_secret');
        localStorage.removeItem('wechat_thumb_media_id');
        alert('已清除微信配置');
    } else {
        alert('请同时输入AppID和AppSecret');
    }
}

// Utility functions
function showLoading() {
    const loading = document.getElementById('loading');
    if (loading) loading.classList.add('active');
}

function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) loading.classList.remove('active');
}

function updateStatus(message, isError = false) {
    const status = document.getElementById('status');
    if (status) {
        status.textContent = message;
        status.style.color = isError ? '#c33' : '#666';
    }
}

// Utility function to convert SVG to base64 data URL
function svgToBase64DataURL(svgElement) {
    try {
        // Properly serialize the SVG element with all namespaces
        const serializer = new XMLSerializer();
        let svgString = serializer.serializeToString(svgElement);
        
        // Ensure SVG has proper namespace and other required attributes
        if (!svgString.includes('xmlns="http://www.w3.org/2000/svg"')) {
            svgString = svgString.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
        }
        
        // Add xmlns:xlink if not present (for MathJax fonts)
        if (svgString.includes('xlink:href') && !svgString.includes('xmlns:xlink="http://www.w3.org/1999/xlink"')) {
            svgString = svgString.replace('<svg', '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
        }
        
        // Add XML declaration for better compatibility
        if (!svgString.startsWith('<?xml')) {
            svgString = '<?xml version="1.0" standalone="no"?>\r\n' + svgString;
        }
        
        // Convert to base64 using btoa (more reliable than encodeURIComponent)
        // First, we need to handle UTF-8 encoding properly
        const base64Encoded = btoa(unescape(encodeURIComponent(svgString)));
        return `data:image/svg+xml;base64,${base64Encoded}`;
    } catch (error) {
        console.warn('Failed to convert SVG to base64:', error);
        return null;
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initImagePaste, 100);
});

// Format Customization functionality
class FormatCustomizer {
    constructor() {
        this.debounceTimer = null;
        this.init();
    }
    
    init() {
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        const formatElements = [
            'container', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'p', 'strong', 'em', 'a', 'ul', 'ol', 'li',
            'blockquote', 'code', 'pre', 'hr', 'img', 'table', 'th', 'td', 'tr', 'innercontainer'
        ];
        
        formatElements.forEach(element => {
            const textarea = document.getElementById(`format-${element}`);
            if (textarea) {
                textarea.addEventListener('input', () => {
                    this.debouncePreview();
                });
            }
        });
    }
    
    debouncePreview() {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            this.previewCustomFormat();
        }, 500);
    }
    
    async previewCustomFormat() {
        const editor = document.getElementById('editor');
        if (!editor || !editor.value.trim()) return;
        
        const customStyles = {};
        const formatElements = [
            'container', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'p', 'strong', 'em', 'a', 'ul', 'ol', 'li',
            'blockquote', 'code', 'pre', 'hr', 'img', 'table', 'th', 'td', 'tr', 'innercontainer'
        ];
        
        // Collect all custom styles
        formatElements.forEach(element => {
            const textarea = document.getElementById(`format-${element}`);
            if (textarea && textarea.value.trim()) {
                customStyles[element] = textarea.value.trim();
            }
        });
        
        if (Object.keys(customStyles).length === 0) return;
        
        try {
            // Create a temporary custom style name for preview
            const previewStyleName = 'preview-custom';
            
            // Save the preview style temporarily
            const response = await fetch(`${API_BASE_URL}/custom-styles`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    style_name: previewStyleName,
                    styles: customStyles
                })
            });
            
            if (!response.ok) {
                throw new Error(`预览失败: ${response.status}`);
            }
            
            // Render with the custom style
            await this.renderWithCustomStyle(previewStyleName);
            
        } catch (error) {
            console.error('预览自定义样式失败:', error);
        }
    }
    
    async renderWithCustomStyle(styleName) {
        const editor = document.getElementById('editor');
        const preview = document.getElementById('preview');
        
        if (!editor || !preview) return;
        
        const markdown = editor.value.trim();
        if (!markdown) return;
        
        showLoading();
        updateStatus('预览自定义样式...');
        
        try {
            const requestData = {
                markdown_text: markdown,
                theme: styleName,
                mode: 'light-mode',
                platform: 'wechat'
            };
            
            const response = await fetch(`${API_BASE_URL}/render`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
                throw new Error(`渲染失败: ${response.status}`);
            }
            
            const data = await response.json();
            preview.innerHTML = data.html;
            
            // Initialize Mermaid diagrams if present
            if (typeof mermaid !== 'undefined') {
                setTimeout(() => {
                    try {
                        const mermaidElements = document.querySelectorAll('.mermaid, code.language-mermaid');
                        if (mermaidElements.length > 0) {
                            mermaid.run({
                                nodes: mermaidElements
                            }).catch(error => {
                                console.error('Mermaid rendering failed:', error);
                            });
                        }
                    } catch (error) {
                        console.error('Mermaid initialization failed:', error);
                    }
                }, 100);
            }
            
            // Initialize MathJax if present
            if (typeof window.MathJax !== 'undefined' && window.MathJax.typesetPromise) {
                setTimeout(() => {
                    try {
                        window.MathJax.typesetPromise([document.getElementById('preview')]);
                    } catch (error) {
                        console.warn('MathJax rendering failed:', error);
                    }
                }, 100);
            }
            
            updateStatus('预览完成');
            
        } catch (error) {
            console.error('预览渲染失败:', error);
            updateStatus('预览失败', true);
        } finally {
            hideLoading();
        }
    }
}

// Initialize format customizer when page loads
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (typeof FormatCustomizer !== 'undefined') {
            window.formatCustomizer = new FormatCustomizer();
        }
    }, 200);
});

// AI formatting function
async function aiFormatMarkdown() {
    const editor = document.getElementById('editor');
    const preview = document.getElementById('preview');
    
    if (!editor || !editor.value.trim()) {
        alert('请先输入Markdown内容');
        return;
    }

    showLoading();
    updateStatus('正在进行AI排版...');

    try {
        const markdown = editor.value;
        
        // Call DeepSeek API to convert markdown to HTML
        const response = await fetch(`${API_BASE_URL}/ai`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt: `md渲染的html的处理要求如下：${markdown} 用section 包裹逻辑## 核心要求: ### 1. 文档结构规范 
                        - **容器标签**：     ✅ 必须使用"<section>"作为主容器，禁止使用"<div>" ✅ 多层级结构根据文章内容逻辑和排版要求合理构建，例如：<section style="外层样式"><section style="内容块样式1"><p>具体内容1</p></section><section style="内容块样式2"><相关内容标签如图片、列表等></section></section>  
                        - **代码范围**：     ⛔ 禁止出现"<!DOCTYPE>"、"<html>"、"<head>"、"<body>" ,✅ 直接输出"<section>"内容片段. 
                        ### 2. 样式编写规则 : - **内联样式强制**：  ✅ 所有样式必须写在"style"属性中，根据文章风格和排版要求设计样式，格式例如：<p style="font-size: 16px; color: #333; line-height: 1.75; font-family: Arial, sans-serif;">文本</p>   
                        - 若用户提供了参考html代码，需严格参照其样式进行排版，保持样式风格一致性。  
                        - **移动端适配**：     ✅ 容器宽度："max-width: 100%" ✅ 图片宽度："width: 100%" 或根据排版要求设定百分比（如"width: 49%"）     ⚠️ 禁止使用"px"固定宽度（除边框等特殊场景
                        ## 禁止事项清单  1. **标签黑名单**：      "<script>", "<iframe>", "<form>", "<input>"
                        2. **属性黑名单**：      "onclick", "onload", "class", "id"  
                        3. **样式黑名单**：      "position: fixed; /* 微信浏览器不支持 */"    "background-image: url(); /* 部分机型失效 */"    "::before/::after /* 必须用真实DOM元素替代 */"  
                        ## 输出验证流程  1. **结构检查**： - 是否存在"<section>"嵌套层级超过3层  - 图片是否使用"data-src"而非"src"  2. **样式检查**：      
                        # 伪代码示例    if "px" in styles and "font-size" not in styles: raise Error("除字号外禁止使用px单位")  - 若有参考html代码，检查生成代码的样式是否与参考代码一致。  
                        3. **排版风格检查**：  - 排版风格是否与文章内容和用户要求相匹配，若有参考代码，需与参考代码风格一致。 - 整体视觉效果是否符合移动端阅读习惯。- 检查是否对文章内容进行了合理的排版优化，如小标题、加粗重点文字、列表使用等是否恰当。  
                        ## 调用示例 **用户输入**： 文章内容：“介绍一款新手机的功能和优点。它拥有高像素摄像头，拍照效果很棒。处理器性能强劲，运行速度快。电池续航能力也不错。”，
                        排版要求：简约现代风，主题色为#007BFF，参考html代码：<section style="max-width: 100%; margin: 0 auto; background-color: #f8f9fa;"><section style="margin-bottom: 20px; text-align: center;"><h2 style="font-size: 24px; font-weight: 700; color: #007BFF;">示例标题</h2></section><section style="padding: 20px;"><p style="font-size: 16px; line-height: 1.6; color: #333;">示例内容</p></section></section>  
                        **AI输出**：   {"html": "<section style=\"max-width: 100%; margin: 0 auto;\"> <!-- 标题 --><section style=\"margin-bottom: 20px; text-align: center;\"><h2 style=\"font-size: 24px; font-weight: 700; color: #007BFF;\">一款新手机的功能与优点</h2></section> <!-- 功能区 --><section style=\"padding: 20px;\"><h3 style=\"font-size: 20px; font-weight: 600; color: #007BFF;\">拍照功能</h3><p style=\"font-size: 16px; line-height: 1.6; color: #333;\">它拥有 <b>高像素摄像头</b>，拍照效果很棒。</p><h3 style=\"font-size: 20px; font-weight: 600; color: #007BFF;\">处理器性能</h3><p style=\"font-size: 16px; line-height: 1.6; color: #333;\">处理器性能强劲，运行速度快。</p><h3 style=\"font-size: 20px; font-weight: 600; color: #007BFF;\">电池续航</h3><p style=\"font-size: 16px; line-height: 1.6; color: #333;\">电池续航能力也不错。</p></section></section>"} `,

                context: 'markdown_to_html_conversion'
            })
        });
        
        if (!response.ok) {
            throw new Error(`AI排版失败: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.response) {
            // Extract only the body content from AI-generated HTML to avoid layout issues
            let htmlContent = data.response;
            
            // Try to extract content from body tags if present
            const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
            if (bodyMatch) {
                htmlContent = bodyMatch[1];
            }
            
            // Remove html, head, title, meta tags if present
            htmlContent = htmlContent.replace(/<\/?html[^>]*>/gi, '');
            htmlContent = htmlContent.replace(/<\/?head[^>]*>/gi, '');
            htmlContent = htmlContent.replace(/<\/?title[^>]*>[\s\S]*?<\/title>/gi, '');
            htmlContent = htmlContent.replace(/<\/?meta[^>]*>/gi, '');
            htmlContent = htmlContent.replace(/<\/?link[^>]*>/gi, '');
            htmlContent = htmlContent.replace(/<\/?script[^>]*>[\s\S]*?<\/script>/gi, '');
            
            // Update preview with cleaned HTML content
            preview.innerHTML = htmlContent.trim();
            updateStatus('AI排版完成');
        } else {
            throw new Error(data.message || 'AI排版失败');
        }
        
    } catch (error) {
        console.error('AI排版失败:', error);
        updateStatus('AI排版失败', true);
        alert('AI排版失败: ' + error.message);
    } finally {
        hideLoading();
    }
}

// Make functions globally available
window.downloadHTML = downloadHTML;
window.downloadPNG = downloadPNG;
window.downloadMD = downloadMD;
window.downloadTXT = downloadTXT;
window.copyToClipboard = copyToClipboard;
window.sendToWeChatDraft = sendToWeChatDraft;
window.configureWeChat = configureWeChat;
window.aiFormatMarkdown = aiFormatMarkdown;
window.ImageStore = ImageStore;
window.ImageCompressor = ImageCompressor;
window.FormatCustomizer = FormatCustomizer;