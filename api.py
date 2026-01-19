#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Markdown to HTML API Server with Theme Support
Built with FastAPI and managed by uv
"""

import os
import logging
import requests
from typing import Dict, Any, Optional
from pydantic import BaseModel

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from bs4 import BeautifulSoup
from openai import OpenAI

# Import from new modules
from renderers.markdown_renderer import MarkdownRenderer
from themes import load_themes, get_default_themes
from services.wechat_service import (
    WeChatTokenRequest,
    WeChatDraftRequest,
    WeChatDirectDraftRequest,
    WeChatError,
    get_access_token,
    send_markdown_to_draft,
    send_content_to_draft,
)

# Initialize FastAPI app
app = FastAPI(
    title="md2any API",
    description="Markdown to HTML API with theme support",
    version="1.0.0",
)

# Serve static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for flexibility
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load themes configuration
THEMES = load_themes()

# Custom styles storage
CUSTOM_STYLES = {}

# Initialize renderer
renderer = MarkdownRenderer()

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
    return OpenAI(api_key=api_key, base_url="https://open.bigmodel.cn/api/paas/v4")


def ensure_glm_client() -> OpenAI:
    """Ensure GLM client is initialized"""
    global glm_client
    if glm_client is None:
        glm_client = get_glm_client()
    return glm_client


def handle_wechat_error(error: WeChatError):
    """Convert WeChatError to HTTPException"""
    status_code = 400 if error.error_code < 500 else 500
    raise HTTPException(status_code=status_code, detail=error.to_dict())


# Additional Request/Response Models needed for endpoints
class MarkdownRequest(BaseModel):
    """Request model for markdown rendering"""

    markdown_text: str
    theme: str = "wechat-default"
    mode: str = "light-mode"  # light-mode, dark-mode
    platform: str = "wechat"  # wechat, xiaohongshu, zhihu, general


class MarkdownResponse(BaseModel):
    """Response model for rendered HTML"""

    html: str
    theme: str
    platform: str
    success: bool = True
    message: str = "Rendered successfully"


class CustomStyleRequest(BaseModel):
    """Request model for custom style operations"""

    style_name: str
    styles: Dict[str, str]


class CustomStyleResponse(BaseModel):
    """Response model for custom style operations"""

    success: bool = True
    message: str = "Operation completed successfully"
    style_name: str = ""


class StyleExtractionRequest(BaseModel):
    """Request model for style extraction"""

    url: str


class StyleExtractionResponse(BaseModel):
    """Response model for style extraction"""

    success: bool
    styles: Dict[str, str] = {}
    error: str = ""


@app.get("/")
async def index():
    """Serve the index.html file from static folder"""
    import os

    try:
        # Read and return the index.html file from static folder
        index_path = os.path.join("static", "index.html")
        if os.path.exists(index_path):
            with open(index_path, "r", encoding="utf-8") as f:
                content = f.read()
            return HTMLResponse(content=content)
        else:
            return HTMLResponse(
                content="<h1>md2any API</h1><p>Index file not found. API is running.</p>"
            )
    except Exception as e:
        return HTMLResponse(content=f"<h1>Error</h1><p>{str(e)}</p>")


@app.get("/api")
async def root():
    """Root endpoint with API information"""
    return {
        "name": "md2any API",
        "version": "1.0.0",
        "description": "Markdown to HTML API with theme support, AI assistance, and WeChat integration",
        "endpoints": {
            "/render": "POST - Render markdown to HTML",
            "/ai/convert-text": "POST - Convert plain text to markdown format",
            "/ai/format-markdown": "POST - Convert markdown to WeChat HTML format",
            "/ai/extract-style": "POST - Extract styles from URL and apply to markdown",
            "/wechat/access_token": "POST - Get WeChat access token",
            "/wechat/send_draft": "POST - Send markdown to WeChat draft",
            "/wechat/draft": "POST - Send content directly to WeChat draft",
            "/themes": "GET - List available themes",
            "/health": "GET - Health check",
        },
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "themes_loaded": len(THEMES)}


@app.get("/themes")
async def get_themes():
    """Get available themes with their modes"""
    theme_list = []

    # Add predefined themes
    for theme_id, theme_config in THEMES.items():
        theme_info = {
            "id": theme_id,
            "name": theme_config.get("name", theme_id),
            "description": theme_config.get("description", ""),
            "modes": theme_config.get("modes", []),
            "type": "predefined",
        }

        # If no modes defined, add default light mode
        if not theme_info["modes"]:
            theme_info["modes"] = [
                {"name": "默认", "id": "light-mode", "background": "#ffffff"}
            ]

        theme_list.append(theme_info)

    # Add custom themes
    for style_name, style_config in CUSTOM_STYLES.items():
        theme_info = {
            "id": style_name,
            "name": style_name,
            "description": "用户自定义样式",
            "modes": [{"name": "默认", "id": "light-mode", "background": "#ffffff"}],
            "type": "custom",
        }
        theme_list.append(theme_info)

    return {"themes": theme_list}


# New AI endpoints
class ConvertTextRequest(BaseModel):
    """Request model for text to markdown conversion"""

    text: str
    style: str = "standard"


class ConvertTextResponse(BaseModel):
    """Response model for text to markdown conversion"""

    markdown: str
    success: bool = True
    message: str = "Text converted successfully"


class FormatMarkdownRequest(BaseModel):
    """Request model for markdown to HTML formatting"""

    markdown: str


class FormatMarkdownResponse(BaseModel):
    """Response model for markdown to HTML formatting"""

    html: str
    success: bool = True
    message: str = "Markdown formatted successfully"


class ExtractStyleRequest(BaseModel):
    """Request model for style extraction from URL"""

    url: str
    markdown: str


class ExtractStyleResponse(BaseModel):
    """Response model for style extraction and application"""

    html: str
    styles: Dict[str, Any]
    success: bool = True
    message: str = "Style extracted and applied successfully"


@app.post("/ai/convert-text", response_model=ConvertTextResponse)
async def convert_text(request: ConvertTextRequest):
    """Convert plain text to markdown format using AI"""
    try:
        client = ensure_glm_client()

        messages = [
            {
                "role": "system",
                "content": """# Role: Markdown Formatting Expert

