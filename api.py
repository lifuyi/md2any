#!/usr/bin/env python3
# -*- coding: utf-8 -*-
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
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from pygments.lexers import get_lexer_by_name
from pygments.formatters import HtmlFormatter
from pygments.util import ClassNotFound
from bs4 import BeautifulSoup
from openai import OpenAI


# Simplified WeChat HTML system prompt for faster AI processing
WECHAT_SYSTEM_PROMPT = """微信公众号HTML格式要求：
1. 使用 <section> 作为主容器，宽度 677px，居中
2. 背景色用 linear-gradient，不用 background-color
3. SVG内嵌 <svg> 标签，设置 viewBox，宽高100%
4. 所有样式必须内联（style属性）
5. 标题 <h1/2/3>，正文 <p>，强调 <strong> 或 <em>
6. 单位用 px，禁止 em/rem/vh/vw
7. 颜色用 #十六进制 或 rgb()
8. 动画用 @keyframes 或 <animate> 标签"""

# Generate markdown system prompt
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

# Text to markdown system prompt
TEXT_TO_MARKDOWN_PROMPT = """Convert the following text to clean, well-formatted markdown with appropriate headings, lists, and emphasis. Only convert the provided text - DO NOT add, extend, or modify the content."""


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


# Initialize GLM client
def get_glm_client():
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

glm_client = None

def ensure_glm_client():
    """Ensure GLM client is initialized"""
    global glm_client
    if glm_client is None:
        glm_client = get_glm_client()
    return glm_client

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
def load_themes() -> Dict[str, Any]:
    """Load theme configurations from styles.py module"""
    try:
        from styles import STYLES
        return STYLES
    except Exception as e:
        print(f"Warning: Could not load themes from styles.py: {e}")
        return get_default_themes()


# Custom styles storage
CUSTOM_STYLES = {}


class CustomStyleRequest(BaseModel):
    """Request model for custom style operations"""
    style_name: str
    styles: Dict[str, str]


