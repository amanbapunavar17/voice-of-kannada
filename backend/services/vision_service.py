import io
import json
import logging
from typing import Any, Dict, List, Optional
from google.genai import types
from pydantic import BaseModel, Field
from services.gemini_service import get_gemini_client, get_candidate_models
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

def identify_object_from_image(
    image_bytes: bytes,
    mime_type: str = "image/jpeg",
    user_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Analyzes an image using Gemini Vision capability.
    Extracts authentic Kannada vocabulary, transliteration, and conversational usage.
    """
    if len(image_bytes) > 10 * 1024 * 1024:
        raise ValueError("Image file size exceeds 10MB limit.")

    client = get_gemini_client()
    candidates = get_candidate_models()

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

    last_error = None
    for model_name in candidates:
        try:
            image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
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
            logger.warning(f"Vision call with {model_name} failed: {exc}")
            last_error = exc
            continue

    raise RuntimeError(f"Vision identification failed across all candidate models. Last error: {last_error}")

