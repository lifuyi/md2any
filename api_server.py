from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import markdown
import os
import requests
import json
import logging
import time
from css_inline import inline
import cssutils
import re
import base64
from bs4 import BeautifulSoup, NavigableString
import uuid

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def resolve_css_variables(css_content):
    """
    解析CSS中的变量并将其替换为实际值
    """
    # 提取所有CSS变量定义
    variables = {}
    
    # 匹配CSS变量定义的正则表达式
    var_def_pattern = r'(--[\w-]+)\s*:\s*([^;]+);'
    
    # 查找所有变量定义
    for match in re.finditer(var_def_pattern, css_content):
        var_name = match.group(1)
        var_value = match.group(2).strip()
        # 移除可能的尾随逗号或空格
        var_value = var_value.rstrip(', ')
        variables[var_name] = var_value
    
    # 替换CSS中的变量引用
    resolved_css = css_content
    
    # 替换变量引用为实际值
    for var_name, var_value in variables.items():
        # 使用正则表达式替换var()函数引用
        # 匹配 var(--variable-name) 或 var(--variable-name, fallback)
        # 更精确地处理可能的空格和换行
        pattern = r'var\s*\(\s*' + re.escape(var_name) + r'\s*(?:,[^)]*)?\)'
        resolved_css = re.sub(pattern, var_value, resolved_css)
    
    # 移除变量定义行，但保留其他CSS规则
    # 使用更安全的方式移除变量定义
    resolved_css = re.sub(r'--[\w-]+\s*:\s*[^;]+;\s*', '', resolved_css)
    
    return resolved_css

