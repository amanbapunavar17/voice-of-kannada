import logging
import uuid
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from services.gemini_service import generate_structured_json
from services.auth_service import get_supabase_client

logger = logging.getLogger("maatu.conversation")

# In-memory session cache for fast multi-turn context
_active_sessions: Dict[str, Dict[str, Any]] = {}

class ConversationTurnPayload(BaseModel):
    reply_kannada: str = Field(description="Natural, colloquial Kannada response in Kannada script")
    transliteration: str = Field(description="English phonetic transliteration of the Kannada response")
    reply_english: str = Field(description="Clear and accurate English translation of your reply")
    understood_intent: str = Field(description="What the learner intended to say in English")
    is_comprehensible: bool = Field(description="True if the learner's message made sense in Kannada or mixed Kanglish")
    natural_kannada_alternative: Optional[str] = Field(description="A more authentic, native phrasing of what the learner tried to say")
    grammar_notes: Optional[str] = Field(description="A gentle, supportive note if there was a grammar/word choice mistake, or null")
    suggested_replies: List[str] = Field(description="3 short, natural Kannada suggested reply sentences the learner can say next")
    followup_question: Optional[str] = Field(description="One relevant, natural follow-up question in Kannada to continue the conversation")

class SessionSummaryPayload(BaseModel):
    summary_english: str = Field(description="A 2-sentence encouraging summary of what was discussed")
    turns_count: int = Field(description="Total exchanges in the conversation")
    fluency_score: int = Field(description="Estimated conversational fluency score from 0 to 100 for this session")
    key_words_learned: List[str] = Field(description="List of 3-5 useful Kannada words used during this conversation")
    positive_feedback: str = Field(description="Encouraging praise highlighting what the learner did well")
    improvement_tip: str = Field(description="One actionable tip for speaking more naturally next time")

def start_or_get_session(
    session_id: Optional[str],
    user_id: Optional[str],
    situation_id: str = "daily",
    learning_mode: str = "beginner",
) -> Dict[str, Any]:
    clean_id = session_id or str(uuid.uuid4())

    if clean_id in _active_sessions:
        session = _active_sessions[clean_id]
        session["situation_id"] = situation_id
        session["learning_mode"] = learning_mode
        return session

    new_session = {
        "session_id": clean_id,
        "user_id": user_id,
        "situation_id": situation_id,
        "learning_mode": learning_mode,
        "turns": [],
        "created_at": "now",
    }
    _active_sessions[clean_id] = new_session

    # Persist session to Supabase if authenticated and table exists
    if user_id:
        sb = get_supabase_client()
        if sb:
            try:
                sb.table("conversations").insert({
                    "id": clean_id,
                    "user_id": user_id,
                    "session_title": f"Conversation ({situation_id.capitalize()})",
                    "situation_id": situation_id,
                    "learning_mode": learning_mode,
                }).execute()
            except Exception as e:
                logger.debug(f"Could not persist conversation session to Supabase: {e}")

    return new_session

