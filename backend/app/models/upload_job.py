"""
Upload job models for async receipt processing
"""
from enum import Enum
from typing import Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime


class UploadStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class UploadJob(BaseModel):
    """Upload job tracking model"""
    job_id: str
    receipt_id: str
    status: UploadStatus
    file_path: str
    all_file_paths: Optional[list[str]] = None  # Support for multiple files
    custom_categories: Optional[list[str]] = None  # User's custom categories
    progress: int = 0  # 0-100
    error: Optional[str] = None
    receipt_data: Optional[Dict[str, Any]] = None
    extraction_log: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None


class UploadJobResponse(BaseModel):
    """Response model for upload job status"""
    job_id: str
    receipt_id: str
    status: UploadStatus
    progress: int
    error: Optional[str] = None
    receipt_data: Optional[Dict[str, Any]] = None
    extraction_log: Optional[Dict[str, Any]] = None
