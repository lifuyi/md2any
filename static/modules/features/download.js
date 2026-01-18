/**
 * Download Module
 * 
 * Handles file downloads:
 * - HTML export with MathJax support
 * - PNG image generation
 * - Markdown file export
 * - Plain text export
 * - PDF generation
 * - DOCX document export
 */

// =============================================================================
// HTML DOWNLOAD
// =============================================================================

async function downloadHTML() {
    const editor = document.getElementById('editor');
    const preview = document.getElementById('preview');
    const themeSelector = document.getElementById('theme-selector');
    
    if (!editor || !editor.value.trim()) {
        alert('请先输入Markdown内容');
        return;
    }

    try {
        let htmlContent;
        
        if (preview && preview.innerHTML.trim()) {
            htmlContent = preview.innerHTML;
            
            if (htmlContent.includes('mjx-container')) {
                const mjxFontDefs = document.querySelector('#MJX-SVG-global-cache');
                if (mjxFontDefs) {
                    htmlContent = mjxFontDefs.outerHTML + htmlContent;
                }
            }
        } else {
            htmlContent = await renderMarkdownForExport(editor.value, themeSelector?.value);
        }
        
        const hasMathJaxContainers = htmlContent.includes('mjx-container');
        const hasFormulaDelimiters = htmlContent.includes('$') || htmlContent.includes('\\(') || htmlContent.includes('\\[');
        
        let fullHtml;
        
        if (hasMathJaxContainers || hasFormulaDelimiters) {
            fullHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Markdown Output</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
    <script>
        mermaid.initialize({ startOnLoad: true });
    </script>
    <!-- MathJax configuration -->
    <script>
        window.MathJax = {
            tex: {
                inlineMath: [['$', '$'], ['\\\\(', '\\\\)']],
                displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']],
                processEscapes: true,
                processEnvironments: true
            },
            svg: {
                fontCache: 'global'
            },
            startup: {
                ready: () => {
                    console.log('MathJax is loaded and ready');
                    MathJax.startup.defaultReady();
                    if (typeof MathJax !== 'undefined' && MathJax.typesetPromise) {
                        setTimeout(() => {
                            MathJax.typesetPromise().then(() => {
                                console.log('MathJax re-rendering complete');
                            });
                        }, 100);
                    }
                }
            }
        };
    </script>
    <script type="text/javascript" id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js"></script>
</head>
<body>
    ${htmlContent}
</body>
</html>`;
        } else {
            fullHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Markdown Output</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
    <script>
        mermaid.initialize({ startOnLoad: true });
    </script>
</head>
<body>
    ${htmlContent}
</body>
</html>`;
        }
        
        const filename = generateFilename('markdown', 'html', themeSelector?.value || 'default');
        downloadFile(fullHtml, filename, 'text/html');
        
    } catch (error) {
        SharedUtils.logError('Features', '下载HTML失败', error);
        alert('下载HTML失败: ' + error.message);
    }
}

// =============================================================================
// PNG DOWNLOAD
// =============================================================================

