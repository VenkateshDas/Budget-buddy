# Migration from Clerk to Supabase Auth

## ✅ Completed Migration

Successfully migrated from Clerk authentication to Supabase Auth for a simpler, more integrated authentication solution.

## Changes Made

### 1. Removed Clerk Dependencies

**Frontend:**
- Uninstalled `@clerk/nextjs` package
- Removed `middleware.ts` (Clerk middleware)
- Removed `/app/sign-in` and `/app/sign-up` directories
- Removed `/app/profile` page

**Backend:**
- Uninstalled `pyclerk` package
- Removed `app/api/webhooks.py` (Clerk webhook handler)
- Removed Clerk configuration from `config.py`
- Removed Clerk environment variables from `.env.example`

### 2. Updated Database Schema

**File:** `backend/supabase_schema.sql`

Key changes:
- Users table now references `auth.users` (Supabase's built-in auth table)
- Removed `clerk_user_id` field
- Updated RLS policies to use `auth.uid()` instead of Clerk user lookups
- Added trigger `on_auth_user_created` to auto-create user profiles when someone signs up
- User profile is automatically created from auth.users email and metadata

```sql
-- Auto-create user profile on sign up
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 3. Created Supabase Auth Utilities

**File:** `frontend/lib/supabase.ts`

Provides helper functions:
- `signUp(email, password, displayName)` - Create new account
- `signIn(email, password)` - Sign in existing user
- `signOut()` - Sign out current user
- `getCurrentUser()` - Get authenticated user
- `getSession()` - Get current session with access token

### 4. Updated Backend Auth Middleware

**File:** `backend/app/core/auth.py`

Changes:
- Removed Clerk JWT validation
- Now uses Supabase `auth.get_user(token)` to verify tokens
- Updated `get_current_user_id()` to extract user ID from Supabase JWT
- Updated `get_current_user()` to use `get_user_by_id()` instead of `get_user_by_clerk_id()`

### 5. Updated Supabase Service

**File:** `backend/app/services/supabase_service.py`

Changes:
- Removed `create_user()` method (now handled by trigger)
- Removed `get_user_by_clerk_id()` method
- Added `get_user_by_id()` method to fetch user by Supabase auth UUID

### 6. Created New Auth Page

**File:** `frontend/app/auth/page.tsx`

Features:
- Combined sign-in and sign-up in one page
- Toggle between modes
- Display name input for sign-up
- Shows user info when signed in
- Sign out button
- Email verification support (Supabase sends verification email automatically)

### 7. Updated Components

**Files:**
- `frontend/components/SpreadsheetManager.tsx`
- `frontend/components/CategoryManager.tsx`

Changes:
- Removed `useAuth()` from Clerk
- Added `getAuthToken()` helper using Supabase `getSession()`
- Updated all API calls to use Supabase access token

### 8. Updated Layout

**File:** `frontend/app/layout.tsx`

Changes:
- Removed `ClerkProvider` wrapper
- Removed `SignedIn`, `SignedOut`, `UserButton` components
- Added simple "Account" link to `/auth` page

## Setup Instructions

### 1. Supabase Dashboard Setup

1. Go to your Supabase project dashboard
2. Run the updated SQL schema:
   - Navigate to SQL Editor
   - Copy contents of `backend/supabase_schema.sql`
   - Execute the SQL
3. Configure Email Auth:
   - Go to Authentication → Providers
   - Enable Email provider
   - Configure email templates (optional)
   - Set Site URL to `http://localhost:3000` for development

### 2. Environment Variables

**Frontend** (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Backend** (`backend/.env`):
```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_service_role_key
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Test the Authentication Flow

1. Start the backend: `cd backend && python -m uvicorn app.main:app --reload`
2. Start the frontend: `cd frontend && npm run dev`
3. Navigate to `http://localhost:3000/auth`
4. Create an account (sign up)
5. Check your email for verification link (if email confirmations are enabled)
6. Sign in with your credentials
7. Access protected pages (Settings, etc.)

## Authentication Flow

### Sign Up Flow
1. User submits email, password, and display name
2. Frontend calls `signUp()` from `lib/supabase.ts`
3. Supabase Auth creates user in `auth.users` table
4. Trigger `on_auth_user_created` automatically creates profile in `public.users`
5. User receives verification email (if enabled)
6. User can sign in after verification

### Sign In Flow
1. User submits email and password
2. Frontend calls `signIn()` from `lib/supabase.ts`
3. Supabase returns session with access_token
4. Access token is sent in Authorization header for API requests
5. Backend validates token using `supabase.auth.get_user(token)`
6. User ID is extracted and used to fetch user profile

### Protected API Requests
1. Frontend gets session using `getSession()`
2. Extracts `access_token` from session
3. Includes in request: `Authorization: Bearer <access_token>`
4. Backend middleware validates token and extracts user_id
5. RLS policies automatically filter data by `auth.uid()`

## Benefits of Supabase Auth

✅ **Simpler Architecture**
- No need for separate auth provider
- Everything in one place (database + auth)
- No webhook syncing required

✅ **Better Integration**
- Direct integration with database via RLS
- Auto-create user profiles with triggers
- Built-in email verification

✅ **Cost Effective**
- No additional auth provider cost
- Included with Supabase pricing

✅ **Flexible**
- Easy to add OAuth providers later (Google, GitHub, etc.)
- Built-in password reset, email verification
- Magic link authentication available

## Next Steps

1. **Enable OAuth Providers** (Optional)
   - Add Google Sign-In
   - Add GitHub Sign-In
   - Configure in Supabase Dashboard → Authentication → Providers

2. **Email Templates**
   - Customize verification email
   - Customize password reset email
   - Go to Authentication → Email Templates

3. **Session Management**
   - Configure session timeout
   - Set up refresh token rotation
   - Go to Authentication → Settings

4. **Security**
   - Enable Captcha for sign-ups
   - Configure password strength requirements
   - Set up rate limiting

## Troubleshooting

### Issue: "User not found in database"
- The trigger might not have fired
- Manually check `public.users` table
- Re-run the trigger function manually

### Issue: "Invalid token"
- Token might be expired (default: 1 hour)
- Get a fresh session using `getSession()`
- Check if user is signed out

### Issue: Email verification not working
- Check Supabase email settings
- Verify SMTP configuration
- Check spam folder

### Issue: RLS policies blocking access
- Ensure user is authenticated
- Check if `auth.uid()` matches user_id in tables
- Review RLS policies in Supabase Dashboard
