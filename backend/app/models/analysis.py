"""
Pydantic models for analysis, budgets, and goals
"""
from pydantic import BaseModel
from typing import List, Dict, Optional
from datetime import datetime


class CategorySpending(BaseModel):
    """Spending data for a category"""
    category: str
    total: float
    percentage: float
    count: int
    average: float
    trend: Optional[str] = None  # "up", "down", "stable"


class TimeSeriesPoint(BaseModel):
    """Single data point in time series"""
    date: str
    amount: float
    category: Optional[str] = None


class TrendData(BaseModel):
    """Spending trends over time"""
    period: str  # "monthly" or "weekly"
    categories: List[str]
    data: Dict[str, List[TimeSeriesPoint]]  # category -> time series
    total_by_period: List[TimeSeriesPoint]


class ForecastData(BaseModel):
    """Spending forecast"""
    period: str  # "next_month"
    forecasts: List[CategorySpending]
    total_forecast: float
    confidence: float
    based_on_months: int


class CategoryAnalysis(BaseModel):
    """Category-level analysis"""
    categories: List[CategorySpending]
    total_spending: float
    top_category: str
    period: str


class Budget(BaseModel):
    """Budget for a category"""
    id: Optional[str] = None
    category: str
    limit: float
    period: str = "monthly"  # "monthly", "weekly" (for backward compatibility)
    period_type: str = "calendar_month"  # "rolling", "calendar_month", "calendar_week", "custom"
    start_date: Optional[str] = None  # For custom periods or tracking
    end_date: Optional[str] = None  # For custom periods
    current_spend: Optional[float] = None
    percentage_used: Optional[float] = None
    is_exceeded: Optional[bool] = None
    period_display: Optional[str] = None  # e.g., "Dec 1 - Dec 31, 2024"
    resets_on: Optional[str] = None  # Next reset date


class BudgetStatus(BaseModel):
    """Budget status overview"""
    budgets: List[Budget]
    total_budget: float
    total_spent: float
    overall_percentage: float


class Goal(BaseModel):
    """Savings or spending goal"""
    id: Optional[str] = None
    name: str
    target_amount: float
    current_amount: float
    target_date: str
    category: Optional[str] = None
    progress_percentage: float
    goal_type: str = "savings"  # "savings" or "spending_limit"
    auto_track: bool = False  # Auto-calculate progress from receipts


class GoalTransaction(BaseModel):
    """Manual transaction for savings goals"""
    id: Optional[str] = None
    goal_id: str
    amount: float
    transaction_type: str  # "deposit" or "withdrawal"
    date: str
    note: Optional[str] = None


class Category(BaseModel):
    """Custom expense category"""
    id: Optional[str] = None
    name: str
    icon: Optional[str] = "📦"
    color: Optional[str] = "#6366f1"
    is_default: bool = False