# HuaEditor样式定义
HUAEDITOR_STYLES = {
    'wechat-default': {
        'name': '默认公众号风格',
        'styles': {
            'container': 'max-width: 740px; margin: 0 auto; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-size: 16px; line-height: 1.8 !important; color: #3f3f3f !important; background-color: #fff !important; word-wrap: break-word;',
            'h1': 'font-size: 24px; font-weight: 600; color: #2c3e50 !important; line-height: 1.4 !important; margin: 32px 0 16px; padding-bottom: 8px; border-bottom: 2px solid #3498db;',
            'h2': 'font-size: 22px; font-weight: 600; color: #2c3e50 !important; line-height: 1.4 !important; margin: 28px 0 14px; padding-left: 12px; border-left: 4px solid #3498db;',
            'h3': 'font-size: 20px; font-weight: 600; color: #34495e !important; line-height: 1.4 !important; margin: 24px 0 12px;',
            'h4': 'font-size: 18px; font-weight: 600; color: #34495e !important; line-height: 1.4 !important; margin: 20px 0 10px;',
            'h5': 'font-size: 17px; font-weight: 600; color: #34495e !important; line-height: 1.4 !important; margin: 18px 0 9px;',
            'h6': 'font-size: 16px; font-weight: 600; color: #34495e !important; line-height: 1.4 !important; margin: 16px 0 8px;',
            'p': 'margin: 16px 0 !important; line-height: 1.8 !important; color: #3f3f3f !important;',
            'strong': 'font-weight: 600; color: #2c3e50 !important;',
            'em': 'font-style: italic; color: #555 !important;',
            'a': 'color: #3498db !important; text-decoration: none; border-bottom: 1px solid #3498db;',
            'ul': 'margin: 16px 0; padding-left: 24px;',
            'ol': 'margin: 16px 0; padding-left: 24px;',
            'li': 'margin: 8px 0; line-height: 1.8 !important;',
            'blockquote': 'margin: 16px 0; padding: 10px 16px; background-color: #fafafa !important; border-left: 3px solid #999; color: #666 !important; line-height: 1.6 !important;',
            'code': 'font-family: Consolas, Monaco, "Courier New", monospace; font-size: 14px; padding: 2px 6px; background-color: #f5f5f5 !important; color: #e74c3c !important; border-radius: 3px;',
            'pre': 'margin: 20px 0; padding: 16px; background-color: #2d2d2d !important; border-radius: 8px; overflow-x: auto; line-height: 1.6 !important;',
            'hr': 'margin: 32px 0; border: none; border-top: 1px solid #e0e0e0;',
            'img': 'max-width: 100%; max-height: 600px !important; height: auto; display: block; margin: 20px auto; border-radius: 8px;',
            'table': 'width: 100%; margin: 20px 0; border-collapse: collapse; font-size: 15px;',
            'th': 'background-color: #f0f0f0 !important; padding: 10px; text-align: left; border: 1px solid #e0e0e0; font-weight: 600;',
            'td': 'padding: 10px; border: 1px solid #e0e0e0;',
            'tr': 'border-bottom: 1px solid #e0e0e0;',
        }
    },
    'wechat-tech': {
        'name': '技术风格',
        'styles': {
            'container': 'max-width: 740px; margin: 0 auto; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-size: 16px; line-height: 1.75 !important; color: #2c3e50 !important; background-color: #fff !important; word-wrap: break-word;',
            'h1': 'font-size: 26px; font-weight: 700; color: #1a1a1a !important; line-height: 1.3 !important; margin: 36px 0 18px; padding: 0 0 12px; border-bottom: 3px solid #0066cc;',
            'h2': 'font-size: 22px; font-weight: 700; color: #1a1a1a !important; line-height: 1.3 !important; margin: 32px 0 16px; padding-left: 16px; padding-top: 4px; padding-bottom: 4px; border-left: 5px solid #00a67d; background: linear-gradient(to right, #f0f9ff 0%, transparent 100%);',
            'h3': 'font-size: 20px; font-weight: 600; color: #2c3e50 !important; line-height: 1.4 !important; margin: 28px 0 14px; padding-left: 12px; border-left: 3px solid #ff9800;',
            'h4': 'font-size: 18px; font-weight: 600; color: #34495e !important; line-height: 1.4 !important; margin: 24px 0 12px;',
            'h5': 'font-size: 17px; font-weight: 600; color: #34495e !important; line-height: 1.4 !important; margin: 20px 0 10px;',
            'h6': 'font-size: 16px; font-weight: 600; color: #34495e !important; line-height: 1.4 !important; margin: 18px 0 9px;',
            'p': 'margin: 18px 0 !important; line-height: 1.8 !important; color: #3a3a3a !important;',
            'strong': 'font-weight: 700; color: #1a1a1a !important; background-color: #fff3cd !important; padding: 2px 4px; border-radius: 8px;',
            'em': 'font-style: italic; color: #666 !important;',
            'a': 'color: #0066cc !important; text-decoration: none; border-bottom: 1px solid #0066cc;',
            'ul': 'margin: 18px 0; padding-left: 28px;',
            'ol': 'margin: 18px 0; padding-left: 28px;',
            'li': 'margin: 10px 0; line-height: 1.8 !important; color: #3a3a3a !important;',
            'blockquote': 'margin: 16px 0; padding: 10px 16px; background-color: #f5f9fc !important; border-left: 3px solid #2196f3; color: #555 !important; line-height: 1.6 !important;',
            'code': 'font-family: "Fira Code", Consolas, Monaco, "Courier New", monospace; font-size: 14px; padding: 3px 6px; background-color: #ffe6e6 !important; color: #d63031 !important; border-radius: 8px; font-weight: 500;',
            'pre': 'margin: 24px 0; padding: 20px; background-color: #1e1e1e !important; border-radius: 8px; overflow-x: auto; line-height: 1.6 !important; box-shadow: 0 2px 8px rgba(0,0,0,0.1);',
            'hr': 'margin: 36px 0; border: none; height: 2px; background: linear-gradient(to right, transparent, #0066cc, transparent);',
            'img': 'max-width: 100%; max-height: 600px !important; height: auto; display: block; margin: 24px auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);',
            'table': 'width: 100%; margin: 24px 0; border-collapse: collapse; font-size: 15px; box-shadow: 0 1px 4px rgba(0,0,0,0.1);',
            'th': 'background-color: #0066cc !important; color: #fff !important; padding: 12px; text-align: left; border: 1px solid #0052a3; font-weight: 600;',
            'td': 'padding: 12px; border: 1px solid #e0e0e0; background-color: #fff !important;',
            'tr': 'border-bottom: 1px solid #e0e0e0;',
        }
    },
    'wechat-elegant': {
        'name': '优雅简约',
        'styles': {
            'container': 'max-width: 720px; margin: 0 auto; padding: 30px 20px; font-family: "Songti SC", "SimSun", Georgia, serif; font-size: 17px; line-height: 2 !important; color: #333 !important; background-color: #fefefe !important; word-wrap: break-word;',
            'h1': 'font-size: 28px; font-weight: 400; color: #1a1a1a !important; line-height: 1.5 !important; margin: 48px 0 24px; text-align: center; letter-spacing: 2px;',
            'h2': 'font-size: 24px; font-weight: 400; color: #2c2c2c !important; line-height: 1.5 !important; margin: 40px 0 20px; text-align: center; letter-spacing: 1px;',
            'h3': 'font-size: 20px; font-weight: 400; color: #3a3a3a !important; line-height: 1.6 !important; margin: 32px 0 16px; letter-spacing: 0.5px;',
            'h4': 'font-size: 18px; font-weight: 400; color: #444 !important; line-height: 1.6 !important; margin: 28px 0 14px;',
            'h5': 'font-size: 17px; font-weight: 400; color: #555 !important; line-height: 1.6 !important; margin: 24px 0 12px;',
            'h6': 'font-size: 16px; font-weight: 400; color: #666 !important; line-height: 1.6 !important; margin: 20px 0 10px;',
            'p': 'margin: 20px 0 !important; line-height: 2.2 !important; color: #444 !important; text-indent: 2em; letter-spacing: 0.5px;',
            'strong': 'font-weight: 600; color: #1a1a1a !important;',
            'em': 'font-style: italic; color: #666 !important;',
            'a': 'color: #8b7355 !important; text-decoration: none; border-bottom: 1px dotted #8b7355;',
            'ul': 'margin: 20px 0; padding-left: 32px;',
            'ol': 'margin: 20px 0; padding-left: 32px;',
            'li': 'margin: 12px 0; line-height: 2 !important;',
            'blockquote': 'margin: 20px auto; padding: 12px 24px; background-color: transparent !important; border-left: 2px solid #ccc; color: #666 !important; max-width: 600px; line-height: 1.8 !important;',
            'code': 'font-family: Menlo, Monaco, "Courier New", monospace; font-size: 14px; padding: 2px 6px; background-color: #f5f5f5 !important; color: #8b4513 !important; border-radius: 3px;',
            'pre': 'margin: 28px 0; padding: 20px; background-color: #f9f9f9 !important; border: 1px solid #e5e5e5; border-radius: 8px; overflow-x: auto; line-height: 1.8 !important;',
            'hr': 'margin: 48px auto; border: none; text-align: center; height: 1px; background-color: #e0e0e0 !important; max-width: 200px;',
            'img': 'max-width: 100%; max-height: 600px !important; height: auto; display: block; margin: 32px auto; border-radius: 8px;',
            'table': 'width: 100%; margin: 28px 0; border-collapse: collapse; font-size: 15px;',
            'th': 'background-color: #f8f8f8 !important; padding: 12px; text-align: left; border-bottom: 2px solid #d0d0d0; font-weight: 400; color: #555 !important;',
            'td': 'padding: 12px; border-bottom: 1px solid #e5e5e5;',
            'tr': 'border-bottom: 1px solid #e5e5e5;',
        }
    },
    # 添加更多样式（为简洁起见，只保留几个示例）
    'wechat-deepread': {
        'name': '深度阅读',
        'styles': {
            'container': 'max-width: 680px; margin: 0 auto; padding: 32px 24px; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-size: 18px; line-height: 1.75 !important; color: #1a1a1a !important; background-color: #fff !important; word-wrap: break-word; letter-spacing: 0.01em;',
            'h1': 'font-size: 32px; font-weight: 700; color: #0a0a0a !important; line-height: 1.2 !important; margin: 48px 0 24px; letter-spacing: -0.02em;',
            'h2': 'font-size: 28px; font-weight: 700; color: #0a0a0a !important; line-height: 1.3 !important; margin: 40px 0 20px; letter-spacing: -0.01em;',
            'h3': 'font-size: 22px; font-weight: 600; color: #1a1a1a !important; line-height: 1.4 !important; margin: 32px 0 16px;',
            'h4': 'font-size: 20px; font-weight: 600; color: #2a2a2a !important; line-height: 1.5 !important; margin: 28px 0 14px;',
            'h5': 'font-size: 18px; font-weight: 600; color: #3a3a3a !important; line-height: 1.5 !important; margin: 24px 0 12px;',
            'h6': 'font-size: 18px; font-weight: 500; color: #4a4a4a !important; line-height: 1.5 !important; margin: 20px 0 10px;',
            'p': 'margin: 24px 0 !important; line-height: 1.8 !important; color: #1a1a1a !important;',
            'strong': 'font-weight: 700; color: #0a0a0a !important;',
            'em': 'font-style: italic; color: #2a2a2a !important;',
            'a': 'color: #0066cc !important; text-decoration: none; border-bottom: 1px solid #0066cc;',
            'ul': 'margin: 24px 0; padding-left: 32px;',
            'ol': 'margin: 24px 0; padding-left: 32px;',
            'li': 'margin: 12px 0; line-height: 1.8 !important; color: #1a1a1a !important;',
            'blockquote': 'margin: 32px 0; padding: 20px 24px; background-color: #f8f9fa !important; border-left: 4px solid #0a0a0a; color: #1a1a1a !important; font-size: 17px; line-height: 1.7 !important; font-style: normal;',
            'code': 'font-family: "SF Mono", Consolas, Monaco, "Courier New", monospace; font-size: 16px; padding: 2px 6px; background-color: #f5f5f5 !important; color: #d73a49 !important; border-radius: 3px;',
            'pre': 'margin: 32px 0; padding: 24px; background-color: #f6f8fa !important; border-radius: 8px; overflow-x: auto; line-height: 1.6 !important; border: 1px solid #e1e4e8;',
            'hr': 'margin: 48px 0; border: none; height: 1px; background-color: #e1e4e8 !important;',
            'img': 'max-width: 100%; max-height: 600px !important; height: auto; display: block; margin: 32px auto; border-radius: 8px;',
            'table': 'width: 100%; margin: 32px 0; border-collapse: collapse; font-size: 16px;',
            'th': 'background-color: #f6f8fa !important; padding: 12px 16px; text-align: left; border: 1px solid #e1e4e8; font-weight: 600; color: #1a1a1a !important;',
            'td': 'padding: 12px 16px; border: 1px solid #e1e4e8; color: #1a1a1a !important;',
            'tr': 'border-bottom: 1px solid #e1e4e8;',
        }
    }
}

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes
app.debug = False
app.config['JSON_AS_ASCII'] = False

