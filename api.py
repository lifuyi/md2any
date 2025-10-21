#!/usr/bin/env python3
"""
Markdown to HTML API Server with Theme Support
Built with FastAPI and managed by uv
"""

import re
import os
import requests
import logging
from typing import Dict, Any
from pathlib import Path

import markdown
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from pygments.lexers import get_lexer_by_name
from pygments.formatters import HtmlFormatter
from pygments.util import ClassNotFound
from bs4 import BeautifulSoup
from openai import OpenAI


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


class AIRequest(BaseModel):
    """Request model for AI assistance"""
    prompt: str
    context: str = ""


class AIResponse(BaseModel):
    """Response model for AI assistance"""
    response: str
    success: bool = True
    message: str = "AI response generated successfully"


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


class WeChatTokenRequest(BaseModel):
    """Request model for WeChat access token"""
    appid: str
    secret: str


class WeChatDraftRequest(BaseModel):
    """Request model for sending to WeChat draft"""
    appid: str
    secret: str
    markdown: str
    style: str = "wechat-default"
    thumb_media_id: str = ""
    author: str = ""
    digest: str = ""
    content_source_url: str = ""
    need_open_comment: int = 1
    only_fans_can_comment: int = 1


class WeChatDirectDraftRequest(BaseModel):
    """Request model for direct WeChat draft submission"""
    access_token: str
    title: str
    content: str
    author: str = ""
    digest: str = ""
    content_source_url: str = ""
    thumb_media_id: str = ""
    need_open_comment: int = 1
    only_fans_can_comment: int = 1


# Initialize DeepSeek client
deepseek_client = OpenAI(
    api_key="sk-3d45b1b21d094700a8a528a8905bbb9f",
    base_url="https://api.deepseek.com"
)

