/**
 * Core Application Module
 * 
 * This module handles the core functionality of the md2any application:
 * - Application initialization
 * - Theme management and API communication
 * - Markdown rendering coordination
 * - Event listeners and UI state management
 */

// =============================================================================
// GLOBAL STATE
// =============================================================================

let THEMES = {};
let STYLES = {}; // For backward compatibility
let currentTheme = SharedUtils.CONFIG.DEFAULT_THEME;
// Use window.isAIFormatting to allow features.js to control this flag
Object.defineProperty(window, 'isAIFormatting', {
    writable: true,
    configurable: true,
    value: false
});

// =============================================================================
// APPLICATION INITIALIZATION
// =============================================================================

/**
 * Initialize the application
 */
document.addEventListener('DOMContentLoaded', async () => {
    SharedUtils.log('Core', 'Initializing md2any application...');
    
    try {
        // Load themes from API
        await loadThemesFromAPI();
        
        // Initialize UI components
        initializeUI();
        
        // Set up event listeners
        setupEventListeners();
        
        // Load initial content
        updateStatus('就绪');
        renderMarkdown();
        
        SharedUtils.log('Core', 'Application initialized successfully');
    } catch (error) {
        SharedUtils.logError('Core', 'Application initialization failed', error);
        updateStatus('应用初始化失败', true);
    }
});



// =============================================================================
// THEME MANAGEMENT
// =============================================================================

/**
 * Load themes from the API
 */
async function loadThemesFromAPI() {
    try {
        updateStatus('加载主题中...');
        const response = await fetch(`${SharedUtils.CONFIG.API_BASE_URL}/themes`);
        
        if (!response.ok) {
            throw new Error(`Failed to load themes: ${response.status}`);
        }
        
        const data = await response.json();
        THEMES = {};
        STYLES = {}; // For compatibility
        
        // Convert API theme format to STYLES format for compatibility
        data.themes.forEach(theme => {
            THEMES[theme.id] = theme;
            STYLES[theme.id] = {
                name: theme.name,
                modes: theme.modes || [{
                    name: "默认",
                    id: "light-mode", 
                    background: "#ffffff"
                }]
            };
        });
        
        // Populate theme selector
        populateThemeSelector();
        
        updateStatus('主题加载完成');
        SharedUtils.log('Core', 'Loaded themes:', Object.keys(THEMES));
        
    } catch (error) {
        SharedUtils.logError('Core', 'Error loading themes', error);
        updateStatus('主题加载失败', true);
        
        // Fallback to default theme
        STYLES = {
            'wechat-default': {
                name: '默认样式',
                modes: [{
                    name: "默认",
                    id: "light-mode",
                    background: "#ffffff"
                }]
            }
        };
        populateThemeSelector();
    }
}

/**
 * Populate theme selector dropdown
 */
function populateThemeSelector() {
    const themeSelector = document.getElementById('theme-selector');
    if (!themeSelector) return;
    
    // Clear existing options
    themeSelector.innerHTML = '';
    
    // Add theme options
    Object.keys(STYLES).forEach(themeId => {
        const option = document.createElement('option');
        option.value = themeId;
        option.textContent = STYLES[themeId].name;
        themeSelector.appendChild(option);
    });
    
    // Set default theme
    if (STYLES[currentTheme]) {
        themeSelector.value = currentTheme;
    } else {
        const firstTheme = Object.keys(STYLES)[0];
        if (firstTheme) {
            currentTheme = firstTheme;
            themeSelector.value = firstTheme;
        }
    }
    
    SharedUtils.AppState.set('currentTheme', currentTheme);
}

// =============================================================================
// UI INITIALIZATION
// =============================================================================

/**
 * Initialize UI components
 */
function initializeUI() {
    // Update character count
    updateCharCount();
    
    // Check backend status
    checkBackendStatus();
    
    // Initialize format customization
    initializeFormatCustomization();
    
    // Initialize CodeMirror editor
    initializeCodeMirror();
    
    SharedUtils.log('Core', 'UI components initialized');
}

/**
 * Initialize CodeMirror editor
 */
