import json
import logging
import os
import random
import time
from typing import Any, List, Optional, Type
from google import genai
from google.genai import types
from pydantic import BaseModel

logger = logging.getLogger("maatu.gemini")

# Cache the currently responsive model name to avoid repeated timeouts
_active_working_model: Optional[str] = None
_last_model_check: float = 0.0
_unavailable_models: set = set()

def get_gemini_client(timeout_ms: Optional[int] = None) -> genai.Client:
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key or api_key.startswith("your_") or api_key == "PASTE_YOUR_KEY_HERE":
        raise ValueError("Valid GEMINI_API_KEY is not configured in backend/.env")
    
    if timeout_ms is None:
        timeout_ms = int(os.getenv("GEMINI_TIMEOUT_MS", "35000"))
        
    return genai.Client(
        api_key=api_key,
        http_options=types.HttpOptions(timeout=timeout_ms),
    )

def get_candidate_models(for_vision: bool = False) -> List[str]:
    global _active_working_model, _last_model_check
    configured = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip()
    
    candidates = []
    now = time.time()
    if _active_working_model and (_active_working_model not in _unavailable_models) and (now - _last_model_check < 600):
        candidates.append(_active_working_model)
    
    if configured not in candidates and configured not in _unavailable_models:
        candidates.append(configured)
    
    # Verified fallback models that reliably support multimodal/text inference
    standard_fallbacks = (
        ["gemini-2.5-flash", "gemini-3.5-flash", "gemini-flash-latest", "gemini-3.8-flash"]
        if for_vision
        else ["gemini-2.5-flash", "gemini-3.5-flash", "gemini-flash-latest", "gemini-3.8-flash", "gemini-3.1-flash-lite"]
    )
    
    for fallback in standard_fallbacks:
        if fallback not in candidates and fallback not in _unavailable_models:
            candidates.append(fallback)
            
    return candidates or [configured]

def is_transient_error(exc: Exception) -> bool:
    err = str(exc).lower()
    return any(term in err for term in [
        "504", "deadline_exceeded", "timed out", "timeout",
        "503", "unavailable", "high-load", "resource_exhausted", "429"
    ])

def generate_gemini_content(
    contents: Any,
    schema: Optional[Type[BaseModel]] = None,
    system_instruction: Optional[str] = None,
    timeout_ms: Optional[int] = None,
    max_retries_per_model: int = 1,
) -> str:
    """
    Executes content generation using the official google-genai SDK.
    Resiliently iterates through candidate models, applies exponential backoff,
    and recovers from high-load 503 / 504 spikes.
    """
    global _active_working_model, _last_model_check, _unavailable_models
    client = get_gemini_client(timeout_ms=timeout_ms)
    candidates = get_candidate_models()
    last_error: Optional[Exception] = None

    for model_name in candidates:
        for attempt in range(max_retries_per_model + 1):
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
                last_error = exc
                err_str = str(exc)
                logger.warning(f"Gemini call with {model_name} (attempt {attempt+1}) failed: {err_str[:120]}")

                # If model not found or permission denied, mark model unavailable and don't retry it
                if "404" in err_str or "not found" in err_str.lower():
                    _unavailable_models.add(model_name)
                    break
                if "401" in err_str or "403" in err_str or "api_key" in err_str.lower():
                    raise exc

                # If transient error and retries remain, back off with jitter
                if attempt < max_retries_per_model and is_transient_error(exc):
                    sleep_time = (0.5 * (2 ** attempt)) + random.uniform(0.1, 0.4)
                    time.sleep(sleep_time)
                else:
                    break

    raise RuntimeError(
        f"All Gemini candidate models ({', '.join(candidates)}) failed. Last error: {last_error}"
    )

def generate_structured_json(
    prompt: str,
    schema: Type[BaseModel],
    system_instruction: Optional[str] = None,
    timeout_ms: Optional[int] = None,
) -> dict:
    raw_text = generate_gemini_content(
        contents=prompt,
        schema=schema,
        system_instruction=system_instruction,
        timeout_ms=timeout_ms,
    )
    try:
        return json.loads(raw_text)
    except Exception as parse_err:
        logger.error(f"Failed to parse structured JSON from Gemini: {parse_err}. Text: {raw_text[:200]}")
        raise ValueError(f"Invalid JSON returned by Gemini: {parse_err}") from None
