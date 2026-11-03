import base64
import json
import logging
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

# Ensure backend directory is in sys.path regardless of execution directory (e.g. Render, Docker, local)
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import urllib.parse
import urllib.request
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field

# Load backend/.env
load_dotenv(Path(__file__).resolve().parent / ".env")

# Import modular services
from services.auth_service import (
    get_current_user_optional,
    get_current_user_required,
    get_supabase_client,
)
from services.conversation_service import (
    generate_session_summary,
    process_conversation_message,
    start_or_get_session,
)
from services.gemini_service import (
    generate_gemini_content,
    generate_structured_json,
    get_candidate_models,
)
from services.intelligence_service import (
    generate_adaptive_lesson,
    get_learner_skills_profile,
    get_personal_mistakes,
    record_learner_mistake,
)
from services.mission_service import (
    REAL_WORLD_MISSIONS,
    evaluate_completed_mission,
    get_mission_by_id,
    process_mission_turn,
)
from services.phrasebook_service import (
    breakdown_kannada_sentence,
    get_saved_phrases,
    save_phrase_to_user_book,
    translate_to_natural_kannada,
)
from services.pronunciation_service import (
    PRACTICE_SENTENCES,
    assess_pronunciation_attempt,
)
from services.regional_service import (
    get_regional_comparisons,
    get_regional_dialects,
)
from services.vision_service import identify_object_from_image

logger = logging.getLogger("maatu.api")

app = FastAPI(
    title="Voice of Kannada API (MAATHU — ಮಾತು)",
    description="Full-stack AI Kannada learning & real-world communication platform backend",
    version="3.0.0",
)

