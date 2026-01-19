/**
 * Image Handling Module
 * 
 * Handles image operations:
 * - Image storage and persistence
 * - Image compression
 * - Paste and drag-drop functionality
 * - Image upload processing
 */

// =============================================================================
// IMAGE STORE CLASS
// =============================================================================

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
            return {};
        }
    }
    
    saveImages() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.images));
        } catch (error) {
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

// =============================================================================
// IMAGE COMPRESSOR CLASS
// =============================================================================

class ImageCompressor {
    static async compress(file, options = {}) {
        const {
            maxWidth = SharedUtils.CONFIG.MAX_IMAGE_WIDTH,
            maxHeight = SharedUtils.CONFIG.MAX_IMAGE_HEIGHT,
            quality = SharedUtils.CONFIG.IMAGE_QUALITY,
            mimeType = 'image/jpeg',
            preserveAspectRatio = true,
            compressionLevel = 'medium'
        } = options;
        
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                let { width, height } = img;
                
                let adjustedQuality = quality;
                if (compressionLevel === 'high') {
                    adjustedQuality = 0.7;
                } else if (compressionLevel === 'low') {
                    adjustedQuality = 0.9;
                }
                
                if (width > maxWidth || height > maxHeight) {
                    if (preserveAspectRatio) {
                        const ratio = Math.min(maxWidth / width, maxHeight / height);
                        width *= ratio;
                        height *= ratio;
                    } else {
                        width = Math.min(width, maxWidth);
                        height = Math.min(height, maxHeight);
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob(resolve, mimeType, adjustedQuality);
            };
            
            img.src = URL.createObjectURL(file);
        });
    }
    
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
            default:
                options.quality = 0.8;
                options.compressionLevel = 'medium';
                break;
        }
        
        return this.compress(file, options);
    }
}

// =============================================================================
// GLOBAL INSTANCES
// =============================================================================

const imageStore = new ImageStore();
let imageCounter = 0;

// =============================================================================
// IMAGE PASTE AND DRAG-DROP FUNCTIONALITY
// =============================================================================

function initImagePaste() {
    const editor = document.getElementById('editor');
    const pasteArea = document.getElementById('imagePasteArea');
    
    imageStore.init().catch(err => {
    });
    
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

// =============================================================================
// IMAGE UPLOAD HANDLING
// =============================================================================

async function handleImageUpload(file) {
    try {
        showImageStatus('🔄 正在处理图片...', 'info');
        
        const compressionPreset = localStorage.getItem('imageCompressionPreset') || 'medium';
        const compressedBlob = await ImageCompressor.compressWithPreset(file, compressionPreset);
        const originalSize = file.size;
        const compressedSize = compressedBlob.size;
        
        const imageId = 'img_' + Date.now() + '_' + (++imageCounter);
        await imageStore.saveImage(imageId, compressedBlob, {
            name: file.name || 'pasted-image',
            originalSize: originalSize,
            type: compressedBlob.type,
            compressionPreset: compressionPreset
        });
        
        const objectURL = URL.createObjectURL(compressedBlob);
        const markdownImage = `![${file.name || 'image'}](${objectURL})\n`;
        
        const editor = document.getElementById('editor');
        
        if (window.codeMirrorInstance) {
            const cm = window.codeMirrorInstance;
            const doc = cm.getDoc();
            const cursor = doc.getCursor();
            doc.replaceRange(markdownImage, cursor);
            
            if (window.renderMarkdown) {
                window.renderMarkdown();
            }
        } else if (editor) {
            const cursorPos = editor.selectionStart;
            const textBefore = editor.value.substring(0, cursorPos);
            const textAfter = editor.value.substring(cursorPos);
            editor.value = textBefore + markdownImage + textAfter;
            editor.setSelectionRange(cursorPos + markdownImage.length, cursorPos + markdownImage.length);
            
            if (window.renderMarkdown) {
                window.renderMarkdown();
            }
        }
        
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
        showImageStatus('❌ 图片处理失败: ' + error.message, 'error');
    }
}

// =============================================================================
// TXT TO MD CONVERSION
// =============================================================================

/**
 * Convert plain text to markdown using AI API
 */
async function convertPlainTextToMarkdown(text) {
    try {
        const response = await fetch(`${SharedUtils.CONFIG.API_BASE_URL}/text-to-markdown`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: text,
                style: 'standard',
                preserve_formatting: true
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        return data.markdown || text;
    } catch (error) {
        console.error('Text to markdown conversion error:', error);
        // Return original text if conversion fails
        return text;
    }
}

/**
 * Handle plain text paste and convert to markdown
 */
async function handlePlainTextPaste(text) {
    // Show conversion overlay
    if (typeof showTxtToMdOverlay === 'function') {
        showTxtToMdOverlay();
    }

    try {
        // Convert text to markdown
        const markdown = await convertPlainTextToMarkdown(text);
        
        // Insert converted markdown into editor
        if (window.codeMirrorInstance) {
            const cm = window.codeMirrorInstance;
            const doc = cm.getDoc();
            const cursor = doc.getCursor();
            doc.replaceRange(markdown, cursor);
        } else {
            const editor = document.getElementById('editor');
            if (editor) {
                const start = editor.selectionStart;
                const end = editor.selectionEnd;
                editor.value = editor.value.substring(0, start) + markdown + editor.value.substring(end);
                editor.dispatchEvent(new Event('input'));
            }
        }
        
        // Trigger preview update
        if (typeof renderMarkdown === 'function') {
            renderMarkdown();
        }
        
    } catch (error) {
        console.error('Failed to convert text to markdown:', error);
        // Fallback: insert original text
        if (window.codeMirrorInstance) {
            const cm = window.codeMirrorInstance;
            const doc = cm.getDoc();
            const cursor = doc.getCursor();
            doc.replaceRange(text, cursor);
        }
    } finally {
        // Hide conversion overlay
        if (typeof hideTxtToMdOverlay === 'function') {
            setTimeout(() => hideTxtToMdOverlay(), 500);
        }
    }
}

// Enhanced paste handler that also handles plain text conversion
document.addEventListener('paste', async (event) => {
    const items = event.clipboardData?.items;
    const types = event.clipboardData?.types || [];
    
    if (!items) return;

    // Check if paste contains images first
    let hasImage = false;
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            hasImage = true;
            break;
        }
    }
    
    // If no images and contains text, convert to markdown
    if (!hasImage && (types.includes('text/plain') || types.includes('text/html'))) {
        event.preventDefault();
        
        // Get plain text from clipboard
        const text = event.clipboardData.getData('text/plain');
        
        // Only convert if text is substantial (more than just a few words)
        if (text && text.length > 50) {
            await handlePlainTextPaste(text);
        } else {
            // For short text, just insert as-is
            if (window.codeMirrorInstance) {
                const cm = window.codeMirrorInstance;
                const doc = cm.getDoc();
                const cursor = doc.getCursor();
                doc.replaceRange(text, cursor);
            }
        }
    }
});

// =============================================================================
// STATUS MESSAGING
// =============================================================================

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
