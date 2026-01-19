# -*- coding: utf-8 -*-
"""
Unit tests for WeChat service
"""

import pytest
from pydantic import ValidationError
from services.wechat_service import (
    WeChatTokenRequest,
    WeChatDraftRequest,
    WeChatDirectDraftRequest,
    WeChatError
)


class TestWeChatRequestModels:
    """Tests for WeChat request models"""
    
    def test_wechat_token_request(self):
        """Test creating WeChatTokenRequest"""
        request = WeChatTokenRequest(appid="test_appid", secret="test_secret")
        
        assert request.appid == "test_appid"
        assert request.secret == "test_secret"
    
    def test_wechat_draft_request_minimal(self):
        """Test creating WeChatDraftRequest with minimal fields"""
        request = WeChatDraftRequest(
            appid="test_appid",
            secret="test_secret",
            markdown="# Test\n\nContent"
        )
        
        assert request.appid == "test_appid"
        assert request.secret == "test_secret"
        assert request.markdown == "# Test\n\nContent"
        assert request.style == "wechat-default"
    
    def test_wechat_draft_request_full(self):
        """Test creating WeChatDraftRequest with all fields"""
        request = WeChatDraftRequest(
            appid="test_appid",
            secret="test_secret",
            markdown="# Test",
            style="custom-style",
            thumb_media_id="media123",
            author="John Doe",
            digest="Summary",
            content_source_url="https://example.com",
            need_open_comment=0,
            only_fans_can_comment=1
        )
        
        assert request.style == "custom-style"
        assert request.thumb_media_id == "media123"
        assert request.author == "John Doe"
        assert request.digest == "Summary"
        assert request.need_open_comment == 0
    
    def test_wechat_direct_draft_request(self):
        """Test creating WeChatDirectDraftRequest"""
        request = WeChatDirectDraftRequest(
            access_token="token123",
            title="Test Title",
            content="<h1>Test</h1>"
        )
        
        assert request.access_token == "token123"
        assert request.title == "Test Title"
        assert request.content == "<h1>Test</h1>"
    
    def test_wechat_direct_draft_with_optional_fields(self):
        """Test WeChatDirectDraftRequest with optional fields"""
        request = WeChatDirectDraftRequest(
            access_token="token123",
            title="Title",
            content="Content",
            author="Author",
            digest="Summary",
            thumb_media_id="media_id"
        )
        
        assert request.author == "Author"
        assert request.digest == "Summary"
        assert request.thumb_media_id == "media_id"


class TestWeChatRequestValidation:
    """Tests for WeChat request validation"""
    
    def test_token_request_requires_appid(self):
        """Test that appid is required"""
        with pytest.raises(ValidationError):
            WeChatTokenRequest(secret="secret")
    
    def test_token_request_requires_secret(self):
        """Test that secret is required"""
        with pytest.raises(ValidationError):
            WeChatTokenRequest(appid="appid")
    
    def test_draft_request_requires_appid(self):
        """Test that draft request requires appid"""
        with pytest.raises(ValidationError):
            WeChatDraftRequest(secret="secret", markdown="# Test")
    
    def test_draft_request_requires_secret(self):
        """Test that draft request requires secret"""
        with pytest.raises(ValidationError):
            WeChatDraftRequest(appid="appid", markdown="# Test")
    
    def test_draft_request_requires_markdown(self):
        """Test that draft request requires markdown"""
        with pytest.raises(ValidationError):
            WeChatDraftRequest(appid="appid", secret="secret")
    
    def test_direct_draft_requires_access_token(self):
        """Test that access token is required"""
        with pytest.raises(ValidationError):
            WeChatDirectDraftRequest(title="Title", content="Content")
    
    def test_direct_draft_requires_title(self):
        """Test that title is required"""
        with pytest.raises(ValidationError):
            WeChatDirectDraftRequest(access_token="token", content="Content")
    
    def test_direct_draft_requires_content(self):
        """Test that content is required"""
        with pytest.raises(ValidationError):
            WeChatDirectDraftRequest(access_token="token", title="Title")


