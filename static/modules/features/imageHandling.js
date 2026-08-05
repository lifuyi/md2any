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
        // 如果目标元素是 ai-input，直接返回，让默认粘贴行为发生
        if (event.target && event.target.id === 'ai-input') {
            console.log('Paste target is ai-input - allowing default paste behavior');
            return;
        }

        // 如果左抽屉（AI助手）打开，不处理粘贴事件，让默认行为发生
        const drawerById = document.getElementById('left-drawer');
        const drawerByClass = document.querySelector('.left-drawer.open');
        
        // 检查抽屉是否打开
        const isDrawerOpen = (drawerById && drawerById.classList.contains('open')) || drawerByClass;
        
        if (isDrawerOpen) {
            console.log('Drawer is open, skipping paste handler');
            return;
        }

        const items = event.clipboardData?.items;
        if (!items) return;

        // 检查是否包含图片，同时检查是否包含文本
        let hasImage = false;
        let hasText = false;
        
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.type.indexOf('image') !== -1) {
                hasImage = true;
            } else if (item.type === 'text/plain') {
                hasText = true;
            }
        }

        // 如果包含文本但不包含图片，允许默认粘贴行为
        if (hasText && !hasImage) {
            console.log('Clipboard contains text but no images - allowing default paste');
            return;
        }

        // 只处理图片粘贴
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
        
        if (window.codeMirrorInstance) {
            const cm = window.codeMirrorInstance;
            const doc = cm.getDoc();
            const cursor = doc.getCursor();
            // replaceRange fires CodeMirror's change event, which triggers the
            // debounced re-render centrally - no explicit render needed.
            doc.replaceRange(markdownImage, cursor);
        } else {
            const editor = document.getElementById('editor');
            if (editor) {
                const cursorPos = editor.selectionStart;
                const textBefore = editor.value.substring(0, cursorPos);
                const textAfter = editor.value.substring(cursorPos);
                editor.value = textBefore + markdownImage + textAfter;
                editor.setSelectionRange(cursorPos + markdownImage.length, cursorPos + markdownImage.length);
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