def process_image_protocol(html_content):
    """
    处理 img:// 协议 - 这是HuaEditor的图片处理方式
    在实际应用中，这会将 img://imageId 的引用替换为实际的图片数据
    这里我们假设图片存储在本地，使用base64编码
    """
    # 创建临时图片，这里我们用占位符替代
    # 在实际应用中，这里会从数据库或文件系统中获取图片数据
    import re
    
    def replace_img_protocol(match):
        full_match = match.group(0)
        alt_text = match.group(1)
        image_id = match.group(2)
        
        # 在实际应用中，这里会查找真实的图片数据
        # 暂时返回一个占位符图片
        placeholder_img = f'![{alt_text}](https://via.placeholder.com/600x400.png?text=Image+{image_id})'
        return placeholder_img
    
    # 这是一个简化版本，实际应用中需要从数据库获取图片
    html_content = re.sub(r'!\[([^\]]*)\]\(img://([^)]+)\)', replace_img_protocol, html_content)
    return html_content

def apply_inline_styles(html_content, style_name):
    """
    应用内联样式 - 这是HuaEditor的样式应用方式
    """
    if style_name not in HUAEDITOR_STYLES:
        style_name = 'wechat-default'  # 默认样式
    
    styles = HUAEDITOR_STYLES[style_name]['styles']
    
    # 使用BeautifulSoup来处理HTML
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # 首先处理图片网格布局
    soup = group_consecutive_images(soup)
    
    # 应用样式到各个元素
    for selector, css_props in styles.items():
        if selector in ['pre', 'code', 'pre code']:
            continue  # 跳过代码块的特殊处理
        
        # 根据选择器查找元素并应用样式
        if selector == 'container':
            # 为整个内容创建容器
            container = soup.new_tag('div')
            container['style'] = css_props
            container.extend(soup.contents)
            soup = BeautifulSoup('', 'html.parser')
            soup.append(container)
        else:
            elements = soup.select(selector)
            for element in elements:
                # 如果是图片且在网格容器内，跳过样式应用
                if element.name == 'img' and element.find_parent('div', class_='image-grid'):
                    continue
                
                # 获取当前样式并追加新样式
                current_style = element.get('style', '')
                if current_style:
                    new_style = current_style + '; ' + css_props
                else:
                    new_style = css_props
                element['style'] = new_style
    
    return str(soup)

