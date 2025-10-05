"""API routes package"""
from .receipts import router as receipts_router
from .analysis import router as analysis_router
from .budgets import router as budgets_router

__all__ = ["receipts_router", "analysis_router", "budgets_router"]
