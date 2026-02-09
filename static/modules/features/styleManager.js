/**
 * Style Manager Module
 * 
 * Handles style and UI management:
 * - Left drawer open/close
 * - Style fetching from URLs
 * - Style application to format customization
 * - UI status messaging
 */

// =============================================================================
// DRAWER MANAGEMENT
// =============================================================================

/**
 * Open left drawer
 */
function openLeftDrawer() {
    const drawer = document.getElementById('left-drawer');
    const overlay = document.getElementById('drawer-overlay');
    
    if (drawer) {
        drawer.classList.add('open');
    }
    
    if (overlay) {
        overlay.classList.add('show');
    }
}

/**
 * Close left drawer
 */
function closeLeftDrawer() {
    const drawer = document.getElementById('left-drawer');
    const overlay = document.getElementById('drawer-overlay');
    
    if (drawer) {
        drawer.classList.remove('open');
    }
    
    if (overlay) {
        overlay.classList.remove('show');
    }
}

// =============================================================================
// STYLE FETCHING AND APPLICATION
// =============================================================================

/**
 * Check if URL is valid
 */
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

/**
 * Fetch and apply styles from a URL
 */
async function fetchAndApplyStyle() {
    const urlInput = document.getElementById('style-url-input');
    const fetchBtn = document.getElementById('fetch-style-btn');
    
    if (!urlInput || !urlInput.value.trim()) {
        showStyleStatus('请输入URL', 'error');
        return;
    }
    
    const url = urlInput.value.trim();
    
    if (!isValidUrl(url)) {
        showStyleStatus('请输入有效的URL格式', 'error');
        return;
    }
    
    fetchBtn.disabled = true;
    fetchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 获取中...';
    showStyleStatus('正在使用AI获取页面样式...', 'info');
    
    try {
        const response = await fetch('/ai/extract-style', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                url: url,
                markdown: "" // Required by API but not needed for extraction-only
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            applyExtractedStyles(result.styles);
            showStyleStatus('✅ 样式应用成功', 'success');
            
            // Clear the input
            urlInput.value = '';
        } else {
            showStyleStatus('❌ ' + (result.message || '样式提取失败'), 'error');
        }
        
    } catch (error) {
        showStyleStatus('❌ 获取失败: ' + error.message, 'error');
    } finally {
        fetchBtn.disabled = false;
        fetchBtn.innerHTML = '<i class="fas fa-download"></i> 获取样式';
    }
}

/**
 * Apply extracted styles to format customization fields
 */
function applyExtractedStyles(styles) {
    const styleFields = [
        'container', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
        'p', 'strong', 'em', 'code', 'pre', 'blockquote', 
        'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'innercontainer'
    ];
    
    styleFields.forEach(field => {
        const textarea = document.getElementById(`format-${field}`);
        if (textarea && styles[field]) {
            textarea.value = styles[field];
        }
    });
    
    // Trigger format update if FormatCustomizer is available
    if (window.formatCustomizer && typeof window.formatCustomizer.previewCustomFormat === 'function') {
        window.formatCustomizer.previewCustomFormat();
    }
}

// =============================================================================
// STATUS MESSAGING
// =============================================================================

/**
 * Show style status message
 */
function showStyleStatus(message, type) {
    const statusElement = document.getElementById('style-status-message');
    
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.className = `style-status ${type}`;
        statusElement.style.display = 'block';
        
        if (type === 'success' || type === 'error') {
            setTimeout(() => {
                statusElement.style.display = 'none';
            }, 3000);
        }
    }
}