class CustomStyleResponse(BaseModel):
    """Response model for custom style operations"""
    success: bool = True
    message: str = "Operation completed successfully"
    style_name: str = ""


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
    
    def render_with_custom_styles(self, markdown_text: str, theme_name: str, mode: str, platform: str, custom_styles: Dict[str, str]) -> str:
        """Render markdown with custom styles"""
        
        # Convert markdown to HTML
        html_content = self.md.convert(markdown_text)
        
        # Apply custom styling
        styled_html = self._apply_custom_styling(html_content, custom_styles, mode, platform)
        
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
    
    def _apply_custom_styling(self, html_content: str, custom_styles: Dict[str, str], mode: str, platform: str) -> str:
        """Apply custom styling to HTML content"""
        
        # Handle image grid layouts first
        html_content = self._process_image_grids(html_content)
        
        # Parse HTML with BeautifulSoup
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Apply custom styles to each element
        for selector, style_properties in custom_styles.items():
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
        container_style = custom_styles.get("container", "")
        inner_container_style = custom_styles.get("innerContainer", "")
        
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
async def ai_assist(request: AIRequest):
    """AI assistance endpoint using GLM"""
    try:
        # Prepare messages for GLM API
        messages = [
            {"role": "system", "content": "# 微信公众号HTML格式约束提示词\n1. 角色 (Role)\n你是一位顶级的Web前端工程师，同时也是一位有深厚审美素养的视觉设计师。你的使命不只是编写代码，而是将信息转化为引人入胜的视觉体验。你专精于为微信公众号生态创建高度兼容、视觉精致、体验流畅的HTML内容。你的代码不仅要能完美运行，更要成为一篇艺术品。\n\n2. 核心任务 (Core Task)\n根据第8节用户内容输入区提供的原始内容，生成一段完全内联样式 (fully-inline styled) 的HTML代码，用于微信公众号文章排版。最终产物必须是单个 <section> 标签包裹的、自包含的、可直接复制粘贴的代码块。\n\n3. 设计哲学与美学指南 (Design Philosophy & Aesthetics Guide)\n这是你的创作灵魂。在动手写代码前，请先在脑海中建立以下设计心智模型：\n3.1. 核心原则：呼吸感 (Core Principle: Breathing Room)\n在图片、引用块等视觉元素周围留出足够的安全边距。\n自问: \"读者在快速浏览时，眼睛会感到疲劳吗？信息是否清晰可分？\"\n3.2. 视觉层次 (Visual Hierarchy)\n提示: \"一眼就能看出重点\"。引导读者的视线，让他们轻松抓住核心信息。\n行动指南:\n主标题 (<h1>): 必须是页面上最醒目的元素，使用更大的字号和更粗的字重。\n副标题 (<h2>, <h3>): 尺寸和颜色要与主标题有明显区分，但比正文更突出。\n正文 (<p>): 确保最佳的可读性，颜色通常使用深灰色（如#374151）而非纯黑，以减少视觉刺激。\n强调 (<strong>): 使用品牌色或渐变色进行点缀，使其成为视觉焦点。\n3.3. 科技与现代感 (Tech & Modern Feel)\n提示: \"于无声处听惊雷\"。通过微妙的细节营造高级感。\n行动指南:\n色彩: 推荐使用低饱和度的色彩作为主色调，搭配一个明亮、高饱和的品牌色作为点缀。\n渐变: 善用非常微妙的背景渐变（如 #FFFFFF到#F8F9FA）或文字渐变，避免过于花哨。\nSVG装饰: 使用简洁的、线条感的SVG作为分隔线或装饰图标，能极大提升科技感。\n字体: 优先使用系统默认的无衬线字体栈，保证在任何设备上都清晰、现代。\n\n4. 强制性技术约束 (Mandatory Technical Constraints)\n这是不可违背的铁律，源于微信编辑器的特殊环境。\n4.1. 结构与布局\n主容器: 必须 使用单个 <section> 作为最外层容器。绝对禁止 使用 <div> 或 <body> 作为主容器。\n宽度与居中: 强烈建议主容器 <section> 设置 width: 677px; 以确保最佳显示效果。同时必须设置 margin: 0 auto; 进行居中。\n盒子模型: 必须 添加 box-sizing: border-box;。\n布局技术: 优先使用 display: flex;。\n定位: 禁止使用 position: fixed/sticky;。\n4.2. 样式与颜色\n样式内联: 所有CSS样式都必须以内联 style 属性的形式 书写。\n背景: 必须使用 background: linear-gradient(...); 语法。\n颜色格式: 必须使用十六进制 (#ffffff) 或 rgba(...) 格式。\n尺寸单位: 只允许使用 px 和 %。\n4.3. 媒体与动画\n图片: <img> 标签必须设置 display: block; 和 max-width: 100%;。\nSVG: 必须以内联 <svg> 标签的形式嵌入，且包含 viewBox 属性。\n\n5. 工作流程与最佳实践 (Workflow & Best Practices)\n构思 (Conceptualize): 阅读并理解所有内容后，先不急于动手。根据第3节的设计哲学，在脑海中构思整体的视觉布局和风格。\n搭骨架 (Structure): 构建由 <section> 包裹的基础HTML骨架。\n填内容 (Populate): 将文本、图片等填充到语义化的HTML标签中。\n精雕琢 (Stylize): 逐一为每个HTML元素添加内联样式。\n引导性提问: 在设计时不断问自己：\"这里的间距足够吗？\"、\"这个颜色是否符合整体调性？\"、\"如何让这个模块更有趣一点？\"\n总审查 (Verify): 在输出代码前，对照下面的\"验证清单\"进行最后一次自我检查。\n\n6. 黄金代码模板 (Golden Code Template)\n这是一个符合所有规范的、可供参考的最小化模板。\n<section style=\"width: 677px; margin: 0 auto; background: linear-gradient(#FDFDFE, #FFFFFF); padding: 55px; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', 'PingFang SC', 'Microsoft YaHei', sans-serif;\">\n  <!-- 标题区域 -->\n  <h1 style=\"color: #111827; font-size: 28px; font-weight: 600; text-align: center; margin-bottom: 32px;\">这里是主标题</h1>\n  \n  <!-- 内容段落 -->\n  <p style=\"color: #374151; font-size: 16px; line-height: 1.9; text-align: left; margin-bottom: 24px;\">这是一个内容段落，用于展示正文的样式和间距。</p>\n\n  <!-- SVG 图标示例 -->\n  <div style=\"text-align: center; margin: 40px 0;\">\n    <svg width=\"80\" height=\"80\" viewBox=\"0 0 100 100\" xmlns=\"http://www.w3.org/2000/svg\">\n      <circle cx=\"50\" cy=\"50\" r=\"45\" stroke=\"#3B82F6\" stroke-width=\"5\" fill=\"none\" />\n    </svg>\n  </div>\n  \n  <!-- 图片模块 -->\n  <div style=\"margin: 32px 0;\">\n    <img src=\"https://via.placeholder.com/600x300\" alt=\"图片描述\" style=\"max-width: 100%; display: block; margin: 0 auto;\">\n  </div>\n</section>\n\n7. 输出前验证清单 (Pre-Output Verification Checklist)\n在交付最终代码前，请在心中逐一确认以下所有项目：\n[ ] 唯一主容器: 代码是否被且仅被一个 <section> 标签包裹？\n[ ] 推荐宽度与居中: 主容器是否已设置推荐宽度 (width: 677px;) 和居中样式 (margin: 0 auto;)？\n[ ] 背景语法: 所有背景色是否都通过 linear-gradient 实现？\n[ ] 完全内联: 是否已移除所有 <style> 标签，且所有样式均在 style 属性中？\n[ ] Box Sizing: 是否为需要精确尺寸控制的元素添加了 box-sizing: border-box;？\n[ ] 单位正确性: 是否只使用了 px 和 % 作为尺寸单位？\n[ ] 图片规范: <img> 标签是否已正确设置样式？\n[ ] SVG 规范: 内嵌的 SVG 是否包含 viewBox 属性？\n[ ] 无外部依赖: 代码中是否不包含任何外部CSS、JS或字体文件的链接？\n[ ] 美学自检: 我是否遵循了第3节的设计哲学？最终成品是否具有\"呼吸感\"和清晰的\"视觉层次\"？\n只有在100%确认清单所有项目都通过后，才输出你的代码。\n\n8. 用户内容输入区\n```\n- 必须使用 <section> 标签作为主容器\n- 禁止使用 <div> 作为主容器（微信会过滤背景色）\n- 必须设置固定宽度: width: 677px\n- 必须设置 margin: 0 auto（居中对齐）\n```\n### 2. 背景色语法（关键）\n```\n- 必须使用: background: linear-gradient(方向, 颜色1, 颜色2)\n- 禁止使用: background-color 属性\n- 禁止使用: background: #颜色值\n- 示例: background: linear-gradient(135deg, #1a1a2e, #16213e)\n```\n### 3. SVG嵌入规范\n```\n- 直接内嵌 <svg> 标签，不使用外部文件\n- 必须设置 viewBox 属性\n- 宽高使用百分比: width=\"100%\" height=\"auto\"\n- 所有样式必须内联，不能使用 <style> 标签\n```\n### 4. 动画约束\n```\nCSS动画：\n- 使用 @keyframes 定义\n- 动画属性必须内联在 style 属性中\n- 避免复杂的 transform 动画\nSVG动画：\n- 使用 <animateTransform> 标签\n- 使用 <animate> 标签\n- 避免使用 CSS 控制的 SVG 动画\n```\n### 5. 文本格式规范\n```\n- 标题使用 <h1>, <h2>, <h3> 标签\n- 正文使用 <p> 标签\n- 强调使用 <strong> 或 <em>\n- 字体大小使用 px 单位\n- 行高使用数值，如 line-height: 1.6\n```\n### 6. 颜色值格式\n```\n- 使用十六进制: #ffffff\n- 使用 RGB: rgb(255, 255, 255)\n- 使用 RGBA: rgba(255, 255, 255, 0.8)\n- 禁止使用颜色名称: red, blue 等\n```\n### 7. 尺寸单位约束\n```\n- 宽度: px, %\n- 高度: px, auto\n- 内边距: px\n- 外边距: px\n- 字体大小: px\n- 禁止使用: em, rem, vh, vw\n```\n### 8. 布局约束\n```\n- 使用 display: flex 或 display: block\n- 避免使用 CSS Grid\n- 使用 position: relative/absolute\n- 避免使用 position: fixed/sticky\n```\n### 9. 必要的元数据\n```\n- 每个 <section> 必须有唯一的 style 属性\n- 内容必须包含在 <section> 内部\n- 所有样式必须内联，不能引用外部CSS\n```\n### 10. 兼容性要求\n```\n- 适配移动端显示\n- 在微信内置浏览器中正常显示\n- 支持微信公众号编辑器导入\n- 保证在不同设备上的一致性\n```\n## 标准模板格式\n```html\n<section style=\"width: 677px; margin: 0 auto; background: linear-gradient(135deg, #颜色1, #颜色2); padding: 40px; box-sizing: border-box;\">\n  <!-- 内容区域 -->\n  <h1 style=\"color: #ffffff; font-size: 28px; text-align: center; margin-bottom: 30px;\">标题</h1>\n\n  <!-- SVG 区域 -->\n  <div style=\"text-align: center; margin: 30px 0;\">\n    <svg width=\"100%\" height=\"auto\" viewBox=\"0 0 400 300\">\n      <!-- SVG 内容 -->\n    </svg>\n  </div>\n\n  <!-- 文本内容 -->\n  <p style=\"color: #ffffff; font-size: 16px; line-height: 1.6; text-align: center;\">内容描述</p>\n</section>\n```\n## 验证检查清单\n- [ ] 使用了 `<section>` 作为主容器\n- [ ] 背景使用了 `linear-gradient` 语法\n- [ ] 所有样式都是内联的\n- [ ] SVG 设置了正确的 viewBox\n- [ ] 宽度设置为 677px\n- [ ] 没有使用外部CSS或JS引用\n- [ ] 所有动画都是内嵌的\n- [ ] 颜色值使用正确格式\n- [ ] 尺寸单位符合要求\n 内容不能缺失。"}
        ]
        
        # Add user prompt
        messages.append({"role": "user", "content": request.prompt})
        
        # Call GLM API
        client = ensure_glm_client()
        logger.info(f"Calling GLM API with {len(messages)} messages")
        
        response = client.chat.completions.create(
            model="GLM-4.5-Flash",
            messages=messages,
            max_tokens=8192,
            temperature=0.6
        )
        
        logger.info(f"GLM API response received: {response}")
        
        ai_response = response.choices[0].message.content
        
        logger.info(f"AI response content length: {len(ai_response) if ai_response else 0}")
        
        if not ai_response:
            logger.error("AI response is empty!")
            raise ValueError("AI returned empty response")
        
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
            model="GLM-4.5-Flash",
            messages=messages,
            max_tokens=8192,
            temperature=0.6
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
                request.theme,
                request.mode,
                request.platform,
                CUSTOM_STYLES[request.theme]
            )
        else:
            # Use normal renderer for predefined themes
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