def group_consecutive_images(soup):
    """
    将连续的图片分组 - 这是HuaEditor的图片网格功能
    """
    # 查找所有的图片元素
    images = soup.find_all('img')
    
    if not images:
        return soup
    
    # 找到连续的图片组
    groups = []
    current_group = []
    
    for img in images:
        # 检查图片的父元素
        parent = img.parent
        # 获取所有图片元素以确定连续性
        all_images = soup.find_all('img')
        
        # 简化的连续图片分组逻辑
        # 如果两个图片元素在DOM中相邻，则认为是连续的
        if current_group:
            # 检查当前图片是否与前一张图片连续
            prev_img = current_group[-1]
            # 在简化版本中，我们假设所有图片都在一起
            current_group.append(img)
        else:
            current_group.append(img)
    
    # 创建图片网格容器
    if len(current_group) >= 2:
        groups.append(current_group)
    
    # 为每组图片创建网格
    for group in groups:
        if len(group) < 2:
            continue
            
        # 创建网格容器
        grid_container = soup.new_tag('div', **{
            'class': 'image-grid',
            'data-image-count': str(len(group))
        })
        
        # 根据图片数量设置网格样式
        image_count = len(group)
        if image_count == 2:
            grid_style = 'display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 20px auto; max-width: 100%; align-items: start;'
        elif image_count == 3:
            grid_style = 'display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 20px auto; max-width: 100%; align-items: start;'
        elif image_count == 4:
            grid_style = 'display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 20px auto; max-width: 100%; align-items: start;'
        else:  # 5张及以上
            grid_style = 'display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 20px auto; max-width: 100%; align-items: start;'
        
        grid_container['style'] = grid_style
        
        # 将图片添加到网格中
        for img in group:
            img_wrapper = soup.new_tag('div')
            img_wrapper['style'] = 'width: 100%; height: auto; overflow: hidden;'
            
            # 克隆图片并设置样式
            img_clone = img.extract()  # 移除原图片
            img_clone['style'] = 'width: 100%; height: auto; display: block; border-radius: 8px;'
            
            img_wrapper.append(img_clone)
            grid_container.append(img_wrapper)
        
        # 将网格添加到文档中合适的位置
        if group:
            first_img_parent = group[0].parent
            first_img_parent.insert_after(grid_container)
    
    return soup

