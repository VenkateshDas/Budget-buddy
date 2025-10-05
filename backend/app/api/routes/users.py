"""
User management endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional as TypingOptional
from app.services.supabase_service import SupabaseService
from app.core.auth import get_current_user, get_current_user_optional

router = APIRouter(prefix="/users", tags=["users"])


# Pydantic models
class SpreadsheetCreate(BaseModel):
    google_sheet_id: str
    google_sheet_name: str = ""
    display_name: str


class CategoryCreate(BaseModel):
    name: str
    icon: str = "📦"
    color: str = "#6366f1"


class CategoryUpdate(BaseModel):
    name: str | None = None
    icon: str | None = None
    color: str | None = None


@router.get("/me")
async def get_current_user_info(user: dict = Depends(get_current_user)):
    """Get current authenticated user information"""
    return {
        "id": user["id"],
        "email": user["email"],
        "display_name": user.get("display_name"),
        "created_at": user.get("created_at"),
    }


@router.get("/spreadsheets")
async def get_user_spreadsheets(user: dict = Depends(get_current_user)):
    """Get all spreadsheets for current user"""
    supabase = SupabaseService()
    spreadsheets = supabase.get_user_spreadsheets(user["id"])
    return {"spreadsheets": spreadsheets}


@router.post("/spreadsheets")
async def create_spreadsheet(
    data: SpreadsheetCreate,
    user: dict = Depends(get_current_user)
):
    """Create a new spreadsheet for the user"""
    supabase = SupabaseService()

    # Create spreadsheet
    spreadsheet = supabase.create_spreadsheet(
        user_id=user["id"],
        google_sheet_id=data.google_sheet_id,
        google_sheet_name=data.google_sheet_name,
        display_name=data.display_name
    )

    if not spreadsheet:
        raise HTTPException(status_code=500, detail="Failed to create spreadsheet")

    # If this is the first spreadsheet, make it active
    user_spreadsheets = supabase.get_user_spreadsheets(user["id"])
    if len(user_spreadsheets) == 1:
        supabase.set_active_spreadsheet(user["id"], spreadsheet["id"])
        spreadsheet["is_active"] = True

    return spreadsheet


@router.put("/spreadsheets/{sheet_id}/activate")
async def set_active_spreadsheet(
    sheet_id: str,
    user: dict = Depends(get_current_user)
):
    """Set a spreadsheet as active"""
    supabase = SupabaseService()
    success = supabase.set_active_spreadsheet(user["id"], sheet_id)

    if not success:
        raise HTTPException(status_code=500, detail="Failed to set active spreadsheet")

    return {"status": "success", "active_sheet_id": sheet_id}


@router.get("/categories")
async def get_user_categories(
    all: bool = False,
    user: TypingOptional[dict] = Depends(get_current_user_optional)
):
    """Get user's categories

    Args:
        all: If True, return all categories (active + inactive). If False, return only active.
    """
    if user:
        supabase = SupabaseService()
        # active_only=not all means: if all=True, active_only=False (get all), if all=False, active_only=True (get active only)
        categories = supabase.get_user_categories(user["id"], active_only=not all)
        if categories:
            return {"categories": categories}

    # Return default categories if no user (for unauthenticated access)
    default_categories = [
        {"name": "Groceries", "icon": "🛒", "color": "#10b981"},
        {"name": "Dining", "icon": "🍽️", "color": "#f59e0b"},
        {"name": "Transport", "icon": "🚗", "color": "#3b82f6"},
        {"name": "Utilities", "icon": "💡", "color": "#8b5cf6"},
        {"name": "Entertainment", "icon": "🎬", "color": "#ec4899"},
        {"name": "Shopping", "icon": "🛍️", "color": "#f97316"},
        {"name": "Health", "icon": "💊", "color": "#ef4444"},
        {"name": "Other", "icon": "📦", "color": "#6b7280"},
        {"name": "Produce", "icon": "🥬", "color": "#22c55e"},
        {"name": "Bakery", "icon": "🍞", "color": "#fbbf24"},
        {"name": "Meat", "icon": "🥩", "color": "#dc2626"},
    ]
    return {"categories": default_categories}


@router.post("/categories")
async def create_category(
    data: CategoryCreate,
    user: dict = Depends(get_current_user)
):
    """Create a custom category"""
    supabase = SupabaseService()
    category = supabase.create_category(
        user_id=user["id"],
        name=data.name,
        icon=data.icon,
        color=data.color
    )

    if not category:
        raise HTTPException(status_code=500, detail="Failed to create category")

    return category


@router.put("/categories/{category_id}")
async def update_category(
    category_id: str,
    data: CategoryUpdate,
    user: dict = Depends(get_current_user)
):
    """Update a category"""
    supabase = SupabaseService()

    updates = {}
    if data.name is not None:
        updates["name"] = data.name
    if data.icon is not None:
        updates["icon"] = data.icon
    if data.color is not None:
        updates["color"] = data.color

    category = supabase.update_category(category_id, updates)

    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    return category


@router.put("/categories/{category_id}/toggle")
async def toggle_category(
    category_id: str,
    user: dict = Depends(get_current_user)
):
    """Toggle category active status"""
    supabase = SupabaseService()

    # Get current category to toggle its status
    categories = supabase.get_user_categories(user["id"], active_only=False)
    category = next((c for c in categories if c["id"] == category_id), None)

    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    # Toggle the is_active status
    updated = supabase.update_category(category_id, {"is_active": not category["is_active"]})

    if not updated:
        raise HTTPException(status_code=500, detail="Failed to toggle category")

    return updated


@router.delete("/categories/{category_id}")
async def delete_category(
    category_id: str,
    user: dict = Depends(get_current_user)
):
    """Delete (soft delete) a category"""
    supabase = SupabaseService()
    success = supabase.delete_category(category_id)

    if not success:
        raise HTTPException(status_code=404, detail="Category not found")

    return {"status": "deleted", "category_id": category_id}


@router.get("/preferences")
async def get_user_preferences(user: dict = Depends(get_current_user)):
    """Get user preferences"""
    supabase = SupabaseService()
    preferences = supabase.get_user_preferences(user["id"])
    return preferences or {}


@router.put("/preferences")
async def update_user_preferences(
    preferences: dict,
    user: dict = Depends(get_current_user)
):
    """Update user preferences"""
    supabase = SupabaseService()
    success = supabase.update_user_preferences(user["id"], preferences)

    if not success:
        raise HTTPException(status_code=500, detail="Failed to update preferences")

    return {"status": "updated"}