def process_conversation_message(
    session_id: str,
    user_message: str,
    situation_id: str = "daily",
    learning_mode: str = "beginner",
    user_id: Optional[str] = None,
) -> Dict[str, Any]:
    session = start_or_get_session(session_id, user_id, situation_id, learning_mode)
    history = session.get("turns", [])[-6:]  # Keep last 6 exchanges for tight prompt context

    history_context = ""
    for idx, turn in enumerate(history):
        history_context += f"Learner: {turn.get('user')}\nAI: {turn.get('ai_kannada')}\n"

    mode_guidelines = {
        "beginner": (
            "The learner is a COMPLETE BEGINNER. Use very simple, polite Kannada words. "
            "Keep sentences short (4-7 words). Explain any mistakes warmly and clearly."
        ),
        "intermediate": (
            "The learner is an INTERMEDIATE SPEAKER. Use natural, conversational colloquial Bengaluru/Karnataka Kannada. "
            "Provide helpful alternatives for more idiomatic phrasing."
        ),
        "challenge": (
            "CHALLENGE MODE: Respond as a fast, authentic native speaker would in real life. "
            "Use colloquial contractions (e.g. 'ಹೋಗ್ತೀರಾ', 'ಆಯ್ತಾ', 'ಬನ್ನಿ'). Keep grammar hints brief."
        ),
    }.get(learning_mode, "Use clear, friendly beginner-intermediate Kannada.")

    prompt = f"""
You are MAATHU (ಮಾತು), the warm, intelligent, and culturally authentic AI Kannada Conversation Companion.
Your mission is to help people living in Karnataka live, speak, think, and communicate in natural Kannada.

SITUATION: {situation_id}
LEARNING MODE: {learning_mode.upper()}
MODE GUIDELINES:
{mode_guidelines}

RECENT CONVERSATION HISTORY:
{history_context if history_context else "(This is the beginning of the chat)"}

CURRENT LEARNER UTTERANCE:
"{user_message}"

CRITICAL INSTRUCTIONS:
1. SUPPORT MIXED SPEECH: Learners frequently mix Kannada and English words (Kanglish), or write Kannada in English script (e.g., 'Nanage coffee beku', 'Bus yavaga barutte?'). Understand and respond naturally to their core intent!
2. NATURAL CONVERSATION: Do NOT just translate. Have a real conversation! Answer their question, acknowledge their thoughts, and ask a relevant follow-up question.
3. KANNDA SCRIPT & TRANSLITERATION: Output authentic Kannada script for 'reply_kannada' and readable phonetic Latin transliteration for 'transliteration'.
4. DETAILED LEARNING FEEDBACK:
   - Identify what the learner intended in 'understood_intent'.
   - Offer a more native/natural phrasing in 'natural_kannada_alternative'.
   - If there is a grammatical error or unnatural phrasing, gently explain in 'grammar_notes' without shaming.
   - Provide 3 realistic, simple Kannada sentences the learner could reply with in 'suggested_replies'.
5. CONTINUATION: Include a natural follow-up question in 'followup_question'.

Return ONLY valid JSON matching the requested schema.
"""

    result = generate_structured_json(
        prompt=prompt,
        schema=ConversationTurnPayload,
        system_instruction="You are MAATHU, the official AI Kannada Companion. Encourage real-world conversational speaking.",
    )

    # Save turn to in-memory session history
    turn_record = {
        "user": user_message,
        "ai_kannada": result.get("reply_kannada"),
        "ai_transliteration": result.get("transliteration"),
        "ai_english": result.get("reply_english"),
        "feedback": {
            "understood_intent": result.get("understood_intent"),
            "natural_alternative": result.get("natural_kannada_alternative"),
            "grammar_notes": result.get("grammar_notes"),
            "suggested_replies": result.get("suggested_replies", []),
        },
    }
    session["turns"].append(turn_record)

    # Persist message to Supabase if authenticated
    if user_id:
        sb = get_supabase_client()
        if sb:
            try:
                sb.table("conversation_messages").insert([
                    {
                        "conversation_id": session_id,
                        "sender_role": "learner",
                        "content_raw": user_message,
                    },
                    {
                        "conversation_id": session_id,
                        "sender_role": "companion",
                        "content_raw": result.get("reply_kannada"),
                        "kannada_script": result.get("reply_kannada"),
                        "transliteration": result.get("transliteration"),
                        "english_translation": result.get("reply_english"),
                        "feedback": turn_record["feedback"],
                    },
                ]).execute()
            except Exception as e:
                logger.debug(f"Could not persist conversation messages to Supabase: {e}")

    return {
        "session_id": session_id,
        "reply_kannada": result.get("reply_kannada"),
        "transliteration": result.get("transliteration"),
        "reply_english": result.get("reply_english"),
        "understood_intent": result.get("understood_intent"),
        "is_comprehensible": result.get("is_comprehensible", True),
        "natural_kannada_alternative": result.get("natural_kannada_alternative"),
        "grammar_notes": result.get("grammar_notes"),
        "suggested_replies": result.get("suggested_replies", []),
        "followup_question": result.get("followup_question"),
        "turns_count": len(session["turns"]),
    }

def generate_session_summary(session_id: str, user_id: Optional[str] = None) -> Dict[str, Any]:
    session = _active_sessions.get(session_id)
    if not session or not session.get("turns"):
        return {
            "summary_english": "A short practice session with MAATHU.",
            "turns_count": 0,
            "fluency_score": 75,
            "key_words_learned": ["ನಮಸ್ಕಾರ (Hello)", "ಧನ್ಯವಾದಗಳು (Thank you)"],
            "positive_feedback": "Great start speaking Kannada!",
            "improvement_tip": "Keep practising everyday situations.",
        }

    transcript = ""
    for t in session["turns"]:
        transcript += f"Learner: {t.get('user')}\nAI: {t.get('ai_kannada')}\n"

    prompt = f"""
Analyze this Kannada conversation practice session between a learner and MAATHU AI:
TRANSCRIPT:
{transcript}

Provide an encouraging, accurate performance summary with fluency assessment.
Return valid JSON matching the schema.
"""

    summary = generate_structured_json(
        prompt=prompt,
        schema=SessionSummaryPayload,
    )

    if user_id:
        sb = get_supabase_client()
        if sb:
            try:
                sb.table("conversations").update({
                    "summary": summary.get("summary_english"),
                    "updated_at": "now()",
                }).eq("id", session_id).execute()
            except Exception as e:
                logger.debug(f"Could not update conversation summary in Supabase: {e}")

    return summary

