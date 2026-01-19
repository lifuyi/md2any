# -*- coding: utf-8 -*-
"""
AI service for GLM-based content generation and processing
"""

import os
import logging
from typing import Optional
from openai import OpenAI
from pydantic import BaseModel

logger = logging.getLogger(__name__)

# System prompts
WECHAT_SYSTEM_PROMPT = """微信公众号HTML格式要求：
1. 使用 <section> 作为主容器，宽度 677px，居中
2. 背景色用 linear-gradient，不用 background-color
3. SVG内嵌 <svg> 标签，设置 viewBox，宽高100%
4. 所有样式必须内联（style属性）
5. 标题 <h1/2/3>，正文 <p>，强调 <strong> 或 <em>
6. 单位用 px，禁止 em/rem/vh/vw
7. 颜色用 #十六进制 或 rgb()
8. 动画用 @keyframes 或 <animate> 标签"""

GENERATE_MARKDOWN_PROMPT = """请基于提供的主题生成一篇完整的Markdown格式文章。要求：
1. 严格围绕主题展开，不要添加任何与主题无关的内容
2. 所有内容必须与主题直接相关，不得偏离主题
3. 使用合适的Markdown语法，包括标题、段落、列表、加粗等
4. 内容结构清晰，逻辑连贯，有明确的层次结构
5. 根据主题选择合适的内容深度和专业程度
6. 包含引言、主体内容和总结，但所有部分都必须紧扣主题
7. 使用中文撰写，语言流畅自然、专业准确
8. 直接输出Markdown内容，不要包含任何解释、说明或其他非Markdown内容
9. 如果主题比较具体，请深入挖掘相关内容；如果主题比较宽泛，请选择最相关的角度展开

重要：生成的所有内容必须严格基于主题，严禁添加任何与主题无关的信息、例子或扩展内容。"""

TEXT_TO_MARKDOWN_PROMPT = """Convert the following text to clean, well-formatted markdown with appropriate headings, lists, and emphasis. Only convert the provided text - DO NOT add, extend, or modify the content."""


# Request/Response Models
class AIRequest(BaseModel):
    """Request model for AI assistance"""
    prompt: str
    context: str = ""


class AIResponse(BaseModel):
    """Response model for AI assistance"""
    response: str
    success: bool = True
    message: str = "AI response generated successfully"


class GenerateMarkdownRequest(BaseModel):
    """Request model for AI markdown generation"""
    prompt: str


class GenerateMarkdownResponse(BaseModel):
    """Response model for AI markdown generation"""
    markdown: str
    success: bool = True
    message: str = "Markdown generated successfully"


class TextToMarkdownRequest(BaseModel):
    """Request model for text to markdown conversion"""
    text: str
    style: str = "standard"  # standard, academic, blog, technical
    preserve_formatting: bool = True


class TextToMarkdownResponse(BaseModel):
    """Response model for text to markdown conversion"""
    markdown: str
    success: bool = True
    message: str = "Text converted to markdown successfully"


class FormatMarkdownRequest(BaseModel):
    """Request model for markdown to HTML formatting"""
    markdown: str


class FormatMarkdownResponse(BaseModel):
    """Response model for markdown to HTML formatting"""
    html: str
    success: bool = True
    message: str = "Markdown formatted successfully"


# GLM Client Management
glm_client: Optional[OpenAI] = None


def get_glm_client() -> OpenAI:
    """Initialize GLM client with API key from environment"""
    api_key = os.getenv("GLM_API_KEY")
    if not api_key:
        raise ValueError(
            "GLM_API_KEY environment variable not set. "
            "Please set it before running the application."
        )
    return OpenAI(
        api_key=api_key,
        base_url="https://open.bigmodel.cn/api/paas/v4"
    )


def ensure_glm_client() -> OpenAI:
    """Ensure GLM client is initialized"""
    global glm_client
    if glm_client is None:
        glm_client = get_glm_client()
    return glm_client


