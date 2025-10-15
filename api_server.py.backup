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

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes
app.debug = False
app.config['JSON_AS_ASCII'] = False



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
        styles = [f for f in os.listdir('./themes') if f.endswith('.css')]
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
    style_name = data.get('style', 'default')

    # Convert Markdown to HTML
    html_content = markdown.markdown(
        md_content,
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
        full_html = f'''
<!DOCTYPE html>
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
        from bs4 import BeautifulSoup
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
    style = data.get('style', 'sample.css')
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
    
    # 3. 渲染Markdown为HTML（使用现有的/render接口逻辑）
    logger.info("Rendering Markdown to HTML")
    try:
        # 处理dash separator逻辑
        if dash_separator:
            logger.info("Processing dash separator mode")
            # 按 --- 分割内容
            sections = markdown_content.split('---')
            logger.info(f"Found {len(sections)} sections after splitting by ---")
            
            html_sections = []
            for i, section in enumerate(sections):
                section = section.strip()
                if not section:
                    continue
                    
                logger.info(f"Processing section {i+1}: {section[:50]}...")
                
                # 渲染每个section的Markdown
                section_html = markdown.markdown(
                    section,
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
                
                # 第一个section用普通div，其余用section-card
                if i == 0:
                    html_sections.append(f'<div class="content-card">{section_html}</div>')
                else:
                    html_sections.append(f'<div class="section-card">{section_html}</div>')
            
            # 合并所有section的HTML内容
            html_content = ''.join(html_sections)
            logger.info(f"Generated HTML with {len(html_sections)} sections")
        else:
            # 正常模式：直接渲染整个内容
            html_content = markdown.markdown(
                markdown_content,
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
        
        # 加载CSS并内联
        custom_css = ''
        try:
            if '..' not in style and style.endswith('.css'):
                with open(f'./themes/{style}', 'r', encoding='utf-8') as f:
                    custom_css = f.read()
                    # 解析CSS变量
                    custom_css = resolve_css_variables(custom_css)
        except FileNotFoundError:
            pass
        
        # 创建完整的HTML文档用于CSS内联
        if custom_css:
            # 如果使用dash separator，我们需要为所有section应用样式
            if dash_separator:
                # 为每个section添加正确的类名，然后整体包裹在markdown-body中
                wrapped_html_content = f'<div class="markdown-body">{html_content}</div>'
            else:
                # 正常模式直接使用
                wrapped_html_content = f'<div class="markdown-body">{html_content}</div>'
                
            full_html = f'''
<!DOCTYPE html>
<html>
<head>
<style>
{custom_css}
</style>
</head>
<body>
{wrapped_html_content}
</body>
</html>'''
            
            # 执行CSS内联
            inlined_html = inline(full_html)
            
            # 提取body中的内容并用<section>标签包裹，同时保持markdown-body容器
            from bs4 import BeautifulSoup
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
        else:
            # 如果没有CSS，直接用<section>标签包裹内容
            wrapped_content = f'<section><div class="markdown-body">{html_content}</div></section>'
        
        logger.info("Successfully rendered and inlined HTML")
    except Exception as e:
        logger.error(f"Exception occurred while rendering Markdown: {str(e)}")
        return jsonify({'errcode': 500, 'errmsg': f'渲染Markdown失败: {str(e)}'}), 500
    
    # 4. 发送到微信草稿箱
    logger.info("Sending to WeChat draft")
    draft_url = f'https://api.weixin.qq.com/cgi-bin/draft/add?access_token={access_token}'
    
    # 处理Unicode编码问题
    encoded_title = title.encode('utf-8').decode('latin-1') if isinstance(title, str) else title
    encoded_content = wrapped_content.encode('utf-8').decode('latin-1') if isinstance(wrapped_content, str) else wrapped_content
    
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