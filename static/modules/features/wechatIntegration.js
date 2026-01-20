/**
 * WeChat Integration Module
 * 
 * Handles WeChat-related features:
 * - WeChat draft sending
 * - HTML conversion for WeChat
 * - WeChat configuration
 * - AI-powered markdown generation
 * - AI formatting and preview
 */

// =============================================================================
// DEBUG CONFIGURATION
// =============================================================================

// DEBUG: Set to true to disable AI loading overlay for debugging
const DEBUG_DISABLE_OVERLAY = false;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function getContainerStyleFromPreview() {
    const previewElement = document.getElementById('preview');
    if (!previewElement) return '';
    
    const contentSection = previewElement.querySelector('.markdown-content');
    if (contentSection && contentSection.style.cssText) {
        return contentSection.style.cssText;
    }
    
    const sections = previewElement.querySelectorAll('section');
    for (const section of sections) {
        if (section.style.cssText && 
            (section.style.cssText.includes('max-width') || 
             section.style.cssText.includes('margin') || 
             section.style.cssText.includes('padding'))) {
            return section.style.cssText;
        }
    }
    
    return 'max-width: 740px; margin: 0 auto; padding: 20px; font-family: "Helvetica Neue", Helvetica, Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif; font-size: 16px; line-height: 1.8; color: #333; background-color: #ffffff;';
}

// =============================================================================
// WECHAT OPERATIONS
// =============================================================================

/**
 * Send content to WeChat draft
 */
async function sendToWeChatDraft() {
    const editor = document.getElementById('editor');
    
    if (!editor || !editor.value.trim()) {
        updateStatus('❌ 没有内容可发送', true);
        return;
    }

    // Get configuration
    const appId = localStorage.getItem('wechat_app_id');
    const appSecret = localStorage.getItem('wechat_app_secret');
    const thumbMediaId = localStorage.getItem('wechat_thumb_media_id') || '';
    
    if (!appId || !appSecret) {
        updateStatus('❌ 请先配置微信公众号信息', true);
        configureWeChat();
        return;
    }

    const markdown = editor.value;
    // Get current theme from theme manager or fallback
    let currentTheme = 'wechat-default';
    if (typeof window._getCurrentTheme === 'function') {
        currentTheme = window._getCurrentTheme();
    } else if (typeof getCurrentTheme === 'function') {
        currentTheme = getCurrentTheme();
    }

    updateStatus('正在发送到微信草稿箱...');
    
    try {
        const response = await fetch(`${SharedUtils.CONFIG.API_BASE_URL}/wechat/send_draft`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                appid: appId,
                secret: appSecret,
                markdown: markdown,
                style: currentTheme,
                thumb_media_id: thumbMediaId,
                author: '', // Optional: could be added to config
                digest: '', // Optional: could be added to config
                content_source_url: '', // Optional
                need_open_comment: 1,
                only_fans_can_comment: 1
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail?.errmsg || error.detail || '发送失败');
        }
        
        const result = await response.json();
        
        if (result.media_id) {
            updateStatus('✅ 已成功发送到微信草稿箱', 'success');
            alert('发送成功！\nMedia ID: ' + result.media_id);
        } else {
            updateStatus('⚠️ 发送完成但未返回Media ID', 'info');
        }
        
    } catch (error) {
        console.error('WeChat send error:', error);
        updateStatus('❌ 发送失败: ' + error.message, true);
        alert('发送失败: ' + error.message);
    }
}

/**
 * Configure WeChat settings
 */
function configureWeChat() {
    const appId = localStorage.getItem('wechat_app_id') || '';
    const appSecret = localStorage.getItem('wechat_app_secret') || '';
    const thumbMediaId = localStorage.getItem('wechat_thumb_media_id') || '';

    const newAppId = prompt('请输入微信公众号AppID:', appId);
    if (newAppId === null) return;

    const newAppSecret = prompt('请输入微信公众号AppSecret:', appSecret);
    if (newAppSecret === null) return;

    const newThumbMediaId = prompt('请输入缩略图MediaID (可选):', thumbMediaId);
    if (newThumbMediaId === null) return;

    if (newAppId) localStorage.setItem('wechat_app_id', newAppId);
    if (newAppSecret) localStorage.setItem('wechat_app_secret', newAppSecret);
    if (newThumbMediaId) localStorage.setItem('wechat_thumb_media_id', newThumbMediaId);

    alert('微信配置已保存');
}

