"""
Receipt endpoints for upload, extraction, and confirmation
"""
import os
import uuid
import glob
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Query, Depends
from fastapi.responses import JSONResponse, FileResponse
from typing import Optional

from app.models.receipt import (
    Receipt,
    ReceiptUploadResponse,
    ReceiptConfirmRequest,
    ReceiptReprocessRequest,
)
from app.models.upload_job import UploadJobResponse, UploadStatus
from app.services.gemini_service import GeminiService
from app.services.sheets_service import SheetsService
from app.services.analysis_service import AnalysisService
from app.services.upload_service import upload_service
from app.services.supabase_service import SupabaseService
from app.core.config import get_settings
from app.core.auth import get_current_user_optional
from typing import Optional as TypingOptional

router = APIRouter(prefix="/receipts", tags=["receipts"])
settings = get_settings()

# Ensure upload directory exists
os.makedirs(settings.upload_dir, exist_ok=True)

# In-memory storage for receipts (replace with database in production)
receipts_storage = {}

# Lazy initialization of services
_gemini_service = None
_sheets_service = None
_analysis_service = None


def get_gemini_service():
    global _gemini_service
    if _gemini_service is None:
        _gemini_service = GeminiService()
    return _gemini_service


def get_sheets_service():
    global _sheets_service
    if _sheets_service is None:
        _sheets_service = SheetsService()
    return _sheets_service


def get_analysis_service():
    global _analysis_service
    if _analysis_service is None:
        _analysis_service = AnalysisService()
    return _analysis_service


def trigger_analysis_update():
    """Background task to update analysis after receipt save"""
    try:
        # Pre-calculate and cache analysis
        analysis = get_analysis_service()
        analysis.get_trends()
        analysis.get_forecast()
        analysis.get_category_analysis()
        print("✅ Analysis updated in background")
    except Exception as e:
        print(f"❌ Error updating analysis: {e}")


@router.post("/upload-multiple", response_model=ReceiptUploadResponse)
async def upload_multiple_receipts(
    files: list[UploadFile] = File(...),
    background_tasks: BackgroundTasks = None,
    async_processing: bool = False,
    user: TypingOptional[dict] = Depends(get_current_user_optional)
):
    """
    Upload multiple receipt images/PDFs and extract data using Gemini AI

    Args:
        files: List of receipt image/PDF files (up to 5)
        async_processing: If True, process asynchronously and return immediately

    Returns:
        ReceiptUploadResponse with extracted data and logs
    """
    try:
        if len(files) > 5:
            raise HTTPException(status_code=400, detail="Maximum 5 files allowed")

        print(f"📁 Multi-upload request received: {len(files)} files")
        for file in files:
            print(f"  - {file.filename}, Content-Type: {file.content_type}, Size: {file.size}")
        print(f"⚙️ Async processing: {async_processing}")

        # Validate all files
        file_paths = []
        receipt_id = str(uuid.uuid4())

        for idx, file in enumerate(files):
            # Validate file type
            if not (file.content_type.startswith("image/") or file.content_type == "application/pdf"):
                print(f"❌ Invalid file type: {file.content_type}")
                raise HTTPException(status_code=400, detail=f"File {file.filename} must be an image or PDF")

            # Save uploaded file
            file_extension = file.filename.split(".")[-1] if file.filename else "jpg"
            file_path = os.path.join(settings.upload_dir, f"{receipt_id}_{idx}.{file_extension}")
            print(f"💾 Saving file to: {file_path}")

            content = await file.read()
            print(f"📄 Read {len(content)} bytes from uploaded file")

            with open(file_path, "wb") as f:
                f.write(content)
            print(f"✅ File saved successfully")

            file_paths.append(file_path)

        # Get user categories if authenticated (for both async and sync)
        custom_categories = None
        print(f"🔐 User authenticated: {user is not None}")
        if user:
            print(f"👤 User ID: {user.get('id')}")
            try:
                supabase = SupabaseService()
                categories = supabase.get_user_categories(user["id"])
                print(f"📦 Fetched categories from DB: {categories}")
                custom_categories = [cat["name"] for cat in categories] if categories else None
                print(f"📋 Using {len(categories) if categories else 0} custom categories: {custom_categories}")
            except Exception as e:
                print(f"⚠️ Failed to fetch user categories: {e}")
                import traceback
                traceback.print_exc()
        else:
            print("⚠️ No user authenticated, using default categories")

        if async_processing:
            # Create upload job and process in background
            job = upload_service.create_job(receipt_id, file_paths, custom_categories)
            background_tasks.add_task(upload_service.process_upload, receipt_id)
            print(f"🔄 Created async job {receipt_id} with custom categories: {custom_categories}")

            return ReceiptUploadResponse(
                receipt_id=receipt_id,
                receipt=None,
                extraction_log={"success": False, "message": "Processing in background"},
                confidence=0.0,
            )
        else:
            # Synchronous processing
            print("🤖 Starting Gemini AI extraction...")

            gemini = get_gemini_service()
            receipt, extraction_log = gemini.extract_receipt_data_multiple(file_paths, custom_categories=custom_categories)
            print(f"✅ Extraction completed: {extraction_log.get('success', False)}")

            if not receipt:
                print(f"❌ Extraction failed: {extraction_log.get('error')}")
                raise HTTPException(
                    status_code=422,
                    detail=f"Failed to extract receipt data: {extraction_log.get('error')}",
                )

            # Store receipt temporarily
            receipts_storage[receipt_id] = {
                "receipt": receipt,
                "file_path": file_paths,  # Store list of paths
                "extraction_log": extraction_log,
            }
            print(f"💾 Receipt stored temporarily with ID: {receipt_id}")

            return ReceiptUploadResponse(
                receipt_id=receipt_id,
                receipt=receipt,
                extraction_log=extraction_log,
                confidence=0.85 if extraction_log.get("success") else 0.0,
            )

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Upload error: {type(e).__name__}: {str(e)}")
        import traceback
        print(f"🔍 Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/upload", response_model=ReceiptUploadResponse)