# CORS configuration: dynamically reads FRONTEND_URL and CORS_ORIGINS from environment
default_cors_origins = [
    "https://voice-of-kannada-lime.vercel.app",
    "https://voice-of-kannada.vercel.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

configured_origins = set(default_cors_origins)
env_frontend_url = os.getenv("FRONTEND_URL", "").strip()
env_cors_origins = os.getenv("CORS_ORIGINS", "").strip()

if env_frontend_url:
    for u in env_frontend_url.split(","):
        cleaned = u.strip().rstrip("/")
        if cleaned:
            configured_origins.add(cleaned)

if env_cors_origins:
    for u in env_cors_origins.split(","):
        cleaned = u.strip().rstrip("/")
        if cleaned:
            configured_origins.add(cleaned)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(configured_origins),
    allow_origin_regex=r"https:\/\/.*\.vercel\.app",  # Matches any Vercel production or preview deployment
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# ====================================================================
# CANONICAL KANNADA CONVERSATION SCENARIOS (BACKWARD COMPATIBLE)
# ====================================================================

SCENARIOS = {
    "daily": {
        "title": "Everyday conversation",
        "description": "Greetings, introductions, and everyday expressions.",
        "kannada": "ದೈನಂದಿನ ಸಂಭಾಷಣೆ",
        "greeting": "ನಮಸ್ಕಾರ! ನೀವು ಹೇಗಿದ್ದೀರಿ?",
        "meaning": "Hello! How are you?",
    },
    "travel": {
        "title": "Explore Karnataka",
        "description": "Directions, transport, and travel situations.",
        "kannada": "ಕರ್ನಾಟಕ ಪ್ರವಾಸ",
        "greeting": "ಬಸ್ ನಿಲ್ದಾಣ ಎಲ್ಲಿದೆ?",
        "meaning": "Where is the bus stop?",
    },
    "food": {
        "title": "Order something delicious",
        "description": "Restaurants, food orders, and drinks.",
        "kannada": "ಊಟ ಆರ್ಡರ್ ಮಾಡುವುದು",
        "greeting": "ಒಂದು ದೋಸೆ ಮತ್ತು ಫಿಲ್ಟರ್ ಕಾಫಿ ಕೊಡಿ.",
        "meaning": "One dosa and a filter coffee, please.",
    },
    "shopping": {
        "title": "At the local market",
        "description": "Prices, bargaining, and shopping.",
        "kannada": "ಸ್ಥಳೀಯ ಮಾರುಕಟ್ಟೆ",
        "greeting": "ಇದರ ಬೆಲೆ ಎಷ್ಟು? ಸ್ವಲ್ಪ ಕಮ್ಮಿ ಮಾಡಿ.",
        "meaning": "How much is this? Please reduce a bit.",
    },
    "college": {
        "title": "College & student life",
        "description": "Talking with classmates, professors, and library visits.",
        "kannada": "ಕಾಲೇಜು ಮತ್ತು ಕ್ಯಾಂಪಸ್",
        "greeting": "ನಾಳೆ ಕ್ಲಾಸ್ ಇದೆಯಾ? ನೋಟ್ಸ್ ಸಿಗುತ್ತಾ?",
        "meaning": "Is there class tomorrow? Can I get notes?",
    },
    "auto": {
        "title": "Auto-rickshaw ride",
        "description": "Hailing an auto, meter ride, and destination landmarks.",
        "kannada": "ಆಟೋ ಪ್ರಯಾಣ",
        "greeting": "ಮೆಜೆಸ್ಟಿಕ್‌ಗೆ ಹೋಗ್ತೀರಾ? ಮೀಟರ್ ಹಾಕಿ.",
        "meaning": "Will you go to Majestic? Please put the meter.",
    },
    "directions": {
        "title": "Asking for directions",
        "description": "Finding metro stations, streets, and navigating Bengaluru.",
        "kannada": "ದಾರಿ ಕೇಳುವುದು",
        "greeting": "ಹತ್ತಿರದ ಮೆಟ್ರೋ ಸ್ಟೇಷನ್ ಎಲ್ಲಿದೆ?",
        "meaning": "Where is the nearest metro station?",
    },
    "office": {
        "title": "Workplace conversation",
        "description": "Casual office greetings, lunch invites, and team talk.",
        "kannada": "ಕಚೇರಿ ಮತ್ತು ಸಹೋದ್ಯೋಗಿಗಳು",
        "greeting": "ಊಟಕ್ಕೆ ಹೋಗೋಣ್ವಾ? ಇವತ್ತು ಮೀಟಿಂಗ್ ಇದೆ.",
        "meaning": "Shall we go for lunch? Today there is a meeting.",
    },
}

# ====================================================================
# SCHEMAS
# ====================================================================

class PracticeRequest(BaseModel):
    scenario_id: str = "daily"
    recognized_text: str = Field(min_length=1, max_length=1000)

class LessonProgressRequest(BaseModel):
    lesson_id: str
    score_percent: int = 100
    xp_reward: int = 20
    points_reward: int = 5

class RedeemRewardRequest(BaseModel):
    reward_id: str
    shipping_name: str = Field(min_length=2, max_length=100)
    shipping_contact: str = Field(min_length=6, max_length=50)
    shipping_city: str = Field(min_length=2, max_length=50)
    notes: Optional[str] = None

class ConversationMessageRequest(BaseModel):
    session_id: str
    message: str = Field(min_length=1, max_length=1000)
    situation_id: str = "daily"
    learning_mode: str = "beginner"

class ConversationSummaryRequest(BaseModel):
    session_id: str

class PronunciationAssessmentRequest(BaseModel):
    target_kannada: str
    target_transliteration: str
    target_english: str
    recognized_transcript: str

class MissionTurnRequest(BaseModel):
    mission_id: str
    user_message: str
    history: List[Dict[str, str]] = []

class MissionEvaluateRequest(BaseModel):
    mission_id: str
    full_transcript: List[Dict[str, str]]

class CameraIdentifyJsonRequest(BaseModel):
    image_base64: str
    mime_type: str = "image/jpeg"

class AdaptiveExerciseRequest(BaseModel):
    weakness_topic: str
    user_level: str = "Beginner"

class MistakeRecordRequest(BaseModel):
    category: str
    original_expression: str
    suggested_correction: str
    explanation: str

class NaturalTranslationRequest(BaseModel):
    english_text: str

class SentenceBreakdownRequest(BaseModel):
    kannada_sentence: str

class SavePhraseRequest(BaseModel):
    kannada_text: str
    transliteration: str
    english_meaning: str
    category: str = "Everyday"
    formality_level: str = "polite"
    source: str = "manual"

# ====================================================================
# CORE SYSTEM & HEALTH ENDPOINTS
# ====================================================================

@app.get("/api/health")
def health_check():
    ai_configured = bool(os.getenv("GEMINI_API_KEY", "").strip())
    supabase_configured = bool(get_supabase_client())
    active_models = get_candidate_models()

    return {
        "status": "ok",
        "app_name": "MAATHU — Voice of Kannada",
        "version": "3.0.0",
        "ai_configured": ai_configured,
        "supabase_configured": supabase_configured,
        "models": active_models,
    }

@app.get("/api/scenarios")
def get_scenarios():
    return [
        {
            "id": scenario_id,
            "title": scenario["title"],
            "kannada": scenario["kannada"],
            "description": scenario["description"],
            "greeting": scenario["greeting"],
            "meaning": scenario["meaning"],
        }
        for scenario_id, scenario in SCENARIOS.items()
    ]

# ====================================================================
# AUTHENTICATED USER PROGRESS & PROFILE
# ====================================================================

@app.get("/api/user/profile")
def get_user_profile(current_user: Dict[str, Any] = Depends(get_current_user_required)):
    client = get_supabase_client()
    if not client:
        raise HTTPException(status_code=503, detail="Supabase not configured")

    try:
        res = client.table("profiles").select("*").eq("id", current_user["id"]).single().execute()
        return res.data or {}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch profile: {e}")

@app.get("/api/user/progress")
def get_user_progress(current_user: Dict[str, Any] = Depends(get_current_user_required)):
    client = get_supabase_client()
    if not client:
        return {"completed_lessons": []}

    try:
        res = (
            client.table("user_lesson_progress")
            .select("lesson_id, is_completed, completed_at")
            .eq("user_id", current_user["id"])
            .eq("is_completed", True)
            .execute()
        )
        completed = [row["lesson_id"] for row in (res.data or [])]
        return {"completed_lessons": completed}
    except Exception as e:
        logger.error(f"Error fetching user progress: {e}")
        return {"completed_lessons": []}

@app.post("/api/progress/lesson")
def record_lesson_progress(
    request: LessonProgressRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_required),
):
    """
    Saves completed lesson progress and awards XP/points with idempotency protection.
    """
    client = get_supabase_client()
    if not client:
        raise HTTPException(status_code=503, detail="Supabase is not configured.")

    user_id = current_user["id"]
    idempotency_key = f"lesson:{user_id}:{request.lesson_id}"

    try:
        # Check if already completed
        existing = (
            client.table("user_lesson_progress")
            .select("is_completed")
            .eq("user_id", user_id)
            .eq("lesson_id", request.lesson_id)
            .execute()
        )
        is_already_completed = (
            existing.data and len(existing.data) > 0 and existing.data[0].get("is_completed")
        )

        # Upsert lesson progress
        client.table("user_lesson_progress").upsert({
            "user_id": user_id,
            "lesson_id": request.lesson_id,
            "is_completed": True,
            "score_percent": request.score_percent,
            "completed_at": "now()",
        }).execute()

        awarded_xp = 0
        awarded_points = 0

        if not is_already_completed:
            awarded_xp = request.xp_reward
            awarded_points = request.points_reward

            # Record transactions
            client.table("point_transactions").insert([
                {
                    "user_id": user_id,
                    "currency_type": "XP",
                    "amount": awarded_xp,
                    "reason": f"Completed lesson: {request.lesson_id}",
                    "reference_id": f"lesson:{request.lesson_id}",
                    "idempotency_key": f"{idempotency_key}:xp",
                },
                {
                    "user_id": user_id,
                    "currency_type": "MAATU_POINTS",
                    "amount": awarded_points,
                    "reason": f"Completed lesson: {request.lesson_id}",
                    "reference_id": f"lesson:{request.lesson_id}",
                    "idempotency_key": f"{idempotency_key}:pts",
                },
            ]).execute()

            # Update profile balance
            profile_res = client.table("profiles").select("xp_balance, points_balance, current_streak").eq("id", user_id).single().execute()
            if profile_res.data:
                curr_xp = profile_res.data.get("xp_balance", 0)
                curr_pts = profile_res.data.get("points_balance", 0)
                curr_streak = profile_res.data.get("current_streak", 0)
                client.table("profiles").update({
                    "xp_balance": curr_xp + awarded_xp,
                    "points_balance": curr_pts + awarded_points,
                    "current_streak": max(1, curr_streak),
                    "last_activity_date": "now()",
                    "updated_at": "now()",
                }).eq("id", user_id).execute()

        return {
            "success": True,
            "first_time": not is_already_completed,
            "xp_awarded": awarded_xp,
            "points_awarded": awarded_points,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to record lesson progress: {str(exc)}") from None

# ====================================================================
# FEATURE 01 — AI REAL-TIME KANNADA CONVERSATION (MAATHU COMPANION)
# ====================================================================

@app.post("/api/conversation/message")
def handle_conversation_message(
    request: ConversationMessageRequest,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
):
    """
    Main conversational exchange with MAATHU AI Kannada Friend.
    Handles Kannada, mixed speech (Kanglish), modes, corrections, and suggested replies.
    """
    user_id = current_user["id"] if current_user else None
    try:
        reply_data = process_conversation_message(
            session_id=request.session_id,
            user_message=request.message,
            situation_id=request.situation_id,
            learning_mode=request.learning_mode,
            user_id=user_id,
        )
        return {
            "status": "ok",
            "authenticated": bool(current_user),
            **reply_data,
        }
    except Exception as exc:
        logger.error(f"Conversation error: {exc}")
        raise HTTPException(
            status_code=502,
            detail=f"Could not generate conversational response: {str(exc)}",
        )

@app.post("/api/conversation/summary")
def handle_conversation_summary(
    request: ConversationSummaryRequest,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
):
    user_id = current_user["id"] if current_user else None
    try:
        summary = generate_session_summary(request.session_id, user_id=user_id)
        return {"status": "ok", "summary": summary}
    except Exception as exc:
        logger.error(f"Summary error: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))

# Legacy backward-compatible endpoint for existing SpeakingStudio
@app.post("/api/practice")
def practice_conversation(
    request: PracticeRequest,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
):
    user_id = current_user["id"] if current_user else None
    try:
        reply_data = process_conversation_message(
            session_id=f"legacy-{user_id or 'guest'}-{request.scenario_id}",
            user_message=request.recognized_text,
            situation_id=request.scenario_id,
            learning_mode="beginner",
            user_id=user_id,
        )
        return {
            "status": "ok",
            "recognized_text": request.recognized_text,
            "reply_kannada": reply_data["reply_kannada"],
            "reply_english": reply_data["reply_english"],
            "authenticated": bool(current_user),
        }
    except Exception as exc:
        logger.error(f"Practice error: {exc}")
        raise HTTPException(status_code=502, detail=str(exc))

# --------------------------------------------------------------------
# NATIVE SPEECH AUDIO SERVICE (TTS STREAMING & GEMINI TRANSCRIPTION)
# --------------------------------------------------------------------
_tts_cache: Dict[str, bytes] = {}

@app.get("/api/tts")
def stream_kannada_tts(text: str, lang: str = "kn"):
    """
    Streams natural native Kannada audio directly to the browser.
    Eliminates reliance on Windows/OS offline voice packs and ensures 100% reliable voice output.
    """
    clean_text = text.strip()
    if not clean_text:
        raise HTTPException(status_code=400, detail="Missing text for speech synthesis.")

    # Limit to reasonable length
    snippet = clean_text[:280]
    cache_key = f"{lang}:{snippet}"
    if cache_key in _tts_cache:
        return Response(
            content=_tts_cache[cache_key],
            media_type="audio/mpeg",
            headers={
                "Cache-Control": "public, max-age=86400",
                "Content-Disposition": "inline; filename=kannada_speech.mp3",
            },
        )

    encoded_text = urllib.parse.quote(snippet)
    tts_url = f"https://translate.google.com/translate_tts?ie=UTF-8&tl={lang}&client=tw-ob&q={encoded_text}"

    try:
        req = urllib.request.Request(
            tts_url,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/124.0.0.0 Safari/537.36"
                ),
                "Referer": "https://translate.google.com/",
            },
        )
        with urllib.request.urlopen(req, timeout=6) as response:
            audio_bytes = response.read()
            if len(_tts_cache) < 200:
                _tts_cache[cache_key] = audio_bytes
            return Response(
                content=audio_bytes,
                media_type="audio/mpeg",
                headers={
                    "Cache-Control": "public, max-age=86400",
                    "Content-Disposition": "inline; filename=kannada_speech.mp3",
                },
            )
    except Exception as exc:
        logger.warning(f"Native TTS streaming error: {exc}")
        raise HTTPException(status_code=502, detail="TTS synthesis service temporarily unavailable.")