// =============================================================================
// AI INTEGRATION
// =============================================================================

/**
 * Generate markdown using AI
 */
async function generateMarkdown() {
    const input = document.getElementById('ai-input');
    const editor = document.getElementById('editor');
    const submitBtn = document.getElementById('ai-submit');

    // Get text from ai-input textarea
    const textToConvert = input ? input.value.trim() : '';

    if (!textToConvert) {
        alert('请在输入框中输入要转换的文本');
        return;
    }

    try {
        // Start timer for conversion
        console.time('txt-to-md-conversion');
        
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 转换中...';
        updateStatus('正在转换文本为Markdown...');
        
        // Show loading overlay
        if (typeof window._showTxtToMdOverlay === 'function') {
            window._showTxtToMdOverlay();
        }

        const response = await fetch(`${SharedUtils.CONFIG.API_BASE_URL}/ai/convert-text`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: textToConvert })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.markdown) {
            // Replace all editor content with converted markdown
            if (typeof setEditorContent === 'function') {
                setEditorContent(data.markdown);
            } else if (window.codeMirrorInstance) {
                const cm = window.codeMirrorInstance;
                const doc = cm.getDoc();
                doc.setValue(data.markdown);
            } else if (editor) {
                editor.value = data.markdown;
                editor.dispatchEvent(new Event('input'));
            }
            
            if (window.renderMarkdown) {
                window.renderMarkdown();
            }
            
            // Clear input
            if (input) input.value = '';
            updateStatus('✅ 转换成功');
            
            // Close left drawer after successful conversion
            if (typeof closeLeftDrawer === 'function') {
                closeLeftDrawer();
            }
        } else {
            throw new Error('No markdown returned');
        }
        
        // End timer and log duration
        console.timeEnd('txt-to-md-conversion');
        
        // Hide loading overlay on success
        if (typeof window._hideTxtToMdOverlay === 'function') {
            window._hideTxtToMdOverlay();
        }

    } catch (error) {
        updateStatus('❌ 转换失败', true);
        alert('转换失败: ' + error.message);
        
        // End timer and log duration even on error
        console.timeEnd('txt-to-md-conversion');
        
        // Hide loading overlay on error
        if (typeof window._hideTxtToMdOverlay === 'function') {
            window._hideTxtToMdOverlay();
        }
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-magic"></i> 生成Markdown';
    }
}

/**
 * Format markdown using AI (/ai endpoint)
 */
