# -*- coding: utf-8 -*-
"""
Unit tests for theme management
"""

import pytest
from themes import (
    load_themes,
    get_default_themes,
    get_enhanced_default_styles,
    get_enhanced_dark_styles
)


class TestThemeManagement:
    """Tests for theme management functions"""
    
    def test_get_default_themes(self):
        """Test loading default themes"""
        themes = get_default_themes()
        
        assert themes is not None
        assert isinstance(themes, dict)
        assert "wechat-default" in themes
    
    def test_default_theme_structure(self):
        """Test that default themes have required structure"""
        themes = get_default_themes()
        theme = themes["wechat-default"]
        
        assert "name" in theme
        assert isinstance(theme["name"], str)
        assert len(theme["name"]) > 0
    
    def test_get_enhanced_default_styles(self):
        """Test getting enhanced default styles"""
        styles = get_enhanced_default_styles()
        
        assert styles is not None
        assert isinstance(styles, dict)
        assert len(styles) > 0
    
    def test_enhanced_styles_contain_elements(self):
        """Test that enhanced styles contain key HTML elements"""
        styles = get_enhanced_default_styles()
        
        required_elements = ["h1", "h2", "h3", "p", "a", "strong", "em", "code", "blockquote"]
        for element in required_elements:
            assert element in styles, f"Missing style for {element}"
    
    def test_get_enhanced_dark_styles(self):
        """Test getting enhanced dark mode styles"""
        styles = get_enhanced_dark_styles()
        
        assert styles is not None
        assert isinstance(styles, dict)
        assert len(styles) > 0
    
    def test_dark_styles_have_light_counterpart(self):
        """Test that dark styles match light style keys"""
        light_styles = get_enhanced_default_styles()
        dark_styles = get_enhanced_dark_styles()
        
        # Dark styles should have same keys as light styles
        assert light_styles.keys() == dark_styles.keys()
    
    def test_dark_styles_are_different_from_light(self):
        """Test that dark styles are actually different"""
        light_styles = get_enhanced_default_styles()
        dark_styles = get_enhanced_dark_styles()
        
        # Check at least some styles are different
        different_count = 0
        for key in light_styles:
            if light_styles[key] != dark_styles[key]:
                different_count += 1
        
        # At least 50% of styles should be different
        assert different_count > len(light_styles) * 0.5
    
    def test_load_themes_returns_dict(self):
        """Test that load_themes returns a dictionary"""
        themes = load_themes()
        
        assert themes is not None
        assert isinstance(themes, dict)
    
    def test_load_themes_has_default_fallback(self):
        """Test that load_themes has default fallback"""
        themes = load_themes()
        
        # Should have at least wechat-default theme
        assert len(themes) > 0
    
    def test_style_values_are_non_empty_strings(self):
        """Test that all style values are non-empty strings"""
        styles = get_enhanced_default_styles()
        
        for key, value in styles.items():
            assert isinstance(value, str)
            assert len(value) > 0, f"Style for {key} is empty"
    
    def test_styles_contain_css_properties(self):
        """Test that styles contain actual CSS properties"""
        styles = get_enhanced_default_styles()
        
        # Pick a few styles and check for CSS properties
        test_styles = ["p", "h1", "a"]
        for style_key in test_styles:
            style_value = styles[style_key]
            # Should contain at least one CSS property
            assert ":" in style_value, f"No CSS property in {style_key}"
            assert ";" in style_value, f"No CSS terminator in {style_key}"
