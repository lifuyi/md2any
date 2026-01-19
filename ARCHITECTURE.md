# Architecture Documentation

## Overview

The `md2any` application has been refactored from a monolithic 1,759-line `api.py` into a modular, maintainable architecture following SOLID principles. This document outlines the new structure, responsibilities, and interactions between components.

## Project Structure

```
md2any/
├── api.py                          # Main FastAPI application and routing
├── themes.py                       # Theme management and styling
├── requirements.txt                # Python dependencies
├── pyproject.toml                  # Project configuration
├── pytest.ini                      # Pytest configuration
│
├── renderers/                      # Rendering components
│   ├── __init__.py
│   └── markdown_renderer.py        # HTML rendering engine
│
├── services/                       # Business logic services
│   ├── __init__.py
│   ├── ai_service.py               # GLM AI integration
│   └── wechat_service.py           # WeChat API integration
│
├── utils/                          # Utility functions
│   ├── __init__.py
│   └── markdown_utils.py           # Text processing utilities
│
├── tests/                          # Test suite
│   ├── __init__.py
│   ├── test_markdown_renderer.py
│   ├── test_themes.py
│   ├── test_markdown_utils.py
│   ├── test_ai_service.py
│   └── test_wechat_service.py
│
└── static/                         # Frontend assets
    ├── index.html
    ├── core.js
    ├── features.js
    └── modules/                    # JavaScript modules
```

## Module Responsibilities

### Core Modules

#### `api.py` (~1,295 lines)
**Purpose**: Main application entry point and HTTP endpoint routing

**Key Responsibilities**:
- FastAPI application initialization and configuration
- CORS middleware setup
- Route definitions and endpoint handlers
- Request/response mapping
- Static file serving
- Theme loading and initialization

**Key Classes**:
- `FastAPI` app instance
- Request/Response Pydantic models (MarkdownRequest, CustomStyleRequest, etc.)

**Key Functions**:
- Endpoint handlers: `/render`, `/wechat/*`, `/ai/*`, `/custom-style/*`

**Dependencies**:
- `renderers.markdown_renderer.MarkdownRenderer`
- `services.ai_service` (AI functions)
- `services.wechat_service` (WeChat functions)
- `themes.load_themes()`
- `utils.markdown_utils` (utility functions)

---

#### `renderers/markdown_renderer.py` (~271 lines)
**Purpose**: Convert markdown to styled HTML with theme support

**Key Responsibilities**:
- Markdown to HTML conversion
- Theme styling application
- Platform-specific adjustments (WeChat, XiaoHongShu, Zhihu)
- Dark mode transformations
- Image grid layout processing

**Key Classes**:
- `MarkdownRenderer`: Main rendering engine with methods:
  - `render()`: Apply theme to markdown
  - `render_with_custom_styles()`: Apply custom styles
  - `_apply_theme_styling()`: Apply inline styles to HTML
  - `_apply_dark_mode_adjustments_to_style()`: Dark mode conversion
  - `_adjust_for_wechat_style()`: WeChat-specific adjustments
  - `_process_image_grids()`: Group consecutive images

**Dependencies**:
- `markdown`: Markdown parsing
- `BeautifulSoup`: HTML manipulation
- `bs4`: HTML parsing

**Design Pattern**: Strategy pattern for platform-specific adjustments

---

#### `themes.py` (~97 lines)
**Purpose**: Theme configuration and management

**Key Responsibilities**:
- Load theme definitions from `styles.py`
- Provide default theme fallbacks
- Supply enhanced style presets for light and dark modes
- Theme structure validation

**Key Functions**:
- `load_themes()`: Load themes from styles module
- `get_default_themes()`: Return default theme definitions
- `get_enhanced_default_styles()`: Return light mode styles
- `get_enhanced_dark_styles()`: Return dark mode styles

**Theme Structure**:
```python
{
    "theme_name": {
        "name": "Display Name",
        "h1": "CSS styles...",
        "p": "CSS styles...",
        # ... other elements
    }
}
```

**Dependencies**:
- Optional: `styles.STYLES` (from styles.py)

---

#### `services/ai_service.py` (~276 lines)
**Purpose**: GLM AI integration for content generation and processing

**Key Responsibilities**:
- GLM API client initialization and management
- Content generation from prompts
- Text-to-markdown conversion
- Markdown formatting to HTML
- System prompt management

**Key Classes**:
- `AIRequest`: Pydantic model for AI assistance requests
- `AIResponse`: Pydantic model for AI assistance responses
- `GenerateMarkdownRequest/Response`: Markdown generation models
- `TextToMarkdownRequest/Response`: Text conversion models
- `FormatMarkdownRequest/Response`: HTML formatting models