@app.route('/styles/<path:path>', methods=['GET', 'POST'])
@app.route('/themes/<path:path>', methods=['GET', 'POST'])
def handle_styles(path):
    if request.method == 'POST':
        # Handle saving CSS file
        try:
            # Security: Ensure path is a valid CSS filename and doesn't contain path traversal characters.
            if '..' not in path and path.endswith('.css'):
                css_content = request.get_data(as_text=True)
                with open(f'./themes/{path}', 'w', encoding='utf-8') as f:
                    f.write(css_content)
                return jsonify({'status': 'success', 'message': 'CSS file saved successfully'}), 200
            else:
                return jsonify({'status': 'error', 'message': 'Invalid file path'}), 400
        except Exception as e:
            logger.error(f"Failed to save CSS file: {str(e)}")
            return jsonify({'status': 'error', 'message': f'Failed to save CSS file: {str(e)}'}), 500
    else:
        # GET request - serve the CSS file
        return send_from_directory('./themes', path)

@app.route('/')
def index():
    return send_from_directory('.', 'frontend.html')

@app.route('/<path:path>')
def send_static(path):
    response = send_from_directory('.', path)
    # Add cache control headers for CSS files
    if path.endswith('.css'):
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
    return response

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok'}), 200

@app.route('/styles')
def get_styles():
    try:
        # 返回HuaEditor样式和现有CSS文件
        styles = [f for f in os.listdir('./themes') if f.endswith('.css')]
        
        # 添加HuaEditor的样式
        for style_key in HUAEDITOR_STYLES.keys():
            style_name = style_key + '.css'
            if style_name not in styles:
                styles.append(style_name)
        
        return jsonify(styles)
    except FileNotFoundError:
        # Fallback to current directory if themes folder doesn't exist
        styles = [f for f in os.listdir('.') if f.endswith('.css')]
        return jsonify(styles)

@app.route('/styles/refresh', methods=['POST'])
def refresh_styles():
    """Force refresh of CSS styles cache"""
    try:
        styles = [f for f in os.listdir('./themes') if f.endswith('.css')]
        for style_key in HUAEDITOR_STYLES.keys():
            style_name = style_key + '.css'
            if style_name not in styles:
                styles.append(style_name)
        
        return jsonify({
            'status': 'success',
            'message': 'Styles cache refreshed',
            'styles': styles,
            'timestamp': int(time.time() * 1000)
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Failed to refresh styles: {str(e)}'
        }), 500


