import logging
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from services.gemini_service import generate_structured_json
from services.auth_service import get_supabase_client

logger = logging.getLogger("maatu.intelligence")

class KannadaExample(BaseModel):
    kannada: str = Field(description="Kannada script sentence")
    transliteration: str = Field(description="Phonetic transliteration")
    english: str = Field(description="English meaning")

class ListeningPrompt(BaseModel):
    audio_text: str = Field(description="Kannada text for audio prompt")
    question: str = Field(description="Question in English")
    options: List[str] = Field(description="4 multiple-choice options")
    correct_answer: str = Field(description="The correct option")

class SpeakingPrompt(BaseModel):
    target_sentence: str = Field(description="Target Kannada sentence to speak")
    transliteration: str = Field(description="Latin transliteration")
    english: str = Field(description="English meaning")
    phonetic_tip: str = Field(description="Tip on pronunciation")

class IndependentChallenge(BaseModel):
    prompt_situation: str = Field(description="Real-world situational challenge")
    expected_kannada_gist: str = Field(description="Key phrase or pattern expected")

class TargetedExercisePayload(BaseModel):
    weakness_topic: str = Field(description="The specific weakness being targeted (e.g. Question Formation, Dative Case -ಗೆ, Plural Markers)")
    short_explanation: str = Field(description="A 2-sentence crystal clear explanation in simple English")
    kannada_examples: List[KannadaExample] = Field(description="3 examples")
    listening_prompt: ListeningPrompt = Field(description="Listening prompt details")
    speaking_prompt: SpeakingPrompt = Field(description="Speaking prompt details")
    independent_challenge: IndependentChallenge = Field(description="Independent challenge details")

