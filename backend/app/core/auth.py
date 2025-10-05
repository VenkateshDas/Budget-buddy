"""
Authentication and authorization utilities
"""
from fastapi import HTTPException, Header, Depends
from typing import Optional
from app.core.config import get_settings
from app.services.supabase_service import SupabaseService, get_supabase_client

settings = get_settings()


async def get_current_user_id(authorization: Optional[str] = Header(None)) -> str:
    """
    Extract and validate user ID from Supabase JWT token

    Args:
        authorization: Bearer token from request header

    Returns:
        Supabase user ID

    Raises:
        HTTPException: If authentication fails
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")

    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header format")

    token = authorization.replace("Bearer ", "")

    try:
        # Verify token with Supabase
        supabase = get_supabase_client()
        user_response = supabase.auth.get_user(token)

        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid token")

        return user_response.user.id

    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")


async def get_current_user(user_id: str = Depends(get_current_user_id)):
    """
    Get current user from Supabase database

    Args:
        user_id: Supabase user ID from token

    Returns:
        User data from Supabase

    Raises:
        HTTPException: If user not found
    """
    supabase_service = SupabaseService()
    user = supabase_service.get_user_by_id(user_id)

    if not user:
        raise HTTPException(status_code=404, detail="User not found in database")

    return user


async def get_current_user_optional(authorization: Optional[str] = Header(None)) -> Optional[dict]:
    """
    Get current user if authenticated, None otherwise (no error)
    """
    if not authorization or not authorization.startswith("Bearer "):
        return None

    try:
        token = authorization.replace("Bearer ", "")
        supabase = get_supabase_client()
        user_response = supabase.auth.get_user(token)

        if not user_response or not user_response.user:
            return None

        user_id = user_response.user.id
        supabase_service = SupabaseService()
        user = supabase_service.get_user_by_id(user_id)
        return user
    except:
        return None


async def get_user_active_spreadsheet(user: dict = Depends(get_current_user)):
    """
    Get user's active spreadsheet

    Args:
        user: User data from get_current_user

    Returns:
        Active spreadsheet data

    Raises:
        HTTPException: If no active spreadsheet found
    """
    supabase_service = SupabaseService()
    spreadsheet = supabase_service.get_active_spreadsheet(user["id"])

    if not spreadsheet:
        raise HTTPException(
            status_code=404,
            detail="No active spreadsheet found. Please set up a spreadsheet first."
        )

    return spreadsheet