@app.route('/render', methods=['POST'])
def render_markdown():
    data = request.get_json()
    md_content = data.get('md', '')
    style_name = data.get('style', 'wechat-default')

    # 检查是否是HuaEditor样式名称
    if style_name.endswith('.css'):
        style_name = style_name.replace('.css', '')
    
    # 预处理Markdown
    processed_content = preprocess_markdown(md_content)
    
    # Convert Markdown to HTML
    html_content = markdown.markdown(
        processed_content,
        extensions=[
            'fenced_code',
            'tables',
            'nl2br',
            'pymdownx.superfences',
            'pymdownx.magiclink'
        ],
        extension_configs={
            'pymdownx.superfences': {
                'custom_fences': [
                    {
                        'name': 'mermaid',
                        'class': 'mermaid',
                        'format': lambda source, language, css_class, options, md, **kwargs: f'<div class="{css_class}">{source}</div>'
                    }
                ]
            }
        }
    )
    
    # 处理 img:// 协议
    html_content = process_image_protocol(html_content)
    
    # 应用内联样式
    styled_html = apply_inline_styles(html_content, style_name)
    
    # 创建完整的HTML文档用于CSS内联
    if style_name in HUAEDITOR_STYLES:
        # 获取容器样式
        container_style = HUAEDITOR_STYLES[style_name]['styles'].get('container', '')
        
        # 创建完整的HTML文档
        full_html = f'''<!DOCTYPE html>
<html>
<head>
</head>
<body>
{styled_html}
</body>
</html>'''
        
        # 提取body中的内容
        soup = BeautifulSoup(full_html, 'html.parser')
        body_content = ''.join([str(child) for child in soup.body.children])
        
        return body_content, 200, {'Content-Type': 'text/html'}
    else:
        # 如果不是HuaEditor样式，使用原始方法
        try:
            # Load the selected stylesheet
            custom_css = ''
            try:
                # Security: Ensure style_name is a valid filename and doesn't contain path traversal characters.
                if '..' not in style_name and style_name.endswith('.css'):
                    with open(f'./themes/{style_name}', 'r', encoding='utf-8') as f:
                        custom_css = f.read()
                        # 解析CSS变量
                        custom_css = resolve_css_variables(custom_css)
            except FileNotFoundError:
                # Handle case where style file doesn't exist
                pass
            
            # 创建完整的HTML文档用于CSS内联
            if custom_css:
                full_html = f'''<!DOCTYPE html>
<html>
<head>
<style>
{custom_css}
</style>
</head>
<body>
<div class="markdown-body">
{html_content}
</div>
</body>
</html>'''
                
                # 执行CSS内联
                inlined_html = inline(full_html)
                
                # 提取body中的内容，保持markdown-body容器，并用<section>标签包裹
                soup = BeautifulSoup(inlined_html, 'html.parser')
                
                # 获取markdown-body容器的背景色样式
                markdown_body = soup.find(class_='markdown-body')
                container_bg_style = ""
                if markdown_body and markdown_body.get('style'):
                    # 提取背景相关的样式
                    style_attr = markdown_body.get('style')
                    bg_styles = []
                    for style_part in style_attr.split(';'):
                        style_part = style_part.strip()
                        if style_part.startswith(('background', 'padding', 'border-radius', 'box-shadow')):
                            bg_styles.append(style_part)
                    if bg_styles:
                        container_bg_style = f' style="{"; ".join(bg_styles)}"'
                
                # 获取body标签的内部内容（不包括body标签本身）
                body_content = ''.join([str(child) for child in soup.body.children])
                wrapped_content = f'<section{container_bg_style}>{body_content}</section>'
                
                return wrapped_content, 200, {'Content-Type': 'text/html'}
            else:
                # 如果没有CSS，直接用<section>标签包裹内容
                wrapped_content = f'<section><div class="markdown-body">{html_content}</div></section>'
                return wrapped_content, 200, {'Content-Type': 'text/html'}
        except:
            # 如果有错误，返回处理后的HTML
            wrapped_content = f'<section><div class="markdown-body">{styled_html}</div></section>'
            return wrapped_content, 200, {'Content-Type': 'text/html'}


def preprocess_markdown(content):
    """预处理Markdown内容 - 模仿HuaEditor的处理方式"""
    # 规范化列表项格式
    import re
    content = re.sub(r'^(\s*(?:\d+\.|\-|\*)\s+[^:\n]+)\n\s*:\s*(.+?)$', r'\1: \2', content, flags=re.MULTILINE)
    content = re.sub(r'^(\s*(?:\d+\.|\-|\*)\s+.+?:)\s*\n\s+(.+?)$', r'\1 \2', content, flags=re.MULTILINE)
    content = re.sub(r'^(\s*(?:\d+\.|\-|\*)\s+[^:\n]+)\n:\s*(.+?)$', r'\1: \2', content, flags=re.MULTILINE)
    content = re.sub(r'^(\s*(?:\d+\.|\-|\*)\s+.+?)\n\n\s+(.+?)$', r'\1 \2', content, flags=re.MULTILINE)
    return content


