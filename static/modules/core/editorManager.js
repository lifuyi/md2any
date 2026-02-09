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
 * Initialize CodeMirror editor (the only editor)
 */
function initializeCodeMirror() {
    const editorElement = document.getElementById('editor');
    if (!editorElement) {
        return;
    }
    
    
    // Hide the textarea (kept for form compatibility but not used)
    editorElement.style.display = 'none';
    
    // Create a container for CodeMirror
    const container = document.createElement('div');
    container.id = 'codemirror-container';
    container.style.height = '100%';
    container.style.width = '100%';
    container.style.display = 'block';
    
    // Insert container before the textarea
    editorElement.parentNode.insertBefore(container, editorElement);
    
    // Initialize CodeMirror with empty value initially
    const cm = CodeMirror(container, {
        value: '',
        mode: 'markdown',
        theme: 'default',
        lineNumbers: true,
        lineWrapping: true,
        autoCloseBrackets: true,
        matchBrackets: true,
        tabSize: 2,
        indentUnit: 2,
        scrollPadding: 50, // Add padding at bottom when scrolling to prevent last line cutoff - increased from 20 to 50
        extraKeys: {
            'Enter': 'newlineAndIndentContinueMarkdownList',
            'Tab': 'indentMore',
            'Shift-Tab': 'indentLess'
        }
    });
    
    
    // Set the height
    cm.setSize('100%', '100%');
    
    // Check if CodeMirror is visible
    const wrapper = cm.getWrapperElement();
    
    // Add event listeners
    cm.on('change', function(cmInstance) {
        // Update the hidden textarea for form compatibility
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
    
    // Refresh after a short delay to ensure proper rendering
    setTimeout(() => {
        cm.refresh();
    }, 100);
    
    // Additional refresh after window resize to handle layout changes
    window.addEventListener('resize', () => {
        if (window.codeMirrorInstance) {
            window.codeMirrorInstance.refresh();
        }
    });
    
    // Refresh when becoming visible (for tab switches, etc.)
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && window.codeMirrorInstance) {
            window.codeMirrorInstance.refresh();
        }
    });
    
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
 * Set editor content (CodeMirror only)
 */
function setEditorContent(content) {
    if (window.codeMirrorInstance) {
        window.codeMirrorInstance.setValue(content);
        
        // Ensure the container has proper height before refreshing
        const container = document.getElementById('codemirror-container');
        if (container) {
            container.style.height = '100%';
        }
        
        // Multiple refresh calls at different timings to ensure proper height calculation
        // Immediate refresh to handle quick DOM updates
        setTimeout(() => {
            if (window.codeMirrorInstance) {
                window.codeMirrorInstance.refresh();
            }
        }, 0);
        
        // Refresh after DOM settles
        setTimeout(() => {
            if (window.codeMirrorInstance) {
                window.codeMirrorInstance.refresh();
            }
        }, 100);
        
        // Additional refresh after potential drawer/modal transitions complete
        setTimeout(() => {
            if (window.codeMirrorInstance) {
                window.codeMirrorInstance.refresh();
            }
        }, 350);
        
        // Final refresh to ensure everything is properly sized
        setTimeout(() => {
            if (window.codeMirrorInstance) {
                window.codeMirrorInstance.refresh();
            }
        }, 500);
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
 * Clear editor content (CodeMirror only)
 */
function clearEditor() {
    if (window.codeMirrorInstance) {
        window.codeMirrorInstance.setValue('');
        updateCharCount();
        if (typeof renderMarkdown === 'function') {
            renderMarkdown();
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
    const splitCheckbox = document.getElementById('split-view-checkbox');
    return splitCheckbox && splitCheckbox.checked;
}

/**
 * Setup split rendering listener
 */
function setupSplitRenderingListener() {
    const splitCheckbox = document.getElementById('split-view-checkbox');
    if (splitCheckbox) {
        splitCheckbox.addEventListener('change', () => {
            if (typeof renderMarkdown === 'function') {
                renderMarkdown();
            }
        });
    }
}

