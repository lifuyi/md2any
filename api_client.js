/**
 * API Client for md2any Backend
 * Handles communication with the FastAPI backend for markdown rendering
 */

class Md2anyApiClient {
    constructor(baseUrl = 'http://localhost:8000') {
        this.baseUrl = baseUrl;
        this.themes = [];
        this.isOnline = false;
    }

    /**
     * Initialize the API client
     */
    async init() {
        await this.checkHealth();
        if (this.isOnline) {
            await this.loadThemes();
        }
    }

    /**
     * Check if the API server is healthy
     */
    async checkHealth() {
        try {
            const response = await fetch(`${this.baseUrl}/health`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.isOnline = data.status === 'healthy';
                console.log('API server is online:', data);
            } else {
                this.isOnline = false;
            }
        } catch (error) {
            console.warn('API server is offline, falling back to frontend rendering:', error);
            this.isOnline = false;
        }
    }

    /**
     * Load available themes from the backend
     */
    async loadThemes() {
        try {
            const response = await fetch(`${this.baseUrl}/themes`);
            if (response.ok) {
                const data = await response.json();
                this.themes = data.themes;
                console.log('Loaded themes from backend:', this.themes);
                return this.themes;
            }
        } catch (error) {
            console.error('Failed to load themes from backend:', error);
        }
        return [];
    }

    /**
     * Render markdown to HTML using the backend API
     */
    async renderMarkdown(markdownText, theme = 'default', platform = 'wechat') {
        if (!this.isOnline) {
            throw new Error('API server is not available');
        }

        try {
            const response = await fetch(`${this.baseUrl}/render`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    markdown_text: markdownText,
                    theme: theme,
                    platform: platform
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Rendering failed');
            }

            const data = await response.json();
            return {
                html: data.html,
                theme: data.theme,
                platform: data.platform,
                success: data.success
            };
        } catch (error) {
            console.error('Failed to render markdown:', error);
            throw error;
        }
    }

    /**
     * Preview a theme with sample content
     */
    async previewTheme(themeName, platform = 'wechat') {
        if (!this.isOnline) {
            throw new Error('API server is not available');
        }

        try {
            const response = await fetch(`${this.baseUrl}/preview/${themeName}?platform=${platform}`);
            if (response.ok) {
                return await response.text();
            } else {
                throw new Error(`Failed to preview theme: ${themeName}`);
            }
        } catch (error) {
            console.error('Failed to preview theme:', error);
            throw error;
        }
    }

    /**
     * Get server information
     */
    async getServerInfo() {
        try {
            const response = await fetch(`${this.baseUrl}/`);
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('Failed to get server info:', error);
        }
        return null;
    }
}

/**
 * Enhanced Markdown Renderer with Backend Integration
 */
class EnhancedMarkdownRenderer {
    constructor() {
        this.apiClient = new Md2anyApiClient();
        this.fallbackRenderer = null; // Will be set to the existing frontend renderer
        this.useBackend = true;
    }

    /**
     * Initialize the renderer
     */
    async init(fallbackRenderer) {
        this.fallbackRenderer = fallbackRenderer;
        await this.apiClient.init();
        
        if (!this.apiClient.isOnline && this.fallbackRenderer) {
            console.log('Using fallback frontend renderer');
            this.useBackend = false;
        }
    }

    /**
     * Render markdown with automatic fallback
     */
    async render(markdownText, theme = 'default', platform = 'wechat') {
        // Try backend first if available
        if (this.useBackend && this.apiClient.isOnline) {
            try {
                const result = await this.apiClient.renderMarkdown(markdownText, theme, platform);
                return result.html;
            } catch (error) {
                console.warn('Backend rendering failed, falling back to frontend:', error);
                this.useBackend = false;
            }
        }

        // Fallback to frontend rendering
        if (this.fallbackRenderer) {
            return this.fallbackRenderer.render(markdownText, theme, platform);
        }

        throw new Error('No renderer available');
    }

    /**
     * Get available themes
     */
    async getThemes() {
        if (this.useBackend && this.apiClient.isOnline) {
            try {
                return await this.apiClient.loadThemes();
            } catch (error) {
                console.warn('Failed to load themes from backend:', error);
            }
        }

        // Fallback to frontend themes
        if (window.themes) {
            return Object.keys(window.themes).map(id => ({
                id: id,
                name: window.themes[id].name || id,
                description: window.themes[id].description || ''
            }));
        }

        return [];
    }

    /**
     * Check if backend is available
     */
    isBackendAvailable() {
        return this.useBackend && this.apiClient.isOnline;
    }

    /**
     * Toggle between backend and frontend rendering
     */
    toggleBackend(useBackend) {
        this.useBackend = useBackend && this.apiClient.isOnline;
    }
}

/**
 * Integration with existing app
 */
function integrateWithVueApp(app) {
    if (!app) {
        console.error('Vue app not found for integration');
        return;
    }

    // Create enhanced renderer
    const enhancedRenderer = new EnhancedMarkdownRenderer();

    // Initialize and integrate
    enhancedRenderer.init(app.markdownRenderer).then(() => {
        // Add backend status to Vue data
        if (app.$data) {
            app.$data.backendAvailable = enhancedRenderer.isBackendAvailable();
            app.$data.useBackend = enhancedRenderer.isBackendAvailable();
        }

        // Replace the renderer
        app.enhancedRenderer = enhancedRenderer;

        // Add method to toggle backend
        app.toggleBackend = function() {
            this.$data.useBackend = !this.$data.useBackend;
            enhancedRenderer.toggleBackend(this.$data.useBackend);
            this.renderMarkdown(); // Re-render with new setting
        };

        // Enhance the existing renderMarkdown method
        const originalRenderMarkdown = app.renderMarkdown;
        app.renderMarkdown = async function() {
            if (enhancedRenderer.isBackendAvailable() && this.$data.useBackend) {
                try {
                    this.renderedHtml = await enhancedRenderer.render(
                        this.markdownText,
                        this.selectedTheme,
                        this.selectedPlatform
                    );
                    this.lastRenderTime = new Date().toLocaleTimeString();
                } catch (error) {
                    console.error('Enhanced rendering failed:', error);
                    // Fallback to original method
                    originalRenderMarkdown.call(this);
                }
            } else {
                originalRenderMarkdown.call(this);
            }
        };

        console.log('Backend integration completed');
    });
}

// Auto-integrate when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for Vue app to initialize
    setTimeout(() => {
        if (window.app) {
            integrateWithVueApp(window.app);
        }
    }, 1000);
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        Md2anyApiClient,
        EnhancedMarkdownRenderer,
        integrateWithVueApp
    };
}