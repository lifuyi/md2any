# -*- coding: utf-8 -*-
"""
Utility functions for markdown processing
"""

import re


def extract_title_from_markdown(markdown_content: str) -> str:
    """Extract title from markdown content (first H1 heading)"""
    lines = markdown_content.split('\n')
    for line in lines:
        if line.startswith('#') and not line.startswith('##'):
            return line.replace('#', '', 1).strip()
    return '默认标题'


def preprocess_markdown(content: str) -> str:
    """Preprocess markdown content for better rendering"""
    # Normalize list item format
    content = re.sub(r'^(\s*(?:\d+\.|\-|\*)\s+[^:\n]+)\n\s*:\s*(.+?)$', r'\1: \2', content, flags=re.MULTILINE)
    content = re.sub(r'^(\s*(?:\d+\.|\-|\*)\s+.+?:)\s*\n\s+(.+?)$', r'\1 \2', content, flags=re.MULTILINE)
    content = re.sub(r'^(\s*(?:\d+\.|\-|\*)\s+[^:\n]+)\n:\s*(.+?)$', r'\1: \2', content, flags=re.MULTILINE)
    content = re.sub(r'^(\s*(?:\d+\.|\-|\*)\s+.+?)\n\n\s+(.+?)$', r'\1 \2', content, flags=re.MULTILINE)
    return content
