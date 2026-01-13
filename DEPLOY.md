# Deployment Guide for UXTest

This guide shows you how to deploy UXTest so real users can test your websites.

## Quick Deploy (Free - Recommended)

### Step 1: Deploy Backend to Render

1. Go to [render.com](https://render.com) and sign up (free)
2. Click "New" → "Web Service"
3. Connect your GitHub repo
4. Configure:
   - **Name**: `uxtest-backend`
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Click "Create Web Service"
6. Wait for deployment (~2-5 minutes)
7. Copy your URL (e.g., `https://uxtest-backend.onrender.com`)

### Step 2: Deploy Dashboard to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up (free)
2. Click "New Project"
3. Import your GitHub repo
4. Configure:
   - **Root Directory**: `dashboard`
   - **Framework**: Vite
   - **Environment Variables**: Add `VITE_API_URL` = your Render backend URL
5. Click "Deploy"

### Step 3: Update Configuration

After getting your backend URL, update these files:

**dashboard/src/api/client.js** - Change line 12:
```javascript
: 'https://YOUR-BACKEND.onrender.com'
```

**dashboard/src/pages/TesterPortal.jsx** - Change line 6:
```javascript
: window.UXTEST_BACKEND || 'https://YOUR-BACKEND.onrender.com';
```

---

## Alternative: Local Testing with ngrok

If you just want to test without deploying:

1. Install ngrok: https://ngrok.com/download
2. Run your backend locally: `npm run backend:dev`
3. In another terminal: `ngrok http 3001`
4. Use the HTTPS URL ngrok provides

---

## How Testers Use It

Once deployed, testers:

1. Go to your dashboard URL (e.g., `https://uxtest-dashboard.vercel.app/portal`)
2. Select a test to participate in
3. Drag the "Start UX Test" button to their bookmarks bar
4. Open the test website
5. Click the bookmark → widget appears
6. Complete the tasks and click "Done"

That's it! Results show up in your dashboard automatically.

---

## Architecture After Deployment

```
┌─────────────────────────────────────────────────────────┐
│                      TESTERS                            │
│   1. Visit portal → 2. Get bookmarklet → 3. Test site  │
└──────────────────────────┬──────────────────────────────┘
                           │
        ┌──────────────────┴──────────────────┐
        │                                      │
        ▼                                      ▼
┌───────────────────┐                ┌─────────────────────┐
│  Vercel (Free)    │                │  Any Website        │
│  Dashboard UI     │                │  + Injected SDK     │
│  React App        │                │                     │
└───────────────────┘                └──────────┬──────────┘
        │                                       │
        │  API calls                            │ Events
        │                                       │
        └───────────────┬───────────────────────┘
                        │
                        ▼
              ┌─────────────────────┐
              │  Render (Free)      │
              │  Node.js Backend    │
              │  SQLite Database    │
              │  SDK File Server    │
              └─────────────────────┘
```

---

## Costs

- **Render Free Tier**: 750 hours/month, spins down after 15 min inactivity
- **Vercel Free Tier**: Unlimited static hosting
- **Total**: $0/month for portfolio projects

Note: Free tier on Render has a "cold start" delay (~30 seconds) after inactivity.
For faster response times, upgrade to paid tier or use Railway/Fly.io.