function initializeCodeMirror() {
    const editorElement = document.getElementById('editor');
    if (!editorElement) return;
    
    // Hide the textarea and create a container for CodeMirror
    editorElement.style.display = 'none';
    
    // Create a container for CodeMirror
    const container = document.createElement('div');
    container.id = 'codemirror-container';
    container.style.height = '100%';
    container.style.width = '100%';
    
    // Insert container before the textarea
    editorElement.parentNode.insertBefore(container, editorElement);
    
    // Initialize CodeMirror
    const cm = CodeMirror(container, {
        value: editorElement.value,
        mode: 'markdown',
        theme: 'default',
        lineNumbers: true,
        lineWrapping: true,
        autoCloseBrackets: true,
        matchBrackets: true,
        tabSize: 2,
        indentUnit: 2,
        extraKeys: {
            'Enter': 'newlineAndIndentContinueMarkdownList',
            'Tab': 'indentMore',
            'Shift-Tab': 'indentLess'
        }
    });
    
    // Set the height
    cm.setSize('100%', '100%');
    
    // Add event listeners
    cm.on('change', function(cmInstance) {
        // Update the hidden textarea
        editorElement.value = cmInstance.getValue();
        
        // Update character count
        updateCharCount();
        
        // Trigger preview update with debounce
        SharedUtils.debounce(() => {
            renderMarkdown();
        }, 300)();
    });
    
    // Store reference to CodeMirror instance
    window.codeMirrorInstance = cm;
    
    SharedUtils.log('Core', 'CodeMirror editor initialized');
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    const themeSelector = document.getElementById('theme-selector');
    
    // Theme change
    if (themeSelector) {
        themeSelector.addEventListener('change', () => {
            currentTheme = themeSelector.value;
            SharedUtils.AppState.set('currentTheme', currentTheme);
            renderMarkdown();
        });
    }
    
    // Split checkbox
    const splitCheckbox = document.getElementById('split-checkbox');
    if (splitCheckbox) {
        splitCheckbox.addEventListener('change', renderMarkdown);
    }
    
    // Clear editor button
    const clearBtn = document.getElementById('clear-editor');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearEditor);
    }
    
    // Settings panel
    setupSettingsPanel();
    
    // Style porter
    setupStylePorter();
    
    // Keyboard shortcuts
    setupKeyboardShortcuts();
    
    SharedUtils.log('Core', 'Event listeners setup complete');
}

// =============================================================================
// SETTINGS PANEL
// =============================================================================

/**
 * Setup settings panel functionality
 */
function setupSettingsPanel() {
    const settingsToggle = document.getElementById('settings-toggle');
    const settingsClose = document.getElementById('settings-close');
    const settingsPane = document.getElementById('settings-pane');
    
    if (settingsToggle) {
        settingsToggle.addEventListener('click', () => {
            if (settingsPane) {
                settingsPane.classList.toggle('visible');
                updateSettingsToggleText();
                
                // If opening settings panel, initialize format customization
                if (settingsPane.classList.contains('visible')) {
                    setTimeout(() => {
                        if (typeof FormatCustomizer !== 'undefined' && !window.formatCustomizer) {
                            window.formatCustomizer = new FormatCustomizer();
                        }
                    }, 100);
                }
            }
        });
    }
    
    if (settingsClose) {
        settingsClose.addEventListener('click', () => {
            if (settingsPane) {
                settingsPane.classList.remove('visible');
                updateSettingsToggleText();
            }
        });
    }
}

/**
 * Update settings toggle button text
 */
function updateSettingsToggleText() {
    const settingsToggle = document.getElementById('settings-toggle');
    const settingsPane = document.getElementById('settings-pane');
    
    if (settingsToggle && settingsPane) {
        if (settingsPane.classList.contains('visible')) {
            settingsToggle.innerHTML = '<i class="fas fa-times"></i> 关闭设置';
        } else {
            settingsToggle.innerHTML = '<i class="fas fa-cog"></i> 设置面板';
        }
    }
}

// =============================================================================
// KEYBOARD SHORTCUTS
// =============================================================================

/**
 * Setup keyboard shortcuts
 */
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            switch(e.key) {
                case 's':
                    e.preventDefault();
                    if (window.downloadHTML) window.downloadHTML();
                    break;
                case 'Enter':
                    e.preventDefault();
                    renderMarkdown();
                    break;
            }
        }
        
        // Ctrl+Shift+Backspace to clear editor
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Backspace') {
            e.preventDefault();
            clearEditor();
        }
    });
}