def get_learner_skills_profile(user_id: Optional[str]) -> Dict[str, Any]:
    """
    Computes genuine skill metrics from real database records:
    - user_lesson_progress
    - practice_sessions
    - mission_attempts
    - pronunciation_attempts
    - mistake_history
    """
    default_skills = {
        "vocabulary": 65,
        "grammar": 55,
        "speaking": 60,
        "listening": 70,
        "question_formation": 50,
        "sentence_structure": 58,
    }

    if not user_id:
        return {
            "is_guest": True,
            "overall_fluency_score": 60,
            "skills": default_skills,
            "strongest_skill": "Listening Comprehension",
            "needs_improvement": "Question Formation (ಹೇಗೆ, ಯಾವಾಗ, ಎಲ್ಲಿ)",
            "total_activities": 0,
            "recommendation": "Sign in to track your personal mistake history and receive adaptive daily challenges.",
        }

    sb = get_supabase_client()
    if not sb:
        return {
            "is_guest": False,
            "overall_fluency_score": 65,
            "skills": default_skills,
            "strongest_skill": "Vocabulary",
            "needs_improvement": "Question Formation",
            "total_activities": 0,
            "recommendation": "Complete your first speaking practice or real-life mission.",
        }

    try:
        # Fetch real activity counts from database
        lessons_res = sb.table("user_lesson_progress").select("score_percent").eq("user_id", user_id).execute()
        practice_res = sb.table("practice_sessions").select("id").eq("user_id", user_id).execute()
        missions_res = sb.table("mission_attempts").select("objective_achieved, evaluation_score").eq("user_id", user_id).execute()
        pron_res = sb.table("pronunciation_attempts").select("accuracy_percent").eq("user_id", user_id).execute()
        mistakes_res = sb.table("mistake_history").select("category, occurrences_count").eq("user_id", user_id).execute()

        lessons_count = len(lessons_res.data) if lessons_res.data else 0
        practice_count = len(practice_res.data) if practice_res.data else 0
        missions_data = missions_res.data or []
        pron_data = pron_res.data or []
        mistakes_data = mistakes_res.data or []

        # Calculate scores dynamically from genuine records
        vocab_score = min(95, 40 + (lessons_count * 5))
        speaking_score = 45
        if pron_data:
            avg_pron = sum(p.get("accuracy_percent", 50) for p in pron_data) / len(pron_data)
            speaking_score = int(avg_pron)
        elif practice_count > 0:
            speaking_score = min(90, 50 + (practice_count * 4))

        grammar_score = 60
        if mistakes_data:
            grammar_mistakes = sum(m.get("occurrences_count", 1) for m in mistakes_data if m.get("category") == "grammar")
            grammar_score = max(35, 75 - (grammar_mistakes * 5))

        mission_success_rate = 50
        if missions_data:
            achieved = sum(1 for m in missions_data if m.get("objective_achieved"))
            mission_success_rate = int((achieved / len(missions_data)) * 100)

        skills = {
            "vocabulary": vocab_score,
            "grammar": grammar_score,
            "speaking": speaking_score,
            "listening": min(95, 55 + (lessons_count * 4)),
            "question_formation": max(40, 50 + (missions_data and mission_success_rate // 4 or 0)),
            "sentence_structure": int((vocab_score + grammar_score) / 2),
        }

        # Overall transparent weighted fluency score
        overall = int(
            (skills["vocabulary"] * 0.25) +
            (skills["grammar"] * 0.20) +
            (skills["speaking"] * 0.25) +
            (skills["listening"] * 0.15) +
            (skills["question_formation"] * 0.15)
        )

        # Identify strengths and weaknesses
        sorted_skills = sorted(skills.items(), key=lambda kv: kv[1])
        weakest_skill = sorted_skills[0][0].replace("_", " ").title()
        strongest_skill = sorted_skills[-1][0].replace("_", " ").title()

        total_activities = lessons_count + practice_count + len(missions_data) + len(pron_data)

        recommendation = f"Target your {weakest_skill}. Regular daily 3-minute practice creates rapid fluency leaps."
        if weakest_skill == "Question Formation":
            recommendation = "You understand basic statements, but you need more practice asking questions using 'ಹೇಗೆ' (how), 'ಯಾವಾಗ' (when), and 'ಎಲ್ಲಿ' (where)."

        return {
            "is_guest": False,
            "overall_fluency_score": overall,
            "skills": skills,
            "strongest_skill": strongest_skill,
            "needs_improvement": weakest_skill,
            "total_activities": total_activities,
            "recommendation": recommendation,
            "lessons_completed": lessons_count,
            "practice_sessions_count": practice_count,
            "missions_completed": len(missions_data),
        }
    except Exception as e:
        logger.error(f"Error computing learner skills: {e}")
        return {
            "is_guest": False,
            "overall_fluency_score": 60,
            "skills": default_skills,
            "strongest_skill": "Vocabulary",
            "needs_improvement": "Speaking",
            "total_activities": 0,
            "recommendation": "Keep practising daily Kannada conversations.",
        }

def get_personal_mistakes(user_id: Optional[str]) -> List[Dict[str, Any]]:
    """
    Retrieves the learner's recorded mistake library.
    """
    if not user_id:
        return [
            {
                "id": "sample-1",
                "category": "grammar",
                "original_expression": "ನಾನು ಆಫೀಸ್‌ಗೆ ಹೋಗುತ್ತದೆ (Naanu office-ge hoguttade)",
                "suggested_correction": "ನಾನು ಆಫೀಸ್‌ಗೆ ಹೋಗುತ್ತೇನೆ (Naanu office-ge hoguttene)",
                "explanation": "With first person 'ನಾನು' (I), the verb ending must be '-ಏನೆ' (-ene), not third person neuter '-ಅದೆ' (-ade).",
                "occurrences_count": 2,
                "is_resolved": False,
                "last_observed_at": "Recent practice",
            },
            {
                "id": "sample-2",
                "category": "politeness",
                "original_expression": "ನೀನು ಬನ್ನಿ (Neenu banni)",
                "suggested_correction": "ನೀವು ಬನ್ನಿ (Neevu banni) or ನೀನು ಬಾ (Neenu baa)",
                "explanation": "Mixed honorific: 'ನೀವು' pairs with polite imperative 'ಬನ್ನಿ'. 'ನೀನು' pairs with informal 'ಬಾ'.",
                "occurrences_count": 3,
                "is_resolved": False,
                "last_observed_at": "Recent mission",
            },
        ]

    sb = get_supabase_client()
    if not sb:
        return []

    try:
        res = sb.table("mistake_history").select("*").eq("user_id", user_id).order("occurrences_count", desc=True).execute()
        return res.data or []
    except Exception as e:
        logger.debug(f"Could not fetch mistake history: {e}")
        return []

def record_learner_mistake(
    user_id: str,
    category: str,
    original_expression: str,
    suggested_correction: str,
    explanation: str,
) -> None:
    sb = get_supabase_client()
    if not sb:
        return

    try:
        # Check if identical mistake was recorded
        existing = sb.table("mistake_history").select("id, occurrences_count").eq("user_id", user_id).eq("original_expression", original_expression.strip()).execute()
        if existing.data and len(existing.data) > 0:
            item = existing.data[0]
            new_count = item.get("occurrences_count", 1) + 1
            sb.table("mistake_history").update({
                "occurrences_count": new_count,
                "last_observed_at": "now()",
            }).eq("id", item["id"]).execute()
        else:
            sb.table("mistake_history").insert({
                "user_id": user_id,
                "category": category,
                "original_expression": original_expression.strip(),
                "suggested_correction": suggested_correction.strip(),
                "explanation": explanation.strip(),
                "occurrences_count": 1,
            }).execute()
    except Exception as e:
        logger.debug(f"Could not record learner mistake: {e}")

def generate_adaptive_lesson(
    weakness_topic: str,
    user_level: str = "Beginner",
) -> Dict[str, Any]:
    """
    Generates a targeted, interactive 4-part micro-exercise to overcome a specific weakness.
    """
    prompt = f"""
Generate an adaptive Kannada learning lesson to address this specific demonstrated weakness:
TOPIC / WEAKNESS: {weakness_topic}
LEARNER LEVEL: {user_level}

Requirements:
1. Provide a short, intuitive explanation without dense linguistic jargon.
2. Provide 3 clear Kannada example sentences with transliteration and English translation.
3. Provide a listening comprehension question based on spoken audio text.
4. Provide a speaking pronunciation challenge with a targeted phonetic tip.
5. Provide an independent real-life challenge prompt.

Return valid JSON conforming to the schema.
"""

    return generate_structured_json(
        prompt=prompt,
        schema=TargetedExercisePayload,
        system_instruction="You are MAATHU's Personalized Adaptive Tutor engine.",
    )

