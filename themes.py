# -*- coding: utf-8 -*-
"""
Theme management and styling configuration
"""

from typing import Dict, Any


def get_enhanced_default_styles() -> Dict[str, str]:
    """Get enhanced default styles for light mode"""
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


def load_themes() -> Dict[str, Any]:
    """Load theme configurations from styles.py module"""
    try:
        from styles import STYLES
        return STYLES
    except Exception as e:
        print(f"Warning: Could not load themes from styles.py: {e}")
        return get_default_themes()
