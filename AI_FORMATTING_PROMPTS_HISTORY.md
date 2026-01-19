# AI Formatting Prompts History (Since Jan 17, 2026)

## Summary

You have used **3 different versions** of the AI formatting prompt. The most significant change was simplifying from a very comprehensive prompt to a concise one.

---

## PROMPT VERSION 1: COMPREHENSIVE DESIGN PROMPT
**Commit**: `ca81208` (Jan 18, 2026 08:39)  
**Endpoint**: `/ai` (ai_assist function)  
**Length**: ~2,500+ characters (VERY DETAILED)  
**Status**: REPLACED (simplified)

### Full Prompt:
```
# 微信公众号HTML格式约束提示词
1. 角色 (Role)
你是一位顶级的Web前端工程师，同时也是一位有深厚审美素养的视觉设计师。你的使命不只是编写代码，而是将信息转化为引人入胜的视觉体验。你专精于为微信公众号生态创建高度兼容、视觉精致、体验流畅的HTML内容。你的代码不仅要能完美运行，更要成为一篇艺术品。

2. 核心任务 (Core Task)
根据第8节用户内容输入区提供的原始内容，生成一段完全内联样式 (fully-inline styled) 的HTML代码，用于微信公众号文章排版。最终产物必须是单个 <section> 标签包裹的、自包含的、可直接复制粘贴的代码块。

3. 设计哲学与美学指南 (Design Philosophy & Aesthetics Guide)
这是你的创作灵魂。在动手写代码前，请先在脑海中建立以下设计心智模型：

3.1. 核心原则：呼吸感 (Core Principle: Breathing Room)
在图片、引用块等视觉元素周围留出足够的安全边距。
自问: "读者在快速浏览时，眼睛会感到疲劳吗？信息是否清晰可分？"

3.2. 视觉层次 (Visual Hierarchy)
提示: "一眼就能看出重点"。引导读者的视线，让他们轻松抓住核心信息。
行动指南:
- 主标题 (<h1>): 必须是页面上最醒目的元素，使用更大的字号和更粗的字重。
- 副标题 (<h2>, <h3>): 尺寸和颜色要与主标题有明显区分，但比正文更突出。
- 正文 (<p>): 确保最佳的可读性，颜色通常使用深灰色（如#374151）而非纯黑，以减少视觉刺激。
- 强调 (<strong>): 使用品牌色或渐变色进行点缀，使其成为视觉焦点。

3.3. 科技与现代感 (Tech & Modern Feel)
提示: "于无声处听惊雷"。通过微妙的细节营造高级感。
行动指南:
- 色彩: 推荐使用低饱和度的色彩作为主色调，搭配一个明亮、高饱和的品牌色作为点缀。
- 排版: 采用系统字体栈，确保在各平台一致性。
- 间距: 遵循 8px 网格系统，所有间距都应该是 8 的倍数。

[... Full prompt continues with more detailed sections ...]

6. 黄金代码模板 (Golden Code Template)
<section style="width: 677px; margin: 0 auto; background: linear-gradient(#FDFDFE, #FFFFFF); padding: 55px; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', 'PingFang SC', 'Microsoft YaHei', sans-serif;">
  <!-- 标题区域 -->
  <h1 style="color: #111827; font-size: 28px; font-weight: 600; text-align: center; margin-bottom: 32px;">这里是主标题</h1>
  
  <!-- 内容段落 -->
  <p style="color: #374151; font-size: 16px; line-height: 1.9; text-align: left; margin-bottom: 24px;">这是一个内容段落，用于展示正文的样式和间距。</p>

  <!-- SVG 图标示例 -->
  <div style="text-align: center; margin: 40px 0;">
    <svg width="80" height="80" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="45" stroke="#3B82F6" stroke-width="5" fill="none" />
    </svg>
  </div>
  
  <!-- 图片模块 -->
  <div style="margin: 32px 0;">
    <img src="https://via.placeholder.com/600x300" alt="图片描述" style="max-width: 100%; display: block; margin: 0 auto;">
  </div>
</section>

7. 输出前验证清单 (Pre-Output Validation Checklist)
在提交最终代码前，请逐一验证：
- [ ] 主容器是 <section> 且宽度为 677px
- [ ] 所有样式都是内联的 (inline style)
- [ ] 没有使用外部 CSS 文件
- [ ] 背景色使用 linear-gradient
- [ ] 所有单位都是 px 或百分比
- [ ] 代码可以直接复制粘贴到微信
- [ ] 在各种设备尺寸上看起来都很好
- [ ] 没有使用禁止的标签或属性
```

