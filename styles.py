# Styles configuration - converted from styles.js
# This module contains all style configurations for markdown conversion

STYLES = {
    "alibaba": {
        "name": "阿里橙",
        "modes": [
            {
                "name": "浅色",
                "id": "light-mode",
                "class": "",
                "background": "#ffffff"
            },
            {
                "name": "深色",
                "id": "dark-mode",
                "class": "dark-mode",
                "background": "#1a1a1a"
            }
        ],
        "styles": {
            "container": "max-width: 740px; margin: 0 auto; padding: 20px; font-family: \"Helvetica Neue\", Helvetica, Arial, \"PingFang SC\", \"Hiragino Sans GB\", \"Microsoft YaHei\", sans-serif; font-size: 16px; line-height: 1.8 !important; color: #3f3f3f !important; background-color: #ffffff; word-wrap: break-word;",
            "h1": "font-size: 28px; line-height: 1.4; font-weight: 700; color: #111111; position: relative; padding-bottom: 16px; border-bottom: 2px solid #ff6a00; margin: 32px 0 24px; letter-spacing: 0.5px;",
            "h2": "display: table; padding: 0.6em 1.5em; margin: 2.8em auto 1.5em; font-size: 1.3em; font-weight: 700; text-align: center; color: #fff; background: linear-gradient(135deg, #ff6a00, #ff8c00); border-radius: 30px; position: relative; box-shadow: 0 6px 16px rgba(255, 106, 0, 0.25); letter-spacing: 0.03em; border: 2px solid rgba(255, 255, 255, 0.3); z-index: 1; transition: all 0.3s ease;",
            "h2:hover": "transform: translateY(-2px); box-shadow: 0 8px 20px rgba(255, 106, 0, 0.35);",
            "h3": "font-size: 1.2em; font-weight: 600; color: #333; margin: 2.2em 0 1em; padding-left: 16px; border-left: 4px solid #ff8c00; line-height: 1.5; position: relative;",
            "p": "color: #555555; margin: 20px 0; line-height: 1.8;",
            "strong": "font-weight: 700; color: #ff6a00; background-color: rgba(255, 106, 0, 0.08); padding: 2px 4px; border-radius: 3px;",
            "em": "color: #00f2fe; font-style: italic;",
            "a": "color: #ff6a00; text-decoration: none; font-weight: 600; border-bottom: 2px solid rgba(255, 106, 0, 0.3); padding: 0 2px; transition: all 0.3s ease;",
            "a:hover": "border-bottom-color: #ff6a00;",
            "ul": "padding: 16px 16px 16px 36px; background: rgba(255, 106, 0, 0.05); border-radius: 12px; border: 1px solid rgba(255, 106, 0, 0.1); margin: 20px 0;",
            "ol": "padding: 16px 16px 16px 36px; background: rgba(255, 140, 0, 0.05); border-radius: 12px; border: 1px solid rgba(255, 140, 0, 0.1); margin: 20px 0; list-style: none; counter-reset: item;",
            "li": "font-size: 16px; line-height: 1.8; color: #555555; position: relative; margin: 12px 0;",
            "li::before": "content: counter(item); position: absolute; left: -24px; top: 0; color: #ff6a00; font-weight: 600;",
            "blockquote": "padding: 20px 25px 20px 30px; background: #fffaf5; border-left: 5px solid #ff6a00; border-radius: 0 12px 12px 0; position: relative; color: #444; margin: 24px 0; font-style: italic;",
            "code": "font-family: \"SFMono-Regular\", Consolas, \"Liberation Mono\", Menlo, monospace; background: rgba(255, 106, 0, 0.08); padding: 4px 8px; border-radius: 6px; font-size: 14px; color: #d9480f; border: 1px solid rgba(255, 106, 0, 0.1);",
            "pre": "background: #f7f7f7; border-radius: 12px; padding: 20px 24px; overflow-x: auto; position: relative; border: 1px solid #e0e0e0; margin: 24px 0; line-height: 1.6; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);",
            "hr": "border: 0; height: 2px; background: linear-gradient(90deg, transparent, #ff6a00, transparent); margin: 36px 0; position: relative;",
            "img": "max-width: 100%; border: 2px solid #ff6a00; padding: 8px; background-color: #ffffff; position: relative; border-radius: 8px; box-shadow: 0 4px 12px rgba(255, 106, 0, 0.15); margin: 24px auto;",
            "table": "width: 100%; border-collapse: collapse; font-size: 15px; border: 1px solid #e8e8e8; border-radius: 12px; overflow: hidden; margin: 24px 0;",
            "th": "background: rgba(255, 106, 0, 0.1); font-weight: 600; text-align: left; padding: 16px 20px; color: #333; border-bottom: 2px solid rgba(255, 106, 0, 0.2);",
            "td": "padding: 16px 20px; border-bottom: 1px solid #f0f0f0; color: #555; line-height: 1.6;",
            "tr": "border-bottom-color: #ffeae0; transition: background-color 0.2s ease;",
            "tr:hover": "background-color: rgba(255, 106, 0, 0.03);"
        },
        "dark-mode": {
            "container": "max-width: 740px; margin: 0 auto; padding: 20px; font-family: \"Helvetica Neue\", Helvetica, Arial, \"PingFang SC\", \"Hiragino Sans GB\", \"Microsoft YaHei\", sans-serif; font-size: 16px; line-height: 1.8 !important; color: #d1d1d1 !important; background-color: #1a1a1a; word-wrap: break-word;",
            "h1": "font-size: 28px; line-height: 1.4; font-weight: 700; color: #f0f0f0; position: relative; padding-bottom: 16px; border-bottom: 2px solid #ff6a00; margin: 32px 0 24px; letter-spacing: 0.5px;",
            "h2": "display: table; padding: 0.6em 1.5em; margin: 2.8em auto 1.5em; font-size: 1.3em; font-weight: 700; text-align: center; color: #fff; background: linear-gradient(135deg, #ff6a00, #ff8c00); border-radius: 30px; position: relative; box-shadow: 0 6px 16px rgba(255, 106, 0, 0.35); letter-spacing: 0.03em; border: 2px solid rgba(255, 255, 255, 0.2); z-index: 1; transition: all 0.3s ease;",
            "h2:hover": "transform: translateY(-2px); box-shadow: 0 8px 20px rgba(255, 106, 0, 0.45);",
            "h3": "font-size: 1.2em; font-weight: 600; color: #e0e0e0; margin: 2.2em 0 1em; padding-left: 16px; border-left: 4px solid #ff8c00; line-height: 1.5; position: relative;",
            "p": "color: #b0b0b0; margin: 20px 0; line-height: 1.8;",
            "strong": "font-weight: 700; color: #ff9a4d; background-color: rgba(255, 106, 0, 0.15); padding: 2px 4px; border-radius: 3px;",
            "em": "color: #00f2fe; font-style: italic;",
            "a": "color: #ff9a4d; text-decoration: none; font-weight: 600; border-bottom: 2px solid rgba(255, 106, 0, 0.4); padding: 0 2px; transition: all 0.3s ease;",
            "a:hover": "border-bottom-color: #ff9a4d;",
            "ul": "padding: 16px 16px 16px 36px; background: rgba(255, 106, 0, 0.1); border-radius: 12px; border: 1px solid rgba(255, 106, 0, 0.2); margin: 20px 0;",
            "ol": "padding: 16px 16px 16px 36px; background: rgba(255, 140, 0, 0.1); border-radius: 12px; border: 1px solid rgba(255, 140, 0, 0.2); margin: 20px 0; list-style: none; counter-reset: item;",
            "li": "font-size: 16px; line-height: 1.8; color: #b0b0b0; position: relative; margin: 12px 0;",
            "li::before": "content: counter(item); position: absolute; left: -24px; top: 0; color: #ff9a4d; font-weight: 600;",
            "blockquote": "padding: 20px 25px 20px 30px; background: #2a2220; border-left: 5px solid #ff6a00; border-radius: 0 12px 12px 0; position: relative; color: #c0c0c0; margin: 24px 0; font-style: italic;",
            "code": "font-family: \"SFMono-Regular\", Consolas, \"Liberation Mono\", Menlo, monospace; background: rgba(255, 106, 0, 0.15); padding: 4px 8px; border-radius: 6px; font-size: 14px; color: #ff9a4d; border: 1px solid rgba(255, 106, 0, 0.2);",
            "pre": "background: #2a2a2a; border-radius: 12px; padding: 20px 24px; overflow-x: auto; position: relative; border: 1px solid #404040; margin: 24px 0; line-height: 1.6; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);",
            "hr": "border: 0; height: 2px; background: linear-gradient(90deg, transparent, #ff6a00, transparent); margin: 36px 0; position: relative;",
            "img": "max-width: 100%; border: 2px solid #ff6a00; padding: 8px; background-color: #2a2a2a; position: relative; border-radius: 8px; box-shadow: 0 4px 12px rgba(255, 106, 0, 0.25); margin: 24px auto;",
            "table": "width: 100%; border-collapse: collapse; font-size: 15px; border: 1px solid #505050; border-radius: 12px; overflow: hidden; margin: 24px 0;",
            "th": "background: rgba(255, 106, 0, 0.2); font-weight: 600; text-align: left; padding: 16px 20px; color: #e0e0e0; border-bottom: 2px solid rgba(255, 106, 0, 0.3);",
            "td": "padding: 16px 20px; border-bottom: 1px solid #404040; color: #b0b0b0; line-height: 1.6;",
            "tr": "border-bottom-color: #503020; transition: background-color 0.2s ease;",
            "tr:hover": "background-color: rgba(255, 106, 0, 0.1);"
        }
    },
    "apple-notes": {
        "name": "苹果备忘录",
        "modes": [
            {
                "name": "浅色",
                "id": "light-mode",
                "class": "",
                "background": "#ffffff"
            },
            {
                "name": "深色",
                "id": "dark-mode",
                "class": "dark-mode",
                "background": "#1c1c1e"
            }
        ],
        "styles": {
            "container": "max-width: 740px; margin: 0 auto; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial,sans-serif; font-size: 16px; line-height: 1.8 !important; color: #333333; background-color: #f5f5f7; word-wrap: break-word;",
            "h1": "font-size: 32px; font-weight: 700; color: #1d1d1f; line-height: 1.2; margin: 36px 0 20px; text-align: center; letter-spacing: 0.5px; position: relative;",
            "h1::after": "content: ''; position: absolute; bottom: -8px; left: 50%; transform: translateX(-50%); width: 60px; height: 3px; background: linear-gradient(90deg, #007aff, #ff2d55); border-radius: 2px;",
            "h2": "font-size: 24px; font-weight: 600; color: #1d1d1f; margin: 32px 0 16px; padding: 8px 0 12px 16px; border-left: 4px solid #007aff;",
            "h3": "font-size: 20px; font-weight: 600; color: #1d1d1f; margin: 28px 0 14px; padding: 6px 0 8px 12px; border-left: 3px solid #5856d6;",
            "p": "color: #333333; margin: 18px 0; line-height: 1.8; text-align: justify;",
            "strong": "color: #000000; font-weight: 600;",
            "em": "color: #666666; font-style: italic;",
            "a": "color: #007aff; text-decoration: none; font-weight: 500; border-bottom: 1px solid rgba(0, 122, 255, 0.3); transition: all 0.2s ease;",
            "a:hover": "border-bottom-color: #007aff;",
            "ul": "margin: 20px 0; padding-left: 28px; list-style-type: disc;",
            "ol": "margin: 20px 0; padding-left: 28px; list-style-type: decimal;",
            "li": "margin: 10px 0; line-height: 1.8; color: #333333;",
            "blockquote": "margin: 24px 0; padding: 16px 20px; background-color: #f8f9fa; border-left: 4px solid #007aff; color: #333333; border-radius: 0 8px 8px 0; font-style: italic;",
            "code": "font-family: SFMono-Regular, Consolas, Menlo, monospace; font-size: 14px; padding: 3px 6px; background-color: rgba(88, 86, 214, 0.1); color: #5856d6; border-radius: 4px;",
            "pre": "margin: 24px 0; padding: 20px; background-color: #fbfbfd; color: #141413; border-radius: 8px; overflow-x: auto; line-height: 1.6; box-shadow: 0 4px 12px rgba(88, 86, 214, 0.1);",
            "hr": "margin: 32px 0; border: none; height: 1px; background-color: #e1e4e8;",
            "img": "max-width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); margin: 20px auto;",
            "table": "width: 100%; margin: 20px 0; border-collapse: collapse; font-size: 15px; border-radius: 8px; overflow: hidden;",
            "th": "background-color: #f8f9fa; color: #1d1d1f; padding: 12px 16px; text-align: left; border-bottom: 2px solid #e1e4e8; font-weight: 600;",
            "td": "padding: 12px 16px; border-bottom: 1px solid #e1e4e8; color: #333333;",
            "tr:hover": "background-color: #f8f9fa;"
        },
        "dark-mode": {
            "container": "max-width: 740px; margin: 0 auto; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial,sans-serif; font-size: 16px; line-height: 1.8 !important; color: #f5f5f5; background-color: #1c1c1e; word-wrap: break-word;",
            "h1": "font-size: 32px; font-weight: 700; color: #f5f5f5; line-height: 1.2; margin: 36px 0 20px; text-align: center; letter-spacing: 0.5px; position: relative;",
            "h1::after": "content: ''; position: absolute; bottom: -8px; left: 50%; transform: translateX(-50%); width: 60px; height: 3px; background: linear-gradient(90deg, #007aff, #ff2d55); border-radius: 2px;",
            "h2": "font-size: 24px; font-weight: 600; color: #f5f5f5; margin: 32px 0 16px; padding: 8px 0 12px 16px; border-left: 4px solid #007aff;",
            "h3": "font-size: 20px; font-weight: 600; color: #f5f5f5; margin: 28px 0 14px; padding: 6px 0 8px 12px; border-left: 3px solid #5856d6;",
            "p": "color: #f5f5f5; margin: 18px 0; line-height: 1.8; text-align: justify;",
            "strong": "color: #ffffff; font-weight: 600;",
            "em": "color: #a0a0a0; font-style: italic;",
            "a": "color: #007aff; text-decoration: none; font-weight: 500; border-bottom: 1px solid rgba(0, 122, 255, 0.5); transition: all 0.2s ease;",
            "a:hover": "border-bottom-color: #007aff;",
            "ul": "margin: 20px 0; padding-left: 28px; list-style-type: disc;",
            "ol": "margin: 20px 0; padding-left: 28px; list-style-type: decimal;",
            "li": "margin: 10px 0; line-height: 1.8; color: #f5f5f5;",
            "blockquote": "margin: 24px 0; padding: 16px 20px; background-color: rgba(88, 86, 214, 0.1); border-left: 4px solid #007aff; color: #f5f5f5; border-radius: 0 8px 8px 0; font-style: italic;",
            "code": "font-family: SFMono-Regular, Consolas, Menlo, monospace; font-size: 14px; padding: 3px 6px; background-color: rgba(88, 86, 214, 0.2); color: #5856d6; border-radius: 4px;",
            "pre": "margin: 24px 0; padding: 20px; background-color: rgba(28, 28, 30, 0.8); color: #f5f5f5; border-radius: 8px; overflow-x: auto; line-height: 1.6; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);",
            "hr": "margin: 32px 0; border: none; height: 1px; background-color: #383838;",
            "img": "max-width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2); margin: 20px auto;",
            "table": "width: 100%; margin: 20px 0; border-collapse: collapse; font-size: 15px; border-radius: 8px; overflow: hidden;",
            "th": "background-color: rgba(88, 86, 214, 0.2); color: #f5f5f5; padding: 12px 16px; text-align: left; border-bottom: 2px solid rgba(88, 86, 214, 0.3);",
            "td": "padding: 12px 16px; border-bottom: 1px solid #383838; color: #f5f5f5;",
            "tr:hover": "background-color: rgba(88, 86, 214, 0.1);"
        }
    }
}

def get_style(style_name):
    """Get style configuration by name"""
    return STYLES.get(style_name, {})

def list_styles():
    """List all available style names"""
    return list(STYLES.keys())