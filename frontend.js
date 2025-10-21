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
    <script type="text/javascript" id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
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
        
        // Create temporary div to process HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        
        // Remove script tags for safety
        const scripts = tempDiv.querySelectorAll('script');
        scripts.forEach(script => script.remove());
        
        const cleanHTML = tempDiv.innerHTML;
        const plainText = tempDiv.textContent || tempDiv.innerText || '';
        
        // Use modern Clipboard API if available
        if (navigator.clipboard && window.ClipboardItem) {
            const htmlBlob = new Blob([cleanHTML], { type: 'text/html' });
            const textBlob = new Blob([plainText], { type: 'text/plain' });
            
            const clipboardItem = new ClipboardItem({
                'text/html': htmlBlob,
                'text/plain': textBlob
            });
            
            await navigator.clipboard.write([clipboardItem]);
            updateStatus('已复制到剪贴板（富文本格式）');
            
        } else {
            // Fallback method
            const textArea = document.createElement('textarea');
            textArea.value = plainText;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            
            if (successful) {
                updateStatus('已复制到剪贴板（纯文本）');
            } else {
                throw new Error('复制命令失败');
            }
        }
        
    } catch (error) {
        console.error('复制失败:', error);
        updateStatus('复制失败', true);
        alert('复制失败: ' + error.message);
    }
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
            thumb_media_id: thumbMediaId,
            dashseparator: false  // 前端已处理
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
            try {
                errorMsg = JSON.parse('"' + data.errmsg.replace(/"/g, '\\"') + '"');
            } catch (e) {
                errorMsg = data.errmsg;
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

// Make functions globally available
window.downloadHTML = downloadHTML;
window.downloadPNG = downloadPNG;
window.downloadMD = downloadMD;
window.downloadTXT = downloadTXT;
window.copyToClipboard = copyToClipboard;
window.sendToWeChatDraft = sendToWeChatDraft;
window.configureWeChat = configureWeChat;
window.ImageStore = ImageStore;
window.ImageCompressor = ImageCompressor;
window.FormatCustomizer = FormatCustomizer;