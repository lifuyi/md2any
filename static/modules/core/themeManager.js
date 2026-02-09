/**
 * Theme Manager Module
 * 
 * Handles theme management:
 * - Loading themes from API
 * - Theme selection and switching
 * - Theme selector population
 * - Backend status monitoring
 */

// =============================================================================
// GLOBAL STATE
// =============================================================================

let THEMES = {};
let STYLES = {};
let currentTheme = SharedUtils.CONFIG.DEFAULT_THEME;

// =============================================================================
// THEME LOADING
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
        STYLES = {};
        
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
        
    } catch (error) {
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

/**
 * Get current theme
 */
function getCurrentTheme() {
    return currentTheme;
}

/**
 * Set current theme
 */
function setCurrentTheme(theme) {
    currentTheme = theme;
    SharedUtils.AppState.set('currentTheme', theme);
}

// =============================================================================
// BACKEND STATUS
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
        } else {
            throw new Error('Backend not responding');
        }
    } catch (error) {
        
        // Show offline status
        if (backendStatusBtn) {
            backendStatusBtn.className = 'btn btn-secondary backend-error';
            if (statusText) statusText.textContent = '后端离线';
            if (statusIndicator) statusIndicator.className = 'backend-status-indicator status-error';
        }
    }
}

// =============================================================================
// THEME CHANGE LISTENER
// =============================================================================

/**
 * Setup theme change listener
 */
function setupThemeChangeListener() {
    const themeSelector = document.getElementById('theme-selector');
    
    if (themeSelector) {
        themeSelector.addEventListener('change', () => {
            currentTheme = themeSelector.value;
            SharedUtils.AppState.set('currentTheme', currentTheme);
            if (typeof renderMarkdown === 'function') {
                renderMarkdown();
            }
        });
    }
}

