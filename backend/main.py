import json
import os
from pathlib import Path
from typing import Optional, List, Dict, Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types
from pydantic import BaseModel, Field

# Load backend/.env regardless of the terminal's working directory.
load_dotenv(Path(__file__).resolve().parent / ".env")

app = FastAPI(
    title="Voice of Kannada API",
    description="AI-powered Kannada learning platform backend with Supabase Auth & Gemini",
    version="2.1.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ====================================================================
# SUPABASE CLIENT & AUTHENTICATION DEPENDENCY
# ====================================================================

def get_supabase_client():
    """
    Returns a configured Supabase client if environment variables are set.
    Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY.
    """
    url = os.getenv("SUPABASE_URL", "").strip()
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip() or os.getenv("SUPABASE_ANON_KEY", "").strip()

    if not url or not key or url.startswith("https://your-project") or key.startswith("your-"):
        return None

    try:
        from supabase import create_client
        return create_client(url, key)
    except Exception as e:
        print(f"Failed to create Supabase client: {e}")
        return None


def get_current_user_optional(authorization: Optional[str] = Header(None)) -> Optional[Dict[str, Any]]:
    """
    Validates the Supabase bearer token if provided.
    Returns user dict {id, email, metadata} or None if no token was passed.
    """
    if not authorization or not authorization.startswith("Bearer "):
        return None

    token = authorization.split("Bearer ", 1)[1].strip()
    if not token:
        return None

    client = get_supabase_client()
    if not client:
        return None

    try:
        user_res = client.auth.get_user(token)
        if user_res and user_res.user:
            return {
                "id": str(user_res.user.id),
                "email": user_res.user.email,
                "metadata": user_res.user.user_metadata or {},
            }
        return None
    except Exception as exc:
        print(f"Token validation error: {exc}")
        return None


def get_current_user_required(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """
    Strict dependency requiring a valid, active Supabase bearer token.
    Raises HTTP 401 Unauthorized if token is missing or invalid.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Please provide a valid Supabase bearer token.",
        )

    token = authorization.split("Bearer ", 1)[1].strip()
    client = get_supabase_client()

    if not client:
        raise HTTPException(
            status_code=503,
            detail="Supabase backend is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env.",
        )

    try:
        user_res = client.auth.get_user(token)
        if not user_res or not user_res.user:
            raise HTTPException(
                status_code=401,
                detail="Invalid or expired session. Please sign in again.",
            )
        return {
            "id": str(user_res.user.id),
            "email": user_res.user.email,
            "metadata": user_res.user.user_metadata or {},
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=401,
            detail=f"Authentication token verification failed: {str(exc)}",
        ) from None


# ====================================================================
# CANONICAL KANNADA CONVERSATION SCENARIOS
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


class GeminiReplyPayload(BaseModel):
    reply_kannada: str
    reply_english: str


# ====================================================================
# GEMINI CLIENT HELPER
# ====================================================================

def get_gemini_client():
    api_key = os.getenv("GEMINI_API_KEY", "").strip()

    if not api_key or api_key == "PASTE_YOUR_KEY_HERE":
        raise HTTPException(
            status_code=503,
            detail="Gemini is not configured. Add GEMINI_API_KEY to backend/.env.",
        )

    return genai.Client(api_key=api_key)


# ====================================================================
# HEALTH & METADATA ENDPOINTS
# ====================================================================

@app.get("/api/health")
def health_check():
    ai_configured = bool(os.getenv("GEMINI_API_KEY", "").strip())
    supabase_configured = bool(get_supabase_client())

    return {
        "status": "ok",
        "message": "Voice of Kannada backend is running",
        "ai_configured": ai_configured,
        "supabase_configured": supabase_configured,
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
# AI SPEAKING PRACTICE (GEMINI INTEGRATION)
# ====================================================================

@app.post("/api/practice")
def practice_conversation(
    request: PracticeRequest,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
):
    scenario = SCENARIOS.get(request.scenario_id)

    if scenario is None:
        raise HTTPException(
            status_code=400,
            detail="Unknown scenario. Please select a valid practice scenario.",
        )

    recognized_text = request.recognized_text.strip()

    if not recognized_text:
        raise HTTPException(
            status_code=400,
            detail="No speech text was received. Please try again.",
        )

    prompt = f"""
You are the friendly Kannada conversation coach in Voice of Kannada.

The learner is practising spoken Kannada in this situation:
{scenario["title"]} — {scenario["description"]}

The learner said:
{recognized_text}

Your tasks:
1. Understand the learner's message, whether it is Kannada written in Kannada
   script, English, or a mixture of the two.
2. Respond naturally to the actual meaning of the learner's message.
3. Continue the conversation by asking one relevant, simple follow-up question
   whenever appropriate.
4. If the learner introduces themselves, acknowledge their introduction.
   If they order food, respond as a restaurant worker. If they ask directions,
   help as a local guide. If they shop, respond as a shopkeeper.
5. Use natural, beginner-friendly Kannada. Avoid repeatedly giving the same
   greeting unless the learner actually greets you.
6. Give a concise, accurate English translation of your Kannada response.
7. If the learner makes a Kannada mistake, gently explain a useful correction
   in the English explanation without embarrassing them.
8. Never invent a fixed price, location, or factual detail when it is unknown.
9. Keep the response concise and suitable for a live conversation.

Return ONLY valid JSON with these keys:
{{
  "reply_kannada": "Your natural Kannada response",
  "reply_english": "English translation and, if useful, a brief correction"
}}
"""

    try:
        client = get_gemini_client()
        model_name = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")

        # Retry transient 503 spikes up to 2 times
        response = None
        for attempt in range(3):
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=GeminiReplyPayload,
                    ),
                )
                if response and response.text:
                    break
            except Exception as e:
                if "503" in str(e) and attempt < 2:
                    import time
                    time.sleep(1.5)
                    continue
                raise

        if not response or not response.text:
            raise ValueError("Gemini returned an empty response.")

        result = json.loads(response.text)
        reply_kannada = result.get("reply_kannada", "").strip()
        reply_english = result.get("reply_english", "").strip()

        if not reply_kannada or not reply_english:
            raise ValueError("Gemini returned an incomplete response.")

        # If user is authenticated and Supabase is configured, record practice session
        if current_user:
            sb = get_supabase_client()
            if sb:
                try:
                    sb.table("practice_sessions").insert({
                        "user_id": current_user["id"],
                        "scenario_id": request.scenario_id,
                        "recognized_speech": recognized_text,
                        "ai_reply_kannada": reply_kannada,
                        "ai_reply_english": reply_english,
                        "xp_awarded": 15,
                        "points_awarded": 3,
                    }).execute()
                except Exception as db_err:
                    print(f"Could not log practice session to Supabase: {db_err}")

        return {
            "status": "ok",
            "recognized_text": recognized_text,
            "reply_kannada": reply_kannada,
            "reply_english": reply_english,
            "authenticated": bool(current_user),
        }

    except HTTPException:
        raise
    except Exception as exc:
        print(f"Gemini practice request failed: {type(exc).__name__}: {exc}")
        raise HTTPException(
            status_code=502,
            detail=(
                "The AI conversation service could not generate a reply. "
                "Check the backend terminal, API key, model availability, "
                "and Gemini usage limits."
            ),
        ) from None


# ====================================================================
# AUTHENTIC CERTIFICATE VERIFICATION (REAL DATABASE QUERY)
# ====================================================================

@app.get("/api/verify-certificate/{cert_id}")
def verify_certificate(cert_id: str):
    """
    Verifies certificate ID against real persisted database records.
    Unknown, revoked, or unverified IDs return HTTP 404.
    """
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
            print(f"Supabase certificate lookup error: {e}")

    # No fake wildcard matching! Return 404 if not found in database.
    raise HTTPException(
        status_code=404,
        detail=f"Certificate ID '{cert_id}' was not found in the Maatu registry. Please verify the ID on your printed or digital document.",
    )


# ====================================================================
# GENUINE LEADERBOARD (REAL USERS ONLY)
# ====================================================================

@app.get("/api/leaderboard")
def get_leaderboard():
    """
    Returns public top learners querying genuine profiles from Supabase.
    If no users exist or Supabase is not configured, returns empty list (no fake users).
    """
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
            print(f"Leaderboard query error: {e}")

    # Return empty list rather than fake participants
    return {"weekly": [], "all_time": []}


# ====================================================================
# STORE CATALOG & PROTECTED REWARD REDEMPTION
# ====================================================================

@app.get("/api/rewards")
def get_rewards_catalog():
    """
    Returns the real catalog items. Fetches from Supabase rewards_catalog if present.
    """
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
            print(f"Rewards catalog fetch from Supabase failed: {e}")

    # Static catalog fallback
    return [
        {
            "id": "stickers-pack",
            "title": "Kannada Pride Die-Cut Stickers",
            "title_kannada": "ಕನ್ನಡ ಹೆಮ್ಮೆಯ ಸ್ಟಿಕ್ಕರ್‌ಗಳು",
            "category": "stationery",
            "points_required": 100,
            "badge_label": "Popular",
            "description": "5 premium matte vinyl stickers featuring iconic phrases like 'ಸ್ವಲ್ಪ ಅಡ್ಜಸ್ಟ್ ಮಾಡಿ' and 'ಕನ್ನಡವೇ ಸತ್ಯ'.",
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
            "description": "100% bio-washed combed cotton t-shirt in forest green with classic Bengaluru Bengaluru culture script.",
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
    """
    Atomic reward redemption. Validates real user balance, updates points,
    and creates order record.
    """
    client = get_supabase_client()
    if not client:
        raise HTTPException(
            status_code=503,
            detail="Supabase is not configured to process live redemptions.",
        )

    order_id = f"ORD-MAATU-{int(os.urandom(3).hex(), 16) % 9000 + 1000}"

    try:
        # Call secure atomic stored procedure
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


# ====================================================================
# PROTECTED LESSON PROGRESS (IDEMPOTENT XP & POINTS ATTRIBUTION)
# ====================================================================

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
        # 1. Check if lesson was already completed
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

        # 2. Upsert lesson progress
        client.table("user_lesson_progress").upsert({
            "user_id": user_id,
            "lesson_id": request.lesson_id,
            "is_completed": True,
            "score_percent": request.score_percent,
            "completed_at": "now()",
        }).execute()

        # 3. Only award currency if first time completion
        awarded_xp = 0
        awarded_points = 0

        if not is_already_completed:
            awarded_xp = request.xp_reward
            awarded_points = request.points_reward

            # Record point transactions with unique idempotency key
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

            # Increment user profile balance
            profile_res = client.table("profiles").select("xp_balance, points_balance").eq("id", user_id).single().execute()
            if profile_res.data:
                curr_xp = profile_res.data.get("xp_balance", 0)
                curr_pts = profile_res.data.get("points_balance", 0)
                client.table("profiles").update({
                    "xp_balance": curr_xp + awarded_xp,
                    "points_balance": curr_pts + awarded_points,
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


@app.get("/api/challenges")
def get_daily_challenges():
    """
    Returns today's active learning challenges.
    """
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
            "description": "Speak in any situation using the AI Speaking Studio.",
            "target": 1,
            "xp_reward": 25,
            "points_reward": 8,
            "estimated_time": "2 min",
            "difficulty": "Medium",
        },
        {
            "id": "chal-game-1",
            "title": "Play Kannada Word Sprint",
            "title_kannada": "ಪದ ಸ್ಪ್ರಿಂಟ್ ಆಟವಾಡಿ",
            "description": "Score at least 60 points in the Word Sprint mini-game.",
            "target": 1,
            "xp_reward": 20,
            "points_reward": 5,
            "estimated_time": "2 min",
            "difficulty": "Fun",
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
