/**
 * Shared Utilities and Constants
 * 
 * This module contains common utilities and configuration shared across
 * the entire md2any application. It provides a centralized location for
 * constants, shared helper functions, and common DOM operations.
 */

// =============================================================================
// CONFIGURATION AND CONSTANTS
// =============================================================================

/**
 * Application configuration
 */
const CONFIG = {
    // API Configuration
    API_BASE_URL: typeof window.API_BASE_URL_OVERRIDE !== 'undefined' ? 
        window.API_BASE_URL_OVERRIDE : 
        'https://md2any-production.up.railway.app',
    
    // UI Configuration
    DEBOUNCE_DELAY: 500,
    STATUS_TIMEOUT: 3000,
    
    // Image Configuration
    IMAGE_STORAGE_KEY: 'md2any_images',
    MAX_IMAGE_WIDTH: 1920,
    MAX_IMAGE_HEIGHT: 1080,
    IMAGE_QUALITY: 0.8,
    
    // File Download Configuration
    DEFAULT_FILENAME_PREFIX: 'markdown',
    
    // Theme Configuration
    DEFAULT_THEME: 'alibaba',
    DEFAULT_MODE: 'light-mode',
    DEFAULT_PLATFORM: 'wechat'
};

// =============================================================================
// SHARED UTILITY FUNCTIONS
// =============================================================================

/**
 * Debounce function to limit the rate of function execution
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, delay = CONFIG.DEBOUNCE_DELAY) {
    let debounceTimer;
    return function(...args) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => func.apply(this, args), delay);
    };
}

/**
 * Show loading indicator
 */
function showLoading() {
    const loading = document.getElementById('loading');
    if (loading) loading.classList.add('active');
}

/**
 * Hide loading indicator
 */
function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) loading.classList.remove('active');
}

/**
 * Update status message
 * @param {string} message - Status message to display
 * @param {boolean} isError - Whether this is an error message
 */
function updateStatus(message, isError = false) {
    const status = document.getElementById('status');
    if (status) {
        status.textContent = message;
        status.style.color = isError ? '#c33' : '#666';
    }
}

/**
 * Format file size for display
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size string
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Generate timestamp-based filename
 * @param {string} prefix - Filename prefix
 * @param {string} extension - File extension
 * @param {string} suffix - Optional suffix
 * @returns {string} Generated filename
 */
function generateFilename(prefix = CONFIG.DEFAULT_FILENAME_PREFIX, extension = '', suffix = '') {
    const timestamp = Date.now();
    const parts = [prefix];
    if (suffix) parts.push(suffix);
    parts.push(timestamp);
    return parts.join('-') + (extension ? '.' + extension : '');
}

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} Whether URL is valid
 */
function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * Safe JSON parse with fallback
 * @param {string} json - JSON string to parse
 * @param {*} fallback - Fallback value if parsing fails
 * @returns {*} Parsed object or fallback
 */
function safeJsonParse(json, fallback = null) {
    try {
        return JSON.parse(json);
    } catch {
        return fallback;
    }
}

/**
 * Create and download a file
 * @param {Blob|string} content - File content
 * @param {string} filename - Filename for download
 * @param {string} mimeType - MIME type for the file
 */
function downloadFile(content, filename, mimeType = 'text/plain') {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Check if the current context is secure (HTTPS or localhost)
 * @returns {boolean} Whether context is secure
 */
function isSecureContext() {
    return location.protocol === 'https:' || 
           location.hostname === 'localhost' || 
           location.hostname === '127.0.0.1';
}

/**
 * Check if modern clipboard API is available
 * @returns {boolean} Whether clipboard API is available
 */
function hasClipboardAPI() {
    return navigator.clipboard && window.ClipboardItem && isSecureContext();
}

/**
 * Convert markdown text to plain text
 * @param {string} markdown - Markdown text
 * @returns {string} Plain text
 */
function markdownToPlainText(markdown) {
    return markdown
        .replace(/```[\s\S]*?```/g, '') // Remove code blocks
        .replace(/`[^`]*`/g, '') // Remove inline code
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links, keep text
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, '') // Remove images
        .replace(/^#+\s*/gm, '') // Remove headers
        .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
        .replace(/\*([^*]+)\*/g, '$1') // Remove italic
        .replace(/__([^_]+)__/g, '$1') // Remove bold
        .replace(/_([^_]+)_/g, '$1') // Remove italic
        .replace(/~~([^~]+)~~/g, '$1') // Remove strikethrough
        .replace(/^>\s*/gm, '') // Remove quotes
        .replace(/^[\d-]\.\s*/gm, '') // Remove list markers
        .replace(/^[-*]{3,}$/gm, '') // Remove horizontal rules
        .replace(/\n{3,}/g, '\n\n') // Normalize newlines
        .trim();
}

/**
 * Log function with timestamp and context
 * @param {string} context - Context/module name
 * @param {string} message - Log message
 * @param {...any} args - Additional arguments
 */
function log(context, message, ...args) {
    // Console logging disabled
}

/**
 * Error logging with context
 * @param {string} context - Context/module name
 * @param {string} message - Error message
 * @param {Error} error - Error object
 */
function logError(context, message, error) {
    // Console error logging disabled
}

// =============================================================================
// SHARED STATE MANAGEMENT
// =============================================================================

/**
 * Simple state manager for shared application state
 */
const AppState = {
    _state: {
        currentTheme: CONFIG.DEFAULT_THEME,
        isLoading: false,
        lastStatus: '',
        imageCounter: 0
    },
    
    get(key) {
        return this._state[key];
    },
    
    set(key, value) {
        this._state[key] = value;
        this._notifyStateChange(key, value);
    },
    
    _listeners: {},
    
    on(key, callback) {
        if (!this._listeners[key]) {
            this._listeners[key] = [];
        }
        this._listeners[key].push(callback);
    },
    
    _notifyStateChange(key, value) {
        if (this._listeners[key]) {
            this._listeners[key].forEach(callback => callback(value));
        }
    }
};

// =============================================================================
// EXPORTS
// =============================================================================

// Export all utilities to window for global access
window.SharedUtils = {
    CONFIG,
    debounce,
    showLoading,
    hideLoading,
    updateStatus,
    formatFileSize,
    generateFilename,
    isValidUrl,
    safeJsonParse,
    downloadFile,
    isSecureContext,
    hasClipboardAPI,
    markdownToPlainText,
    log,
    logError,
    AppState
};

// Also export individual functions for direct access
Object.assign(window, {
    debounce,
    showLoading,
    hideLoading,
    updateStatus,
    formatFileSize,
    generateFilename,
    isValidUrl,
    safeJsonParse,
    downloadFile,
        isSecureContext,
        hasClipboardAPI,
        markdownToPlainText
    });
    