async function downloadPNG() {
    const editor = document.getElementById('editor');
    const themeSelector = document.getElementById('theme-selector');
    
    if (!editor || !editor.value.trim()) {
        alert('请先输入Markdown内容');
        return;
    }

    if (typeof html2canvas === 'undefined') {
        SharedUtils.logError('Features', 'html2canvas未定义');
        alert('PNG导出功能不可用，html2canvas库未加载');
        return;
    }

    SharedUtils.log('Features', 'html2canvas已加载，开始生成PNG');
    showLoading();
    updateStatus('正在生成PNG...');

    try {
        const htmlContent = await renderMarkdownForExport(editor.value, themeSelector?.value);
        
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.left = '-9999px';
        iframe.style.top = '0';
        iframe.style.width = '800px';
        iframe.style.height = 'auto';
        iframe.style.backgroundColor = '#ffffff';
        iframe.style.border = 'none';
        
        document.body.appendChild(iframe);
        
        const preview = document.getElementById('preview');
        let finalHtmlContent = htmlContent;
        
        if (preview && preview.innerHTML.trim()) {
            finalHtmlContent = preview.innerHTML;
            
            if (finalHtmlContent.includes('mjx-container')) {
                const mjxFontDefs = document.querySelector('#MJX-SVG-global-cache');
                if (mjxFontDefs) {
                    finalHtmlContent = mjxFontDefs.outerHTML + finalHtmlContent;
                }
            }
        }
        
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { 
                        margin: 0; 
                        padding: 20px; 
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        background-color: #ffffff;
                        width: 760px;
                    }
                    mjx-container {
                        display: inline-block !important;
                    }
                    mjx-container[display="block"] {
                        display: block !important;
                        text-align: center;
                        margin: 1em 0;
                    }
                </style>
            </head>
            <body>
                ${finalHtmlContent}
            </body>
            </html>
        `);
        iframeDoc.close();
        
        await new Promise(resolve => {
            iframe.onload = () => {
                if (finalHtmlContent.includes('mjx-container')) {
                    setTimeout(resolve, 2000);
                } else {
                    setTimeout(resolve, 500);
                }
            };
            setTimeout(resolve, 3000);
        });
        
        const iframeBody = iframeDoc.body;
        iframeBody.style.height = 'auto';
        
        const canvas = await html2canvas(iframeBody, {
            backgroundColor: '#ffffff',
            scale: 2,
            useCORS: true,
            allowTaint: true,
            width: iframeBody.scrollWidth,
            height: iframeBody.scrollHeight,
            scrollX: 0,
            scrollY: 0,
            foreignObjectRendering: true,
            logging: false,
            imageTimeout: 15000,
            onclone: function(clonedDoc) {
                const svgElements = clonedDoc.querySelectorAll('svg');
                svgElements.forEach(svg => {
                    if (!svg.getAttribute('width') || !svg.getAttribute('height')) {
                        const rect = svg.getBoundingClientRect();
                        if (rect.width && rect.height) {
                            svg.setAttribute('width', rect.width);
                            svg.setAttribute('height', rect.height);
                        }
                    }
                });
                
                const mathContainers = clonedDoc.querySelectorAll('mjx-container');
                mathContainers.forEach(container => {
                    container.style.display = container.getAttribute('display') === 'block' ? 'block' : 'inline-block';
                    container.style.visibility = 'visible';
                });
            }
        });
        
        document.body.removeChild(iframe);
        
        SharedUtils.log('Features', 'Canvas生成成功，尺寸:', canvas.width, 'x', canvas.height);
        
        const dataURL = canvas.toDataURL('image/png', 1.0);
        const filename = generateFilename('markdown', 'png', themeSelector?.value || 'default');
        
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        updateStatus('PNG下载完成');
        SharedUtils.log('Features', 'PNG下载完成');
        
    } catch (error) {
        SharedUtils.logError('Features', 'PNG生成失败', error);
        updateStatus('PNG生成失败', true);
        alert('PNG生成失败: ' + error.message);
    } finally {
        hideLoading();
    }
}

// =============================================================================
// MARKDOWN DOWNLOAD
// =============================================================================

function downloadMD() {
    const editor = document.getElementById('editor');
    const themeSelector = document.getElementById('theme-selector');
    
    if (!editor || !editor.value.trim()) {
        alert('请先输入Markdown内容');
        return;
    }

    const filename = generateFilename('markdown', 'md', themeSelector?.value || 'default');
    downloadFile(editor.value, filename, 'text/markdown');
}

// =============================================================================
// TEXT DOWNLOAD
// =============================================================================

function downloadTXT() {
    const editor = document.getElementById('editor');
    const themeSelector = document.getElementById('theme-selector');
    
    if (!editor || !editor.value.trim()) {
        alert('请先输入Markdown内容');
        return;
    }

    const plainText = markdownToPlainText(editor.value);
    const filename = generateFilename('markdown', 'txt', themeSelector?.value || 'default');
    downloadFile(plainText, filename, 'text/plain');
}

// =============================================================================
// PDF DOWNLOAD
// =============================================================================

async function downloadPDF() {
    const editor = document.getElementById('editor');
    const themeSelector = document.getElementById('theme-selector');
    
    if (!editor || !editor.value.trim()) {
        alert('请先输入Markdown内容');
        return;
    }

    try {
        updateStatus('正在生成PDF...');
        showLoading();
        
        const preview = document.getElementById('preview');
        let contentHTML = '';
        
        if (preview && preview.innerHTML.trim()) {
            contentHTML = preview.innerHTML;
        } else {
            const response = await fetch(`${SharedUtils.CONFIG.API_BASE_URL}/render`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    markdown_text: editor.value,
                    theme: themeSelector?.value || SharedUtils.CONFIG.DEFAULT_THEME,
                    mode: SharedUtils.CONFIG.DEFAULT_MODE,
                    platform: SharedUtils.CONFIG.DEFAULT_PLATFORM,
                    dashseparator: false
                })
            });
            
            if (!response.ok) {
                throw new Error(`渲染失败: ${response.status}`);
            }
            
            const data = await response.json();
            contentHTML = data.html;
        }
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Markdown Content</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        max-width: 740px;
                        margin: 0 auto;
                        padding: 20px;
                        line-height: 1.6;
                    }
                    #MJX-SVG-global-cache { display: none; }
                    @media print {
                        @page {
                            margin: 2cm;
                        }
                        body {
                            -webkit-print-color-adjust: exact;
                            color-adjust: exact;
                        }
                    }
                </style>
                <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
                <script>
                    mermaid.initialize({ startOnLoad: true });
                </script>
            </head>
            <body>
                ${contentHTML}
            </body>
            </html>
        `);
        
        printWindow.document.close();
        
        printWindow.onload = function() {
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
                updateStatus('PDF已生成');
                hideLoading();
            }, 1000);
        };
        
        setTimeout(() => {
            if (!printWindow.onload) {
                printWindow.print();
                printWindow.close();
                updateStatus('PDF已生成');
                hideLoading();
            }
        }, 1500);
        
    } catch (error) {
        SharedUtils.logError('Features', '生成PDF失败', error);
        updateStatus('生成PDF失败', true);
        hideLoading();
        alert('生成PDF失败: ' + error.message);
    }
}