@app.post("/api/transcribe")
async def transcribe_audio_stream(
    audio_file: UploadFile = File(...),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
):
    """
    Transcribes audio recording directly using Google Gemini multimodal capabilities.
    Serves as a reliable fallback when Web Speech API encounters network connection errors.
    """
    try:
        audio_bytes = await audio_file.read()
        if not audio_bytes:
            raise HTTPException(status_code=400, detail="Uploaded audio recording is empty.")

        mime_type = audio_file.content_type or "audio/webm"
        if "octet-stream" in mime_type:
            mime_type = "audio/webm"

        from google.genai import types
        from services.gemini_service import get_gemini_client, get_candidate_models

        client = get_gemini_client()
        candidates = get_candidate_models()
        last_error = None

        prompt = (
            "Listen to this audio recording of a user speaking Kannada (or mixed Kannada-English/Kanglish). "
            "Transcribe exactly what was spoken into standard Kannada script (ಕನ್ನಡ ಲಿಪಿ). "
            "If spoken in English or Kanglish, also provide the Kannada translation. "
            "Return JSON matching schema: {\"transcript\": \"ಕನ್ನಡ ಲಿಪಿ\", \"english_meaning\": \"English meaning\"}"
        )

        for model_name in candidates:
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=[
                        types.Part.from_bytes(data=audio_bytes, mime_type=mime_type),
                        prompt,
                    ],
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                    ),
                )
                if response and response.text:
                    parsed = json.loads(response.text)
                    transcript = parsed.get("transcript", "").strip()
                    english = parsed.get("english_meaning", "").strip()
                    return {
                        "status": "ok",
                        "transcript": transcript,
                        "transcript_kannada": transcript,
                        "transcript_english": english,
                    }
            except Exception as exc:
                last_error = exc
                continue

        raise HTTPException(
            status_code=502,
            detail=f"Speech transcription model error: {last_error}",
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Speech transcription failed: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))