## Profile
- language: Chinese
- description: A professional assistant skilled in formatting plain text into Markdown format. Focuses on clarity, structure, and highlighting key information without adding any original content.
- background: Extensive experience in content formatting, writing, and technical documentation. Deep understanding of Markdown syntax and its effective use.
- personality: Precise, detail-oriented, and focused on delivering clear and well-structured results.
- expertise: Markdown formatting, text structuring, content presentation.
- target_audience: Users seeking to convert plain text to Markdown format for improved readability and structure.

## Skills

1.  Core Formatting Skills
    -   **Markdown Syntax Application:** Applying appropriate Markdown syntax to format text, including headings, lists, emphasis, links, and code blocks.
    -   **Emphasis Highlighting:** Identifying key phrases or sentences and emphasizing them using bold or italic text within the Markdown format.
    -   **Structured Formatting:** Organizing text into clear sections using headings and subheadings to improve readability.
    -   **List Creation:** Converting unstructured text into ordered or unordered lists for better presentation of items or steps.

2.  Supporting Skills
    -   **Plain Text Analysis:** Analyzing plain text to understand the original meaning and identify the most important elements to highlight.
    -   **Contextual Understanding:** Preserving the original intent of the text while applying Markdown formatting.
    -   **Cross-Platform Compatibility:** Ensuring the generated Markdown is compatible across various platforms and Markdown editors.
    -   **Attention to Detail:** Paying close attention to detail to ensure accurate and consistent application of Markdown syntax.

## Rules

1.  Basic Principles:
    -   **Accuracy:**  The formatted Markdown must accurately reflect the meaning and intent of the original plain text.
    -   **Completeness:**  All information from the plain text must be included in the formatted Markdown document.
    -   **Clarity:** The Markdown formatting should enhance the readability and understanding of the text.
    -   **Originality Preservation:**  Do not add any new content or alter the original text's meaning during the formatting process.

2.  Behavioral Guidelines:
    -   **Focus on Structure:** Prioritize clear and logical organization of the content using headings, subheadings, and lists.
    -   **Highlight Key Information:** Use bold or italic text to draw attention to important keywords, phrases, or sentences.
    -   **Maintain Neutral Tone:** The formatting should be neutral and objective, without imposing any personal opinions or biases.
    -   **Consistency:** Apply Markdown syntax consistently throughout the document for a uniform appearance.

