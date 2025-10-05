# 📝 Natural Language Expense Tracking

## Overview

Users can now add expenses by simply typing them in natural language! No need to take photos or manually fill forms.

## 🎯 User Flow

```
1. Go to home page → Click "Quick Add (Text)" tab
2. Type expense: "Spent $45 on groceries at Whole Foods yesterday"
3. Click "Extract Expense"
4. Review extracted data (same confirmation UI as receipts)
5. Save to spreadsheet
```

## ✨ Features

### Smart Natural Language Processing
- **Relative dates**: "today", "yesterday", "last Monday"
- **Amount extraction**: "$45", "€30", "45 dollars"
- **Merchant detection**: "at Starbucks", "from Amazon"
- **Category inference**: Automatically categorizes based on context
- **Multiple items**: "Coffee $5, pastry $3"
- **Payment method**: "with credit card", "cash"

### Examples That Work

```
✅ "Spent $45 on groceries at Whole Foods yesterday"
✅ "Coffee $5.50 at Starbucks this morning"
✅ "Uber ride home $23.45 last night"
✅ "Movie tickets $30, popcorn $8 at AMC yesterday"
✅ "Gas station fill up $65 this morning with credit card"
✅ "Bought lunch for $12.50 at Chipotle on Monday"
```

## 🏗️ Technical Implementation

### Backend Components

**1. Date Parser** (`backend/app/utils/date_parser.py`)
- Parses relative dates to DD-MM-YYYY format
- Handles: today, yesterday, day before yesterday, last [weekday], N days ago
- Falls back to today if no date found

**2. Gemini Service** (`backend/app/services/gemini_service.py`)
- New method: `extract_expense_from_text(text, custom_categories)`
- Uses same Receipt model as photo uploads
- Smarter prompt with date context
- Returns structured data ready for confirmation

**3. API Endpoint** (`backend/app/api/routes/receipts.py`)
- `POST /receipts/text-to-expense`
- Takes: `{"text": "expense description"}`
- Returns: Same format as receipt upload
- Fetches user's custom categories
- Stores in temporary receipts_storage

### Frontend Components

**1. TextExpenseInput** (`frontend/components/TextExpenseInput.tsx`)
- Large textarea for natural language input
- Character counter
- 6 example expenses (click to try)
- Tips section for best results
- Loading states
- Error handling

**2. Updated Home Page** (`frontend/app/page.tsx`)
- Added sub-tabs: "Upload Receipt" vs "Quick Add (Text)"
- Both use same confirmation flow
- Seamless switching

**3. API Client** (`frontend/lib/api.ts`)
- New method: `receiptApi.textToExpense(text)`
- Logs request/response for debugging

## 🔄 Data Flow

```
User Input (text)
    ↓
Frontend: TextExpenseInput component
    ↓
API: POST /receipts/text-to-expense
    ↓
Backend: Fetch user categories
    ↓
Gemini: extract_expense_from_text()
    ↓
Date Parser: Parse relative dates
    ↓
Returns: Receipt model (same as photo uploads!)
    ↓
Frontend: Navigate to /confirm/[receiptId]
    ↓
Reuses: ReceiptConfirmation component
    ↓
Save to Google Sheets
```

## 🎨 UI/UX Highlights

1. **Clean Tab Interface**
   - Upload Receipt tab: For photos/PDFs
   - Quick Add tab: For text input
   - Smooth transition between modes

2. **Helpful Examples**
   - 6 pre-written examples
   - Click to auto-fill
   - Shows variety of formats

3. **Guided Input**
   - Tips section with checkmarks
   - Character counter
   - Clear button
   - Disabled state when empty

4. **Consistent Experience**
   - Same confirmation page as receipts
   - Same editing capabilities
   - Same save process

## 🧪 Testing

### Manual Test Cases

1. **Basic expense**
   - Input: "Coffee $5.50 today"
   - Expected: Extracts amount, date as today, category as Dining

2. **With merchant**
   - Input: "Lunch at Chipotle $12.50 yesterday"
   - Expected: Merchant = Chipotle, date = yesterday, category = Dining

3. **Multiple items**
   - Input: "Groceries: milk $4, bread $3, eggs $5 today"
   - Expected: 3 line items, total $12, category = Groceries

4. **Relative dates**
   - Input: "Uber ride $23 last Monday"
   - Expected: Correctly calculates last Monday's date

5. **Custom categories**
   - User has "Chennai Home" category
   - Input: "Rent $1000 today for Chennai Home"
   - Expected: Category = Chennai Home

6. **Payment method**
   - Input: "Gas $65 with credit card this morning"
   - Expected: Payment method = Credit Card

## 📊 Benefits

### For Users
- ⚡ **Faster**: No need to take photos for simple expenses
- 🎯 **Flexible**: Add expenses on-the-go
- 📱 **Convenient**: Works from any device
- 🧠 **Smart**: AI understands natural language

### For System
- 🔄 **Reuses code**: 90% of existing components
- 🎨 **Consistent**: Same UI/UX patterns
- 🛡️ **Reliable**: Same validation and error handling
- 📈 **Scalable**: No file storage for text expenses

## 🚀 Future Enhancements

1. **Voice Input**: Add microphone button for speech-to-text
2. **Recurring Expenses**: "Coffee $5 every weekday"
3. **Bulk Import**: Paste multiple expenses at once
4. **Auto-complete**: Suggest merchants and categories
5. **Templates**: Save common expense patterns
6. **Smart Defaults**: Learn from user's history

## 📝 Code Changes Summary

**New Files:**
- `backend/app/utils/date_parser.py` - Date parsing utilities
- `backend/app/utils/__init__.py` - Utils package
- `frontend/components/TextExpenseInput.tsx` - Text input component

**Modified Files:**
- `backend/app/services/gemini_service.py` - Added extract_expense_from_text()
- `backend/app/api/routes/receipts.py` - Added POST /text-to-expense endpoint
- `frontend/lib/api.ts` - Added textToExpense() method
- `frontend/app/page.tsx` - Added sub-tabs for upload methods

**Reused Components:**
- ReceiptConfirmation - No changes needed!
- Receipt model - No changes needed!
- Save logic - No changes needed!

## 🎓 Usage Guide

**For Simple Expenses:**
```
Just type: "Coffee $5 today"
```

**For Detailed Expenses:**
```
Include all info: "Bought lunch for $12.50 at Chipotle yesterday with credit card"
```

**For Multiple Items:**
```
List them: "Groceries: milk $4, bread $3, cheese $6 at Walmart today"
```

**Best Practices:**
1. Always include the amount
2. Mention when it happened (defaults to today)
3. Add merchant name if relevant
4. Specify payment method if needed
5. Be natural - write like you'd tell a friend!

---

**Status**: ✅ Fully implemented and ready for testing
**Dependencies**: Requires Gemini API key (already configured)
**Breaking Changes**: None - completely additive feature
