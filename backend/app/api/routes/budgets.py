"""
Budget and Goals CRUD endpoints
"""
from fastapi import APIRouter, HTTPException
from typing import List

from app.models.analysis import Budget, Goal, Category, GoalTransaction
from app.services.sheets_service import SheetsService

router = APIRouter(prefix="/budgets", tags=["budgets"])

# Lazy initialization
_sheets_service = None


def get_sheets_service():
    global _sheets_service
    if _sheets_service is None:
        _sheets_service = SheetsService()
    return _sheets_service


# Budget endpoints
@router.post("", response_model=dict)
async def create_budget(budget: Budget):
    """Create a new budget"""
    try:
        sheets = get_sheets_service()
        success = sheets.save_budget(budget)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to save budget")
        return {"success": True, "message": "Budget created successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating budget: {str(e)}")


@router.get("", response_model=List[Budget])
async def get_budgets():
    """Get all budgets"""
    try:
        sheets = get_sheets_service()
        budget_data = sheets.get_all_budgets()
        budgets = [
            Budget(
                id=b.get("ID"),
                category=b.get("Category"),
                limit=float(b.get("Limit", 0)),
                period=b.get("Period", "monthly"),
            )
            for b in budget_data
        ]
        return budgets
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching budgets: {str(e)}")


@router.put("/{budget_id}", response_model=dict)
async def update_budget(budget_id: str, budget: Budget):
    """Update an existing budget"""
    try:
        budget.id = budget_id
        sheets = get_sheets_service()
        success = sheets.save_budget(budget)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update budget")
        return {"success": True, "message": "Budget updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating budget: {str(e)}")


@router.delete("/{budget_id}", response_model=dict)
async def delete_budget(budget_id: str):
    """Delete a budget"""
    try:
        sheets = get_sheets_service()
        success = sheets.delete_budget(budget_id)
        if not success:
            raise HTTPException(status_code=404, detail="Budget not found")
        return {"success": True, "message": "Budget deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting budget: {str(e)}")


# Goal endpoints
@router.post("/goals", response_model=dict)
async def create_goal(goal: Goal):
    """Create a new goal"""
    try:
        sheets = get_sheets_service()
        success = sheets.save_goal(goal)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to save goal")
        return {"success": True, "message": "Goal created successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating goal: {str(e)}")


@router.get("/goals", response_model=List[Goal])
async def get_goals():
    """Get all goals with auto-calculated progress"""
    try:
        sheets = get_sheets_service()
        goal_data = sheets.get_all_goals()
        goals = []
        for g in goal_data:
            target_amount = float(g.get("Target Amount", 0))
            goal_type = g.get("Goal Type", "savings")
            auto_track = g.get("Auto Track", "False") == "True"

            # Create goal object
            goal = Goal(
                id=g.get("ID"),
                name=g.get("Name"),
                target_amount=target_amount,
                current_amount=float(g.get("Current Amount", 0)),
                target_date=g.get("Target Date"),
                category=g.get("Category") or None,
                progress_percentage=0,  # Will calculate below
                goal_type=goal_type,
                auto_track=auto_track,
            )

            # Auto-calculate current amount if enabled
            if auto_track:
                goal.current_amount = sheets.calculate_goal_progress(goal)

            # Calculate progress percentage
            goal.progress_percentage = (
                (goal.current_amount / target_amount * 100) if target_amount > 0 else 0
            )

            goals.append(goal)
        return goals
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching goals: {str(e)}")


@router.put("/goals/{goal_id}", response_model=dict)
async def update_goal(goal_id: str, goal: Goal):
    """Update an existing goal"""
    try:
        goal.id = goal_id
        sheets = get_sheets_service()
        success = sheets.save_goal(goal)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update goal")
        return {"success": True, "message": "Goal updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating goal: {str(e)}")


@router.delete("/goals/{goal_id}", response_model=dict)
async def delete_goal(goal_id: str):
    """Delete a goal"""
    try:
        sheets = get_sheets_service()
        success = sheets.delete_goal(goal_id)
        if not success:
            raise HTTPException(status_code=404, detail="Goal not found")
        return {"success": True, "message": "Goal deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting goal: {str(e)}")