async def upload_receipt(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None,
    async_processing: bool = False,
    user: TypingOptional[dict] = Depends(get_current_user_optional)
):
    """
    Upload receipt image and extract data using Gemini AI

    Args:
        file: Receipt image file (JPEG, PNG, etc.)
        async_processing: If True, process asynchronously and return immediately

    Returns:
        ReceiptUploadResponse with extracted data and logs
    """
    try:
        print(f"📁 Upload request received: {file.filename}, Content-Type: {file.content_type}, Size: {file.size}")
        print(f"⚙️ Async processing: {async_processing}")

        # Validate file type
        if not (file.content_type.startswith("image/") or file.content_type == "application/pdf"):
            print(f"❌ Invalid file type: {file.content_type}")
            raise HTTPException(status_code=400, detail="File must be an image or PDF")

        # Save uploaded file
        receipt_id = str(uuid.uuid4())
        file_extension = file.filename.split(".")[-1] if file.filename else "jpg"
        file_path = os.path.join(settings.upload_dir, f"{receipt_id}.{file_extension}")
        print(f"💾 Saving file to: {file_path}")

        content = await file.read()
        print(f"📄 Read {len(content)} bytes from uploaded file")

        with open(file_path, "wb") as f:
            f.write(content)
        print(f"✅ File saved successfully")

        # Get user categories if authenticated (for both async and sync)
        custom_categories = None
        print(f"🔐 User authenticated: {user is not None}")
        if user:
            print(f"👤 User ID: {user.get('id')}")
            try:
                supabase = SupabaseService()
                categories = supabase.get_user_categories(user["id"])
                print(f"📦 Fetched categories from DB: {categories}")
                custom_categories = [cat["name"] for cat in categories] if categories else None
                print(f"📋 Using {len(categories) if categories else 0} custom categories: {custom_categories}")
            except Exception as e:
                print(f"⚠️ Failed to fetch user categories: {e}")
                import traceback
                traceback.print_exc()
        else:
            print("⚠️ No user authenticated, using default categories")

        if async_processing:
            # Create upload job and process in background
            job = upload_service.create_job(receipt_id, file_path, custom_categories)
            background_tasks.add_task(upload_service.process_upload, receipt_id)
            print(f"🔄 Created async job {receipt_id} with custom categories: {custom_categories}")

            return ReceiptUploadResponse(
                receipt_id=receipt_id,
                receipt=None,  # Will be populated when processing completes
                extraction_log={"success": False, "message": "Processing in background"},
                confidence=0.0,
            )
        else:
            # Synchronous processing (existing behavior)
            print("🤖 Starting Gemini AI extraction...")

            gemini = get_gemini_service()
            receipt, extraction_log = gemini.extract_receipt_data(file_path, custom_categories=custom_categories)
            print(f"✅ Extraction completed: {extraction_log.get('success', False)}")

            if not receipt:
                print(f"❌ Extraction failed: {extraction_log.get('error')}")
                raise HTTPException(
                    status_code=422,
                    detail=f"Failed to extract receipt data: {extraction_log.get('error')}",
                )

            # Store receipt temporarily
            receipts_storage[receipt_id] = {
                "receipt": receipt,
                "file_path": file_path,
                "extraction_log": extraction_log,
            }
            print(f"💾 Receipt stored temporarily with ID: {receipt_id}")

            return ReceiptUploadResponse(
                receipt_id=receipt_id,
                receipt=receipt,
                extraction_log=extraction_log,
                confidence=0.85 if extraction_log.get("success") else 0.0,
            )

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Upload error: {type(e).__name__}: {str(e)}")
        import traceback
        print(f"🔍 Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{receipt_id}/check-duplicates")
