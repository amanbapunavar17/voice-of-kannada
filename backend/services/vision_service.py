import io
import json
import logging
import os
import random
import time
from typing import Any, Dict, List, Optional, Tuple
from PIL import Image, UnidentifiedImageError
from google.genai import types
from pydantic import BaseModel, Field
from services.gemini_service import get_gemini_client, get_candidate_models, is_transient_error
from services.auth_service import get_supabase_client

logger = logging.getLogger("maatu.vision")

class RelatedWord(BaseModel):
    kannada: str = Field(description="Kannada script word")
    transliteration: str = Field(description="Latin transliteration")
    english: str = Field(description="English meaning")

class ObjectIdentificationPayload(BaseModel):
    identified_object_english: str = Field(description="Primary detected object name in simple English (e.g. Chair, Apple, Pen, Car)")
    kannada_word: str = Field(description="The primary everyday Kannada name for this object in Kannada script (e.g. ಕುರ್ಚಿ)")
    transliteration: str = Field(description="Phonetic Latin transliteration (e.g. Kurchi)")
    category: str = Field(description="One of: 'household', 'food', 'fruits_vegetables', 'vehicles', 'classroom', 'public_places', 'other'")
    confidence_level: str = Field(description="'high', 'medium', or 'uncertain'")
    identification_note: str = Field(description="Concise description of the object observed in the image")
    example_sentence_kannada: str = Field(description="A natural, beginner-friendly Kannada sentence using this word")
    example_sentence_transliteration: str = Field(description="Phonetic transliteration of the example sentence")
    example_sentence_english: str = Field(description="English translation of the example sentence")
    useful_related_words: List[RelatedWord] = Field(description="2-3 related words in format {kannada, transliteration, english}")

def validate_and_optimize_image(image_bytes: bytes, max_dimension: int = 1200) -> Tuple[bytes, str]:
    """
    Validates uploaded image and resizes oversized photos safely.
    Compresses payload to prevent Gemini 504 DEADLINE_EXCEEDED timeouts while preserving clarity.
    """
    if not image_bytes:
        raise ValueError("Image data is empty. Please capture or upload a valid photo.")
        
    if len(image_bytes) > 15 * 1024 * 1024:
        raise ValueError("Image file size exceeds the 15MB limit. Please upload a smaller image.")

    try:
        image = Image.open(io.BytesIO(image_bytes))
        image.verify()
        # Re-open after verify() because verify() clears the image buffer
        image = Image.open(io.BytesIO(image_bytes))
    except (UnidentifiedImageError, OSError) as img_err:
        raise ValueError("Invalid or corrupted image file. Please upload a clear photo in JPG, PNG, or WebP format.") from img_err

    # Convert non-RGB (e.g. RGBA transparent, palette, grayscale) to standard RGB
    if image.mode in ("RGBA", "LA", "P"):
        image = image.convert("RGB")
    elif image.mode != "RGB":
        image = image.convert("RGB")

    # Downscale high-resolution phone camera images to reasonable dimensions (max 1200px)
    width, height = image.size
    if max(width, height) > max_dimension:
        image.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)

    # Encode as JPEG with high visual fidelity and lightweight byte size
    output_stream = io.BytesIO()
    image.save(output_stream, format="JPEG", quality=85, optimize=True)
    optimized_bytes = output_stream.getvalue()

    return optimized_bytes, "image/jpeg"

