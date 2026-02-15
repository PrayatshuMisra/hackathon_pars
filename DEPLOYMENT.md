# Vercel Deployment Guide for PARS

## Problem: "Speech Error Network" on Vercel

The error occurs because:
1. **Hardcoded localhost URLs** don't work in production
2. **Web Speech API** requires HTTPS (Vercel provides this)
3. **Backend API** is not accessible from the deployed frontend

## Solution: Environment Variables

All API endpoints now use the `VITE_FASTAPI_URL` environment variable.

---

## Step 1: Deploy Your Backend API

Your FastAPI backend needs to be deployed and accessible via HTTPS. Options:

### Option A: Deploy to Render.com (Recommended - Free Tier)
1. Go to https://render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Environment**: Python 3
5. Click "Create Web Service"
6. Copy your deployed URL (e.g., `https://your-app.onrender.com`)

### Option B: Deploy to Railway.app
1. Go to https://railway.app
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Railway will auto-detect Python and deploy
5. Copy your deployed URL

### Option C: Deploy to Heroku
```bash
# Install Heroku CLI
heroku login
heroku create your-app-name
git push heroku main
```

---

## Step 2: Configure Vercel Environment Variables

1. Go to your Vercel project dashboard
2. Click "Settings" → "Environment Variables"
3. Add the following variables:

| Variable Name | Value | Example |
|---------------|-------|---------|
| `VITE_FASTAPI_URL` | Your deployed backend URL | `https://your-app.onrender.com` |
| `VITE_SUPABASE_URL` | Your Supabase URL | `https://xxx.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your Supabase key | `eyJhbGci...` |
| `VITE_GEMINI_API_KEY` | Your Gemini API key | `AIzaSy...` |

4. Click "Save"
5. Redeploy your project (Vercel will auto-redeploy when you save env vars)

---

## Step 3: Update Backend CORS Settings

Your backend needs to allow requests from your Vercel domain.

Edit `backend/main.py`:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:8080",
        "https://hackathon-pars.vercel.app",  # Add your Vercel domain
        "https://*.vercel.app"  # Allow all Vercel preview deployments
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Step 4: Test Your Deployment

1. Visit your Vercel URL: `https://hackathon-pars.vercel.app`
2. Open Developer Console (F12)
3. Try the speech features:
   - Click the microphone button
   - Check for any errors in the console
4. Verify API calls go to your deployed backend (not localhost)

---

## Troubleshooting

### "Speech error: network"
**Cause**: Backend API is not accessible or CORS is blocking requests

**Fix**:
1. Check if your backend is running: Visit `https://your-backend.com/` in browser
2. Check CORS settings in `backend/main.py`
3. Check Vercel environment variables are set correctly

### "Failed to fetch"
**Cause**: `VITE_FASTAPI_URL` is not set or incorrect

**Fix**:
1. Go to Vercel → Settings → Environment Variables
2. Verify `VITE_FASTAPI_URL` is set to your deployed backend URL
3. Redeploy

### Web Speech API not working
**Cause**: Browser doesn't support Web Speech API

**Fix**:
- Use Chrome or Edge (best support)
- Switch to "Whisper AI" mode in the voice selector dropdown
- Whisper mode uses your backend API for transcription

### Whisper mode not working
**Cause**: Backend `/transcribe` endpoint is not accessible

**Fix**:
1. Verify your backend is deployed and running
2. Test the endpoint: `curl https://your-backend.com/`
3. Check backend logs for errors

---

## Local Development

For local development, use `.env` file:

```bash
# .env
VITE_FASTAPI_URL=http://localhost:8000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-key
VITE_GEMINI_API_KEY=your-key
```

---

## Files Modified

The following files now use environment variables:

- ✅ `src/hooks/useSpeechToText.ts` - Whisper transcription endpoint
- ✅ `src/hooks/useTriage.ts` - Main API endpoint
- ✅ `src/pages/PatientIntake.tsx` - Document parsing & self-check-in
- ✅ `src/components/TriageForm.tsx` - Document parsing

---

## Quick Deploy Checklist

- [ ] Backend deployed to Render/Railway/Heroku
- [ ] Backend URL copied
- [ ] Vercel environment variables configured
- [ ] Backend CORS updated with Vercel domain
- [ ] Vercel redeployed
- [ ] Tested speech features on production
- [ ] Tested API endpoints on production

---

## Support

If you still see "speech error network":

1. Open browser console (F12)
2. Look for the actual error message
3. Check the "Network" tab to see which API call is failing
4. Verify the URL being called matches your deployed backend

The error message will tell you exactly what's wrong!
