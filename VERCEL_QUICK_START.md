# Vercel Quick Start Guide

## 30-Second Setup

### Step 1: Get Your API Key
1. Visit https://platform.deepseek.com/api_keys
2. Create a new API key
3. Copy the key (format: `sk-...`)

### Step 2: Deploy to Vercel
1. Go to https://vercel.com/dashboard
2. Click "Add New..." → "Project"
3. Select your GitHub/GitLab/Bitbucket repository
4. Click "Deploy"

### Step 3: Add Environment Variable
1. After deployment starts, go to "Settings" → "Environment Variables"
2. Click "Add New Environment Variable"
3. **Name**: `DEEPSEEK_API_KEY`
4. **Value**: `sk-...` (your API key from Step 1)
5. Click "Save"
6. Go back to "Deployments" and click "Redeploy" on the latest deployment

### Step 4: Test
Visit your deployed app: `https://your-project-name.vercel.app`

---

## Vercel Environment Variables Setup

### Via Dashboard
1. Project → Settings → Environment Variables
2. Add variable:
   - Name: `DEEPSEEK_API_KEY`
   - Value: Your API key
3. Scope: Production (or All)

### Via CLI
```bash
npm i -g vercel
vercel env add DEEPSEEK_API_KEY
# Enter your API key when prompted
vercel redeploy
```

---

## Troubleshooting

| Error | Solution |
|-------|----------|
| `DEEPSEEK_API_KEY not set` | Check Environment Variables in Vercel Settings |
| 503 Service Unavailable | Wait for redeployment to complete, then refresh |
| CORS errors | Add your Vercel URL to allowed origins (if needed) |
| Timeout errors | Increase function timeout in vercel.json (if needed) |

---

## Files Needed

Your repository must have:
- ✅ `api.py` (main application)
- ✅ `static/` folder (frontend files)
- ✅ `pyproject.toml` or `requirements.txt` (dependencies)
- ✅ `.env.example` (documentation)

---

## Important: Rotate Old API Key

⚠️ **After deploying**, you must:

1. Log in to DeepSeek platform: https://platform.deepseek.com
2. Go to API Keys
3. Delete or disable the old key (the one from the original source code)
4. Keep only the new key you set in Vercel

This prevents unauthorized access with the compromised key.

---

## Testing Your Deployment

```bash
# Test the API
curl https://your-project-name.vercel.app/health

# Test AI endpoint
curl -X POST https://your-project-name.vercel.app/ai \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What is markdown?",
    "context": ""
  }'

# Test rendering
curl -X POST https://your-project-name.vercel.app/render \
  -H "Content-Type: application/json" \
  -d '{
    "markdown_text": "# Hello World",
    "theme": "wechat-default",
    "mode": "light-mode",
    "platform": "wechat"
  }'
```

---

## API Endpoints

After deployment, your API is available at:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/` | GET | Home page |
| `/api` | GET | API documentation |
| `/health` | GET | Health check |
| `/themes` | GET | List themes |
| `/render` | POST | Render markdown |
| `/ai` | POST | AI assistance |
| `/text-to-markdown` | POST | Text to markdown conversion |
| `/wechat/access_token` | POST | WeChat token |
| `/wechat/send_draft` | POST | Send to WeChat draft |
| `/wechat/draft` | POST | Direct WeChat draft |

---

## Local Development

Before deploying:

```bash
# 1. Copy environment template
cp .env.example .env.local

# 2. Edit .env.local with your API key
# DEEPSEEK_API_KEY=sk-your_key_here

# 3. Run locally
uv run api.py
# or
uvicorn api:app --reload

# 4. Test
open http://localhost:8000
```

---

## Performance & Limits

- **Cold start**: ~3-5 seconds (first request after deployment)
- **Subsequent requests**: <100ms
- **Timeout**: 60 seconds (default Vercel limit)
- **Memory**: 512MB (default)

For high-traffic apps, consider upgrading to Pro.

---

## Support

- 📖 [DEPLOYMENT.md](./DEPLOYMENT.md) - Full deployment guide
- 📋 [SECURITY_REFACTORING.md](./SECURITY_REFACTORING.md) - Security details
- 🔗 [Vercel Docs](https://vercel.com/docs)
- 🔗 [DeepSeek Docs](https://platform.deepseek.com/docs)

---

**You're ready to deploy! 🚀**