class TestWeChatError:
    """Tests for WeChatError exception"""
    
    def test_wechat_error_creation(self):
        """Test creating WeChatError"""
        error = WeChatError(error_code=400, error_msg="Bad request")
        
        assert error.error_code == 400
        assert error.error_msg == "Bad request"
    
    def test_wechat_error_with_original(self):
        """Test WeChatError with original response"""
        original = {"errcode": 400, "errmsg": "Bad request"}
        error = WeChatError(error_code=400, error_msg="Bad request", original=original)
        
        assert error.original == original
    
    def test_wechat_error_to_dict(self):
        """Test converting WeChatError to dict"""
        error = WeChatError(error_code=40001, error_msg="AppSecret错误")
        error_dict = error.to_dict()
        
        assert error_dict["errcode"] == 40001
        assert error_dict["errmsg"] == "AppSecret错误"
    
    def test_wechat_error_is_exception(self):
        """Test that WeChatError is an Exception"""
        error = WeChatError(error_code=500, error_msg="Server error")
        
        assert isinstance(error, Exception)
    
    def test_wechat_error_message(self):
        """Test WeChatError message"""
        error = WeChatError(error_code=500, error_msg="Internal server error")
        
        assert str(error) == "Internal server error"
    
    def test_wechat_error_default_original(self):
        """Test WeChatError default original value"""
        error = WeChatError(error_code=400, error_msg="Error")
        
        assert error.original == {}


class TestWeChatDefaults:
    """Tests for default values in WeChat models"""
    
    def test_draft_request_default_style(self):
        """Test default style in draft request"""
        request = WeChatDraftRequest(
            appid="app",
            secret="secret",
            markdown="# Test"
        )
        
        assert request.style == "wechat-default"
    
    def test_draft_request_default_thumb_media_id(self):
        """Test default empty thumb_media_id"""
        request = WeChatDraftRequest(
            appid="app",
            secret="secret",
            markdown="# Test"
        )
        
        assert request.thumb_media_id == ""
    
    def test_draft_request_default_author(self):
        """Test default empty author"""
        request = WeChatDraftRequest(
            appid="app",
            secret="secret",
            markdown="# Test"
        )
        
        assert request.author == ""
    
    def test_draft_request_default_digest(self):
        """Test default empty digest"""
        request = WeChatDraftRequest(
            appid="app",
            secret="secret",
            markdown="# Test"
        )
        
        assert request.digest == ""
    
    def test_draft_request_default_comments_enabled(self):
        """Test default comment settings"""
        request = WeChatDraftRequest(
            appid="app",
            secret="secret",
            markdown="# Test"
        )
        
        assert request.need_open_comment == 1
        assert request.only_fans_can_comment == 1
    
    def test_direct_draft_default_author(self):
        """Test default empty author in direct draft"""
        request = WeChatDirectDraftRequest(
            access_token="token",
            title="Title",
            content="Content"
        )
        
        assert request.author == ""
    
    def test_direct_draft_default_digest(self):
        """Test default empty digest in direct draft"""
        request = WeChatDirectDraftRequest(
            access_token="token",
            title="Title",
            content="Content"
        )
        
        assert request.digest == ""


class TestWeChatModelSerialization:
    """Tests for model serialization"""
    
    def test_token_request_serialization(self):
        """Test serializing token request"""
        request = WeChatTokenRequest(appid="test_appid", secret="test_secret")
        data = request.model_dump()
        
        assert data["appid"] == "test_appid"
        assert data["secret"] == "test_secret"
    
    def test_draft_request_serialization(self):
        """Test serializing draft request"""
        request = WeChatDraftRequest(
            appid="app",
            secret="secret",
            markdown="# Test",
            author="John"
        )
        data = request.model_dump()
        
        assert data["appid"] == "app"
        assert data["markdown"] == "# Test"
        assert data["author"] == "John"
    
    def test_direct_draft_serialization(self):
        """Test serializing direct draft request"""
        request = WeChatDirectDraftRequest(
            access_token="token123",
            title="Title",
            content="Content"
        )
        data = request.model_dump()
        
        assert data["access_token"] == "token123"
        assert data["title"] == "Title"
        assert data["content"] == "Content"
