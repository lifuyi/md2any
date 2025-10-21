// Main application script - works with Python backend
// Configuration
const API_BASE_URL = window.location.hostname ? 
    `http://${window.location.hostname}:5005` : 
    'http://localhost:5005';

// Global state
let THEMES = {};
let STYLES = {}; // For backward compatibility
let currentTheme = 'alibaba'; // Default to first available theme

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Initializing md2any application...');
    
    // Load themes from API
    await loadThemesFromAPI();
    
    // Initialize UI components
    initializeUI();
    
    // Set up event listeners
    setupEventListeners();
    
    // Load initial content if any
    updateStatus('就绪');
    renderMarkdown();
});

// Load themes from the API
async function loadThemesFromAPI() {
    try {
        updateStatus('加载主题中...');
        const response = await fetch(`${API_BASE_URL}/themes`);
        
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
                // Note: styles will be loaded from backend during render
            };
        });
        
        // Populate theme selector
        populateThemeSelector();
        
        updateStatus('主题加载完成');
        console.log('Loaded themes:', Object.keys(THEMES));
        
    } catch (error) {
        console.error('Error loading themes:', error);
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

// Populate theme selector dropdown
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
    
    // Set default theme - use first available theme if current theme doesn't exist
    if (STYLES[currentTheme]) {
        themeSelector.value = currentTheme;
    } else {
        const firstTheme = Object.keys(STYLES)[0];
        if (firstTheme) {
            currentTheme = firstTheme;
            themeSelector.value = firstTheme;
        }
    }
}

// Initialize UI components
function initializeUI() {
    // Update character count
    updateCharCount();
    
    // Check backend status
    checkBackendStatus();
    
    // Initialize format customization
    initializeFormatCustomization();
}