**Key Functions**:
- `get_glm_client()`: Initialize OpenAI client for GLM
- `ensure_glm_client()`: Singleton pattern for client management
- `ai_assist()`: General AI assistance
- `generate_markdown()`: Generate markdown from topic
- `text_to_markdown()`: Convert text with style options
- `format_markdown_to_html()`: Convert markdown to WeChat HTML

**Environment Variables**:
- `GLM_API_KEY`: API key for GLM service

**API Models**:
- Supports multiple request styles: "standard", "academic", "blog", "technical"

**Design Pattern**: Singleton pattern for GLM client

---

#### `services/wechat_service.py` (~255 lines)
**Purpose**: WeChat Public Platform API integration

**Key Responsibilities**:
- WeChat access token retrieval
- Markdown to WeChat draft conversion
- Direct draft submission to WeChat
- Error handling with descriptive messages
- Unicode encoding for WeChat compatibility

**Key Classes**:
- `WeChatTokenRequest`: Request for access token
- `WeChatDraftRequest`: Request to send markdown to draft
- `WeChatDirectDraftRequest`: Request with pre-obtained token
- `WeChatError`: Custom exception for WeChat API errors

**Key Functions**:
- `get_access_token()`: Retrieve WeChat access token
- `send_markdown_to_draft()`: Convert and send markdown to WeChat
- `send_content_to_draft()`: Send prepared HTML content
- `_get_error_message()`: Get descriptive error messages

**Error Code Mappings**:
- 40013: Invalid AppID
- 40001: Invalid AppSecret
- 40002: Missing permissions
- 40164: IP not whitelisted

**WeChat API Endpoints**:
- Token: `https://api.weixin.qq.com/cgi-bin/token`
- Draft: `https://api.weixin.qq.com/cgi-bin/draft/add`

**Design Pattern**: Wrapper pattern around WeChat HTTP API

---

#### `utils/markdown_utils.py` (~25 lines)
**Purpose**: Utility functions for markdown processing

**Key Responsibilities**:
- Extract title from markdown content
- Preprocess markdown for normalization
- List item format normalization

**Key Functions**:
- `extract_title_from_markdown()`: Get H1 heading or default
- `preprocess_markdown()`: Normalize markdown format

---

## Data Flow

### Markdown Rendering Flow
```
User Request
    ↓
api.py (/render endpoint)
    ↓
MarkdownRenderer.render()
    ↓
markdown library (convert to HTML)
    ↓
Apply theme styles via BeautifulSoup
    ↓
Platform-specific adjustments
    ↓
Dark mode adjustments (if needed)
    ↓
Return styled HTML
```

### AI Content Generation Flow
```
User Request (/ai/generate-markdown)
    ↓
ai_service.generate_markdown()
    ↓
Prepare GLM API messages
    ↓
OpenAI client for GLM
    ↓
GLM returns markdown
    ↓
Clean up response (remove code blocks)
    ↓
Return markdown to user
```

### WeChat Draft Submission Flow
```
User Request (/wechat/draft)
    ↓
api.py endpoint
    ↓
wechat_service.send_markdown_to_draft()
    ↓
Get WeChat access token
    ↓
Extract title from markdown
    ↓
Render markdown to HTML using MarkdownRenderer
    ↓
Apply theme styling
    ↓
Send to WeChat draft API
    ↓
Return result to user
```

## Design Patterns Used

### 1. **Singleton Pattern** (GLM Client)
```python
glm_client = None

def ensure_glm_client():
    global glm_client
    if glm_client is None:
        glm_client = get_glm_client()
    return glm_client
```
**Benefit**: Reuses single API client connection, reduces overhead

### 2. **Strategy Pattern** (Platform Adjustments)
```python
def _adjust_for_wechat_style(self, style):
    # WeChat-specific logic
    
def _adjust_for_xiaohongshu_style(self, style):
    # XiaoHongShu-specific logic
```
**Benefit**: Easy to add new platforms without modifying existing code

### 3. **Wrapper/Adapter Pattern** (WeChat Service)
- Wraps WeChat HTTP API with Python interface
- Handles authentication, error codes, and unicode encoding

### 4. **Factory Pattern** (Theme Loading)
```python
def load_themes():
    try:
        from styles import STYLES
        return STYLES
    except:
        return get_default_themes()
```
**Benefit**: Gracefully falls back to defaults if custom styles unavailable

## Testing Strategy

### Test Organization
- **Unit Tests**: Test individual components in isolation
- **Fixtures**: Reusable test data and objects
- **Mocking**: Simulate external dependencies (API calls)

### Test Files
- `test_markdown_renderer.py`: Rendering engine tests
- `test_themes.py`: Theme management tests
- `test_markdown_utils.py`: Utility function tests
- `test_ai_service.py`: AI service model tests
- `test_wechat_service.py`: WeChat service model tests

