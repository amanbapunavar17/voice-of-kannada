
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
    },
    "travel": {
        "title": "Explore Karnataka",
        "description": "Directions, transport, and travel situations.",
    },
    "food": {
        "title": "Order something delicious",
        "description": "Restaurants, food orders, and drinks.",
    },
    "shopping": {
        "title": "At the local market",
        "description": "Prices, bargaining, and shopping.",
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
    greetings = {
        "daily": ("ನಮಸ್ಕಾರ! ನೀವು ಹೇಗಿದ್ದೀರಿ?", "Hello! How are you?"),
        "travel": ("ಬಸ್ ನಿಲ್ದಾಣ ಎಲ್ಲಿದೆ?", "Where is the bus stop?"),
        "food": ("ಒಂದು ದೋಸೆ ಕೊಡಿ, ದಯವಿಟ್ಟು.", "One dosa, please."),
        "shopping": ("ಇದರ ಬೆಲೆ ಎಷ್ಟು?", "How much does this cost?"),
    }

    return [
        {
            "id": scenario_id,
            "title": scenario["title"],
            "greeting": greetings[scenario_id][0],
            "meaning": greetings[scenario_id][1],
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