// =============================================================================
// FORMAT CUSTOMIZATION
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
                SharedUtils.log('Core', 'Image compression preset saved:', presetSelect.value);
                
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
    renderMarkdown();
}

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
        await loadThemesFromAPI();
        
    } catch (error) {
        SharedUtils.logError('Core', '保存自定义样式失败', error);
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
        SharedUtils.log('Core', '已加载的自定义样式:', data.custom_styles);
        
    } catch (error) {
        SharedUtils.logError('Core', '加载自定义样式失败', error);
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
    
    alert('阿里橙样式已加载！您可以基于此样式进行修改。');
}

// =============================================================================
// MARKDOWN RENDERING
// =============================================================================

/**
 * Render markdown using backend API
 */
async function renderMarkdown() {
    // Skip rendering if AI formatting is in progress to prevent overwriting AI results
    if (window.isAIFormatting) {
        SharedUtils.log('Core', 'Skipping renderMarkdown - AI formatting in progress');
        return;
    }
    
    const editor = document.getElementById('editor');
    const preview = document.getElementById('preview');
    
    if (!editor || !preview) return;
    
    let markdown = editor.value.trim();
    const theme = currentTheme;
    
    if (!markdown) {
        preview.innerHTML = `
            <div style="text-align: center; color: #999; margin-top: 50px;">
                <i class="fas fa-arrow-left" style="font-size: 48px; margin-bottom: 20px; opacity: 0.3;"></i>
                <p>在左侧编辑器输入内容，右侧将实时预览</p>
            </div>
        `;
        return;
    }
    
    showLoading();
    updateStatus('渲染中...');
    
    try {
        // Handle dash separator splitting in frontend
        const splitCheckbox = document.getElementById('split-checkbox');
        const shouldSplit = splitCheckbox && splitCheckbox.checked;
        
        if (shouldSplit && markdown.includes('---')) {
            await renderSplitMarkdown(markdown, theme, preview);
        } else {
            await renderNormalMarkdown(markdown, theme, preview);
        }
        
        // Initialize external libraries
        initializeMermaid();
        initializeMathJax();
        
        const charCount = editor.value.length;
        updateStatus(`渲染完成 ${charCount} 字符`);
        
    } catch (error) {
        SharedUtils.logError('Core', '渲染失败', error);
        preview.innerHTML = `
            <div class="error">
                <strong>渲染失败</strong><br>
                ${error.message}<br><br>
                <small>请检查后端服务是否正常运行</small>
            </div>
        `;
        updateStatus('渲染失败', true);
    } finally {
        hideLoading();
    }
}

/**
 * Render split markdown (with --- separators)
 */
