import logging
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from services.auth_service import get_supabase_client

logger = logging.getLogger("maatu.pronunciation")

# Curated reference sentences for pronunciation training
PRACTICE_SENTENCES = [
    {
        "id": "pron-1",
        "kannada": "ನಮಸ್ಕಾರ, ನೀವು ಹೇಗಿದ್ದೀರಿ?",
        "transliteration": "Namaskara, neevu hegiddiri?",
        "english": "Hello, how are you?",
        "category": "greetings",
        "difficulty": "Easy",
        "phonetic_focus": "Polite plural 'ನೀವು' (neevu) and long vowel 'ಹೇಗಿದ್ದೀರಿ' (hegiddiri)",
    },
    {
        "id": "pron-2",
        "kannada": "ನನಗೆ ಕನ್ನಡ ಸ್ವಲ್ಪ ಬರುತ್ತೆ.",
        "transliteration": "Nanage Kannada swalpa barutte.",
        "english": "I know a little Kannada.",
        "category": "survival",
        "difficulty": "Easy",
        "phonetic_focus": "Geminate 'ನ್' in 'ಕನ್ನಡ' (Kannada) and dental 'ಲ್' in 'ಸ್ವಲ್ಪ' (swalpa)",
    },
    {
        "id": "pron-3",
        "kannada": "ಒಂದು ಕಪ್ ಬಿಸಿ ಫಿಲ್ಟರ್ ಕಾಫಿ ಕೊಡಿ.",
        "transliteration": "Ondu cup bisi filter coffee kodi.",
        "english": "Please give one cup of hot filter coffee.",
        "category": "food",
        "difficulty": "Medium",
        "phonetic_focus": "Short vowel 'ಬಿಸಿ' (bisi) and retroflex flap 'ಕೊಡಿ' (kodi)",
    },
    {
        "id": "pron-4",
        "kannada": "ಮೆಜೆಸ್ಟಿಕ್‌ಗೆ ಎಷ್ಟು ಆಗುತ್ತೆ?",
        "transliteration": "Majestic-ge eshtu aagutte?",
        "english": "How much will it be to Majestic?",
        "category": "travel",
        "difficulty": "Medium",
        "phonetic_focus": "Retroflex sibilant 'ಷ್ಟ್' in 'ಎಷ್ಟು' (eshtu) and geminate 'ತ್ತೆ' in 'ಆಗುತ್ತೆ' (aagutte)",
    },
    {
        "id": "pron-5",
        "kannada": "ನಾಳೆ ಬೆಳಿಗ್ಗೆ ಒಂಬತ್ತು ಗಂಟೆಗೆ ಭೇಟಿಯಾಗೋಣ.",
        "transliteration": "Naale beligge ombattu gantege bhetiyaagona.",
        "english": "Let us meet tomorrow morning at nine o'clock.",
        "category": "conversation",
        "difficulty": "Advanced",
        "phonetic_focus": "Retroflex 'ಳಿ' (li) in 'ಬೆಳಿಗ್ಗೆ' and aspirated 'ಭೇ' (bhe) in 'ಭೇಟಿಯಾಗೋಣ'",
    },
    {
        "id": "pron-6",
        "kannada": "ದಯವಿಟ್ಟು ಸ್ವಲ್ಪ ನಿಧಾನವಾಗಿ ಮಾತನಾಡಿ.",
        "transliteration": "Dayavittu swalpa nidhaanavaagi maatanaadi.",
        "english": "Please speak a little slowly.",
        "category": "survival",
        "difficulty": "Medium",
        "phonetic_focus": "Aspirated 'ಧಾ' in 'ನಿಧಾನವಾಗಿ' and retroflex 'ಡಿ' in 'ಮಾತನಾಡಿ'",
    },
]

class WordDiff(BaseModel):
    target_word: str
    spoken_word: Optional[str]
    status: str = Field(description="'match', 'substituted', 'missing', or 'extra'")

def clean_kannada_text(text: str) -> str:
    punctuation = ".,!?:;\"'()[]{}-—"
    cleaned = text
    for p in punctuation:
        cleaned = cleaned.replace(p, " ")
    return " ".join(cleaned.split()).strip()

