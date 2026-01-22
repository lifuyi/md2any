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
from prompts import (
    get_text_to_markdown_prompt,
    get_wechat_html_formatting_prompt,
    get_css_style_extraction_prompt,
)

# Initialize FastAPI app
app = FastAPI(
    title="md2any API",
    description="Markdown to HTML API with theme support",
    version="1.0.0",
)

# Add CORS middleware (must be added before static file mounting)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for flexibility
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files
app.mount("/static", StaticFiles(directory="static"), name="static")

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


# NVIDIA Client Management
nvidia_client: Optional[OpenAI] = None


def get_nvidia_client() -> OpenAI:
    """Initialize NVIDIA client with API key from environment"""
    api_key = os.getenv("NVIDIA_API_KEY")
    if not api_key:
        raise ValueError(
            "NVIDIA_API_KEY environment variable not set. "
            "Please set it before running the application."
        )
    return OpenAI(api_key=api_key, base_url="https://integrate.api.nvidia.com/v1")


def ensure_nvidia_client() -> OpenAI:
    """Ensure NVIDIA client is initialized"""
    global nvidia_client
    if nvidia_client is None:
        nvidia_client = get_nvidia_client()
    return nvidia_client


def get_ai_client() -> OpenAI:
    """Get the configured AI client based on AI_PROVIDER setting"""
    provider = os.getenv("AI_PROVIDER", "glm").lower()
    if provider == "nvidia":
        return ensure_nvidia_client()
    elif provider == "glm":
        return ensure_glm_client()
    else:
        # Default to GLM if unknown provider
        logger.warning(f"Unknown AI provider '{provider}', defaulting to GLM")
        return ensure_glm_client()


def get_ai_model(task_type: str = "general") -> str:
    """Get the appropriate AI model based on provider and task type"""
    provider = os.getenv("AI_PROVIDER", "glm").lower()

    if provider == "nvidia":
        # NVIDIA uses DeepSeek models
        if task_type == "formatting":
            return "deepseek-ai/deepseek-v3.1"
        else:
            return "deepseek-ai/deepseek-v3.1"
    elif provider == "glm":
        # GLM uses glm-4.5-flash for most tasks
        return "glm-4.5-flash"
    else:
        # Default fallback
        return "glm-4.5-flash"


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
        client = get_ai_client()

        messages = [
            {
                "role": "system",
                "content": get_text_to_markdown_prompt(),
            },
            {
                "role": "user",
                "content": f"Convert this text to markdown (style: {request.style}):\n\n{request.text}",
            },
        ]

        response = client.chat.completions.create(
            model=get_ai_model("general"), messages=messages, temperature=0.6
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
        client = get_ai_client()

        messages = [
            {
                "role": "system",
                "content": get_wechat_html_formatting_prompt(),
            },
            {
                "role": "user",
                "content": f"Convert this markdown to WeChat HTML:\n\n{request.markdown}",
            },
        ]

        response = client.chat.completions.create(
            model=get_ai_model("formatting"), messages=messages, temperature=0.6
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

        client = get_ai_client()

        # Step 1: Extract styles using AI
        extraction_messages = [
            {
                "role": "system",
                "content": get_css_style_extraction_prompt(),
            },
            {
                "role": "user",
                "content": f"Extract the visual style from this webpage content:\n\n{content_sample}",
            },
        ]

        extraction_response = client.chat.completions.create(
            model=get_ai_model("general"), messages=extraction_messages, temperature=0.2
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
            model=get_ai_model("formatting"), messages=messages, temperature=0.6
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