# Category endpoints
@router.post("/categories", response_model=dict)
async def create_category(category: Category):
    """Create a new custom category"""
    try:
        sheets = get_sheets_service()
        success = sheets.save_category(category)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to save category")
        return {"success": True, "message": "Category created successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating category: {str(e)}")


@router.get("/categories", response_model=List[Category])
async def get_categories():
    """Get all categories"""
    # Default categories
    default_categories = [
        Category(id="1", name="Groceries", icon="🛒", color="#10b981", is_default=True),
        Category(id="2", name="Dining", icon="🍽️", color="#f59e0b", is_default=True),
        Category(id="3", name="Transport", icon="🚗", color="#3b82f6", is_default=True),
        Category(id="4", name="Utilities", icon="💡", color="#8b5cf6", is_default=True),
        Category(id="5", name="Entertainment", icon="🎬", color="#ec4899", is_default=True),
        Category(id="6", name="Shopping", icon="🛍️", color="#06b6d4", is_default=True),
        Category(id="7", name="Health", icon="⚕️", color="#ef4444", is_default=True),
        Category(id="8", name="Other", icon="📦", color="#6b7280", is_default=True),
    ]

    try:
        sheets = get_sheets_service()
        category_data = sheets.get_all_categories()
        categories = [
            Category(
                id=c.get("ID"),
                name=c.get("Name"),
                icon=c.get("Icon", "📦"),
                color=c.get("Color", "#6366f1"),
                is_default=c.get("Is Default") == "True",
            )
            for c in category_data
        ]
        return categories
    except Exception as e:
        print(f"Warning: Could not fetch categories from sheets: {e}")
        # Return default categories instead of failing
        return default_categories


# Goal Transaction endpoints
@router.post("/goals/{goal_id}/transactions", response_model=dict)
async def add_goal_transaction(goal_id: str, transaction: GoalTransaction):
    """Add a manual transaction to a savings goal"""
    try:
        transaction.goal_id = goal_id
        sheets = get_sheets_service()
        success = sheets.save_goal_transaction(transaction)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to save transaction")
        return {"success": True, "message": "Transaction added successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error adding transaction: {str(e)}")


@router.get("/goals/{goal_id}/transactions", response_model=List[dict])
async def get_goal_transactions(goal_id: str):
    """Get transaction history for a specific goal"""
    try:
        sheets = get_sheets_service()
        transactions = sheets.get_goal_transactions(goal_id)
        return transactions
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching transactions: {str(e)}")


@router.put("/goals/{goal_id}/recalculate", response_model=dict)
async def recalculate_goal_progress(goal_id: str):
    """Force recalculation of goal progress"""
    try:
        sheets = get_sheets_service()
        # Get the goal
        goal_data = sheets.get_all_goals()
        goal_row = next((g for g in goal_data if g.get("ID") == goal_id), None)

        if not goal_row:
            raise HTTPException(status_code=404, detail="Goal not found")

        # Create goal object
        goal = Goal(
            id=goal_row.get("ID"),
            name=goal_row.get("Name"),
            target_amount=float(goal_row.get("Target Amount", 0)),
            current_amount=float(goal_row.get("Current Amount", 0)),
            target_date=goal_row.get("Target Date"),
            category=goal_row.get("Category") or None,
            progress_percentage=0,
            goal_type=goal_row.get("Goal Type", "savings"),
            auto_track=goal_row.get("Auto Track", "False") == "True",
        )

        # Recalculate
        new_amount = sheets.calculate_goal_progress(goal)
        goal.current_amount = new_amount
        goal.progress_percentage = (
            (new_amount / goal.target_amount * 100) if goal.target_amount > 0 else 0
        )

        # Save updated goal
        sheets.save_goal(goal)

        return {
            "success": True,
            "message": "Goal progress recalculated",
            "current_amount": new_amount,
            "progress_percentage": goal.progress_percentage,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error recalculating progress: {str(e)}")