# AI Service Functions
def ai_assist(prompt: str, context: str = "") -> str:
    """Generate AI response for content assistance"""
    messages = [
        {"role": "system", "content": WECHAT_SYSTEM_PROMPT},
        {"role": "user", "content": prompt}
    ]
    
    if context:
        # Insert context after system message if provided
        messages.insert(1, {"role": "user", "content": f"Context: {context}"})
    
    client = ensure_glm_client()
    logger.info(f"Calling GLM API with {len(messages)} messages")
    
    response = client.chat.completions.create(
        model="glm-4.5-flash",
        messages=messages,
        temperature=0.6
    )
    
    logger.info(f"GLM API response received")
    
    message = response.choices[0].message
    ai_response = message.content
    
    # Fallback to reasoning_content if content is empty
    if not ai_response and hasattr(message, 'reasoning_content'):
        logger.warning("Content empty, using reasoning_content")
        ai_response = message.reasoning_content
    
    if not ai_response:
        logger.error("AI response is empty!")
        raise ValueError("AI returned empty response")
    
    return ai_response


def generate_markdown(prompt: str) -> str:
    """Generate markdown content using AI based on a topic"""
    messages = [
        {
            "role": "system",
            "content": GENERATE_MARKDOWN_PROMPT
        },
        {
            "role": "user",
            "content": f"主题：{prompt}\n\n请生成一篇关于此主题的完整Markdown文章。"
        }
    ]
    
    client = ensure_glm_client()
    logger.info(f"Generating markdown for prompt: {prompt[:50]}...")
    
    response = client.chat.completions.create(
        model="glm-4.5-flash",
        messages=messages,
        temperature=0.7
    )
    
    message = response.choices[0].message
    markdown_content = message.content
    
    # Fallback to reasoning_content if content is empty
    if not markdown_content and hasattr(message, 'reasoning_content'):
        logger.warning("Content empty, using reasoning_content")
        markdown_content = message.reasoning_content
    
    if not markdown_content:
        logger.error("AI returned empty markdown content")
        raise ValueError("AI returned empty response")
    
    # Clean up the response - remove any markdown code block wrappers if present
    markdown_content = markdown_content.strip()
    if markdown_content.startswith("```markdown"):
        markdown_content = markdown_content.replace("```markdown", "", 1).strip()
    if markdown_content.startswith("```"):
        markdown_content = markdown_content.replace("```", "", 1).strip()
    if markdown_content.endswith("```"):
        markdown_content = markdown_content.rstrip().rsplit("```", 1)[0].strip()
    
    logger.info(f"Successfully generated {len(markdown_content)} characters of markdown")
    return markdown_content


def text_to_markdown(text: str, style: str = "standard", preserve_formatting: bool = True) -> str:
    """Convert plain text to markdown format"""
    style_instructions = {
        "standard": "Convert the following text to clean, well-formatted markdown with appropriate headings, lists, and emphasis. Only convert the provided text - DO NOT add, extend, or modify the content.",
        "academic": "Convert the following text to academic markdown with proper citations, formal headings, and structured formatting. Only convert the provided text - DO NOT add, extend, or modify the content.",
        "blog": "Convert the following text to blog-style markdown with engaging headings, bullet points, and reader-friendly formatting. Only convert the provided text - DO NOT add, extend, or modify the content.",
        "technical": "Convert the following text to technical documentation markdown with code blocks, proper syntax highlighting indicators, and structured sections. Only convert the provided text - DO NOT add, extend, or modify the content."
    }
    
    instruction = style_instructions.get(style, style_instructions["standard"])
    
    if preserve_formatting:
        instruction += " Preserve any existing formatting like line breaks, paragraphs, and structural elements."
    
    messages = [
        {"role": "system", "content": "You are an expert at converting plain text to well-structured markdown format. Always return only the markdown content without explanations."},
        {"role": "user", "content": f"{instruction}\n\nText to convert:\n{text}"}
    ]
    
    client = ensure_glm_client()
    response = client.chat.completions.create(
        model="glm-4.5-flash",
        messages=messages,
        temperature=0.6
    )
    
    message = response.choices[0].message
    markdown_content = message.content.strip()
    
    # Fallback to reasoning_content if content is empty
    if not markdown_content and hasattr(message, 'reasoning_content'):
        logger.warning("Content empty, using reasoning_content")
        markdown_content = message.reasoning_content.strip()
    
    return markdown_content


