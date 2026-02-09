/**
 * Render Engine Module
 * 
 * Handles markdown rendering:
 * - Main rendering orchestration
 * - Split rendering support
 * - Normal rendering
 * - External library initialization (Mermaid, MathJax)
 */

// =============================================================================
// MARKDOWN RENDERING
// =============================================================================

/**
 * Render markdown using backend API
 */
async function renderMarkdown() {
    // Skip rendering if AI formatting is in progress to prevent overwriting AI results
    if (window.isAIFormatting) {
        return;
    }
    
    const editor = document.getElementById('editor');
    const preview = document.getElementById('preview');
    
    if (!editor || !preview) return;
    
    let markdown = editor.value.trim();
    const theme = getCurrentTheme ? getCurrentTheme() : 'wechat-default';
    
    if (!markdown) {
        preview.innerHTML = `
            <div style="text-align: center; color: #999; margin-top: 50px;">
                <i class="fas fa-arrow-left" style="font-size: 48px; margin-bottom: 20px; opacity: 0.3;"></i>
                <p>在左侧编辑器输入内容，右侧将实时预览</p>
            </div>
        `;
        return;
    }
    
    showLoading();
    updateStatus('渲染中...');
    
    try {
        // Handle dash separator splitting in frontend
        const shouldSplit = isSplitRenderingEnabled ? isSplitRenderingEnabled() : false;
        
        if (shouldSplit && markdown.includes('---')) {
            await renderSplitMarkdown(markdown, theme, preview);
        } else {
            await renderNormalMarkdown(markdown, theme, preview);
        }
        
        // Initialize external libraries
        initializeMermaid();
        initializeMathJax();
        
        const charCount = editor.value.length;
        updateStatus(`渲染完成 ${charCount} 字符`);
        
    } catch (error) {
        preview.innerHTML = `
            <div class="error">
                <strong>渲染失败</strong><br>
                ${error.message}<br><br>
                <small>请检查后端服务是否正常运行</small>
            </div>
        `;
        updateStatus('渲染失败', true);
    } finally {
        hideLoading();
    }
}

/**
 * Render split markdown (with --- separators)
 */
async function renderSplitMarkdown(markdown, theme, preview) {
    const sections = markdown.split(/^---$/gm).filter(section => section.trim());
    
    if (sections.length <= 1) {
        await renderNormalMarkdown(markdown, theme, preview);
        return;
    }
    
    let sectionedHtml = '';
    
    for (let i = 0; i < sections.length; i++) {
        const sectionMarkdown = sections[i].trim();
        if (sectionMarkdown) {
            const response = await fetch(`${SharedUtils.CONFIG.API_BASE_URL}/render`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    markdown_text: sectionMarkdown,
                    theme: theme,
                    mode: SharedUtils.CONFIG.DEFAULT_MODE,
                    platform: SharedUtils.CONFIG.DEFAULT_PLATFORM,
                    dashseparator: false
                })
            });
            
            if (!response.ok) {
                throw new Error(`渲染第${i+1}部分失败: ${response.status}`);
            }
            
            const data = await response.json();
            sectionedHtml += `<section class="markdown-section" data-section="${i+1}">\n${data.html}\n</section>\n`;
        }
    }
    
    preview.innerHTML = sectionedHtml;
}

/**
 * Render normal markdown
 */
async function renderNormalMarkdown(markdown, theme, preview) {
    const response = await fetch(`${SharedUtils.CONFIG.API_BASE_URL}/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            markdown_text: markdown,
            theme: theme,
            mode: SharedUtils.CONFIG.DEFAULT_MODE,
            platform: SharedUtils.CONFIG.DEFAULT_PLATFORM,
            dashseparator: false
        })
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`渲染失败: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    preview.innerHTML = data.html;
}

// =============================================================================
// EXTERNAL LIBRARY INITIALIZATION
// =============================================================================

/**
 * Initialize Mermaid diagrams
 */
function initializeMermaid() {
    if (typeof mermaid !== 'undefined') {
        setTimeout(() => {
            try {
                const mermaidElements = document.querySelectorAll('.mermaid, code.language-mermaid');
                if (mermaidElements.length > 0) {
                    mermaid.run({
                        nodes: mermaidElements
                    }).catch(error => {
                    });
                }
            } catch (error) {
            }
        }, 100);
    }
}

/**
 * Initialize MathJax
 */
function initializeMathJax() {
    if (typeof window.MathJax === 'undefined') {
        return;
    }
    
    if (!window.MathJax.typesetPromise) {
        return;
    }
    
    setTimeout(() => {
        try {
            const preview = document.getElementById('preview');
            if (!preview || !preview.innerHTML) {
                return;
            }
            
            // Check if there's any math content to render
            const hasMath = preview.innerHTML.includes('$') || 
                           preview.innerHTML.includes('\\(') || 
                           preview.innerHTML.includes('\\[');
            
            if (!hasMath) {
                return;
            }
            
            // Clear old MathJax SVG output only (mjx-container elements)
            // IMPORTANT: Do NOT remove .MathJax_Preview or other internal MathJax elements
            // as this breaks the rendering pipeline
            const oldSvgs = preview.querySelectorAll('mjx-container');
            oldSvgs.forEach(el => el.remove());
            
            // Re-render all math expressions
            window.MathJax.typesetPromise([preview])
                .catch((error) => {
                    // MathJax rendering failed
                });
        } catch (error) {
                    // MathJax initialization error
                }
            }, 100);
        }
        
