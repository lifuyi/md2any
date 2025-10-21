#!/usr/bin/env python3
"""
Markdown to HTML API Server with Theme Support
Built with FastAPI and managed by uv
"""

import re
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
        "td": "padding: 16px 20px; border-bottom: 1px solid #34495e; color: #bdc3c7; line-height: 1.6;",
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
    
    def _apply_dark_mode_adjustments(self, css_styles: str) -> str:
        """Apply dark mode adjustments to CSS"""
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
        
        adjusted_css = css_styles
        for light_color, dark_color in dark_adjustments.items():
            adjusted_css = adjusted_css.replace(light_color, dark_color)
        
        return adjusted_css
    
    def _generate_css_from_theme_styles(self, styles: Dict[str, str]) -> str:
        """Generate CSS from theme styles configuration"""
        css_rules = []
        
        for selector, css_properties in styles.items():
            if selector in ['container', 'innerContainer']:
                # Skip container styles as they're handled separately
                continue
            elif selector == 'body':
                css_rules.append(f".markdown-content {{ {css_properties} }}")
            elif selector.startswith('inner-container'):
                css_rules.append(f".markdown-content .inner-container{selector[15:]} {{ {css_properties} }}")
            else:
                # Handle complex selectors and pseudo-elements
                if '::' in selector or ':' in selector:
                    # For pseudo-elements and pseudo-classes
                    css_rules.append(f".markdown-content {selector} {{ {css_properties} }}")
                else:
                    # Regular selectors
                    css_rules.append(f".markdown-content {selector} {{ {css_properties} }}")
        
        return "\n".join(css_rules)
    
    def _adjust_for_wechat(self, css_styles: str) -> str:
        """Adjust CSS for WeChat platform"""
        # Add !important to all style declarations for WeChat compatibility, but avoid duplicates
        # Process each CSS declaration and add !important if not already present
        def add_important(match):
            declaration = match.group(0)
            if '!important' not in declaration:
                # Add !important before the semicolon
                declaration = declaration.rstrip(';') + ' !important;'
            return declaration
            
        # Match CSS declarations (property: value;)
        css_styles = re.sub(r'[^{}:]+:\s*[^{};]+;', add_important, css_styles)
        
        # Additional WeChat-specific adjustments
        wechat_additions = """
        .markdown-content table {
            display: table !important;
            border-collapse: collapse !important;
        }
        .markdown-content img {
            max-width: 100% !important;
            height: auto !important;
        }
        """
        
        return css_styles + wechat_additions
    
    def _adjust_for_xiaohongshu(self, css_styles: str) -> str:
        """Adjust CSS for XiaoHongShu platform"""
        xiaohongshu_additions = """
        .markdown-content {
            background: linear-gradient(135deg, #ffeaa7 0%, #fab1a0 100%);
            border-radius: 15px;
            padding: 20px;
        }
        """
        return css_styles + xiaohongshu_additions
    
    def _adjust_for_zhihu(self, css_styles: str) -> str:
        """Adjust CSS for Zhihu platform"""
        zhihu_additions = """
        .markdown-content {
            font-family: -apple-system, BlinkMacSystemFont, Helvetica Neue, PingFang SC, Microsoft YaHei, Source Han Sans SC, Noto Sans CJK SC, WenQuanYi Micro Hei, sans-serif;
        }
        .markdown-content pre {
            background: #f6f6f6;
            border: 1px solid #e5e5e5;
        }
        """
        return css_styles + zhihu_additions
    
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
        "description": "Markdown to HTML API with theme support",
        "endpoints": {
            "/render": "POST - Render markdown to HTML",
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