async function renderSplitMarkdown(markdown, theme, preview) {
    const sections = markdown.split(/^---$/gm).filter(section => section.trim());
    
    if (sections.length <= 1) {
        await renderNormalMarkdown(markdown, theme, preview);
        return;
    }
    
    let sectionedHtml = '';
    
    for (let i = 0; i < sections.length; i++) {
        const sectionMarkdown = sections[i].trim();
        if (sectionMarkdown) {
            const response = await fetch(`${SharedUtils.CONFIG.API_BASE_URL}/render`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    markdown_text: sectionMarkdown,
                    theme: theme,
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
    
    preview.innerHTML = sectionedHtml;
}

/**
 * Render normal markdown
 */
async function renderNormalMarkdown(markdown, theme, preview) {
    const response = await fetch(`${SharedUtils.CONFIG.API_BASE_URL}/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            markdown_text: markdown,
            theme: theme,
            mode: SharedUtils.CONFIG.DEFAULT_MODE,
            platform: SharedUtils.CONFIG.DEFAULT_PLATFORM,
            dashseparator: false
        })
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        SharedUtils.logError('Core', 'Render error response:', errorText);
        throw new Error(`渲染失败: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    preview.innerHTML = data.html;
}

// =============================================================================
// EXTERNAL LIBRARY INITIALIZATION
// =============================================================================

/**
 * Initialize Mermaid diagrams
 */
function initializeMermaid() {
    if (typeof mermaid !== 'undefined') {
        setTimeout(() => {
            try {
                const mermaidElements = document.querySelectorAll('.mermaid, code.language-mermaid');
                if (mermaidElements.length > 0) {
                    mermaid.run({
                        nodes: mermaidElements
                    }).catch(error => {
                        SharedUtils.logError('Core', 'Mermaid rendering failed', error);
                    });
                }
            } catch (error) {
                SharedUtils.logError('Core', 'Mermaid initialization failed', error);
            }
        }, 100);
    }
}

/**
 * Initialize MathJax
 */
function initializeMathJax() {
    if (typeof window.MathJax === 'undefined') {
        SharedUtils.log('Core', 'MathJax not loaded yet');
        return;
    }
    
    if (!window.MathJax.typesetPromise) {
        SharedUtils.logError('Core', 'MathJax.typesetPromise not available');
        return;
    }
    
    setTimeout(() => {
        try {
            const preview = document.getElementById('preview');
            if (!preview || !preview.innerHTML) {
                return;
            }
            
            // Check if there's any math content to render
            const hasMath = preview.innerHTML.includes('$') || 
                           preview.innerHTML.includes('\\(') || 
                           preview.innerHTML.includes('\\[');
            
            if (!hasMath) {
                SharedUtils.log('Core', 'No math content found in preview');
                return;
            }
            
            SharedUtils.log('Core', 'Starting MathJax rendering');
            
            // Clear old MathJax SVG output only (mjx-container elements)
            // IMPORTANT: Do NOT remove .MathJax_Preview or other internal MathJax elements
            // as this breaks the rendering pipeline
            const oldSvgs = preview.querySelectorAll('mjx-container');
            oldSvgs.forEach(el => el.remove());
            
            // Re-render all math expressions
            window.MathJax.typesetPromise([preview])
                .then(() => {
                    SharedUtils.log('Core', 'MathJax rendering completed successfully');
                    // Verify rendering worked
                    const renderedMath = preview.querySelectorAll('mjx-container');
                    SharedUtils.log('Core', `${renderedMath.length} math expressions rendered`);
                })
                .catch((error) => {
                    SharedUtils.logError('Core', 'MathJax rendering failed', error);
                });
        } catch (error) {
            SharedUtils.logError('Core', 'MathJax initialization error', error);
        }
    }, 100);
}

// =============================================================================
// BACKEND STATUS AND UTILITIES
// =============================================================================

/**
 * Check backend status
 */
async function checkBackendStatus() {
    const backendStatusBtn = document.getElementById('backend-status');
    const statusIndicator = backendStatusBtn?.querySelector('.backend-status-indicator');
    const statusText = backendStatusBtn?.querySelector('span:last-child');
    
    if (!backendStatusBtn) return;
    
    try {
        const response = await fetch(`${SharedUtils.CONFIG.API_BASE_URL}/health`);
        
        if (response.ok) {
            const data = await response.json();
            
            // Update UI to show backend is online
            backendStatusBtn.className = 'btn btn-secondary backend-online';
            if (statusText) statusText.textContent = '后端在线';
            if (statusIndicator) statusIndicator.className = 'backend-status-indicator status-online';
            
            SharedUtils.log('Core', '✅ 后端API已连接:', data);
        } else {
            throw new Error('Backend not responding');
        }
    } catch (error) {
        SharedUtils.logError('Core', '❌ 后端API离线', error);
        
        // Show offline status
        if (backendStatusBtn) {
            backendStatusBtn.className = 'btn btn-secondary backend-error';
            if (statusText) statusText.textContent = '后端离线';
            if (statusIndicator) statusIndicator.className = 'backend-status-indicator status-error';
        }
    }
}

/**
 * Update character count
 */
function updateCharCount() {
    const editor = document.getElementById('editor');
    const status = document.getElementById('status');
    
    if (editor && status) {
        const count = editor.value.length;
        if (status.textContent.includes('渲染完成')) {
            status.textContent = `渲染完成 ${count} 字符`;
        }
    }
}

/**
 * Clear editor content
 */
function clearEditor() {
    // Check if CodeMirror is initialized
    if (window.codeMirrorInstance) {
        window.codeMirrorInstance.setValue('');
        updateCharCount();
        renderMarkdown();
    } else {
        const editor = document.getElementById('editor');
        if (editor) {
            editor.value = '';
            updateCharCount();
            renderMarkdown();
        }
    }
}

// =============================================================================
// STYLE PORTER FUNCTIONALITY
// =============================================================================

/**
 * Setup style porter functionality
 */
function setupStylePorter() {
    const stylePorterBtn = document.getElementById('style-porter-btn');
    const stylePorterClose = document.getElementById('style-porter-close');
    
    if (stylePorterBtn) {
        stylePorterBtn.addEventListener('click', openStylePorter);
    }
    
    if (stylePorterClose) {
        stylePorterClose.addEventListener('click', closeStylePorter);
    }
}

/**
 * Open style porter dialog
 */
function openStylePorter() {
    const stylePorterPane = document.getElementById('style-porter-pane');
    if (stylePorterPane) {
        stylePorterPane.classList.add('visible');
        const urlInput = document.getElementById('style-url-input');
        const statusDiv = document.getElementById('style-status');
        if (urlInput) urlInput.value = '';
        if (statusDiv) statusDiv.style.display = 'none';
    }
}

/**
 * Close style porter dialog
 */
function closeStylePorter() {
    const stylePorterPane = document.getElementById('style-porter-pane');
    if (stylePorterPane) {
        stylePorterPane.classList.remove('visible');
    }
}

// =============================================================================
// SAMPLE CONTENT
// =============================================================================

/**
 * Load sample markdown content
 */
function loadSample() {
    const sampleMarkdown = `# 测试文档 - 完整功能演示

## 标题层级测试

### 三级标题示例

#### 四级标题示例

##### 五级标题示例

###### 六级标题示例
---
![](https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?w=1200&h=400&fit=crop)
![](https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&h=400&fit=crop)
![](https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&h=400&fit=crop)

---
## 文本格式测试

这是**加粗文字**的效果，这是*斜体文字*的效果，这是~~删除线文字~~的效果。

### 组合效果
**加粗和*斜体*的组合**，以及~~删除线和**加粗**的组合~~

## 列表测试

### 无序列表
- 第一级项目1
- 第一级项目2
  - 第二级项目1
  - 第二级项目2
    - 第三级项目1
    - 第三级项目2
- 第一级项目3

### 有序列表
1. 第一步操作
2. 第二步操作
   1. 子步骤1
   2. 子步骤2
3. 第三步操作

## 代码测试

### 行内代码
\`const result = calculateSum(5, 3);\`

### 代码块
\`\`\`javascript
function calculateSum(a, b) {
    return a + b;
}

const result = calculateSum(5, 3);
console.log(result);
\`\`\`

## 表格测试

| 姓名 | 年龄 | 城市 | 职业 |
|------|------|------|------|
| 张三 | 25   | 北京 | 工程师 |
| 李四 | 30   | 上海 | 设计师 |
| 王五 | 28   | 广州 | 产品经理 |

## 引用测试

> 这是一个简单的引用。

### 多行引用
> 这是一个较长的引用，
> 可以跨越多行显示。
> 
> 支持**格式**和*样式*的引用。

## 分割线测试

---

## 特殊元素测试

### Emoji支持
🎉 🚀 💡 📊 ✨

### 数学公式测试

当 $a \\ne 0$ 时, 方程 $ax^2 + bx + c = 0$ 的解是
$x = {-b \\pm \\sqrt{b^2-4ac} \\over 2a}$

#### 特殊符号
© ® ™ → ← ↑ ↓ ↔ ↕
#### 数学符号
± × ÷ ≤ ≥ ≠ ∞ ∑ ∏ √ ∛ ∛
`;
    
    // Check if CodeMirror is initialized
    if (window.codeMirrorInstance) {
        window.codeMirrorInstance.setValue(sampleMarkdown);
        updateCharCount();
        renderMarkdown();
    } else {
        const editor = document.getElementById('editor');
        if (editor) {
            editor.value = sampleMarkdown;
            updateCharCount();
            renderMarkdown();
        }
    }
}

// =============================================================================
// EXPORTS
// =============================================================================

// Export core functions to window for global access
Object.assign(window, {
    loadSample,
    clearEditor,
    renderMarkdown,
    openStylePorter,
    closeStylePorter,
    loadThemesFromAPI,
    populateThemeSelector,
    checkBackendStatus
});

// Export core module
window.CoreModule = {
    loadThemesFromAPI,
    populateThemeSelector,
    renderMarkdown,
    loadSample,
    clearEditor,
    checkBackendStatus,
    openStylePorter,
    closeStylePorter,
    THEMES,
    STYLES,
    getCurrentTheme: () => currentTheme,
    setCurrentTheme: (theme) => {
        currentTheme = theme;
        SharedUtils.AppState.set('currentTheme', theme);
    }
};

SharedUtils.log('Core', '✅ Core module loaded successfully');