def identify_object_from_image(
    image_bytes: bytes,
    mime_type: str = "image/jpeg",
    user_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Analyzes an image using Gemini Vision capability with resilient timeout and retry handling.
    Extracts authentic Kannada vocabulary, transliteration, and conversational usage.
    """
    # 1. Validate and optimize image payload before sending over network
    optimized_bytes, effective_mime = validate_and_optimize_image(image_bytes)

    # 2. Configurable vision timeout (default 40s = 40000ms, much higher than default 12s)
    vision_timeout_ms = int(os.getenv("GEMINI_VISION_TIMEOUT_MS", "40000"))
    max_retries = int(os.getenv("MAX_VISION_RETRIES", "1"))
    
    client = get_gemini_client(timeout_ms=vision_timeout_ms)
    candidates = get_candidate_models(for_vision=True)

    prompt = """
Look carefully at this image and identify the main everyday object or subject.
Your goal is to teach everyday conversational Kannada to a beginner who has moved to Karnataka.

Tasks:
1. Identify the primary object in English.
2. Provide the genuine, everyday Kannada word used in Karnataka (e.g., if a cup is shown, 'ಕಪ್' or 'ಲೋಟ'; if chair, 'ಕುರ್ಚಿ'; if auto, 'ಆಟೋ'; if dog, 'ನಾಯಿ'; if book, 'ಪುಸ್ತಕ').
3. Provide accurate phonetic transliteration.
4. Categorize the object.
5. Provide a simple, beginner-friendly example sentence showing how to use the word in everyday conversation.
6. Provide 2-3 related words.
7. Be honest about confidence: if blurry or uncertain, mark confidence as 'uncertain' or 'medium'.

Return valid JSON conforming to the schema.
"""

    last_error: Optional[Exception] = None
    deadline_exceeded_count = 0

    for model_name in candidates:
        for attempt in range(max_retries + 1):
            try:
                image_part = types.Part.from_bytes(data=optimized_bytes, mime_type=effective_mime)
                try:
                    config = types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=ObjectIdentificationPayload,
                    )
                    response = client.models.generate_content(
                        model=model_name,
                        contents=[image_part, prompt],
                        config=config,
                    )
                except Exception as schema_err:
                    if "additionalProperties" in str(schema_err) or "response_schema" in str(schema_err):
                        logger.warning("Retrying vision prompt without strict response_schema...")
                        fallback_config = types.GenerateContentConfig(
                            response_mime_type="application/json",
                        )
                        response = client.models.generate_content(
                            model=model_name,
                            contents=[image_part, prompt],
                            config=fallback_config,
                        )
                    else:
                        raise schema_err

                if response and response.text:
                    result_json = json.loads(response.text)

                    # Persist to camera_vocabulary if user is authenticated
                    if user_id:
                        sb = get_supabase_client()
                        if sb:
                            try:
                                sb.table("camera_vocabulary").insert({
                                    "user_id": user_id,
                                    "detected_english": result_json.get("identified_object_english"),
                                    "kannada_word": result_json.get("kannada_word"),
                                    "transliteration": result_json.get("transliteration"),
                                    "category": result_json.get("category", "household"),
                                    "example_sentence_kannada": result_json.get("example_sentence_kannada"),
                                    "example_sentence_english": result_json.get("example_sentence_english"),
                                }).execute()
                            except Exception as db_err:
                                logger.debug(f"Could not persist camera vocabulary: {db_err}")

                    return result_json

            except Exception as exc:
                err_str = str(exc)
                last_error = exc
                logger.warning(f"Vision call with {model_name} (attempt {attempt+1}) failed: {err_str[:120]}")

                # Detect 504 / DeadlineExceeded specifically
                if "504" in err_str or "deadline_exceeded" in err_str.lower() or "timed out" in err_str.lower():
                    deadline_exceeded_count += 1

                # If authentication or bad request, do not retry
                if "401" in err_str or "403" in err_str or "api_key" in err_str.lower():
                    raise exc

                # If transient error and retries remain, back off with jitter
                if attempt < max_retries and is_transient_error(exc):
                    sleep_time = (0.6 * (2 ** attempt)) + random.uniform(0.1, 0.4)
                    time.sleep(sleep_time)
                else:
                    break

    # If all candidate attempts failed specifically due to deadlines/timeouts, raise TimeoutError
    if deadline_exceeded_count > 0:
        raise TimeoutError("MAATHU is taking longer than expected to identify this object. Please try again.")

    raise RuntimeError(f"Vision identification failed across all candidate models. Last error: {last_error}")
