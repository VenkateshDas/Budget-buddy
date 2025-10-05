# Budget Buddy - Setup Guide

## Prerequisites

- Node.js 18+ installed
- Python 3.8+ installed
- Supabase account (free tier works)
- Google Cloud account (for Gemini API)

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in/up
2. Click "New Project"
3. Fill in:
   - **Name**: budget-buddy (or any name)
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose closest to you
4. Click "Create new project" and wait ~2 minutes

## Step 2: Get Supabase Credentials

Once your project is created:

1. Go to **Project Settings** (⚙️ icon in sidebar)
2. Click on **API** tab
3. Copy the following:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)
   - **service_role key** (starts with `eyJ...`) - **Keep this secret!**

## Step 3: Setup Database Schema

1. In Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **New Query**
3. Copy the entire contents of `backend/supabase_schema.sql`
4. Paste into the SQL editor
5. Click **Run** (or press Cmd/Ctrl + Enter)
6. You should see "Success. No rows returned"

## Step 4: Configure Email Authentication

1. In Supabase dashboard, go to **Authentication** → **Providers**
2. Make sure **Email** provider is enabled
3. Go to **Authentication** → **URL Configuration**
4. Set **Site URL** to: `http://localhost:3000`
5. Add **Redirect URLs**:
   - `http://localhost:3000`
   - `http://localhost:3000/auth`

## Step 5: Setup Environment Variables

### Backend (.env)

1. Navigate to `backend/` directory
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Edit `.env` and fill in:
   ```env
   # Google API
   GOOGLE_API_KEY=your_google_api_key_here
   GOOGLE_SHEETS_CREDENTIALS_PATH=cred/gen-lang-client-0229471649-dff2869d47fc.json
   GOOGLE_SHEET_NAME=Receipts

   # Gemini
   GEMINI_MODEL_ID=gemini-2.0-flash

   # Supabase
   SUPABASE_URL=https://xxxxx.supabase.co  # Your Project URL
   SUPABASE_KEY=eyJ...  # Your service_role key
   SUPABASE_ANON_KEY=eyJ...  # Your anon/public key
   ```

### Frontend (.env.local)

1. Navigate to `frontend/` directory
2. Edit `.env.local` and replace with your values:
   ```env
   # API Configuration
   NEXT_PUBLIC_API_URL=http://localhost:8000/api

   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co  # Your Project URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...  # Your anon/public key (NOT service_role!)
   ```

**Important Notes:**
- Frontend ONLY uses the `anon` key (safe to expose in browser)
- Backend uses `service_role` key (must be kept secret)
- Make sure URLs start with `https://`
- Keys start with `eyJ` (they're JWT tokens)

## Step 6: Install Dependencies

### Backend
```bash
cd backend
pip install -r requirements.txt
```

### Frontend
```bash
cd frontend
npm install
```

## Step 7: Run the Application

### Start Backend (Terminal 1)
```bash
cd backend
python -m uvicorn app.main:app --reload
```

Backend will run on: `http://localhost:8000`

### Start Frontend (Terminal 2)
```bash
cd frontend
npm run dev
```

Frontend will run on: `http://localhost:3000`

## Step 8: Test Authentication

1. Open browser to `http://localhost:3000/auth`
2. Click "Don't have an account? Sign up"
3. Enter:
   - Display Name: Your Name
   - Email: your@email.com
   - Password: At least 6 characters
4. Click "Create Account"
5. Check your email for verification link (Supabase sends it automatically)
6. Click verification link
7. Return to `/auth` and sign in

## Step 9: Create Your First Spreadsheet

1. After signing in, go to **Settings** in the navigation
2. Click on **📊 Spreadsheets** tab
3. Click **+ Add Spreadsheet**
4. Fill in:
   - **Display Name**: My Budget 2024
   - **Google Sheet ID**: (from your Google Sheet URL)
   - **Sheet Name**: Receipts (or your tab name)
5. Click **Add Spreadsheet**

### How to get Google Sheet ID:
1. Open your Google Sheet
2. Look at the URL: `https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit`
3. Copy the `[SHEET_ID]` part (between `/d/` and `/edit`)

## Step 10: Create Custom Categories (Optional)

1. In Settings, click on **🏷️ Categories** tab
2. Click **+ Add Category**
3. Choose:
   - Category name (e.g., "Transportation")
   - Icon (select from emojis)
   - Color (select from palette)
4. Click **Add Category**

## Troubleshooting

### Error: "Invalid supabaseUrl"
- Check `.env.local` has correct `NEXT_PUBLIC_SUPABASE_URL`
- URL must start with `https://`
- Restart frontend dev server after changing env vars

### Error: "User not found in database"
- Run the SQL schema again (Step 3)
- Check if trigger was created: `on_auth_user_created`
- Manually check `public.users` table in Supabase Table Editor

### Error: "Failed to fetch spreadsheets"
- Backend might not be running
- Check CORS settings in backend
- Check browser console for network errors

### Email verification not received
- Check spam folder
- Verify email provider is enabled in Supabase
- Check Supabase logs: Authentication → Logs

### Backend can't connect to Supabase
- Verify `SUPABASE_KEY` is the `service_role` key, not `anon` key
- Check backend logs for connection errors
- Ensure `supabase` package is installed: `pip install supabase`

## Next Steps

1. **Upload your first receipt** at the home page
2. **View insights** at the Insights page
3. **Set budgets and goals** at the Budgets page
4. **Customize categories** to match your spending habits
5. **Invite others** by sharing your Google Sheet (optional)

## Security Notes

🔒 **Never commit `.env` or `.env.local` to git**
- These files contain secrets
- They're already in `.gitignore`

🔒 **Keep service_role key secret**
- Only use in backend
- Never expose in frontend
- Gives full database access

🔒 **Use anon key in frontend**
- Safe to expose in browser
- Respects Row Level Security (RLS)
- Limited by Supabase policies

## Support

If you encounter issues:
1. Check the error message carefully
2. Review the setup steps above
3. Check Supabase dashboard logs
4. Verify all environment variables are set correctly
5. Ensure both backend and frontend are running
