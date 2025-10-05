"""
Date parsing utilities for natural language input
"""
from datetime import datetime, timedelta
import re


def parse_relative_date(text: str) -> str:
    """
    Parse relative date expressions to DD-MM-YYYY format

    Args:
        text: Natural language text containing date references

    Returns:
        Date in DD-MM-YYYY format

    Examples:
        "today" → "05-10-2025"
        "yesterday" → "04-10-2025"
        "last Monday" → specific date
    """
    text_lower = text.lower()
    today = datetime.now()

    # Today
    if 'today' in text_lower or 'this morning' in text_lower or 'this afternoon' in text_lower or 'this evening' in text_lower or 'tonight' in text_lower:
        return today.strftime('%d-%m-%Y')

    # Yesterday
    if 'yesterday' in text_lower or 'last night' in text_lower:
        yesterday = today - timedelta(days=1)
        return yesterday.strftime('%d-%m-%Y')

    # Day before yesterday
    if 'day before yesterday' in text_lower:
        date = today - timedelta(days=2)
        return date.strftime('%d-%m-%Y')

    # Last [weekday]
    weekdays = {
        'monday': 0, 'tuesday': 1, 'wednesday': 2, 'thursday': 3,
        'friday': 4, 'saturday': 5, 'sunday': 6
    }

    for day_name, day_num in weekdays.items():
        if f'last {day_name}' in text_lower:
            days_ago = (today.weekday() - day_num) % 7
            if days_ago == 0:
                days_ago = 7  # If today is that day, go back a week
            date = today - timedelta(days=days_ago)
            return date.strftime('%d-%m-%Y')

    # This [weekday] (current week)
    for day_name, day_num in weekdays.items():
        if f'this {day_name}' in text_lower or f'on {day_name}' in text_lower:
            days_diff = day_num - today.weekday()
            if days_diff > 0:
                # Future day this week - assume they mean last week
                days_diff -= 7
            date = today + timedelta(days=days_diff)
            return date.strftime('%d-%m-%Y')

    # N days ago
    days_ago_match = re.search(r'(\d+)\s*days?\s*ago', text_lower)
    if days_ago_match:
        days = int(days_ago_match.group(1))
        date = today - timedelta(days=days)
        return date.strftime('%d-%m-%Y')

    # Last week
    if 'last week' in text_lower:
        date = today - timedelta(weeks=1)
        return date.strftime('%d-%m-%Y')

    # This week
    if 'this week' in text_lower:
        return today.strftime('%d-%m-%Y')

    # Default to today if no date expression found
    return today.strftime('%d-%m-%Y')


def extract_amount(text: str) -> float:
    """
    Extract monetary amount from text

    Args:
        text: Text containing amount

    Returns:
        Extracted amount as float
    """
    # Try to find currency symbols with numbers
    patterns = [
        r'\$\s*(\d+(?:\.\d{2})?)',  # $45 or $45.50
        r'(\d+(?:\.\d{2})?)\s*(?:dollars|usd|eur|€)',  # 45 dollars
        r'€\s*(\d+(?:\.\d{2})?)',  # €45
        r'(\d+(?:\.\d{2})?)\s*\$',  # 45$
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return float(match.group(1))

    # Try to find any number that looks like money (with 2 decimal places or round number)
    match = re.search(r'\b(\d+\.\d{2})\b', text)
    if match:
        return float(match.group(1))

    # Try round numbers
    match = re.search(r'\b(\d+)\b', text)
    if match:
        return float(match.group(1))

    return 0.0