3.  Constraints:
    -   **No Content Addition:** You must not add any new content, examples, or explanations beyond the original plain text.
    -   **No Translation:** If the input is in one language, the output should be in the same language, with Markdown formatting.
    -   **Format-Only Focus:** Your primary responsibility is to format the text using Markdown, not to rewrite or edit the content.
    -   **Adherence to Markdown Standards:**  Strictly adhere to standard Markdown syntax rules to ensure compatibility.

## Workflows

- Goal: Convert plain text into a well-structured Markdown document, highlighting key information without adding any new content.
- Step 1: Analyze the plain text to understand the original meaning, identify key elements, and plan the document's structure.
- Step 2: Apply Markdown syntax to create headings, subheadings, lists, and emphasis (bold/italic) to highlight key information.
- Step 3: Review the formatted Markdown document to ensure accuracy, completeness, and consistency with the original text.
- Expected result: A clean, well-structured Markdown document that accurately reflects the original plain text, with key information effectively highlighted, ready for use on any Markdown platform.

## Initialization
As Markdown Formatting Expert, you must follow the above Rules and execute tasks according to Workflows.""",
            },
            {
                "role": "user",
                "content": f"Convert this text to markdown (style: {request.style}):\n\n{request.text}",
            },
        ]

        response = client.chat.completions.create(
            model="glm-4.5-flash", messages=messages, temperature=0.6
        )

        message = response.choices[0].message
        markdown_content = message.content.strip()

        # Fallback to reasoning_content if content is empty
        if not markdown_content and hasattr(message, "reasoning_content"):
            logger.warning("Content empty, using reasoning_content")
            markdown_content = message.reasoning_content.strip()

        return ConvertTextResponse(markdown=markdown_content)

    except Exception as e:
        logger.error(f"Text conversion error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Conversion error: {str(e)}")


@app.post("/ai/format-markdown", response_model=FormatMarkdownResponse)
async def format_markdown(request: FormatMarkdownRequest):
    """Convert markdown to WeChat HTML format using AI"""
    try:
        client = ensure_glm_client()

        messages = [
            {
                "role": "system",
                "content": """# 微信公众号HTML格式约束提示词