@app.route('/wechat/access_token', methods=['POST'])
def get_wechat_access_token():
    """
    获取微信access_token
    根据微信官方文档：https://developers.weixin.qq.com/doc/service/api/base/api_getaccesstoken.html
    """
    data = request.get_json()
    appid = data.get('appid')
    secret = data.get('secret')
    
    print(f"Received request with appid: {appid}, secret: {'*' * len(secret) if secret else None}")
    
    if not appid:
        print("Missing appid")
        return jsonify({'errcode': 400, 'errmsg': '缺少appid'}), 400
    
    if not secret:
        print("Missing secret")
        return jsonify({'errcode': 400, 'errmsg': '缺少secret'}), 400

    # 构造微信API请求
    url = f'https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid={appid}&secret={secret}'
    print(f"Requesting WeChat API: {url}")
    
    try:
        response = requests.get(url, timeout=10)
        print(f"WeChat API response status: {response.status_code}")
        result = response.json()
        print(f"WeChat API response data: {result}")
        
        # 检查微信API是否返回错误
        if 'errcode' in result and result['errcode'] != 0:
            print(f"WeChat API returned error: {result}")
            return jsonify(result), 400
        
        print("Successfully obtained access_token")
        return jsonify(result), 200
    except Exception as e:
        print(f"Exception occurred: {str(e)}")
        return jsonify({'errcode': 500, 'errmsg': f'请求微信API失败: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'errcode': 500, 'errmsg': f'请求微信API失败: {str(e)}'}), 500

@app.route('/wechat/send_draft', methods=['POST'])
def send_markdown_to_wechat_draft():
    """
    将Markdown内容发送到微信草稿箱（完整流程）
    """
    logger.info("Received request to /wechat/send_draft")
    data = request.get_json()
    logger.info(f"Received send draft request data: {data}")
    
    # 获取参数
    appid = data.get('appid')
    secret = data.get('secret')
    markdown_content = data.get('markdown')
    style = data.get('style', 'wechat-default.css')
    thumb_media_id = data.get('thumb_media_id', '')
    dash_separator = data.get('dashseparator', False)
    
    # 验证必需参数
    if not appid:
        return jsonify({'errcode': 400, 'errmsg': '缺少appid'}), 400
    
    if not secret:
        return jsonify({'errcode': 400, 'errmsg': '缺少secret'}), 400
    
    if not markdown_content:
        return jsonify({'errcode': 400, 'errmsg': '缺少Markdown内容'}), 400
    
    # 1. 获取access_token
    logger.info("Getting access_token from WeChat API")
    token_url = f'https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid={appid}&secret={secret}'
    
    try:
        token_response = requests.get(token_url, timeout=10)
        token_result = token_response.json()
        
        if 'errcode' in token_result and token_result['errcode'] != 0:
            logger.error(f"Failed to get access_token: {token_result}")
            return jsonify(token_result), 400
        
        access_token = token_result['access_token']
        logger.info("Successfully obtained access_token")
    except Exception as e:
        logger.error(f"Exception occurred while getting access_token: {str(e)}")
        return jsonify({'errcode': 500, 'errmsg': f'获取access_token失败: {str(e)}'}), 500
    
    # 2. 提取标题
    title = '默认标题'
    lines = markdown_content.split('\n')
    for line in lines:
        if line.startswith('#') and not line.startswith('##'):
            title = line.replace('#', '', 1).strip()
            break
    
    logger.info(f"Extracted title: {title}")
    
    # 3. 渲染Markdown为HTML（使用HuaEditor的渲染逻辑）
    logger.info("Rendering Markdown to HTML with HuaEditor logic")
    try:
        # 检查样式名称是否包含.css后缀
        style_name = style
        if style_name.endswith('.css'):
            style_name = style_name.replace('.css', '')
        
        # 预处理Markdown
        processed_content = preprocess_markdown(markdown_content)
        
        # 转换Markdown为HTML
        html_content = markdown.markdown(
            processed_content,
            extensions=[
                'fenced_code',
                'tables',
                'nl2br',
                'pymdownx.superfences',
                'pymdownx.magiclink'
            ],
            extension_configs={
                'pymdownx.superfences': {
                    'custom_fences': [
                        {
                            'name': 'mermaid',
                            'class': 'mermaid',
                            'format': lambda source, language, css_class, options, md, **kwargs: f'<div class="{css_class}">{source}</div>'
                        }
                    ]
                }
            }
        )
        
        # 处理 img:// 协议
        html_content = process_image_protocol(html_content)
        
        # 应用内联样式
        styled_html = apply_inline_styles(html_content, style_name)
        
        # 为styled_html添加适当的容器
        final_html = f'<div class="markdown-body">{styled_html}</div>'
        
        logger.info("Successfully rendered and applied styles")
    except Exception as e:
        logger.error(f"Exception occurred while rendering Markdown: {str(e)}")
        return jsonify({'errcode': 500, 'errmsg': f'渲染Markdown失败: {str(e)}'}), 500
    
    # 4. 发送到微信草稿箱
    logger.info("Sending to WeChat draft")
    draft_url = f'https://api.weixin.qq.com/cgi-bin/draft/add?access_token={access_token}'
    
    # 处理Unicode编码问题
    encoded_title = title.encode('utf-8').decode('latin-1') if isinstance(title, str) else title
    encoded_content = final_html.encode('utf-8').decode('latin-1') if isinstance(final_html, str) else final_html
    
    article = {
        'title': encoded_title,
        'author': '',
        'digest': '',
        'content': encoded_content,
        'content_source_url': '',
        'need_open_comment': 1,
        'only_fans_can_comment': 1
    }
    
    # 只有当thumb_media_id不为空时才添加
    if thumb_media_id and thumb_media_id.strip() != '':
        article['thumb_media_id'] = thumb_media_id
        logger.info(f"Adding thumb_media_id: {thumb_media_id}")
    
    articles = {
        'articles': [article]
    }
    
    try:
        logger.info(f"Sending request to WeChat API: {draft_url}")
        logger.info(f"Request data: {articles}")
        draft_response = requests.post(draft_url, json=articles, timeout=10)
        logger.info(f"WeChat API response status: {draft_response.status_code}")
        result = draft_response.json()
        logger.info(f"WeChat API response data: {result}")
        
        if 'errcode' in result and result['errcode'] != 0:
            logger.error(f"WeChat API returned error: {result}")
            return jsonify(result), 400
        
        logger.info("Successfully sent to WeChat draft")
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Exception occurred while sending to WeChat draft: {str(e)}")
        return jsonify({'errcode': 500, 'errmsg': f'发送到微信草稿箱失败: {str(e)}'}), 500

@app.route('/wechat/draft', methods=['POST'])
def send_to_wechat_draft():
    """
    发送内容到微信草稿箱
    根据微信官方文档：https://developers.weixin.qq.com/doc/service/api/draftbox/draftmanage/api_draft_add.html
    """
    logger.info("Received request to /wechat/draft")
    data = request.get_json()
    logger.info(f"Received draft request data: {data}")
    
    access_token = data.get('access_token')
    title = data.get('title', '默认标题')
    content = data.get('content')
    author = data.get('author', '')
    digest = data.get('digest', '')
    content_source_url = data.get('content_source_url', '')
    thumb_media_id = data.get('thumb_media_id', '')
    need_open_comment = data.get('need_open_comment', 1)
    only_fans_can_comment = data.get('only_fans_can_comment', 1)

    if not access_token:
        return jsonify({'errcode': 400, 'errmsg': '缺少access_token'}), 400
    
    if not content:
        return jsonify({'errcode': 400, 'errmsg': '缺少内容'}), 400

    # 构造微信API请求
    url = f'https://api.weixin.qq.com/cgi-bin/draft/add?access_token={access_token}'
    
    # 构造文章内容
    article = {
        'title': title,
        'author': author,
        'digest': digest,
        'content': content,
        'content_source_url': content_source_url,
        'need_open_comment': need_open_comment,
        'only_fans_can_comment': only_fans_can_comment
    }
    
    # 只有当thumb_media_id不为空时才添加
    if thumb_media_id and thumb_media_id.strip() != '':
        article['thumb_media_id'] = thumb_media_id
        logger.info(f"Adding thumb_media_id: {thumb_media_id}")
    else:
        logger.info("No thumb_media_id provided")
    
    articles = {
        'articles': [article]
    }
    
    logger.info(f"Sending article to WeChat: {articles}")
    
    try:
        logger.info(f"Sending request to WeChat API: {url}")
        logger.info(f"Request data: {articles}")
        response = requests.post(url, json=articles, timeout=10)
        logger.info(f"WeChat API response status: {response.status_code}")
        result = response.json()
        logger.info(f"WeChat API response data: {result}")
        
        if 'errcode' in result and result['errcode'] != 0:
            logger.info(f"WeChat API returned error: {result}")
            return jsonify(result), 400
        
        logger.info("Successfully sent to WeChat draft")
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Exception occurred: {str(e)}")
        return jsonify({'errcode': 500, 'errmsg': f'请求微信API失败: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'errcode': 500, 'errmsg': f'请求微信API失败: {str(e)}'}), 500

if __name__ == '__main__':
    import os
    import sys
    
    # Check if we're in development mode
    dev_mode = '--dev' in sys.argv or os.getenv('FLASK_ENV') == 'development'
    
    if dev_mode:
        print("🔥 Starting in DEVELOPMENT mode with auto-reload enabled")
        app.run(host='0.0.0.0', port=5002, debug=True, use_reloader=True)
    else:
        print("🚀 Starting in PRODUCTION mode")
        app.run(host='0.0.0.0', port=5002, debug=False)
