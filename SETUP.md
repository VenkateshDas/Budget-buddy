# 🚀 Budget Buddy - Quick Setup Guide

This guide will help you get Budget Buddy up and running in minutes.

---

## Prerequisites Checklist

Before starting, ensure you have:

- [ ] Python 3.9 or higher installed
- [ ] Node.js 18 or higher installed
- [ ] Google Cloud account
- [ ] Google Gemini API key
- [ ] Google Sheets API credentials (service account JSON)
- [ ] A Google Sheet created and shared with service account

---

## Step 1: Get Google Credentials

### A. Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click "Create API Key"
3. Copy the key - you'll need it for `.env`

### B. Google Sheets Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable these APIs:
   - Google Sheets API
   - Google Drive API
4. Create credentials:
   - Go to "Credentials" → "Create Credentials" → "Service Account"
   - Give it a name (e.g., "budget-buddy-sa")
   - Skip optional steps, click "Done"
5. Click on the service account you just created
6. Go to "Keys" tab → "Add Key" → "Create new key"
7. Choose JSON format, download the file
8. **Important**: Note the service account email (looks like `name@project.iam.gserviceaccount.com`)

### C. Create Google Sheet

1. Create a new Google Sheet
2. Name it "Receipts" (or any name you prefer)
3. **Share the sheet** with your service account email with "Editor" permissions
4. Copy the sheet name for your `.env` file

---

## Step 2: Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create credentials directory
mkdir -p cred

# Copy your Google Sheets service account JSON to cred/
# Rename it or note the path
cp /path/to/your/downloaded-credentials.json cred/service-account.json

# Create environment file
cp .env.example .env

# Edit .env with your values
# Use nano, vim, or any text editor
nano .env
```

### Edit `.env` file:

```env
GOOGLE_API_KEY=your_gemini_api_key_here
GOOGLE_SHEETS_CREDENTIALS_PATH=cred/service-account.json
GOOGLE_SHEET_NAME=Receipts
GEMINI_MODEL_ID=gemini-2.0-flash
DEBUG=True
```

Save and close the file.

### Start Backend Server

```bash
# Make sure you're in the backend directory with venv activated
python -m uvicorn app.main:app --reload --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

Test it: Open [http://localhost:8000](http://localhost:8000) in your browser.
You should see: `{"message": "Budget Buddy API", "version": "1.0.0", ...}`

API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## Step 3: Frontend Setup

Open a **NEW terminal** (keep backend running):

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Edit .env.local (usually default is fine)
nano .env.local
```

### Edit `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

Save and close.

### Start Frontend Server

```bash
# Make sure you're in the frontend directory
npm run dev
```

You should see:
```
▲ Next.js 14.x.x
- Local:        http://localhost:3000
- ready started server on 0.0.0.0:3000
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Step 4: Test the Application

### 1. Upload a Receipt

1. On the home page, drag and drop a receipt image
2. Wait for Gemini AI to extract data (5-10 seconds)
3. Review the extracted data

### 2. Confirm and Save

1. Edit any incorrect data
2. Click "Confirm & Save"
3. Check your Google Sheet - you should see new rows!

### 3. View Insights

1. Click "Insights" in the navigation
2. See your spending charts and trends
3. View the forecast for next month

### 4. Manage Budgets

1. Click "Budgets & Goals"
2. Create a budget for a category
3. See how much you've spent vs your limit

### 5. Set Goals

1. In the same page, create a savings goal
2. Set target amount and date
3. Track your progress

---

## Common Issues & Solutions

### Issue: "Module not found" errors in backend

**Solution**: Make sure virtual environment is activated and dependencies installed:
```bash
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
```

### Issue: "Google Sheets API error" or "SpreadsheetNotFound"

**Solution**:
1. **Create the Google Sheet**: Create a new Google Sheet and name it exactly "Receipts" (or whatever you set in `GOOGLE_SHEET_NAME`)
2. **Share the Sheet**: Share the Google Sheet with your service account email (found in the JSON credentials file, looks like `name@project.iam.gserviceaccount.com`) with "Editor" permissions
3. **Verify Credentials**:
   - Ensure service account JSON file exists in `cred/` directory
   - Check `GOOGLE_SHEETS_CREDENTIALS_PATH` in `.env` points to the correct file
4. **Note**: The backend will now start successfully even if the sheet isn't configured. You'll only see errors when you try to save a receipt or view insights.

### Issue: "Gemini API key invalid"

**Solution**:
1. Verify API key is correct in `.env`
2. Check API key has no extra spaces or quotes
3. Ensure Gemini API is enabled in Google Cloud Console

### Issue: Frontend can't connect to backend

**Solution**:
1. Verify backend is running on port 8000
2. Check `NEXT_PUBLIC_API_URL` in frontend `.env.local`
3. Check browser console for CORS errors
4. Restart both servers

### Issue: "Port already in use"

**Solution**:
```bash
# Backend (port 8000)
lsof -ti:8000 | xargs kill

# Frontend (port 3000)
lsof -ti:3000 | xargs kill
```

---

## Quick Reference Commands

### Backend

```bash
# Start backend
cd backend
source venv/bin/activate  # or venv\Scripts\activate
python -m uvicorn app.main:app --reload --port 8000

# Stop: Press Ctrl+C
```

### Frontend

```bash
# Start frontend
cd frontend
npm run dev

# Stop: Press Ctrl+C
```

### Both at once (Terminal Multiplexer)

If you have `tmux` or use VS Code integrated terminal, you can run both in split panes.

---

## Next Steps

1. ✅ Upload a few receipts to populate data
2. ✅ Explore the Insights dashboard
3. ✅ Create budgets for your common spending categories
4. ✅ Set financial goals
5. ✅ Review the full README.md for advanced features

---

## Development Mode

Both servers run in development mode with:
- **Backend**: Auto-reload on code changes
- **Frontend**: Hot module replacement

Edit code and see changes instantly!

---

## Production Deployment

For production deployment, see:
- Backend: [Railway](https://railway.app/), [Render](https://render.com/), [Fly.io](https://fly.io/)
- Frontend: [Vercel](https://vercel.com/), [Netlify](https://netlify.com/)

---

## Need Help?

- Check the full [README.md](./README.md)
- Review API docs at `http://localhost:8000/docs`
- Check browser console for frontend errors
- Check terminal logs for backend errors

---

**You're all set! Start processing receipts and managing your budget like a pro! 💰🚀**
