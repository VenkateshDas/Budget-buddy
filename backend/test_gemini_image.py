#!/usr/bin/env python3
"""
Test Gemini API with image
"""
import os
import sys
import time
from google import genai
from app.core.config import get_settings
from app.models.receipt import Receipt

def test_gemini_with_image():
    """Test Gemini API with image and Receipt schema"""
    print("=" * 60)
    print("Testing Gemini API with Image")
    print("=" * 60)

    settings = get_settings()
    client = genai.Client(api_key=settings.google_api_key)

    # Find the uploaded image
    image_path = "uploads/569693e0-bf72-426f-b13d-f4428c75ffa7_0_optimized.jpeg"

    if not os.path.exists(image_path):
        # Try finding any recent upload
        uploads = sorted([f for f in os.listdir("uploads") if f.endswith(".jpeg")],
                        key=lambda x: os.path.getmtime(f"uploads/{x}"),
                        reverse=True)
        if uploads:
            image_path = f"uploads/{uploads[0]}"
        else:
            print(f"❌ No test image found")
            return False

    print(f"\n1. Test image: {image_path}")
    print(f"   Size: {os.path.getsize(image_path) / 1024:.1f}KB")

    try:
        print("\n2. Uploading image to Gemini...")
        sys.stdout.flush()

        start = time.time()
        file_obj = client.files.upload(
            file=image_path,
            config={"mime_type": "image/jpeg"}
        )
        upload_time = time.time() - start
        print(f"   ✅ Upload took {upload_time:.2f}s")
        print(f"   File URI: {file_obj.uri[:50]}...")

        print("\n3. Testing simple image description...")
        sys.stdout.flush()

        start = time.time()
        response = client.models.generate_content(
            model=settings.gemini_model_id,
            contents=["Describe this image in one sentence", file_obj],
        )
        gen_time = time.time() - start
        print(f"   ✅ Generation took {gen_time:.2f}s")
        print(f"   Response: {response.text[:100]}...")

        print("\n4. Testing with Receipt schema (STRUCTURED OUTPUT)...")
        print(f"   Model: {settings.gemini_model_id}")
        sys.stdout.flush()

        start = time.time()
        response = client.models.generate_content(
            model=settings.gemini_model_id,
            contents=["Extract receipt data", file_obj],
            config={
                "response_mime_type": "application/json",
                "response_schema": Receipt,
                "temperature": 0.1,
                "top_p": 0.8,
                "top_k": 20,
            },
        )
        gen_time = time.time() - start
        print(f"   ✅ Structured generation took {gen_time:.2f}s")
        print(f"   Response length: {len(response.text)} chars")

        if response.parsed:
            receipt = Receipt.model_validate(response.parsed)
            print(f"   ✅ Receipt parsed: {receipt.merchant_details.name}")
        else:
            print(f"   ⚠️  No parsed response, raw: {response.text[:200]}")

        print("\n" + "=" * 60)
        print("✅ ALL IMAGE TESTS PASSED")
        print("=" * 60)
        return True

    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        print("\n" + "=" * 60)
        print("❌ IMAGE TESTS FAILED")
        print("=" * 60)
        return False

if __name__ == "__main__":
    success = test_gemini_with_image()
    sys.exit(0 if success else 1)
