# Modules Directory Structure

This directory contains all modularized JavaScript components for the md2any application, organized into two main categories: **Core** and **Features**.

## 📁 Directory Structure

```
modules/
├── core/                          # Core Application Modules
│   ├── themeManager.js           # Theme loading and API management
│   ├── editorManager.js          # CodeMirror editor operations
│   ├── formatCustomization.js    # Custom format and style handling
│   ├── renderEngine.js           # Markdown rendering engine
│   └── uiController.js           # UI interactions and controls
│
├── features/                      # Extended Feature Modules
│   ├── imageHandling.js          # Image storage and compression
│   ├── download.js               # Multi-format export functionality
│   ├── clipboard.js              # Clipboard operations
│   ├── wechatIntegration.js      # WeChat and AI features
│   └── styleManager.js           # Style management and import
│
├── utils/                         # Utility & Helper Modules
│   └── mathjax_converter.js      # MathJax SVG to image conversion
│
├── core.js                        # Core Module Entry Point
├── features.js                    # Features Module Entry Point
└── README.md                      # This file
```

## 🎯 Module Organization

### Core Modules (`/core/`)

The core modules form the foundation of the application. They handle essential functionality that everything else depends on.

#### themeManager.js
- **Purpose**: Manage application themes and API communication
- **Exports**: 
  - `loadThemesFromAPI()`
  - `populateThemeSelector()`
  - `getCurrentTheme()`
  - `setCurrentTheme(theme)`
  - `checkBackendStatus()`
  - `setupThemeChangeListener()`
- **Dependencies**: shared.js

#### editorManager.js
- **Purpose**: Manage the markdown editor and content
- **Exports**:
  - `initializeCodeMirror()`
  - `getEditorContent()`
  - `setEditorContent(content)`
  - `appendToEditor(content)`
  - `updateCharCount()`
  - `clearEditor()`
  - `isSplitRenderingEnabled()`
  - `setupSplitRenderingListener()`
- **Dependencies**: shared.js

#### formatCustomization.js
- **Purpose**: Handle custom formatting and style customization
- **Exports**:
  - `initializeFormatCustomization()`
  - `initializeImageCompressionSettings()`
  - `setupLivePreview()`
  - `applyLivePreview()`
  - `saveCustomFormat()`
  - `resetCustomFormat()`
  - `loadCustomFormats()`
  - `loadDefaultFormatValues()`
- **Dependencies**: shared.js, editorManager.js

#### renderEngine.js
- **Purpose**: Render markdown and manage external libraries
- **Exports**:
  - `renderMarkdown()`
  - `renderSplitMarkdown()`
  - `renderNormalMarkdown()`
  - `initializeMermaid()`
  - `initializeMathJax()`
- **Dependencies**: shared.js, editorManager.js, themeManager.js

#### uiController.js
- **Purpose**: Handle UI interactions, dialogs, and keyboard shortcuts
- **Exports**:
  - `setupSettingsPanel()`
  - `updateSettingsToggleText()`
  - `setupStylePorter()`
  - `openStylePorter()`
  - `closeStylePorter()`
  - `setupKeyboardShortcuts()`
  - `loadSample()`
- **Dependencies**: shared.js, editorManager.js, renderEngine.js

### Utility Modules (`/utils/`)

The utility modules provide helper functions and converters used across the application.

#### shared.js
- **Purpose**: Shared utilities and configuration for the entire application
- **Key Exports**:
  - `CONFIG` - Application configuration object
  - `SharedUtils` - Common utility functions
  - Helper functions: `updateStatus()`, `showLoading()`, `hideLoading()`, `debounce()`, `log()`, `logError()`
- **Dependencies**: None (must load first)
- **Used by**: All modules (loaded at startup)
- **Note**: Must load before all other modules

#### mathjax_converter.js
- **Purpose**: Convert MathJax SVG elements to image data URLs
- **Key Functions**:
  - `convertMathJaxSvgToImage(svgElement)` - Convert SVG to image data URL
  - Handles font definitions and namespaces
  - Ensures cross-platform compatibility
- **Dependencies**: shared.js
- **Used by**: clipboard.js, wechatIntegration.js

---

### Feature Modules (`/features/`)

The feature modules extend the core functionality with advanced capabilities. They depend on core modules but can be independently updated or extended.

#### imageHandling.js
- **Purpose**: Handle image storage, compression, and paste operations
- **Classes**: `ImageStore`, `ImageCompressor`
- **Key Functions**:
  - `initImagePaste()`
  - `handleImageUpload(file)`
  - `showImageStatus(message, type)`
- **Dependencies**: shared.js

#### download.js
- **Purpose**: Export content to multiple file formats
- **Exports**:
  - `downloadHTML()`
  - `downloadPNG()`
  - `downloadMD()`
  - `downloadTXT()`
  - `downloadPDF()`
  - `downloadDOCX()`
  - `renderMarkdownForExport()`
- **Dependencies**: shared.js, core.js (renderMarkdown, getCurrentTheme)

#### clipboard.js
- **Purpose**: Handle clipboard operations with rich text support
- **Exports**:
  - `copyToClipboard()`
  - `convertImageToBase64(img)`
  - `convertGridToTable(doc)`
