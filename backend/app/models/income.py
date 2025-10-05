"""
Income model for tracking user income sources
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class Income(BaseModel):
    """Income entry model"""
    id: Optional[str] = None
    source: str  # e.g., "Salary", "Freelance", "Investment", "Other"
    amount: float
    date: str  # Format: DD-MM-YYYY
    recurring: bool = False  # Is this a recurring income?
    notes: Optional[str] = None
    created_at: Optional[str] = None


class IncomeCreate(BaseModel):
    """Model for creating income"""
    source: str
    amount: float
    date: str
    recurring: bool = False
    notes: Optional[str] = None


class IncomeUpdate(BaseModel):
    """Model for updating income"""
    source: Optional[str] = None
    amount: Optional[float] = None
    date: Optional[str] = None
    recurring: Optional[bool] = None
    notes: Optional[str] = None