async def check_duplicates(receipt_id: str):
    """
    Check for potential duplicate receipts before saving

    Args:
        receipt_id: ID of the uploaded receipt

    Returns:
        List of potential duplicate receipts
    """
    try:
        receipt = None

        # Check async jobs first
        job = upload_service.get_job(receipt_id)
        if job and job.receipt:
            receipt = job.receipt
        # Check synchronous storage
        elif receipt_id in receipts_storage:
            receipt_data = receipts_storage[receipt_id]
            receipt = receipt_data["receipt"]
        else:
            raise HTTPException(status_code=404, detail="Receipt not found")

        # Check for duplicates
        sheets = get_sheets_service()
        duplicates = sheets.find_duplicate_receipts(receipt)

        return {
            "has_duplicates": len(duplicates) > 0,
            "duplicates": duplicates,
            "count": len(duplicates)
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error checking duplicates: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{receipt_id}/confirm")
async def confirm_receipt(
    receipt_id: str,
    request: ReceiptConfirmRequest,
    background_tasks: BackgroundTasks,
    force_save: bool = Query(False)
):
    """
    Confirm and save corrected receipt data to Google Sheets

    Args:
        receipt_id: ID of the uploaded receipt
        request: Confirmed/corrected receipt data
        force_save: If True, save even if duplicates are detected

    Returns:
        Success confirmation with duplicate warning if applicable
    """
    try:
        file_path = None

        # Check async jobs first
        job = upload_service.get_job(receipt_id)
        if job:
            file_path = job.file_path
        # Check synchronous storage
        elif receipt_id in receipts_storage:
            receipt_data = receipts_storage[receipt_id]
            file_path = receipt_data["file_path"]
        else:
            raise HTTPException(status_code=404, detail="Receipt not found")

        sheets = get_sheets_service()

        # Check for duplicates unless force_save is True
        print(f"🔍 Duplicate check: force_save={force_save}")
        if not force_save:
            print("🔎 Checking for duplicate receipts...")
            try:
                duplicates = sheets.find_duplicate_receipts(request.receipt)
                print(f"✅ Duplicate check complete. Found {len(duplicates)} potential duplicates")
                if duplicates:
                    print(f"⚠️ Returning duplicate warning with {len(duplicates)} duplicates")
                    return {
                        "success": False,
                        "duplicate_detected": True,
                        "duplicates": duplicates,
                        "message": "Potential duplicate receipt detected. Please review before saving."
                    }
                else:
                    print("✅ No duplicates found. Proceeding with save.")
            except Exception as e:
                print(f"❌ Error during duplicate check: {e}")
                import traceback
                traceback.print_exc()
        else:
            print("⚠️ Skipping duplicate check (force_save=true)")

        # Save to Google Sheets
        print(f"📋 Confirming receipt {receipt_id}...")
        success = sheets.save_receipt(request.receipt)

        if not success:
            print(f"❌ Failed to save receipt {receipt_id} to Google Sheets")
            raise HTTPException(
                status_code=500,
                detail="Failed to save receipt to Google Sheets. Please check server logs for details."
            )

        # Trigger background analysis update
        background_tasks.add_task(trigger_analysis_update)

        # Clean up stored receipt
        if job:
            upload_service.delete_job(receipt_id)
        else:
            receipts_storage.pop(receipt_id, None)

        # Optionally delete uploaded file
        if file_path:
            try:
                os.remove(file_path)
            except:
                pass

        return JSONResponse(
            content={
                "success": True,
                "message": "Receipt saved successfully",
                "items_saved": len(request.receipt.line_items),
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/{receipt_id}/reprocess", response_model=ReceiptUploadResponse)
async def reprocess_receipt(receipt_id: str, request: ReceiptReprocessRequest):
    """
    Reprocess receipt with user feedback

    Args:
        receipt_id: ID of the uploaded receipt
        request: Reprocess request with feedback

    Returns:
        ReceiptUploadResponse with new extraction
    """
    try:
        file_path = None

        # Check async jobs first
        job = upload_service.get_job(receipt_id)
        if job:
            file_path = job.file_path
        # Check synchronous storage
        elif receipt_id in receipts_storage:
            receipt_data = receipts_storage[receipt_id]
            file_path = receipt_data["file_path"]
        else:
            raise HTTPException(status_code=404, detail="Receipt not found")

        # Get current receipt data
        current_receipt_data = None
        if request.original_receipt:
            current_receipt_data = request.original_receipt.dict()

        # Re-extract with feedback
        gemini = get_gemini_service()
        receipt, extraction_log = gemini.extract_receipt_data(
            file_path,
            user_feedback=request.user_feedback,
            current_receipt=current_receipt_data
        )

        if not receipt:
            raise HTTPException(
                status_code=422,
                detail=f"Failed to reprocess receipt: {extraction_log.get('error')}",
            )

        # Update stored receipt
        if job:
            # Update async job
            job.receipt_data = receipt.dict()
            job.extraction_log = extraction_log
        else:
            # Update synchronous storage
            receipts_storage[receipt_id] = {
                "receipt": receipt,
                "file_path": file_path,
                "extraction_log": extraction_log,
            }

        return ReceiptUploadResponse(
            receipt_id=receipt_id,
            receipt=receipt,
            extraction_log=extraction_log,
            confidence=0.85 if extraction_log.get("success") else 0.0,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/", response_model=list[UploadJobResponse])
async def list_all_receipts():
    """Get all receipts (both pending and completed)"""
    all_receipts = []

    # Get all async jobs
    for receipt_id, job in upload_service.jobs.items():
        all_receipts.append(UploadJobResponse(
            job_id=job.job_id,
            receipt_id=job.receipt_id,
            status=job.status,
            progress=job.progress,
            error=job.error,
            receipt_data=job.receipt_data,
            extraction_log=job.extraction_log,
        ))

    # Get all synchronous receipts
    for receipt_id, receipt_data in receipts_storage.items():
        all_receipts.append(UploadJobResponse(
            job_id=receipt_id,
            receipt_id=receipt_id,
            status=UploadStatus.COMPLETED,
            progress=100,
            receipt_data=receipt_data["receipt"].dict() if receipt_data["receipt"] else None,
            extraction_log=receipt_data["extraction_log"],
        ))

    # Sort by most recent first (assuming receipt_id has timestamp component)
    all_receipts.reverse()

    return all_receipts


@router.get("/{receipt_id}/status", response_model=UploadJobResponse)
async def get_upload_status(receipt_id: str):
    """Get upload job status"""
    # Check if it's an async job
    job = upload_service.get_job(receipt_id)
    if job:
        return UploadJobResponse(
            job_id=job.job_id,
            receipt_id=job.receipt_id,
            status=job.status,
            progress=job.progress,
            error=job.error,
            receipt_data=job.receipt_data,
            extraction_log=job.extraction_log,
        )

    # Check if it's a completed synchronous upload
    if receipt_id in receipts_storage:
        receipt_data = receipts_storage[receipt_id]
        return UploadJobResponse(
            job_id=receipt_id,
            receipt_id=receipt_id,
            status=UploadStatus.COMPLETED,
            progress=100,
            receipt_data=receipt_data["receipt"].dict() if receipt_data["receipt"] else None,
            extraction_log=receipt_data["extraction_log"],
        )

    raise HTTPException(status_code=404, detail="Receipt not found")


@router.get("/{receipt_id}")
async def get_receipt(receipt_id: str):
    """Get receipt by ID"""
    # Check async jobs first
    job = upload_service.get_job(receipt_id)
    if job and job.status == UploadStatus.COMPLETED and job.receipt_data:
        return {
            "receipt_id": receipt_id,
            "receipt": job.receipt_data,
            "extraction_log": job.extraction_log,
        }

    # Check synchronous storage
    if receipt_id not in receipts_storage:
        raise HTTPException(status_code=404, detail="Receipt not found")

    receipt_data = receipts_storage[receipt_id]
    return {
        "receipt_id": receipt_id,
        "receipt": receipt_data["receipt"],
        "extraction_log": receipt_data["extraction_log"],
    }


def get_media_type(file_path: str) -> str:
    """Determine media type based on file extension"""
    if file_path.lower().endswith('.pdf'):
        return "application/pdf"
    elif file_path.lower().endswith('.png'):
        return "image/png"
    elif file_path.lower().endswith('.gif'):
        return "image/gif"
    elif file_path.lower().endswith('.webp'):
        return "image/webp"
    else:
        return "image/jpeg"


def find_receipt_file(receipt_id: str) -> tuple[Optional[str], Optional[str]]:
    """Find receipt file and return (file_path, media_type)"""
    # Check async jobs first
    job = upload_service.get_job(receipt_id)
    if job and job.file_path:
        print(f"✅ Found in async jobs: {job.file_path}")
        if os.path.exists(job.file_path):
            media_type = get_media_type(job.file_path)
            return job.file_path, media_type
        else:
            print(f"❌ File not found at path: {job.file_path}")

    # Check synchronous storage
    if receipt_id in receipts_storage:
        file_path = receipts_storage[receipt_id]["file_path"]
        print(f"✅ Found in receipts_storage: {file_path}")
        if file_path and os.path.exists(file_path):
            media_type = get_media_type(file_path)
            return file_path, media_type
        else:
            print(f"❌ File not found at path: {file_path}")

    # Try to find file by receipt_id pattern
    pattern = os.path.join(settings.upload_dir, f"{receipt_id}.*")
    print(f"🔍 Searching with pattern: {pattern}")
    files = glob.glob(pattern)
    if files:
        print(f"✅ Found via glob: {files[0]}")
        media_type = get_media_type(files[0])
        return files[0], media_type

    return None, None


@router.head("/{receipt_id}/image")
async def head_receipt_image(receipt_id: str):
    """Get receipt file metadata (for Content-Type detection)"""
    print(f"📸 HEAD request for receipt: {receipt_id}")

    file_path, media_type = find_receipt_file(receipt_id)

    if not file_path:
        print(f"❌ No image found for receipt {receipt_id}")
        raise HTTPException(status_code=404, detail="Receipt image not found")

    print(f"✅ Returning Content-Type: {media_type}")
    return JSONResponse(content={}, headers={"Content-Type": media_type})


@router.get("/{receipt_id}/images")
async def get_receipt_images(receipt_id: str):
    """Get list of all image URLs for a receipt"""
    print(f"📸 GET request for all images: {receipt_id}")

    # Check async jobs first
    job = upload_service.get_job(receipt_id)
    if job and hasattr(job, 'all_file_paths') and job.all_file_paths:
        image_count = len(job.all_file_paths)
        print(f"✅ Found {image_count} images in async job")
        return JSONResponse(content={
            "receipt_id": receipt_id,
            "image_count": image_count,
            "images": [f"/api/receipts/{receipt_id}/image/{i}" for i in range(image_count)]
        })

    # Check synchronous storage
    if receipt_id in receipts_storage:
        file_path = receipts_storage[receipt_id]["file_path"]
        # Check if it's a list or single path
        if isinstance(file_path, list):
            image_count = len(file_path)
            print(f"✅ Found {image_count} images in receipts_storage")
            return JSONResponse(content={
                "receipt_id": receipt_id,
                "image_count": image_count,
                "images": [f"/api/receipts/{receipt_id}/image/{i}" for i in range(image_count)]
            })
        else:
            # Single image
            return JSONResponse(content={
                "receipt_id": receipt_id,
                "image_count": 1,
                "images": [f"/api/receipts/{receipt_id}/image"]
            })

    # Try to find files by pattern
    pattern = os.path.join(settings.upload_dir, f"{receipt_id}_*.jpg")
    files = glob.glob(pattern)
    if not files:
        pattern = os.path.join(settings.upload_dir, f"{receipt_id}_*.pdf")
        files = glob.glob(pattern)
    if not files:
        pattern = os.path.join(settings.upload_dir, f"{receipt_id}_*.png")
        files = glob.glob(pattern)

    if files:
        image_count = len(files)
        print(f"✅ Found {image_count} images via glob")
        return JSONResponse(content={
            "receipt_id": receipt_id,
            "image_count": image_count,
            "images": [f"/api/receipts/{receipt_id}/image/{i}" for i in range(image_count)]
        })

    # Fall back to single image
    return JSONResponse(content={
        "receipt_id": receipt_id,
        "image_count": 1,
        "images": [f"/api/receipts/{receipt_id}/image"]
    })


@router.head("/{receipt_id}/image/{index}")
async def head_receipt_image_by_index(receipt_id: str, index: int):
    """Get metadata for specific receipt image by index"""
    print(f"📸 HEAD request for receipt image {index}: {receipt_id}")

    # Check async jobs first
    job = upload_service.get_job(receipt_id)
    if job and hasattr(job, 'all_file_paths') and job.all_file_paths:
        if index >= len(job.all_file_paths):
            raise HTTPException(status_code=404, detail=f"Image index {index} not found")
        file_path = job.all_file_paths[index]
        if os.path.exists(file_path):
            media_type = get_media_type(file_path)
            return JSONResponse(content={}, headers={"Content-Type": media_type})

    # Check synchronous storage
    if receipt_id in receipts_storage:
        file_path = receipts_storage[receipt_id]["file_path"]
        if isinstance(file_path, list):
            if index >= len(file_path):
                raise HTTPException(status_code=404, detail=f"Image index {index} not found")
            target_path = file_path[index]
            if os.path.exists(target_path):
                media_type = get_media_type(target_path)
                return JSONResponse(content={}, headers={"Content-Type": media_type})

    # Try to find file by pattern
    pattern = os.path.join(settings.upload_dir, f"{receipt_id}_{index}.*")
    files = glob.glob(pattern)
    if files:
        media_type = get_media_type(files[0])
        return JSONResponse(content={}, headers={"Content-Type": media_type})

    raise HTTPException(status_code=404, detail=f"Image {index} not found")


@router.get("/{receipt_id}/image/{index}")
async def get_receipt_image_by_index(receipt_id: str, index: int):
    """Get specific receipt image by index"""
    print(f"📸 GET request for receipt image {index}: {receipt_id}")

    # Check async jobs first
    job = upload_service.get_job(receipt_id)
    if job and hasattr(job, 'all_file_paths') and job.all_file_paths:
        if index >= len(job.all_file_paths):
            raise HTTPException(status_code=404, detail=f"Image index {index} not found")
        file_path = job.all_file_paths[index]
        if os.path.exists(file_path):
            media_type = get_media_type(file_path)
            return FileResponse(file_path, media_type=media_type)

    # Check synchronous storage
    if receipt_id in receipts_storage:
        file_path = receipts_storage[receipt_id]["file_path"]
        if isinstance(file_path, list):
            if index >= len(file_path):
                raise HTTPException(status_code=404, detail=f"Image index {index} not found")
            target_path = file_path[index]
            if os.path.exists(target_path):
                media_type = get_media_type(target_path)
                return FileResponse(target_path, media_type=media_type)

    # Try to find file by pattern
    pattern = os.path.join(settings.upload_dir, f"{receipt_id}_{index}.*")
    files = glob.glob(pattern)
    if files:
        media_type = get_media_type(files[0])
        return FileResponse(files[0], media_type=media_type)

    raise HTTPException(status_code=404, detail=f"Image {index} not found")


@router.get("/{receipt_id}/image")
async def get_receipt_image(receipt_id: str):
    """Get receipt image or PDF file (first image if multiple)"""
    print(f"📸 GET request for receipt: {receipt_id}")

    file_path, media_type = find_receipt_file(receipt_id)

    if not file_path:
        print(f"❌ No image found for receipt {receipt_id}")
        raise HTTPException(status_code=404, detail="Receipt image not found")

    return FileResponse(file_path, media_type=media_type)
