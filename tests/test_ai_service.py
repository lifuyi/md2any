# -*- coding: utf-8 -*-
"""
Unit tests for AI service
"""

import pytest
from pydantic import ValidationError
from services.ai_service import (
    AIRequest, AIResponse,
    GenerateMarkdownRequest, GenerateMarkdownResponse,
    TextToMarkdownRequest, TextToMarkdownResponse,
    FormatMarkdownRequest, FormatMarkdownResponse
)


class TestAIRequestModels:
    """Tests for AI request/response models"""
    
    def test_ai_request_basic(self):
        """Test creating basic AIRequest"""
        request = AIRequest(prompt="Test prompt")
        
        assert request.prompt == "Test prompt"
        assert request.context == ""
    
    def test_ai_request_with_context(self):
        """Test creating AIRequest with context"""
        request = AIRequest(prompt="Test", context="Background info")
        
        assert request.prompt == "Test"
        assert request.context == "Background info"
    
    def test_ai_response_creation(self):
        """Test creating AIResponse"""
        response = AIResponse(
            response="Test response",
            success=True,
            message="Success"
        )
        
        assert response.response == "Test response"
        assert response.success is True
        assert response.message == "Success"
    
    def test_generate_markdown_request(self):
        """Test GenerateMarkdownRequest"""
        request = GenerateMarkdownRequest(prompt="Write about Python")
        
        assert request.prompt == "Write about Python"
    
    def test_generate_markdown_response(self):
        """Test GenerateMarkdownResponse"""
        response = GenerateMarkdownResponse(
            markdown="# Python\n\nContent"
        )
        
        assert "# Python" in response.markdown
        assert response.success is True
    
    def test_text_to_markdown_request_default_style(self):
        """Test TextToMarkdownRequest with default style"""
        request = TextToMarkdownRequest(text="Plain text")
        
        assert request.text == "Plain text"
        assert request.style == "standard"
        assert request.preserve_formatting is True
    
    def test_text_to_markdown_request_custom_style(self):
        """Test TextToMarkdownRequest with custom style"""
        request = TextToMarkdownRequest(
            text="Plain text",
            style="academic",
            preserve_formatting=False
        )
        
        assert request.style == "academic"
        assert request.preserve_formatting is False
    
    def test_format_markdown_request(self):
        """Test FormatMarkdownRequest"""
        markdown = "# Title\n\nContent"
        request = FormatMarkdownRequest(markdown=markdown)
        
        assert request.markdown == markdown
    
    def test_format_markdown_response(self):
        """Test FormatMarkdownResponse"""
        response = FormatMarkdownResponse(
            html="<h1>Title</h1><p>Content</p>"
        )
        
        assert "<h1>" in response.html
        assert response.success is True


class TestAIRequestValidation:
    """Tests for request validation"""
    
    def test_ai_request_requires_prompt(self):
        """Test that AIRequest requires prompt"""
        with pytest.raises(ValidationError):
            AIRequest()
    
    def test_generate_markdown_requires_prompt(self):
        """Test that GenerateMarkdownRequest requires prompt"""
        with pytest.raises(ValidationError):
            GenerateMarkdownRequest()
    
    def test_text_to_markdown_requires_text(self):
        """Test that TextToMarkdownRequest requires text"""
        with pytest.raises(ValidationError):
            TextToMarkdownRequest()
    
    def test_format_markdown_requires_markdown(self):
        """Test that FormatMarkdownRequest requires markdown"""
        with pytest.raises(ValidationError):
            FormatMarkdownRequest()


class TestTextToMarkdownStyles:
    """Tests for text-to-markdown style options"""
    
    def test_standard_style_option(self):
        """Test standard style option"""
        request = TextToMarkdownRequest(text="Text", style="standard")
        assert request.style == "standard"
    
    def test_academic_style_option(self):
        """Test academic style option"""
        request = TextToMarkdownRequest(text="Text", style="academic")
        assert request.style == "academic"
    
    def test_blog_style_option(self):
        """Test blog style option"""
        request = TextToMarkdownRequest(text="Text", style="blog")
        assert request.style == "blog"
    
    def test_technical_style_option(self):
        """Test technical style option"""
        request = TextToMarkdownRequest(text="Text", style="technical")
        assert request.style == "technical"
    
    def test_preserve_formatting_options(self):
        """Test preserve_formatting boolean option"""
        request1 = TextToMarkdownRequest(text="Text", preserve_formatting=True)
        request2 = TextToMarkdownRequest(text="Text", preserve_formatting=False)
        
        assert request1.preserve_formatting is True
        assert request2.preserve_formatting is False


class TestResponseValidation:
    """Tests for response validation"""
    
    def test_ai_response_defaults(self):
        """Test AIResponse default values"""
        response = AIResponse(response="Test")
        
        assert response.success is True
        assert response.message == "AI response generated successfully"
    
    def test_generate_markdown_response_defaults(self):
        """Test GenerateMarkdownResponse default values"""
        response = GenerateMarkdownResponse(markdown="# Test")
        
        assert response.success is True
        assert response.message == "Markdown generated successfully"
    
    def test_text_to_markdown_response_defaults(self):
        """Test TextToMarkdownResponse default values"""
        response = TextToMarkdownResponse(markdown="# Test")
        
        assert response.success is True
        assert response.message == "Text converted to markdown successfully"
    
    def test_format_markdown_response_defaults(self):
        """Test FormatMarkdownResponse default values"""
        response = FormatMarkdownResponse(html="<h1>Test</h1>")
        
        assert response.success is True
        assert response.message == "Markdown formatted successfully"


class TestModelSerialization:
    """Tests for model serialization"""
    
    def test_ai_request_serialization(self):
        """Test AIRequest can be serialized to dict"""
        request = AIRequest(prompt="Test", context="Context")
        data = request.model_dump()
        
        assert data["prompt"] == "Test"
        assert data["context"] == "Context"
    
    def test_ai_response_serialization(self):
        """Test AIResponse can be serialized"""
        response = AIResponse(response="Answer")
        data = response.model_dump()
        
        assert data["response"] == "Answer"
        assert data["success"] is True
    
    def test_text_to_markdown_request_serialization(self):
        """Test TextToMarkdownRequest serialization"""
        request = TextToMarkdownRequest(text="Text", style="blog")
        data = request.model_dump()
        
        assert data["text"] == "Text"
        assert data["style"] == "blog"
