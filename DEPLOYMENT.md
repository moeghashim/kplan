# Deployment Guide

## Overview

This guide walks you through deploying kplan to production:
- **Web App**: Vercel (frontend)
- **API**: Railway/Render (backend - Fastify doesn't run on Vercel)
- **Database**: Supabase (managed Postgres with auth)

## Step 1: Create Supabase Project

### Via Web Dashboard

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign in with GitHub
4. Create a new project:
   - **Name**: kplan
   - **Database Password**: (generate strong password)
   - **Region**: Choose closest to your users
5. Wait for project to be ready (~2 minutes)

### Get Credentials

Once ready:
1. Go to **Project Settings** → **API**
2. Copy these values:
   - **Project URL**: `https://xxx.supabase.co`
   - **anon/public key**: `eyJxxx...`
   - **service_role key**: `eyJxxx...` (keep secret!)

### Run Database Migration

1. Go to **SQL Editor** in Supabase dashboard
2. Click **New Query**
3. Copy/paste contents of `apps/api/supabase/migrations/20250101000000_initial_schema.sql`
4. Click **Run** to execute migration
5. Verify tables created under **Table Editor**

### Enable GitHub Auth (Optional)

1. Go to **Authentication** → **Providers**
2. Enable **GitHub**
3. Create GitHub OAuth App:
   - Go to GitHub Settings → Developer settings → OAuth Apps
   - New OAuth App:
     - **Homepage URL**: `https://your-vercel-app.vercel.app`
     - **Callback URL**: `https://xxx.supabase.co/auth/v1/callback`
   - Copy Client ID and Client Secret
4. Paste into Supabase GitHub provider settings
5. Click **Save**

## Step 2: Deploy Web App to Vercel

### Option A: Via Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click **Add New** → **Project**
4. Import your GitHub repository: `moeghashim/kplan`
5. Configure project:
   - **Framework Preset**: Other
   - **Root Directory**: `./`
   - **Build Command**: `pnpm build`
   - **Output Directory**: `apps/web/dist`
   - **Install Command**: `pnpm install`

6. Add Environment Variables:
   ```
   VITE_SUPABASE_URL=https://xxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJxxx...
   VITE_API_URL=https://your-api.railway.app
   ```

7. Click **Deploy**

### Option B: Via CLI

```bash
cd /Users/moe/kplan

# Login to Vercel
vercel login

# Link project
vercel link

# Set environment variables
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel env add VITE_API_URL

# Deploy
vercel --prod
```

## Step 3: Deploy API to Railway

### Why Railway?

Vercel doesn't support long-running Node.js servers like Fastify. Railway is perfect for our API.

### Deploy to Railway

1. Go to [railway.app](https://railway.app)
2. Sign in with GitHub
3. Click **New Project**
4. Select **Deploy from GitHub repo**
5. Choose `moeghashim/kplan`
6. Configure:
   - **Root Directory**: `apps/api`
   - **Build Command**: `pnpm install && pnpm build`
   - **Start Command**: `node dist/index.js`

7. Add Environment Variables:
   ```
   SUPABASE_URL=https://xxx.supabase.co
   SUPABASE_ANON_KEY=eyJxxx...
   SUPABASE_SERVICE_ROLE_KEY=eyJxxx... (secret!)
   OPENAI_API_KEY=sk-xxx...
   PORT=3000
   NODE_ENV=production
   WEB_URL=https://your-vercel-app.vercel.app
   ```

8. Click **Deploy**
9. Copy the generated URL (e.g., `https://kplan-api.railway.app`)

### Update Vercel with API URL

Go back to Vercel and update `VITE_API_URL` to your Railway URL.

## Step 4: Update Supabase Redirect URLs

1. Go to Supabase Dashboard → **Authentication** → **URL Configuration**
2. Add to **Redirect URLs**:
   ```
   https://your-vercel-app.vercel.app
   https://your-vercel-app.vercel.app/**
   ```
3. Update **Site URL**: `https://your-vercel-app.vercel.app`
4. Click **Save**

## Step 5: Test Your Deployment

### Test Web App
1. Visit your Vercel URL
2. Click "Sign in with GitHub"
3. Authorize the app
4. You should see your dashboard

### Test API
```bash
# Health check
curl https://your-api.railway.app/health

# Test protected endpoint (get your token from browser dev tools)
curl https://your-api.railway.app/tweets \
  -H "Authorization: Bearer YOUR_SUPABASE_TOKEN"
```

## Alternative: Deploy API to Render

If you prefer Render over Railway:

1. Go to [render.com](https://render.com)
2. New → **Web Service**
3. Connect GitHub repo
4. Configure:
   - **Name**: kplan-api
   - **Root Directory**: `apps/api`
   - **Build Command**: `pnpm install && pnpm build`
   - **Start Command**: `node dist/index.js`
   - **Plan**: Free

5. Add same environment variables as Railway
6. Click **Create Web Service**

## Monitoring & Logs

### Vercel
- View logs: Vercel Dashboard → Your Project → Deployments → Logs

### Railway
- View logs: Railway Dashboard → Your Service → Logs
- Add monitoring: Railway Dashboard → Observability

### Supabase
- Query logs: Supabase Dashboard → Logs
- Monitor usage: Supabase Dashboard → Usage

## Troubleshooting

### "Missing environment variables" error
- Check all env vars are set in Vercel/Railway
- Redeploy after adding env vars

### Auth redirect issues
- Verify redirect URLs in Supabase match your Vercel domain
- Check GitHub OAuth app callback URL

### API connection failed
- Verify `VITE_API_URL` in Vercel points to Railway URL
- Check Railway service is running
- Test API health endpoint directly

### Database connection issues
- Verify Supabase credentials in Railway
- Check migration was run successfully
- Look at Supabase logs

## Cost Estimate

- **Supabase**: Free tier (2 projects, 500MB database, 50MB file storage)
- **Vercel**: Free tier (100GB bandwidth, unlimited deployments)
- **Railway**: Free $5/month credit (API should fit in free tier)
- **OpenAI**: Pay-as-you-go (~$0.01-0.05 per tweet analysis)

**Total**: ~$0-10/month depending on usage

## Next Steps

1. Set up custom domain in Vercel
2. Enable monitoring and alerts
3. Configure backups in Supabase
4. Set up CI/CD for automated deployments
5. Add error tracking (Sentry)
6. Monitor OpenAI costs

## Quick Deploy Checklist

- [ ] Create Supabase project
- [ ] Run database migration
- [ ] Enable GitHub auth in Supabase
- [ ] Deploy web app to Vercel
- [ ] Set Vercel environment variables
- [ ] Deploy API to Railway
- [ ] Set Railway environment variables
- [ ] Update Vercel with Railway API URL
- [ ] Update Supabase redirect URLs
- [ ] Test authentication flow
- [ ] Test API endpoints
- [ ] Monitor logs for errors
