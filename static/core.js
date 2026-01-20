/**
 * Core Application Module - Entry Point
 * 
 * This module serves as the main entry point for the application:
 * - Application initialization
 * - Module orchestration
 * - Global event setup
 * - Backward compatibility
 * 
 * Sub-modules:
 * - themeManager.js: Theme loading and management
 * - editorManager.js: Editor initialization and content management
 * - formatCustomization.js: Custom format handling
 * - renderEngine.js: Markdown rendering
 * - uiController.js: UI interactions and shortcuts
 */

// =============================================================================
// GLOBAL STATE MANAGEMENT
// =============================================================================

// AI formatting flag (controlled by features.js)
Object.defineProperty(window, 'isAIFormatting', {
    writable: true,
    configurable: true,
    value: false
});

// =============================================================================
// APPLICATION INITIALIZATION
// =============================================================================

/**
 * Main application initialization
 */
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 1. Load themes from API
        if (typeof loadThemesFromAPI === 'function') {
            await loadThemesFromAPI();
        }
        
        // 2. Initialize UI components
        initializeAppUI();
        
        // 3. Set up event listeners
        setupEventListeners();
        
        // 4. Load initial content
        updateStatus('就绪');
        if (typeof renderMarkdown === 'function') {
            renderMarkdown();
        }
    } catch (error) {
        updateStatus('应用初始化失败', true);
    }
});

/**
 * Initialize all UI components
 */
function initializeAppUI() {
    // Update character count
    if (typeof updateCharCount === 'function') {
        updateCharCount();
    }
    
    // Check backend status
    if (typeof checkBackendStatus === 'function') {
        checkBackendStatus();
    }
    
    // Initialize format customization
    if (typeof initializeFormatCustomization === 'function') {
        initializeFormatCustomization();
    }
    
    // Initialize CodeMirror editor (always)
    initializeCodeMirror();
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    // Theme change listener
    if (typeof setupThemeChangeListener === 'function') {
        setupThemeChangeListener();
    }
    
    // Split rendering listener
    if (typeof setupSplitRenderingListener === 'function') {
        setupSplitRenderingListener();
    }
    
    // Clear editor button
    const clearBtn = document.getElementById('clear-editor');
    if (clearBtn && typeof clearEditor === 'function') {
        clearBtn.addEventListener('click', clearEditor);
    }
    
    // Settings panel
    if (typeof setupSettingsPanel === 'function') {
        setupSettingsPanel();
    }
    
    // Style porter
    if (typeof setupStylePorter === 'function') {
        setupStylePorter();
    }
    
    // Keyboard shortcuts
    if (typeof setupKeyboardShortcuts === 'function') {
        setupKeyboardShortcuts();
    }
}

// =============================================================================
// GLOBAL EXPORTS FOR BACKWARD COMPATIBILITY
// =============================================================================

// Export all functions to window for global access
// This maintains backward compatibility with existing code

// Theme Management
window._loadThemesFromAPI = loadThemesFromAPI;
window._populateThemeSelector = populateThemeSelector;
window._getCurrentTheme = getCurrentTheme;
window._setCurrentTheme = setCurrentTheme;
window._checkBackendStatus = checkBackendStatus;

// Editor Management
window._initializeCodeMirror = initializeCodeMirror;
window._getEditorContent = getEditorContent;
window._setEditorContent = setEditorContent;
window._appendToEditor = appendToEditor;
window._updateCharCount = updateCharCount;
window._clearEditor = clearEditor;
window._isSplitRenderingEnabled = isSplitRenderingEnabled;

// Format Customization
window._initializeFormatCustomization = initializeFormatCustomization;
window._initializeImageCompressionSettings = initializeImageCompressionSettings;
window._setupLivePreview = setupLivePreview;
window._applyLivePreview = applyLivePreview;
window._saveCustomFormat = saveCustomFormat;
window._resetCustomFormat = resetCustomFormat;
window._loadCustomFormats = loadCustomFormats;
window._loadDefaultFormatValues = loadDefaultFormatValues;

// Render Engine
window._renderMarkdown = renderMarkdown;
window._renderSplitMarkdown = renderSplitMarkdown;
window._renderNormalMarkdown = renderNormalMarkdown;
window._initializeMermaid = initializeMermaid;
window._initializeMathJax = initializeMathJax;

// UI Controller
window._setupSettingsPanel = setupSettingsPanel;
window._updateSettingsToggleText = updateSettingsToggleText;
window._setupStylePorter = setupStylePorter;
window._openStylePorter = openStylePorter;
window._closeStylePorter = closeStylePorter;
window._setupKeyboardShortcuts = setupKeyboardShortcuts;
window._loadSample = loadSample;

// =============================================================================
// CORE MODULE API
// =============================================================================

/**
 * Core Module API - organized access to all core functionality
 */
const CoreModule = {
    // Theme Management
    loadThemesFromAPI,
    populateThemeSelector,
    getCurrentTheme,
    setCurrentTheme,
    checkBackendStatus,
    
    // Editor Management
    initializeCodeMirror,
    getEditorContent,
    setEditorContent,
    appendToEditor,
    updateCharCount,
    clearEditor,
    isSplitRenderingEnabled,
    
    // Format Customization
    initializeFormatCustomization,
    initializeImageCompressionSettings,
    setupLivePreview,
    applyLivePreview,
    saveCustomFormat,
    resetCustomFormat,
    loadCustomFormats,
    loadDefaultFormatValues,
    
    // Render Engine
    renderMarkdown,
    renderSplitMarkdown,
    renderNormalMarkdown,
    initializeMermaid,
    initializeMathJax,
    
    // UI Controller
    setupSettingsPanel,
    updateSettingsToggleText,
    setupStylePorter,
    openStylePorter,
    closeStylePorter,
    setupKeyboardShortcuts,
    loadSample,
    
    // State getters
    get THEMES() { return THEMES; },
    get STYLES() { return STYLES; },
    get currentTheme() { return currentTheme; }
};

// =============================================================================
// TXT TO MD OVERLAY HELPERS
// =============================================================================

/**
 * Show txt-to-md loading overlay
 */
function showTxtToMdOverlay() {
    const overlay = document.getElementById('txt-to-md-loading-overlay');
    if (overlay) {
        overlay.classList.add('active');
    }
}

/**
 * Hide txt-to-md loading overlay
 */
function hideTxtToMdOverlay() {
    const overlay = document.getElementById('txt-to-md-loading-overlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
}

/**
 * Update txt-to-md overlay message
 */
function updateTxtToMdMessage(title, subtitle) {
    const titleEl = document.querySelector('#txt-to-md-loading-overlay .txt-to-md-loading-title');
    const subtitleEl = document.querySelector('#txt-to-md-loading-overlay .txt-to-md-loading-subtitle');
    
    if (titleEl) {
        titleEl.textContent = title;
    }
    if (subtitleEl) {
        subtitleEl.innerHTML = subtitle + '<span class="txt-to-md-loading-dots"></span>';
    }
}

// Export overlay helpers to window
window._showTxtToMdOverlay = showTxtToMdOverlay;
window._hideTxtToMdOverlay = hideTxtToMdOverlay;
window._updateTxtToMdMessage = updateTxtToMdMessage;

// Export to window
window.CoreModule = CoreModule;
