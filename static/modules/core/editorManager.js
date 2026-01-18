/**
 * Editor Manager Module
 * 
 * Handles editor functionality:
 * - CodeMirror initialization
 * - Editor content management
 * - Character count tracking
 * - Clear editor functionality
 */

// =============================================================================
// EDITOR INITIALIZATION
// =============================================================================

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
            if (typeof renderMarkdown === 'function') {
                renderMarkdown();
            }
        }, 300)();
    });
    
    // Store reference to CodeMirror instance
    window.codeMirrorInstance = cm;
    
    SharedUtils.log('EditorManager', 'CodeMirror editor initialized');
}

// =============================================================================
// EDITOR CONTENT MANAGEMENT
// =============================================================================

/**
 * Get editor content
 */
function getEditorContent() {
    const editor = document.getElementById('editor');
    
    if (window.codeMirrorInstance) {
        return window.codeMirrorInstance.getValue();
    } else if (editor) {
        return editor.value;
    }
    
    return '';
}

/**
 * Set editor content
 */
function setEditorContent(content) {
    const editor = document.getElementById('editor');
    
    if (window.codeMirrorInstance) {
        window.codeMirrorInstance.setValue(content);
    } else if (editor) {
        editor.value = content;
    }
    
    updateCharCount();
}

/**
 * Append content to editor
 */
function appendToEditor(content) {
    const editor = document.getElementById('editor');
    
    if (window.codeMirrorInstance) {
        const cm = window.codeMirrorInstance;
        const doc = cm.getDoc();
        const lastLine = doc.lastLine();
        const lastChar = doc.getLine(lastLine).length;
        doc.replaceRange(content, {line: lastLine, ch: lastChar});
    } else if (editor) {
        editor.value += content;
    }
    
    updateCharCount();
}

// =============================================================================
// CHARACTER COUNT
// =============================================================================

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

// =============================================================================
// EDITOR CLEARING
// =============================================================================

/**
 * Clear editor content
 */
function clearEditor() {
    // Check if CodeMirror is initialized
    if (window.codeMirrorInstance) {
        window.codeMirrorInstance.setValue('');
        updateCharCount();
        if (typeof renderMarkdown === 'function') {
            renderMarkdown();
        }
    } else {
        const editor = document.getElementById('editor');
        if (editor) {
            editor.value = '';
            updateCharCount();
            if (typeof renderMarkdown === 'function') {
                renderMarkdown();
            }
        }
    }
}

// =============================================================================
// SPLIT RENDERING SUPPORT
// =============================================================================

/**
 * Check if split rendering is enabled
 */
function isSplitRenderingEnabled() {
    const splitCheckbox = document.getElementById('split-checkbox');
    return splitCheckbox && splitCheckbox.checked;
}

/**
 * Setup split rendering listener
 */
function setupSplitRenderingListener() {
    const splitCheckbox = document.getElementById('split-checkbox');
    if (splitCheckbox) {
        splitCheckbox.addEventListener('change', () => {
            if (typeof renderMarkdown === 'function') {
                renderMarkdown();
            }
        });
    }
}

console.log('✅ Editor Manager module loaded');
