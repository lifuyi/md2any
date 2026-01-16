# Deploying to Railway

Railway makes it easy to deploy your Python FastAPI backend. Here's how:

## Prerequisites

- Railway account: https://railway.app
- GitHub account with your repository pushed

## Step 1: Connect GitHub Repository

1. Go to Railway dashboard: https://railway.app/dashboard
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Authorize Railway to access your GitHub
5. Select your repository
6. Click "Deploy"

## Step 2: Configure Environment Variables

1. In Railway dashboard, go to your project
2. Click "Variables" tab
3. Add new variable:
   - **Key**: `DEEPSEEK_API_KEY`
   - **Value**: Your actual API key (sk-...)
4. Click "Add"
5. Railway automatically redeploys with new variables

## Step 3: Configure Python Environment

Railway should auto-detect Python. Verify:

1. Go to "Settings" tab
2. Check "Runtime" shows Python
3. If needed, ensure `pyproject.toml` or `requirements.txt` exists

Your `pyproject.toml` already has:
```toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "md2any-api"
version = "1.0.0"
...
```

## Step 4: Configure Start Command

Railway should auto-detect the start command, but you can set it:

1. Go to "Settings" tab
2. Under "Build", set:
   - **Build Command**: (leave empty or `pip install -r requirements.txt`)
3. Under "Deploy", set:
   - **Start Command**: `uvicorn api:app --host 0.0.0.0 --port $PORT`

The `$PORT` variable is provided by Railway.

## Step 5: Deploy

1. Railway auto-deploys on git push
2. Or manually: Click "Deploy" button in dashboard
3. Watch the logs for errors
4. Once deployed, you'll get a public URL

## Step 6: Get Your Public URL

1. Go to your Railway project
2. Click "Deployments" tab
3. Find active deployment
4. Copy the URL under "Live"
5. Your API is at: `https://your-project-url.railway.app`

## Testing Your Deployment

```bash
# Replace with your actual URL
API_URL="https://your-project-url.railway.app"

# Test health endpoint
curl $API_URL/health

# Test render endpoint
curl -X POST $API_URL/render \
  -H "Content-Type: application/json" \
  -d '{
    "markdown_text": "# Hello World",
    "theme": "wechat-default"
  }'

# Test AI endpoint
curl -X POST $API_URL/ai \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What is markdown?"
  }'
```

## Connecting Frontend to Backend

If you have a frontend on Vercel:

```javascript
// Frontend code
const API_URL = 'https://your-railway-app.railway.app';

fetch(`${API_URL}/render`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    markdown_text: '# Test',
    theme: 'wechat-default'
  })
})
.then(res => res.json())
.then(data => console.log(data));
```

## Environment Variables Setup

Your app reads from `DEEPSEEK_API_KEY`:

```python
# In api.py
api_key = os.getenv("DEEPSEEK_API_KEY")
if not api_key:
    raise ValueError("DEEPSEEK_API_KEY environment variable not set")
```

Railway automatically provides these to your app.

## Troubleshooting

### Deployment Fails
1. Check build logs in Railway dashboard
2. Verify `pyproject.toml` or `requirements.txt` exists
3. Check for Python syntax errors

### "DEEPSEEK_API_KEY not set"
1. Go to Variables tab
2. Verify `DEEPSEEK_API_KEY` is added
3. Wait for redeploy
4. Check logs: `railway logs`

### 500 Errors
1. Check deployment logs
2. Verify API key is valid
3. Check DeepSeek API status

### Slow Response
1. Cold start: First request takes 5-10 seconds
2. Subsequent requests are fast
3. Check DeepSeek API response time

## Useful Railway Commands

Install Railway CLI:
```bash
npm install -g @railway/cli
```

Login and deploy:
```bash
railway login
railway up
```

View logs:
```bash
railway logs
```

## Monitoring

1. **Logs**: View in Railway dashboard → Deployments → Logs
2. **Usage**: Check under "Resources" tab
3. **API Performance**: Monitor request times
4. **Billing**: Free tier has usage limits

## Important Security Steps

1. ✅ Set `DEEPSEEK_API_KEY` in Railway
2. ⚠️ Delete old API key from DeepSeek account
3. ✅ Don't commit `.env` to git
4. ✅ Mark sensitive variables in Railway

## Useful Links

- Railway Dashboard: https://railway.app/dashboard
- Railway Docs: https://docs.railway.app
- Railway CLI: https://docs.railway.app/cli/commands

## Next Steps

1. Verify deployment is live
2. Test API endpoints
3. Connect frontend if needed
4. Monitor performance
5. Set up error tracking (optional)

---

**Your backend is now live on Railway!** 🚀

Your API URL: `https://your-project-name.railway.app`

API Endpoints:
- GET `/health` - Health check
- POST `/render` - Render markdown
- POST `/ai` - AI assistance
- POST `/text-to-markdown` - Convert text
- ... and more (see `/api`)