# ====================================================================
# FEATURE 02 — PRONUNCIATION INTELLIGENCE
# ====================================================================

@app.get("/api/pronunciation/sentences")
def get_pronunciation_sentences():
    return PRACTICE_SENTENCES

@app.post("/api/pronunciation/assess")
def assess_pronunciation(
    request: PronunciationAssessmentRequest,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
):
    user_id = current_user["id"] if current_user else None
    try:
        result = assess_pronunciation_attempt(
            target_kannada=request.target_kannada,
            target_transliteration=request.target_transliteration,
            target_english=request.target_english,
            recognized_transcript=request.recognized_transcript,
            user_id=user_id,
        )
        return {"status": "ok", **result}
    except Exception as exc:
        logger.error(f"Pronunciation assessment error: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))

# ====================================================================
# FEATURE 03 — AI REAL-WORLD ROLEPLAY (MISSIONS)
# ====================================================================

@app.get("/api/missions")
def list_missions():
    return REAL_WORLD_MISSIONS

@app.post("/api/missions/turn")
def mission_roleplay_turn(request: MissionTurnRequest):
    try:
        res = process_mission_turn(
            mission_id=request.mission_id,
            dialogue_history=request.history,
            user_message=request.user_message,
        )
        return {"status": "ok", **res}
    except Exception as exc:
        logger.error(f"Mission turn error: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))

@app.post("/api/missions/evaluate")
def evaluate_mission(
    request: MissionEvaluateRequest,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
):
    user_id = current_user["id"] if current_user else None
    try:
        eval_result = evaluate_completed_mission(
            mission_id=request.mission_id,
            full_transcript=request.full_transcript,
            user_id=user_id,
        )
        return {"status": "ok", **eval_result}
    except Exception as exc:
        logger.error(f"Mission evaluation error: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))

# ====================================================================
# FEATURE 04 — CAMERA-BASED KANNADA LEARNING
# ====================================================================

@app.post("/api/camera/identify")
async def identify_camera_capture(
    image: Optional[UploadFile] = File(None),
    image_base64: Optional[str] = Form(None),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
):
    user_id = current_user["id"] if current_user else None

    # Handle either multipart upload or form base64
    image_bytes: bytes = b""
    mime_type: str = "image/jpeg"

    if image is not None:
        image_bytes = await image.read()
        mime_type = image.content_type or "image/jpeg"
    elif image_base64:
        clean_b64 = image_base64
        if "base64," in clean_b64:
            parts = clean_b64.split("base64,")
            header = parts[0]
            clean_b64 = parts[1]
            if "image/" in header:
                mime_type = header.split("image/")[1].split(";")[0]
                mime_type = f"image/{mime_type}"
        image_bytes = base64.b64decode(clean_b64)
    else:
        raise HTTPException(status_code=400, detail="No image file or image_base64 provided.")

    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty image data.")

    try:
        result = identify_object_from_image(image_bytes, mime_type=mime_type, user_id=user_id)
        return {"status": "ok", **result}
    except TimeoutError as timeout_err:
        logger.warning(f"Camera identification timed out: {timeout_err}")
        raise HTTPException(
            status_code=504,
            detail="MAATHU is taking longer than expected to identify this object. Please try again.",
        )
    except ValueError as val_err:
        logger.warning(f"Invalid camera identification request: {val_err}")
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as exc:
        logger.error(f"Camera identification error: {exc}")
        raise HTTPException(status_code=500, detail=f"Vision identification error: {str(exc)}")

@app.post("/api/camera/identify-json")
def identify_camera_capture_json(
    request: CameraIdentifyJsonRequest,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
):
    user_id = current_user["id"] if current_user else None
    clean_b64 = request.image_base64
    mime_type = request.mime_type

    if not clean_b64 or not clean_b64.strip():
        raise HTTPException(status_code=400, detail="Empty or missing image base64 data.")

    if "base64," in clean_b64:
        parts = clean_b64.split("base64,")
        header = parts[0]
        clean_b64 = parts[1]
        if "image/" in header:
            mime_type = f"image/{header.split('image/')[1].split(';')[0]}"

    try:
        image_bytes = base64.b64decode(clean_b64)
    except Exception as b64_err:
        raise HTTPException(status_code=400, detail=f"Invalid base64 image encoding: {b64_err}")

    try:
        result = identify_object_from_image(image_bytes, mime_type=mime_type, user_id=user_id)
        return {"status": "ok", **result}
    except TimeoutError as timeout_err:
        logger.warning(f"Camera JSON identification timed out: {timeout_err}")
        raise HTTPException(
            status_code=504,
            detail="MAATHU is taking longer than expected to identify this object. Please try again.",
        )
    except ValueError as val_err:
        logger.warning(f"Invalid camera JSON identification request: {val_err}")
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as exc:
        logger.error(f"Camera JSON identification error: {exc}")
        raise HTTPException(status_code=500, detail=f"Vision identification error: {str(exc)}")

# ====================================================================
# FEATURE 05 — PERSONALIZED AI TUTOR & MISTAKE LIBRARY
# ====================================================================

@app.get("/api/tutor/skills")
def get_skills_profile(current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)):
    user_id = current_user["id"] if current_user else None
    return get_learner_skills_profile(user_id)

@app.get("/api/tutor/mistakes")
def list_mistakes(current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)):
    user_id = current_user["id"] if current_user else None
    return get_personal_mistakes(user_id)

@app.post("/api/tutor/mistake/record")
def record_mistake(
    request: MistakeRecordRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_required),
):
    record_learner_mistake(
        user_id=current_user["id"],
        category=request.category,
        original_expression=request.original_expression,
        suggested_correction=request.suggested_correction,
        explanation=request.explanation,
    )
    return {"status": "ok"}

