# 💰 Budget Buddy

**AI-Powered Receipt Processing & Budget Management Platform**

Budget Buddy is a full-stack web application that transforms your receipt management and budget tracking experience using Google Gemini AI. Upload receipts, get instant AI extraction, analyze spending patterns, and manage budgets seamlessly.

---

## ✨ Features

### 🤖 AI Receipt Processing
- **Smart Extraction**: Upload receipt images and let Gemini AI extract merchant details, line items, prices, and categories automatically
- **Interactive Review**: Review and edit extracted data with an intuitive interface
- **Feedback Loop**: AI chat sidebar allows you to provide feedback and reprocess receipts for improved accuracy
- **High Accuracy**: Confidence scoring and detailed extraction logs

### 📊 Spending Insights
- **Trend Analysis**: Visualize spending over time with interactive line charts (monthly/weekly views)
- **Category Breakdown**: Bar charts and pie charts showing spending distribution across categories
- **Forecasting**: AI-powered predictions for next month's spending based on historical data
- **Detailed Tables**: Comprehensive category analysis with totals, averages, and percentages

### 💰 Budget Management
- **Smart Budgets**: Set monthly/weekly spending limits by category
- **Real-time Tracking**: Visual progress bars showing current spending vs budget
- **Overflow Alerts**: Automatic warnings when approaching or exceeding budget limits
- **Status Dashboard**: Overall budget health at a glance

### 🎯 Goals Tracking
- **Savings Goals**: Create and track financial goals with target amounts and dates
- **Progress Monitoring**: Visual progress indicators with completion percentages
- **Deadline Tracking**: Countdown timers and overdue notifications
- **Achievement Badges**: Celebrate when goals are reached

---

## 🏗️ Architecture

Budget Buddy follows a layered architecture:

```
INPUT → PROCESSING → INTELLIGENCE → PRESENTATION
```

### Technology Stack

**Backend (FastAPI)**
- Python 3.9+
- FastAPI for RESTful API
- Google Gemini AI (gemini-2.0-flash) for receipt extraction
- Google Sheets for data storage (via gspread)
- Pydantic for data validation
- OAuth2 for Google Sheets authentication

**Frontend (Next.js 14)**
- React 18 with TypeScript
- Next.js App Router
- Tailwind CSS for styling
- Recharts for data visualization
- React Dropzone for file uploads
- React Hot Toast for notifications
- Axios for API calls

---

## 🚀 Quick Start

### Prerequisites

- Python 3.9+
- Node.js 18+
- npm or yarn
- Google Cloud Project with Gemini API enabled
- Google Sheets API credentials

### 1. Clone Repository

```bash
cd budget_buddy
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your API keys:
# - GOOGLE_API_KEY (Gemini AI)
# - GOOGLE_SHEETS_CREDENTIALS_PATH (path to service account JSON)
# - GOOGLE_SHEET_NAME (name of your Google Sheet)

# Run backend server
python -m uvicorn app.main:app --reload --port 8000
```

Backend will be available at `http://localhost:8000`
API documentation at `http://localhost:8000/docs`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local if backend URL is different from http://localhost:8000/api

# Run frontend development server
npm run dev
```

Frontend will be available at `http://localhost:3000`

---

## 📁 Project Structure

```
budget_buddy/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI application
│   │   ├── models/                 # Pydantic models
│   │   │   ├── receipt.py
│   │   │   └── analysis.py
│   │   ├── services/               # Business logic
│   │   │   ├── gemini_service.py   # AI extraction
│   │   │   ├── sheets_service.py   # Data persistence
│   │   │   └── analysis_service.py # Insights & forecasting
│   │   ├── api/
│   │   │   └── routes/             # API endpoints
│   │   │       ├── receipts.py
│   │   │       ├── analysis.py
│   │   │       └── budgets.py
│   │   └── core/
│   │       └── config.py           # Settings & configuration
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── app/
│   │   ├── layout.tsx              # Root layout with navigation
│   │   ├── page.tsx                # Home/upload page
│   │   ├── insights/
│   │   │   └── page.tsx            # Insights dashboard
│   │   └── budgets/
│   │       └── page.tsx            # Budgets & goals page
│   ├── components/
│   │   ├── ReceiptUpload.tsx       # Drag-and-drop upload
│   │   ├── ReceiptConfirmation.tsx # Review & edit interface
│   │   ├── ExtractionChatSidebar.tsx # AI chat sidebar
│   │   ├── TrendCharts.tsx         # Recharts visualizations
│   │   ├── BudgetManager.tsx       # Budget CRUD
│   │   └── GoalsTracker.tsx        # Goals management
│   ├── lib/
│   │   ├── api.ts                  # API client
│   │   └── types.ts                # TypeScript definitions
│   ├── package.json
│   └── .env.example
│
└── receipt_processor_cli.py        # Original CLI script (reference)
```

---

## 🔑 Google Cloud Setup

