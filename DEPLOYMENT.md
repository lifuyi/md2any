# Deployment Guide - Vercel

This guide explains how to securely deploy the md2any application to Vercel with environment variables.

## Security Changes

The DeepSeek API key has been moved from hardcoded values to environment variables. This ensures your sensitive credentials are not exposed in the source code.

### Key Changes Made:
- Removed hardcoded `DEEPSEEK_API_KEY` from `api.py`
- Implemented lazy initialization of DeepSeek client via `ensure_deepseek_client()`
- API key now read from `DEEPSEEK_API_KEY` environment variable

## Prerequisites

1. **DeepSeek API Key**: Get your API key from [https://platform.deepseek.com/api_keys](https://platform.deepseek.com/api_keys)
2. **Vercel Account**: Create an account at [https://vercel.com](https://vercel.com)
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

## Deploying to Vercel

### Option 1: Using Vercel Dashboard

1. Go to [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "Add New..." → "Project"
3. Select your Git repository
4. Configure the project:
   - **Framework**: Other
   - **Root Directory**: `./`
   - **Build Command**: Leave blank (or `pip install -r requirements.txt` if needed)
   - **Output Directory**: Leave blank
   - **Install Command**: `uv install` or `pip install -r requirements.txt`

5. **Add Environment Variables**:
   - Click on "Environment Variables"
   - Add a new variable:
     - **Name**: `DEEPSEEK_API_KEY`
     - **Value**: Your actual DeepSeek API key
   - Click "Add"

6. Click "Deploy"

### Option 2: Using Vercel CLI

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel --env DEEPSEEK_API_KEY=your_key_here
   ```

4. **Or deploy and set env vars interactively**:
   ```bash
   vercel
   ```
   Then follow the prompts to add environment variables.

### Option 3: Create `vercel.json`

Create a `vercel.json` file in your project root:

```json
{
  "buildCommand": "pip install -r requirements.txt",
  "devCommand": "uvicorn api:app --reload --host 0.0.0.0",
  "installCommand": "pip install -r requirements.txt || true",
  "env": {
    "DEEPSEEK_API_KEY": "@deepseek-api-key"
  }
}
```

Then set the secret:
```bash
vercel env add DEEPSEEK_API_KEY
```

## Vercel Secrets Management

For production deployments:

1. **Set as Secret** (recommended for sensitive data):
   ```bash
   vercel env add DEEPSEEK_API_KEY
   vercel env pull  # Pull to local .env.local
   ```

2. **Verify in Dashboard**:
   - Go to Project Settings → Environment Variables
   - Confirm `DEEPSEEK_API_KEY` is marked as a secret

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
https://your-project-name.vercel.app
```

Example endpoints:
- `GET https://your-project-name.vercel.app/` - Home page
- `POST https://your-project-name.vercel.app/render` - Render markdown
- `POST https://your-project-name.vercel.app/ai` - AI assistance
- `GET https://your-project-name.vercel.app/health` - Health check

## Troubleshooting

### "DEEPSEEK_API_KEY environment variable not set"

**Solution**: Ensure the environment variable is set in Vercel:
1. Go to Project Settings → Environment Variables
2. Add or verify `DEEPSEEK_API_KEY` is present
3. Redeploy the project

### Deployment Fails

**Check logs**:
1. Go to Deployment tab in Vercel dashboard
2. Click on the failed deployment
3. Check the "Build Logs" for errors

**Common issues**:
- Missing dependencies in `requirements.txt`
- Python version mismatch (Vercel uses Python 3.9+ by default)
- Port binding issues (use environment variable `PORT`)

### TimeoutError on AI Endpoints

**Solution**: The DeepSeek API might be slow. Increase timeout in your requests or use async patterns.

## Security Best Practices

✅ **DO**:
- Store API keys in Vercel environment variables
- Use `.env.local` locally with `.env` in `.gitignore`
- Rotate API keys periodically
- Use Vercel's secret management for sensitive data

❌ **DON'T**:
- Commit `.env` files to git
- Hardcode API keys in source code
- Share your API key publicly
- Use production keys in development

## Monitoring

After deployment:
1. Monitor logs: Vercel Dashboard → Deployments → Logs
2. Check function duration: Vercel Dashboard → Analytics
3. Set up error tracking via Sentry or similar services

## Updating the Deployment

To update your deployed application:

1. Push changes to your Git repository
2. Vercel will automatically redeploy on push (if Auto-Deploy is enabled)
3. Or manually redeploy via Vercel Dashboard → Deployments → Redeploy

---

For more information, see:
- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [DeepSeek API Documentation](https://platform.deepseek.com/docs)
