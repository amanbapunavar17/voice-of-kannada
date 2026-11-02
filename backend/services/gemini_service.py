import json
import logging
import os
import time
from typing import Any, List, Optional, Type
from google import genai
from google.genai import types
from pydantic import BaseModel

logger = logging.getLogger("maatu.gemini")

# Cache the currently responsive model name to avoid repeated timeouts
_active_working_model: Optional[str] = None
_last_model_check: float = 0.0

def get_gemini_client() -> genai.Client:
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key or api_key.startswith("your_") or api_key == "PASTE_YOUR_KEY_HERE":
        raise ValueError("Valid GEMINI_API_KEY is not configured in backend/.env")
    return genai.Client(
        api_key=api_key,
        http_options=types.HttpOptions(timeout=12000),
    )

def get_candidate_models() -> List[str]:
    global _active_working_model, _last_model_check
    configured = os.getenv("GEMINI_MODEL", "gemini-3.5-flash").strip()
    
    candidates = []
    # If a known working model was confirmed recently (within 10 minutes), try it first
    now = time.time()
    if _active_working_model and (now - _last_model_check < 600):
        candidates.append(_active_working_model)
    
    if configured not in candidates:
        candidates.append(configured)
    for fallback in ["gemini-3.5-flash", "gemini-3.8-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"]:
        if fallback not in candidates:
            candidates.append(fallback)
    return candidates

def generate_gemini_content(
    contents: Any,
    schema: Optional[Type[BaseModel]] = None,
    system_instruction: Optional[str] = None,
) -> str:
    """
    Executes content generation using the official google-genai SDK.
    Resiliently iterates through candidate models and recovers from high-load 503 spikes.
    """
    global _active_working_model, _last_model_check
    client = get_gemini_client()
    candidates = get_candidate_models()
    last_error: Optional[Exception] = None

    for model_name in candidates:
        try:
            config_kwargs = {}
            if schema is not None:
                config_kwargs["response_mime_type"] = "application/json"
                config_kwargs["response_schema"] = schema
            if system_instruction:
                config_kwargs["system_instruction"] = system_instruction

            config = types.GenerateContentConfig(**config_kwargs) if config_kwargs else None

            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=contents,
                    config=config,
                )
            except Exception as schema_err:
                # If schema has additionalProperties rejected by Developer API mode, fallback to plain JSON mode
                if "additionalProperties" in str(schema_err) or "response_schema" in str(schema_err):
                    logger.warning(f"Schema rejected with additionalProperties; retrying without strict response_schema on {model_name}")
                    fallback_config = types.GenerateContentConfig(
                        response_mime_type="application/json",
                        system_instruction=system_instruction,
                    )
                    response = client.models.generate_content(
                        model=model_name,
                        contents=contents,
                        config=fallback_config,
                    )
                else:
                    raise schema_err

            if response and response.text:
                _active_working_model = model_name
                _last_model_check = time.time()
                return response.text.strip()
            raise ValueError(f"Empty response from Gemini model {model_name}")

        except Exception as exc:
            err_str = str(exc)
            last_error = exc
            logger.warning(
                f"Gemini call with model {model_name} failed: {err_str[:120]}"
            )
            continue

    raise RuntimeError(
        f"All Gemini candidate models ({', '.join(candidates)}) failed. Last error: {last_error}"
    )

def generate_structured_json(
    prompt: str,
    schema: Type[BaseModel],
    system_instruction: Optional[str] = None,
) -> dict:
    raw_text = generate_gemini_content(
        contents=prompt,
        schema=schema,
        system_instruction=system_instruction,
    )
    try:
        return json.loads(raw_text)
    except Exception as parse_err:
        logger.error(f"Failed to parse structured JSON from Gemini: {parse_err}. Text: {raw_text[:200]}")
        raise ValueError(f"Invalid JSON returned by Gemini: {parse_err}") from None