// Set up event listeners
function setupEventListeners() {
    const editor = document.getElementById('editor');
    const themeSelector = document.getElementById('theme-selector');
    
    // Editor input with debouncing
    if (editor) {
        editor.addEventListener('input', debounce(() => {
            updateCharCount();
            renderMarkdown();
        }, 500));
    }
    
    // Theme change
    if (themeSelector) {
        themeSelector.addEventListener('change', () => {
            currentTheme = themeSelector.value;
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
    
    // Keyboard shortcuts
    setupKeyboardShortcuts();
}

// Settings panel
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

// Update settings toggle button text
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

// Setup keyboard shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            switch(e.key) {
                case 's':
                    e.preventDefault();
                    downloadHTML();
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

// Initialize format customization functionality
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
    
    // Load saved custom formats
    loadCustomFormats();
}

// Save custom format
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
        const response = await fetch(`${API_BASE_URL}/custom-styles`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
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
        console.error('保存自定义样式失败:', error);
        alert(`保存失败: ${error.message}`);
    }
}

// Reset custom format
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

// Load custom formats
async function loadCustomFormats() {
    try {
        const response = await fetch(`${API_BASE_URL}/custom-styles`);
        if (!response.ok) return;
        
        const data = await response.json();
        console.log('已加载的自定义样式:', data.custom_styles);
        
    } catch (error) {
        console.error('加载自定义样式失败:', error);
    }
}

// Load default format values (Alibaba Orange)
function loadDefaultFormatValues() {
    if (!confirm('确定要加载阿里橙样式吗？这将覆盖当前的所有自定义样式。')) {
        return;
    }
    
    const defaultValues = {
        'format-container': 'max-width: 740px; margin: 0 auto; padding: 20px; font-family: "Helvetica Neue", Helvetica, Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif; font-size: 16px; line-height: 1.8 !important; color: #3f3f3f !important; background-color: #ffffff; word-wrap: break-word;',
        'format-h1': 'font-size: 28px; line-height: 1.4; font-weight: 700; color: #111111; position: relative; padding-bottom: 16px; border-bottom: 2px solid #ff6a00; margin: 32px 0 24px; letter-spacing: 0.5px;',
        'format-h2': 'display: table; padding: 0.6em 1.5em; margin: 2.8em auto 1.5em; font-size: 1.3em; font-weight: 700; text-align: center; color: #fff; background: linear-gradient(135deg, #ff6a00, #ff8c00); border-radius: 30px; position: relative; box-shadow: 0 6px 16px rgba(255, 106, 0, 0.25); letter-spacing: 0.03em; border: 2px solid rgba(255, 255, 255, 0.3); z-index: 1; transition: all 0.3s ease;',
        'format-h3': 'font-size: 1.2em; font-weight: 600; color: #333; margin: 2.2em 0 1em; padding-left: 16px; border-left: 4px solid #ff8c00; line-height: 1.5; position: relative;',
        'format-h4': 'font-size: 20px; font-weight: 600; color: #34495e !important; line-height: 1.4 !important; margin: 24px 0 12px;',
        'format-h5': 'font-size: 18px; font-weight: 600; color: #34495e !important; line-height: 1.4 !important; margin: 20px 0 10px;',
        'format-h6': 'font-size: 16px; font-weight: 600; color: #6b8c42; margin-top: 1.5em; margin-bottom: 0.8em; border-bottom: 1px solid #d4d9c9; padding-bottom: 0.4em;',
        'format-p': 'color: #555555; margin: 20px 0; line-height: 1.8;',
        'format-strong': 'font-weight: 700; color: #ff6a00; background-color: rgba(255, 106, 0, 0.08); padding: 2px 4px; border-radius: 3px;',
        'format-em': 'color: #00f2fe; font-style: italic;',
        'format-a': 'color: #ff6a00; text-decoration: none; font-weight: 600; border-bottom: 2px solid rgba(255, 106, 0, 0.3); padding: 0 2px; transition: all 0.3s ease;',
        'format-ul': 'padding: 16px 16px 16px 36px; background: rgba(255, 106, 0, 0.05); border-radius: 12px; border: 1px solid rgba(255, 106, 0, 0.1); margin: 20px 0;',
        'format-ol': 'padding: 16px 16px 16px 36px; background: rgba(255, 140, 0, 0.05); border-radius: 12px; border: 1px solid rgba(255, 140, 0, 0.1); margin: 20px 0; list-style: none; counter-reset: item;',
        'format-li': 'font-size: 16px; line-height: 1.8; color: #555555; position: relative; margin: 12px 0;',
        'format-blockquote': 'padding: 20px 25px 20px 30px; background: #fffaf5; border-left: 5px solid #ff6a00; border-radius: 0 12px 12px 0; position: relative; color: #444; margin: 24px 0; font-style: italic;',
        'format-code': 'font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace; background: rgba(255, 106, 0, 0.08); padding: 4px 8px; border-radius: 6px; font-size: 14px; color: #d9480f; border: 1px solid rgba(255, 106, 0, 0.1);',
        'format-pre': 'background: #f7f7f7; border-radius: 12px; padding: 20px 24px; overflow-x: auto; position: relative; border: 1px solid #e0e0e0; margin: 24px 0; line-height: 1.6; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);',
        'format-hr': 'border: 0; height: 2px; background: linear-gradient(90deg, transparent, #ff6a00, transparent); margin: 36px 0; position: relative;',
        'format-img': 'max-width: 100%; border: 2px solid #ff6a00; padding: 8px; background-color: #ffffff; position: relative; border-radius: 8px; box-shadow: 0 4px 12px rgba(255, 106, 0, 0.15); margin: 24px auto;',
        'format-table': 'width: 100%; border-collapse: collapse; font-size: 15px; border: 1px solid #e8e8e8; border-radius: 12px; overflow: hidden; margin: 24px 0;',
        'format-th': 'background: rgba(255, 106, 0, 0.1); font-weight: 600; text-align: left; padding: 16px 20px; color: #333; border-bottom: 2px solid rgba(255, 106, 0, 0.2);',
        'format-td': 'padding: 16px 20px; border-bottom: 1px solid #f0f0f0; color: #555; line-height: 1.6;',
        'format-tr': 'border-bottom-color: #ffeae0; transition: background-color 0.2s ease;',
        'format-innercontainer': 'background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 250, 245, 0.95) 100%); border-radius: 16px; padding: 32px; margin: 24px 0; box-shadow: 0 8px 32px rgba(255, 106, 0, 0.15); border: 1px solid rgba(255, 106, 0, 0.1); position: relative; overflow: hidden;'
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

// Render markdown using backend API
async function renderMarkdown() {
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
            // Split markdown by dash separators and render each section
            const sections = markdown.split(/^---$/gm).filter(section => section.trim());
            
            if (sections.length > 1) {
                let sectionedHtml = '';
                
                for (let i = 0; i < sections.length; i++) {
                    const sectionMarkdown = sections[i].trim();
                    if (sectionMarkdown) {
                        const requestData = {
                            markdown_text: sectionMarkdown,
                            theme: theme,
                            mode: 'light-mode',
                            platform: 'wechat',
                            dashseparator: false  // Don't split again on backend
                        };
                        
                        const response = await fetch(`${API_BASE_URL}/render`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(requestData)
                        });
                        
                        if (!response.ok) {
                            throw new Error(`渲染第${i+1}部分失败: ${response.status}`);
                        }
                        
                        const data = await response.json();
                        sectionedHtml += `<section class="markdown-section" data-section="${i+1}">\n${data.html}\n</section>\n`;
                    }
                }
                
                preview.innerHTML = sectionedHtml;
            } else {
                // No valid sections found, render normally
                await renderNormalMarkdown(markdown, theme, preview);
            }
        } else {
            // No splitting needed, render normally
            await renderNormalMarkdown(markdown, theme, preview);
        }
        
        // Initialize Mermaid diagrams if present
        initializeMermaid();
        
        // Initialize MathJax if present
        initializeMathJax();
        
        updateStatus('渲染完成');
        
    } catch (error) {
        console.error('渲染失败:', error);
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

// Helper function to render markdown normally
async function renderNormalMarkdown(markdown, theme, preview) {
    const requestData = {
        markdown_text: markdown,
        theme: theme,
        mode: 'light-mode',
        platform: 'wechat',
        dashseparator: false  // Always false since we handle it in frontend
    };
    
    const response = await fetch(`${API_BASE_URL}/render`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        console.error('Render error response:', errorText);
        throw new Error(`渲染失败: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    preview.innerHTML = data.html;
}

// Initialize Mermaid diagrams
function initializeMermaid() {
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
}

// Initialize MathJax
function initializeMathJax() {
    if (typeof window.MathJax !== 'undefined' && window.MathJax.typesetPromise) {
        setTimeout(() => {
            try {
                window.MathJax.typesetPromise([document.getElementById('preview')]);
            } catch (error) {
                console.warn('MathJax rendering failed:', error);
            }
        }, 100);
    }
}

// Check backend status
async function checkBackendStatus() {
    const backendStatusBtn = document.getElementById('backend-status');
    const statusIndicator = backendStatusBtn?.querySelector('.backend-status-indicator');
    const statusText = backendStatusBtn?.querySelector('span:last-child');
    
    if (!backendStatusBtn) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        
        if (response.ok) {
            const data = await response.json();
            
            // Update UI to show backend is online
            backendStatusBtn.className = 'btn btn-secondary backend-online';
            if (statusText) statusText.textContent = '后端在线';
            if (statusIndicator) statusIndicator.className = 'backend-status-indicator status-online';
            
            console.log('✅ 后端API已连接:', data);
        } else {
            throw new Error('Backend not responding');
        }
    } catch (error) {
        console.warn('❌ 后端API离线:', error);
        
        // Show offline status
        if (backendStatusBtn) {
            backendStatusBtn.className = 'btn btn-secondary backend-error';
            if (statusText) statusText.textContent = '后端离线';
            if (statusIndicator) statusIndicator.className = 'backend-status-indicator status-error';
        }
    }
}

// Utility functions
function debounce(func, delay) {
    let debounceTimer;
    return function(...args) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => func.apply(this, args), delay);
    };
}

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

function updateCharCount() {
    const editor = document.getElementById('editor');
    const charCount = document.getElementById('char-count');
    
    if (editor && charCount) {
        const count = editor.value.length;
        charCount.textContent = `${count} 字符`;
    }
}

function clearEditor() {
    const editor = document.getElementById('editor');
    if (editor) {
        editor.value = '';
        updateCharCount();
        renderMarkdown();
    }
}

// Load sample content
function loadSample() {
    const editor = document.getElementById('editor');
    if (editor) {
        const sampleMarkdown = `# 测试文档 - 完整功能演示

## 标题层级测试

### 三级标题示例

#### 四级标题示例

##### 五级标题示例

###### 六级标题示例
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

### 基础表格
| 姓名 | 年龄 | 城市 | 职业 |
|------|------|------|------|
| 张三 | 25   | 北京 | 工程师 |
| 李四 | 30   | 上海 | 设计师 |
| 王五 | 28   | 广州 | 产品经理 |

## 引用测试

### 单行引用
> 这是一个简单的引用。

### 多行引用
> 这是一个较长的引用，
> 可以跨越多行显示。
> 
> 支持**格式**和*样式*的引用。

## 链接和图片测试

### 普通链接
[百度一下](https://www.baidu.com)

### 自动链接
https://www.example.com

## 分割线测试

---

## 特殊元素测试

### Emoji支持
🎉 🚀 💡 📊 ✨

### 数学公式测试

当 $a \\ne 0$ 时, 方程 $ax^2 + bx + c = 0$ 的解是
$x = {-b \\pm \\sqrt{b^2-4ac} \\over 2a}$

### 特殊符号
© ® ™ → ← ↑ ↓ ↔ ↕

### 数学符号
± × ÷ ≤ ≥ ≠ ∞ ∑ ∏ √ ∛ ∛
`;
        editor.value = sampleMarkdown;
        updateCharCount();
        renderMarkdown();
    }
}

// Export functions (will be implemented in frontend.js)
function downloadHTML() {
    // This will be implemented in frontend.js
    console.log('Download HTML - to be implemented');
}

function downloadPNG() {
    // This will be implemented in frontend.js
    console.log('Download PNG - to be implemented');
}

function downloadMD() {
    // This will be implemented in frontend.js
    console.log('Download MD - to be implemented');
}

function downloadTXT() {
    // This will be implemented in frontend.js
    console.log('Download TXT - to be implemented');
}

function copyToClipboard() {
    // This will be implemented in frontend.js
    console.log('Copy to clipboard - to be implemented');
}

function sendToWeChatDraft() {
    // This will be implemented in frontend.js
    console.log('Send to WeChat draft - to be implemented');
}

function configureWeChat() {
    // This will be implemented in frontend.js
    console.log('Configure WeChat - to be implemented');
}

// Make functions globally available
window.loadSample = loadSample;
window.downloadHTML = downloadHTML;
window.downloadPNG = downloadPNG;
window.downloadMD = downloadMD;
window.downloadTXT = downloadTXT;
window.copyToClipboard = copyToClipboard;
window.sendToWeChatDraft = sendToWeChatDraft;
window.configureWeChat = configureWeChat;