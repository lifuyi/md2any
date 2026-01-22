# Prompts Module

This module manages AI prompts used throughout the application. Prompts are stored as external text files for easier maintenance and versioning.

## Structure

```
prompts/
├── __init__.py                      # Prompt loader and caching system
├── text_to_markdown.txt             # Plain text to Markdown conversion prompt
├── wechat_html_formatting.txt       # Markdown to WeChat HTML formatting prompt
├── css_style_extraction.txt         # CSS style extraction prompt
└── README.md                        # This file
```

## Usage

### Loading Prompts

```python
from prompts import (
    get_text_to_markdown_prompt,
    get_wechat_html_formatting_prompt,
    get_css_style_extraction_prompt
)

# Load a prompt
prompt = get_text_to_markdown_prompt()

# Prompts are cached in memory after first load for performance
```

### Using Prompts in API Endpoints

```python
from prompts import get_text_to_markdown_prompt

messages = [
    {
        "role": "system",
        "content": get_text_to_markdown_prompt(),
    },
    {
        "role": "user",
        "content": "Your user message here"
    }
]

response = client.chat.completions.create(
    model="model-name",
    messages=messages,
    temperature=0.6
)
```

## Adding New Prompts

### Step 1: Create a new prompt file

Create a new file in the `prompts/` directory:

```
prompts/my_new_prompt.txt
```

Add your prompt content to this file.

### Step 2: Add a loader function

In `prompts/__init__.py`, add a new function:

```python
def get_my_new_prompt() -> str:
    """Get the my new prompt description."""
    return load_prompt("my_new_prompt")
```

### Step 3: Use it in your code

```python
from prompts import get_my_new_prompt

prompt = get_my_new_prompt()
```

## Prompt Management

### Caching

All prompts are cached in memory after first load. This improves performance by avoiding repeated file I/O.

### Cache Clearing (Testing)

```python
from prompts import clear_cache

clear_cache()  # Clears the cache (useful for testing)
```

### Error Handling

If a prompt file is missing, a `FileNotFoundError` will be raised with the file path:

```python
try:
    prompt = load_prompt("nonexistent")
except FileNotFoundError as e:
    print(f"Prompt not found: {e}")
```

## Best Practices

1. **Keep prompts focused**: Each prompt should have a single, clear purpose
2. **Use descriptive names**: Prompt file names should clearly indicate their purpose
3. **Document complex prompts**: Add comments to complex prompt files
4. **Version control**: Prompts are tracked in git, making it easy to review changes
5. **Test prompts independently**: Consider testing prompt outputs separately from the API

## Prompts Overview

### text_to_markdown.txt
Converts plain text to well-structured Markdown format with proper emphasis and hierarchy.

**Used by**: `/ai/convert-text` endpoint

### wechat_html_formatting.txt
Comprehensive guide for generating WeChat-compatible HTML with proper styling, spacing, and visual hierarchy.

**Used by**: `/ai/format-markdown` endpoint

### css_style_extraction.txt
Extracts visual design systems from web content and returns them as JSON with CSS styling.

**Used by**: `/ai/extract-style` endpoint
