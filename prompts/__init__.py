"""
Prompt management module for AI operations.
This module handles loading and caching of prompts from external files.
"""

import os
from pathlib import Path
from typing import Dict

# Cache for loaded prompts
_PROMPT_CACHE: Dict[str, str] = {}

PROMPTS_DIR = Path(__file__).parent


def load_prompt(prompt_name: str) -> str:
    """
    Load a prompt from the prompts directory.
    
    Args:
        prompt_name: Name of the prompt file (without .txt extension)
        
    Returns:
        The content of the prompt file
        
    Raises:
        FileNotFoundError: If the prompt file doesn't exist
    """
    if prompt_name in _PROMPT_CACHE:
        return _PROMPT_CACHE[prompt_name]
    
    prompt_path = PROMPTS_DIR / f"{prompt_name}.txt"
    
    if not prompt_path.exists():
        raise FileNotFoundError(f"Prompt '{prompt_name}' not found at {prompt_path}")
    
    with open(prompt_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    _PROMPT_CACHE[prompt_name] = content
    return content


def get_text_to_markdown_prompt() -> str:
    """Get the text to markdown conversion prompt."""
    return load_prompt("text_to_markdown")


def get_wechat_html_formatting_prompt() -> str:
    """Get the WeChat HTML formatting prompt."""
    return load_prompt("wechat_html_formatting")


def get_css_style_extraction_prompt() -> str:
    """Get the CSS style extraction prompt."""
    return load_prompt("css_style_extraction")


def clear_cache():
    """Clear the prompt cache. Useful for testing."""
    _PROMPT_CACHE.clear()