async function aiFormatMarkdown() {
    const editor = document.getElementById('editor');
    const aiBtn = document.getElementById('ai-format-btn');
    const aiLoadingOverlay = document.getElementById('ai-loading-overlay');
    
    if (!editor) {
        updateStatus('❌ 编辑器未找到', true);
        return;
    }
    
    const markdownContent = window._getEditorContent ? window._getEditorContent() : editor.value;
    
    if (!markdownContent.trim()) {
        alert('请先输入Markdown内容');
        return;
    }
    
    // Track when overlay was shown
    let overlayShowTime = 0;
    
    // Helper to hide overlay
    const hideOverlay = () => {
        if (aiLoadingOverlay) {
            aiLoadingOverlay.classList.remove('active');
        }
    };
    
    try {
        // Start timer for AI formatting
        console.time('ai-formatting');
        
        // Disable button and show loading
        aiBtn.disabled = true;
        aiBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> AI排版中...';
        updateStatus('正在使用AI进行排版...');
        
        // Show AI loading overlay (unless debug flag is set)
        if (!DEBUG_DISABLE_OVERLAY && aiLoadingOverlay) {
            console.log('Showing AI loading overlay');
            aiLoadingOverlay.classList.add('active');
            overlayShowTime = Date.now();
            console.log('Overlay classList:', aiLoadingOverlay.classList);
        } else if (DEBUG_DISABLE_OVERLAY) {
            console.log('AI loading overlay disabled for debugging');
        } else {
            console.error('AI loading overlay element not found!');
        }
        
        // Set AI formatting flag to prevent normal rendering
        window.isAIFormatting = true;
        
        // Call /ai/format-markdown endpoint (new endpoint with concise prompt)
        const response = await fetch(`${SharedUtils.CONFIG.API_BASE_URL}/ai/format-markdown`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ markdown: markdownContent })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API error response:', errorText);
            throw new Error(`API error: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        console.log('AI formatting response:', data);
        
        if (data.success && data.html) {
            // End timer and log duration
            console.timeEnd('ai-formatting');
            
            // Show result in modal overlay
            showAIResultModal(data.html);
            
            updateStatus('✅ AI排版完成');
        } else {
            throw new Error(data.message || 'AI排版失败');
        }
        
    } catch (error) {
        // End timer and log duration even on error
        console.timeEnd('ai-formatting');
        
        // Hide AI loading overlay on error (only if not disabled for debugging)
        if (!DEBUG_DISABLE_OVERLAY) {
            hideOverlay();
        }
        
        updateStatus('❌ AI排版失败', true);
        console.error('AI formatting error:', error);
        alert('AI排版失败: ' + error.message);
    } finally {
        // Re-enable button
        aiBtn.disabled = false;
        aiBtn.innerHTML = '<i class="fas fa-robot"></i> AI排版';
        window.isAIFormatting = false;
        
        // Safety check: ensure timer is ended (in case it wasn't ended elsewhere)
        try {
            console.timeEnd('ai-formatting');
        } catch (e) {
            // Timer already ended or not started, ignore
        }
        
        // Note: AI loading overlay is hidden in showAIResultModal function
        // This ensures it stays visible until the result modal is displayed
    }
}

/**
 * Convert content to WeChat-compatible HTML
 */
async function convertToWeChatHTML() {
    const preview = document.getElementById('preview');
    if (!preview || !preview.innerHTML.trim()) {
        throw new Error('No preview content');
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(preview.innerHTML, 'text/html');

    // Process images
    const images = doc.querySelectorAll('img');
    for (const img of images) {
        const src = img.getAttribute('src');
        if (src && !src.startsWith('http')) {
            // Handle data URLs or relative paths
            try {
                const base64 = await convertImageToBase64(img);
                img.setAttribute('src', base64);
            } catch (error) {
                console.warn('Image conversion failed:', src);
            }
        }
    }

    // Remove scripts and dangerous content
    const scripts = doc.querySelectorAll('script, style, meta, link');
    scripts.forEach(el => el.remove());

    // Convert grid layouts to tables
    convertGridToTable(doc);

    // Optimize for WeChat display
    const body = doc.body;
    if (body) {
        // Add WeChat-compatible styles
        body.style.cssText = 'margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;';
        
        // Ensure images are responsive
        images.forEach(img => {
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            img.style.display = 'block';
        });

        // Format paragraphs
        const paragraphs = body.querySelectorAll('p');
        paragraphs.forEach(p => {
            p.style.lineHeight = '1.8';
            p.style.marginBottom = '12px';
        });

        // Format headings
        ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach((tag, index) => {
            body.querySelectorAll(tag).forEach(heading => {
                heading.style.marginTop = '16px';
                heading.style.marginBottom = '12px';
                heading.style.lineHeight = '1.4';
            });
        });

        // Format code blocks
        body.querySelectorAll('pre, code').forEach(el => {
            el.style.backgroundColor = '#f5f5f5';
            el.style.padding = '2px 4px';
            el.style.borderRadius = '3px';
            el.style.fontFamily = 'monospace';
        });

        // Format lists
        body.querySelectorAll('ul, ol').forEach(list => {
            list.style.marginLeft = '20px';
            list.style.marginBottom = '12px';
        });

        body.querySelectorAll('li').forEach(item => {
            item.style.marginBottom = '6px';
            item.style.lineHeight = '1.6';
        });

        // Format blockquotes
        body.querySelectorAll('blockquote').forEach(quote => {
            quote.style.borderLeft = '4px solid #667eea';
            quote.style.paddingLeft = '16px';
            quote.style.marginLeft = '0';
            quote.style.marginBottom = '12px';
            quote.style.color = '#666';
        });

        // Format tables
        body.querySelectorAll('table').forEach(table => {
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse';
            table.style.marginBottom = '12px';
        });

        body.querySelectorAll('td, th').forEach(cell => {
            cell.style.border = '1px solid #ddd';
            cell.style.padding = '8px';
            cell.style.textAlign = 'left';
        });

        body.querySelectorAll('th').forEach(th => {
            th.style.backgroundColor = '#f5f5f5';
            th.style.fontWeight = 'bold';
        });
    }

    return body ? body.innerHTML : '';
}

/**
 * Show AI result modal
 */
function showAIResultModal(htmlContent) {
    // Hide AI loading overlay before showing result modal (only if not disabled for debugging)
    if (!DEBUG_DISABLE_OVERLAY) {
        const aiLoadingOverlay = document.getElementById('ai-loading-overlay');
        if (aiLoadingOverlay) {
            aiLoadingOverlay.classList.remove('active');
        }
    }
    
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'ai-result-modal-overlay';
    modalOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;

    const modal = document.createElement('div');
    modal.id = 'ai-result-modal';
    modal.style.cssText = `
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        max-width: 90%;
        max-height: 85vh;
        overflow-y: auto;
        border: 1px solid #e0e0e0;
    `;

    const header = document.createElement('div');
    header.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid #eee;
        background: #f8f9fa;
        border-radius: 8px 8px 0 0;
    `;

    const title = document.createElement('h2');
    title.textContent = 'AI排版结果';
    title.style.cssText = `
        margin: 0;
        color: #333;
        font-size: 16px;
        font-weight: 500;
    `;
    header.appendChild(title);

    const headerButtons = document.createElement('div');
    headerButtons.style.cssText = `
        display: flex;
        gap: 8px;
    `;

    const copyBtn = document.createElement('button');
    copyBtn.textContent = '复制';
    copyBtn.style.cssText = `
        background: #e9ecef;
        color: #495057;
        border: 1px solid #ced4da;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
        transition: all 0.2s;
    `;
    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(htmlContent).then(() => {
            copyBtn.textContent = '已复制';
            copyBtn.style.background = '#d4edda';
            copyBtn.style.color = '#155724';
            setTimeout(() => {
                copyBtn.textContent = '复制';
                copyBtn.style.background = '#e9ecef';
                copyBtn.style.color = '#495057';
            }, 2000);
        });
    });
    headerButtons.appendChild(copyBtn);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = `
        background: transparent;
        color: #6c757d;
        border: none;
        padding: 6px 10px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 16px;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
    `;
    closeBtn.addEventListener('click', () => {
        modalOverlay.remove();
    });
    headerButtons.appendChild(closeBtn);

    header.appendChild(headerButtons);
    modal.appendChild(header);

    const content = document.createElement('div');
    content.style.cssText = `
        padding: 20px;
        color: #333;
        line-height: 1.6;
    `;
    content.innerHTML = htmlContent;
    modal.appendChild(content);

    const footer = document.createElement('div');
    footer.style.cssText = `
        display: flex;
        gap: 10px;
        padding: 16px 20px;
        border-top: 1px solid #eee;
        background: #f8f9fa;
        border-radius: 0 0 8px 8px;
    `;

    const applyBtn = document.createElement('button');
    applyBtn.textContent = '应用到编辑器';
    applyBtn.style.cssText = `
        flex: 1;
        padding: 8px 16px;
        background: #D86E4F;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transition: background 0.2s;
    `;
    applyBtn.addEventListener('click', () => {
        const editor = document.getElementById('editor');
        if (editor) {
            editor.value = htmlContent;
            if (window.renderMarkdown) {
                window.renderMarkdown();
            }
        }
        modalOverlay.remove();
        updateStatus('已应用到编辑器');
    });
    footer.appendChild(applyBtn);

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '关闭';
    cancelBtn.style.cssText = `
        padding: 8px 16px;
        background: #6c757d;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transition: background 0.2s;
    `;
    cancelBtn.addEventListener('click', () => {
        modalOverlay.remove();
    });
    footer.appendChild(cancelBtn);

    modal.appendChild(footer);
    modalOverlay.appendChild(modal);
    document.body.appendChild(modalOverlay);

    // Close on overlay click
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            modalOverlay.remove();
        }
    });
}

    
