"""
Supabase service for database operations
"""
from supabase import create_client, Client
from typing import Optional, Dict, List, Any
from app.core.config import get_settings
from functools import lru_cache

settings = get_settings()


@lru_cache()
def get_supabase_client() -> Client:
    """Get Supabase client instance"""
    if not settings.supabase_url or not settings.supabase_key:
        raise ValueError("Supabase URL and Key must be configured")

    return create_client(
        supabase_url=settings.supabase_url,
        supabase_key=settings.supabase_key
    )


class SupabaseService:
    """Service for interacting with Supabase"""

    def __init__(self):
        self.client = get_supabase_client()

    # User Management
    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID"""
        try:
            response = self.client.table('users')\
                .select('*')\
                .eq('id', user_id)\
                .execute()
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Error fetching user: {e}")
            return None

    def update_user(self, user_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update user information"""
        try:
            response = self.client.table('users')\
                .update(updates)\
                .eq('id', user_id)\
                .execute()
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Error updating user: {e}")
            return None

    # Spreadsheet Management
    def create_spreadsheet(self, user_id: str, google_sheet_id: str, google_sheet_name: str, display_name: str) -> Dict[str, Any]:
        """Create a new spreadsheet entry for user"""
        try:
            response = self.client.table('user_spreadsheets').insert({
                'user_id': user_id,
                'google_sheet_id': google_sheet_id,
                'google_sheet_name': google_sheet_name,
                'display_name': display_name,
                'is_active': True
            }).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Error creating spreadsheet: {e}")
            return None

    def get_user_spreadsheets(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all spreadsheets for a user"""
        try:
            response = self.client.table('user_spreadsheets')\
                .select('*')\
                .eq('user_id', user_id)\
                .eq('is_archived', False)\
                .execute()
            return response.data or []
        except Exception as e:
            print(f"Error fetching spreadsheets: {e}")
            return []

    def get_active_spreadsheet(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user's active spreadsheet"""
        try:
            response = self.client.table('user_spreadsheets')\
                .select('*')\
                .eq('user_id', user_id)\
                .eq('is_active', True)\
                .eq('is_archived', False)\
                .execute()
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Error fetching active spreadsheet: {e}")
            return None

    def set_active_spreadsheet(self, user_id: str, sheet_id: str) -> bool:
        """Set a spreadsheet as active"""
        try:
            # Deactivate all spreadsheets
            self.client.table('user_spreadsheets')\
                .update({'is_active': False})\
                .eq('user_id', user_id)\
                .execute()

            # Activate the selected one
            self.client.table('user_spreadsheets')\
                .update({'is_active': True})\
                .eq('id', sheet_id)\
                .execute()
            return True
        except Exception as e:
            print(f"Error setting active spreadsheet: {e}")
            return False

    # Custom Categories
    def get_user_categories(self, user_id: str, active_only: bool = True) -> List[Dict[str, Any]]:
        """Get user's custom categories

        Args:
            user_id: The user's ID
            active_only: If True, return only active categories. If False, return all categories.
        """
        try:
            query = self.client.table('custom_categories')\
                .select('*')\
                .eq('user_id', user_id)

            if active_only:
                query = query.eq('is_active', True)

            response = query.order('sort_order').execute()
            return response.data or []
        except Exception as e:
            print(f"Error fetching categories: {e}")
            return []

    def create_category(self, user_id: str, name: str, icon: str = '📦', color: str = '#6366f1') -> Dict[str, Any]:
        """Create a custom category"""
        try:
            response = self.client.table('custom_categories').insert({
                'user_id': user_id,
                'name': name,
                'icon': icon,
                'color': color
            }).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Error creating category: {e}")
            return None

    def update_category(self, category_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update a category"""
        try:
            response = self.client.table('custom_categories')\
                .update(updates)\
                .eq('id', category_id)\
                .execute()
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Error updating category: {e}")
            return None

    def delete_category(self, category_id: str) -> bool:
        """Soft delete a category"""
        try:
            self.client.table('custom_categories')\
                .update({'is_active': False})\
                .eq('id', category_id)\
                .execute()
            return True
        except Exception as e:
            print(f"Error deleting category: {e}")
            return False

    # Extraction Rules
    def get_extraction_rules(self, user_id: str) -> List[Dict[str, Any]]:
        """Get user's extraction rules"""
        try:
            response = self.client.table('extraction_rules')\
                .select('*, custom_categories(*)')\
                .eq('user_id', user_id)\
                .eq('is_active', True)\
                .order('priority')\
                .execute()
            return response.data or []
        except Exception as e:
            print(f"Error fetching extraction rules: {e}")
            return []

    def create_extraction_rule(self, user_id: str, rule_type: str, pattern: str, target_category_id: str, priority: int = 0) -> Dict[str, Any]:
        """Create an extraction rule"""
        try:
            response = self.client.table('extraction_rules').insert({
                'user_id': user_id,
                'rule_type': rule_type,
                'pattern': pattern,
                'target_category_id': target_category_id,
                'priority': priority
            }).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Error creating extraction rule: {e}")
            return None

    # Extraction Feedback (AI Learning)
    def save_extraction_feedback(self, user_id: str, receipt_id: str, original_category: str, corrected_category: str, item_name: str, merchant_name: str) -> bool:
        """Save feedback for AI learning"""
        try:
            self.client.table('extraction_feedback').insert({
                'user_id': user_id,
                'receipt_id': receipt_id,
                'original_category': original_category,
                'corrected_category': corrected_category,
                'item_name': item_name,
                'merchant_name': merchant_name
            }).execute()
            return True
        except Exception as e:
            print(f"Error saving feedback: {e}")
            return False

    # User Preferences
    def get_user_preferences(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user preferences"""
        try:
            response = self.client.table('user_preferences')\
                .select('*')\
                .eq('user_id', user_id)\
                .execute()
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Error fetching preferences: {e}")
            return None

    def update_user_preferences(self, user_id: str, preferences: Dict[str, Any]) -> bool:
        """Update user preferences"""
        try:
            # Check if preferences exist
            existing = self.get_user_preferences(user_id)

            if existing:
                self.client.table('user_preferences')\
                    .update(preferences)\
                    .eq('user_id', user_id)\
                    .execute()
            else:
                preferences['user_id'] = user_id
                self.client.table('user_preferences').insert(preferences).execute()
            return True
        except Exception as e:
            print(f"Error updating preferences: {e}")
            return False
