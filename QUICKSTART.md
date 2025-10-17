# Quick Start Guide

## 🚀 Deploy in 10 Minutes

### Prerequisites
- GitHub account
- Credit card (for Supabase, but it's free tier)

### Step 1: Create Supabase Project (3 min)

1. Go to https://supabase.com and sign in with GitHub
2. Click "New Project"
3. Fill in:
   - **Name**: kplan
   - **Database Password**: (generate strong password - save it!)
   - **Region**: Select closest to you
4. Click "Create new project" and wait ~2 minutes

### Step 2: Set Up Database (2 min)

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of this file:
   `apps/api/supabase/migrations/20250101000000_initial_schema.sql`
4. Paste into the SQL editor
5. Click **Run** (bottom right)
6. You should see "Success. No rows returned" ✅

### Step 3: Get Supabase Credentials (1 min)

1. Go to **Project Settings** (gear icon) → **API**
2. Copy these three values (you'll need them soon):
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public**: `eyJhbGc...` (long string)
   - **service_role**: `eyJhbGc...` (different long string) ⚠️ Keep secret!

### Step 4: Enable GitHub Authentication (2 min)

1. In Supabase, go to **Authentication** → **Providers**
2. Find **GitHub** and toggle it on
3. Open new tab: https://github.com/settings/developers
4. Click **OAuth Apps** → **New OAuth App**
5. Fill in:
   - **Application name**: kplan
   - **Homepage URL**: `https://temporary.com` (we'll update this)
   - **Callback URL**: `https://xxxxx.supabase.co/auth/v1/callback` (use YOUR Supabase URL)
6. Click **Register application**
7. Copy **Client ID** and generate **Client Secret**
8. Back in Supabase, paste both into the GitHub provider settings
9. Click **Save**

### Step 5: Deploy to Vercel (2 min)

**Note**: You'll need to set environment variables after the first deployment.

1. Go to https://vercel.com and sign in with GitHub
2. Click **Add New** → **Project**
3. Find and import `kplan` repository
4. Configure:
   - **Framework Preset**: Other
   - **Root Directory**: `./`
   - **Build Command**: `pnpm build`
   - **Output Directory**: `apps/web/dist`
   - **Install Command**: `pnpm install`
5. **Don't click Deploy yet!**
6. Click **Environment Variables**
7. Add these three variables:
   
   | Name | Value |
   |------|-------|
   | `VITE_SUPABASE_URL` | Your Supabase Project URL |
   | `VITE_SUPABASE_ANON_KEY` | Your anon public key |
   | `VITE_API_URL` | `https://temporary.com` (for now) |

8. Now click **Deploy**
9. Wait ~2 minutes
10. Copy your Vercel URL (e.g., `https://kplan-xxx.vercel.app`)

### Step 6: Update Supabase with Vercel URL (1 min)

1. Back in Supabase dashboard, go to **Authentication** → **URL Configuration**
2. Add your Vercel URL to **Redirect URLs**:
   ```
   https://kplan-xxx.vercel.app
   https://kplan-xxx.vercel.app/**
   ```
3. Set **Site URL** to: `https://kplan-xxx.vercel.app`
4. Click **Save**

### Step 7: Update GitHub OAuth App (1 min)

1. Go back to GitHub OAuth Apps: https://github.com/settings/developers
2. Click on your "kplan" app
3. Update **Homepage URL** to your Vercel URL
4. Update **Callback URL** to your Supabase callback (with your Supabase URL)
5. Click **Update application**

### Step 8: Test It! (1 min)

1. Visit your Vercel URL: `https://kplan-xxx.vercel.app`
2. Click **Sign in with GitHub**
3. Authorize the app
4. You should see: "Welcome back, [your-email]!" 🎉

**Note**: The API endpoints won't work yet because we haven't deployed the API. See below for API deployment.

---

## 🔥 Deploy API (Optional - for full functionality)

The web app works for authentication, but to use tweet analysis and learning paths, you need to deploy the API.

### Option A: Railway (Recommended, Free $5/month)

1. Go to https://railway.app and sign in with GitHub
2. Click **New Project** → **Deploy from GitHub repo**
3. Select `kplan` repository
4. Click **Add variables** and add:
   
   | Name | Value |
   |------|-------|
   | `SUPABASE_URL` | Your Supabase Project URL |
   | `SUPABASE_ANON_KEY` | Your anon public key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Your service_role key ⚠️ |
   | `OPENAI_API_KEY` | Your OpenAI API key from https://platform.openai.com |
   | `PORT` | `3000` |
   | `NODE_ENV` | `production` |
   | `WEB_URL` | Your Vercel URL |

5. Under **Settings** → **Build**:
   - **Root Directory**: `apps/api`
   - **Build Command**: `pnpm install && pnpm build`
   - **Start Command**: `node dist/index.js`
6. Click **Deploy**
7. Wait ~3 minutes
8. Copy your Railway URL (e.g., `https://kplan-production.up.railway.app`)

### Update Vercel with API URL

1. Go to Vercel dashboard → Your Project → Settings → Environment Variables
2. Find `VITE_API_URL` and edit it
3. Change value to your Railway URL
4. Click **Save**
5. Go to **Deployments** and click **Redeploy** on latest deployment

### Test API

```bash
# Test health endpoint
curl https://your-railway-url.railway.app/health

# Should return: {"status":"ok","timestamp":"..."}
```

---

## ✅ You're Done!

Your app is now live and fully functional:
- ✅ Web app on Vercel
- ✅ Database on Supabase
- ✅ Authentication with GitHub
- ✅ API on Railway (if you deployed it)

### What's Next?

1. **Use the app**: Create tweets, organize them into learning paths
2. **Customize**: Update the UI in `apps/web/src/App.tsx`
3. **Add features**: Check `IMPLEMENTATION_STATUS.md` for what to build next
4. **Monitor**: Check Vercel, Railway, and Supabase dashboards for logs

### Costs

- **Supabase**: Free (500MB database, 2 projects)
- **Vercel**: Free (100GB bandwidth)
- **Railway**: Free ($5 credit/month, should be enough for MVP)
- **OpenAI**: ~$0.01-0.05 per tweet analysis

---

## Troubleshooting

### "Can't sign in"
- Check GitHub OAuth callback URL matches Supabase
- Check Supabase redirect URLs include your Vercel URL

### "Environment variable missing"
- Verify all env vars are set in Vercel/Railway
- Redeploy after adding env vars

### "API connection failed"
- Make sure Railway API is deployed and running
- Check `VITE_API_URL` in Vercel points to Railway URL
- Test API health endpoint directly

### Still stuck?
Open an issue on GitHub: https://github.com/moeghashim/kplan/issues
