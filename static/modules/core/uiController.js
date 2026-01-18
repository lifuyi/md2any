/**
 * UI Controller Module
 * 
 * Handles UI interactions:
 * - Settings panel management
 * - Style porter functionality
 * - Keyboard shortcuts
 * - Sample content loading
 */

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
                    if (typeof renderMarkdown === 'function') {
                        renderMarkdown();
                    }
                    break;
            }
        }
        
        // Ctrl+Shift+Backspace to clear editor
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Backspace') {
            e.preventDefault();
            if (typeof clearEditor === 'function') {
                clearEditor();
            }
        }
    });
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
    
    if (typeof setEditorContent === 'function') {
        setEditorContent(sampleMarkdown);
        if (typeof renderMarkdown === 'function') {
            renderMarkdown();
        }
    } else {
        // Fallback
        if (window.codeMirrorInstance) {
            window.codeMirrorInstance.setValue(sampleMarkdown);
            if (typeof updateCharCount === 'function') {
                updateCharCount();
            }
            if (typeof renderMarkdown === 'function') {
                renderMarkdown();
            }
        } else {
            const editor = document.getElementById('editor');
            if (editor) {
                editor.value = sampleMarkdown;
                if (typeof updateCharCount === 'function') {
                    updateCharCount();
                }
                if (typeof renderMarkdown === 'function') {
                    renderMarkdown();
                }
            }
        }
    }
}

console.log('✅ UI Controller module loaded');
