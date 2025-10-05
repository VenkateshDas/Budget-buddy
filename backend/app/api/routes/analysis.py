"""
Analysis endpoints for trends, forecasts, and insights
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional

from app.models.analysis import TrendData, ForecastData, CategoryAnalysis, BudgetStatus
from app.services.analysis_service import AnalysisService
from app.services.sheets_service import SheetsService

router = APIRouter(prefix="/analysis", tags=["analysis"])

# Lazy initialization
_analysis_service = None


def get_analysis_service():
    global _analysis_service
    if _analysis_service is None:
        _analysis_service = AnalysisService()
    return _analysis_service


@router.get("/trends", response_model=TrendData)
async def get_trends(
    period: str = Query("monthly", regex="^(monthly|weekly)$"),
    date_filter: Optional[str] = Query(None, regex="^(all|this_month|last_month|last_7|last_30|last_90|this_year|custom)$"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
):
    """
    Get spending trends over time

    Args:
        period: "monthly" or "weekly"
        date_filter: "all", "this_month", "last_month", "last_7", "last_30", "last_90", "this_year", "custom"
        start_date: Custom start date (YYYY-MM-DD)
        end_date: Custom end date (YYYY-MM-DD)

    Returns:
        TrendData with time series by category
    """
    try:
        analysis = get_analysis_service()
        trends = analysis.get_trends(
            period=period,
            date_filter=date_filter,
            start_date=start_date,
            end_date=end_date
        )
        return trends
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating trends: {str(e)}")


@router.get("/forecast", response_model=ForecastData)
async def get_forecast():
    """
    Get spending forecast for next month

    Returns:
        ForecastData with projected spending by category
    """
    try:
        analysis = get_analysis_service()
        forecast = analysis.get_forecast()
        return forecast
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating forecast: {str(e)}")


@router.get("/categorization", response_model=CategoryAnalysis)
async def get_categorization(
    period: Optional[str] = Query(None, regex="^(all|this_month|last_month|last_7|last_30|last_90|this_year|custom)$"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    categories: Optional[str] = Query(None),
    min_amount: Optional[float] = Query(None),
    max_amount: Optional[float] = Query(None),
):
    """
    Get spending breakdown by category with advanced filtering

    Args:
        period: "all", "this_month", "last_month", "last_7", "last_30", "last_90", "this_year", "custom"
        start_date: Custom start date (YYYY-MM-DD) - used when period="custom"
        end_date: Custom end date (YYYY-MM-DD) - used when period="custom"
        categories: Comma-separated list of categories to filter
        min_amount: Minimum transaction amount
        max_amount: Maximum transaction amount

    Returns:
        CategoryAnalysis with spending by category
    """
    try:
        analysis = get_analysis_service()

        # Parse categories if provided
        category_list = None
        if categories:
            category_list = [c.strip() for c in categories.split(',') if c.strip()]

        result = analysis.get_category_analysis(
            period=period or "all",
            start_date=start_date,
            end_date=end_date,
            categories=category_list,
            min_amount=min_amount,
            max_amount=max_amount,
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error analyzing categories: {str(e)}"
        )


@router.get("/budget-status", response_model=BudgetStatus)
async def get_budget_status():
    """
    Get current budget status with spending comparison

    Returns:
        BudgetStatus with current vs budget spending
    """
    try:
        analysis = get_analysis_service()
        status = analysis.get_budget_status()
        return status
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error calculating budget status: {str(e)}"
        )


@router.get("/sheets-url")
async def get_sheets_url():
    """
    Get the Google Sheets URL for the current spreadsheet

    Returns:
        Dictionary with spreadsheet URL
    """
    try:
        sheets_service = SheetsService()
        url = sheets_service.get_spreadsheet_url()
        if url:
            return {"url": url}
        else:
            raise HTTPException(status_code=404, detail="Spreadsheet URL not available")
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error getting spreadsheet URL: {str(e)}"
        )
