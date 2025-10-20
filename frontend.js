// 配置
        // Use the same host as the frontend is served from
        const API_BASE_URL = window.location.hostname ? 
            `http://${window.location.hostname}:5002` : 
            'http://localhost:5002';
            
        // Add error handling for missing libraries
        if (typeof window.markdownit === 'undefined') {
            console.warn('markdown-it not loaded, using fallback');
        }
        if (typeof window.hljs === 'undefined') {
            console.warn('highlight.js not loaded, using fallback');
        }
            
        // Initialize markdown-it with syntax highlighting
        const md = window.markdownit({
          html: true,
          linkify: true,
          typographer: true,
          highlight: function (str, lang) {
            // 特殊处理Mermaid图表
            if (lang === 'mermaid') {
              return '<pre class="mermaid"><code>' + md.utils.escapeHtml(str) + '</code></pre>';
            }
            
            if (lang && hljs.getLanguage(lang)) {
              try {
                return '<pre class="hljs"><code>' +
                       hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
                       '</code></pre>';
              } catch (__) {}
            }
        
            return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>';
          }
        });
        
        // 获取DOM元素
        const editor = document.getElementById('editor');
        const preview = document.getElementById('preview');
        const themeSelector = document.getElementById('theme-selector');
        const status = document.getElementById('status');
        const charCount = document.getElementById('char-count');
        const loading = document.getElementById('loading');
        const clearEditorBtn = document.getElementById('clear-editor');
        const themeOptions = document.querySelectorAll('.theme-option');
        const settingsPane = document.getElementById('settings-pane');
        const settingsToggle = document.getElementById('settings-toggle');
        const settingsClose = document.getElementById('settings-close');
        
        // Custom CSS Editor Elements
        const editCustomCSSBtn = document.getElementById('edit-custom-css');
        const cssFloatingPanel = document.getElementById('css-floating-panel');
        const closeCssPanel = document.getElementById('close-css-panel');
        const cancelCssEdit = document.getElementById('cancel-css-edit');
        const saveCssEdit = document.getElementById('save-css-edit');
        const cssExampleBtn = document.getElementById('css-example-btn');
        const customCssEditor = document.getElementById('custom-css-editor');

        // 存储处理后的内容，用于复制、下载、发送到微信等操作
        let processedContent = {
            html: '',
            styledHtml: '',
            markdown: '',
            theme: ''
        };

        // 防抖函数
        let debounceTimer;
        function debounce(func, delay) {
            return function(...args) {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => func.apply(this, args), delay);
            };
        }

        // 显示加载状态
        function showLoading() {
            loading.classList.add('active');
        }

        // 隐藏加载状态
        function hideLoading() {
            loading.classList.remove('active');
        }

        // 更新状态
        function updateStatus(message, isError = false) {
            status.textContent = message;
            status.style.color = isError ? '#c33' : '#666';
        }

        // 更新字符计数
        function updateCharCount() {
            const count = editor.value.length;
            charCount.textContent = `${count} 字符`;
        }

        // 分割Markdown文本为卡片
        function splitMarkdownIntoCards(markdown) {
            // 如果复选框未选中，则不进行分割
            const splitCheckbox = document.getElementById('split-checkbox');
            if (!splitCheckbox || !splitCheckbox.checked) {
                return [markdown];
            }

            // 使用正则表达式分割文本，保留分隔符
            const sections = markdown.split(/^---$/gm);
            
            // 过滤掉空的部分，并去除每部分的前后空白
            return sections
                .map(section => section.trim())
                .filter(section => section.length > 0);
        }

        // 渲染Markdown
        async function renderMarkdown() {
            const markdown = editor.value.trim();
            const theme = themeSelector.value;

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
                // 分割Markdown文本为卡片
                const sections = splitMarkdownIntoCards(markdown);
                
                // 清空预览区域
                preview.innerHTML = '';
                
                // 为每个部分渲染内容
                let combinedContent = '';
                
                for (let i = 0; i < sections.length; i++) {
                    const sectionMarkdown = sections[i];
                    
                    // Render markdown with the same approach as app.js
                    let html = md.render(sectionMarkdown);
                    
                    // Apply styles using the same method as app.js
                    html = applyInlineStyles(html, theme);
                    
                    // 为每个部分添加分隔线和section-card样式
                    combinedContent += `<div class="section-card">${html}</div>`;
                    
                    // 如果不是最后一部分，添加分隔线
                    if (i < sections.length - 1) {
                        combinedContent += '<hr style="margin: 20px 0; border: 1px solid #eee;">';
                    }
                }
                
                // 直接更新预览区域，不再使用iframe
                preview.innerHTML = combinedContent;
                
                // 更新processedContent变量，供复制、下载、发送到微信等操作使用
                processedContent = {
                    html: combinedContent,
                    styledHtml: combinedContent, // 这里存储的是已经应用了样式的HTML
                    markdown: markdown,
                    theme: theme
                };
                
                // 重新初始化Mermaid图表 - 延迟执行确保DOM完全就绪
                if (typeof mermaid !== 'undefined') {
                    setTimeout(() => {
                        try {
                            console.log('Starting Mermaid rendering...');
                            
                            // Find all mermaid code blocks with multiple selector patterns
                            const mermaidSelectors = [
                                'pre code.language-mermaid',
                                'code.mermaid', 
                                '.mermaid',
                                'pre.mermaid',
                                'div.mermaid'
                            ];
                            
                            let mermaidElements = [];
                            mermaidSelectors.forEach(selector => {
                                const elements = preview.querySelectorAll(selector);
                                console.log(`Found ${elements.length} elements with selector: ${selector}`);
                                mermaidElements.push(...elements);
                            });
                            
                            // 去重并过滤掉已经渲染的元素
                            mermaidElements = [...new Set(mermaidElements)].filter(el => {
                                return !el.closest('.mermaid[data-processed="true"]');
                            });
                            
                            console.log(`Total unique Mermaid elements to render: ${mermaidElements.length}`);
                            
                            if (mermaidElements.length > 0) {
                                // 为每个元素添加data-processed标记避免重复渲染
                                mermaidElements.forEach(el => {
                                    el.setAttribute('data-processed', 'true');
                                });
                                
                                mermaid.run({
                                    nodes: mermaidElements
                                }).then(() => {
                                    console.log('Mermaid rendering completed successfully');
                                }).catch((error) => {
                                    console.error('Mermaid rendering failed:', error);
                                    console.error('Error details:', error.message, error.stack);
                                    // 如果渲染失败，移除标记以便下次重试
                                    mermaidElements.forEach(el => {
                                        el.removeAttribute('data-processed');
                                    });
                                });
                            } else {
                                console.log('No Mermaid elements found to render');
                            }
                        } catch (error) {
                            console.error('Mermaid initialization failed:', error);
                            console.error('Error details:', error.message, error.stack);
                        }
                    }, 100); // 100ms延迟确保DOM完全加载
                } else {
                    console.warn('Mermaid is not defined');
                }
                
                // 初始化 MathJax
                initMathJax(preview);
                
                updateStatus('渲染完成');
            } catch (error) {
                console.error('渲染失败:', error);
                preview.innerHTML = `
                    <div class="error">
                        <strong>渲染失败</strong><br>
                        ${error.message}<br><br>
                        <small>本地渲染，无需API服务</small>
                    </div>
                `;
                updateStatus('渲染失败', true);
            } finally {
                hideLoading();
            }
        }
        
        // Apply inline styles using the same logic as app.js
        function applyInlineStyles(html, currentStyle) {
  if (typeof STYLES === 'undefined') {
    console.error('STYLES object not loaded');
    return html;
  }
  const style = STYLES[currentStyle].styles;
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');

          // 先处理图片网格布局（在应用样式之前）
          groupConsecutiveImages(doc, currentStyle);

          Object.keys(style).forEach(selector => {
            if (selector === 'pre' || selector === 'code' || selector === 'pre code') {
              return;
            }

            // 跳过已经在网格容器中的图片
            const elements = doc.querySelectorAll(selector);
            elements.forEach(el => {
              // 如果是图片且在网格容器内，跳过样式应用
              if (el.tagName === 'IMG' && el.closest('.image-grid')) {
                return;
              }

              const currentStyle = el.getAttribute('style') || '';
              el.setAttribute('style', currentStyle + '; ' + style[selector]);
            });
          });

          // 创建外层容器
          const container = doc.createElement('section');
          container.setAttribute('style', style.container);
          
          // 如果有内层容器样式，创建内层容器
          if (style.innerContainer) {
            const innerContainer = doc.createElement('section');
            innerContainer.setAttribute('style', style.innerContainer);
            innerContainer.innerHTML = doc.body.innerHTML;
            container.appendChild(innerContainer);
          } else {
            // 如果没有内层容器样式，直接使用外层容器
            container.innerHTML = doc.body.innerHTML;
          }

          return container.outerHTML;
        }
        
        // Group consecutive images using the same logic as app.js
        function groupConsecutiveImages(doc, currentStyle) {
          const body = doc.body;
          const children = Array.from(body.children);

          let imagesToProcess = [];

          // 找出所有图片元素，处理两种情况：
          // 1. 多个图片在同一个<p>标签内（连续图片）
          // 2. 每个图片在单独的<p>标签内（分隔的图片）
          children.forEach((child, index) => {
            if (child.tagName === 'P') {
              const images = child.querySelectorAll('img');
              if (images.length > 0) {
                // 如果一个P标签内有多个图片，它们肯定是连续的
                if (images.length > 1) {
                  // 多个图片在同一个P标签内，作为一组
                  const group = Array.from(images).map(img => ({
                    element: child,
                    img: img,
                    index: index,
                    inSameParagraph: true,
                    paragraphImageCount: images.length
                  }));
                  imagesToProcess.push(...group);
                } else if (images.length === 1) {
                  // 单个图片在P标签内
                  imagesToProcess.push({
                    element: child,
                    img: images[0],
                    index: index,
                    inSameParagraph: false,
                    paragraphImageCount: 1
                  });
                }
              }
            } else if (child.tagName === 'IMG') {
              // 直接是图片元素（少见情况）
              imagesToProcess.push({
                element: child,
                img: child,
                index: index,
                inSameParagraph: false,
                paragraphImageCount: 1
              });
            }
          });

          // 分组逻辑
          let groups = [];
          let currentGroup = [];

          imagesToProcess.forEach((item, i) => {
            if (i === 0) {
              currentGroup.push(item);
            } else {
              const prevItem = imagesToProcess[i - 1];

              // 判断是否连续的条件：
              // 1. 在同一个P标签内的图片肯定是连续的
              // 2. 不同P标签的图片，要看索引是否相邻（差值为1表示相邻）
              let isContinuous = false;

              if (item.index === prevItem.index) {
                // 同一个P标签内的图片
                isContinuous = true;
              } else if (item.index - prevItem.index === 1) {
                // 相邻的P标签，表示连续（没有空行）
                isContinuous = true;
              }
              // 如果索引差大于1，说明中间有其他元素或空行，不连续

              if (isContinuous) {
                currentGroup.push(item);
              } else {
                if (currentGroup.length > 0) {
                  groups.push([...currentGroup]);
                }
                currentGroup = [item];
              }
            }
          });

          if (currentGroup.length > 0) {
            groups.push(currentGroup);
          }

          // 对每组图片进行处理
          groups.forEach(group => {
            // 只有2张及以上的图片才需要特殊布局
            if (group.length < 2) return;

            const imageCount = group.length;
            const firstElement = group[0].element;

            // 创建容器
            const gridContainer = doc.createElement('section');
            gridContainer.setAttribute('class', 'image-grid');
            gridContainer.setAttribute('data-image-count', imageCount);

            // 根据图片数量设置网格样式
            let gridStyle = '';
            let columns = 2; // 默认2列

            if (imageCount === 2) {
              gridStyle = `
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px;
                margin: 20px auto;
                max-width: 100%;
                align-items: start;
              `;
              columns = 2;
            } else if (imageCount === 3) {
              gridStyle = `
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 8px;
                margin: 20px auto;
                max-width: 100%;
                align-items: start;
              `;
              columns = 3;
            } else if (imageCount === 4) {
              gridStyle = `
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px;
                margin: 20px auto;
                max-width: 100%;
                align-items: start;
              `;
              columns = 2;
            } else {
              // 5张及以上，使用3列
              gridStyle = `
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 8px;
                margin: 20px auto;
                max-width: 100%;
                align-items: start;
              `;
              columns = 3;
            }

            gridContainer.setAttribute('style', gridStyle);
            gridContainer.setAttribute('data-columns', columns);

            // 将图片添加到容器中
            group.forEach((item) => {
              const imgWrapper = doc.createElement('section');

              imgWrapper.setAttribute('style', `
                width: 100%;
                height: auto;
                overflow: hidden;
              `);

              const img = item.img.cloneNode(true);
              // 修改图片样式以适应容器，添加圆角
              img.setAttribute('style', `
                width: 100%;
                height: auto;
                display: block;
                border-radius: 8px;
              `.trim());

              imgWrapper.appendChild(img);
              gridContainer.appendChild(imgWrapper);
            });

            // 替换原来的图片元素
            firstElement.parentNode.insertBefore(gridContainer, firstElement);

            // 删除原来的图片元素（需要去重，避免重复删除同一个元素）
            const elementsToRemove = new Set();
            group.forEach(item => {
              elementsToRemove.add(item.element);
            });
            elementsToRemove.forEach(element => {
              if (element.parentNode) {
                element.parentNode.removeChild(element);
              }
            });
          });
        }

        // 加载示例内容
        function loadSample() {
            const sampleMarkdown = `# 测试文档 - 完整功能演示

## 标题层级测试

### 三级标题示例

#### 四级标题示例

##### 五级标题示例

###### 六级标题示例
---
## 文本格式测试

这是**加粗文字**的效果，这是*斜体文字*的效果，这是~~删除线文字~~的效果。

### 组合效果
**加粗和*斜体*的组合**，以及~~删除线和**加粗**的组合~~

## 列表测试

### 无序列表
- 第一级项目1
- 第一级项目2
  - 第二级项目1
  - 第二级项目2
    - 第三级项目1
    - 第三级项目2
- 第一级项目3

### 有序列表
1. 第一步操作
2. 第二步操作
   1. 子步骤1
   2. 子步骤2
3. 第三步操作

### 任务列表
- [x] 已完成的任务
- [ ] 待完成的任务1
- [ ] 待完成的任务2

## 代码测试

### 行内

const result = calculateSum(5, 3);
console.log(result);


## Mermaid图表测试


  

## 表格测试

### 基础表格
| 姓名 | 年龄 | 城市 | 职业 |
|------|------|------|------|
| 张三 | 25   | 北京 | 工程师 |
| 李四 | 30   | 上海 | 设计师 |
| 王五 | 28   | 广州 | 产品经理 |

### 对齐表格
| 左对齐 | 居中对齐 | 右对齐 |
|:-------|:--------:|-------:|
| 文本1  | 文本2    | 文本3  |
| 数据1  | 数据2    | 数据3  |

## 引用测试

### 单行引用
> 这是一个简单的引用。

### 多行引用
> 这是一个较长的引用，
> 可以跨越多行显示。
> 
> 支持**格式**和*样式*的引用。

### 嵌套引用
> 外层引用
> > 内层引用
> > 可以继续嵌套
> 回到外层

## 链接和图片测试

### 普通链接
[百度一下](https://www.baidu.com)

### 带标题的链接
[GitHub](https://github.com "全球最大的代码托管平台")

### 自动链接
https://www.example.com

## 分割线测试

---

## 特殊元素测试

### Emoji支持
🎉 🚀 💡 📊 ✨

### 数学公式测试

当 $a \\ne 0$ 时, 方程 $ax^2 + bx + c = 0$ 的解是
$x = {-b \\pm \\sqrt{b^2-4ac} \\over 2a}$

### 特殊符号
© ® ™ → ← ↑ ↓ ↔ ↕

### 数学符号
± × ÷ ≤ ≥ ≠ ∞ ∑ ∏ √ ∛ ∛
`;

            editor.value = sampleMarkdown;
            updateCharCount();
            renderMarkdown();
        }

        // 下载HTML
        function downloadHTML() {
            const markdown = editor.value.trim();
            const theme = themeSelector.value;

            if (!markdown) {
                alert('请先输入Markdown内容');
                return;
            }

            // 如果processedContent中没有当前主题的内容，或者内容为空，则重新处理
            if (!processedContent.styledHtml || processedContent.theme !== theme) {
                try {
                    // 渲染 markdown
                    let html = md.render(markdown);
                    
                    // 获取样式配置
                    const styleConfig = (typeof STYLES !== 'undefined') ? (STYLES[theme] || STYLES['wechat-default']) : null;
                    if (!styleConfig) {
                        console.error('No style configuration available');
                        preview.innerHTML = html;
                        return;
                    }
                    const styles = styleConfig.styles;
                    
                    // 应用内联样式
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    
                    // 应用样式到各个元素
                    Object.keys(styles).forEach(selector => {
                        if (selector === 'pre' || selector === 'code' || selector === 'pre code') {
                            return;
                        }
                        
                        const elements = doc.querySelectorAll(selector);
                        elements.forEach(el => {
                            const currentStyle = el.getAttribute('style') || '';
                            el.setAttribute('style', currentStyle + '; ' + styles[selector]);
                        });
                    });
                    
                    // 创建容器并应用容器样式
                    const container = doc.createElement('section');
                    container.setAttribute('style', styles.container);
                    container.innerHTML = doc.body.innerHTML;
                    
                    const styledHtml = container.outerHTML;
                    
                    // 更新processedContent变量
                    processedContent = {
                        html: html,
                        styledHtml: styledHtml,
                        markdown: markdown,
                        theme: theme
                    };
                } catch (error) {
                    console.error('HTML处理失败:', error);
                    alert('HTML处理失败: ' + error.message);
                    return;
                }
            }

            // 使用processedContent中的处理后的HTML内容
            const fullHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Markdown Output</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
    <script>
        mermaid.initialize({ startOnLoad: true });
    </script>
    <script type="text/javascript" id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
</head>
<body>
    ${processedContent.styledHtml}
</body>
</html>`;
            
            const blob = new Blob([fullHtml], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `markdown-${theme.replace('.css', '')}-${Date.now()}.html`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

                // 下载PNG - 修复空白图片问题的简化版本
        async function downloadPNG() {
            const previewPane = document.getElementById('preview');
            const theme = themeSelector.value;

            // 基本检查
            if (!previewPane || !previewPane.innerHTML.trim()) {
                alert('请先输入Markdown内容并等待预览加载完成');
                return;
            }

            // 检查html2canvas是否可用
            if (typeof html2canvas === 'undefined') {
                alert('PNG导出功能不可用，html2canvas库未加载');
                return;
            }

            showLoading();
            updateStatus('正在生成PNG...');

            try {
                // 1. 确保内容可见性
                updateStatus('准备截图内容...');
                
                // 重置滚动位置
                window.scrollTo(0, 0);
                previewPane.scrollTop = 0;
                
                // 强制设置预览区域可见
                previewPane.style.visibility = 'visible';
                previewPane.style.display = 'block';
                previewPane.style.opacity = '1';
                previewPane.style.position = 'static';
                
                // 检查内容
                const contentText = previewPane.textContent || previewPane.innerText || '';
                if (contentText.trim().length < 5) {
                    throw new Error('预览区域似乎没有文本内容，请检查Markdown是否正确渲染');
                }
                
                console.log(`准备截图，内容长度: ${contentText.length} 字符`);
                
                // 2. 等待渲染
                updateStatus('等待渲染完成...');
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // 3. 获取尺寸
                const rect = previewPane.getBoundingClientRect();
                const scrollWidth = previewPane.scrollWidth || rect.width;
                const scrollHeight = previewPane.scrollHeight || rect.height;
                
                console.log(`元素尺寸: ${rect.width}x${rect.height}, 滚动尺寸: ${scrollWidth}x${scrollHeight}`);
                
                // 4. 执行截图 - 使用最简单的配置
                updateStatus('生成图片...');
                
                const canvas = await html2canvas(previewPane, {
                    backgroundColor: '#ffffff',
                    scale: 1,
                    useCORS: true,
                    logging: true,
                    width: Math.max(scrollWidth, 400),
                    height: Math.max(scrollHeight, 300),
                    scrollX: 0,
                    scrollY: 0,
                    onclone: function(clonedDoc) {
                        // 简单的克隆处理
                        console.log('处理克隆文档...');
                        
                        // 确保所有元素可见
                        const body = clonedDoc.body;
                        if (body) {
                            body.style.visibility = 'visible';
                            body.style.display = 'block';
                            body.style.opacity = '1';
                            
                            // 确保所有子元素可见
                            const allElements = body.querySelectorAll('*');
                            allElements.forEach(el => {
                                if (el.style.visibility === 'hidden') el.style.visibility = 'visible';
                                if (el.style.display === 'none') el.style.display = 'block';
                                if (el.style.opacity === '0') el.style.opacity = '1';
                            });
                        }
                    }
                });
                
                // 5. 验证结果
                if (!canvas || canvas.width === 0 || canvas.height === 0) {
                    throw new Error('生成的画布无效');
                }
                
                console.log(`画布生成成功: ${canvas.width}x${canvas.height}`);
                
                // 检查画布内容
                const ctx = canvas.getContext('2d');
                const imageData = ctx.getImageData(0, 0, Math.min(canvas.width, 100), Math.min(canvas.height, 100));
                const pixels = imageData.data;
                
                let hasContent = false;
                for (let i = 0; i < pixels.length; i += 4) {
                    if (pixels[i] < 240 || pixels[i+1] < 240 || pixels[i+2] < 240) {
                        hasContent = true;
                        break;
                    }
                }
                
                if (!hasContent) {
                    // 尝试强制渲染一个简单测试
                    console.warn('画布似乎为空白，添加调试信息...');
                    console.log('Preview innerHTML:', previewPane.innerHTML.substring(0, 500));
                    console.log('Preview computed style:', window.getComputedStyle(previewPane));
                    
                    // 继续下载，让用户自己判断
                }
                
                // 6. 下载
                updateStatus('下载图片...');
                const dataURL = canvas.toDataURL('image/png', 1.0);
                
                const link = document.createElement('a');
                link.href = dataURL;
                link.download = `markdown-${theme}-${Date.now()}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                updateStatus('PNG下载完成');
                console.log(`PNG下载完成: ${canvas.width}x${canvas.height}`);
                
            } catch (error) {
                console.error('PNG生成失败:', error);
                updateStatus('PNG生成失败', true);
                
                // 提供详细的错误信息和建议
                let errorMsg = `PNG生成失败: ${error.message}\n\n`;
                errorMsg += '可能的解决方案:\n';
                errorMsg += '1. 确保已输入Markdown内容并完成预览\n';
                errorMsg += '2. 尝试刷新页面后重试\n';
                errorMsg += '3. 尝试使用更简单的内容测试\n';
                errorMsg += '4. 检查浏览器控制台是否有其他错误';
                
                alert(errorMsg);
            } finally {
                hideLoading();
            }
        }

        // Dropdown菜单控制函数
        function toggleDropdown(button) {
            const dropdown = button.parentElement;
            const content = dropdown.querySelector('.dropdown-content');
            
            // 关闭其他所有dropdown
            document.querySelectorAll('.dropdown').forEach(drop => {
                if (drop !== dropdown) {
                    drop.classList.remove('show');
                    drop.querySelector('.dropdown-content').classList.remove('show');
                }
            });
            
            // 切换当前dropdown
            const isOpen = dropdown.classList.contains('show');
            if (isOpen) {
                dropdown.classList.remove('show');
                content.classList.remove('show');
            } else {
                dropdown.classList.add('show');
                content.classList.add('show');
            }
        }

        function hideDropdown(link) {
            const dropdown = link.closest('.dropdown');
            if (dropdown) {
                dropdown.classList.remove('show');
                dropdown.querySelector('.dropdown-content').classList.remove('show');
            }
        }

        // 点击其他地方关闭dropdown
        document.addEventListener('click', function(event) {
            if (!event.target.closest('.dropdown')) {
                document.querySelectorAll('.dropdown').forEach(dropdown => {
                    dropdown.classList.remove('show');
                    dropdown.querySelector('.dropdown-content').classList.remove('show');
                });
            }
        });

        // 阻止dropdown内容点击事件冒泡
        document.querySelectorAll('.dropdown-content').forEach(content => {
            content.addEventListener('click', function(event) {
                event.stopPropagation();
            });
        });

        // 将Markdown转换为纯文本
        function markdownToText(markdown) {
            // 移除Markdown语法，只保留纯文本内容
            return markdown
                // 移除代码块
                .replace(/```[\s\S]*?```/g, '')
                // 移除行内代码
                .replace(/`[^`]*`/g, '')
                // 移除链接，保留链接文本
                .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
                // 移除图片
                .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
                // 移除标题标记
                .replace(/^#+\s*/gm, '')
                // 移除粗体和斜体标记
                .replace(/\*\*([^*]+)\*\*/g, '$1')
                .replace(/\*([^*]+)\*/g, '$1')
                .replace(/__([^_]+)__/g, '$1')
                .replace(/_([^_]+)_/g, '$1')
                // 移除删除线
                .replace(/~~([^~]+)~~/g, '$1')
                // 移除引用标记
                .replace(/^>\s*/gm, '')
                // 移除列表标记
                .replace(/^[\d-]\.\s*/gm, '')
                // 移除水平线
                .replace(/^[-*]{3,}$/gm, '')
                // 移除多余的空行（保留最多两个连续的换行符）
                .replace(/\n{3,}/g, '\n\n')
                // 去除首尾空格
                .trim();
        }

        // 下载MD（原始Markdown）
        function downloadMD() {
            const markdown = editor.value.trim();
            const theme = themeSelector.value;

            if (!markdown) {
                alert('请先输入Markdown内容');
                return;
            }

            const blob = new Blob([markdown], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `markdown-${theme.replace('.css', '')}-${Date.now()}.md`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        // 下载TXT（纯文本）
        function downloadTXT() {
            const markdown = editor.value.trim();
            const theme = themeSelector.value;

            if (!markdown) {
                alert('请先输入Markdown内容');
                return;
            }

            // 将Markdown转换为纯文本
            const plainText = markdownToText(markdown);
            
            const blob = new Blob([plainText], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `markdown-${theme.replace('.css', '')}-${Date.now()}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        // 复制渲染后的HTML到剪贴板
        function copyToClipboard() {
            const markdown = editor.value.trim();
            const theme = themeSelector.value;

            if (!markdown) {
                alert('请先输入Markdown内容');
                return;
            }

            // 如果processedContent中没有当前主题的内容，或者内容为空，则重新处理
            if (!processedContent.styledHtml || processedContent.theme !== theme) {
                showLoading();
                updateStatus('正在处理内容...');
                
                try {
                    // 渲染 markdown
                    let html = md.render(markdown);
                    
                    // 获取样式配置
                    const styleConfig = (typeof STYLES !== 'undefined') ? (STYLES[theme] || STYLES['wechat-default']) : null;
                    if (!styleConfig) {
                        console.error('No style configuration available for export');
                        alert('样式配置未加载，无法导出');
                        hideLoading();
                        return;
                    }
                    const styles = styleConfig.styles;
                    
                    // 应用内联样式
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    
                    // 应用样式到各个元素
                    Object.keys(styles).forEach(selector => {
                        if (selector === 'pre' || selector === 'code' || selector === 'pre code') {
                            return;
                        }
                        
                        const elements = doc.querySelectorAll(selector);
                        elements.forEach(el => {
                            const currentStyle = el.getAttribute('style') || '';
                            el.setAttribute('style', currentStyle + '; ' + styles[selector]);
                        });
                    });
                    
                    // 创建容器并应用容器样式
                    const container = doc.createElement('section');
                    container.setAttribute('style', styles.container);
                    container.innerHTML = doc.body.innerHTML;
                    
                    const styledHtml = container.outerHTML;
                    
                    // 更新processedContent变量
                    processedContent = {
                        html: html,
                        styledHtml: styledHtml,
                        markdown: markdown,
                        theme: theme
                    };
                    
                    hideLoading();
                } catch (error) {
                    console.error('内容处理失败:', error);
                    alert('内容处理失败: ' + error.message);
                    hideLoading();
                    updateStatus('内容处理失败', true);
                    return;
                }
            }

            showLoading();
            updateStatus('正在复制到剪贴板...');

            try {
                // 使用processedContent中的处理后的HTML内容
                copyHTMLToClipboard(processedContent.styledHtml);
            } catch (error) {
                console.error('复制失败:', error);
                alert('复制失败: ' + error.message);
                hideLoading();
                updateStatus('复制失败', true);
            }
        }

        // 将HTML内容复制到剪贴板
        function copyHTMLToClipboard(htmlContent) {
            // 创建临时div来处理HTML内容
            const tempDiv = document.createElement('section');
            tempDiv.innerHTML = htmlContent;
            
            // 移除可能的script标签以确保安全
            const scripts = tempDiv.querySelectorAll('script');
            scripts.forEach(script => script.remove());
            
            // 处理嵌套的section标签 - 如果内容包含section-card div元素，
            // 则提取其中的内容而不是整个嵌套结构
            const sectionCards = tempDiv.querySelectorAll('div.section-card');
            if (sectionCards.length > 0) {
                // 如果有section-card，提取其中的内容并重新组织
                let combinedContent = '';
                sectionCards.forEach((card, index) => {
                    // 提取card中的内容
                    combinedContent += card.innerHTML;
                    // 如果不是最后一个card，添加分隔线
                    if (index < sectionCards.length - 1) {
                        combinedContent += '<hr style="margin: 20px 0; border: 1px solid #eee;">';
                    }
                });
                tempDiv.innerHTML = combinedContent;
            }
            
            // 获取清理后的HTML内容
            const cleanHTML = tempDiv.innerHTML;
            
            // 同时准备纯文本版本
            const plainText = tempDiv.textContent || tempDiv.innerText || '';
            
            // 使用Clipboard API复制HTML内容（支持富文本格式）
            if (navigator.clipboard && window.ClipboardItem) {
                // 现代浏览器支持Clipboard API，同时复制HTML和纯文本格式
                const htmlBlob = new Blob([cleanHTML], { type: 'text/html' });
                const textBlob = new Blob([plainText], { type: 'text/plain' });
                
                const data = [
                    new ClipboardItem({
                        'text/html': htmlBlob,
                        'text/plain': textBlob
                    })
                ];
                
                navigator.clipboard.write(data)
                    .then(() => {
                        hideLoading();
                        updateStatus('已复制到剪贴板');
                        // alert('已复制到剪贴板');
                    })
                    .catch(err => {
                        console.error('Clipboard API 失败:', err);
                        // 降级到传统方法
                        fallbackCopyTextToClipboard(cleanHTML, plainText);
                    });
            } else {
                // 降级到传统方法
                fallbackCopyTextToClipboard(cleanHTML, plainText);
            }
        }

        // 降级复制方法 - 改进版本，支持Linux/Debian系统
        function fallbackCopyTextToClipboard(html, text) {
            // 首先尝试使用更直接的方法来复制HTML内容
            try {
                // 创建一个临时的div元素来保存HTML内容
                const tempDiv = document.createElement('section');
                tempDiv.innerHTML = html;
                tempDiv.style.position = 'fixed';
                tempDiv.style.left = '-9999px';
                tempDiv.style.top = '-9999px';
                tempDiv.style.opacity = '0';
                tempDiv.style.zIndex = '-1';
                document.body.appendChild(tempDiv);
                
                // 选择并复制内容
                const range = document.createRange();
                range.selectNodeContents(tempDiv);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
                
                // 尝试复制
                let successful = false;
                if (document.queryCommandSupported && document.queryCommandSupported('copy')) {
                    successful = document.execCommand('copy');
                }
                
                // 清理选择和元素
                selection.removeAllRanges();
                document.body.removeChild(tempDiv);
                
                if (successful) {
                    hideLoading();
                    updateStatus('已复制到剪贴板');
                    alert('已复制到剪贴板');
                    return;
                } else {
                    // 如果复制HTML失败，尝试复制纯文本
                    throw new Error('HTML复制命令失败');
                }
            } catch (err) {
                console.error('HTML复制失败:', err);
                
                // 如果HTML复制失败，尝试复制纯文本
                try {
                    // 创建一个临时的textarea用于复制纯文本内容
                    const textArea = document.createElement('textarea');
                    // 使用纯文本内容
                    textArea.value = text || '';
                    
                    // 避免滚动到底部
                    textArea.style.position = 'fixed';
                    textArea.style.left = '-9999px';
                    textArea.style.top = '-9999px';
                    textArea.style.opacity = '0';
                    textArea.style.zIndex = '-1';
                    
                    document.body.appendChild(textArea);
                    textArea.focus();
                    textArea.select();
                    
                    // 尝试复制
                    let successful = false;
                    if (document.queryCommandSupported && document.queryCommandSupported('copy')) {
                        successful = document.execCommand('copy');
                    }
                    
                    // 清理
                    document.body.removeChild(textArea);
                    
                    if (successful) {
                        hideLoading();
                        updateStatus('已复制到剪贴板（纯文本）');
                        alert('已复制到剪贴板（纯文本）');
                    } else {
                        throw new Error('纯文本复制命令失败');
                    }
                } catch (err2) {
                    console.error('纯文本复制也失败:', err2);
                    alert('复制失败: ' + err2.message + '\n\n请尝试手动选择内容后使用 Ctrl+C 复制');
                    hideLoading();
                    updateStatus('复制失败', true);
                }
            }
        }

        // 事件监听
        editor.addEventListener('input', debounce(() => {
            updateCharCount();
            renderMarkdown();
        }, 500));

        themeSelector.addEventListener('change', renderMarkdown);
        
        // 为分隔线拆分复选框添加事件监听器
        document.getElementById('split-checkbox').addEventListener('change', renderMarkdown);
        
        // 为清空编辑器按钮添加事件监听器
        if (clearEditorBtn) {
            clearEditorBtn.addEventListener('click', clearEditor);
        }
        
        // 为主题选项添加事件监听器
        themeOptions.forEach(option => {
            option.addEventListener('click', () => {
                // 移除所有选项的active类
                themeOptions.forEach(opt => opt.classList.remove('active'));
                // 为当前选项添加active类
                option.classList.add('active');
                
                // 获取选中的主题
                const selectedTheme = option.getAttribute('data-theme');
                
                // 更新主题选择器的值
                themeSelector.value = selectedTheme;
                
                // 根据选中的主题更新渲染
                // 添加延迟以确保CSS文件更新完成
                setTimeout(() => {
                    renderMarkdown();
                }, 50);
            });
        });
        
        // 确保在页面加载时正确设置活动主题选项
        function updateActiveThemeOption() {
            const currentTheme = themeSelector.value;
            themeOptions.forEach(option => {
                option.classList.remove('active');
                if (option.getAttribute('data-theme') === currentTheme) {
                    option.classList.add('active');
                }
            });
        }
        
        // 监听主题选择器变化
        themeSelector.addEventListener('change', updateActiveThemeOption);
        
        // Custom CSS Editor Event Listeners
        if (editCustomCSSBtn) {
            editCustomCSSBtn.addEventListener('click', openCustomCSSEditor);
        }
        
        if (closeCssPanel) {
            closeCssPanel.addEventListener('click', closeCustomCSSEditor);
        }
        
        if (cancelCssEdit) {
            cancelCssEdit.addEventListener('click', closeCustomCSSEditor);
        }
        
        if (saveCssEdit) {
            saveCssEdit.addEventListener('click', saveCustomCSS);
        }
        
        if (cssExampleBtn) {
            cssExampleBtn.addEventListener('click', loadCSSExample);
        }
        
        // 为设置抽屉添加事件监听器
        if (settingsToggle) {
            settingsToggle.addEventListener('click', () => {
                settingsPane.classList.toggle('visible');
                // 更新按钮文本
                if (settingsPane.classList.contains('visible')) {
                    settingsToggle.innerHTML = '<i class="fas fa-times"></i> 关闭设置';
                    // 三列布局
                    document.querySelector('.container').classList.remove('two-column');
                } else {
                    settingsToggle.innerHTML = '<i class="fas fa-cog"></i> 设置面板';
                    // 两列布局
                    document.querySelector('.container').classList.add('two-column');
                }
                // 保存状态到localStorage
                localStorage.setItem('settingsPaneVisible', settingsPane.classList.contains('visible'));
            });
        }
        
        if (settingsClose) {
            settingsClose.addEventListener('click', () => {
                settingsPane.classList.remove('visible');
                // 恢复按钮文本
                if (settingsToggle) {
                    settingsToggle.innerHTML = '<i class="fas fa-cog"></i> 设置面板';
                }
                // 两列布局
                document.querySelector('.container').classList.add('two-column');
                // 保存状态到localStorage
                localStorage.setItem('settingsPaneVisible', false);
            });
        }
        
        // 页面加载时恢复设置面板状态
        document.addEventListener('DOMContentLoaded', () => {
            // Always start with the settings panel collapsed
            // 两列布局
            document.querySelector('.container').classList.add('two-column');
            // Ensure settings pane is hidden
            settingsPane.classList.remove('visible');
            
            // Reset button text to default
            if (settingsToggle) {
                settingsToggle.innerHTML = '<i class="fas fa-cog"></i> 设置面板';
            }
        });

        // 初始化
        document.addEventListener('DOMContentLoaded', () => {
            updateStatus('就绪');
            updateCharCount();
            
            // 检查微信配置
            checkWeChatConfig();
            
            // Populate theme selector with options from the STYLES object
            if (typeof STYLES !== 'undefined') {
                const themes = Object.keys(STYLES);
                themes.forEach(theme => {
                    const option = document.createElement('option');
                    option.value = theme;
                    option.textContent = STYLES[theme].name; // Use the name from STYLES
                    themeSelector.appendChild(option);
                });
            } else {
                console.error('STYLES object not loaded. Please check styles.js');
                // Add a default option as fallback
                const option = document.createElement('option');
                option.value = 'wechat-default';
                option.textContent = 'Default';
                themeSelector.appendChild(option);
            }
            
            // Set wechat-default as the default theme
            themeSelector.value = 'wechat-default';
            
            // Update active theme option to match the selected theme
            updateActiveThemeOption();
            
            // After populating, render the initial markdown if any
            renderMarkdown();
            
            updateStatus('本地渲染，无需API服务', false);
        });

        // 发送到微信草稿箱
        function sendToWeChatDraft() {
            const markdown = editor.value.trim();
            const theme = themeSelector.value;

            if (!markdown) {
                alert('请先输入Markdown内容');
                return;
            }

            // 获取微信配置
            const appId = localStorage.getItem('wechat_app_id') || '';
            const appSecret = localStorage.getItem('wechat_app_secret') || '';
            const thumbMediaId = localStorage.getItem('wechat_thumb_media_id') || '';
            
            // 调试信息
            console.log('当前微信配置:');
            console.log('AppID:', appId);
            console.log('AppSecret:', appSecret);
            console.log('ThumbMediaId:', thumbMediaId);
            
            if (!appId || !appSecret || appId.trim() === '' || appSecret.trim() === '') {
                console.log('微信配置不完整，中断执行');
                alert('请先配置微信信息（AppID和AppSecret）');
                return;
            }
            
            console.log('微信配置验证通过，继续执行');

            // 如果processedContent中没有当前主题的内容，或者内容为空，则重新处理
            if (!processedContent.styledHtml || processedContent.theme !== theme) {
                showLoading();
                updateStatus('正在处理内容...');
                
                try {
                    // 渲染 markdown
                    let html = md.render(markdown);
                    
                    // 获取样式配置
                    const styleConfig = (typeof STYLES !== 'undefined') ? (STYLES[theme] || STYLES['wechat-default']) : null;
                    if (!styleConfig) {
                        console.error('No style configuration available');
                        preview.innerHTML = html;
                        hideLoading();
                        return;
                    }
                    const styles = styleConfig.styles;
                    
                    // 应用内联样式
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    
                    // 应用样式到各个元素
                    Object.keys(styles).forEach(selector => {
                        if (selector === 'pre' || selector === 'code' || selector === 'pre code') {
                            return;
                        }
                        
                        const elements = doc.querySelectorAll(selector);
                        elements.forEach(el => {
                            const currentStyle = el.getAttribute('style') || '';
                            el.setAttribute('style', currentStyle + '; ' + styles[selector]);
                        });
                    });
                    
                    // 创建容器并应用容器样式
                    const container = doc.createElement('section');
                    container.setAttribute('style', styles.container);
                    container.innerHTML = doc.body.innerHTML;
                    
                    const styledHtml = container.outerHTML;
                    
                    // 更新processedContent变量
                    processedContent = {
                        html: html,
                        styledHtml: styledHtml,
                        markdown: markdown,
                        theme: theme
                    };
                    
                    hideLoading();
                } catch (error) {
                    console.error('内容处理失败:', error);
                    alert('内容处理失败: ' + error.message);
                    hideLoading();
                    updateStatus('内容处理失败', true);
                    return;
                }
            }

            showLoading();
            updateStatus('正在发送到微信草稿箱...');

            // 调试信息
            console.log('Sending request to send draft');
            console.log('AppID:', appId);
            console.log('AppSecret:', appSecret);
            console.log('Theme:', theme);
            console.log('ThumbMediaId:', thumbMediaId);
            
            // 获取分隔线拆分复选框的状态
            const splitCheckbox = document.getElementById('split-checkbox');
            const dashSeparator = splitCheckbox && splitCheckbox.checked;
            
            const requestData = {
                appid: appId,
                secret: appSecret,
                markdown: markdown, // 使用原始markdown内容
                style: theme,
                thumb_media_id: thumbMediaId,
                dashseparator: dashSeparator
            };
            
            console.log('Request data:', JSON.stringify(requestData));
            
            // 直接发送到新的后端接口
            fetch(`${API_BASE_URL}/wechat/send_draft`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
            })
            .then(response => {
                console.log('Received response from server:', response);
                if (!response.ok) {
                    console.log('Response not ok:', response.status, response.statusText);
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                hideLoading();
                // 成功的条件：没有errcode字段，或者errcode为0，或者有media_id字段
                if (!data.errcode || data.errcode === 0 || data.media_id) {
                    updateStatus('已成功发送到微信草稿箱');
                    alert('已成功发送到微信草稿箱\n草稿ID: ' + data.media_id);
                } else {
                    updateStatus('发送失败', true);
                    // 如果errorMsg包含Unicode转义序列，尝试解码
                    let errorMsg = data.errmsg;
                    try {
                        // 尝试解析可能包含Unicode转义序列的字符串
                        errorMsg = JSON.parse('"' + data.errmsg.replace(/"/g, '\\"') + '"');
                    } catch (e) {
                        // 如果解析失败，保持原始错误信息
                        errorMsg = data.errmsg;
                    }
                    alert('发送到微信草稿箱失败: ' + errorMsg);
                }
            })
            .catch(error => {
                hideLoading();
                updateStatus('发送失败', true);
                console.log('Final error caught:', error);
                alert('发送到微信草稿箱失败: ' + error.message);
            });
        }

        // 检查微信配置
        function checkWeChatConfig() {
            const appId = localStorage.getItem('wechat_app_id');
            const appSecret = localStorage.getItem('wechat_app_secret');
            const thumbMediaId = localStorage.getItem('wechat_thumb_media_id');
            
            // Only log WeChat config in development mode
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                console.log('微信配置检查:');
                console.log('AppID:', appId);
                console.log('AppSecret:', appSecret ? '***' + appSecret.slice(-4) : null);
                console.log('ThumbMediaId:', thumbMediaId);
            }
            
            if (appId && appSecret) {
                console.log('微信配置完整');
                return true;
            } else {
                console.log('微信配置不完整');
                return false;
            }
        }

        // 配置微信信息
        function configureWeChat() {
            const appId = localStorage.getItem('wechat_app_id') || '';
            const appSecret = localStorage.getItem('wechat_app_secret') || '';
            const thumbMediaId = localStorage.getItem('wechat_thumb_media_id') || '';
            
            const newAppId = prompt('请输入微信公众号AppID:', appId);
            if (newAppId === null) return; // 用户取消了输入
            
            const newAppSecret = prompt('请输入微信公众号AppSecret:', appSecret);
            if (newAppSecret === null) return; // 用户取消了输入
            
            const newThumbMediaId = prompt('请输入缩略图Media ID (必要):', thumbMediaId);
            
            // 只要用户输入了有效的AppID和AppSecret就保存
            if (newAppId.trim() !== '' && newAppSecret.trim() !== '') {
                localStorage.setItem('wechat_app_id', newAppId.trim());
                localStorage.setItem('wechat_app_secret', newAppSecret.trim());
                if (newThumbMediaId !== null) {
                    if (newThumbMediaId.trim() !== '') {
                        localStorage.setItem('wechat_thumb_media_id', newThumbMediaId.trim());
                    } else {
                        localStorage.removeItem('wechat_thumb_media_id');
                    }
                }
                alert('微信配置已保存');
                // 调试信息
                checkWeChatConfig();
            } 
            // 如果用户清空了输入，则清除配置
            else if (newAppId.trim() === '' && newAppSecret.trim() === '') {
                localStorage.removeItem('wechat_app_id');
                localStorage.removeItem('wechat_app_secret');
                localStorage.removeItem('wechat_thumb_media_id');
                alert('已清除微信配置');
            }
            // 如果只输入了一个字段，给出提示但不保存
            else {
                alert('请同时输入AppID和AppSecret');
            }
        }

        // 清空编辑器内容
        function clearEditor() {
            editor.value = '';
            updateCharCount();
            renderMarkdown();
        }
        
        // Custom CSS Editor Functions
        function openCustomCSSEditor() {
            // Load current custom CSS content
            fetch(`${API_BASE_URL}/themes/custom.css`)
                .then(response => {
                    if (response.ok) {
                        return response.text();
                    } else {
                        // If file doesn't exist, start with empty content
                        return '';
                    }
                })
                .then(cssContent => {
                    customCssEditor.value = cssContent;
                    cssFloatingPanel.style.display = 'flex';
                    // Focus the editor and move cursor to end
                    customCssEditor.focus();
                    customCssEditor.selectionStart = customCssEditor.value.length;
                })
                .catch(error => {
                    console.error('Error loading custom CSS:', error);
                    customCssEditor.value = '';
                    cssFloatingPanel.style.display = 'flex';
                    // Focus the editor even if there's an error
                    customCssEditor.focus();
                });
        }
        
        function closeCustomCSSEditor() {
            cssFloatingPanel.style.display = 'none';
        }
        
        function saveCustomCSS() {
            const cssContent = customCssEditor.value;
            
            // Save CSS content to server
            fetch(`${API_BASE_URL}/themes/custom.css`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/css',
                },
                body: cssContent
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.status === 'success') {
                    closeCustomCSSEditor();
                    // Update theme selector to use custom.css
                    themeSelector.value = 'custom.css';
                    // Update active theme option
                    themeOptions.forEach(opt => opt.classList.remove('active'));
                    const customThemeOption = document.querySelector('.theme-option[data-theme="custom.css"]');
                    if (customThemeOption) {
                        customThemeOption.classList.add('active');
                    }
                    // Add a small delay to ensure file is written before re-rendering
                    setTimeout(() => {
                        // Re-render preview to apply new CSS
                        renderMarkdown();
                    }, 100);
                } else {
                    throw new Error(data.message || '保存失败');
                }
            })
            .catch(error => {
                console.error('Error saving custom CSS:', error);
                alert('保存自定义CSS失败: ' + error.message);
            });
        }
        
        // Load CSS example into editor
        function loadCSSExample() {
            const cssExample = `/* 自定义CSS示例 */
.markdown-body {
    background: #f8f9fa;
    padding: 20px;
    border-radius: 8px;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

h1, h2, h3 {
    color: #2c3e50;
    border-bottom: 2px solid #3498db;
    padding-bottom: 5px;
}

blockquote {
    background: #e8f4f8;
    border-left: 4px solid #3498db;
    padding: 10px 20px;
    margin: 10px 0;
    border-radius: 0 4px 4px 0;
}

code {
    background: #eee;
    padding: 2px 6px;
    border-radius: 3px;
    font-family: 'Consolas', monospace;
}

pre {
    background: #2c3e50;
    color: #fff;
    padding: 15px;
    border-radius: 5px;
    overflow-x: auto;
}`;
            
            if (confirm('确定要加载CSS示例吗？这将覆盖当前编辑的内容。')) {
                customCssEditor.value = cssExample;
            }
        }

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case 's':
                        e.preventDefault();
                        downloadHTML();
                        break;
                    case 'Enter':
                        e.preventDefault();
                        renderMarkdown();
                        break;
                }
            }
            
            // Ctrl+Shift+Backspace 清空编辑器
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Backspace') {
                e.preventDefault();
                clearEditor();
            }
        });

        // Make functions available globally for HTML onclick handlers
        window.loadSample = loadSample;
        window.copyToClipboard = copyToClipboard;
        window.clearEditor = clearEditor;
// Initialize MathJax for math formulas
function initMathJax(container) {
  // 检查 MathJax 是否已加载
  if (typeof window.MathJax !== 'undefined' && window.MathJax.typesetPromise) {
    // 使用 setTimeout 确保 DOM 更新完成后再渲染
    setTimeout(() => {
      try {
        // 对指定容器进行 MathJax 渲染
        window.MathJax.typesetPromise([container]);
      } catch (error) {
        console.warn('MathJax 渲染失败:', error);
      }
    }, 100);
  } else if (typeof window.MathJax !== 'undefined' && window.MathJax.typeset) {
    // 备用方法
    setTimeout(() => {
      try {
        window.MathJax.typeset([container]);
      } catch (error) {
        console.warn('MathJax 渲染失败:', error);
      }
    }, 100);
  } else {
    // 如果 MathJax 还未加载，等待一段时间再尝试
    setTimeout(() => {
      if (typeof window.MathJax !== 'undefined' && window.MathJax.typeset) {
        try {
          window.MathJax.typeset([container]);
        } catch (error) {
          console.warn('MathJax 渲染失败:', error);
        }
      }
    }, 500);
  }
}
