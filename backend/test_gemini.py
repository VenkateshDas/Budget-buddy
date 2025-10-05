#!/usr/bin/env python3
"""
Simple Gemini API test to diagnose issues
"""
import os
import sys
from google import genai
from app.core.config import get_settings

def test_gemini_basic():
    """Test basic Gemini API connectivity"""
    print("=" * 60)
    print("Testing Gemini API")
    print("=" * 60)

    settings = get_settings()

    print(f"\n1. API Key configured: {'Yes' if settings.google_api_key else 'No'}")
    print(f"2. API Key (first 10 chars): {settings.google_api_key[:10]}...")
    print(f"3. Model ID: {settings.gemini_model_id}")

    try:
        print("\n4. Creating Gemini client...")
        client = genai.Client(api_key=settings.google_api_key)
        print("   ✅ Client created successfully")

        print("\n5. Testing simple text generation...")
        sys.stdout.flush()

        response = client.models.generate_content(
            model=settings.gemini_model_id,
            contents=["Say 'Hello World'"],
        )

        print(f"   ✅ Response: {response.text}")

        print("\n6. Testing JSON response...")
        sys.stdout.flush()

        response = client.models.generate_content(
            model=settings.gemini_model_id,
            contents=["Return JSON: {\"status\": \"ok\", \"message\": \"test\"}"],
            config={
                "response_mime_type": "application/json",
            }
        )

        print(f"   ✅ Response: {response.text}")

        print("\n" + "=" * 60)
        print("✅ ALL TESTS PASSED")
        print("=" * 60)
        return True

    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        print("\n" + "=" * 60)
        print("❌ TESTS FAILED")
        print("=" * 60)
        return False

if __name__ == "__main__":
    success = test_gemini_basic()
    sys.exit(0 if success else 1)
