/**
 * Format Customization Module
 * 
 * Handles format customization:
 * - Custom format saving and loading
 * - Live preview of custom styles
 * - Format reset functionality
 * - Image compression settings
 */

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize format customization functionality
 */
function initializeFormatCustomization() {
    const saveFormatBtn = document.getElementById('save-format');
    const resetFormatBtn = document.getElementById('reset-format');
    const loadDefaultBtn = document.getElementById('load-default-format');
    
    if (saveFormatBtn) {
        saveFormatBtn.addEventListener('click', saveCustomFormat);
    }
    
    if (resetFormatBtn) {
        resetFormatBtn.addEventListener('click', resetCustomFormat);
    }
    
    if (loadDefaultBtn) {
        loadDefaultBtn.addEventListener('click', loadDefaultFormatValues);
    }
    
    // Add live preview functionality
    setupLivePreview();
    
    // Initialize image compression settings
    initializeImageCompressionSettings();
    
    // Load saved custom formats
    loadCustomFormats();
}

// =============================================================================
// IMAGE COMPRESSION SETTINGS
// =============================================================================

/**
 * Initialize image compression settings
 */
function initializeImageCompressionSettings() {
    const presetSelect = document.getElementById('compression-preset');
    const saveBtn = document.getElementById('save-compression-settings');
    
    if (presetSelect) {
        // Load saved preset
        const savedPreset = localStorage.getItem('imageCompressionPreset') || 'medium';
        presetSelect.value = savedPreset;
    }
    
    if (saveBtn) {
        saveBtn.addEventListener('click', function() {
            if (presetSelect) {
                localStorage.setItem('imageCompressionPreset', presetSelect.value);
                SharedUtils.log('FormatCustomization', 'Image compression preset saved:', presetSelect.value);
                
                // Show confirmation
                const status = document.getElementById('status');
                if (status) {
                    const originalText = status.textContent;
                    status.textContent = '图片压缩设置已保存';
                    status.style.color = '#28a745';
                    
                    setTimeout(() => {
                        status.textContent = originalText;
                        status.style.color = '#666';
                    }, 2000);
                }
            }
        });
    }
}

// =============================================================================
// LIVE PREVIEW
// =============================================================================

/**
 * Setup live preview for format customization
 */
function setupLivePreview() {
    // Get all format input elements
    const formatInputs = document.querySelectorAll('.format-textarea');
    
    formatInputs.forEach(input => {
        input.addEventListener('input', SharedUtils.debounce(() => {
            applyLivePreview();
        }, 500));
    });
}

/**
 * Apply live preview of custom styles
 */
function applyLivePreview() {
    // Get the preview pane
    const previewPane = document.getElementById('preview');
    if (!previewPane) return;
    
    // Get all custom format values
    const formatElements = [
        'container', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'strong', 'em', 'a', 'ul', 'ol', 'li',
        'blockquote', 'code', 'pre', 'hr', 'img', 'table', 'th', 'td', 'tr', 'innercontainer'
    ];
    
    // Create a style element with all custom styles
    let customCSS = '';
    
    formatElements.forEach(element => {
        const textarea = document.getElementById(`format-${element}`);
        if (textarea && textarea.value.trim()) {
            // Apply styles to the preview pane
            const styleRules = textarea.value.trim();
            
            // Show preview indicator
            const indicator = document.getElementById(`indicator-${element}`);
            if (indicator) {
                indicator.style.display = 'inline-block';
            }
            
            // Add modified class to textarea
            textarea.classList.add('modified');
            
            // Create CSS selector based on the element
            let selector = '';
            switch(element) {
                case 'container':
                    selector = '#preview';
                    break;
                case 'innercontainer':
                    selector = '#preview .inner-container';
                    break;
                case 'h1':
                case 'h2':
                case 'h3':
                case 'h4':
                case 'h5':
                case 'h6':
                case 'p':
                case 'strong':
                case 'em':
                case 'a':
                case 'ul':
                case 'ol':
                case 'li':
                case 'blockquote':
                case 'code':
                case 'pre':
                case 'hr':
                case 'img':
                case 'table':
                case 'th':
                case 'td':
                case 'tr':
                    selector = `#preview ${element}`;
                    break;
            }
            
            if (selector) {
                customCSS += `${selector} { ${styleRules} }\n`;
            }
        } else {
            // Hide preview indicator if no styles
            const indicator = document.getElementById(`indicator-${element}`);
            if (indicator) {
                indicator.style.display = 'none';
            }
            
            // Remove modified class from textarea
            const textAreaElement = document.getElementById(`format-${element}`);
            if (textAreaElement) {
                textAreaElement.classList.remove('modified');
            }
        }
    });
    
    // Create or update the live preview style element
    let previewStyle = document.getElementById('live-preview-style');
    if (!previewStyle) {
        previewStyle = document.createElement('style');
        previewStyle.id = 'live-preview-style';
        document.head.appendChild(previewStyle);
    }
    
    previewStyle.textContent = customCSS;
    
    // Re-render the preview with current markdown
    if (typeof renderMarkdown === 'function') {
        renderMarkdown();
    }
}