@app.post("/api/tutor/exercise")
def get_adaptive_exercise(request: AdaptiveExerciseRequest):
    try:
        ex = generate_adaptive_lesson(request.weakness_topic, request.user_level)
        return {"status": "ok", **ex}
    except Exception as exc:
        logger.error(f"Adaptive exercise error: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))

@app.get("/api/fluency/scorecard")
def get_fluency_scorecard(current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)):
    user_id = current_user["id"] if current_user else None
    skills_profile = get_learner_skills_profile(user_id)
    return {
        "status": "ok",
        "scorecard": skills_profile,
    }

# ====================================================================
# FEATURE 06 — REGIONAL KANNADA EXPLORER
# ====================================================================

@app.get("/api/regional/dialects")
def list_regional_dialects():
    return get_regional_dialects()

@app.get("/api/regional/comparisons")
def list_regional_comparisons():
    return get_regional_comparisons()

# ====================================================================
# SUPPORTING FEATURES: TRANSLATOR, SENTENCE INTEL, PHRASEBOOK
# ====================================================================

@app.post("/api/translator")
def natural_translation(request: NaturalTranslationRequest):
    try:
        res = translate_to_natural_kannada(request.english_text)
        return {"status": "ok", **res}
    except Exception as exc:
        logger.error(f"Translator error: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))

@app.post("/api/sentence/breakdown")
def sentence_breakdown(request: SentenceBreakdownRequest):
    try:
        res = breakdown_kannada_sentence(request.kannada_sentence)
        return {"status": "ok", **res}
    except Exception as exc:
        logger.error(f"Breakdown error: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))

@app.get("/api/phrasebook")
def list_saved_phrases(current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)):
    user_id = current_user["id"] if current_user else None
    return get_saved_phrases(user_id)

@app.post("/api/phrasebook")
def save_phrase(
    request: SavePhraseRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_required),
):
    res = save_phrase_to_user_book(
        user_id=current_user["id"],
        kannada_text=request.kannada_text,
        transliteration=request.transliteration,
        english_meaning=request.english_meaning,
        category=request.category,
        formality_level=request.formality_level,
        source=request.source,
    )
    return res

