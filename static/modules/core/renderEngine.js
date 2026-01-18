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
        SharedUtils.log('RenderEngine', 'Skipping renderMarkdown - AI formatting in progress');
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
        SharedUtils.logError('RenderEngine', '渲染失败', error);
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
        SharedUtils.logError('RenderEngine', 'Render error response:', errorText);
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
                        SharedUtils.logError('RenderEngine', 'Mermaid rendering failed', error);
                    });
                }
            } catch (error) {
                SharedUtils.logError('RenderEngine', 'Mermaid initialization failed', error);
            }
        }, 100);
    }
}

/**
 * Initialize MathJax
 */
function initializeMathJax() {
    if (typeof window.MathJax === 'undefined') {
        SharedUtils.log('RenderEngine', 'MathJax not loaded yet');
        return;
    }
    
    if (!window.MathJax.typesetPromise) {
        SharedUtils.logError('RenderEngine', 'MathJax.typesetPromise not available');
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
                SharedUtils.log('RenderEngine', 'No math content found in preview');
                return;
            }
            
            SharedUtils.log('RenderEngine', 'Starting MathJax rendering');
            
            // Clear old MathJax SVG output only (mjx-container elements)
            // IMPORTANT: Do NOT remove .MathJax_Preview or other internal MathJax elements
            // as this breaks the rendering pipeline
            const oldSvgs = preview.querySelectorAll('mjx-container');
            oldSvgs.forEach(el => el.remove());
            
            // Re-render all math expressions
            window.MathJax.typesetPromise([preview])
                .then(() => {
                    SharedUtils.log('RenderEngine', 'MathJax rendering completed successfully');
                    // Verify rendering worked
                    const renderedMath = preview.querySelectorAll('mjx-container');
                    SharedUtils.log('RenderEngine', `${renderedMath.length} math expressions rendered`);
                })
                .catch((error) => {
                    SharedUtils.logError('RenderEngine', 'MathJax rendering failed', error);
                });
        } catch (error) {
                        SharedUtils.logError('RenderEngine', 'MathJax initialization error', error);
                    }
                }, 100);
            }
            
            console.log('✅ Render Engine module loaded');
            
