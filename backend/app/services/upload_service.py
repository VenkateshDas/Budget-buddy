"""
Upload service for async receipt processing
"""
import os
import asyncio
from datetime import datetime
from typing import Dict, Optional
from app.models.upload_job import UploadJob, UploadStatus
from app.services.gemini_service import GeminiService


class UploadService:
    """Service for managing async upload jobs"""

    def __init__(self):
        self.jobs: Dict[str, UploadJob] = {}
        self.gemini_service = GeminiService()

    def create_job(self, receipt_id: str, file_path, custom_categories: Optional[list] = None) -> UploadJob:
        """Create a new upload job

        Args:
            receipt_id: Unique receipt identifier
            file_path: Single file path (str) or list of file paths (list[str])
            custom_categories: Optional list of custom category names
        """
        # Normalize to list
        all_paths = [file_path] if isinstance(file_path, str) else file_path

        job = UploadJob(
            job_id=receipt_id,  # Use receipt_id as job_id for simplicity
            receipt_id=receipt_id,
            status=UploadStatus.PENDING,
            file_path=all_paths[0],  # Store first path for compatibility
            all_file_paths=all_paths,  # Store all paths
            custom_categories=custom_categories,  # Store user's custom categories
            progress=0,
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        self.jobs[receipt_id] = job
        return job

    def get_job(self, receipt_id: str) -> Optional[UploadJob]:
        """Get job by receipt ID"""
        return self.jobs.get(receipt_id)

    def update_job_status(
        self, receipt_id: str, status: UploadStatus, progress: int = None, error: str = None
    ):
        """Update job status"""
        if receipt_id in self.jobs:
            job = self.jobs[receipt_id]
            job.status = status
            if progress is not None:
                job.progress = progress
            if error:
                job.error = error
            job.updated_at = datetime.now()
            if status in [UploadStatus.COMPLETED, UploadStatus.FAILED]:
                job.completed_at = datetime.now()

    async def process_upload(self, receipt_id: str):
        """Process upload asynchronously"""
        try:
            job = self.jobs.get(receipt_id)
            if not job:
                print(f"❌ Job {receipt_id} not found")
                return

            # Update status to processing
            self.update_job_status(receipt_id, UploadStatus.PROCESSING, progress=10)
            print(f"🔄 Processing job {receipt_id}")

            # Simulate progress updates
            await asyncio.sleep(0.5)
            self.update_job_status(receipt_id, UploadStatus.PROCESSING, progress=30)

            # Extract receipt data using Gemini
            print(f"🤖 Extracting receipt data for {receipt_id}")

            # Get custom categories from job
            custom_categories = job.custom_categories
            print(f"📋 Using custom categories from job: {custom_categories}")

            # Check if multiple files
            try:
                # Run blocking Gemini calls in thread pool to avoid blocking event loop
                loop = asyncio.get_event_loop()

                if hasattr(job, 'all_file_paths') and len(job.all_file_paths) > 1:
                    print(f"📄 Processing {len(job.all_file_paths)} files")
                    receipt, extraction_log = await loop.run_in_executor(
                        None,
                        lambda: self.gemini_service.extract_receipt_data_multiple(
                            job.all_file_paths,
                            custom_categories=custom_categories
                        )
                    )
                else:
                    receipt, extraction_log = await loop.run_in_executor(
                        None,
                        lambda: self.gemini_service.extract_receipt_data(
                            job.file_path,
                            custom_categories=custom_categories
                        )
                    )
            except Exception as gemini_error:
                print(f"❌ Gemini extraction error: {gemini_error}")
                import traceback
                traceback.print_exc()
                error_msg = f"Gemini extraction failed: {str(gemini_error)}"
                self.update_job_status(
                    receipt_id, UploadStatus.FAILED, progress=100, error=error_msg
                )
                return

            if not receipt:
                error_msg = extraction_log.get("error", "Failed to extract receipt data")
                print(f"❌ Extraction failed for {receipt_id}: {error_msg}")
                self.update_job_status(
                    receipt_id, UploadStatus.FAILED, progress=100, error=error_msg
                )
                return

            # Update job with receipt data
            self.update_job_status(receipt_id, UploadStatus.PROCESSING, progress=90)
            job.receipt_data = receipt.dict()
            job.extraction_log = extraction_log

            # Mark as completed
            self.update_job_status(receipt_id, UploadStatus.COMPLETED, progress=100)
            print(f"✅ Job {receipt_id} completed successfully")

        except Exception as e:
            print(f"❌ Error processing job {receipt_id}: {str(e)}")
            self.update_job_status(
                receipt_id, UploadStatus.FAILED, progress=100, error=str(e)
            )

    def delete_job(self, receipt_id: str):
        """Delete a job and clean up files"""
        if receipt_id in self.jobs:
            job = self.jobs[receipt_id]
            # Optionally delete the file
            try:
                if os.path.exists(job.file_path):
                    os.remove(job.file_path)
            except Exception as e:
                print(f"⚠️ Failed to delete file {job.file_path}: {e}")

            # Remove from jobs dict
            del self.jobs[receipt_id]


# Global upload service instance
upload_service = UploadService()
