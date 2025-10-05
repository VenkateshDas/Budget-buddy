"""
Pydantic models for receipt processing
Ported from CLI script with additional fields for web app
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class MerchantDetails(BaseModel):
    """Merchant information"""
    name: str
    address: str


class LineItem(BaseModel):
    """Individual receipt line item"""
    item_name: str
    unit_price: float
    quantity: float
    price: float
    category: str


class TotalAmounts(BaseModel):
    """Receipt totals and payment information"""
    total: float
    tax: Optional[float] = None
    payment_method: str


class Receipt(BaseModel):
    """Complete receipt data model"""
    merchant_details: MerchantDetails
    purchase_date: str
    line_items: List[LineItem]
    total_amounts: TotalAmounts


class ReceiptUploadResponse(BaseModel):
    """Response model for receipt upload"""
    receipt_id: str
    receipt: Optional[Receipt] = None  # Optional for async processing
    extraction_log: dict
    confidence: Optional[float] = None


class ReceiptConfirmRequest(BaseModel):
    """Request model for receipt confirmation/correction"""
    receipt: Receipt
    user_feedback: Optional[str] = None


class ReceiptReprocessRequest(BaseModel):
    """Request model for receipt reprocessing"""
    user_feedback: str
    original_receipt: Receipt
