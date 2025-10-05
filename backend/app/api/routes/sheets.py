"""
Sheets management endpoints for viewing and editing Google Sheets data
"""
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from app.services.sheets_service import SheetsService

router = APIRouter(prefix="/sheets", tags=["sheets"])


class CellUpdate(BaseModel):
    """Model for updating a single cell"""
    row: int  # 1-indexed row number
    col: int  # 1-indexed column number
    value: str


class RowUpdate(BaseModel):
    """Model for updating an entire row"""
    values: List[str]


@router.get("/list")
async def list_sheets():
    """Get list of all sheets in the spreadsheet"""
    try:
        sheets_service = SheetsService()
        # Get all worksheets
        worksheets = sheets_service.spreadsheet.worksheets()

        sheets_list = []
        for ws in worksheets:
            # Get actual data to count non-empty rows
            all_values = ws.get_all_values()

            # Count rows with data (excluding header row and empty rows)
            data_row_count = 0
            if len(all_values) > 1:  # Has at least header + 1 row
                for row in all_values[1:]:  # Skip header
                    # Check if row has any non-empty values
                    if any(cell.strip() for cell in row if cell):
                        data_row_count += 1

            sheets_list.append({
                "title": ws.title,
                "id": ws.id,
                "row_count": data_row_count + 1,  # +1 for header row
                "col_count": ws.col_count,
            })

        return {"sheets": sheets_list}
    except Exception as e:
        print(f"❌ Error listing sheets: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{sheet_name}")
async def get_sheet_data(sheet_name: str):
    """
    Get all data from a specific sheet

    Args:
        sheet_name: Name of the sheet (e.g., "Receipts", "Budgets")

    Returns:
        Headers and all rows of data
    """
    try:
        sheets_service = SheetsService()
        worksheet = sheets_service.spreadsheet.worksheet(sheet_name)

        # Get all values including headers
        all_values = worksheet.get_all_values()

        if not all_values:
            return {
                "sheet_name": sheet_name,
                "headers": [],
                "rows": [],
                "row_count": 0
            }

        headers = all_values[0] if len(all_values) > 0 else []
        rows = all_values[1:] if len(all_values) > 1 else []

        # Add row numbers to each row for editing
        rows_with_numbers = [
            {"row_number": idx + 2, "values": row}  # +2 because row 1 is header, and 1-indexed
            for idx, row in enumerate(rows)
        ]

        return {
            "sheet_name": sheet_name,
            "headers": headers,
            "rows": rows_with_numbers,
            "row_count": len(rows)
        }
    except Exception as e:
        print(f"❌ Error fetching sheet '{sheet_name}': {e}")
        raise HTTPException(status_code=404, detail=f"Sheet '{sheet_name}' not found or error: {str(e)}")


@router.put("/{sheet_name}/cell")
async def update_cell(sheet_name: str, update: CellUpdate):
    """
    Update a single cell in the sheet

    Args:
        sheet_name: Name of the sheet
        update: Cell update details (row, col, value)
    """
    try:
        sheets_service = SheetsService()
        worksheet = sheets_service.spreadsheet.worksheet(sheet_name)

        # Update the cell (gspread uses 1-indexed rows and cols)
        worksheet.update_cell(update.row, update.col, update.value)

        return {
            "success": True,
            "message": f"Cell ({update.row}, {update.col}) updated successfully"
        }
    except Exception as e:
        print(f"❌ Error updating cell in '{sheet_name}': {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{sheet_name}/row/{row_number}")
async def update_row(sheet_name: str, row_number: int, update: RowUpdate):
    """
    Update an entire row in the sheet

    Args:
        sheet_name: Name of the sheet
        row_number: Row number to update (1-indexed, row 1 is headers)
        update: New values for the row
    """
    try:
        sheets_service = SheetsService()
        worksheet = sheets_service.spreadsheet.worksheet(sheet_name)

        # Get the column count to determine range
        num_cols = len(update.values)

        # Update the row using A1 notation
        # For example, if row_number=2 and num_cols=11, range is "A2:K2"
        end_col = chr(ord('A') + num_cols - 1) if num_cols <= 26 else f"A{num_cols}"
        range_notation = f"A{row_number}:{end_col}{row_number}"

        worksheet.update(range_notation, [update.values])

        return {
            "success": True,
            "message": f"Row {row_number} updated successfully"
        }
    except Exception as e:
        print(f"❌ Error updating row {row_number} in '{sheet_name}': {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{sheet_name}/row/{row_number}")
async def delete_row(sheet_name: str, row_number: int):
    """
    Delete a row from the sheet

    Args:
        sheet_name: Name of the sheet
        row_number: Row number to delete (1-indexed, row 1 is headers)
    """
    try:
        if row_number <= 1:
            raise HTTPException(status_code=400, detail="Cannot delete header row")

        sheets_service = SheetsService()
        worksheet = sheets_service.spreadsheet.worksheet(sheet_name)

        # Delete the row
        worksheet.delete_rows(row_number)

        return {
            "success": True,
            "message": f"Row {row_number} deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error deleting row {row_number} in '{sheet_name}': {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{sheet_name}/row")
async def add_row(sheet_name: str, update: RowUpdate):
    """
    Add a new row to the sheet

    Args:
        sheet_name: Name of the sheet
        update: Values for the new row
    """
    try:
        sheets_service = SheetsService()
        worksheet = sheets_service.spreadsheet.worksheet(sheet_name)

        # Append the row
        worksheet.append_row(update.values)

        return {
            "success": True,
            "message": "Row added successfully"
        }
    except Exception as e:
        print(f"❌ Error adding row to '{sheet_name}': {e}")
        raise HTTPException(status_code=500, detail=str(e))
