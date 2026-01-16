# Deployment Guide - Railway

This guide explains how to deploy the md2any application to Railway with environment variables.

## Security Changes

The DeepSeek API key has been moved from hardcoded values to environment variables. This ensures your sensitive credentials are not exposed in the source code.

### Key Changes Made:
- Removed hardcoded `DEEPSEEK_API_KEY` from `api.py`
- Implemented lazy initialization of DeepSeek client via `ensure_deepseek_client()`
- API key now read from `DEEPSEEK_API_KEY` environment variable

## Prerequisites

1. **DeepSeek API Key**: Get your API key from [https://platform.deepseek.com/api_keys](https://platform.deepseek.com/api_keys)
2. **Railway Account**: Create an account at [https://railway.app](https://railway.app)
3. **Git Repository**: Push your code to GitHub, GitLab, or Bitbucket

## Local Development Setup

1. **Copy the example environment file**:
   ```bash
   cp .env.example .env.local
   ```

2. **Add your DeepSeek API key**:
   ```bash
   # Edit .env.local and replace the placeholder
   DEEPSEEK_API_KEY=sk-your_actual_key_here
   ```

3. **Run the application**:
   ```bash
   uv run api.py
   # or with uvicorn
   uvicorn api:app --reload
   ```

## Deploying to Railway

### Option 1: Using Railway Dashboard

1. Go to [https://railway.app/dashboard](https://railway.app/dashboard)
2. Click **New Project** → **Deploy from GitHub**
3. Select your repository
4. Railway will automatically detect the Python application
5. Add environment variables:
   - Go to **Variables** tab
   - Add `DEEPSEEK_API_KEY=sk-your_key_here`
6. Railway will deploy automatically

### Option 2: Using Railway CLI

1. **Install Railway CLI**:
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway**:
   ```bash
   railway login
   ```

3. **Deploy**:
   ```bash
   railway up
   ```

4. **Set environment variables**:
   ```bash
   railway variables set DEEPSEEK_API_KEY=sk-your_key_here
   ```

5. **Get your deployment URL**:
   ```bash
   railway logs
   ```
   Look for the URL in the output (typically: `https://your-project-name.railway.app`)

## Railway Environment Variables Setup

For production deployments:

1. **Set environment variables in Railway Dashboard**:
   - Go to Project Settings → Variables
   - Add `DEEPSEEK_API_KEY` with your actual API key

2. **Verify deployment**:
   - Check Railway Dashboard for deployment status
   - Confirm no errors in logs

## Creating a `requirements.txt`

If you don't have one, create a requirements.txt based on your project:

```
fastapi>=0.104.0
uvicorn[standard]>=0.24.0
markdown>=3.5.0
Pygments>=2.16.0
python-multipart>=0.0.6
pydantic>=2.4.0
beautifulsoup4>=4.12.0
requests>=2.31.0
openai>=1.0.0
```

Or generate from your environment:
```bash
pip freeze > requirements.txt
```

## API Endpoints After Deployment

Your deployed API will be accessible at:
```
https://your-project-name.railway.app
```

Example endpoints:
- `GET https://your-project-name.railway.app/` - Home page
- `POST https://your-project-name.railway.app/render` - Render markdown
- `POST https://your-project-name.railway.app/ai` - AI assistance
- `GET https://your-project-name.railway.app/health` - Health check

## Troubleshooting

### "DEEPSEEK_API_KEY environment variable not set"

**Solution**: Ensure the environment variable is set in Railway:
1. Go to Project → Variables
2. Add or verify `DEEPSEEK_API_KEY` is present
3. Redeploy the project via Railway Dashboard

### Deployment Fails

**Check logs**:
1. Go to Railway Dashboard → Deployments
2. Click on the failed deployment
3. Check the logs for errors

**Common issues**:
- Missing dependencies in `requirements.txt`
- Python version compatibility issues
- Port binding issues (Railway assigns PORT automatically)

### TimeoutError on AI Endpoints

**Solution**: The DeepSeek API might be slow. Increase timeout in your requests or use async patterns.

## Security Best Practices

✅ **DO**:
- Store API keys in Railway environment variables
- Use `.env.local` locally with `.env` in `.gitignore`
- Rotate API keys periodically
- Use Railway's environment variable management for sensitive data

❌ **DON'T**:
- Commit `.env` files to git
- Hardcode API keys in source code
- Share your API key publicly
- Use production keys in development

## Monitoring

After deployment:
1. Monitor logs: Railway Dashboard → Deployments → View logs
2. Check deployment status: Railway Dashboard → Active Deployments
3. Set up error tracking via Sentry or similar services

## Updating the Deployment

To update your deployed application:

1. Push changes to your Git repository
2. Railway will automatically redeploy on push (if GitHub integration is enabled)
3. Or manually trigger a redeploy via Railway Dashboard

## Frontend Configuration

Update the frontend API URL in `static/shared.js`:

```javascript
const CONFIG = {
    API_BASE_URL: typeof window.API_BASE_URL_OVERRIDE !== 'undefined' ? 
        window.API_BASE_URL_OVERRIDE : 
        'https://your-project-name.railway.app',
    // ... other config
};
```

---

For more information, see:
- [Railway Documentation](https://docs.railway.app)
- [Railway CLI Reference](https://docs.railway.app/cli/commands)
- [DeepSeek API Documentation](https://platform.deepseek.com/docs)
- [Railway Python Guide](https://docs.railway.app/guides/python)