# ====================================================================
# EXISTING GAMIFICATION, CERTIFICATES & STORE REDEMPTION
# ====================================================================

@app.get("/api/verify-certificate/{cert_id}")
def verify_certificate(cert_id: str):
    clean_id = cert_id.strip().upper()
    client = get_supabase_client()

    if client:
        try:
            res = (
                client.table("certificates")
                .select("*")
                .eq("id", clean_id)
                .eq("is_revoked", False)
                .execute()
            )
            if res.data and len(res.data) > 0:
                cert = res.data[0]
                return {
                    "found": True,
                    "certificate": {
                        "id": cert["id"],
                        "course_title": cert["course_title"],
                        "course_title_kannada": cert["course_title_kannada"],
                        "learner_name": cert["learner_name"],
                        "issued_date": str(cert["issued_at"])[:10],
                        "status": "Verified & Active",
                        "issuer": "ಮಾತು — Voice of Kannada Academy",
                        "score_percent": cert.get("score_percent", 100),
                        "criteria_met": cert.get("requirements_met", []),
                    },
                }
        except Exception as e:
            logger.error(f"Supabase certificate lookup error: {e}")

    raise HTTPException(
        status_code=404,
        detail=f"Certificate ID '{cert_id}' was not found in the Maatu registry.",
    )

