# -*- coding: utf-8 -*-
"""
Unit tests for markdown utilities
"""

import pytest
from utils.markdown_utils import extract_title_from_markdown, preprocess_markdown


class TestExtractTitle:
    """Tests for extract_title_from_markdown function"""
    
    def test_extract_h1_title(self):
        """Test extracting H1 heading as title"""
        markdown = "# My Title\n\nContent here"
        
        title = extract_title_from_markdown(markdown)
        
        assert title == "My Title"
    
    def test_extract_title_with_spaces(self):
        """Test extracting title with leading/trailing spaces"""
        markdown = "#   Title with spaces   \n\nContent"
        
        title = extract_title_from_markdown(markdown)
        
        assert title == "Title with spaces"
    
    def test_extract_title_ignores_h2(self):
        """Test that H2 headings are ignored"""
        markdown = "## Subheading\n\n# Main Title\n\nContent"
        
        title = extract_title_from_markdown(markdown)
        
        assert title == "Main Title"
    
    def test_extract_title_ignores_h3_and_higher(self):
        """Test that H3+ headings are ignored"""
        markdown = "### Level 3\n#### Level 4\n# Main\n\nContent"
        
        title = extract_title_from_markdown(markdown)
        
        assert title == "Main"
    
    def test_default_title_when_no_h1(self):
        """Test default title when no H1 found"""
        markdown = "## Subheading\n\nNo title here"
        
        title = extract_title_from_markdown(markdown)
        
        assert title == "默认标题"
    
    def test_empty_markdown_default_title(self):
        """Test default title for empty markdown"""
        title = extract_title_from_markdown("")
        
        assert title == "默认标题"
    
    def test_extract_title_chinese(self):
        """Test extracting Chinese titles"""
        markdown = "# 我的标题\n\n内容"
        
        title = extract_title_from_markdown(markdown)
        
        assert title == "我的标题"
    
    def test_extract_title_with_special_chars(self):
        """Test extracting title with special characters"""
        markdown = "# Title with (special) [chars] & symbols!\n\nContent"
        
        title = extract_title_from_markdown(markdown)
        
        assert "special" in title
        assert "chars" in title


class TestPreprocessMarkdown:
    """Tests for preprocess_markdown function"""
    
    def test_preprocess_empty_string(self):
        """Test preprocessing empty string"""
        result = preprocess_markdown("")
        
        assert result == ""
    
    def test_preprocess_normal_markdown(self):
        """Test preprocessing normal markdown (no changes)"""
        markdown = "# Title\n\nContent with **bold** and *italic*"
        
        result = preprocess_markdown(markdown)
        
        # Should contain original content
        assert "Title" in result
        assert "Content" in result
    
    def test_preprocess_preserves_content(self):
        """Test that preprocessing preserves main content"""
        markdown = "# Title\n\n- Item 1\n- Item 2\n\nParagraph"
        
        result = preprocess_markdown(markdown)
        
        assert "Title" in result
        assert "Item 1" in result
        assert "Item 2" in result
        assert "Paragraph" in result
    
    def test_preprocess_with_lists(self):
        """Test preprocessing with various list formats"""
        markdown = "- Item 1\n* Item 2\n1. Item 3"
        
        result = preprocess_markdown(markdown)
        
        # Should preserve all items
        assert "Item 1" in result
        assert "Item 2" in result
        assert "Item 3" in result
    
    def test_preprocess_multiline_content(self):
        """Test preprocessing multiline content"""
        markdown = """# Title

## Subsection

Content line 1
Content line 2

- List item 1
- List item 2"""
        
        result = preprocess_markdown(markdown)
        
        assert len(result) > 0
        assert "Content line 1" in result
        assert "List item" in result
    
    def test_preprocess_idempotent(self):
        """Test that preprocessing is idempotent"""
        markdown = "# Title\n\nContent\n\n- Item 1\n- Item 2"
        
        result1 = preprocess_markdown(markdown)
        result2 = preprocess_markdown(result1)
        
        # Second preprocessing should not change result
        assert result1 == result2
    
    def test_preprocess_with_code_blocks(self):
        """Test preprocessing with code blocks"""
        markdown = """# Title

```python
def hello():
    print("Hello")
```

Content after code"""
        
        result = preprocess_markdown(markdown)
        
        assert "python" in result
        assert "hello" in result
        assert "Content after code" in result
