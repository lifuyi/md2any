# Railway Deployment Checklist

Use this checklist to deploy your FastAPI backend to Railway.

## Pre-Deployment

- [ ] Code is pushed to GitHub
- [ ] `.env` is in `.gitignore` (verified ✓)
- [ ] `pyproject.toml` exists with dependencies
- [ ] No hardcoded API keys in code
- [ ] Local testing passed: `uvicorn api:app --reload`

## Railway Setup

- [ ] Created Railway account: https://railway.app
- [ ] Connected GitHub repository
- [ ] Selected your repository
- [ ] Project created in Railway dashboard

## Environment Variables

- [ ] Added variable in Railway:
  - [ ] Key: `DEEPSEEK_API_KEY`
  - [ ] Value: Your actual API key (sk-...)
- [ ] Variables saved

## Deployment

- [ ] Project deployed (watch build logs)
- [ ] Deployment shows "Success"
- [ ] Public URL generated
- [ ] Copy your Railway URL: ________________

## Post-Deployment Testing

API Testing:
- [ ] Health endpoint works: `https://your-url/health`
- [ ] Render endpoint works: `POST /render`
- [ ] AI endpoint works: `POST /ai`
- [ ] Text-to-markdown works: `POST /text-to-markdown`

Check logs:
- [ ] No errors in Railway logs
- [ ] No "DEEPSEEK_API_KEY" errors

## Security

- [ ] Old API key deleted from DeepSeek account
- [ ] Only new API key active
- [ ] Verified no secrets in git history

## Configuration

Start Command (should be auto-set):
```
uvicorn api:app --host 0.0.0.0 --port $PORT
```

If manual setup needed:
- [ ] Build Command: (empty or `pip install -r requirements.txt`)
- [ ] Start Command: Set above

## Documentation

- [ ] Updated frontend API URL to point to Railway
- [ ] Tested API calls from frontend
- [ ] Documented new backend URL

## Monitoring

- [ ] Checked Railway dashboard
- [ ] Viewed deployment logs
- [ ] Confirmed app is running
- [ ] Note any warnings

## Final Verification

- [ ] All endpoints responding
- [ ] No errors in logs
- [ ] API key working
- [ ] Performance acceptable

## Important Notes

⚠️ **Security Steps (MUST DO)**:
1. Delete old API key from DeepSeek
2. Verify only new key is active
3. Check no secrets in git

## Your Railway URL

Backend URL: `https://______________________.railway.app`

Update this in:
- [ ] Frontend environment variables
- [ ] API documentation
- [ ] Team documentation

## Troubleshooting

If deployment fails:
1. Check build logs in Railway
2. Verify `pyproject.toml` exists
3. Check for syntax errors
4. Try manual redeploy

If API not responding:
1. Check environment variables
2. Verify `DEEPSEEK_API_KEY` is set
3. Check logs in Railway dashboard
4. Restart deployment

## Done! ✅

Your backend is now running on Railway!

Next steps:
- Update frontend to use Railway URL
- Monitor logs for errors
- Set up error tracking (optional)

---

**Backend URL**: `https://your-railway-url.railway.app`

**Documentation**: See `RAILWAY_DEPLOYMENT.md`