@app.get("/api/leaderboard")
def get_leaderboard():
    client = get_supabase_client()
    if client:
        try:
            res = (
                client.table("profiles")
                .select("display_name, xp_balance, kannada_level, current_streak, avatar_url")
                .eq("is_public_leaderboard", True)
                .order("xp_balance", desc=True)
                .limit(25)
                .execute()
            )
            if res.data and len(res.data) > 0:
                leaders = []
                for idx, p in enumerate(res.data, start=1):
                    name = p.get("display_name") or "ಕನ್ನಡ ಕಲಿ"
                    leaders.append({
                        "rank": idx,
                        "display_name": name,
                        "xp": p.get("xp_balance", 0),
                        "level": p.get("kannada_level", "Beginner"),
                        "streak": p.get("current_streak", 0),
                        "avatar_char": name[0].upper() if name else "ಅ",
                    })
                return {"weekly": leaders, "all_time": leaders}
        except Exception as e:
            logger.error(f"Leaderboard query error: {e}")

    return {"weekly": [], "all_time": []}

@app.get("/api/rewards")
def get_rewards_catalog():
    client = get_supabase_client()
    if client:
        try:
            res = (
                client.table("rewards_catalog")
                .select("*")
                .eq("in_stock", True)
                .execute()
            )
            if res.data and len(res.data) > 0:
                return res.data
        except Exception as e:
            logger.error(f"Rewards catalog fetch failed: {e}")

    return [
        {
            "id": "stickers-pack",
            "title": "Kannada Pride Die-Cut Stickers",
            "title_kannada": "ಕನ್ನಡ ಹೆಮ್ಮೆಯ ಸ್ಟಿಕ್ಕರ್‌ಗಳು",
            "category": "stationery",
            "points_required": 100,
            "badge_label": "Popular",
            "description": "5 premium matte vinyl stickers featuring iconic phrases like 'ಸ್ವಲ್ಪ ಅಡ್ಜಸ್ಟ್ ಮಾಡಿ'.",
            "in_stock": True,
        },
        {
            "id": "wooden-bookmark",
            "title": "Handcrafted Wooden Bookmark",
            "title_kannada": "ಮರದ ಪುಸ್ತಕ ಗುರುತು",
            "category": "stationery",
            "points_required": 150,
            "badge_label": "Artisanal",
            "description": "Carved Channapatna style wooden bookmark with Kannada typography and tassel.",
            "in_stock": True,
        },
        {
            "id": "hardcover-notebook",
            "title": "Maatu Kannada Learning Journal",
            "title_kannada": "ಕನ್ನಡ ಕಲಿಯುವ ನೋಟ್‌ಬುಕ್",
            "category": "stationery",
            "points_required": 300,
            "badge_label": "Top Choice",
            "description": "160-page premium ruled notebook with daily Kannada phrase prompts and culture notes.",
            "in_stock": True,
        },
        {
            "id": "steel-bottle",
            "title": "Insulated Steel Flask (750ml)",
            "title_kannada": "ಸ್ಟೀಲ್ ನೀರಿನ ಬಾಟಲಿ",
            "category": "lifestyle",
            "points_required": 600,
            "badge_label": "Eco-Friendly",
            "description": "Matte green stainless steel bottle laser-engraved with 'ನಮ್ಮ ಕರ್ನಾಟಕ' and Maatu emblem.",
            "in_stock": True,
        },
        {
            "id": "quote-tshirt",
            "title": "'ಸ್ವಲ್ಪ ಅಡ್ಜಸ್ಟ್ ಮಾಡಿ' Cotton T-Shirt",
            "title_kannada": "ಕನ್ನಡ ಟೀ-ಶರ್ಟ್",
            "category": "apparel",
            "points_required": 900,
            "badge_label": "Bestseller",
            "description": "100% bio-washed combed cotton t-shirt in forest green with classic Bengaluru culture script.",
            "in_stock": True,
        },
        {
            "id": "hoodie-heritage",
            "title": "Voice of Kannada Heavyweight Hoodie",
            "title_kannada": "ಪ್ರೀಮಿಯಂ ಹುಡ್ಡಿ",
            "category": "apparel",
            "points_required": 1500,
            "badge_label": "Exclusive",
            "description": "350 GSM fleece hoodie with embroidered golden 'ಮಾತು' crest on chest and Kannada typography.",
            "in_stock": True,
        },
    ]

