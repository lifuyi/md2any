# md2any API Backend

A FastAPI-based backend server for rendering Markdown to HTML with theme support, managed by `uv` and TOML configuration.

## Features

- 🚀 **FastAPI Backend**: Modern, fast API framework
- 🎨 **Theme Support**: Multiple rendering themes with platform-specific optimizations
- 🔧 **uv Management**: Modern Python package management with `uv`
- 📱 **Platform Optimization**: Specialized rendering for WeChat, XiaoHongShu, Zhihu
- 🔄 **Automatic Fallback**: Frontend fallback when backend is unavailable
- 📝 **Live Preview**: Theme preview with sample content

## Prerequisites

1. **Install uv** (if not already installed):
   ```bash
   curl -LsSf https://astral.sh/uv/install.sh | sh
   ```

2. **Python 3.8+** is required

## Quick Start

### 1. Install Dependencies

```bash
# Install dependencies using uv
uv sync
```

### 2. Start the API Server

**Option A: Using the run script**
```bash
python run_api.py
```

**Option B: Direct uv command**
```bash
uv run python api.py
```

**Option C: Using uvicorn directly**
```bash
uv run uvicorn api:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Access the API

- **API Base URL**: `http://localhost:8000`
- **API Documentation**: `http://localhost:8000/docs` (Swagger UI)
- **Health Check**: `http://localhost:8000/health`

## API Endpoints

### Core Endpoints

#### `POST /render`
Render Markdown to HTML with theme styling.

**Request Body:**
```json
{
  "markdown_text": "# Hello World\nThis is **bold** text.",
  "theme": "default",
  "platform": "wechat"
}
```

**Response:**
```json
{
  "html": "<div class=\"markdown-content\">...</div>",
  "theme": "default",
  "platform": "wechat",
  "success": true,
  "message": "Rendered successfully"
}
```

#### `GET /themes`
Get available themes.

**Response:**
```json
{
  "themes": [
    {
      "id": "default",
      "name": "默认样式",
      "description": ""
    }
  ]
}
```

#### `GET /preview/{theme_name}`
Preview a theme with sample content.

**Parameters:**
- `theme_name`: Theme identifier
- `platform`: Target platform (query parameter, optional)

### Utility Endpoints

#### `GET /health`
Health check endpoint.

#### `GET /`
API information and available endpoints.

## Supported Platforms

- **wechat**: WeChat Official Account (微信公众号)
- **xiaohongshu**: XiaoHongShu (小红书)
- **zhihu**: Zhihu (知乎)
- **general**: General HTML output

## Frontend Integration

The API automatically integrates with the existing frontend when available:

1. **Automatic Detection**: Frontend detects backend availability
2. **Seamless Fallback**: Falls back to frontend rendering if backend is unavailable
3. **Toggle Support**: Users can switch between backend and frontend rendering
4. **Theme Synchronization**: Themes are loaded from backend when available

### Backend Toggle Button

A new toggle button is added to the UI:
- **Icon**: Server icon with status text
- **Status Indicators**: 
  - "后端" (green) - Backend rendering active
  - "前端" (gray) - Frontend rendering active
- **Click to Toggle**: Switch between backend and frontend rendering

## Configuration

### `pyproject.toml`

The project configuration includes:

- **Dependencies**: FastAPI, Uvicorn, Markdown, Pygments
- **Development Tools**: Pytest, HTTP testing tools
- **Scripts**: Entry points for running the server

### Environment Variables

You can configure the server using environment variables:

```bash
# Server configuration
API_HOST=0.0.0.0
API_PORT=8000
API_RELOAD=true

# CORS settings (for production)
ALLOWED_ORIGINS=["http://localhost:3000", "https://yourdomain.com"]
```

## Development

### Project Structure

```
.
├── api.py              # Main API server
├── pyproject.toml      # Project configuration
├── run_api.py          # Development runner
├── api_client.js       # Frontend integration
├── API_README.md       # This file
└── ...                 # Existing frontend files
```

### Adding New Themes

1. Add theme configuration to `styles.js`
2. The API automatically loads themes from this file
3. Test with the preview endpoint: `/preview/{theme_name}`

### Testing

```bash
# Install dev dependencies
uv sync --dev

# Run tests
uv run pytest

# Test API endpoints
curl http://localhost:8000/health
curl -X POST http://localhost:8000/render \
  -H "Content-Type: application/json" \
  -d '{"markdown_text": "# Test", "theme": "default"}'
```

## Deployment

### Production Setup

1. **Install Production Dependencies**:
   ```bash
   uv sync --no-dev
   ```

2. **Run with Production Server**:
   ```bash
   uv run uvicorn api:app --host 0.0.0.0 --port 8000 --workers 4
   ```

3. **Environment Configuration**:
   ```bash
   export API_HOST=0.0.0.0
   export API_PORT=8000
   export ALLOWED_ORIGINS='["https://yourdomain.com"]'
   ```

### Docker (Optional)

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install uv
RUN pip install uv

# Copy project files
COPY pyproject.toml .
COPY api.py .
COPY styles.js .

# Install dependencies
RUN uv sync --no-dev

# Run server
CMD ["uv", "run", "uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Troubleshooting

### Common Issues

1. **Backend Not Available**:
   - Check if the API server is running on port 8000
   - Verify CORS settings for cross-origin requests
   - Frontend will automatically fall back to client-side rendering

2. **Theme Not Found**:
   - Ensure `styles.js` is present and properly formatted
   - Check theme names in `/themes` endpoint

3. **Rendering Errors**:
   - Check markdown syntax
   - Verify theme exists
   - Check server logs for detailed error messages

### Debug Mode

Run the server in debug mode:

```bash
uv run python api.py --debug
```

This enables:
- Detailed error messages
- Auto-reload on file changes
- Enhanced logging

## API Examples

### cURL Examples

```bash
# Health check
curl http://localhost:8000/health

# List themes
curl http://localhost:8000/themes

# Render markdown
curl -X POST http://localhost:8000/render \
  -H "Content-Type: application/json" \
  -d '{
    "markdown_text": "# Hello\n\nThis is **bold** and *italic* text.",
    "theme": "default",
    "platform": "wechat"
  }'

# Preview theme
curl "http://localhost:8000/preview/default?platform=wechat"
```

### JavaScript Examples

```javascript
// Using the API client
const client = new Md2anyApiClient('http://localhost:8000');

// Render markdown
const result = await client.renderMarkdown(
  '# Hello World\n\nThis is a test.',
  'default',
  'wechat'
);

console.log(result.html);
```

## License

This project is licensed under the MIT License - see the original project license for details.