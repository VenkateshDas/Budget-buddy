#!/usr/bin/env python3
"""
Simple Receipt Processor CLI
Extracts receipt data using Gemini AI and saves to Google Sheets
"""

import os
import sys
import json
import argparse
from typing import Optional
from dotenv import load_dotenv
from google import genai
from pydantic import BaseModel, Field
from typing import List
import gspread
from oauth2client.service_account import ServiceAccountCredentials
import mimetypes

# Load environment variables
load_dotenv()

# Configuration
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
GOOGLE_SHEETS_CREDENTIALS_PATH = os.getenv("GOOGLE_SHEETS_CREDENTIALS_PATH", "cred/gen-lang-client-0229471649-dff2869d47fc.json")
GOOGLE_SHEET_NAME = os.getenv("GOOGLE_SHEET_NAME", "Receipts")

# Initialize Gemini client
gemini_client = genai.Client(api_key=GOOGLE_API_KEY)
model_id = "gemini-2.0-flash"

# Pydantic Models
class MerchantDetails(BaseModel):
    name: str
    address: str

class LineItem(BaseModel):
    item_name: str
    unit_price: float
    quantity: float
    price: float
    category: str

class TotalAmounts(BaseModel):
    total: float
    tax: Optional[float] = None
    payment_method: str

class Receipt(BaseModel):
    merchant_details: MerchantDetails
    purchase_date: str
    line_items: List[LineItem]
    total_amounts: TotalAmounts

def authenticate_sheets():
    """Authenticate with Google Sheets"""
    scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
    creds = ServiceAccountCredentials.from_json_keyfile_name(GOOGLE_SHEETS_CREDENTIALS_PATH, scope)
    return gspread.authorize(creds)

def extract_receipt_data(image_path: str) -> Optional[Receipt]:
    """Extract receipt data from image using Gemini"""
    try:
        # Check file exists
        if not os.path.exists(image_path):
            print(f"❌ Error: File not found: {image_path}")
            return None

        # Get mime type
        mimetype, _ = mimetypes.guess_type(image_path)
        if not mimetype:
            print("❌ Error: Could not determine file type")
            return None

        # Upload file to Gemini
        file_obj = gemini_client.files.upload(file=image_path, config={"mime_type": mimetype})

        # Extract data
        response = gemini_client.models.generate_content(
            model=model_id,
            contents=["Extract structured receipt data from this image. Return purchase date in DD-MM-YYYY format.", file_obj],
            config={"response_mime_type": "application/json", "response_schema": Receipt}
        )

        if response.parsed:
            return Receipt.model_validate(response.parsed)
        else:
            print("❌ Error: No data extracted from receipt")
            return None

    except Exception as e:
        print(f"❌ Error extracting receipt data: {e}")
        return None

def display_receipt_data(receipt: Receipt):
    """Display extracted receipt data to user"""
    print("\n" + "="*50)
    print("📋 EXTRACTED RECEIPT DATA")
    print("="*50)

    print(f"🏪 Merchant: {receipt.merchant_details.name}")
    print(f"📍 Address: {receipt.merchant_details.address}")
    print(f"📅 Date: {receipt.purchase_date}")
    print(f"💳 Payment: {receipt.total_amounts.payment_method}")

    print(f"\n🛒 Line Items ({len(receipt.line_items)}):")
    print("-" * 50)

    for i, item in enumerate(receipt.line_items, 1):
        print(f"{i}. {item.item_name}")
        print(f"   Category: {item.category}")
        print(f"   Quantity: {item.quantity} × ${item.unit_price:.2f} = ${item.price:.2f}")
        print()

    total = receipt.total_amounts.total
    tax = receipt.total_amounts.tax
    print(f"💰 Total: ${total:.2f}")
    if tax:
        print(f"💰 Tax: ${tax:.2f}")

    print("="*50)

def save_to_sheets(receipt: Receipt, sheet_name: str = GOOGLE_SHEET_NAME):
    """Save receipt data to Google Sheets"""
    try:
        # Authenticate
        sheets_client = authenticate_sheets()
        spreadsheet = sheets_client.open(sheet_name)

        # Get or create worksheet
        try:
            worksheet = spreadsheet.worksheet("Receipts")
        except gspread.exceptions.WorksheetNotFound:
            worksheet = spreadsheet.add_worksheet(title="Receipts", rows="100", cols="20")
            # Add headers
            headers = ["Date", "Merchant", "Address", "Item", "Category", "Qty", "Unit Price", "Total Price", "Tax", "Grand Total", "Payment"]
            worksheet.append_row(headers)

        # Prepare data rows
        rows = []
        for item in receipt.line_items:
            row = [
                receipt.purchase_date,
                receipt.merchant_details.name,
                receipt.merchant_details.address,
                item.item_name,
                item.category,
                item.quantity,
                item.unit_price,
                item.price,
                receipt.total_amounts.tax if receipt.total_amounts.tax else '',
                receipt.total_amounts.total,
                receipt.total_amounts.payment_method
            ]
            rows.append(row)

        # Append to sheet
        worksheet.append_rows(rows)
        print(f"✅ Successfully saved {len(rows)} line items to Google Sheets")

    except Exception as e:
        print(f"❌ Error saving to Google Sheets: {e}")
        return False

    return True

def main():
    parser = argparse.ArgumentParser(description="Process receipt image and save to Google Sheets")
    parser.add_argument("image_path", help="Path to receipt image file")
    parser.add_argument("--sheet", default=GOOGLE_SHEET_NAME, help="Google Sheet name")
    parser.add_argument("--auto-confirm", action="store_true", help="Skip confirmation and save automatically")

    args = parser.parse_args()

    # Validate API key
    if not GOOGLE_API_KEY:
        print("❌ Error: GOOGLE_API_KEY environment variable not set")
        sys.exit(1)

    # Validate credentials
    if not os.path.exists(GOOGLE_SHEETS_CREDENTIALS_PATH):
        print(f"❌ Error: Google Sheets credentials file not found: {GOOGLE_SHEETS_CREDENTIALS_PATH}")
        sys.exit(1)

    print(f"🔍 Processing receipt: {args.image_path}")

    # Extract receipt data
    receipt = extract_receipt_data(args.image_path)
    if not receipt:
        sys.exit(1)

    # Display extracted data
    display_receipt_data(receipt)

    # Get user confirmation
    if not args.auto_confirm:
        confirm = input("\n✅ Save this data to Google Sheets? (y/N): ").lower().strip()
        if confirm not in ['y', 'yes']:
            print("❌ Operation cancelled")
            sys.exit(0)

    # Save to Google Sheets
    if save_to_sheets(receipt, args.sheet):
        print("🎉 Receipt processing completed successfully!")
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()