1. 角色 (Role)
你是一位顶级的Web前端工程师，同时也是一位有深厚审美素养的视觉设计师。你的使命不只是编写代码，而是将信息转化为引人入胜的视觉体验。你专精于为微信公众号生态创建高度兼容、视觉精致、体验流畅的HTML内容。你的代码不仅要能完美运行，更要成为一篇艺术品。
2. 核心任务 (Core Task)
根据第8节用户内容输入区提供的原始内容，生成一段完全内联样式 (fully-inline styled) 的HTML代码，用于微信公众号文章排版。最终产物必须是单个 <section> 标签包裹的、自包含的、可直接复制粘贴的代码块。
3. 设计哲学与美学指南 (Design Philosophy & Aesthetics Guide)
这是你的创作灵魂。在动手写代码前，请先在脑海中建立以下设计心智模型：
3.1. 核心原则：呼吸感 (Core Principle: Breathing Room)
提示: “留白不是浪费，而是奢华”。信息需要空间来呼吸。
行动指南:
加大段落间距 (margin-bottom)。
增加标题与正文之间的距离。
在图片、引用块等视觉元素周围留出足够的安全边距。
自问: “读者在快速浏览时，眼睛会感到疲劳吗？信息是否清晰可分？”
3.2. 视觉层次 (Visual Hierarchy)
提示: “一眼就能看出重点”。引导读者的视线，让他们轻松抓住核心信息。
行动指南:
主标题 (<h1>): 必须是页面上最醒目的元素，使用更大的字号和更粗的字重。
副标题 (<h2>, <h3>): 尺寸和颜色要与主标题有明显区分，但比正文更突出。
正文 (<p>): 确保最佳的可读性，颜色通常使用深灰色（如#374151）而非纯黑，以减少视觉刺激。
强调 (<strong>): 使用品牌色或渐变色进行点缀，使其成为视觉焦点。
3.3. 科技与现代感 (Tech & Modern Feel)
提示: “于无声处听惊雷”。通过微妙的细节营造高级感。
行动指南:
色彩: 推荐使用低饱和度的色彩作为主色调，搭配一个明亮、高饱和的品牌色作为点缀。
渐变: 善用非常微妙的背景渐变（如 #FFFFFF到#F8F9FA）或文字渐变，避免过于花哨。
SVG装饰: 使用简洁的、线条感的SVG作为分隔线或装饰图标，能极大提升科技感。
字体: 优先使用系统默认的无衬线字体栈，保证在任何设备上都清晰、现代。
4. 强制性技术约束 (Mandatory Technical Constraints)
这是不可违背的铁律，源于微信编辑器的特殊环境。
4.1. 结构与布局
主容器: 必须 使用单个 <section> 作为最外层容器。绝对禁止 使用 <div> 或 <body> 作为主容器。
宽度与居中: 强烈建议主容器 <section> 设置 width: 677px; 以确保最佳显示效果。同时必须设置 margin: 0 auto; 进行居中。
盒子模型: 必须 添加 box-sizing: border-box;。
布局技术: 优先使用 display: flex;。
定位: 禁止使用 position: fixed/sticky;。
4.2. 样式与颜色
样式内联: 所有CSS样式都必须以内联 style 属性的形式 书写。
背景: 必须使用 background: linear-gradient(...); 语法。
颜色格式: 必须使用十六进制 (#ffffff) 或 rgba(...) 格式。
尺寸单位: 只允许使用 px 和 %。
4.3. 媒体与动画
图片: <img> 标签必须设置 display: block; 和 max-width: 100%;。
SVG: 必须以内联 <svg> 标签的形式嵌入，且包含 viewBox 属性。
5. 工作流程与最佳实践 (Workflow & Best Practices)
构思 (Conceptualize): 阅读并理解所有内容后，先不急于动手。根据第3节的设计哲学，在脑海中构思整体的视觉布局和风格。
搭骨架 (Structure): 构建由 <section> 包裹的基础HTML骨架。
填内容 (Populate): 将文本、图片等填充到语义化的HTML标签中。
精雕琢 (Stylize): 逐一为每个HTML元素添加内联样式。
引导性提问: 在设计时不断问自己：“这里的间距足够吗？”、“这个颜色是否符合整体调性？”、“如何让这个模块更有趣一点？”
总审查 (Verify): 在输出代码前，对照下面的“验证清单”进行最后一次自我检查。
6. 黄金代码模板 (Golden Code Template)
这是一个符合所有规范的、可供参考的最小化模板。
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
7. 输出前验证清单 (Pre-Output Verification Checklist)
在交付最终代码前，请在心中逐一确认以下所有项目：
[ ] 唯一主容器: 代码是否被且仅被一个 <section> 标签包裹？
[ ] 推荐宽度与居中: 主容器是否已设置推荐宽度 (width: 677px;) 和居中样式 (margin: 0 auto;)？
[ ] 背景语法: 所有背景色是否都通过 linear-gradient 实现？
[ ] 完全内联: 是否已移除所有 <style> 标签，且所有样式均在 style 属性中？
[ ] Box Sizing: 是否为需要精确尺寸控制的元素添加了 box-sizing: border-box;？
[ ] 单位正确性: 是否只使用了 px 和 % 作为尺寸单位？
[ ] 图片规范: <img> 标签是否已正确设置样式？
[ ] SVG 规范: 内嵌的 SVG 是否包含 viewBox 属性？
[ ] 无外部依赖: 代码中是否不包含任何外部CSS、JS或字体文件的链接？
[ ] 美学自检: 我是否遵循了第3节的设计哲学？最终成品是否具有“呼吸感”和清晰的“视觉层次”？
只有在100%确认清单所有项目都通过后，才输出你的代码。
8. 用户内容输入区 (User Content Input Area)
↓↓↓ 请将您需要排版的原始文章内容粘贴在此处 ↓↓↓""",
            },
            {
                "role": "user",
                "content": f"Convert this markdown to WeChat HTML:\n\n{request.markdown}",
            },
        ]

        response = client.chat.completions.create(
            model="glm-4.5-flash", messages=messages, temperature=0.6
        )

        message = response.choices[0].message
        html_content = message.content

        # Fallback to reasoning_content if content is empty
        if not html_content and hasattr(message, "reasoning_content"):
            logger.warning("Content empty, using reasoning_content")
            html_content = message.reasoning_content

        if not html_content:
            raise ValueError("AI returned empty response")

        return FormatMarkdownResponse(html=html_content)

    except Exception as e:
        logger.error(f"Markdown formatting error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Formatting error: {str(e)}")


@app.post("/ai/extract-style", response_model=ExtractStyleResponse)
async def extract_and_apply_style(request: ExtractStyleRequest):
    """Extract styles from a URL and apply them to markdown using AI"""
    try:
        # Extract styles from URL
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }

        response = requests.get(request.url, headers=headers, timeout=10)
        response.raise_for_status()

        # Parse HTML to get text content for context
        soup = BeautifulSoup(response.content, "html.parser")
        # Get a representative sample of the content (to avoid token limits)
        content_sample = soup.get_text()[:4000]

        client = ensure_glm_client()

        # Step 1: Extract styles using AI
        extraction_messages = [
            {
                "role": "system",
                "content": """You are a CSS Style Extractor. Analyze the provided web content and extract the visual design system into a JSON object.
                
                Return a JSON object where keys are CSS selectors (or logical names like 'container', 'h1', 'p') and values are inline CSS strings.
                
                Required keys: container, h1, h2, h3, p, code, blockquote, ul, ol, li.
                
                Example output:
                {
                    "container": "max-width: 800px; margin: 0 auto; padding: 20px; font-family: sans-serif;",
                    "h1": "color: #333; font-size: 2em; border-bottom: 1px solid #eee;",
                    "p": "line-height: 1.6; color: #444;"
                }
                """,
            },
            {
                "role": "user",
                "content": f"Extract the visual style from this webpage content:\n\n{content_sample}",
            },
        ]

        extraction_response = client.chat.completions.create(
            model="glm-4.5-flash", messages=extraction_messages, temperature=0.2
        )

        styles_content = extraction_response.choices[0].message.content
        # Simple cleanup to ensure we get JSON
        if "```json" in styles_content:
            styles_content = styles_content.split("```json")[1].split("```")[0].strip()
        elif "```" in styles_content:
            styles_content = styles_content.split("```")[1].split("```")[0].strip()

        import json

        try:
            styles = json.loads(styles_content)
        except json.JSONDecodeError:
            logger.warning("Failed to parse AI style extraction, using empty styles")
            styles = {}

        # Step 2: Apply styles to markdown
        messages = [
            {
                "role": "system",
                "content": "Apply the provided styles to the markdown and convert to HTML. Use inline styles only.",
            },
            {
                "role": "user",
                "content": f"Styles: {json.dumps(styles)}\n\nApply to this markdown:\n\n{request.markdown}",
            },
        ]

        ai_response = client.chat.completions.create(
            model="glm-4.5-flash", messages=messages, temperature=0.6
        )

        message = ai_response.choices[0].message
        html_content = message.content

        # Fallback to reasoning_content if content is empty
        if not html_content and hasattr(message, "reasoning_content"):
            logger.warning("Content empty, using reasoning_content")
            html_content = message.reasoning_content

        if not html_content:
            raise ValueError("AI returned empty response")

        return ExtractStyleResponse(html=html_content, styles=styles)

    except Exception as e:
        logger.error(f"Style extraction error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Style extraction error: {str(e)}")


@app.post("/wechat/access_token")
async def get_wechat_access_token(request: WeChatTokenRequest):
    """Get WeChat access token"""
    try:
        logger.info(f"Getting access token for appid: {request.appid}")
        access_token = get_access_token(request.appid, request.secret)
        logger.info("Successfully obtained access token")
        return {"access_token": access_token, "expires_in": 7200}
    except WeChatError as e:
        handle_wechat_error(e)
    except Exception as e:
        logger.error(f"Exception getting access token: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取access_token失败: {str(e)}")


@app.post("/wechat/send_draft")
async def send_markdown_to_wechat_draft(request: WeChatDraftRequest):
    """Send markdown content to WeChat draft box"""
    try:
        logger.info("Received request to send markdown to WeChat draft")

        result = send_markdown_to_draft(
            appid=request.appid,
            secret=request.secret,
            markdown_content=request.markdown,
            style=request.style,
            renderer=renderer,
            themes=THEMES,
            author=request.author,
            digest=request.digest,
            content_source_url=request.content_source_url,
            thumb_media_id=request.thumb_media_id,
            need_open_comment=request.need_open_comment,
            only_fans_can_comment=request.only_fans_can_comment,
        )

        logger.info("Successfully sent to WeChat draft")
        return result
    except WeChatError as e:
        handle_wechat_error(e)
    except Exception as e:
        logger.error(f"Exception sending to WeChat draft: {str(e)}")
        raise HTTPException(status_code=500, detail=f"发送到微信草稿箱失败: {str(e)}")


@app.post("/wechat/draft")
async def send_to_wechat_draft(request: WeChatDirectDraftRequest):
    """Send content directly to WeChat draft box"""
    try:
        logger.info("Received direct draft request")

        result = send_content_to_draft(
            access_token=request.access_token,
            title=request.title,
            content=request.content,
            author=request.author,
            digest=request.digest,
            content_source_url=request.content_source_url,
            thumb_media_id=request.thumb_media_id,
            need_open_comment=request.need_open_comment,
            only_fans_can_comment=request.only_fans_can_comment,
        )

        logger.info("Successfully sent to WeChat draft")
        return result
    except WeChatError as e:
        handle_wechat_error(e)
    except Exception as e:
        logger.error(f"Exception sending to WeChat draft: {str(e)}")
        raise HTTPException(status_code=500, detail=f"请求微信API失败: {str(e)}")


@app.post("/render", response_model=MarkdownResponse)
async def render_markdown(request: MarkdownRequest):
    """Render markdown to HTML with theme styling"""

    try:
        # Check if theme exists in predefined themes or custom styles
        theme_source = None
        theme_config = None

        if request.theme in THEMES:
            theme_source = "predefined"
            theme_config = THEMES[request.theme]
        elif request.theme in CUSTOM_STYLES:
            theme_source = "custom"
            # Create a temporary theme config for custom styles
            theme_config = {
                "name": request.theme,
                "styles": CUSTOM_STYLES[request.theme],
                "modes": [
                    {"name": "默认", "id": "light-mode", "background": "#ffffff"}
                ],
            }

        if not theme_config:
            # Use fallback theme if requested theme doesn't exist
            available_themes = list(THEMES.keys())
            if available_themes:
                request.theme = available_themes[0]  # Use first available theme
                theme_config = THEMES[request.theme]
                theme_source = "predefined"
            else:
                raise HTTPException(status_code=400, detail="No themes available")

        # Validate mode for the theme
        available_modes = [mode["id"] for mode in theme_config.get("modes", [])]
        if available_modes and request.mode not in available_modes:
            raise HTTPException(
                status_code=400,
                detail=f"Mode '{request.mode}' not available for theme '{request.theme}'. Available modes: {available_modes}",
            )

        # Render markdown
        if theme_source == "custom":
            # For custom styles, use a special renderer
            rendered_html = renderer.render_with_custom_styles(
                request.markdown_text,
                CUSTOM_STYLES[request.theme],
                request.mode,
                request.platform,
            )
        else:
            # Use normal renderer for predefined themes
            rendered_html = renderer.render(
                request.markdown_text, theme_config, request.mode, request.platform
            )

        return MarkdownResponse(
            html=rendered_html,
            theme=request.theme,
            platform=request.platform,
            success=True,
            message="Rendered successfully",
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Rendering error: {str(e)}")


@app.post("/custom-styles", response_model=CustomStyleResponse)
async def save_custom_style(request: CustomStyleRequest):
    """Save a custom style configuration"""
    try:
        CUSTOM_STYLES[request.style_name] = request.styles
        logger.info(f"Saved custom style: {request.style_name}")

        return CustomStyleResponse(
            success=True,
            message=f"自定义样式 '{request.style_name}' 保存成功",
            style_name=request.style_name,
        )
    except Exception as e:
        logger.error(f"Error saving custom style: {str(e)}")
        raise HTTPException(status_code=500, detail=f"保存自定义样式失败: {str(e)}")


@app.get("/custom-styles/{style_name}")
async def get_custom_style(style_name: str):
    """Get a specific custom style configuration"""
    if style_name not in CUSTOM_STYLES:
        raise HTTPException(status_code=404, detail=f"自定义样式 '{style_name}' 不存在")

    return {"style_name": style_name, "styles": CUSTOM_STYLES[style_name]}


@app.get("/custom-styles")
async def list_custom_styles():
    """List all custom style names"""
    return {"custom_styles": list(CUSTOM_STYLES.keys()), "count": len(CUSTOM_STYLES)}


@app.delete("/custom-styles/{style_name}", response_model=CustomStyleResponse)
async def delete_custom_style(style_name: str):
    """Delete a custom style configuration"""
    if style_name not in CUSTOM_STYLES:
        raise HTTPException(status_code=404, detail=f"自定义样式 '{style_name}' 不存在")

    try:
        del CUSTOM_STYLES[style_name]
        logger.info(f"Deleted custom style: {style_name}")

        return CustomStyleResponse(
            success=True,
            message=f"自定义样式 '{style_name}' 删除成功",
            style_name=style_name,
        )
    except Exception as e:
        logger.error(f"Error deleting custom style: {str(e)}")
        raise HTTPException(status_code=500, detail=f"删除自定义样式失败: {str(e)}")


@app.get("/preview/{theme_name}")
async def preview_theme(
    theme_name: str, mode: str = "light-mode", platform: str = "wechat"
):
    """Preview a theme with sample markdown"""

    if theme_name not in THEMES:
        raise HTTPException(status_code=404, detail=f"Theme '{theme_name}' not found")

    # Validate mode for the theme
    theme_config = THEMES[theme_name]
    available_modes = [mode_info["id"] for mode_info in theme_config.get("modes", [])]
    if available_modes and mode not in available_modes:
        raise HTTPException(
            status_code=400,
            detail=f"Mode '{mode}' not available for theme '{theme_name}'. Available modes: {available_modes}",
        )

    sample_markdown = """# 示例文档

这是一个**示例文档**，用来展示主题效果。

## 二级标题

这里是一些普通文本，包含*斜体*和**粗体**文字。

### 三级标题

更多内容展示不同层级的标题效果。

### 代码示例

```python
def hello_world():
    print("Hello, World!")
    return True

# 这是注释
class ExampleClass:
    def __init__(self, name):
        self.name = name
```

### 引用块

> 这是一个引用块示例
> 可以包含多行内容
> 展示引用的视觉效果

### 列表

**无序列表：**
- 列表项目 1
- 列表项目 2
  - 子项目 A
  - 子项目 B

**有序列表：**
1. 第一项
2. 第二项
3. 第三项

### 表格

| 功能 | 支持 | 备注 |
|------|------|------|
| 主题切换 | ✅ | 多种样式 |
| 代码高亮 | ✅ | 语法着色 |
| 图片支持 | ✅ | 自动布局 |
| 深色模式 | ✅ | 护眼体验 |

### 强调文本

这里有**粗体文字**和*斜体文字*，以及`行内代码`。

### 链接

访问 [md2any项目](https://github.com/lifuyi/md2any) 了解更多信息。

---

### 分隔线

上面是一条分隔线，用于分割不同的内容区域。
"""

    rendered_html = renderer.render(sample_markdown, theme_name, mode, platform)

    return HTMLResponse(content=rendered_html)


def check_uv():
    """Check if uv is installed"""
    try:
        import subprocess

        subprocess.run(["uv", "--version"], check=True, capture_output=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False


def install_dependencies():
    """Install dependencies using uv"""
    import subprocess

    print("Installing dependencies with uv...")
    subprocess.run(["uv", "sync"], check=True)


def run_server():
    """Run the API server"""
    import subprocess

    print("Starting API server...")
    subprocess.run(
        [
            "uv",
            "run",
            "uvicorn",
            "api:app",
            "--host",
            "0.0.0.0",
            "--port",
            "5005",
            "--reload",
        ],
        check=True,
    )


def main():
    """Main entry point for running the server"""
    import uvicorn
    import sys
    from pathlib import Path

    # Check if we should use the development runner
    use_runner = "--runner" in sys.argv

    if use_runner:
        # Use the development runner from run_api.py
        if not check_uv():
            print("Error: uv is not installed. Please install uv first:")
            print("curl -LsSf https://astral.sh/uv/install.sh | sh")
            sys.exit(1)

        # Check if pyproject.toml exists
        if not Path("pyproject.toml").exists():
            print("Error: pyproject.toml not found")
            sys.exit(1)

        try:
            install_dependencies()
            run_server()
        except KeyboardInterrupt:
            print("\nServer stopped by user")
            sys.exit(0)
        except subprocess.CalledProcessError as e:
            print(f"Error running command: {e}")
            sys.exit(1)
    else:
        # Direct uvicorn execution
        uvicorn.run("api:app", host="0.0.0.0", port=5005, reload=True, log_level="info")


if __name__ == "__main__":
    main()
