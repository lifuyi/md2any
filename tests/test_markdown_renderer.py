# -*- coding: utf-8 -*-
"""
Unit tests for MarkdownRenderer
"""

import pytest
from renderers.markdown_renderer import MarkdownRenderer


@pytest.fixture
def renderer():
    """Create a MarkdownRenderer instance"""
    return MarkdownRenderer()


@pytest.fixture
def sample_markdown():
    """Sample markdown content for testing"""
    return """# Test Heading

This is a **bold** text and this is *italic*.

## Subheading

- Item 1
- Item 2
- Item 3

> This is a blockquote

```python
def hello():
    print("Hello, World!")
```

| Column 1 | Column 2 |
|----------|----------|
| Cell 1   | Cell 2   |
"""


class TestMarkdownRenderer:
    """Tests for MarkdownRenderer class"""
    
    def test_renderer_initialization(self, renderer):
        """Test that renderer initializes correctly"""
        assert renderer is not None
        assert renderer.md is not None
    
    def test_render_basic_markdown(self, renderer, sample_markdown):
        """Test basic markdown rendering"""
        theme = {
            "styles": {
                "p": "color: #333;",
                "h1": "color: #000; font-size: 28px;",
                "strong": "font-weight: bold;"
            }
        }
        
        result = renderer.render(sample_markdown, theme, "light-mode", "wechat")
        
        assert result is not None
        assert len(result) > 0
        assert "<section" in result or "<div" in result
    
    def test_render_with_dark_mode(self, renderer, sample_markdown):
        """Test rendering with dark mode"""
        theme = {
            "styles": {
                "p": "color: #333;",
                "container": "background-color: #ffffff;"
            }
        }
        
        result = renderer.render(sample_markdown, theme, "dark-mode", "wechat")
        
        assert result is not None
        assert len(result) > 0
    
    def test_render_with_different_platforms(self, renderer, sample_markdown):
        """Test rendering for different platforms"""
        theme = {
            "styles": {
                "p": "color: #333;",
                "a": "color: #0066cc;"
            }
        }
        
        platforms = ["wechat", "xiaohongshu", "zhihu"]
        
        for platform in platforms:
            result = renderer.render(sample_markdown, theme, "light-mode", platform)
            assert result is not None
            assert len(result) > 0
    
    def test_render_with_custom_styles(self, renderer, sample_markdown):
        """Test rendering with custom styles"""
        custom_styles = {
            "p": "font-size: 16px; line-height: 1.8;",
            "h1": "font-size: 32px; color: #2c3e50;",
            "strong": "color: #e74c3c;"
        }
        
        result = renderer.render_with_custom_styles(
            sample_markdown, custom_styles, "light-mode", "wechat"
        )
        
        assert result is not None
        assert len(result) > 0
    
    def test_markdown_reset_after_render(self, renderer, sample_markdown):
        """Test that markdown parser resets after rendering"""
        theme = {"styles": {"p": "color: #333;"}}
        
        # First render
        result1 = renderer.render(sample_markdown, theme)
        
        # Second render should not include content from first render
        short_markdown = "# Title\n\nContent"
        result2 = renderer.render(short_markdown, theme)
        
        # Result2 should be much shorter than result1
        assert len(result2) < len(result1)
    
    def test_render_empty_markdown(self, renderer):
        """Test rendering empty markdown"""
        theme = {"styles": {"p": "color: #333;"}}
        
        result = renderer.render("", theme)
        
        # Should return valid HTML even for empty input
        assert result is not None
    
    def test_dark_mode_color_conversion(self, renderer):
        """Test dark mode color conversions"""
        style = "#ffffff background-color; #333333 color;"
        
        result = renderer._apply_dark_mode_adjustments_to_style(style)
        
        # Check that colors were converted
        assert "#1a1a1a" in result or "#ffffff" not in result
        assert "#e8e8e8" in result or "#333333" not in result
    
    def test_wechat_style_important_flag(self, renderer):
        """Test that WeChat styles get !important flag"""
        style = "color: #333; font-size: 16px;"
        
        result = renderer._adjust_for_wechat_style(style)
        
        # Check that !important was added
        assert "!important" in result
        assert result.count("!important") >= 2


class TestImageGridProcessing:
    """Tests for image grid processing"""
    
    def test_single_image_no_grid(self):
        """Test that single images are not wrapped in grid"""
        renderer = MarkdownRenderer()
        html = '<p><img src="test.jpg" alt="test"></p>'
        
        result = renderer._process_image_grids(html)
        
        # Single image should not be wrapped
        assert "img-grid" not in result
    
    def test_multiple_images_grid(self):
        """Test that multiple images create grid containers"""
        renderer = MarkdownRenderer()
        html = '<p><img src="1.jpg"></p>\n<p><img src="2.jpg"></p>'
        
        result = renderer._process_image_grids(html)
        
        # Multiple images should be wrapped in grid
        assert "img-grid" in result
