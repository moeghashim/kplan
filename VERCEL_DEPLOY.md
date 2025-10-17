# Deploy to Vercel via Dashboard

The CLI deployment is having issues with the monorepo structure. Follow these steps to deploy via the Vercel dashboard:

## Step 1: Create Supabase Project First

Before deploying to Vercel, you need Supabase credentials.

1. Go to https://supabase.com
2. Sign in with GitHub
3. Click "New Project"
4. Fill in details and wait ~2 minutes
5. Go to **SQL Editor** and run the migration from:
   `apps/api/supabase/migrations/20250101000000_initial_schema.sql`
6. Get your credentials from **Project Settings** → **API**:
   - Project URL
   - anon public key

## Step 2: Deploy to Vercel via Dashboard

1. Go to https://vercel.com
2. Sign in with GitHub
3. Click **Add New** → **Project**
4. Find and select `kplan` repository
5. Configure:
   - **Framework Preset**: Other
   - **Root Directory**: Leave blank (/)
   - **Build Command**: Custom: 
     ```
     cd packages/shared && npm install && npm run build && cd ../../apps/web && npm install && npm run build
     ```
   - **Output Directory**: `apps/web/dist`
   - **Install Command**: Skip or leave default

6. **Environment Variables** - Add these three:
   
   | Name | Value |
   |------|-------|
   | `VITE_SUPABASE_URL` | Your Supabase Project URL |
   | `VITE_SUPABASE_ANON_KEY` | Your anon key from Supabase |
   | `VITE_API_URL` | `https://placeholder.com` (change later when API is deployed) |

7. Click **Deploy**
8. Wait ~3 minutes for build
9. Copy your deployment URL

## Step 3: Update Supabase

1. In Supabase dashboard, go to **Authentication** → **URL Configuration**
2. Add Redirect URLs:
   ```
   https://your-app.vercel.app
   https://your-app.vercel.app/**
   ```
3. Set Site URL: `https://your-app.vercel.app`
4. Save

## Step 4: Enable GitHub OAuth

1. In Supabase, go to **Authentication** → **Providers** → **GitHub**
2. Toggle it ON
3. Go to https://github.com/settings/developers
4. Click **OAuth Apps** → **New OAuth App**
5. Fill in:
   - Name: kplan
   - Homepage: Your Vercel URL
   - Callback: `https://your-supabase-url.supabase.co/auth/v1/callback`
6. Copy Client ID and Secret
7. Paste into Supabase GitHub provider
8. Save

## Step 5: Test

Visit your Vercel URL and click "Sign in with GitHub"!

## Troubleshooting

### Build fails
- Check the build command is exactly as shown above
- Verify environment variables are set
- Check build logs in Vercel dashboard

### Auth doesn't work
- Verify redirect URLs in Supabase
- Check GitHub OAuth app callback URL
- Look at browser console for errors

## Alternative: Import Project via Vercel Integration

If manual setup doesn't work, you can:
1. Connect Vercel to your GitHub repo
2. Let it auto-detect the project
3. Manually configure build settings
4. Add environment variables
5. Deploy

## Next: Deploy API

The web app can authenticate users but won't have full functionality without the API.

To deploy the API:
1. Go to https://railway.app
2. Deploy from GitHub
3. See DEPLOYMENT.md for full instructions
