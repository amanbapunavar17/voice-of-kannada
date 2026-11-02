import logging
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from services.gemini_service import generate_structured_json
from services.auth_service import get_supabase_client

logger = logging.getLogger("maatu.phrasebook")

class DialogueExchange(BaseModel):
    speaker: str = Field(description="Speaker label (e.g. Person A, Person B)")
    kannada: str = Field(description="Kannada dialogue text")
    english: str = Field(description="English meaning")

class NaturalTranslationPayload(BaseModel):
    kannada_script: str = Field(description="Most authentic, conversational Kannada translation")
    transliteration: str = Field(description="Clean phonetic Latin transliteration")
    english_meaning: str = Field(description="Accurate English translation")
    formal_version: str = Field(description="Respectful/formal version suitable for elders or officials")
    informal_version: str = Field(description="Colloquial version suitable for peers, autos, and street vendors")
    usage_context: str = Field(description="Brief explanation of when and where to use this phrase in Karnataka")
    example_conversation: List[DialogueExchange] = Field(description="2-turn example dialogue showing real-world usage")

class WordBreakdownItem(BaseModel):
    kannada_word: str
    transliteration: str
    english_meaning: str
    grammatical_role: str = Field(description="e.g. 'Subject (I)', 'Dative Case (To school)', 'Present Continuous Verb (Am going)'")

class SentenceIntelligencePayload(BaseModel):
    full_sentence_kannada: str
    full_sentence_transliteration: str
    full_sentence_english: str
    words: List[WordBreakdownItem]
    grammar_insight: str = Field(description="Key grammatical takeaway explaining the structure of this Kannada sentence")

def translate_to_natural_kannada(english_input: str) -> Dict[str, Any]:
    prompt = f"""
Translate this English statement or question into authentic, conversational Kannada as spoken in Karnataka:
INPUT: "{english_input}"

CRITICAL INSTRUCTIONS:
1. Avoid robotic word-for-word translation. Provide how a real person living in Karnataka would say this naturally!
2. Provide both a formal version (polite, respectful) and an informal version (casual, everyday colloquial).
3. Provide accurate Kannada script and phonetic transliteration.
4. Give a realistic mini-conversation showing this expression in action.

Return valid JSON according to schema.
"""
    return generate_structured_json(
        prompt=prompt,
        schema=NaturalTranslationPayload,
        system_instruction="You are MAATHU's Natural Kannada Translator. Prioritize real-world colloquial expressions over textbook literal translations.",
    )

def breakdown_kannada_sentence(sentence_kannada: str) -> Dict[str, Any]:
    prompt = f"""
Break down this Kannada sentence word-by-word to help a beginner understand its anatomy and grammatical roles:
SENTENCE: "{sentence_kannada}"

Example:
ನಾನು ಶಾಲೆಗೆ ಹೋಗುತ್ತಿದ್ದೇನೆ.
- ನಾನು = I (Subject pronoun)
- ಶಾಲೆಗೆ = To school (Noun with dative case suffix -ಗೆ)
- ಹೋಗುತ್ತಿದ್ದೇನೆ = Am going (Present continuous first-person verb)

Provide a crystal clear breakdown and a friendly grammar insight.
Return valid JSON.
"""
    return generate_structured_json(
        prompt=prompt,
        schema=SentenceIntelligencePayload,
        system_instruction="You are MAATHU's Sentence Intelligence analyzer.",
    )

def get_saved_phrases(user_id: Optional[str]) -> List[Dict[str, Any]]:
    if not user_id:
        return [
            {
                "id": "phrase-1",
                "kannada_text": "ನನಗೆ ಕನ್ನಡ ಸ್ವಲ್ಪ ಬರುತ್ತೆ",
                "transliteration": "Nanage Kannada swalpa barutte",
                "english_meaning": "I know a little Kannada",
                "category": "Survival",
                "formality_level": "Polite",
                "learning_status": "learning",
            },
            {
                "id": "phrase-2",
                "kannada_text": "ಸ್ವಲ್ಪ ಅಡ್ಜಸ್ಟ್ ಮಾಡಿ",
                "transliteration": "Swalpa adjust maadi",
                "english_meaning": "Please adjust a little",
                "category": "Everyday",
                "formality_level": "Colloquial",
                "learning_status": "mastered",
            },
            {
                "id": "phrase-3",
                "kannada_text": "ಊಟ ಆಯ್ತಾ?",
                "transliteration": "Oota aayta?",
                "english_meaning": "Did you have food?",
                "category": "Greeting",
                "formality_level": "Friendly",
                "learning_status": "learning",
            },
        ]

    sb = get_supabase_client()
    if not sb:
        return []

    try:
        res = sb.table("saved_phrases").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        return res.data or []
    except Exception as e:
        logger.debug(f"Could not load saved phrases: {e}")
        return []

def save_phrase_to_user_book(
    user_id: str,
    kannada_text: str,
    transliteration: str,
    english_meaning: str,
    category: str = "Everyday",
    formality_level: str = "polite",
    source: str = "manual",
) -> Dict[str, Any]:
    sb = get_supabase_client()
    if not sb:
        return {"success": False, "message": "Supabase not configured"}

    try:
        sb.table("saved_phrases").upsert({
            "user_id": user_id,
            "kannada_text": kannada_text.strip(),
            "transliteration": transliteration.strip(),
            "english_meaning": english_meaning.strip(),
            "category": category,
            "formality_level": formality_level,
            "source": source,
            "learning_status": "learning",
        }).execute()
        return {"success": True, "message": "Phrase saved successfully"}
    except Exception as e:
        logger.error(f"Error saving phrase: {e}")
        return {"success": False, "message": str(e)}

