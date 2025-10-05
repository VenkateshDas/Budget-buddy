"""
Gemini AI service for receipt extraction
Ported from CLI script with additional logging
"""
import os
import mimetypes
import time
from typing import Optional, Dict, Any
from google import genai
from app.models.receipt import Receipt
from app.core.config import get_settings
from app.services.image_optimizer import ImageOptimizer
from pdf2image import convert_from_path
from PIL import Image

settings = get_settings()


class GeminiService:
    """Service for Gemini AI operations"""

    def __init__(self):
        self.client = genai.Client(api_key=settings.google_api_key)
        self.model_id = settings.gemini_model_id
        self.image_optimizer = ImageOptimizer()
        # Cache for uploaded file URIs to avoid re-uploading for reprocessing
        self.file_cache: Dict[str, Any] = {}

    def convert_pdf_to_image(self, pdf_path: str) -> tuple[str, str]:
        """
        Convert PDF to image (first page only for receipts)

        Args:
            pdf_path: Path to PDF file

        Returns:
            Tuple of (converted image path, original pdf path)
        """
        try:
            print(f"📄 Converting PDF to image: {pdf_path}")
            # Convert first page to image
            images = convert_from_path(pdf_path, first_page=1, last_page=1, dpi=300)

            if not images:
                raise ValueError("Could not convert PDF to image")

            # Save as JPEG in temp location
            image_path = pdf_path.replace('.pdf', '_converted.jpg')
            images[0].save(image_path, 'JPEG', quality=95)
            print(f"✅ PDF converted to image: {image_path}")

            return image_path, pdf_path
        except Exception as e:
            print(f"❌ Error converting PDF: {e}")
            raise ValueError(f"Failed to convert PDF to image: {str(e)}")

    def extract_receipt_data_multiple(
        self, image_paths: list[str], user_feedback: Optional[str] = None, current_receipt: Optional[Dict[str, Any]] = None, custom_categories: Optional[list[str]] = None
    ) -> tuple[Optional[Receipt], Dict[str, Any]]:
        """
        Extract receipt data from multiple images using Gemini

        Args:
            image_paths: List of paths to receipt images
            user_feedback: Optional user feedback for reprocessing
            current_receipt: Optional current receipt data for reprocessing

        Returns:
            Tuple of (Receipt object, extraction log dict)
        """
        extraction_log = {
            "prompt": "",
            "response": "",
            "error": None,
            "success": False,
            "timings": {}
        }

        start_time = time.time()

        try:
            print(f"🤖 Processing {len(image_paths)} images for receipt extraction")

            # Process all images and upload to Gemini
            file_objects = []
            converted_paths = []

            for idx, image_path in enumerate(image_paths):
                print(f"📄 Processing image {idx + 1}/{len(image_paths)}: {image_path}")

                # Check if PDF and convert
                current_path = image_path
                if image_path.lower().endswith('.pdf'):
                    pdf_convert_start = time.time()
                    converted_image, original_pdf = self.convert_pdf_to_image(image_path)
                    converted_paths.append(converted_image)
                    current_path = converted_image
                    extraction_log["timings"][f"pdf_conversion_{idx}"] = time.time() - pdf_convert_start

                # Optimize image
                optimize_start = time.time()
                original_size = os.path.getsize(current_path)
                optimized_path = current_path.replace('.', f'_opt{idx}.')
                optimized_path, optimized_size = self.image_optimizer.optimize_image(
                    current_path, optimized_path
                )
                extraction_log["timings"][f"optimization_{idx}"] = time.time() - optimize_start

                # Upload to Gemini
                upload_start = time.time()
                file_obj = self.client.files.upload(
                    file=optimized_path, config={"mime_type": "image/jpeg"}
                )
                file_objects.append(file_obj)
                extraction_log["timings"][f"upload_{idx}"] = time.time() - upload_start

                # Cleanup optimized file
                if optimized_path != current_path and os.path.exists(optimized_path):
                    try:
                        os.remove(optimized_path)
                    except:
                        pass

            # Create prompt for multiple images
            categories_list = custom_categories if custom_categories else [
                "Groceries", "Dining", "Transport", "Utilities", "Entertainment",
                "Shopping", "Health", "Other", "Produce", "Bakery", "Meat"
            ]
            categories_str = ", ".join(categories_list)

            base_prompt = f"""Extract receipt data from these {len(image_paths)} images of the same receipt.
Combine information from all images to create a complete receipt.
Return date as DD-MM-YYYY.
Categorize each item into one of these categories: {categories_str}"""
            extraction_log["prompt"] = base_prompt

            # Generate content with all images
            generation_start = time.time()
            contents = [base_prompt] + file_objects

            response = self.client.models.generate_content(
                model=self.model_id,
                contents=contents,
                config={
                    "response_mime_type": "application/json",
                    "response_schema": Receipt,
                    "temperature": 0.1,
                    "top_p": 0.8,
                    "top_k": 20,
                },
            )

            generation_time = time.time() - generation_start
            extraction_log["timings"]["generation"] = generation_time
            print(f"🤖 AI generation took {generation_time:.2f}s")

            extraction_log["response"] = str(response.text)

            if response.parsed:
                receipt = Receipt.model_validate(response.parsed)
                extraction_log["success"] = True

                total_time = time.time() - start_time
                extraction_log["timings"]["total"] = total_time
                print(f"✅ Total extraction time: {total_time:.2f}s")

                # Clean up converted PDF files
                for converted_path in converted_paths:
                    if os.path.exists(converted_path):
                        try:
                            os.remove(converted_path)
                        except:
                            pass

                return receipt, extraction_log
            else:
                extraction_log["error"] = "No data extracted from receipt"
                return None, extraction_log

        except Exception as e:
            extraction_log["error"] = str(e)
            extraction_log["timings"]["total"] = time.time() - start_time
            return None, extraction_log

    def extract_receipt_data(
        self, image_path: str, user_feedback: Optional[str] = None, current_receipt: Optional[Dict[str, Any]] = None, custom_categories: Optional[list[str]] = None
    ) -> tuple[Optional[Receipt], Dict[str, Any]]:
        """
        Extract receipt data from image using Gemini (optimized)

        Args:
            image_path: Path to receipt image
            user_feedback: Optional user feedback for reprocessing

        Returns:
            Tuple of (Receipt object, extraction log dict)
        """
        extraction_log = {
            "prompt": "",
            "response": "",
            "error": None,
            "success": False,
            "timings": {}
        }

        start_time = time.time()

        try:
            # OPTIMIZATION: Skip image processing entirely if reprocessing with current receipt
            file_obj = None
            optimized_path = None
            converted_pdf_path = None

            if user_feedback and current_receipt:
                # Reprocessing with current data - no image needed
                print("🔄 Reprocessing with current receipt data (skipping image processing)")
                extraction_log["timings"]["optimization"] = 0
                extraction_log["timings"]["upload"] = 0
            else:
                # Need to process image for initial extraction or feedback without current data
                # Check file exists
                if not os.path.exists(image_path):
                    extraction_log["error"] = f"File not found: {image_path}"
                    return None, extraction_log

                # Check if PDF and convert to image
                if image_path.lower().endswith('.pdf'):
                    pdf_convert_start = time.time()
                    converted_image, original_pdf = self.convert_pdf_to_image(image_path)
                    converted_pdf_path = converted_image  # Track for cleanup
                    image_path = converted_image  # Use converted image for processing
                    extraction_log["timings"]["pdf_conversion"] = time.time() - pdf_convert_start

                # OPTIMIZATION 1: Image preprocessing and compression
                optimize_start = time.time()
                original_size = os.path.getsize(image_path)
                print(f"📊 Original image size: {original_size / 1024:.1f}KB")

                # Create optimized version
                optimized_path = image_path.replace('.', '_optimized.')
                optimized_path, optimized_size = self.image_optimizer.optimize_image(
                    image_path, optimized_path
                )

                size_reduction = ((original_size - optimized_size) / original_size) * 100
                print(f"⚡ Size reduced by {size_reduction:.1f}% ({original_size/1024:.1f}KB -> {optimized_size/1024:.1f}KB)")

                extraction_log["timings"]["optimization"] = time.time() - optimize_start

                # OPTIMIZATION 2: Use cache for reprocessing (avoid re-uploading)
                cache_key = f"{image_path}_{os.path.getmtime(image_path)}"

                if cache_key in self.file_cache and not user_feedback:
                    file_obj = self.file_cache[cache_key]
                    print("⚡ Using cached file upload")
                    extraction_log["timings"]["upload"] = 0
                else:
                    # Upload optimized file to Gemini
                    upload_start = time.time()
                    mimetype = "image/jpeg"  # We always convert to JPEG

                    file_obj = self.client.files.upload(
                        file=optimized_path, config={"mime_type": mimetype}
                    )

                    upload_time = time.time() - upload_start
                    extraction_log["timings"]["upload"] = upload_time
                    print(f"⬆️ File upload took {upload_time:.2f}s")

                    # Cache the uploaded file for potential reprocessing
                    self.file_cache[cache_key] = file_obj

            # OPTIMIZATION 3: Streamlined, specific prompt
            if user_feedback and current_receipt:
                import json
                current_data = json.dumps(current_receipt, indent=2)
                base_prompt = f"""Here is the current receipt data:
{current_data}

User feedback: {user_feedback}

IMPORTANT: Only modify the fields mentioned in the user feedback. Keep all other fields exactly as they are in the current data. Do not change categories, quantities, prices, or any other fields unless explicitly mentioned in the feedback.

Return the updated receipt data in the same JSON format."""
            elif user_feedback:
                base_prompt = f"Re-extract receipt data with this correction: {user_feedback}\nReturn date as DD-MM-YYYY."
            else:
                categories_list = custom_categories if custom_categories else [
                    "Groceries", "Dining", "Transport", "Utilities", "Entertainment",
                    "Shopping", "Health", "Other", "Produce", "Bakery", "Meat"
                ]
                categories_str = ", ".join(categories_list)
                base_prompt = f"Extract receipt data: merchant name, address, date (DD-MM-YYYY), items with prices, quantities, total, tax, payment method. Categorize each item into one of: {categories_str}"

            extraction_log["prompt"] = base_prompt

            # OPTIMIZATION 4: Use generation config for faster processing
            generation_start = time.time()

            # For reprocessing with current receipt, don't send image - just process JSON
            if user_feedback and current_receipt:
                response = self.client.models.generate_content(
                    model=self.model_id,
                    contents=[base_prompt],
                    config={
                        "response_mime_type": "application/json",
                        "response_schema": Receipt,
                        "temperature": 0.1,
                        "top_p": 0.8,
                        "top_k": 20,
                    },
                )
            else:
                # For initial extraction or reprocessing without current data, use image
                response = self.client.models.generate_content(
                    model=self.model_id,
                    contents=[base_prompt, file_obj],
                    config={
                        "response_mime_type": "application/json",
                        "response_schema": Receipt,
                        "temperature": 0.1,
                        "top_p": 0.8,
                        "top_k": 20,
                    },
                )

            generation_time = time.time() - generation_start
            extraction_log["timings"]["generation"] = generation_time
            print(f"🤖 AI generation took {generation_time:.2f}s")

            extraction_log["response"] = str(response.text)

            if response.parsed:
                receipt = Receipt.model_validate(response.parsed)
                extraction_log["success"] = True

                total_time = time.time() - start_time
                extraction_log["timings"]["total"] = total_time
                print(f"✅ Total extraction time: {total_time:.2f}s")

                # Clean up optimized file if different from original
                if optimized_path and optimized_path != image_path and os.path.exists(optimized_path):
                    try:
                        os.remove(optimized_path)
                    except:
                        pass

                # Clean up converted PDF file
                if converted_pdf_path and os.path.exists(converted_pdf_path):
                    try:
                        os.remove(converted_pdf_path)
                    except:
                        pass

                return receipt, extraction_log
            else:
                extraction_log["error"] = "No data extracted from receipt"
                return None, extraction_log

        except Exception as e:
            extraction_log["error"] = str(e)
            extraction_log["timings"]["total"] = time.time() - start_time
            return None, extraction_log

    def categorize_item(self, item_name: str) -> str:
        """
        Use Gemini to categorize an item

        Args:
            item_name: Name of the item to categorize

        Returns:
            Category name
        """
        try:
            prompt = f"""Categorize this purchase item into one of these categories:
Groceries, Dining, Transport, Utilities, Entertainment, Shopping, Health, Other

Item: {item_name}

Return ONLY the category name, nothing else."""

            response = self.client.models.generate_content(
                model=self.model_id, contents=[prompt]
            )

            category = response.text.strip()
            # Validate category
            valid_categories = [
                "Groceries",
                "Dining",
                "Transport",
                "Utilities",
                "Entertainment",
                "Shopping",
                "Health",
                "Other",
            ]
            if category in valid_categories:
                return category
            return "Other"

        except Exception as e:
            print(f"Error categorizing item: {e}")
            return "Other"
