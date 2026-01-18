/**
 * Features Module - Main Entry Point
 * 
 * This module serves as the entry point for all features:
 * - Image handling (imageHandling.js)
 * - Download functionality (download.js)
 * - Clipboard operations (clipboard.js)
 * - WeChat integration (wechatIntegration.js)
 * - Style management (styleManager.js)
 * 
 * All sub-modules are loaded and their functions are exposed globally.
 */

// =============================================================================
// MODULE IMPORTS
// =============================================================================

// Note: Modules are loaded via script tags in index.html
// This ensures proper dependency order and error handling

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize all features when DOM is ready
 */
function initializeFeatures() {
    // Initialize image paste functionality
    if (typeof initImagePaste === 'function') {
        initImagePaste();
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeFeatures);
} else {
    initializeFeatures();
}

// =============================================================================
// GLOBAL EXPORTS
// =============================================================================

// Export all functions to global scope for backward compatibility
// This ensures that existing HTML onclick handlers continue to work

// Image Handling
window._initImagePaste = initImagePaste;
window._handleImageUpload = handleImageUpload;
window._showImageStatus = showImageStatus;

// Download Functions
window._downloadHTML = downloadHTML;
window._downloadPNG = downloadPNG;
window._downloadMD = downloadMD;
window._downloadTXT = downloadTXT;
window._downloadPDF = downloadPDF;
window._downloadDOCX = downloadDOCX;
window._renderMarkdownForExport = renderMarkdownForExport;

// Clipboard Functions
window._copyToClipboard = copyToClipboard;
window._convertImageToBase64 = convertImageToBase64;
window._convertGridToTable = convertGridToTable;

// WeChat Functions
window._sendToWeChatDraft = sendToWeChatDraft;
window._configureWeChat = configureWeChat;
window._getContainerStyleFromPreview = getContainerStyleFromPreview;
window._convertToWeChatHTML = convertToWeChatHTML;

// AI Functions
window._generateMarkdown = generateMarkdown;
window._showAIResultModal = showAIResultModal;
window._clearAIFormatting = clearAIFormatting;

// Style Manager Functions
window._openLeftDrawer = openLeftDrawer;
window._closeLeftDrawer = closeLeftDrawer;
window._fetchAndApplyStyle = fetchAndApplyStyle;
window._applyExtractedStyles = applyExtractedStyles;
window._showStyleStatus = showStyleStatus;

// Classes
window._ImageStore = ImageStore;
window._ImageCompressor = ImageCompressor;

// =============================================================================
// FEATURES MODULE EXPORT
// =============================================================================

/**
 * Main Features Module API
 * All features are accessible through this object
 */
const FeaturesModule = {
    // Image Handling
    initImagePaste,
    handleImageUpload,
    showImageStatus,
    ImageStore,
    ImageCompressor,
    
    // Download Functions
    downloadHTML,
    downloadPNG,
    downloadMD,
    downloadTXT,
    downloadPDF,
    downloadDOCX,
    renderMarkdownForExport,
    
    // Clipboard Functions
    copyToClipboard,
    convertImageToBase64,
    convertGridToTable,
    
    // WeChat Functions
    sendToWeChatDraft,
    configureWeChat,
    getContainerStyleFromPreview,
    convertToWeChatHTML,
    
    // AI Functions
    generateMarkdown,
    showAIResultModal,
    clearAIFormatting,
    
    // Style Manager Functions
    openLeftDrawer,
    closeLeftDrawer,
    fetchAndApplyStyle,
    applyExtractedStyles,
    showStyleStatus
};

// Export to window for global access
window.FeaturesModule = FeaturesModule;