@app.post("/api/redeem")
def redeem_reward(
    request: RedeemRewardRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_required),
):
    client = get_supabase_client()
    if not client:
        raise HTTPException(status_code=503, detail="Supabase is not configured.")

    order_id = f"ORD-MAATU-{int(os.urandom(3).hex(), 16) % 9000 + 1000}"
    try:
        rpc_res = client.rpc(
            "redeem_reward_secure",
            {
                "p_reward_id": request.reward_id,
                "p_shipping_name": request.shipping_name.strip(),
                "p_shipping_contact": request.shipping_contact.strip(),
                "p_shipping_city": request.shipping_city.strip(),
                "p_order_id": order_id,
            },
        ).execute()
        if rpc_res.data:
            return rpc_res.data

        return {
            "success": True,
            "order_id": order_id,
            "status": "pending",
            "message": "Redemption request submitted successfully.",
        }
    except Exception as exc:
        err_msg = str(exc)
        if "Insufficient" in err_msg:
            raise HTTPException(status_code=400, detail=err_msg) from None
        raise HTTPException(status_code=500, detail=f"Redemption failed: {err_msg}") from None

@app.get("/api/challenges")
def get_daily_challenges():
    return [
        {
            "id": "chal-words-5",
            "title": "Learn 5 New Words",
            "title_kannada": "೫ ಹೊಸ ಪದಗಳನ್ನು ಕಲಿಯಿರಿ",
            "description": "Complete any vocabulary exercise or flashcard session.",
            "target": 5,
            "xp_reward": 30,
            "points_reward": 10,
            "estimated_time": "3 min",
            "difficulty": "Easy",
        },
        {
            "id": "chal-speak-1",
            "title": "Practice 1 Voice Conversation",
            "title_kannada": "೧ ಧ್ವನಿ ಸಂಭಾಷಣೆ ನಡೆಸಿ",
            "description": "Speak in any situation using the AI Speaking Studio or Companion.",
            "target": 1,
            "xp_reward": 25,
            "points_reward": 8,
            "estimated_time": "2 min",
            "difficulty": "Medium",
        },
        {
            "id": "chal-mission-1",
            "title": "Complete 1 Real-World Mission",
            "title_kannada": "೧ ನೈಜ ಸನ್ನಿವೇಶ ಸವಾಲು ಪೂರ್ಣಗೊಳಿಸಿ",
            "description": "Successfully complete an Auto, Canteen, or Market roleplay mission.",
            "target": 1,
            "xp_reward": 50,
            "points_reward": 15,
            "estimated_time": "4 min",
            "difficulty": "Medium",
        },
        {
            "id": "chal-quiz-1",
            "title": "Complete Daily Kannada Quiz",
            "title_kannada": "ದೈನಂದಿನ ಕನ್ನಡ ರಸಪ್ರಶ್ನೆ ಪೂರ್ಣಗೊಳಿಸಿ",
            "description": "Answer 5 multiple choice questions on everyday Kannada.",
            "target": 5,
            "xp_reward": 35,
            "points_reward": 12,
            "estimated_time": "4 min",
            "difficulty": "Medium",
        },
    ]
