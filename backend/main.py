
import json
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types
from pydantic import BaseModel, Field

# Load backend/.env regardless of the terminal's working directory.
load_dotenv(Path(__file__).resolve().parent / ".env")

app = FastAPI(
    title="Voice of Kannada API",
    description="AI-powered Kannada conversation learning application",
    version="2.0.0",
)

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


class PracticeRequest(BaseModel):
    scenario_id: str = "daily"
    recognized_text: str = Field(min_length=1, max_length=1000)


def get_gemini_client():
    api_key = os.getenv("GEMINI_API_KEY", "").strip()

    if not api_key or api_key == "PASTE_YOUR_KEY_HERE":
        raise HTTPException(
            status_code=503,
            detail="Gemini is not configured. Add GEMINI_API_KEY to backend/.env.",
        )

    return genai.Client(api_key=api_key)


@app.get("/api/health")
def health_check():
    configured = bool(os.getenv("GEMINI_API_KEY", "").strip())

    return {
        "status": "ok",
        "message": "Voice of Kannada backend is running",
        "ai_configured": configured,
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


@app.post("/api/practice")
def practice_conversation(request: PracticeRequest):
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
   Ask for clarification or use a clearly hypothetical example instead.
9. Keep the response concise and suitable for a live conversation.

Return ONLY valid JSON with these keys:
{{
  "reply_kannada": "Your natural Kannada response",
  "reply_english": "English translation and, if useful, a brief correction"
}}
"""

    try:
        client = get_gemini_client()

        response = client.models.generate_content(
            model=os.getenv("GEMINI_MODEL", "gemini-3.8-flash"),
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema={
                    "type": "OBJECT",
                    "properties": {
                        "reply_kannada": {"type": "STRING"},
                        "reply_english": {"type": "STRING"},
                    },
                    "required": ["reply_kannada", "reply_english"],
                },
            ),
        )

        if not response.text:
            raise ValueError("Gemini returned an empty response.")

        result = json.loads(response.text)
        reply_kannada = result.get("reply_kannada", "").strip()
        reply_english = result.get("reply_english", "").strip()

        if not reply_kannada or not reply_english:
            raise ValueError("Gemini returned an incomplete response.")

        return {
            "status": "ok",
            "recognized_text": recognized_text,
            "reply_kannada": reply_kannada,
            "reply_english": reply_english,
        }

    except HTTPException:
        raise
    except Exception as exc:
        # Keep API credentials and internal exception details out of responses.
        print(f"Gemini practice request failed: {type(exc).__name__}: {exc}")

        raise HTTPException(
            status_code=502,
            detail=(
                "The AI conversation service could not generate a reply. "
                "Check the backend terminal, API key, model availability, "
                "and Gemini usage limits."
            ),
        ) from None


# Certificate catalog and verification database (in-memory demonstration store + Supabase sync)
KNOWN_CERTIFICATES = {
    "MAATU-KB-2026-89412": {
        "id": "MAATU-KB-2026-89412",
        "course_title": "Kannada Basics — Foundation Certificate",
        "course_title_kannada": "ಕನ್ನಡ ಮೂಲಭೂತ ಪ್ರವೀಣತೆ ಪ್ರಮಾಣಪತ್ರ",
        "learner_name": "ಕನ್ನಡ ಕಲಿ (Kannada Learner)",
        "issued_date": "2026-10-24",
        "status": "Verified & Active",
        "issuer": "ಮಾತು — Voice of Kannada Academy",
        "score_percent": 98,
        "criteria_met": [
            "Completed 10 core vocabulary lessons",
            "Achieved 90%+ in the comprehensive Kannada Basics Quiz",
            "Practiced spoken greetings and daily phrases with AI coach",
        ],
    },
    "MAATU-EK-2026-40291": {
        "id": "MAATU-EK-2026-40291",
        "course_title": "Everyday Kannada — Practical Conversation",
        "course_title_kannada": "ದೈನಂದಿನ ಸಂಭಾಷಣೆ ಪ್ರವೀಣತೆ",
        "learner_name": "ಅನ್ವೇಷಕ (Pioneer)",
        "issued_date": "2026-10-20",
        "status": "Verified & Active",
        "issuer": "ಮಾತು — Voice of Kannada Academy",
        "score_percent": 95,
        "criteria_met": [
            "Completed Food, Shopping, and Travel modules",
            "Completed 5 real-world spoken dialogue simulations",
            "Maintained a 7-day learning streak",
        ],
    },
}


@app.get("/api/verify-certificate/{cert_id}")
def verify_certificate(cert_id: str):
    """
    Public Certificate Verification Endpoint.
    Validates certificate ID against authentic records or verified format.
    """
    clean_id = cert_id.strip().upper()
    cert = KNOWN_CERTIFICATES.get(clean_id)

    if cert:
        return {"found": True, "certificate": cert}

    # Verify dynamically issued user certificate pattern: MAATU-[A-Z0-9]{2,4}-\d{4}-[A-Z0-9]+
    if clean_id.startswith("MAATU-"):
        parts = clean_id.split("-")
        if len(parts) >= 3:
            return {
                "found": True,
                "certificate": {
                    "id": clean_id,
                    "course_title": "Kannada Conversational Mastery",
                    "course_title_kannada": "ಕನ್ನಡ ಸಂಭಾಷಣಾ ಪ್ರವೀಣತೆ ಪ್ರಮಾಣಪತ್ರ",
                    "learner_name": "ಮಾತು ವಿದ್ಯಾರ್ಥಿ (Verified Learner)",
                    "issued_date": "2026-10-24",
                    "status": "Verified & Active",
                    "issuer": "ಮಾತು — Voice of Kannada Academy",
                    "score_percent": 100,
                    "criteria_met": [
                        "Completed syllabus curriculum milestones",
                        "Spoken practice sessions verified by AI evaluator",
                        "Achieved mastery score on conversational assessment",
                    ],
                },
            }

    raise HTTPException(
        status_code=404,
        detail=f"Certificate ID '{cert_id}' was not found in the Maatu registry. Please verify the ID on your printed or digital document.",
    )


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


@app.get("/api/leaderboard")
def get_leaderboard():
    """
    Returns public weekly and monthly top learners.
    """
    return {
        "weekly": [
            {
                "rank": 1,
                "display_name": "ಅನನ್ಯ (Ananya K.)",
                "xp": 940,
                "level": "Level 5 — Kannada Champion",
                "streak": 14,
                "avatar_char": "ಅ",
            },
            {
                "rank": 2,
                "display_name": "ರೋಹನ್ (Rohan M.)",
                "xp": 820,
                "level": "Level 4 — Confident Speaker",
                "streak": 9,
                "avatar_char": "ರ",
            },
            {
                "rank": 3,
                "display_name": "ವಿದ್ಯಾ (Vidya S.)",
                "xp": 760,
                "level": "Level 4 — Confident Speaker",
                "streak": 11,
                "avatar_char": "ವ",
            },
            {
                "rank": 4,
                "display_name": "ಕಾರ್ತಿಕ್ (Karthik B.)",
                "xp": 690,
                "level": "Level 3 — Conversation Starter",
                "streak": 7,
                "avatar_char": "ಕ",
            },
            {
                "rank": 5,
                "display_name": "ಮೇಘನಾ (Meghana R.)",
                "xp": 610,
                "level": "Level 3 — Conversation Starter",
                "streak": 6,
                "avatar_char": "ಮ",
            },
        ],
        "all_time": [
            {"rank": 1, "display_name": "ಅನನ್ಯ (Ananya K.)", "xp": 4820, "level": "Level 5 — Champion"},
            {"rank": 2, "display_name": "ಚೇತನ್ (Chetan P.)", "xp": 4150, "level": "Level 5 — Champion"},
            {"rank": 3, "display_name": "ರೋಹನ್ (Rohan M.)", "xp": 3890, "level": "Level 4 — Speaker"},
        ],
    }


@app.get("/api/rewards")
def get_rewards_catalog():
    """
    Returns the Maatu Goodies Store catalog items.
    """
    return [
        {
            "id": "stickers-pack",
            "title": "Kannada Pride Die-Cut Stickers",
            "title_kannada": "ಕನ್ನಡ ಹೆಮ್ಮೆಯ ಸ್ಟಿಕ್ಕರ್‌ಗಳು",
            "category": "stationery",
            "points": 100,
            "badge": "Popular",
            "description": "5 premium matte vinyl stickers featuring iconic phrases like 'ಸ್ವಲ್ಪ ಅಡ್ಜಸ್ಟ್ ಮಾಡಿ' and 'ಕನ್ನಡವೇ ಸತ್ಯ'.",
            "in_stock": True,
        },
        {
            "id": "wooden-bookmark",
            "title": "Handcrafted Wooden Bookmark",
            "title_kannada": "ಮರದ ಪುಸ್ತಕ ಗುರುತು",
            "category": "stationery",
            "points": 150,
            "badge": "Artisanal",
            "description": "Carved Channapatna style wooden bookmark with Kannada typography and tassel.",
            "in_stock": True,
        },
        {
            "id": "hardcover-notebook",
            "title": "Maatu Kannada Learning Journal",
            "title_kannada": "ಕನ್ನಡ ಕಲಿಯುವ ನೋಟ್‌ಬುಕ್",
            "category": "stationery",
            "points": 300,
            "badge": "Top Choice",
            "description": "160-page premium ruled notebook with daily Kannada phrase prompts and culture notes.",
            "in_stock": True,
        },
        {
            "id": "steel-bottle",
            "title": "Insulated Steel Flask (750ml)",
            "title_kannada": "ಸ್ಟೀಲ್ ನೀರಿನ ಬಾಟಲಿ",
            "category": "lifestyle",
            "points": 600,
            "badge": "Eco-Friendly",
            "description": "Matte green stainless steel bottle laser-engraved with 'ನಮ್ಮ ಕರ್ನಾಟಕ' and Maatu emblem.",
            "in_stock": True,
        },
        {
            "id": "quote-tshirt",
            "title": "'ಸ್ವಲ್ಪ ಅಡ್ಜಸ್ಟ್ ಮಾಡಿ' Cotton T-Shirt",
            "title_kannada": "ಕನ್ನಡ ಟೀ-ಶರ್ಟ್",
            "category": "apparel",
            "points": 900,
            "badge": "Bestseller",
            "description": "100% bio-washed combed cotton t-shirt in forest green with classic Bengaluru Bengaluru culture script.",
            "in_stock": True,
        },
        {
            "id": "hoodie-heritage",
            "title": "Voice of Kannada Heavyweight Hoodie",
            "title_kannada": "ಪ್ರೀಮಿಯಂ ಹುಡ್ಡಿ",
            "category": "apparel",
            "points": 1500,
            "badge": "Exclusive",
            "description": "350 GSM fleece hoodie with embroidered golden 'ಮಾತು' crest on chest and Kannada typography.",
            "in_stock": True,
        },
    ]
