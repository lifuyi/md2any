#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Markdown to HTML API Server with Theme Support
Built with FastAPI and managed by uv
"""

import os
import logging
import requests
from typing import Dict, Any
from pydantic import BaseModel

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from bs4 import BeautifulSoup

# Import from new modules
from renderers.markdown_renderer import MarkdownRenderer
from themes import load_themes, get_default_themes
from utils.markdown_utils import extract_title_from_markdown, preprocess_markdown
from services.ai_service import (
    AIRequest, AIResponse,
    GenerateMarkdownRequest, GenerateMarkdownResponse,
    TextToMarkdownRequest, TextToMarkdownResponse,
    FormatMarkdownRequest, FormatMarkdownResponse,
    ai_assist, generate_markdown, text_to_markdown, format_markdown_to_html,
    ensure_glm_client,
    GENERATE_MARKDOWN_PROMPT
)
from services.wechat_service import (
    WeChatTokenRequest,
    WeChatDraftRequest,
    WeChatDirectDraftRequest,
    WeChatError,
    get_access_token,
    send_markdown_to_draft,
    send_content_to_draft
)

# Initialize FastAPI app
app = FastAPI(
    title="md2any API",
    description="Markdown to HTML API with theme support",
    version="1.0.0"
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
        index_path = os.path.join('static', 'index.html')
        if os.path.exists(index_path):
            with open(index_path, 'r', encoding='utf-8') as f:
                content = f.read()
            return HTMLResponse(content=content)
        else:
            return HTMLResponse(content="<h1>md2any API</h1><p>Index file not found. API is running.</p>")
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
            "/ai": "POST - AI assistance for markdown writing",
            "/ai/generate-markdown": "POST - Generate markdown content using AI based on a topic",
            "/ai/format-markdown": "POST - Convert markdown to formatted HTML using AI",
            "/text-to-markdown": "POST - Convert plain text to markdown format",
            "/wechat/access_token": "POST - Get WeChat access token",
            "/wechat/send_draft": "POST - Send markdown to WeChat draft",
            "/wechat/draft": "POST - Send content directly to WeChat draft",
            "/themes": "GET - List available themes",
            "/health": "GET - Health check"
        }
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
            "type": "predefined"
        }
        
        # If no modes defined, add default light mode
        if not theme_info["modes"]:
            theme_info["modes"] = [{
                "name": "默认",
                "id": "light-mode",
                "background": "#ffffff"
            }]
        
        theme_list.append(theme_info)
    
    # Add custom themes
    for style_name, style_config in CUSTOM_STYLES.items():
        theme_info = {
            "id": style_name,
            "name": style_name,
            "description": "用户自定义样式",
            "modes": [{
                "name": "默认",
                "id": "light-mode",
                "background": "#ffffff"
            }],
            "type": "custom"
        }
        theme_list.append(theme_info)
    
    return {"themes": theme_list}


@app.post("/ai", response_model=AIResponse)
async def ai_endpoint(request: AIRequest):
    """AI assistance endpoint using GLM"""
    try:
        response_text = ai_assist(request.prompt, request.context)
        return AIResponse(
            response=response_text,
            success=True,
            message="AI response generated successfully"
        )
    except Exception as e:
        logger.error(f"AI service error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"AI service error: {str(e)}"
        )


@app.post("/ai/generate-markdown", response_model=GenerateMarkdownResponse)
async def generate_markdown_endpoint(request: GenerateMarkdownRequest):
    """Generate markdown content using AI based on a topic"""
    try:
        markdown_content = generate_markdown(request.prompt)
        return GenerateMarkdownResponse(
            markdown=markdown_content,
            success=True,
            message="Markdown generated successfully"
        )
    except Exception as e:
        logger.error(f"Markdown generation error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Markdown generation error: {str(e)}"
        )


@app.post("/text-to-markdown", response_model=TextToMarkdownResponse)
async def text_to_markdown(request: TextToMarkdownRequest):
    """Convert plain text to markdown format using GLM"""
    try:
        # Prepare the conversion prompt based on style
        style_instructions = {
            "standard": "Convert the following text to clean, well-formatted markdown with appropriate headings, lists, and emphasis. Only convert the provided text - DO NOT add, extend, or modify the content.",
            "academic": "Convert the following text to academic markdown with proper citations, formal headings, and structured formatting. Only convert the provided text - DO NOT add, extend, or modify the content.",
            "blog": "Convert the following text to blog-style markdown with engaging headings, bullet points, and reader-friendly formatting. Only convert the provided text - DO NOT add, extend, or modify the content.",
            "technical": "Convert the following text to technical documentation markdown with code blocks, proper syntax highlighting indicators, and structured sections. Only convert the provided text - DO NOT add, extend, or modify the content."
        }
        
        instruction = style_instructions.get(request.style, style_instructions["standard"])
        
        # Add formatting preservation instruction if needed
        if request.preserve_formatting:
            instruction += " Preserve any existing formatting like line breaks, paragraphs, and structural elements."
        
        # Prepare messages for GLM API
        messages = [
            {"role": "system", "content": "You are an expert at converting plain text to well-structured markdown format. Always return only the markdown content without explanations."},
            {"role": "user", "content": f"{instruction}\n\nText to convert:\n{request.text}"}
        ]
        
        # Call GLM API
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
        
        return TextToMarkdownResponse(
            markdown=markdown_content,
            success=True,
            message="Text converted to markdown successfully"
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Text to markdown conversion error: {str(e)}"
        )


class FormatMarkdownRequest(BaseModel):
    """Request model for markdown to HTML formatting"""
    markdown: str


class FormatMarkdownResponse(BaseModel):
    """Response model for markdown to HTML formatting"""
    html: str
    success: bool = True
    message: str = "Markdown formatted successfully"


@app.post("/ai/format-markdown", response_model=FormatMarkdownResponse)
async def format_markdown(request: FormatMarkdownRequest):
    """Convert markdown to formatted HTML using AI"""
    try:
        # Prepare messages for GLM API with concise system prompt
        messages = [
            {
                "role": "system",
                "content": "Convert markdown to WeChat HTML format. Use inline styles, section container, width 677px, margin auto, box-sizing border-box, flex layout. All styles inline. Background linear-gradient. Colors in hex or rgba. Units in px or %. Images: display block, max-width 100%. SVG with viewBox."
            },
            {
                "role": "user",
                "content": f"Convert this markdown to WeChat HTML format:\n\n{request.markdown}"
            }
        ]
        
        # Call GLM API
        client = ensure_glm_client()
        logger.info(f"Formatting markdown to HTML, length: {len(request.markdown)}")
        
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
        
        return FormatMarkdownResponse(
            html=html_content,
            success=True,
            message="Markdown formatted successfully"
        )
    
    except Exception as e:
        logger.error(f"Error formatting markdown: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to format markdown: {str(e)}"
        )


@app.post("/wechat/access_token")
async def get_wechat_access_token(request: WeChatTokenRequest):
    """Get WeChat access token"""
    try:
        logger.info(f"Getting access token for appid: {request.appid}")
        
        # Construct WeChat API request
        url = f'https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid={request.appid}&secret={request.secret}'
        
        response = requests.get(url, timeout=10)
        result = response.json()
        
        # Check if WeChat API returned an error
        if 'errcode' in result and result['errcode'] != 0:
            logger.error(f"WeChat API error: {result}")
            raise HTTPException(
                status_code=400,
                detail=result
            )
        
        logger.info("Successfully obtained access token")
        return result
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Exception getting access token: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"获取access_token失败: {str(e)}"
        )


@app.post("/wechat/send_draft")
async def send_markdown_to_wechat_draft(request: WeChatDraftRequest):
    """Send markdown content to WeChat draft box"""
    try:
        logger.info("Received request to send markdown to WeChat draft")
        
        # 1. Get access token
        token_url = f'https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid={request.appid}&secret={request.secret}'
        
        token_response = requests.get(token_url, timeout=10)
        token_result = token_response.json()
        
        if 'errcode' in token_result and token_result['errcode'] != 0:
            logger.error(f"Failed to get access token: {token_result}")
            # Add more descriptive error messages for common errors
            error_msg = token_result.get('errmsg', 'Unknown error')
            if token_result['errcode'] == 40013:
                error_msg = "无效的AppID，请检查微信公众号AppID是否正确"
            elif token_result['errcode'] == 40001:
                error_msg = "AppSecret错误，请检查微信公众号AppSecret是否正确"
            elif token_result['errcode'] == 40002:
                error_msg = "请检查公众号权限，确保已开通草稿箱功能"
            elif token_result['errcode'] == 40164:
                error_msg = "IP地址未在白名单中，请在微信公众号后台添加IP: 101.246.231.55"
            
            raise HTTPException(
                status_code=400,
                detail={
                    "errcode": token_result['errcode'],
                    "errmsg": error_msg,
                    "original": token_result
                }
            )
        
        access_token = token_result['access_token']
        logger.info("Successfully obtained access token")
        
        # 2. Extract title
        title = extract_title_from_markdown(request.markdown)
        logger.info(f"Extracted title: {title}")
        
        # 3. Render markdown to HTML
        logger.info("Rendering markdown to HTML")
        processed_content = preprocess_markdown(request.markdown)
        
        # Convert markdown to HTML
        html_content = markdown.markdown(
            processed_content,
            extensions=[
                'fenced_code',
                'tables',
                'nl2br'
            ]
        )
        
        # Apply theme styling
        theme_name = request.style
        if theme_name.endswith('.css'):
            theme_name = theme_name.replace('.css', '')
        
        styled_html = renderer.render(
            processed_content,
            theme_name,
            "light-mode",
            "wechat"
        )
        
        
        
        # Wrap in markdown-body div for WeChat compatibility
        final_html = f'<div class="markdown-body">{styled_html}</div>'
        
        # 4. Send to WeChat draft
        logger.info("Sending to WeChat draft")
        draft_url = f'https://api.weixin.qq.com/cgi-bin/draft/add?access_token={access_token}'
        
        # Handle Unicode encoding
        encoded_title = title.encode('utf-8').decode('latin-1')
        encoded_content = final_html.encode('utf-8').decode('latin-1')
        
        article = {
            'title': encoded_title,
            'author': request.author,
            'digest': request.digest,
            'content': encoded_content,
            'content_source_url': request.content_source_url,
            'need_open_comment': request.need_open_comment,
            'only_fans_can_comment': request.only_fans_can_comment
        }
        
        # Add thumb_media_id if provided
        if request.thumb_media_id and request.thumb_media_id.strip():
            article['thumb_media_id'] = request.thumb_media_id
        
        articles = {'articles': [article]}
        
        draft_response = requests.post(draft_url, json=articles, timeout=10)
        result = draft_response.json()
        
        if 'errcode' in result and result['errcode'] != 0:
            logger.error(f"WeChat API error: {result}")
            raise HTTPException(
                status_code=400,
                detail=result
            )
        
        logger.info("Successfully sent to WeChat draft")
        return result
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Exception sending to WeChat draft: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"发送到微信草稿箱失败: {str(e)}"
        )


@app.post("/wechat/draft")
async def send_to_wechat_draft(request: WeChatDirectDraftRequest):
    """Send content directly to WeChat draft box"""
    try:
        logger.info("Received direct draft request")
        
        if not request.access_token:
            raise HTTPException(
                status_code=400,
                detail="缺少access_token"
            )
        
        if not request.content:
            raise HTTPException(
                status_code=400,
                detail="缺少内容"
            )
        
        # Construct WeChat API request
        url = f'https://api.weixin.qq.com/cgi-bin/draft/add?access_token={request.access_token}'
        
        # Construct article content
        article = {
            'title': request.title,
            'author': request.author,
            'digest': request.digest,
            'content': request.content,
            'content_source_url': request.content_source_url,
            'need_open_comment': request.need_open_comment,
            'only_fans_can_comment': request.only_fans_can_comment
        }
        
        # Add thumb_media_id if provided
        if request.thumb_media_id and request.thumb_media_id.strip():
            article['thumb_media_id'] = request.thumb_media_id
        
        articles = {'articles': [article]}
        
        logger.info(f"Sending article to WeChat: {articles}")
        
        response = requests.post(url, json=articles, timeout=10)
        result = response.json()
        
        if 'errcode' in result and result['errcode'] != 0:
            logger.error(f"WeChat API error: {result}")
            raise HTTPException(
                status_code=400,
                detail=result
            )
        
        logger.info("Successfully sent to WeChat draft")
        return result
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Exception sending to WeChat draft: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"请求微信API失败: {str(e)}"
        )


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
                "modes": [{
                    "name": "默认",
                    "id": "light-mode",
                    "background": "#ffffff"
                }]
            }
        
        if not theme_config:
            # Use fallback theme if requested theme doesn't exist
            available_themes = list(THEMES.keys())
            if available_themes:
                request.theme = available_themes[0]  # Use first available theme
                theme_config = THEMES[request.theme]
                theme_source = "predefined"
            else:
                raise HTTPException(
                    status_code=400,
                    detail="No themes available"
                )
        
        # Validate mode for the theme
        available_modes = [mode["id"] for mode in theme_config.get("modes", [])]
        if available_modes and request.mode not in available_modes:
            raise HTTPException(
                status_code=400,
                detail=f"Mode '{request.mode}' not available for theme '{request.theme}'. Available modes: {available_modes}"
            )
        
        # Render markdown
        if theme_source == "custom":
            # For custom styles, use a special renderer
            rendered_html = renderer.render_with_custom_styles(
                request.markdown_text,
                CUSTOM_STYLES[request.theme],
                request.mode,
                request.platform
            )
        else:
            # Use normal renderer for predefined themes
            rendered_html = renderer.render(
                request.markdown_text,
                theme_config,
                request.mode,
                request.platform
            )
        
        return MarkdownResponse(
            html=rendered_html,
            theme=request.theme,
            platform=request.platform,
            success=True,
            message="Rendered successfully"
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Rendering error: {str(e)}"
        )


@app.post("/custom-styles", response_model=CustomStyleResponse)
async def save_custom_style(request: CustomStyleRequest):
    """Save a custom style configuration"""
    try:
        CUSTOM_STYLES[request.style_name] = request.styles
        logger.info(f"Saved custom style: {request.style_name}")
        
        return CustomStyleResponse(
            success=True,
            message=f"自定义样式 '{request.style_name}' 保存成功",
            style_name=request.style_name
        )
    except Exception as e:
        logger.error(f"Error saving custom style: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"保存自定义样式失败: {str(e)}"
        )


@app.get("/custom-styles/{style_name}")
async def get_custom_style(style_name: str):
    """Get a specific custom style configuration"""
    if style_name not in CUSTOM_STYLES:
        raise HTTPException(
            status_code=404,
            detail=f"自定义样式 '{style_name}' 不存在"
        )
    
    return {
        "style_name": style_name,
        "styles": CUSTOM_STYLES[style_name]
    }


@app.get("/custom-styles")
async def list_custom_styles():
    """List all custom style names"""
    return {
        "custom_styles": list(CUSTOM_STYLES.keys()),
        "count": len(CUSTOM_STYLES)
    }


@app.delete("/custom-styles/{style_name}", response_model=CustomStyleResponse)
async def delete_custom_style(style_name: str):
    """Delete a custom style configuration"""
    if style_name not in CUSTOM_STYLES:
        raise HTTPException(
            status_code=404,
            detail=f"自定义样式 '{style_name}' 不存在"
        )
    
    try:
        del CUSTOM_STYLES[style_name]
        logger.info(f"Deleted custom style: {style_name}")
        
        return CustomStyleResponse(
            success=True,
            message=f"自定义样式 '{style_name}' 删除成功",
            style_name=style_name
        )
    except Exception as e:
        logger.error(f"Error deleting custom style: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"删除自定义样式失败: {str(e)}"
        )


@app.get("/preview/{theme_name}")
async def preview_theme(theme_name: str, mode: str = "light-mode", platform: str = "wechat"):
    """Preview a theme with sample markdown"""
    
    if theme_name not in THEMES:
        raise HTTPException(
            status_code=404,
            detail=f"Theme '{theme_name}' not found"
        )
    
    # Validate mode for the theme
    theme_config = THEMES[theme_name]
    available_modes = [mode_info["id"] for mode_info in theme_config.get("modes", [])]
    if available_modes and mode not in available_modes:
        raise HTTPException(
            status_code=400,
            detail=f"Mode '{mode}' not available for theme '{theme_name}'. Available modes: {available_modes}"
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


class StyleExtractionRequest(BaseModel):
    """Request model for style extraction"""
    url: str


class StyleExtractionResponse(BaseModel):
    """Response model for style extraction"""
    success: bool
    styles: Dict[str, str] = {}
    error: str = ""


@app.post("/api/extract-style", response_model=StyleExtractionResponse)
async def extract_style_from_url(request: StyleExtractionRequest):
    """Extract CSS styles from a given URL"""
    
    try:
        # Fetch the webpage content
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        response = requests.get(request.url, headers=headers, timeout=10)
        response.raise_for_status()
        
        # Parse the HTML
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Extract CSS styles
        styles = {}
        
        # Extract inline styles and common CSS classes
        styles['container'] = extract_container_styles(soup)
        styles['h1'] = extract_heading_styles(soup, 'h1')
        styles['h2'] = extract_heading_styles(soup, 'h2')
        styles['h3'] = extract_heading_styles(soup, 'h3')
        styles['h4'] = extract_heading_styles(soup, 'h4')
        styles['h5'] = extract_heading_styles(soup, 'h5')
        styles['h6'] = extract_heading_styles(soup, 'h6')
        styles['p'] = extract_paragraph_styles(soup)
        styles['strong'] = extract_strong_styles(soup)
        styles['em'] = extract_em_styles(soup)
        styles['code'] = extract_code_styles(soup)
        styles['pre'] = extract_pre_styles(soup)
        styles['blockquote'] = extract_blockquote_styles(soup)
        styles['ul'] = extract_list_styles(soup, 'ul')
        styles['ol'] = extract_list_styles(soup, 'ol')
        styles['li'] = extract_li_styles(soup)
        styles['table'] = extract_table_styles(soup)
        styles['thead'] = extract_thead_styles(soup)
        styles['tbody'] = extract_tbody_styles(soup)
        styles['tr'] = extract_tr_styles(soup)
        styles['innercontainer'] = extract_inner_container_styles(soup)
        
        return StyleExtractionResponse(
            success=True,
            styles=styles
        )
        
    except requests.RequestException as e:
        return StyleExtractionResponse(
            success=False,
            error=f"Failed to fetch URL: {str(e)}"
        )
    except Exception as e:
        return StyleExtractionResponse(
            success=False,
            error=f"Error extracting styles: {str(e)}"
        )


def extract_container_styles(soup):
    """Extract container styles"""
    # Look for common container patterns
    container_selectors = ['.container', '.content', '.main', '#content', '#main', 'body']
    styles = []
    
    for selector in container_selectors:
        elements = soup.select(selector)
        if elements:
            element = elements[0]
            if element.get('style'):
                styles.append(element.get('style'))
            # Also try to get computed classes
            if element.get('class'):
                styles.append(f".{'.'.join(element.get('class'))}")
    
    return ' | '.join(styles) if styles else "max-width: 800px; margin: 0 auto; padding: 20px;"


def extract_heading_styles(soup, tag):
    """Extract heading styles for h1-h6"""
    elements = soup.find_all(tag)
    if not elements:
        return ""
    
    styles = []
    for element in elements[:3]:  # Take first 3 elements
        if element.get('style'):
            styles.append(element.get('style'))
        if element.get('class'):
            styles.append(f".{'.'.join(element.get('class'))}")
    
    # Default styles based on tag
    defaults = {
        'h1': 'font-size: 2em; font-weight: bold; margin: 0.67em 0;',
        'h2': 'font-size: 1.5em; font-weight: bold; margin: 0.75em 0;',
        'h3': 'font-size: 1.17em; font-weight: bold; margin: 0.83em 0;',
        'h4': 'font-size: 1em; font-weight: bold; margin: 1.12em 0;',
        'h5': 'font-size: 0.83em; font-weight: bold; margin: 1.5em 0;',
        'h6': 'font-size: 0.75em; font-weight: bold; margin: 1.67em 0;'
    }
    
    return ' | '.join(styles) if styles else defaults.get(tag, '')


def extract_paragraph_styles(soup):
    """Extract paragraph styles"""
    elements = soup.find_all('p')
    if not elements:
        return ""
    
    styles = []
    for element in elements[:5]:  # Take first 5 paragraphs
        if element.get('style'):
            styles.append(element.get('style'))
        if element.get('class'):
            styles.append(f".{'.'.join(element.get('class'))}")
    
    return ' | '.join(styles) if styles else "margin: 1em 0; line-height: 1.6;"


def extract_strong_styles(soup):
    """Extract strong/bold styles"""
    elements = soup.find_all(['strong', 'b'])
    if not elements:
        return ""
    
    styles = []
    for element in elements[:3]:
        if element.get('style'):
            styles.append(element.get('style'))
        if element.get('class'):
            styles.append(f".{'.'.join(element.get('class'))}")
    
    return ' | '.join(styles) if styles else "font-weight: bold;"


def extract_em_styles(soup):
    """Extract em/italic styles"""
    elements = soup.find_all(['em', 'i'])
    if not elements:
        return ""
    
    styles = []
    for element in elements[:3]:
        if element.get('style'):
            styles.append(element.get('style'))
        if element.get('class'):
            styles.append(f".{'.'.join(element.get('class'))}")
    
    return ' | '.join(styles) if styles else "font-style: italic;"


def extract_code_styles(soup):
    """Extract code styles"""
    elements = soup.find_all('code')
    if not elements:
        return ""
    
    styles = []
    for element in elements[:3]:
        if element.get('style'):
            styles.append(element.get('style'))
        if element.get('class'):
            styles.append(f".{'.'.join(element.get('class'))}")
    
    return ' | '.join(styles) if styles else "background-color: #f4f4f4; padding: 2px 4px; border-radius: 3px; font-family: monospace;"


def extract_pre_styles(soup):
    """Extract preformatted text styles"""
    elements = soup.find_all('pre')
    if not elements:
        return ""
    
    styles = []
    for element in elements[:2]:
        if element.get('style'):
            styles.append(element.get('style'))
        if element.get('class'):
            styles.append(f".{'.'.join(element.get('class'))}")
    
    return ' | '.join(styles) if styles else "background-color: #f4f4f4; padding: 10px; border-radius: 5px; overflow-x: auto; font-family: monospace;"


def extract_blockquote_styles(soup):
    """Extract blockquote styles"""
    elements = soup.find_all('blockquote')
    if not elements:
        return ""
    
    styles = []
    for element in elements[:2]:
        if element.get('style'):
            styles.append(element.get('style'))
        if element.get('class'):
            styles.append(f".{'.'.join(element.get('class'))}")
    
    return ' | '.join(styles) if styles else "border-left: 4px solid #ddd; margin: 1em 0; padding-left: 1em; color: #666;"


def extract_list_styles(soup, list_type):
    """Extract list styles (ul/ol)"""
    elements = soup.find_all(list_type)
    if not elements:
        return ""
    
    styles = []
    for element in elements[:2]:
        if element.get('style'):
            styles.append(element.get('style'))
        if element.get('class'):
            styles.append(f".{'.'.join(element.get('class'))}")
    
    return ' | '.join(styles) if styles else "margin: 1em 0; padding-left: 2em;"


def extract_li_styles(soup):
    """Extract list item styles"""
    elements = soup.find_all('li')
    if not elements:
        return ""
    
    styles = []
    for element in elements[:3]:
        if element.get('style'):
            styles.append(element.get('style'))
        if element.get('class'):
            styles.append(f".{'.'.join(element.get('class'))}")
    
    return ' | '.join(styles) if styles else "margin: 0.5em 0;"


def extract_table_styles(soup):
    """Extract table styles"""
    elements = soup.find_all('table')
    if not elements:
        return ""
    
    styles = []
    for element in elements[:2]:
        if element.get('style'):
            styles.append(element.get('style'))
        if element.get('class'):
            styles.append(f".{'.'.join(element.get('class'))}")
    
    return ' | '.join(styles) if styles else "border-collapse: collapse; width: 100%; margin: 1em 0;"


def extract_thead_styles(soup):
    """Extract table header styles"""
    elements = soup.find_all('thead')
    if not elements:
        return ""
    
    styles = []
    for element in elements[:2]:
        if element.get('style'):
            styles.append(element.get('style'))
        if element.get('class'):
            styles.append(f".{'.'.join(element.get('class'))}")
    
    return ' | '.join(styles) if styles else "background-color: #f2f2f2;"


def extract_tbody_styles(soup):
    """Extract table body styles"""
    elements = soup.find_all('tbody')
    if not elements:
        return ""
    
    styles = []
    for element in elements[:2]:
        if element.get('style'):
            styles.append(element.get('style'))
        if element.get('class'):
            styles.append(f".{'.'.join(element.get('class'))}")
    
    return ' | '.join(styles) if styles else ""


def extract_tr_styles(soup):
    """Extract table row styles"""
    elements = soup.find_all('tr')
    if not elements:
        return ""
    
    styles = []
    for element in elements[:3]:
        if element.get('style'):
            styles.append(element.get('style'))
        if element.get('class'):
            styles.append(f".{'.'.join(element.get('class'))}")
    
    return ' | '.join(styles) if styles else "border-bottom: 1px solid #ddd;"


def extract_inner_container_styles(soup):
    """Extract inner container styles"""
    # Look for common inner container patterns
    container_selectors = ['.article', '.post', '.entry', '.content-inner']
    styles = []
    
    for selector in container_selectors:
        elements = soup.select(selector)
        if elements:
            element = elements[0]
            if element.get('style'):
                styles.append(element.get('style'))
            if element.get('class'):
                styles.append(f".{'.'.join(element.get('class'))}")
    
    return ' | '.join(styles) if styles else "padding: 20px;"


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
    subprocess.run(["uv", "run", "uvicorn", "api:app", "--host", "0.0.0.0", "--port", "5005", "--reload"], check=True)

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
        uvicorn.run(
            "api:app",
            host="0.0.0.0",
            port=5005,
            reload=True,
            log_level="info"
        )


if __name__ == "__main__":
    main()