// =============================================================================
// SAVE AND LOAD FORMATS
// =============================================================================

/**
 * Save custom format
 */
async function saveCustomFormat() {
    const formatName = prompt('请输入自定义样式名称:');
    if (!formatName) return;
    
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
    
    if (Object.keys(customStyles).length === 0) {
        alert('请至少设置一个样式');
        return;
    }
    
    try {
        const response = await fetch(`${SharedUtils.CONFIG.API_BASE_URL}/custom-styles`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                style_name: formatName,
                styles: customStyles
            })
        });
        
        if (!response.ok) {
            throw new Error(`保存失败: ${response.status}`);
        }
        
        const result = await response.json();
        alert(result.message);
        
        // Refresh theme selector
        if (typeof loadThemesFromAPI === 'function') {
            await loadThemesFromAPI();
        }
        
    } catch (error) {
        SharedUtils.logError('FormatCustomization', '保存自定义样式失败', error);
        alert(`保存失败: ${error.message}`);
    }
}

/**
 * Reset custom format
 */
function resetCustomFormat() {
    if (!confirm('确定要重置所有自定义样式吗？')) return;
    
    const formatElements = [
        'container', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'strong', 'em', 'a', 'ul', 'ol', 'li',
        'blockquote', 'code', 'pre', 'hr', 'img', 'table', 'th', 'td', 'tr', 'innercontainer'
    ];
    
    formatElements.forEach(element => {
        const textarea = document.getElementById(`format-${element}`);
        if (textarea) {
            textarea.value = '';
        }
    });
    
    applyLivePreview();
    alert('样式已重置');
}

/**
 * Load custom formats
 */
async function loadCustomFormats() {
    try {
        const response = await fetch(`${SharedUtils.CONFIG.API_BASE_URL}/custom-styles`);
        if (!response.ok) return;
        
        const data = await response.json();
        
    } catch (error) {
        SharedUtils.logError('FormatCustomization', '加载自定义样式失败', error);
    }
}

/**
 * Load default format values (Alibaba Orange)
 */
function loadDefaultFormatValues() {
    if (!confirm('确定要加载阿里橙样式吗？这将覆盖当前的所有自定义样式。')) {
        return;
    }
    
    const defaultValues = {
        'format-container': 'max-width: 740px; margin: 0 auto; padding: 20px; font-family: "Helvetica Neue", Helvetica, Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif; font-size: 16px; line-height: 1.8 !important; color: #3f3f3f !important; background-color: #ffffff; word-wrap: break-word;',
        'format-h1': 'font-size: 28px; line-height: 1.4; font-weight: 700; color: #111111; position: relative; padding-bottom: 16px; border-bottom: 2px solid #ff6a00; margin: 32px 0 24px; letter-spacing: 0.5px;',
        'format-h2': 'display: table; padding: 0.6em 1.5em; margin: 2.8em auto 1.5em; font-size: 1.3em; font-weight: 700; text-align: center; color: #fff; background: linear-gradient(135deg, #ff6a00, #ff8c00); border-radius: 30px; position: relative; box-shadow: 0 6px 16px rgba(255, 106, 0, 0.25); letter-spacing: 0.03em; border: 2px solid rgba(255, 255, 255, 0.3); z-index: 1; transition: all 0.3s ease;',
        'format-h3': 'font-size: 1.2em; font-weight: 600; color: #333; margin: 2.2em 0 1em; padding-left: 16px; border-left: 4px solid #ff8c00; line-height: 1.5; position: relative;',
        'format-strong': 'font-weight: 700; color: #ff6a00; background-color: rgba(255, 106, 0, 0.08); padding: 2px 4px; border-radius: 3px;',
        'format-code': 'font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace; background: rgba(255, 106, 0, 0.08); padding: 4px 8px; border-radius: 6px; font-size: 14px; color: #d9480f; border: 1px solid rgba(255, 106, 0, 0.1);'
    };
    
    // Set default values to textareas
    Object.keys(defaultValues).forEach(id => {
        const textarea = document.getElementById(id);
        if (textarea) {
            textarea.value = defaultValues[id];
        }
    });
    
    applyLivePreview();
    alert('阿里橙样式已加载！您可以基于此样式进行修改。');
}