- **Dependencies**: shared.js

#### wechatIntegration.js
- **Purpose**: WeChat integration and AI features
- **Exports**:
  - `sendToWeChatDraft()`
  - `configureWeChat()`
  - `convertToWeChatHTML()`
  - `generateMarkdown()`
  - `showAIResultModal(htmlContent)`
  - `getContainerStyleFromPreview()`
- **Dependencies**: shared.js, clipboard.js, download.js

#### styleManager.js
- **Purpose**: Manage UI drawer and style import
- **Exports**:
  - `openLeftDrawer()`
  - `closeLeftDrawer()`
  - `fetchAndApplyStyle()`
  - `applyExtractedStyles(styles)`
  - `showStyleStatus(message, type)`
  - `isValidUrl(string)`
- **Dependencies**: shared.js

## 🔄 Load Order

The scripts must load in this specific order to ensure all dependencies are satisfied:

```
1. shared.js                         (utilities)
2. modules/core/themeManager.js     (core - themes)
3. modules/core/editorManager.js    (core - editor)
4. modules/core/formatCustomization.js (core - formats)
5. modules/core/renderEngine.js     (core - rendering)
6. modules/core/uiController.js     (core - UI)
7. core.js                          (core entry point)
8. modules/features/imageHandling.js (features - images)
9. modules/features/download.js     (features - exports)
10. modules/features/clipboard.js   (features - clipboard)
11. modules/features/wechatIntegration.js (features - wechat)
12. modules/features/styleManager.js (features - styles)
13. features.js                     (features entry point)
```

This order is configured in `index.html`.

## 📊 Module Statistics

| Module | Lines | Purpose |
|--------|-------|---------|
| **Core Modules** | | |
| themeManager.js | 186 | Theme management |
| editorManager.js | 202 | Editor operations |
| formatCustomization.js | 332 | Custom formats |
| renderEngine.js | 226 | Rendering |
| uiController.js | 278 | UI controls |
| core.js (entry) | 237 | Orchestration |
| | **1,461** | **Core Total** |
| **Feature Modules** | | |
| imageHandling.js | 377 | Image handling |
| download.js | 550 | Export formats |
| clipboard.js | 289 | Clipboard ops |
| wechatIntegration.js | 520 | WeChat & AI |
| styleManager.js | 164 | Style management |
| features.js (entry) | 144 | Orchestration |
| | **2,044** | **Features Total** |
| **Combined** | **3,505** | **All Modules** |

## 🔗 Dependency Graph

```
shared.js
    ↓
    ├─ core/
    │  ├─ themeManager.js
    │  ├─ editorManager.js
    │  ├─ formatCustomization.js → editorManager.js
    │  ├─ renderEngine.js → editorManager.js, themeManager.js
    │  └─ uiController.js → editorManager.js, renderEngine.js
    │
    ├─ core.js (entry point)
    │
    └─ features/
       ├─ imageHandling.js
       ├─ download.js → core.js (renderMarkdown, getCurrentTheme)
       ├─ clipboard.js
       ├─ wechatIntegration.js → clipboard.js, download.js
       └─ styleManager.js

features.js (entry point) → all feature modules
```

## 🎯 Adding New Modules

### For Core Functionality

1. Create file in `static/modules/core/myModule.js`
2. Export functions in module
3. Export in `core.js`
4. Add script tag to `index.html` (after other core modules, before `core.js`)

### For Feature Functionality

1. Create file in `static/modules/features/myFeature.js`
2. Export functions in module
3. Export in `features.js`
4. Add script tag to `index.html` (after other feature modules, before `features.js`)

## 📝 Module Template

```javascript
/**
 * Module Name
 * 
 * Brief description of what this module does.
 */

/**
 * Function description
 */
function myFunction() {
    // Implementation
}

// Export to global scope
window._myFunction = myFunction;

console.log('✅ My Module loaded');
```

## 🧪 Testing

Each module can be tested independently:

```javascript
// Test core modules
CoreModule.renderMarkdown();
CoreModule.clearEditor();

// Test feature modules
FeaturesModule.downloadHTML();
FeaturesModule.copyToClipboard();
```

## 🔄 Backward Compatibility

All modules maintain backward compatibility:
- Functions available globally
- HTML onclick handlers work unchanged
- `CoreModule` and `FeaturesModule` APIs available
- Underscore-prefixed versions available

## 📚 Related Documentation

- [REFACTORING_GUIDE.md](../../REFACTORING_GUIDE.md) - Features.js refactoring details
- [CORE_REFACTORING_GUIDE.md](../../CORE_REFACTORING_GUIDE.md) - Core.js refactoring details

## 🚀 Best Practices

1. **Keep modules focused** - One responsibility per module
2. **Minimize dependencies** - Reduce coupling between modules
3. **Clear exports** - Make function purposes obvious
4. **Document changes** - Update this README when adding modules
5. **Test independently** - Verify each module works in isolation
6. **Maintain load order** - Respect dependency order in HTML

## 📞 Support

For questions about module organization, refer to the refactoring guides or check the specific module's documentation.

---

**Last Updated**: January 18, 2026  
**Structure Version**: 1.0  
**Total Modules**: 10 (5 core + 5 features)
