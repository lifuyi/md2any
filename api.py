#!/usr/bin/env python3
"""
Markdown to HTML API Server with Theme Support
Built with FastAPI and managed by uv
"""

import json
import re
from typing import Dict, Any, Optional
from pathlib import Path

import markdown
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel
from pygments import highlight
from pygments.lexers import get_lexer_by_name
from pygments.formatters import HtmlFormatter
from pygments.util import ClassNotFound


class MarkdownRequest(BaseModel):
    """Request model for markdown rendering"""
    markdown_text: str
    theme: str = "default"
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

# Load themes configuration
def load_themes() -> Dict[str, Any]:
    """Load theme configurations from styles.js file"""
    try:
        with open("styles.js", "r", encoding="utf-8") as f:
            content = f.read()
        
        # Extract the STYLES object using a more robust parser
        start_marker = "const STYLES = {"
        start_idx = content.find(start_marker)
        if start_idx == -1:
            raise ValueError("STYLES object not found in styles.js")
        
        # Find the matching closing brace for the entire STYLES object
        brace_count = 0
        start_pos = start_idx + len("const STYLES = ")
        end_idx = start_pos
        
        for i, char in enumerate(content[start_pos:], start_pos):
            if char == '{':
                brace_count += 1
            elif char == '}':
                brace_count -= 1
                if brace_count == 0:
                    end_idx = i + 1
                    break
        
        # Extract the JavaScript object content
        js_content = content[start_pos:end_idx]
        
        # Convert JavaScript object to Python dict using regex patterns
        # This is a simplified parser - handles the specific structure of styles.js
        themes = parse_styles_object(js_content)
        
        return themes
    except Exception as e:
        print(f"Warning: Could not load themes from styles.js: {e}")
        return get_default_themes()


def parse_styles_object(js_content: str) -> Dict[str, Any]:
    """Parse the JavaScript STYLES object into Python dict - enhanced parser"""
    themes = {}
    
    # Extract theme blocks more accurately
    theme_pattern = r'"([^"]+)"\s*:\s*\{((?:[^{}]*\{[^{}]*\}[^{}]*)*?)\}(?=\s*,\s*"|\s*$)'
    
    matches = re.finditer(theme_pattern, js_content, re.DOTALL)
    
    for match in matches:
        theme_id = match.group(1)
        theme_content = match.group(2)
        
        print(f"Parsing theme: {theme_id}")
        
        # Parse theme structure
        theme_data = parse_theme_structure(theme_id, theme_content)
        themes[theme_id] = theme_data
    
    print(f"Successfully parsed {len(themes)} themes")
    return themes


def parse_theme_structure(theme_id: str, theme_content: str) -> Dict[str, Any]:
    """Parse individual theme structure"""
    
    # Extract name
    name_match = re.search(r'"name"\s*:\s*"([^"]+)"', theme_content)
    name = name_match.group(1) if name_match else theme_id.replace("-", " ").replace("_", " ").title()
    
    # Extract modes
    modes = extract_modes(theme_content)
    
    # Extract styles
    styles = extract_styles(theme_content)
    
    return {
        "name": name,
        "modes": modes,
        "styles": styles
    }


def extract_modes(theme_content: str) -> list:
    """Extract modes from theme content"""
    modes = []
    
    # Look for modes array
    modes_match = re.search(r'"modes"\s*:\s*\[(.*?)\]', theme_content, re.DOTALL)
    if modes_match:
        modes_content = modes_match.group(1)
        
        # Extract individual mode objects
        mode_pattern = r'\{([^{}]+)\}'
        mode_matches = re.findall(mode_pattern, modes_content)
        
        for mode_content in mode_matches:
            name_match = re.search(r'"name"\s*:\s*"([^"]+)"', mode_content)
            id_match = re.search(r'"id"\s*:\s*"([^"]+)"', mode_content)
            bg_match = re.search(r'"background"\s*:\s*"([^"]+)"', mode_content)
            
            modes.append({
                "name": name_match.group(1) if name_match else "默认",
                "id": id_match.group(1) if id_match else "light-mode",
                "background": bg_match.group(1) if bg_match else "#ffffff"
            })
    
    # Fallback if no modes found
    if not modes:
        modes = [
            {
                "name": "浅色",
                "id": "light-mode",
                "background": "#ffffff"
            },
            {
                "name": "深色", 
                "id": "dark-mode",
                "background": "#1a1a1a"
            }
        ]
    
    return modes