# Initialize FastAPI app
app = FastAPI(
    title="md2any API",
    description="Markdown to HTML API with theme support",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/static", StaticFiles(directory="."), name="static")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load themes configuration
def load_themes() -> Dict[str, Any]:
    """Load theme configurations from styles.py module"""
    try:
        from styles import STYLES
        return STYLES
    except Exception as e:
        print(f"Warning: Could not load themes from styles.py: {e}")
        return get_default_themes()


def get_enhanced_default_styles() -> Dict[str, str]:
    """Get enhanced default styles"""
    return {
        "container": "max-width: 740px; margin: 0 auto; padding: 20px; font-family: 'Helvetica Neue', Helvetica, Arial, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif; font-size: 16px; line-height: 1.8; color: #333; background-color: #ffffff;",
        "h1": "font-size: 28px; line-height: 1.4; font-weight: 700; color: #2c3e50; position: relative; padding-bottom: 16px; border-bottom: 2px solid #3498db; margin: 32px 0 24px;",
        "h2": "display: table; padding: 0.6em 1.5em; margin: 2.8em auto 1.5em; font-size: 1.3em; font-weight: 700; text-align: center; color: #fff; background: linear-gradient(135deg, #3498db, #2980b9); border-radius: 30px; box-shadow: 0 6px 16px rgba(52, 152, 219, 0.25);",
        "h3": "font-size: 1.2em; font-weight: 600; color: #2c3e50; margin: 2.2em 0 1em; padding-left: 16px; border-left: 4px solid #3498db; line-height: 1.5;",
        "h4": "font-size: 20px; font-weight: 600; color: #34495e; line-height: 1.4; margin: 24px 0 12px;",
        "h5": "font-size: 18px; font-weight: 600; color: #34495e; line-height: 1.4; margin: 20px 0 10px;",
        "h6": "font-size: 16px; font-weight: 600; color: #7f8c8d; margin-top: 1.5em; margin-bottom: 0.8em;",
        "p": "color: #555555; margin: 20px 0; line-height: 1.8;",
        "strong": "font-weight: 700; color: #e74c3c; background-color: rgba(231, 76, 60, 0.08); padding: 2px 4px; border-radius: 3px;",
        "em": "color: #9b59b6; font-style: italic;",
        "a": "color: #3498db; text-decoration: none; font-weight: 600; border-bottom: 2px solid rgba(52, 152, 219, 0.3); padding: 0 2px;",
        "ul": "padding: 16px 16px 16px 36px; background: rgba(52, 152, 219, 0.05); border-radius: 12px; margin: 20px 0;",
        "ol": "padding: 16px 16px 16px 36px; background: rgba(46, 204, 113, 0.05); border-radius: 12px; margin: 20px 0;",
        "li": "font-size: 16px; line-height: 1.8; color: #555555; margin: 12px 0;",
        "blockquote": "padding: 20px 25px 20px 30px; background: #ecf0f1; border-left: 5px solid #3498db; border-radius: 0 12px 12px 0; color: #444; margin: 24px 0; font-style: italic;",
        "code": "font-family: 'Monaco', 'Consolas', monospace; background: rgba(52, 152, 219, 0.08); padding: 4px 8px; border-radius: 6px; font-size: 14px; color: #2980b9;",
        "pre": "background: #f8f9fa; border-radius: 12px; padding: 20px 24px; overflow-x: auto; border: 1px solid #e9ecef; margin: 24px 0; line-height: 1.6;",
        "table": "width: 100%; border-collapse: collapse; font-size: 15px; border: 1px solid #bdc3c7; border-radius: 12px; overflow: hidden; margin: 24px 0;",
        "th": "background: rgba(52, 152, 219, 0.1); font-weight: 600; text-align: left; padding: 16px 20px; color: #2c3e50;",
        "td": "padding: 16px 20px; border-bottom: 1px solid #ecf0f1; color: #555; line-height: 1.6;",
        "img": "max-width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); margin: 24px auto;"
    }


def get_enhanced_dark_styles() -> Dict[str, str]:
    """Get enhanced dark mode styles"""
    return {
        "container": "max-width: 740px; margin: 0 auto; padding: 20px; font-family: 'Helvetica Neue', Helvetica, Arial, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif; font-size: 16px; line-height: 1.8; color: #e8e8e8; background-color: #1a1a1a;",
        "h1": "font-size: 28px; line-height: 1.4; font-weight: 700; color: #ffffff; position: relative; padding-bottom: 16px; border-bottom: 2px solid #3498db; margin: 32px 0 24px;",
        "h2": "display: table; padding: 0.6em 1.5em; margin: 2.8em auto 1.5em; font-size: 1.3em; font-weight: 700; text-align: center; color: #fff; background: linear-gradient(135deg, #3498db, #2980b9); border-radius: 30px; box-shadow: 0 6px 16px rgba(52, 152, 219, 0.35);",
        "h3": "font-size: 1.2em; font-weight: 600; color: #ffffff; margin: 2.2em 0 1em; padding-left: 16px; border-left: 4px solid #3498db; line-height: 1.5;",
        "h4": "font-size: 20px; font-weight: 600; color: #e8e8e8; line-height: 1.4; margin: 24px 0 12px;",
        "h5": "font-size: 18px; font-weight: 600; color: #e8e8e8; line-height: 1.4; margin: 20px 0 10px;",
        "h6": "font-size: 16px; font-weight: 600; color: #95a5a6; margin-top: 1.5em; margin-bottom: 0.8em;",
        "p": "color: #b0b0b0; margin: 20px 0; line-height: 1.8;",
        "strong": "font-weight: 700; color: #e74c3c; background-color: rgba(231, 76, 60, 0.15); padding: 2px 4px; border-radius: 3px;",
        "em": "color: #9b59b6; font-style: italic;",
        "a": "color: #3498db; text-decoration: none; font-weight: 600; border-bottom: 2px solid rgba(52, 152, 219, 0.4); padding: 0 2px;",
        "ul": "padding: 16px 16px 16px 36px; background: rgba(52, 152, 219, 0.1); border-radius: 12px; margin: 20px 0;",
        "ol": "padding: 16px 16px 16px 36px; background: rgba(46, 204, 113, 0.1); border-radius: 12px; margin: 20px 0;",
        "li": "font-size: 16px; line-height: 1.8; color: #b0b0b0; margin: 12px 0;",
        "blockquote": "padding: 20px 25px 20px 30px; background: #2c3e50; border-left: 5px solid #3498db; border-radius: 0 12px 12px 0; color: #bdc3c7; margin: 24px 0; font-style: italic;",
        "code": "font-family: 'Monaco', 'Consolas', monospace; background: rgba(52, 152, 219, 0.15); padding: 4px 8px; border-radius: 6px; font-size: 14px; color: #5dade2;",
        "pre": "background: #2c3e50; border-radius: 12px; padding: 20px 24px; overflow-x: auto; border: 1px solid #34495e; margin: 24px 0; line-height: 1.6;",
        "table": "width: 100%; border-collapse: collapse; font-size: 15px; border: 1px solid #34495e; border-radius: 12px; overflow: hidden; margin: 24px 0;",
        "th": "background: rgba(52, 152, 219, 0.2); font-weight: 600; text-align: left; padding: 16px 20px; color: #ffffff;",
        "td": "padding: 16px 20px; border-bottom: 1px solid #34495e; color: #b0b3c7; line-height: 1.6;",
        "img": "max-width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3); margin: 24px auto;"
    }


def get_default_themes() -> Dict[str, Any]:
    """Return default themes if styles.js cannot be loaded"""
    return {
        "wechat-default": {
            "name": "默认样式",
            "body": "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;",
            "h1": "color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;",
            "h2": "color: #34495e; border-bottom: 1px solid #bdc3c7; padding-bottom: 5px;",
            "h3": "color: #7f8c8d;",
            "p": "margin: 1em 0; text-align: justify;",
            "blockquote": "border-left: 4px solid #3498db; margin: 0; padding: 0 0 0 20px; color: #7f8c8d; font-style: italic;",
            "code": "background: #f8f9fa; padding: 2px 4px; border-radius: 3px; font-family: 'Monaco', 'Consolas', monospace;",
            "pre": "background: #f8f9fa; padding: 15px; border-radius: 5px; overflow-x: auto; border: 1px solid #e9ecef;",
            "table": "border-collapse: collapse; width: 100%; margin: 1em 0;",
            "th": "background: #f8f9fa; padding: 12px; text-align: left; border: 1px solid #dee2e6;",
            "td": "padding: 12px; border: 1px solid #dee2e6;",
            "ul": "padding-left: 20px;",
            "ol": "padding-left: 20px;",
            "li": "margin: 0.5em 0;",
            "img": "max-width: 100%; height: auto; border-radius: 5px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);",
            "a": "color: #3498db; text-decoration: none;",
            "strong": "color: #e74c3c; font-weight: bold;",
            "em": "color: #f39c12; font-style: italic;"
        }
    }


# Global themes variable
THEMES = load_themes()


class MarkdownRenderer:
    """Enhanced Markdown renderer with theme support"""
    
    def __init__(self):
        self.md = markdown.Markdown(
            extensions=[
                'extra',
                'codehilite',
                'toc',
                'tables',
                'fenced_code'
            ],
            extension_configs={
                'codehilite': {
                    'css_class': 'highlight',
                    'use_pygments': True,
                    'noclasses': True
                }
            }
        )
    
    def render(self, markdown_text: str, theme_name: str = "wechat-default", mode: str = "light-mode", platform: str = "wechat") -> str:
        """Render markdown to HTML with theme styling"""
        
        # Get theme configuration
        theme = THEMES.get(theme_name, THEMES.get("wechat-default", get_default_themes()["wechat-default"]))
        
        # Convert markdown to HTML
        html_content = self.md.convert(markdown_text)
        
        # Apply theme styling
        styled_html = self._apply_theme_styling(html_content, theme, mode, platform)
        
        # Reset markdown instance for next use
        self.md.reset()
        
        return styled_html
    
    def _apply_theme_styling(self, html_content: str, theme: Dict[str, Any], mode: str, platform: str) -> str:
        """Apply theme styling to HTML content with inline styles"""
        
        # Get styles from the theme
        styles = theme.get("styles", {})
        
        # Handle image grid layouts first
        html_content = self._process_image_grids(html_content)
        
        # Parse HTML with BeautifulSoup
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Apply styles to each element
        for selector, style_properties in styles.items():
            if selector in ['container', 'innerContainer']:
                # Skip container styles as they're handled separately
                continue
            
            # Apply mode and platform adjustments to styles
            adjusted_style = style_properties
            if mode == "dark-mode":
                adjusted_style = self._apply_dark_mode_adjustments_to_style(adjusted_style)
            if platform == "wechat":
                adjusted_style = self._adjust_for_wechat_style(adjusted_style)
            elif platform == "xiaohongshu":
                adjusted_style = self._adjust_for_xiaohongshu_style(adjusted_style)
            elif platform == "zhihu":
                adjusted_style = self._adjust_for_zhihu_style(adjusted_style)
            
            # Find matching elements and apply inline styles
            try:
                elements = soup.select(selector)
                for element in elements:
                    existing_style = element.get('style', '')
                    if existing_style and not existing_style.endswith(';'):
                        existing_style += ';'
                    combined_style = f"{existing_style} {adjusted_style}"
                    element['style'] = combined_style.strip()
            except Exception as e:
                # Skip invalid selectors
                continue
        
        # Get container styles
        container_style = styles.get("container", "")
        inner_container_style = styles.get("innerContainer", "")
        
        # Apply adjustments to container styles
        if mode == "dark-mode":
            container_style = self._apply_dark_mode_adjustments_to_style(container_style)
            inner_container_style = self._apply_dark_mode_adjustments_to_style(inner_container_style)
        if platform == "wechat":
            container_style = self._adjust_for_wechat_style(container_style)
            inner_container_style = self._adjust_for_wechat_style(inner_container_style)
        
        # Create container section
        container = soup.new_tag('section', **{'class': 'markdown-content'})
        if container_style:
            container['style'] = container_style
        
        # Add inner container if needed
        if inner_container_style:
            inner_container = soup.new_tag('section', **{'class': 'inner-container'})
            inner_container['style'] = inner_container_style
            inner_container.extend(soup.contents)
            container.append(inner_container)
        else:
            container.extend(soup.contents)
        
        return str(container)
    
    def _apply_dark_mode_adjustments_to_style(self, style: str) -> str:
        """Apply dark mode adjustments to inline style"""
        # Basic dark mode transformations
        dark_adjustments = {
            '#ffffff': '#1a1a1a',
            '#fff': '#1a1a1a',
            '#333333': '#e8e8e8',
            '#333': '#e8e8e8',
            '#555555': '#b0b0b0',
            '#555': '#b0b0b0',
            '#000000': '#ffffff',
            '#000': '#ffffff',
            '#f8f9fa': '#2c3e50',
            '#ecf0f1': '#2c3e50',
            '#f7f7f7': '#2c3e50'
        }
        
        adjusted_style = style
        for light_color, dark_color in dark_adjustments.items():
            adjusted_style = adjusted_style.replace(light_color, dark_color)
        
        return adjusted_style
    
    def _adjust_for_wechat_style(self, style: str) -> str:
        """Adjust inline style for WeChat platform"""
        # Add !important to all style declarations for WeChat compatibility
        if not style:
            return style
            
        # Split by semicolons and add !important to each declaration
        declarations = style.split(';')
        adjusted_declarations = []
        
        for declaration in declarations:
            declaration = declaration.strip()
            if declaration and ':' in declaration:
                if '!important' not in declaration:
                    # Add !important before the semicolon
                    declaration += ' !important'
                adjusted_declarations.append(declaration)
        
        return '; '.join(adjusted_declarations)
    
    def _adjust_for_xiaohongshu_style(self, style: str) -> str:
        """Adjust inline style for XiaoHongShu platform"""
        return style  # No specific adjustments needed for inline styles
    
    def _adjust_for_zhihu_style(self, style: str) -> str:
        """Adjust inline style for Zhihu platform"""
        return style  # No specific adjustments needed for inline styles
    
    def _process_image_grids(self, html_content: str) -> str:
        """Process consecutive images into grid layouts"""
        # This is a simplified version - you can enhance this based on your needs
        # Look for consecutive <img> tags and wrap them in grid containers
        
        # Pattern to match consecutive images
        img_pattern = r'(<p><img[^>]*></p>\s*)+'
        
        def replace_img_group(match):
            img_group = match.group(0)
            img_tags = re.findall(r'<img[^>]*>', img_group)
            img_count = len(img_tags)
            
            if img_count == 1:
                return img_group
            elif img_count == 2:
                return f'<section class="img-grid img-grid-2">{img_group}</section>'
            elif img_count == 3:
                return f'<section class="img-grid img-grid-3">{img_group}</section>'
            else:
                return f'<section class="img-grid img-grid-multi">{img_group}</section>'
        
        return re.sub(img_pattern, replace_img_group, html_content)


# Initialize renderer
renderer = MarkdownRenderer()


def extract_title_from_markdown(markdown_content: str) -> str:
    """Extract title from markdown content"""
    lines = markdown_content.split('\n')
    for line in lines:
        if line.startswith('#') and not line.startswith('##'):
            return line.replace('#', '', 1).strip()
    return '默认标题'


def preprocess_markdown(content: str) -> str:
    """Preprocess markdown content for better rendering"""
    # Normalize list item format
    content = re.sub(r'^(\s*(?:\d+\.|\-|\*)\s+[^:\n]+)\n\s*:\s*(.+?)$', r'\1: \2', content, flags=re.MULTILINE)
    content = re.sub(r'^(\s*(?:\d+\.|\-|\*)\s+.+?:)\s*\n\s+(.+?)$', r'\1 \2', content, flags=re.MULTILINE)
    content = re.sub(r'^(\s*(?:\d+\.|\-|\*)\s+[^:\n]+)\n:\s*(.+?)$', r'\1: \2', content, flags=re.MULTILINE)
    content = re.sub(r'^(\s*(?:\d+\.|\-|\*)\s+.+?)\n\n\s+(.+?)$', r'\1 \2', content, flags=re.MULTILINE)
    return content


@app.get("/")
async def index():
    """Serve the index.html file"""
    from fastapi.staticfiles import StaticFiles
    from fastapi import Response
    import os
    
    try:
        # Read and return the index.html file
        if os.path.exists('index.html'):
            with open('index.html', 'r', encoding='utf-8') as f:
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
    for theme_id, theme_config in THEMES.items():
        theme_info = {
            "id": theme_id,
            "name": theme_config.get("name", theme_id),
            "description": theme_config.get("description", ""),
            "modes": theme_config.get("modes", [])
        }
        
        # If no modes defined, add default light mode
        if not theme_info["modes"]:
            theme_info["modes"] = [{
                "name": "默认",
                "id": "light-mode",
                "background": "#ffffff"
            }]
        
        theme_list.append(theme_info)
    
    return {"themes": theme_list}


@app.post("/ai", response_model=AIResponse)
async def ai_assist(request: AIRequest):
    """AI assistance endpoint using DeepSeek"""
    try:
        # Prepare messages for DeepSeek API
        messages = [
            {"role": "system", "content": "You are a helpful assistant specialized in markdown writing and formatting.请基于以下规则,将目标TXT文本完整、精准地转换为Markdown(MD)格式,核心需实现\"结构识别、内容保真、重点突出、格式适配\"四大目标,具体要求如下:\n\n## 一、文本结构识别与MD标题转换\n1. **标题层级判定**:先通读TXT全文,根据文本逻辑(如内容从属关系、标题前后空行、文字语义权重)和格式特征(如TXT中可能的\"#\"\"##\"标记、\"【】\"包裹标题、字号暗示性文字),精准区分**一级标题(H1)、二级标题(H2)、三级标题(H3)**及以下层级(最多识别至H6,避免层级冗余);\n2. **MD标题格式适配**:严格按MD语法转换,一级标题用\"# 标题内容\",二级标题用\"## 标题内容\",以此类推,标题文本需完整保留原TXT表述,不增删语义;\n3. **标题与段落区分**:若TXT中标题与正文无明显分隔(如无空行),需通过\"是否为核心观点句、是否统领后续内容\"判断,标题下方需空1行再接正文,确保结构清晰。\n\n\n## 二、正文段落与重点内容处理\n1. **段落完整性保真**:TXT中的正文段落需完整迁移至MD,段落间若有明确空行(原TXT中换行分隔),MD中需保留同等空行间距,避免段落合并或拆分;\n2. **核心信息标注**:结合对文章涵义的分析(如核心论点、关键结论、重要数据、限定条件),用**加粗(``**重点内容**``)**标注重点,标注原则:\n   - 不滥用加粗,仅针对\"支撑文章主旨的关键句、影响理解的核心概念、需要强调的结论\";\n   - 若TXT中有\"注意\"\"重点\"\"核心\"等提示词,其引导的内容需优先标注;\n3. **特殊表述处理**:对TXT中的强调性表述(如\"必须\"\"禁止\"\"唯一\"等限定词引导的内容)、专业术语(如技术文档中的概念),可补充用**下划线(``_术语_``)**辅助突出,增强可读性。\n\n\n## 三、列表结构识别与MD格式转换\n1. **无序列表处理**:若TXT中出现\"-\"\"·\"\"○\"\"□\"等符号引导的并列内容,或语义上为\"多个并列要点、分类项\"(如\"优势包括:第一点...第二点...\"),统一转换为MD无序列表(用\"- 列表内容\"表示),列表项需对齐,嵌套列表(如\"要点1下的子项\")用缩进+\"-\"表示;\n2. **有序列表处理**:若TXT中出现\"1. \"\"2. \"\"(1)\"\"第一\"\"第二\"等带序号的引导内容,且语义上为\"步骤、流程、优先级排序\",统一转换为MD有序列表(用\"1. 列表内容\"\"2. 列表内容\"表示),序号需连续,避免断号或错序;\n3. **列表与正文衔接**:列表前后需与正文空1行,列表项内部若有长文本换行,需保持缩进对齐,确保视觉连贯。\n\n\n## 四、代码内容与图片URL适配\n1. **代码段识别与转换**:\n   - 若TXT中出现\"代码如下\"\"示例代码\"等提示语,或内容为编程语言语法(如``print()``、``function``、SQL语句、命令行指令),需用MD代码块格式包裹:单行代码用\"``代码内容``\",多行代码用\"```语言类型\\\\n代码内容\\\\n```\"(如Python代码标注为\"```python\",Shell命令标注为\"```shell\");\n   - 代码段需完整保留原TXT中的语法格式(如缩进、空格、符号),不修改代码逻辑;\n2. **图片URL转换**:若TXT中包含图片链接(如以``http://``、``https://``开头,后缀为``.jpg``、``.png``、``.gif``的URL),需转换为MD图片语法:``![图片描述](图片URL)``,其中\"图片描述\"优先提取TXT中对图片的说明(如\"系统架构图\"\"数据可视化结果\"),若无说明则填\"图片\",确保链接可直接访问。\n\n\n## 五、其他格式的MD适配规则\n1. **引用内容处理**:若TXT中出现\"某某说\"\"正如XX文献所述\"等引用语句,或内容为外部观点、文献摘录,用MD引用格式(``> 引用内容``)表示,引用内容若有多段,每段前均需加\">\";\n2. **链接处理**:若TXT中包含非图片的URL(如文档链接、网页链接),且有对应描述文本(如\"参考文档:https://xxx\"),转换为MD链接语法:``[链接描述](URL)``(如\"``[参考文档](https://xxx)``\");\n3. **表格处理**:若TXT中有用空格、逗号分隔的结构化数据(如\"姓名 年龄 性别\"\"产品,价格,库存\"),且语义上为\"对比数据、分类统计\",需转换为MD表格格式,确保表头与内容对齐(如:\n   | 姓名 | 年龄 | 性别 |\n   | ---- | ---- | ---- |\n   | 张三 | 25   | 男   |);\n4. **格式优先级**:若同一内容同时符合多种格式规则(如\"带序号的代码步骤\"),优先按\"核心语义\"判定——若为\"步骤\"则用有序列表,列表项内的代码用单行代码格式包裹,避免格式冲突。\n\n\n## 六、整体输出要求\n1. 转换后的MD文本需确保\"语义无偏差、格式无错误\",可直接在MD编辑器(如Typora、VS Code)中正常渲染;\n2. 若TXT中存在模糊结构(如难以判定的标题层级、列表类型),需基于\"贴近原文逻辑、提升可读性\"的原则处理,并在转换后标注\"此处基于文本语义判定为XX格式\",确保透明性;\n3. 最终MD文本需去除原TXT中的无效格式(如多余空格、乱码字符),但保留有意义的格式符号(如引号、括号),整体排版整洁、层次分明。 "}
        ]
        
        # Add context if provided
        if request.context:
            messages.append({"role": "system", "content": f"Context: {request.context}"})
        
        # Add user prompt
        messages.append({"role": "user", "content": request.prompt})
        
        # Call DeepSeek API
        response = deepseek_client.chat.completions.create(
            model="deepseek-chat",
            messages=messages,
            stream=False
        )
        
        ai_response = response.choices[0].message.content
        
        return AIResponse(
            response=ai_response,
            success=True,
            message="AI response generated successfully"
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI service error: {str(e)}"
        )


@app.post("/text-to-markdown", response_model=TextToMarkdownResponse)
async def text_to_markdown(request: TextToMarkdownRequest):
    """Convert plain text to markdown format using AI"""
    try:
        # Prepare the conversion prompt based on style
        style_instructions = {
            "standard": "Convert the following text to clean, well-formatted markdown with appropriate headings, lists, and emphasis.",
            "academic": "Convert the following text to academic markdown with proper citations, formal headings, and structured formatting.",
            "blog": "Convert the following text to blog-style markdown with engaging headings, bullet points, and reader-friendly formatting.",
            "technical": "Convert the following text to technical documentation markdown with code blocks, proper syntax highlighting indicators, and structured sections."
        }
        
        instruction = style_instructions.get(request.style, style_instructions["standard"])
        
        # Add formatting preservation instruction if needed
        if request.preserve_formatting:
            instruction += " Preserve any existing formatting like line breaks, paragraphs, and structural elements."
        
        # Prepare messages for DeepSeek API
        messages = [
            {"role": "system", "content": "You are an expert at converting plain text to well-structured markdown format. Always return only the markdown content without explanations."},
            {"role": "user", "content": f"{instruction}\n\nText to convert:\n{request.text}"}
        ]
        
        # Call DeepSeek API
        response = deepseek_client.chat.completions.create(
            model="deepseek-chat",
            messages=messages,
            stream=False
        )
        
        markdown_content = response.choices[0].message.content.strip()
        
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
            raise HTTPException(
                status_code=400,
                detail=token_result
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
        # Validate theme and use fallback if needed
        if request.theme not in THEMES:
            # Use fallback theme if requested theme doesn't exist
            available_themes = list(THEMES.keys())
            if available_themes:
                request.theme = available_themes[0]  # Use first available theme
            else:
                raise HTTPException(
                    status_code=400,
                    detail="No themes available"
                )
        
        # Final check to ensure fallback theme exists
        if request.theme not in THEMES:
            available_themes = list(THEMES.keys())
            raise HTTPException(
                status_code=400,
                detail=f"No valid themes available. Available themes: {available_themes}"
            )
        
        # Validate mode for the theme
        theme_config = THEMES[request.theme]
        available_modes = [mode["id"] for mode in theme_config.get("modes", [])]
        if available_modes and request.mode not in available_modes:
            raise HTTPException(
                status_code=400,
                detail=f"Mode '{request.mode}' not available for theme '{request.theme}'. Available modes: {available_modes}"
            )
        
        # Render markdown
        rendered_html = renderer.render(
            request.markdown_text,
            request.theme,
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