### Running Tests
```bash
# Run all tests
pytest

# Run specific test file
pytest tests/test_markdown_renderer.py

# Run with verbose output
pytest -v

# Run specific test class
pytest tests/test_markdown_renderer.py::TestMarkdownRenderer

# Run with coverage
pytest --cov=. --cov-report=html
```

## API Endpoints Summary

### Rendering Endpoints
- `POST /render`: Render markdown to HTML
- `POST /preview`: Preview rendered content

### AI Endpoints
- `POST /ai`: General AI assistance
- `POST /ai/generate-markdown`: Generate markdown from topic
- `POST /text-to-markdown`: Convert text to markdown
- `POST /ai/format-markdown`: Format markdown to HTML

### WeChat Endpoints
- `POST /wechat/access_token`: Get WeChat access token
- `POST /wechat/draft`: Send markdown to WeChat draft
- `POST /wechat/direct-draft`: Send content directly to draft

### Style Management Endpoints
- `GET /styles`: Get available styles
- `POST /custom-style/save`: Save custom style
- `GET /custom-style/{name}`: Get custom style
- `POST /custom-style/delete`: Delete custom style

## Dependencies

### Core Dependencies
- `fastapi`: Web framework
- `pydantic`: Data validation
- `markdown`: Markdown parsing
- `beautifulsoup4`: HTML manipulation
- `openai`: GLM API client
- `requests`: HTTP requests

### Development Dependencies
- `pytest`: Testing framework
- `pytest-cov`: Code coverage

## Future Enhancements

### Short Term
1. Add comprehensive error logging
2. Implement request validation middleware
3. Add rate limiting for AI endpoints
4. Create integration tests between modules

### Medium Term
1. Database layer for storing custom styles
2. User authentication and authorization
3. Template system for email export
4. Support for additional platforms (Douyin, Bilibili)

### Long Term
1. Microservices architecture (separate AI/WeChat services)
2. Message queue for async processing (Celery)
3. Caching layer (Redis) for themes and results
4. GraphQL API alongside REST

## Performance Considerations

### Current Optimizations
1. **Markdown Parser Reset**: Prevents memory leaks
2. **Lazy Theme Loading**: Themes loaded on demand
3. **Singleton GLM Client**: Reuses connections

### Potential Improvements
1. **Template Caching**: Cache compiled markdown templates
2. **HTML Output Caching**: Cache rendered HTML by hash
3. **Async Processing**: Use async for external API calls
4. **Connection Pooling**: For WeChat API requests

## Security Considerations

### Current Measures
1. **Environment Variables**: API keys not hardcoded
2. **Unicode Encoding**: Proper handling of international characters
3. **Input Validation**: Pydantic models validate all inputs

### Recommended Measures
1. **Rate Limiting**: Prevent API abuse
2. **CORS Configuration**: Restrict origins
3. **Request Logging**: Audit trail for API access
4. **API Key Rotation**: Regular key updates
5. **HTTPS Only**: Enforce secure connections

## Contributing Guidelines

### Adding a New Module
1. Create module in appropriate directory
2. Add `__init__.py` file
3. Write comprehensive docstrings
4. Create unit tests in `tests/test_*.py`
5. Update this documentation

### Adding a New Endpoint
1. Create handler in `api.py`
2. Define request/response models
3. Import service functions as needed
4. Add appropriate error handling
5. Add corresponding tests

### Code Style
- Follow PEP 8 conventions
- Use type hints
- Add docstrings to all public functions
- Keep functions small and focused (single responsibility)

## Maintenance

### Regular Tasks
- **Weekly**: Check for security updates in dependencies
- **Monthly**: Run full test suite and update coverage reports
- **Quarterly**: Review and refactor code for maintainability

### Monitoring
- Log all API errors with context
- Track response times for performance bottlenecks
- Monitor API quota usage (GLM, WeChat)
- Alert on repeated failures

## Troubleshooting

### Common Issues

**Issue**: GLM API returns empty response
- **Cause**: API overload or invalid prompt
- **Solution**: Implement retry logic with backoff, validate prompts

**Issue**: WeChat draft submission fails
- **Cause**: Invalid credentials or IP whitelist
- **Solution**: Verify AppID/AppSecret, check IP whitelist in WeChat settings

**Issue**: Rendering produces invalid HTML
- **Cause**: Malformed markdown or theme style issues
- **Solution**: Validate markdown syntax, check theme CSS properties

## References

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Pydantic Documentation](https://docs.pydantic.dev/)
- [Markdown Python Library](https://python-markdown.github.io/)
- [WeChat Developer Documentation](https://developers.weixin.qq.com/)
- [GLM API Documentation](https://open.bigmodel.cn/)

---

*Last Updated: 2026-01-19*
*Architecture Version: 2.0 (Refactored)*