### 1. Get Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Add to `backend/.env` as `GOOGLE_API_KEY`

### 2. Set Up Google Sheets

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Google Sheets API and Google Drive API
3. Create a Service Account and download JSON credentials
4. Share your Google Sheet with the service account email (found in JSON)
5. Place credentials JSON in `backend/cred/` directory
6. Update `GOOGLE_SHEETS_CREDENTIALS_PATH` in `.env`

---

## 🎯 Usage Guide

### 1. Upload Receipt

1. Navigate to home page
2. Drag & drop receipt image or click to browse
3. Wait for AI extraction (5-10 seconds)
4. Review extracted data in confirmation screen

### 2. Review & Edit

- Edit merchant name, address, date, payment method
- Modify line items: name, category, quantity, unit price
- Add or remove items as needed
- Total is calculated automatically

### 3. Save Receipt

- Click "Confirm & Save" to save to Google Sheets
- Background analysis is triggered automatically
- Navigate to Insights to view updated data

### 4. View Insights

- **Trends**: See spending over time (monthly/weekly)
- **Category Breakdown**: Bar and pie charts
- **Forecast**: AI prediction for next month
- **Detailed Table**: Category totals, counts, averages

### 5. Manage Budgets

- Create budgets for categories with spending limits
- Visual progress bars show current vs budget
- Alerts when approaching or exceeding limits
- Overall budget health dashboard

### 6. Track Goals

- Set savings or spending goals with targets and deadlines
- Monitor progress with visual indicators
- Get notifications for approaching deadlines
- Celebrate goal achievements

---

## 🛠️ API Endpoints

### Receipts
- `POST /api/receipts/upload` - Upload and extract receipt
- `PUT /api/receipts/{id}/confirm` - Save confirmed receipt
- `POST /api/receipts/{id}/reprocess` - Reprocess with feedback
- `GET /api/receipts/{id}` - Get receipt by ID

### Analysis
- `GET /api/analysis/trends?period=monthly|weekly` - Get spending trends
- `GET /api/analysis/forecast` - Get spending forecast
- `GET /api/analysis/categorization?period=all|this_month|last_month` - Category analysis
- `GET /api/analysis/budget-status` - Current budget status

### Budgets
- `POST /api/budgets` - Create budget
- `GET /api/budgets` - List all budgets
- `PUT /api/budgets/{id}` - Update budget
- `DELETE /api/budgets/{id}` - Delete budget

### Goals
- `POST /api/budgets/goals` - Create goal
- `GET /api/budgets/goals` - List all goals
- `PUT /api/budgets/goals/{id}` - Update goal
- `DELETE /api/budgets/goals/{id}` - Delete goal

### Categories
- `GET /api/budgets/categories` - List all categories
- `POST /api/budgets/categories` - Create custom category

---

## 🎨 Design Features

### Responsive Design
- Mobile-first approach
- Collapsible navigation
- Touch-friendly components
- Adaptive layouts for all screen sizes

### Accessibility
- Keyboard navigation support
- ARIA labels for screen readers
- Color contrast compliance
- Focus indicators

### User Experience
- Loading states with spinners and progress bars
- Toast notifications for all actions
- Empty states with helpful CTAs
- Smooth transitions and animations
- Color-coded status indicators (green/yellow/red)

---

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest
```

### Frontend Tests
```bash
cd frontend
npm test
```

### API Testing
Use the interactive docs at `http://localhost:8000/docs` or import the collection into Postman/Insomnia.

---

## 📊 Data Storage

Budget Buddy uses Google Sheets for data storage:

### Worksheets
- **Receipts**: All receipt line items with date, merchant, items, categories
- **Budgets**: Category budgets with limits and periods
- **Goals**: Financial goals with targets and progress
- **Categories**: Custom expense categories with icons and colors

### Schema
See Pydantic models in `backend/app/models/` for detailed schema.

---

## 🚧 Roadmap

### Phase 1 (Current)
- ✅ Receipt upload and AI extraction
- ✅ Review and confirmation interface
- ✅ Insights dashboard with charts
- ✅ Budget and goals management

### Phase 2 (Future)
- [ ] Database migration (PostgreSQL/MongoDB)
- [ ] User authentication and multi-user support
- [ ] Receipt image storage
- [ ] Email forwarding integration
- [ ] Mobile app (React Native)
- [ ] Advanced ML categorization
- [ ] Real-time WebSocket updates
- [ ] Export to PDF/CSV
- [ ] Recurring expense detection
- [ ] Bill reminders and notifications

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgments

- **Google Gemini AI** for powerful receipt extraction
- **FastAPI** for excellent Python API framework
- **Next.js** for amazing React framework
- **Recharts** for beautiful data visualizations
- **Tailwind CSS** for utility-first styling

---

## 📞 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Email: support@budgetbuddy.app

---

## 🎉 Getting Started

Ready to transform your receipt management? Follow the Quick Start guide above and start uploading receipts today!

**Happy Budgeting! 💰📊🎯**