// =============================================================================
// DOCX DOWNLOAD
// =============================================================================

async function downloadDOCX() {
    const editor = document.getElementById('editor');
    const themeSelector = document.getElementById('theme-selector');
    
    if (!editor || !editor.value.trim()) {
        alert('请先输入Markdown内容');
        return;
    }

    try {
        updateStatus('正在生成DOCX...');
        showLoading();
        
        const response = await fetch(`${SharedUtils.CONFIG.API_BASE_URL}/render`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                markdown_text: editor.value,
                theme: themeSelector?.value || SharedUtils.CONFIG.DEFAULT_THEME,
                mode: SharedUtils.CONFIG.DEFAULT_MODE,
                platform: SharedUtils.CONFIG.DEFAULT_PLATFORM,
                dashseparator: false
            })
        });
        
        if (!response.ok) {
            throw new Error(`渲染失败: ${response.status}`);
        }
        
        const data = await response.json();
        
        const docContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Markdown Document</title>
    <style>
        body {
            font-family: "Times New Roman", serif;
            margin: 40px;
            line-height: 1.6;
        }
    </style>
</head>
<body>
    ${data.html}
</body>
</html>`;
        
        const filename = generateFilename('markdown', 'docx', themeSelector?.value || 'default');
        
        const blob = new Blob([docContent], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        updateStatus('DOCX已生成');
        
    } catch (error) {
        SharedUtils.logError('Features', '生成DOCX失败', error);
        updateStatus('生成DOCX失败', true);
        alert('生成DOCX失败: ' + error.message);
    } finally {
        hideLoading();
    }
}

// =============================================================================
// EXPORT HELPER
// =============================================================================

async function renderMarkdownForExport(markdown, theme) {
    const splitCheckbox = document.getElementById('split-checkbox');
    const shouldSplit = splitCheckbox && splitCheckbox.checked;
    
    if (shouldSplit && markdown.includes('---')) {
        const sections = markdown.split(/^---$/gm).filter(section => section.trim());
        let sectionedHtml = '';
        
        for (let i = 0; i < sections.length; i++) {
            const sectionMarkdown = sections[i].trim();
            if (sectionMarkdown) {
                const response = await fetch(`${SharedUtils.CONFIG.API_BASE_URL}/render`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        markdown_text: sectionMarkdown,
                        theme: theme || SharedUtils.CONFIG.DEFAULT_THEME,
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
        
        return sectionedHtml;
    } else {
        const response = await fetch(`${SharedUtils.CONFIG.API_BASE_URL}/render`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                markdown_text: markdown,
                theme: theme || SharedUtils.CONFIG.DEFAULT_THEME,
                mode: SharedUtils.CONFIG.DEFAULT_MODE,
                platform: SharedUtils.CONFIG.DEFAULT_PLATFORM,
                dashseparator: false
            })
        });
        
        if (!response.ok) {
            throw new Error(`渲染失败: ${response.status}`);
        }
        
        const data = await response.json();
        return data.html;
    }
}

console.log('✅ Download module loaded');