def extract_styles(theme_content: str) -> Dict[str, str]:
    """Extract styles from theme content"""
    styles = {}
    
    # Look for styles object
    styles_match = re.search(r'"styles"\s*:\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}', theme_content, re.DOTALL)
    if not styles_match:
        return get_enhanced_default_styles()
    
    styles_content = styles_match.group(1)
    
    # Extract individual style rules
    # Handle both simple and complex CSS rules
    style_pattern = r'"([^"]+)"\s*:\s*"((?:[^"\\]|\\.)*)"(?=\s*,|\s*\})'
    
    for match in re.finditer(style_pattern, styles_content, re.DOTALL):
        selector = match.group(1)
        css_content = match.group(2)
        
        # Clean up the CSS content
        css_content = css_content.replace('\\"', '"')
        css_content = css_content.replace('\\n', '\n')
        css_content = re.sub(r'\s+', ' ', css_content).strip()
        
        styles[selector] = css_content
    
    # If no styles found, return default
    if not styles:
        return get_enhanced_default_styles()
    
    return styles


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


def parse_css_styles(styles_content: str) -> Dict[str, str]:
    """Parse CSS styles from the JavaScript object"""
    styles = {}
    
    # Pattern to match CSS property definitions
    style_pattern = r'"([^"]+)"\s*:\s*"([^"]*(?:\\.[^"]*)*)"'
    
    for match in re.finditer(style_pattern, styles_content, re.DOTALL):
        selector = match.group(1)
        css_rules = match.group(2)
        
        # Clean up the CSS rules - handle escaped quotes and newlines
        css_rules = css_rules.replace('\\"', '"')
        css_rules = css_rules.replace('\\n', ' ')
        css_rules = re.sub(r'\s+', ' ', css_rules).strip()
        
        styles[selector] = css_rules
    
    return styles


def get_default_themes() -> Dict[str, Any]:
    """Return default themes if styles.js cannot be loaded"""
    return {
        "default": {
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
    
    def render(self, markdown_text: str, theme_name: str = "default", mode: str = "light-mode", platform: str = "wechat") -> str:
        """Render markdown to HTML with theme styling"""
        
        # Get theme configuration
        theme = THEMES.get(theme_name, THEMES.get("default", get_default_themes()["default"]))
        
        # Convert markdown to HTML
        html_content = self.md.convert(markdown_text)
        
        # Apply theme styling
        styled_html = self._apply_theme_styling(html_content, theme, mode, platform)
        
        # Reset markdown instance for next use
        self.md.reset()
        
        return styled_html
    
    def _apply_theme_styling(self, html_content: str, theme: Dict[str, Any], mode: str, platform: str) -> str:
        """Apply theme styling to HTML content"""
        
        # Get styles from the theme
        styles = theme.get("styles", {})
        
        # Generate CSS from theme styles
        css_styles = self._generate_css_from_theme_styles(styles)
        
        # Apply mode-specific adjustments
        if mode == "dark-mode":
            css_styles = self._apply_dark_mode_adjustments(css_styles)
        
        # Platform-specific adjustments
        if platform == "wechat":
            css_styles = self._adjust_for_wechat(css_styles)
        elif platform == "xiaohongshu":
            css_styles = self._adjust_for_xiaohongshu(css_styles)
        elif platform == "zhihu":
            css_styles = self._adjust_for_zhihu(css_styles)
        
        # Handle image grid layouts
        html_content = self._process_image_grids(html_content)
        
        # Get container styles
        container_style = styles.get("container", "")
        inner_container_style = styles.get("innerContainer", "")
        
        # Wrap content with styling
        if inner_container_style:
            # Use inner container if available
            full_html = f'<div class="markdown-content" style="{container_style}"><style>{css_styles}</style><div class="inner-container" style="{inner_container_style}">{html_content}</div></div>'
        else:
            # Simple container
            full_html = f'<div class="markdown-content" style="{container_style}"><style>{css_styles}</style>{html_content}</div>'
        
        return full_html
    
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
        # Add !important to all styles for WeChat compatibility
        css_styles = re.sub(r';', ' !important;', css_styles)
        
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
                return f'<div class="img-grid img-grid-2">{img_group}</div>'
            elif img_count == 3:
                return f'<div class="img-grid img-grid-3">{img_group}</div>'
            else:
                return f'<div class="img-grid img-grid-multi">{img_group}</div>'
        
        return re.sub(img_pattern, replace_img_group, html_content)


# Initialize renderer
renderer = MarkdownRenderer()


@app.get("/")
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
        # Validate theme
        if request.theme not in THEMES:
            available_themes = list(THEMES.keys())
            raise HTTPException(
                status_code=400,
                detail=f"Theme '{request.theme}' not found. Available themes: {available_themes}"
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


def main():
    """Main entry point for running the server"""
    import uvicorn
    
    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )


if __name__ == "__main__":
    main()