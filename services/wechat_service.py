# -*- coding: utf-8 -*-
"""
WeChat integration service for draft management and token handling
"""

import logging
import requests
import markdown
from typing import Dict, Any
from pydantic import BaseModel
from renderers.markdown_renderer import MarkdownRenderer
from utils.markdown_utils import extract_title_from_markdown, preprocess_markdown

logger = logging.getLogger(__name__)

# Request/Response Models
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


class WeChatTokenResponse(BaseModel):
    """Response model for WeChat token"""
    access_token: str
    expires_in: int


# WeChat Service Functions
def get_access_token(appid: str, secret: str) -> str:
    """Get WeChat access token"""
    logger.info(f"Getting access token for appid: {appid}")
    
    url = f'https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid={appid}&secret={secret}'
    
    response = requests.get(url, timeout=10)
    result = response.json()
    
    # Check if WeChat API returned an error
    if 'errcode' in result and result['errcode'] != 0:
        logger.error(f"WeChat API error: {result}")
        error_msg = _get_error_message(result.get('errcode'), result.get('errmsg', 'Unknown error'))
        raise WeChatError(error_code=result['errcode'], error_msg=error_msg, original=result)
    
    logger.info("Successfully obtained access token")
    return result['access_token']


def send_markdown_to_draft(
    appid: str,
    secret: str,
    markdown_content: str,
    style: str = "wechat-default",
    renderer: MarkdownRenderer = None,
    themes: Dict[str, Any] = None,
    author: str = "",
    digest: str = "",
    content_source_url: str = "",
    thumb_media_id: str = "",
    need_open_comment: int = 1,
    only_fans_can_comment: int = 1
) -> Dict[str, Any]:
    """Send markdown content to WeChat draft box"""
    
    if renderer is None:
        renderer = MarkdownRenderer()
    
    if themes is None:
        themes = {}
    
    logger.info("Received request to send markdown to WeChat draft")
    
    try:
        # 1. Get access token
        access_token = get_access_token(appid, secret)
        
        # 2. Extract title
        title = extract_title_from_markdown(markdown_content)
        logger.info(f"Extracted title: {title}")
        
        # 3. Render markdown to HTML
        logger.info("Rendering markdown to HTML")
        processed_content = preprocess_markdown(markdown_content)
        
        # Apply theme styling
        theme_name = style
        if theme_name.endswith('.css'):
            theme_name = theme_name.replace('.css', '')
        
        if theme_name in themes:
            theme = themes[theme_name]
            styled_html = renderer.render(processed_content, theme, "light-mode", "wechat")
        else:
            # Fall back to basic markdown rendering
            styled_html = markdown.markdown(
                processed_content,
                extensions=['fenced_code', 'tables', 'nl2br']
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
            'author': author,
            'digest': digest,
            'content': encoded_content,
            'content_source_url': content_source_url,
            'need_open_comment': need_open_comment,
            'only_fans_can_comment': only_fans_can_comment
        }
        
        # Add thumb_media_id if provided
        if thumb_media_id and thumb_media_id.strip():
            article['thumb_media_id'] = thumb_media_id
        
        articles = {'articles': [article]}
        
        draft_response = requests.post(draft_url, json=articles, timeout=10)
        result = draft_response.json()
        
        if 'errcode' in result and result['errcode'] != 0:
            logger.error(f"WeChat API error: {result}")
            raise WeChatError(error_code=result['errcode'], error_msg=result.get('errmsg', 'Unknown error'), original=result)
        
        logger.info("Successfully sent to WeChat draft")
        return result
    
    except WeChatError:
        raise
    except Exception as e:
        logger.error(f"Exception sending to WeChat draft: {str(e)}")
        raise WeChatError(error_code=500, error_msg=f"发送到微信草稿箱失败: {str(e)}")


def send_content_to_draft(
    access_token: str,
    title: str,
    content: str,
    author: str = "",
    digest: str = "",
    content_source_url: str = "",
    thumb_media_id: str = "",
    need_open_comment: int = 1,
    only_fans_can_comment: int = 1
) -> Dict[str, Any]:
    """Send content directly to WeChat draft box using access token"""
    
    logger.info("Received direct draft request")
    
    if not access_token:
        raise WeChatError(error_code=400, error_msg="缺少access_token")
    
    try:
        draft_url = f'https://api.weixin.qq.com/cgi-bin/draft/add?access_token={access_token}'
        
        # Handle Unicode encoding
        encoded_title = title.encode('utf-8').decode('latin-1')
        encoded_content = content.encode('utf-8').decode('latin-1')
        
        article = {
            'title': encoded_title,
            'author': author,
            'digest': digest,
            'content': encoded_content,
            'content_source_url': content_source_url,
            'need_open_comment': need_open_comment,
            'only_fans_can_comment': only_fans_can_comment
        }
        
        if thumb_media_id and thumb_media_id.strip():
            article['thumb_media_id'] = thumb_media_id
        
        articles = {'articles': [article]}
        
        logger.info("Sending content to WeChat draft")
        draft_response = requests.post(draft_url, json=articles, timeout=10)
        result = draft_response.json()
        
        if 'errcode' in result and result['errcode'] != 0:
            logger.error(f"WeChat API error: {result}")
            raise WeChatError(error_code=result['errcode'], error_msg=result.get('errmsg', 'Unknown error'), original=result)
        
        logger.info("Successfully sent to WeChat draft")
        return result
    
    except WeChatError:
        raise
    except Exception as e:
        logger.error(f"Exception sending to WeChat draft: {str(e)}")
        raise WeChatError(error_code=500, error_msg=f"发送到微信草稿箱失败: {str(e)}")


def _get_error_message(errcode: int, default_msg: str) -> str:
    """Get descriptive error message for WeChat error codes"""
    error_messages = {
        40013: "无效的AppID，请检查微信公众号AppID是否正确",
        40001: "AppSecret错误，请检查微信公众号AppSecret是否正确",
        40002: "请检查公众号权限，确保已开通草稿箱功能",
        40164: "IP地址未在白名单中，请在微信公众号后台添加IP: 101.246.231.55",
    }
    return error_messages.get(errcode, default_msg)


class WeChatError(Exception):
    """Custom exception for WeChat API errors"""
    
    def __init__(self, error_code: int, error_msg: str, original: Dict[str, Any] = None):
        self.error_code = error_code
        self.error_msg = error_msg
        self.original = original or {}
        super().__init__(self.error_msg)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert error to dictionary for API response"""
        return {
            "errcode": self.error_code,
            "errmsg": self.error_msg,
            "original": self.original
        }
