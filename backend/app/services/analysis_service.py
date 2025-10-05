"""
Analysis service for trends, forecasts, and insights
"""
from typing import List, Dict, Any
from datetime import datetime, timedelta
from collections import defaultdict
import statistics
from app.models.analysis import (
    CategorySpending,
    TimeSeriesPoint,
    TrendData,
    ForecastData,
    CategoryAnalysis,
    BudgetStatus,
    Budget,
)
from app.services.sheets_service import SheetsService


class AnalysisService:
    """Service for spending analysis and forecasting"""

    def __init__(self):
        self.sheets_service = SheetsService()

    def _parse_date(self, date_str: str) -> datetime:
        """Parse date string in DD-MM-YYYY format"""
        try:
            return datetime.strptime(date_str, "%d-%m-%Y")
        except:
            # Fallback formats
            try:
                return datetime.strptime(date_str, "%Y-%m-%d")
            except:
                return datetime.now()

    def get_trends(
        self,
        period: str = "monthly",
        date_filter: str = None,
        start_date: str = None,
        end_date: str = None
    ) -> TrendData:
        """
        Get spending trends over time

        Args:
            period: "monthly" or "weekly"
            date_filter: "all", "this_month", "last_month", "last_7", "last_30", "last_90", "this_year", "custom"
            start_date: Custom start date (YYYY-MM-DD)
            end_date: Custom end date (YYYY-MM-DD)

        Returns:
            TrendData object with time series
        """
        receipts = self.sheets_service.get_all_receipts()

        if not receipts:
            # Return empty trends if no data
            return TrendData(
                period=period,
                categories=[],
                data={},
                total_by_period=[],
            )

        # Calculate date range based on filter
        now = datetime.now()
        filter_start = None
        filter_end = None

        if date_filter == "last_7":
            filter_start = now - timedelta(days=7)
        elif date_filter == "last_30":
            filter_start = now - timedelta(days=30)
        elif date_filter == "last_90":
            filter_start = now - timedelta(days=90)
        elif date_filter == "this_month":
            filter_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        elif date_filter == "last_month":
            first_of_this_month = now.replace(day=1)
            filter_end = first_of_this_month - timedelta(days=1)
            filter_start = filter_end.replace(day=1)
        elif date_filter == "this_year":
            filter_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        elif date_filter == "custom" and start_date:
            try:
                filter_start = datetime.strptime(start_date, "%Y-%m-%d")
                if end_date:
                    filter_end = datetime.strptime(end_date, "%Y-%m-%d")
            except ValueError:
                pass

        # Group by category and period
        category_data = defaultdict(lambda: defaultdict(float))
        total_by_period = defaultdict(float)
        categories_set = set()

        for receipt in receipts:
            try:
                date = self._parse_date(receipt.get("Date", ""))

                # Apply date filter
                if filter_start and date < filter_start:
                    continue
                if filter_end and date > filter_end:
                    continue

                category = receipt.get("Category", "Other")
                # Handle potential empty or non-numeric values
                total_price_str = receipt.get("Total Price", 0)
                if isinstance(total_price_str, str) and not total_price_str.strip():
                    continue  # Skip entries with empty total price
                amount = float(total_price_str)

                if amount <= 0:
                    continue  # Skip zero or negative amounts

                categories_set.add(category)

                # Determine period key
                if period == "monthly":
                    period_key = date.strftime("%Y-%m")
                else:  # weekly
                    period_key = date.strftime("%Y-W%U")

                category_data[category][period_key] += amount
                total_by_period[period_key] += amount
            except (ValueError, TypeError) as e:
                # Skip invalid entries
                print(f"⚠️  Skipping invalid receipt entry: {e}")
                continue

        # Convert to time series format
        data = {}
        for category in categories_set:
            time_series = [
                TimeSeriesPoint(date=period_key, amount=amount, category=category)
                for period_key, amount in sorted(category_data[category].items())
            ]
            data[category] = time_series

        # Total time series
        total_series = [
            TimeSeriesPoint(date=period_key, amount=amount)
            for period_key, amount in sorted(total_by_period.items())
        ]

        return TrendData(
            period=period,
            categories=list(categories_set),
            data=data,
            total_by_period=total_series,
        )

    def get_forecast(self) -> ForecastData:
        """
        Forecast next month spending using simple moving average

        Returns:
            ForecastData object
        """
        receipts = self.sheets_service.get_all_receipts()

        if not receipts:
            # Return empty forecast if no data
            return ForecastData(
                period="next_month",
                forecasts=[],
                total_forecast=0,
                confidence=0,
                based_on_months=0,
            )

        # Get last 3 months data
        three_months_ago = datetime.now() - timedelta(days=90)
        recent_receipts = []

        for r in receipts:
            try:
                receipt_date = self._parse_date(r.get("Date", ""))
                if receipt_date >= three_months_ago:
                    recent_receipts.append(r)
            except Exception:
                continue

        if not recent_receipts:
            # No recent data, return empty forecast
            return ForecastData(
                period="next_month",
                forecasts=[],
                total_forecast=0,
                confidence=0,
                based_on_months=0,
            )

        # Calculate average spending by category
        category_totals = defaultdict(list)
        for receipt in recent_receipts:
            try:
                date = self._parse_date(receipt.get("Date", ""))
                month_key = date.strftime("%Y-%m")
                category = receipt.get("Category", "Other")

                total_price_str = receipt.get("Total Price", 0)
                if isinstance(total_price_str, str) and not total_price_str.strip():
                    continue
                amount = float(total_price_str)

                if amount <= 0:
                    continue

                category_totals[(category, month_key)] = (
                    category_totals.get((category, month_key), 0) + amount
                )
            except (ValueError, TypeError):
                continue

        # Calculate forecast per category
        category_forecasts = {}
        for (category, month_key), amount in category_totals.items():
            if category not in category_forecasts:
                category_forecasts[category] = []
            category_forecasts[category].append(amount)

        forecasts = []
        total_forecast = 0

        for category, amounts in category_forecasts.items():
            avg = statistics.mean(amounts) if amounts else 0
            total_forecast += avg
            forecasts.append(
                CategorySpending(
                    category=category,
                    total=avg,
                    percentage=0,  # Will calculate after
                    count=len(amounts),
                    average=avg,
                )
            )

        # Calculate percentages
        for forecast in forecasts:
            forecast.percentage = (
                (forecast.total / total_forecast * 100) if total_forecast > 0 else 0
            )

        return ForecastData(
            period="next_month",
            forecasts=forecasts,
            total_forecast=total_forecast,
            confidence=0.7 if len(category_forecasts) > 0 else 0,
            based_on_months=3,
        )

    def get_category_analysis(
        self,
        period: str = "all",
        start_date: str = None,
        end_date: str = None,
        categories: List[str] = None,
        min_amount: float = None,
        max_amount: float = None,
    ) -> CategoryAnalysis:
        """
        Get category-level spending analysis with advanced filtering

        Args:
            period: "all", "this_month", "last_month", "last_7", "last_30", "last_90", "this_year", "custom"
            start_date: Custom start date (YYYY-MM-DD)
            end_date: Custom end date (YYYY-MM-DD)
            categories: List of categories to filter
            min_amount: Minimum transaction amount
            max_amount: Maximum transaction amount

        Returns:
            CategoryAnalysis object
        """
        receipts = self.sheets_service.get_all_receipts()

        if not receipts:
            # Return empty analysis if no data
            return CategoryAnalysis(
                categories=[],
                total_spending=0,
                top_category="None",
                period=period,
            )

        # Calculate date range based on period
        now = datetime.now()
        filter_start = None
        filter_end = None

        if period == "last_7":
            filter_start = now - timedelta(days=7)
        elif period == "last_30":
            filter_start = now - timedelta(days=30)
        elif period == "last_90":
            filter_start = now - timedelta(days=90)
        elif period == "this_month":
            filter_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        elif period == "last_month":
            first_of_this_month = now.replace(day=1)
            filter_end = first_of_this_month - timedelta(days=1)
            filter_start = filter_end.replace(day=1)
        elif period == "this_year":
            filter_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        elif period == "custom" and start_date:
            try:
                filter_start = datetime.strptime(start_date, "%Y-%m-%d")
                if end_date:
                    filter_end = datetime.strptime(end_date, "%Y-%m-%d")
            except ValueError:
                pass

        # Filter receipts
        filtered_receipts = []
        for r in receipts:
            try:
                receipt_date = self._parse_date(r.get("Date", ""))
                category = r.get("Category", "Other")
                total_price_str = r.get("Total Price", 0)

                if isinstance(total_price_str, str) and not total_price_str.strip():
                    continue
                amount = float(total_price_str)

                # Apply filters
                if filter_start and receipt_date < filter_start:
                    continue
                if filter_end and receipt_date > filter_end:
                    continue
                if categories and category not in categories:
                    continue
                if min_amount is not None and amount < min_amount:
                    continue
                if max_amount is not None and amount > max_amount:
                    continue

                filtered_receipts.append(r)
            except Exception:
                continue

        if not filtered_receipts:
            # No data for the selected period
            return CategoryAnalysis(
                categories=[],
                total_spending=0,
                top_category="None",
                period=period,
            )

        # Calculate by category
        category_data = defaultdict(lambda: {"total": 0, "count": 0})
        total_spending = 0

        for receipt in filtered_receipts:
            try:
                category = receipt.get("Category", "Other")
                total_price_str = receipt.get("Total Price", 0)

                if isinstance(total_price_str, str) and not total_price_str.strip():
                    continue
                amount = float(total_price_str)

                if amount <= 0:
                    continue

                category_data[category]["total"] += amount
                category_data[category]["count"] += 1
                total_spending += amount
            except (ValueError, TypeError):
                continue

        # Build category spending list
        categories = []
        for category, data in category_data.items():
            categories.append(
                CategorySpending(
                    category=category,
                    total=data["total"],
                    percentage=(data["total"] / total_spending * 100)
                    if total_spending > 0
                    else 0,
                    count=data["count"],
                    average=data["total"] / data["count"] if data["count"] > 0 else 0,
                )
            )

        # Sort by total descending
        categories.sort(key=lambda x: x.total, reverse=True)

        top_category = categories[0].category if categories else "None"

        return CategoryAnalysis(
            categories=categories,
            total_spending=total_spending,
            top_category=top_category,
            period=period,
        )

    def get_budget_status(self) -> BudgetStatus:
        """
        Get current budget status with auto-calculated spending from receipts

        Returns:
            BudgetStatus object
        """
        # Get budgets from sheets
        budget_data = self.sheets_service.get_all_budgets()

        # Build budget status with auto-calculated spending
        budgets = []
        total_budget = 0
        total_spent = 0
        now = datetime.now()

        for budget_row in budget_data:
            category = budget_row.get("Category", "")
            limit = float(budget_row.get("Limit", 0))
            period = budget_row.get("Period", "monthly")
            period_type = budget_row.get("Period Type", "calendar_month")
            start_date = budget_row.get("Start Date") or None
            end_date = budget_row.get("End Date") or None

            # Auto-calculate current spending using SheetsService method
            current_spend = self.sheets_service.calculate_budget_spending(
                category, period, period_type, start_date, end_date
            )
            percentage = (current_spend / limit * 100) if limit > 0 else 0

            # Calculate period display and reset date
            period_display, resets_on = self._calculate_period_info(period_type, period, start_date, end_date)

            budgets.append(
                Budget(
                    id=budget_row.get("ID"),
                    category=category,
                    limit=limit,
                    period=period,
                    period_type=period_type,
                    start_date=start_date,
                    end_date=end_date,
                    current_spend=current_spend,
                    percentage_used=percentage,
                    is_exceeded=current_spend > limit,
                    period_display=period_display,
                    resets_on=resets_on,
                )
            )

            total_budget += limit
            total_spent += current_spend

        overall_percentage = (total_spent / total_budget * 100) if total_budget > 0 else 0

        return BudgetStatus(
            budgets=budgets,
            total_budget=total_budget,
            total_spent=total_spent,
            overall_percentage=overall_percentage,
        )

    def _calculate_period_info(self, period_type: str, period: str, start_date: str = None, end_date: str = None):
        """Calculate display string and reset date for budget period"""
        now = datetime.now()

        if period_type == "rolling":
            if period == "weekly":
                days_ago = (now - timedelta(days=7)).strftime("%b %d")
                today = now.strftime("%b %d, %Y")
                return f"Rolling 7 days ({days_ago} - {today})", "Daily"
            else:
                days_ago = (now - timedelta(days=30)).strftime("%b %d")
                today = now.strftime("%b %d, %Y")
                return f"Rolling 30 days ({days_ago} - {today})", "Daily"

        elif period_type == "calendar_month":
            month_start = now.replace(day=1)
            if now.month == 12:
                month_end = now.replace(day=31)
                next_reset = now.replace(year=now.year + 1, month=1, day=1)
            else:
                next_month = now.replace(month=now.month + 1, day=1)
                month_end = next_month - timedelta(days=1)
                next_reset = next_month

            period_str = f"{month_start.strftime('%b %d')} - {month_end.strftime('%b %d, %Y')}"
            reset_str = next_reset.strftime("%b %d, %Y")
            return period_str, reset_str

        elif period_type == "calendar_week":
            start_of_week = now - timedelta(days=now.weekday())
            end_of_week = start_of_week + timedelta(days=6)
            next_week = start_of_week + timedelta(days=7)

            period_str = f"{start_of_week.strftime('%b %d')} - {end_of_week.strftime('%b %d, %Y')}"
            reset_str = next_week.strftime("%b %d, %Y")
            return period_str, reset_str

        elif period_type == "custom" and start_date and end_date:
            try:
                start = datetime.strptime(start_date, "%Y-%m-%d")
                end = datetime.strptime(end_date, "%Y-%m-%d")
                period_str = f"{start.strftime('%b %d')} - {end.strftime('%b %d, %Y')}"
                return period_str, "Does not reset"
            except:
                pass

        # Default fallback
        return "Current month", "Next month"