### Characteristics:
- ✅ **Very Detailed**: Includes design philosophy, aesthetics, role-playing
- ✅ **Comprehensive**: 2,500+ characters with examples and templates
- ✅ **Educational**: Explains WHY, not just WHAT
- ✅ **Best for**: High-quality, artistic outputs
- ❌ **Downside**: Takes longer to process, more expensive API calls

### Use Case:
**Best for**: When you want premium, beautifully designed WeChat HTML with artistic flair and detailed styling guidance.

---

## PROMPT VERSION 2: SIMPLIFIED TECHNICAL PROMPT
**Commit**: `2956ec8` (Jan 18, 2026)  
**Endpoint**: `/ai/format-markdown`  
**Length**: ~170 characters (VERY CONCISE)  
**Status**: CURRENT (still in use since Jan 18)

### Full Prompt:
```
Convert markdown to WeChat HTML format. Use inline styles, section container, width 677px, margin auto, box-sizing border-box, flex layout. All styles inline. Background linear-gradient. Colors in hex or rgba. Units in px or %. Images: display block, max-width 100%. SVG with viewBox.
```

### Characteristics:
- ✅ **Very Concise**: Only ~170 characters
- ✅ **Fast Processing**: Quick API response
- ✅ **Cost-Effective**: Fewer tokens, lower cost
- ✅ **Consistent Results**: Predictable output format
- ❌ **Less Artistic**: No design philosophy guidance

### Use Case:
**Best for**: When you need quick, consistent WeChat HTML formatting without extensive styling guidance.

---

## PROMPT VERSION 3: CURRENT STATE (Jan 19, 2026)
**Commit**: `16eb41f` (refactored)  
**Location**: `services/ai_service.py` (format_markdown_to_html function)  
**Length**: ~170 characters (SAME AS V2)  
**Status**: ACTIVE

### Full Prompt:
```python
"Convert markdown to WeChat HTML format. Use inline styles, section container, width 677px, margin auto, box-sizing border-box, flex layout. All styles inline. Background linear-gradient. Colors in hex or rgba. Units in px or %. Images: display block, max-width 100%. SVG with viewBox."
```

**Note**: Extracted to services module, no content changes from V2.

---

## COMPARISON TABLE

| Aspect | V1 (Comprehensive) | V2/V3 (Concise) |
|--------|-------------------|-----------------|
| **Length** | 2,500+ chars | 170 chars |
| **Tokens Used** | ~400-500 | ~25-30 |
| **Processing Time** | Slower | Faster |
| **API Cost** | Higher | Lower |
| **Output Quality** | Artistic, detailed | Technical, consistent |
| **Design Philosophy** | Yes | No |
| **Role-Playing** | Yes (Web engineer + designer) | No |
| **Examples** | Yes (Golden template) | No |
| **Best for** | Premium designs | Quick formatting |

---

## RECOMMENDATION

### Choose V1 (Comprehensive) if:
- ✅ You want beautiful, artistic WeChat HTML
- ✅ Design quality is more important than speed
- ✅ You have budget for more API tokens
- ✅ You want the AI to understand design principles
- ✅ You're creating content for visual showcase

### Choose V2/V3 (Concise) if:
- ✅ You need fast processing
- ✅ Consistency is important
- ✅ You want to minimize API costs
- ✅ You're processing many documents
- ✅ You just need functional WeChat HTML
- ✅ You're using it in production with high volume

---

## How to Switch

To use the comprehensive V1 prompt instead of V2/V3:

**Option 1: Replace in services/ai_service.py**
```python
# In services/ai_service.py, find the format_markdown_to_html function
# Replace the "system" message content with the V1 prompt above
```

**Option 2: Add a new endpoint that uses V1**
```python
@app.post("/ai/format-markdown-premium")
async def format_markdown_premium(request: FormatMarkdownRequest):
    """Use comprehensive prompt for premium formatting"""
    # Use the V1 comprehensive prompt here
```

---

## Git History References

- **V1 Introduction**: Commit `ca81208` - "refactor: replace AI system prompt and remove streaming endpoint"
- **V2 Introduction**: Commit `2956ec8` - "feat: add /ai/format-markdown endpoint for AI排版"
- **Current State**: Commit `16eb41f` - "refactor: modularize api.py into maintainable architecture"

---

## Notes

- All three prompts target the same goal: generating WeChat-compatible HTML
- The main difference is the **verbosity** and **design philosophy guidance**
- V1 was the original comprehensive approach (likely what you started with)
- V2/V3 were simplified for performance and cost optimization
- Both approaches are valid depending on your use case

Would you like to switch back to V1, create a hybrid prompt, or keep using V2/V3?