def assess_pronunciation_attempt(
    target_kannada: str,
    target_transliteration: str,
    target_english: str,
    recognized_transcript: str,
    user_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Honest, transparent transcription-alignment assessment.
    Labels limitations clearly: Speech recognition transcribes recognized acoustic words,
    not raw physical phonemes.
    """
    clean_target = clean_kannada_text(target_kannada)
    clean_spoken = clean_kannada_text(recognized_transcript)

    target_words = clean_target.split()
    spoken_words = clean_spoken.split()

    word_diffs: List[Dict[str, Any]] = []
    matches = 0

    # Align word by word
    max_len = max(len(target_words), len(spoken_words))
    for i in range(max_len):
        t_w = target_words[i] if i < len(target_words) else None
        s_w = spoken_words[i] if i < len(spoken_words) else None

        if t_w and s_w:
            if t_w.lower() == s_w.lower():
                matches += 1
                word_diffs.append({
                    "target_word": t_w,
                    "spoken_word": s_w,
                    "status": "match",
                })
            else:
                word_diffs.append({
                    "target_word": t_w,
                    "spoken_word": s_w,
                    "status": "substituted",
                })
        elif t_w and not s_w:
            word_diffs.append({
                "target_word": t_w,
                "spoken_word": None,
                "status": "missing",
            })
        elif s_w and not t_w:
            word_diffs.append({
                "target_word": "",
                "spoken_word": s_w,
                "status": "extra",
            })

    total_target = max(1, len(target_words))
    accuracy_percent = int(min(100, max(0, round((matches / total_target) * 100))))

    # Phonetic feedback logic based on characteristic Kannada features
    feedback_notes = []
    if accuracy_percent >= 90:
        feedback_notes.append("Excellent clarity! Your utterance was recognized almost word-for-word.")
    elif accuracy_percent >= 60:
        feedback_notes.append("Good attempt! Most words were understood. Pay special attention to word endings and compound sounds.")
    else:
        feedback_notes.append("Keep practising! Speak at a steady, measured pace. Focus on pronouncing each syllable distinctly.")

    # Detect specific retroflex or aspirated phonemes in target that might cause trouble
    if "ಳ" in target_kannada:
        feedback_notes.append("Tip for 'ಳ' (retroflex L): Curl the tip of your tongue slightly back against the roof of your mouth, unlike English 'L'.")
    if "ಣ" in target_kannada:
        feedback_notes.append("Tip for 'ಣ' (retroflex N): Pronounce with the tongue curled back to the hard palate.")
    if any(asp in target_kannada for asp in ["ಭ", "ಧ", "ಠ", "ಖ", "ಥ"]):
        feedback_notes.append("Tip for aspirated consonants: Allow a slight puff of breath on letters like 'ಭ' (bha) and 'ಧ' (dha).")

    result = {
        "target_kannada": target_kannada,
        "target_transliteration": target_transliteration,
        "target_english": target_english,
        "recognized_transcript": recognized_transcript,
        "accuracy_percent": accuracy_percent,
        "assessment_method": "transcription_alignment",
        "method_note": "Acoustic speech recognition alignment. Evaluates word-level pronunciation clarity.",
        "word_diffs": word_diffs,
        "feedback_notes": " ".join(feedback_notes),
        "matches_count": matches,
        "total_words": len(target_words),
    }

    # Persist attempt to Supabase if authenticated
    if user_id:
        sb = get_supabase_client()
        if sb:
            try:
                sb.table("pronunciation_attempts").insert({
                    "user_id": user_id,
                    "target_kannada": target_kannada,
                    "target_transliteration": target_transliteration,
                    "target_english": target_english,
                    "recognized_transcript": recognized_transcript,
                    "assessment_method": "transcription_alignment",
                    "accuracy_percent": accuracy_percent,
                    "recognized_differences": word_diffs,
                    "feedback_notes": result["feedback_notes"],
                }).execute()
            except Exception as e:
                logger.debug(f"Could not persist pronunciation attempt to Supabase: {e}")

    return result