def format_markdown_to_html(markdown_content: str) -> str:
    """Convert markdown to formatted HTML using AI with comprehensive design prompt"""
    messages = [
        {
            "role": "system",
            "content": """# 微信公众号HTML格式约束提示词
1. 角色 (Role)
你是一位顶级的Web前端工程师，同时也是一位有深厚审美素养的视觉设计师。你的使命不只是编写代码，而是将信息转化为引人入胜的视觉体验。你专精于为微信公众号生态创建高度兼容、视觉精致、体验流畅的HTML内容。你的代码不仅要能完美运行，更要成为一篇艺术品。

2. 核心任务 (Core Task)
根据提供的原始Markdown内容，生成一段完全内联样式 (fully-inline styled) 的HTML代码，用于微信公众号文章排版。最终产物必须是单个 <section> 标签包裹的、自包含的、可直接复制粘贴的代码块。

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

4. 技术规范 (Technical Specifications)
- 主容器: 必须使用 <section> 标签，宽度固定为 677px，居中对齐
- 样式: 所有样式必须内联 (style 属性)，禁止外部 CSS
- 背景: 必须使用 linear-gradient，禁止 background-color
- 单位: 仅使用 px 或百分比，禁止 em/rem/vh/vw
- 颜色: 使用十六进制 (#RRGGBB) 或 rgba()
- SVG: 内嵌 <svg> 标签，设置 viewBox，宽高为 100%
- 图片: display: block; max-width: 100%;

5. 元素样式指南 (Element Styling Guide)
<h1>: 字号 28px+, 字重 600+, 颜色 #111827, 下边距 32px
<h2>: 字号 24px+, 字重 600, 颜色 #1F2937, 下边距 24px
<h3>: 字号 20px, 字重 600, 颜色 #374151, 下边距 16px
<p>: 字号 16px, 颜色 #374151, 行高 1.8-2.0, 下边距 16-24px
<strong>: 使用品牌色或渐变色，不要仅依赖 bold
<blockquote>: 左边框 4-5px, 内边距 16-20px, 背景色 #F3F4F6
<code>: 背景 #F3F4F6, 内边距 4-8px, 字体 monospace
<a>: 颜色 #3B82F6, 无下划线或带下划线

6. 金牌代码模板 (Golden Code Template)
<section style="width: 677px; margin: 0 auto; background: linear-gradient(135deg, #FDFDFE, #FFFFFF); padding: 55px; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', 'PingFang SC', 'Microsoft YaHei', sans-serif;">
  <h1 style="color: #111827; font-size: 28px; font-weight: 600; text-align: center; margin-bottom: 32px;">标题</h1>
  <p style="color: #374151; font-size: 16px; line-height: 1.9; text-align: left; margin-bottom: 24px;">段落内容</p>
</section>

7. 输出前验证清单 (Pre-Output Validation)
在提交前验证:
- [ ] 主容器是 <section> 且宽度为 677px
- [ ] 所有样式都是内联的 (inline style)
- [ ] 没有使用外部 CSS 或 <style> 标签
- [ ] 背景色使用 linear-gradient
- [ ] 所有单位都是 px 或百分比
- [ ] 代码可以直接复制粘贴到微信
- [ ] 在各种设备尺寸上看起来都很好
- [ ] 没有使用禁止的标签或属性
"""
        },
        {
            "role": "user",
            "content": f"请将以下Markdown转换为符合微信公众号要求的美观HTML:\n\n{markdown_content}"
        }
    ]
    
    client = ensure_glm_client()
    logger.info(f"Formatting markdown to HTML, length: {len(markdown_content)}")
    
    response = client.chat.completions.create(
        model="glm-4.5-flash",
        messages=messages,
        temperature=0.6
    )
    
    message = response.choices[0].message
    html_content = message.content
    
    # Fallback to reasoning_content if content is empty
    if not html_content and hasattr(message, 'reasoning_content'):
        logger.warning("Content empty, using reasoning_content")
        html_content = message.reasoning_content
    
    if not html_content:
        logger.error("AI returned empty HTML content")
        raise ValueError("AI returned empty response")
    
    logger.info(f"Successfully formatted {len(html_content)} characters of HTML")
    return html_content
