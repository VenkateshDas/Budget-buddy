"""
Image optimization service for faster processing
"""
import os
from PIL import Image
from io import BytesIO
from typing import Tuple


class ImageOptimizer:
    """Service for optimizing receipt images before processing"""

    # Target dimensions - receipts are typically vertical
    MAX_WIDTH = 1200
    MAX_HEIGHT = 2000

    # Quality settings
    JPEG_QUALITY = 85
    MAX_FILE_SIZE = 500 * 1024  # 500KB target

    @staticmethod
    def optimize_image(input_path: str, output_path: str = None) -> Tuple[str, int]:
        """
        Optimize image for faster Gemini processing

        Args:
            input_path: Path to original image
            output_path: Path to save optimized image (default: overwrite original)

        Returns:
            Tuple of (output_path, file_size_bytes)
        """
        if output_path is None:
            output_path = input_path

        try:
            # Open image
            with Image.open(input_path) as img:
                # Convert to RGB if needed (handles PNG with alpha, etc.)
                if img.mode in ('RGBA', 'LA', 'P'):
                    # Create white background
                    background = Image.new('RGB', img.size, (255, 255, 255))
                    if img.mode == 'P':
                        img = img.convert('RGBA')
                    background.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
                    img = background
                elif img.mode != 'RGB':
                    img = img.convert('RGB')

                # Get original dimensions
                orig_width, orig_height = img.size

                # Calculate new dimensions maintaining aspect ratio
                if orig_width > ImageOptimizer.MAX_WIDTH or orig_height > ImageOptimizer.MAX_HEIGHT:
                    # Calculate scaling factor
                    width_ratio = ImageOptimizer.MAX_WIDTH / orig_width
                    height_ratio = ImageOptimizer.MAX_HEIGHT / orig_height
                    scale_factor = min(width_ratio, height_ratio)

                    new_width = int(orig_width * scale_factor)
                    new_height = int(orig_height * scale_factor)

                    # Resize with high-quality resampling
                    img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
                    print(f"📏 Resized image: {orig_width}x{orig_height} -> {new_width}x{new_height}")

                # Save with progressive JPEG for better compression
                # Start with quality 85 and reduce if file is too large
                quality = ImageOptimizer.JPEG_QUALITY

                while quality > 60:
                    # Save to buffer first to check size
                    buffer = BytesIO()
                    img.save(buffer, format='JPEG', quality=quality, optimize=True, progressive=True)
                    file_size = buffer.tell()

                    if file_size <= ImageOptimizer.MAX_FILE_SIZE or quality == 60:
                        # Save to actual file
                        buffer.seek(0)
                        with open(output_path, 'wb') as f:
                            f.write(buffer.getvalue())

                        print(f"💾 Optimized image: {file_size / 1024:.1f}KB (quality: {quality})")
                        return output_path, file_size

                    # Reduce quality and try again
                    quality -= 5

                # Fallback: save with quality 60
                img.save(output_path, format='JPEG', quality=60, optimize=True, progressive=True)
                file_size = os.path.getsize(output_path)
                print(f"💾 Optimized image: {file_size / 1024:.1f}KB (quality: 60)")
                return output_path, file_size

        except Exception as e:
            print(f"❌ Image optimization failed: {e}")
            # If optimization fails, return original
            return input_path, os.path.getsize(input_path)

    @staticmethod
    def get_image_info(image_path: str) -> dict:
        """Get image information"""
        try:
            with Image.open(image_path) as img:
                return {
                    'width': img.width,
                    'height': img.height,
                    'format': img.format,
                    'mode': img.mode,
                    'size_bytes': os.path.getsize(image_path),
                    'size_kb': os.path.getsize(image_path) / 1024,
                }
        except Exception as e:
            print(f"❌ Failed to get image info: {e}")
            return {}
