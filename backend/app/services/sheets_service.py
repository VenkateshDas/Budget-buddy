"""
Google Sheets service for data persistence
Ported from CLI script with additional functionality
"""
import gspread
from oauth2client.service_account import ServiceAccountCredentials
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from app.models.receipt import Receipt
from app.models.analysis import Budget, Goal, Category, GoalTransaction
from app.core.config import get_settings

settings = get_settings()


class SheetsService:
    """Service for Google Sheets operations"""

    def __init__(self):
        self.client = None
        self.spreadsheet = None
        self._authenticate()

    def _authenticate(self):
        """Authenticate with Google Sheets"""
        try:
            print(f"🔐 Authenticating with Google Sheets using: {settings.google_sheets_credentials_path}")
            scope = [
                "https://spreadsheets.google.com/feeds",
                "https://www.googleapis.com/auth/drive",
            ]
            print(f"📋 Using scopes: {scope}")
            creds = ServiceAccountCredentials.from_json_keyfile_name(
                settings.google_sheets_credentials_path, scope
            )
            print("✅ Credentials loaded successfully")
            self.client = gspread.authorize(creds)
            print("🔗 Client authorized successfully")

            # Try to open existing spreadsheet first
            print(f"📊 Looking for spreadsheet: {settings.google_sheet_name}")
            try:
                self.spreadsheet = self.client.open(settings.google_sheet_name)
                print(f"✅ Found existing spreadsheet: {self.spreadsheet.title}")
            except gspread.exceptions.SpreadsheetNotFound:
                print(f"📝 Spreadsheet '{settings.google_sheet_name}' not found, creating new one...")
                try:
                    self.spreadsheet = self.client.create(settings.google_sheet_name)
                    print(f"✅ Created new spreadsheet: {self.spreadsheet.title}")
                except Exception as create_error:
                    print(f"❌ Failed to create spreadsheet: {type(create_error).__name__}: {str(create_error)}")
                    print("💡 This might be due to insufficient permissions. Please ensure the service account has editor access to Google Drive.")
                    raise

        except FileNotFoundError as e:
            print(f"❌ Credentials file not found: {settings.google_sheets_credentials_path}")
            raise
        except Exception as e:
            print(f"❌ Authentication failed: {type(e).__name__}: {str(e)}")
            raise

    def _get_or_create_worksheet(self, title: str, headers: List[str]) -> gspread.Worksheet:
        """Get existing worksheet or create new one with headers"""
        try:
            print(f"🔍 Looking for worksheet: '{title}'")
            worksheet = self.spreadsheet.worksheet(title)
            print(f"✅ Found existing worksheet: '{worksheet.title}'")

            # Check if headers exist (first row should have headers)
            try:
                first_row = worksheet.row_values(1)
                if not first_row or first_row != headers:
                    print(f"⚠️  Headers don't match or are missing. Updating headers...")
                    worksheet.update('A1', [headers])
                    print("✅ Headers updated successfully")
            except Exception as e:
                print(f"⚠️  Could not verify headers: {e}")

        except gspread.exceptions.WorksheetNotFound:
            print(f"📝 Worksheet '{title}' not found, creating new one...")
            try:
                worksheet = self.spreadsheet.add_worksheet(title=title, rows="1000", cols="20")
                print(f"✅ Created new worksheet: '{worksheet.title}'")
                print(f"📋 Adding headers: {headers}")
                worksheet.update('A1', [headers])
                print("✅ Headers added successfully")
            except Exception as e:
                print(f"❌ Failed to create worksheet: {type(e).__name__}: {str(e)}")
                raise
        except Exception as e:
            print(f"❌ Error accessing worksheet: {type(e).__name__}: {str(e)}")
            raise
        return worksheet

    def save_receipt(self, receipt: Receipt) -> bool:
        """
        Save receipt data to Google Sheets

        Args:
            receipt: Receipt object to save

        Returns:
            Success boolean
        """
        try:
            print(f"💾 Saving receipt to Google Sheets...")
            print(f"📅 Receipt date: {receipt.purchase_date}")
            print(f"🏪 Merchant: {receipt.merchant_details.name}")
            print(f"📦 Line items count: {len(receipt.line_items)}")

            headers = [
                "Date",
                "Merchant",
                "Address",
                "Item",
                "Category",
                "Qty",
                "Unit Price",
                "Total Price",
                "Tax",
                "Grand Total",
                "Payment",
            ]
            print(f"📋 Headers: {headers}")

            print("🔍 Getting or creating worksheet 'Receipts'...")
            worksheet = self._get_or_create_worksheet("Receipts", headers)
            print(f"✅ Worksheet ready: {worksheet.title}")

            # Prepare data rows
            rows = []
            for i, item in enumerate(receipt.line_items, 1):
                row = [
                    receipt.purchase_date,
                    receipt.merchant_details.name,
                    receipt.merchant_details.address,
                    item.item_name,
                    item.category,
                    item.quantity,
                    item.unit_price,
                    item.price,
                    receipt.total_amounts.tax if receipt.total_amounts.tax else "",
                    receipt.total_amounts.total,
                    receipt.total_amounts.payment_method,
                ]
                rows.append(row)
                print(f"  📦 Row {i}: {item.item_name} - ${item.price}")

            print(f"📊 Total rows to append: {len(rows)}")

            # Append to sheet
            print("📝 Appending rows to Google Sheets...")
            worksheet.append_rows(rows)
            print(f"✅ Successfully saved {len(rows)} rows to Google Sheets")
            return True

        except Exception as e:
            print(f"❌ Error saving to Google Sheets: {type(e).__name__}: {str(e)}")
            import traceback
            print(f"🔍 Full traceback: {traceback.format_exc()}")
            return False

    def find_duplicate_receipts(self, receipt: Receipt, threshold_days: int = 1, fuzzy_threshold: int = 85) -> List[Dict[str, Any]]:
        """
        Find potential duplicate receipts using fuzzy matching and detailed comparison
        (Based on Telegram bot's sophisticated duplicate detection)

        Args:
            receipt: Receipt to check for duplicates
            threshold_days: Number of days within which to consider receipts as potential duplicates
            fuzzy_threshold: Minimum fuzzy match score (0-100) for merchant name similarity

        Returns:
            List of potential duplicate receipt summaries with detailed comparison
        """
        try:
            from fuzzywuzzy import fuzz
            import pandas as pd

            all_receipts = self.get_all_receipts()

            if not all_receipts:
                print("⚠️ No receipts found in Google Sheet.")
                return []

            print(f"🔎 Starting duplicate check. Total rows in sheet: {len(all_receipts)}")

            # Parse the receipt date
            try:
                if isinstance(receipt.purchase_date, str):
                    receipt_date = datetime.strptime(receipt.purchase_date, "%d-%m-%Y")
                else:
                    receipt_date = receipt.purchase_date
                receipt_date_str = receipt_date.strftime("%d-%m-%Y")
            except Exception as e:
                print(f"❌ Invalid date format in receipt: {receipt.purchase_date}")
                return []

            merchant_name = receipt.merchant_details.name.lower().strip()
            total_amount = float(receipt.total_amounts.total)

            print(f"Target Receipt - Date: {receipt_date_str}, Merchant: {merchant_name}, Total: ${total_amount}")

            # Create DataFrame for easier manipulation
            df = pd.DataFrame(all_receipts)

            # Normalize merchant names
            df['Merchant'] = df['Merchant'].str.lower().str.strip()

            # Convert numeric columns
            df['Grand Total'] = pd.to_numeric(df['Grand Total'], errors='coerce')
            df['Total Price'] = pd.to_numeric(df['Total Price'], errors='coerce')

            # Apply fuzzy matching for merchant names
            df['merchant_score'] = df['Merchant'].apply(
                lambda x: fuzz.token_set_ratio(str(x), merchant_name) if pd.notna(x) else 0
            )

            print(f"Fuzzy matching complete. Threshold: {fuzzy_threshold}")

            # Filter by date proximity and fuzzy merchant match
            df_match = df[df['merchant_score'] >= fuzzy_threshold].copy()

            # Further filter by date if possible
            def parse_date(date_str):
                try:
                    return datetime.strptime(str(date_str), "%d-%m-%Y")
                except:
                    try:
                        return datetime.strptime(str(date_str), "%Y-%m-%d")
                    except:
                        return None

            df_match['parsed_date'] = df_match['Date'].apply(parse_date)
            df_match = df_match[df_match['parsed_date'].notna()].copy()
            df_match['date_diff'] = df_match['parsed_date'].apply(
                lambda x: abs((receipt_date - x).days) if x else 999
            )
            df_match = df_match[df_match['date_diff'] <= threshold_days]

            print(f"Rows matching date and fuzzy merchant (threshold {fuzzy_threshold}): {len(df_match)}")

            if df_match.empty:
                print("✅ No matching receipts found.")
                return []

            # Group by date, merchant, and grand total to reconstruct receipts
            receipt_groups = {}

            for _, row in df_match.iterrows():
                try:
                    date_str = str(row.get("Date", ""))
                    merchant = str(row.get("Merchant", ""))
                    grand_total = float(row.get("Grand Total", 0) or 0)

                    # Skip rows with zero total
                    if grand_total == 0:
                        continue

                    # Create unique key for each receipt
                    key = f"{date_str}|{merchant}|{grand_total:.2f}"

                    if key not in receipt_groups:
                        receipt_groups[key] = {
                            "Date": date_str,
                            "Merchant": merchant,
                            "Address": str(row.get("Address", "")),
                            "Grand Total": grand_total,
                            "Tax": str(row.get("Tax", "")),
                            "Payment": str(row.get("Payment", "")),
                            "items": [],
                            "merchant_score": row.get("merchant_score", 0)
                        }

                    # Add item to this receipt group (skip if Item is empty or "TOTAL")
                    item_name = str(row.get("Item", "")).strip()
                    if item_name and item_name.upper() != "TOTAL":
                        receipt_groups[key]["items"].append({
                            "Item": item_name,
                            "Category": str(row.get("Category", "")),
                            "Qty": row.get("Qty", ""),
                            "Unit Price": row.get("Unit Price", ""),
                            "Total Price": float(row.get("Total Price", 0) or 0)
                        })

                except Exception as e:
                    print(f"Error processing row: {e}")
                    continue

            # Check each grouped receipt for duplicates
            duplicates = []

            # Build expected items list from the new receipt (normalized)
            def normalize_item_name(name):
                """Normalize item name by removing special chars and extra whitespace"""
                import re
                # Remove newlines, extra spaces, special chars
                normalized = re.sub(r'[\n\r\t]+', ' ', name.lower().strip())
                normalized = re.sub(r'\s+', ' ', normalized)
                return normalized

            expected_items_list = [
                {
                    'name': normalize_item_name(item.item_name),
                    'price': round(item.price, 2),
                    'original_name': item.item_name
                }
                for item in receipt.line_items
            ]

            print(f"Expected items from new receipt ({len(expected_items_list)} items):")
            for item in expected_items_list[:5]:  # Show first 5
                print(f"  - {item['name']}: ${item['price']}")

            for key, existing_receipt in receipt_groups.items():
                try:
                    # Check if grand total matches (within 1 cent)
                    existing_total = existing_receipt.get("Grand Total", 0)
                    amount_diff = abs(total_amount - existing_total)

                    if amount_diff > 0.01:
                        continue

                    # Build matched items list from existing receipt (normalized)
                    matched_items_list = [
                        {
                            'name': normalize_item_name(item["Item"]),
                            'price': round(item["Total Price"], 2),
                            'original_name': item["Item"]
                        }
                        for item in existing_receipt["items"]
                    ]

                    print(f"\nComparing with existing receipt ({len(matched_items_list)} items):")
                    for item in matched_items_list[:5]:  # Show first 5
                        print(f"  - {item['name']}: ${item['price']}")

                    # Smart similarity check using fuzzy matching for item names
                    matched_count = 0
                    total_items = max(len(expected_items_list), len(matched_items_list))

                    # For each expected item, find best match in existing receipt
                    for exp_item in expected_items_list:
                        best_match_score = 0
                        for match_item in matched_items_list:
                            # Use fuzzy matching for item name similarity
                            name_similarity = fuzz.ratio(exp_item['name'], match_item['name'])

                            # If names are very similar (85%+), consider it a match
                            if name_similarity >= 85:
                                matched_count += 1
                                break

                    # Calculate match percentage
                    match_percentage = (matched_count / total_items * 100) if total_items > 0 else 0

                    print(f"📊 Match score: {matched_count}/{total_items} items ({match_percentage:.1f}%)")

                    # Consider it a duplicate if:
                    # 1. Same date, merchant, and grand total
                    # 2. At least 70% of items match by name (fuzzy)
                    is_duplicate = match_percentage >= 70

                    if is_duplicate:
                        duplicate_summary = {
                            "Date": existing_receipt["Date"],
                            "Merchant": existing_receipt["Merchant"],
                            "Address": existing_receipt["Address"],
                            "Grand Total": existing_receipt["Grand Total"],
                            "Tax": existing_receipt["Tax"],
                            "Payment": existing_receipt["Payment"],
                            "Item": f"{len(existing_receipt['items'])} items",
                            "Category": ", ".join(set(
                                item["Category"] for item in existing_receipt["items"]
                                if item.get("Category")
                            )),
                            "match_type": "fuzzy_match",
                            "match_percentage": round(match_percentage, 1),
                            "merchant_score": existing_receipt.get("merchant_score", 0),
                            "items_detail": existing_receipt["items"]
                        }
                        duplicates.append(duplicate_summary)
                        print(f"✅ Duplicate found! ({match_percentage:.1f}% match)")

                except Exception as e:
                    print(f"Error processing potential duplicate: {e}")
                    continue

            print(f"Total duplicates found: {len(duplicates)}")
            return duplicates

        except Exception as e:
            print(f"❌ Error checking for duplicates: {e}")
            import traceback
            print(f"🔍 Full traceback: {traceback.format_exc()}")
            return []

    def get_all_receipts(self) -> List[Dict[str, Any]]:
        """
        Get all receipt data from Google Sheets

        Returns:
            List of receipt dictionaries
        """
        try:
            worksheet = self.spreadsheet.worksheet("Receipts")
            records = worksheet.get_all_records()
            return records
        except Exception as e:
            print(f"Error reading from Google Sheets: {e}")
            return []

    def save_budget(self, budget: Budget) -> bool:
        """Save or update budget"""
        try:
            headers = ["ID", "Category", "Limit", "Period", "Period Type", "Start Date", "End Date"]
            worksheet = self._get_or_create_worksheet("Budgets", headers)

            # Check if budget exists
            all_budgets = worksheet.get_all_records()
            budget_id = budget.id or f"budget_{datetime.now().timestamp()}"

            row = [
                budget_id,
                budget.category,
                budget.limit,
                budget.period,
                budget.period_type,
                budget.start_date or "",
                budget.end_date or "",
            ]

            # Update existing or append new
            existing_row = None
            for idx, b in enumerate(all_budgets, start=2):  # start=2 to skip header
                if b.get("ID") == budget_id:
                    existing_row = idx
                    break

            if existing_row:
                worksheet.update(f"A{existing_row}:G{existing_row}", [row])
            else:
                worksheet.append_row(row)

            return True
        except Exception as e:
            print(f"Error saving budget: {e}")
            return False

    def get_all_budgets(self) -> List[Dict[str, Any]]:
        """Get all budgets"""
        try:
            worksheet = self.spreadsheet.worksheet("Budgets")
            return worksheet.get_all_records()
        except gspread.exceptions.WorksheetNotFound:
            return []
        except Exception as e:
            print(f"Error reading budgets: {e}")
            return []

    def delete_budget(self, budget_id: str) -> bool:
        """Delete budget by ID"""
        try:
            worksheet = self.spreadsheet.worksheet("Budgets")
            all_budgets = worksheet.get_all_records()

            for idx, budget in enumerate(all_budgets, start=2):
                if budget.get("ID") == budget_id:
                    worksheet.delete_rows(idx)
                    return True
            return False
        except Exception as e:
            print(f"Error deleting budget: {e}")
            return False

    def save_goal(self, goal: Goal) -> bool:
        """Save or update goal"""
        try:
            headers = ["ID", "Name", "Target Amount", "Current Amount", "Target Date", "Category", "Goal Type", "Auto Track"]
            worksheet = self._get_or_create_worksheet("Goals", headers)

            goal_id = goal.id or f"goal_{datetime.now().timestamp()}"
            row = [
                goal_id,
                goal.name,
                goal.target_amount,
                goal.current_amount,
                goal.target_date,
                goal.category or "",
                goal.goal_type,
                str(goal.auto_track),
            ]

            # Update existing or append new
            all_goals = worksheet.get_all_records()
            existing_row = None
            for idx, g in enumerate(all_goals, start=2):
                if g.get("ID") == goal_id:
                    existing_row = idx
                    break

            if existing_row:
                worksheet.update(f"A{existing_row}:H{existing_row}", [row])
            else:
                worksheet.append_row(row)

            return True
        except Exception as e:
            print(f"Error saving goal: {e}")
            return False

    def get_all_goals(self) -> List[Dict[str, Any]]:
        """Get all goals"""
        try:
            worksheet = self.spreadsheet.worksheet("Goals")
            return worksheet.get_all_records()
        except gspread.exceptions.WorksheetNotFound:
            return []
        except Exception as e:
            print(f"Error reading goals: {e}")
            return []

    def delete_goal(self, goal_id: str) -> bool:
        """Delete goal by ID"""
        try:
            worksheet = self.spreadsheet.worksheet("Goals")
            all_goals = worksheet.get_all_records()

            for idx, goal in enumerate(all_goals, start=2):
                if goal.get("ID") == goal_id:
                    worksheet.delete_rows(idx)
                    return True
            return False
        except Exception as e:
            print(f"Error deleting goal: {e}")
            return False

    def save_category(self, category: Category) -> bool:
        """Save custom category"""
        try:
            headers = ["ID", "Name", "Icon", "Color", "Is Default"]
            worksheet = self._get_or_create_worksheet("Categories", headers)

            category_id = category.id or f"cat_{datetime.now().timestamp()}"
            row = [
                category_id,
                category.name,
                category.icon or "📦",
                category.color or "#6366f1",
                str(category.is_default),
            ]

            worksheet.append_row(row)
            return True
        except Exception as e:
            print(f"Error saving category: {e}")
            return False

    def get_all_categories(self) -> List[Dict[str, Any]]:
        """Get all categories"""
        # Default categories to return
        default_categories = [
            {"ID": "1", "Name": "Groceries", "Icon": "🛒", "Color": "#10b981", "Is Default": "True"},
            {"ID": "2", "Name": "Dining", "Icon": "🍽️", "Color": "#f59e0b", "Is Default": "True"},
            {"ID": "3", "Name": "Transport", "Icon": "🚗", "Color": "#3b82f6", "Is Default": "True"},
            {"ID": "4", "Name": "Utilities", "Icon": "💡", "Color": "#8b5cf6", "Is Default": "True"},
            {"ID": "5", "Name": "Entertainment", "Icon": "🎬", "Color": "#ec4899", "Is Default": "True"},
            {"ID": "6", "Name": "Shopping", "Icon": "🛍️", "Color": "#06b6d4", "Is Default": "True"},
            {"ID": "7", "Name": "Health", "Icon": "⚕️", "Color": "#ef4444", "Is Default": "True"},
            {"ID": "8", "Name": "Other", "Icon": "📦", "Color": "#6b7280", "Is Default": "True"},
        ]

        try:
            worksheet = self.spreadsheet.worksheet("Categories")
            return worksheet.get_all_records()
        except (gspread.exceptions.WorksheetNotFound, gspread.exceptions.SpreadsheetNotFound):
            # Return default categories if worksheet or spreadsheet doesn't exist
            return default_categories
        except Exception as e:
            print(f"Error reading categories: {e}")
            # Return default categories on any error
            return default_categories

    def get_spreadsheet_url(self) -> Optional[str]:
        """
        Get the URL of the Google Sheets spreadsheet

        Returns:
            Spreadsheet URL or None if not available
        """
        try:
            if self.spreadsheet:
                return self.spreadsheet.url
            return None
        except Exception as e:
            print(f"Error getting spreadsheet URL: {e}")
            return None

    def _normalize_category(self, category: str) -> str:
        """Normalize category name for matching"""
        # Remove trailing 's', convert to lowercase, strip whitespace
        normalized = category.lower().strip()
        # Handle plural/singular variations
        if normalized.endswith('ies'):
            normalized = normalized[:-3] + 'y'  # groceries -> grocery
        elif normalized.endswith('s') and not normalized.endswith('ss'):
            normalized = normalized[:-1]  # items -> item
        return normalized

    def calculate_budget_spending(
        self,
        category: str,
        period: str = "monthly",
        period_type: str = "calendar_month",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> float:
        """
        Calculate current spending for a budget category and period

        Args:
            category: Category name to filter by
            period: "monthly" or "weekly" (for backward compatibility)
            period_type: "rolling", "calendar_month", "calendar_week", "custom"
            start_date: Custom start date (YYYY-MM-DD format)
            end_date: Custom end date (YYYY-MM-DD format)

        Returns:
            Total spending for the period
        """
        try:
            receipts = self.get_all_receipts()
            now = datetime.now()
            total_spending = 0.0

            # Normalize the target category for fuzzy matching
            normalized_category = self._normalize_category(category)

            # Determine date range based on period_type
            range_start = None
            range_end = None

            if period_type == "rolling":
                # Rolling period (last N days)
                if period == "weekly":
                    range_start = now - timedelta(days=7)
                else:  # monthly
                    range_start = now - timedelta(days=30)
                range_end = now

            elif period_type == "calendar_month":
                # Current calendar month
                range_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                # Last day of current month
                if now.month == 12:
                    range_end = now.replace(month=12, day=31, hour=23, minute=59, second=59)
                else:
                    next_month = now.replace(month=now.month + 1, day=1)
                    range_end = next_month - timedelta(seconds=1)

            elif period_type == "calendar_week":
                # Current calendar week (Monday to Sunday)
                start_of_week = now - timedelta(days=now.weekday())
                range_start = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
                range_end = start_of_week + timedelta(days=6, hours=23, minutes=59, seconds=59)

            elif period_type == "custom" and start_date and end_date:
                # Custom date range
                try:
                    range_start = datetime.strptime(start_date, "%Y-%m-%d")
                    range_end = datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
                except:
                    # Fallback to calendar month if parsing fails
                    range_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                    range_end = now

            else:
                # Default: calendar month
                range_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                range_end = now

            print(f"💰 Budget calculation for '{category}' ({period_type})")
            print(f"   Date range: {range_start.strftime('%Y-%m-%d')} to {range_end.strftime('%Y-%m-%d')}")

            # Calculate spending
            for receipt in receipts:
                try:
                    # Check category match with fuzzy matching
                    receipt_category = receipt.get("Category", "").strip()
                    normalized_receipt_cat = self._normalize_category(receipt_category)

                    # Match if normalized categories are the same
                    if normalized_receipt_cat != normalized_category:
                        continue

                    # Parse date
                    date_str = receipt.get("Date", "")
                    try:
                        receipt_date = datetime.strptime(date_str, "%d-%m-%Y")
                    except:
                        try:
                            receipt_date = datetime.strptime(date_str, "%Y-%m-%d")
                        except:
                            continue

                    # Check if within date range
                    if range_start <= receipt_date <= range_end:
                        amount = float(receipt.get("Total Price", 0))
                        total_spending += amount
                        print(f"   ✓ Included: {receipt_date.strftime('%Y-%m-%d')} - {receipt_category} - ${amount}")

                except Exception as e:
                    print(f"   ✗ Error processing receipt: {e}")
                    continue

            print(f"   Total spending: ${total_spending:.2f}")
            return total_spending

        except Exception as e:
            print(f"Error calculating budget spending: {e}")
            return 0.0

    def save_goal_transaction(self, transaction: GoalTransaction) -> bool:
        """Save a goal transaction"""
        try:
            headers = ["ID", "Goal ID", "Amount", "Type", "Date", "Note"]
            worksheet = self._get_or_create_worksheet("Goal Transactions", headers)

            transaction_id = transaction.id or f"txn_{datetime.now().timestamp()}"
            row = [
                transaction_id,
                transaction.goal_id,
                transaction.amount,
                transaction.transaction_type,
                transaction.date,
                transaction.note or "",
            ]

            worksheet.append_row(row)
            return True
        except Exception as e:
            print(f"Error saving goal transaction: {e}")
            return False

    def get_goal_transactions(self, goal_id: str) -> List[Dict[str, Any]]:
        """Get all transactions for a specific goal"""
        try:
            worksheet = self.spreadsheet.worksheet("Goal Transactions")
            all_transactions = worksheet.get_all_records()

            # Filter by goal_id
            return [t for t in all_transactions if t.get("Goal ID") == goal_id]
        except gspread.exceptions.WorksheetNotFound:
            return []
        except Exception as e:
            print(f"Error reading goal transactions: {e}")
            return []

    def calculate_goal_progress(self, goal: Goal) -> float:
        """
        Calculate goal progress based on goal type

        Args:
            goal: Goal object

        Returns:
            Current amount for the goal
        """
        try:
            if not goal.auto_track:
                # Manual tracking - use current_amount as is
                return goal.current_amount

            # Get manual transactions
            transactions = self.get_goal_transactions(goal.id or "")
            transaction_total = 0.0
            for txn in transactions:
                amount = float(txn.get("Amount", 0))
                txn_type = txn.get("Type", "")
                if txn_type == "deposit":
                    transaction_total += amount
                elif txn_type == "withdrawal":
                    transaction_total -= amount

            if goal.goal_type == "savings":
                # Savings goal: manual transactions contribute to current amount
                return transaction_total

            elif goal.goal_type == "spending_limit":
                # Spending limit: track spending in category
                if goal.category:
                    # Parse target date to determine period
                    try:
                        target_date = datetime.strptime(goal.target_date, "%Y-%m-%d")
                        now = datetime.now()

                        # If target is within this month, use monthly period
                        if target_date.month == now.month and target_date.year == now.year:
                            spending = self.calculate_budget_spending(goal.category, "monthly")
                        else:
                            # Use all-time spending up to target date
                            receipts = self.get_all_receipts()
                            spending = 0.0
                            for receipt in receipts:
                                try:
                                    if receipt.get("Category", "").strip().lower() == goal.category.lower():
                                        date_str = receipt.get("Date", "")
                                        try:
                                            receipt_date = datetime.strptime(date_str, "%d-%m-%Y")
                                        except:
                                            receipt_date = datetime.strptime(date_str, "%Y-%m-%d")

                                        if receipt_date <= target_date:
                                            spending += float(receipt.get("Total Price", 0))
                                except:
                                    continue

                        return spending
                    except:
                        return 0.0
                return 0.0

            return goal.current_amount

        except Exception as e:
            print(f"Error calculating goal progress: {e}")
            return goal.current_amount
