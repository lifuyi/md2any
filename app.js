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

// Setup settings panel
function setupSettingsPanel() {
    const settingsToggle = document.getElementById('settings-toggle');
    const settingsClose = document.getElementById('settings-close');
    const settingsPane = document.getElementById('settings-pane');
    
    if (settingsToggle) {
        settingsToggle.addEventListener('click', () => {
            if (settingsPane) {
                settingsPane.classList.toggle('visible');
                updateSettingsToggleText();
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

// Render markdown using backend API
async function renderMarkdown() {
    const editor = document.getElementById('editor');
    const preview = document.getElementById('preview');
    
    if (!editor || !preview) return;
    
    const markdown = editor.value.trim();
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
        const requestData = {
            markdown_text: markdown,
            theme: theme,
            mode: 'light-mode',
            platform: 'wechat'
        };
        console.log('Sending render request:', `${API_BASE_URL}/render`, requestData);
        
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