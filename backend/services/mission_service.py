import logging
import uuid
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from services.gemini_service import generate_structured_json
from services.auth_service import get_supabase_client

logger = logging.getLogger("maatu.missions")

# Canonical real-world roleplay missions
REAL_WORLD_MISSIONS = [
    {
        "id": "mission-canteen",
        "title": "Hotel and Darshini Canteen",
        "title_kannada": "ದರ್ಶಿನಿ ಮತ್ತು ಹೋಟೆಲ್",
        "character_name": "ಮಂಜುನಾಥ್ (Manjunath - Waiter)",
        "character_role": "Darshini Canteen Server",
        "difficulty": "Beginner",
        "description": "Order a hot filter coffee and a plate of masala dosa, specify sugar preference, and ask for the bill.",
        "communication_objective": "Successfully order food, clarify sugar preference, and conclude the bill in Kannada.",
        "initial_greeting": "ಬನ್ನಿ ಸರ್, ನಮಸ್ಕಾರ! ಏನು ಬೇಕು ಇವತ್ತು?",
        "initial_transliteration": "Banni sir, namaskara! Yenu beku ivattu?",
        "initial_english": "Welcome sir, hello! What would you like today?",
        "hints": [
            "Say: 'ಒಂದು ಮಸಾಲ ದೋಸೆ ಮತ್ತು ಫಿಲ್ಟರ್ ಕಾಫಿ ಕೊಡಿ' (Ondu masala dose mattu filter coffee kodi)",
            "If asked about sugar: 'ಸಕ್ಕರೆ ಕಮ್ಮಿ ಹಾಕಿ' (Sakkare kammi haaki - Add less sugar)",
            "For the bill: 'ಬಿಲ್ ಎಷ್ಟು ಆಯ್ತು?' (Bill eshtu aaytu? - How much is the bill?)",
        ],
        "criteria": [
            "Mentioned at least one specific food/drink item in Kannada",
            "Responded to server's clarifying question (e.g. sugar, quantity, or wait time)",
            "Asked for or acknowledged the total amount or bill",
        ],
    },
    {
        "id": "mission-auto",
        "title": "Auto-Rickshaw Ride",
        "title_kannada": "ಆಟೋ ಡ್ರೈವರ್ ಸಂಭಾಷಣೆ",
        "character_name": "ವೆಂಕಟೇಶ್ (Venkatesh - Auto Driver)",
        "character_role": "Bengaluru Auto-Rickshaw Driver",
        "difficulty": "Beginner",
        "description": "Hail an auto to Majestic or Indiranagar, insist on the meter, and confirm the route.",
        "communication_objective": "State the destination, negotiate meter fare politely, and confirm drop-off point.",
        "initial_greeting": "ಎಲ್ಲಿಗೆ ಹೋಗ್ಬೇಕು ಸಾರ್?",
        "initial_transliteration": "Ellige hogbeku saar?",
        "initial_english": "Where do you want to go, sir?",
        "hints": [
            "State destination: 'ಮೆಜೆಸ್ಟಿಕ್‌ಗೆ ಹೋಗ್ತೀರಾ?' (Majestic-ge hogteera?)",
            "Ask for meter: 'ಮೀಟರ್ ಹಾಕಿ ಬನ್ನಿ' (Meter haaki banni)",
            "Direct stop: 'ಇಲ್ಲೇ ರೈಟ್ ತಗೊಳ್ಳಿ' (Ille right tagolli - Take right right here)",
        ],
        "criteria": [
            "Clearly stated destination in Kannada",
            "Requested or agreed to meter/fair pricing",
            "Understood driver's route question and gave direction",
        ],
    },
    {
        "id": "mission-college",
        "title": "College Campus Life",
        "title_kannada": "ಕಾಲೇಜು ಮತ್ತು ಕ್ಯಾಂಪಸ್",
        "character_name": "ಸ್ನೇಹ (Sneha - Classmate)",
        "character_role": "College Senior / Classmate",
        "difficulty": "Intermediate",
        "description": "Introduce yourself to a classmate, ask about the next lecture time, and borrow class notes.",
        "communication_objective": "Self-introduction, asking schedule questions, and polite request for notes.",
        "initial_greeting": "ಹಾಯ್! ನೀವು ಹೊಸದಾಗಿ ಜಾಯಿನ್ ಆಗಿದ್ದೀರಾ? ನಿಮ್ಮ ಹೆಸರೇನು?",
        "initial_transliteration": "Hi! Neevu hosadaagi join aagiddira? Nimma hesarenu?",
        "initial_english": "Hi! Have you newly joined? What is your name?",
        "hints": [
            "Introduce: 'ನನ್ನ ಹೆಸರು [Name], ನಾನು ಹೊಸ ವಿದ್ಯಾರ್ಥಿ' (Nanna hesaru..., naanu hosa vidyarthi)",
            "Ask class: 'ಮುಂದಿನ ಕ್ಲಾಸ್ ಯಾವಾಗ ಪ್ರಾರಂಭ ಆಗುತ್ತೆ?' (Mundina class yaavaga praarambha aagutte?)",
            "Ask notes: 'ನಿಮ್ಮ ಹತ್ತಿರ ನೋಟ್ಸ್ ಇದೆಯಾ?' (Nimma hattira notes ideya?)",
        ],
        "criteria": [
            "Introduced name or background politely",
            "Asked about academic timings, professor, or classroom",
            "Completed a collaborative student dialogue",
        ],
    },
    {
        "id": "mission-shopping",
        "title": "Shopping at Local Market",
        "title_kannada": "ಮಾರುಕಟ್ಟೆಯಲ್ಲಿ ಶಾಪಿಂಗ್",
        "character_name": "ರಮೇಶ್ (Ramesh - Vegetable Vendor)",
        "character_role": "Local Market Shopkeeper",
        "difficulty": "Beginner",
        "description": "Ask the price of tomatoes or onions, ask for fresh quality, and politely request a small discount.",
        "communication_objective": "Inquire product price per kg, ask for fresh produce, and negotiate price in Kannada.",
        "initial_greeting": "ಬನ್ನಮ್ಮ/ಬನ್ನಿ ಸಾರ್, ಫ್ರೆಶ್ ತರಕಾರಿ ಬಂದಿದೆ. ಏನು ತಗೋತೀರಾ?",
        "initial_transliteration": "Banni saar, fresh tarakaari bandide. Yenu tagoteera?",
        "initial_english": "Welcome sir, fresh vegetables have arrived. What will you take?",
        "hints": [
            "Ask price: 'ಟೊಮ್ಯಾಟೊ ಒಂದು ಕೆಜಿಗೆ ಎಷ್ಟು?' (Tomato ondu kg-ge eshtu?)",
            "Ask fresh: 'ಇದು ಫ್ರೆಶ್ ಆಗಿದೆಯಾ?' (Idu fresh aagideya?)",
            "Ask discount: 'ಸ್ವಲ್ಪ ಕಮ್ಮಿ ಮಾಡಿ ಕೊಡಿ' (Swalpa kammi maadi kodi)",
        ],
        "criteria": [
            "Asked price with quantity (e.g. 1 kg or half kg)",
            "Interacted regarding produce quality or alternative vegetables",
            "Successfully finalized the purchase agreement",
        ],
    },
    {
        "id": "mission-hospital",
        "title": "Hospital Assistance",
        "title_kannada": "ಆಸ್ಪತ್ರೆ ಮತ್ತು ವೈದ್ಯಕೀಯ ನೆರವು",
        "character_name": "ಕಾವ್ಯ (Kavya - Receptionist)",
        "character_role": "Hospital Front Desk Coordinator",
        "difficulty": "Intermediate",
        "description": "Explain a basic physical symptom (e.g., headache, fever), ask which doctor to consult, and get the room number.",
        "communication_objective": "Communicate health symptom clearly, ask for doctor appointment, and obtain room directions.",
        "initial_greeting": "ನಮಸ್ಕಾರ, ಮಾತು ಕೇರ್ ಆಸ್ಪತ್ರೆಗೆ ಸ್ವಾಗತ. ನಿಮಗೆ ಯಾವ ತೊಂದರೆ ಇದೆ?",
        "initial_transliteration": "Namaskara, Maatu care aaspatrege swaagata. Nimage yaava tondare ide?",
        "initial_english": "Hello, welcome to Maatu Care Hospital. What trouble are you experiencing?",
        "hints": [
            "Explain symptom: 'ನನಗೆ ಎರಡು ದಿನದಿಂದ ಜ್ವರ ಮತ್ತು ತಲೆನೋವು ಇದೆ' (Nanage eradu dinadinda jvara mattu talenovu ide)",
            "Ask doctor: 'ಯಾವ ಡಾಕ್ಟರ್‌ರನ್ನು ನೋಡಬೇಕು?' (Yaava doctor-annu nodabeku?)",
            "Ask room: 'ಡಾಕ್ಟರ್ ರೂಮ್ ಎಷ್ಟನೇ ನಂಬರ್?' (Doctor room eshtane number?)",
        ],
        "criteria": [
            "Clearly named a symptom or medical need in Kannada",
            "Understood receptionist instructions about registration or token",
            "Inquired about doctor availability or room location",
        ],
    },
    {
        "id": "mission-travel",
        "title": "Bus & Metro Travel",
        "title_kannada": "ಬಸ್ ಮತ್ತು ಮೆಟ್ರೋ ಪ್ರಯಾಣ",
        "character_name": "ಪ್ರಕಾಶ್ (Prakash - BMTC Bus Conductor)",
        "character_role": "BMTC Bus Conductor",
        "difficulty": "Beginner",
        "description": "Ask if the bus goes to Shivajinagar or Silk Board, ask the ticket fare, and request to inform when the stop arrives.",
        "communication_objective": "Confirm route destination, buy a ticket, and ask for stop announcement.",
        "initial_greeting": "ಎಲ್ಲಿಗೆ ಟಿಕೆಟ್ ಬೇಕು? ಬೇಗ ಹೇಳಿ, ಚಿಲ್ಲರೆ ಕೊಡಿ.",
        "initial_transliteration": "Ellige ticket beku? Bega heli, chillare kodi.",
        "initial_english": "Where do you need a ticket to? Tell quickly, give exact change.",
        "hints": [
            "State destination: 'ಶಿವಾಜಿನಗರಕ್ಕೆ ಒಂದು ಟಿಕೆಟ್ ಕೊಡಿ' (Shivajinagar-kke ondu ticket kodi)",
            "Ask arrival: 'ಶಿವಾಜಿನಗರ ಎಷ್ಟು ಹೊತ್ತಿಗೆ ತಲುಪುತ್ತೆ?' (Shivajinagar eshtu hottige taluputte?)",
            "Ask alert: 'ಸ್ಟಾಪ್ ಬಂದಾಗ ದಯವಿಟ್ಟು ತಿಳಿಸಿ' (Stop bandaaga dayavittu tilisi)",
        ],
        "criteria": [
            "Specified travel destination accurately",
            "Handled fare or change (chillare) dialogue",
            "Asked stop announcement or route confirmation",
        ],
    },
]

class RoleplayTurnPayload(BaseModel):
    character_reply_kannada: str = Field(description="Authentic in-character response in Kannada script")
    character_transliteration: str = Field(description="Phonetic English transliteration of the character's reply")
    character_reply_english: str = Field(description="English translation of what the character said")
    character_mood: str = Field(description="e.g. 'friendly', 'curious', 'hurried', 'helpful'")
    objective_progress_percent: int = Field(description="Estimated progress towards completing the scenario objective (0-100)")
    is_objective_completed: bool = Field(description="True ONLY if the communication goal has been legitimately accomplished")
    feedback_for_learner: Optional[str] = Field(description="Encouraging feedback or hints on how to handle the next turn")

class CriterionEvaluation(BaseModel):
    name: str = Field(description="Name of the criterion")
    satisfied: bool = Field(description="Whether the criterion was satisfied")
    note: str = Field(description="Brief assessment note")

class MissionEvaluationPayload(BaseModel):
    is_objective_achieved: bool = Field(description="Whether the communication objective was legitimately achieved")
    score_percent: int = Field(description="Evaluation score from 0 to 100 based on appropriateness and comprehension")
    criteria_evaluations: List[CriterionEvaluation] = Field(description="Status of each criterion")
    overall_feedback: str = Field(description="Holistic evaluation of how well the learner handled the situation")
    xp_earned: int = Field(description="XP awarded for completing the mission (e.g. 50 XP if achieved)")

def get_mission_by_id(mission_id: str) -> Optional[Dict[str, Any]]:
    for m in REAL_WORLD_MISSIONS:
        if m["id"] == mission_id:
            return m
    return None

def process_mission_turn(
    mission_id: str,
    dialogue_history: List[Dict[str, str]],
    user_message: str,
) -> Dict[str, Any]:
    mission = get_mission_by_id(mission_id)
    if not mission:
        raise ValueError(f"Unknown mission ID: {mission_id}")

    history_str = ""
    for item in dialogue_history[-6:]:
        history_str += f"{item.get('sender')}: {item.get('text')}\n"

    prompt = f"""
You are roleplaying as {mission['character_name']} ({mission['character_role']}) in this real-world Kannada situation:
SCENARIO: {mission['title']} — {mission['description']}
COMMUNICATION OBJECTIVE: {mission['communication_objective']}
CRITERIA TO COMPLETE: {', '.join(mission['criteria'])}

RECENT CONVERSATION HISTORY:
{history_str if history_str else f"Character: {mission['initial_greeting']}"}

LEARNER'S LATEST MESSAGE:
"{user_message}"

ROLEPLAY GUIDELINES:
1. Stay strictly in character! If you are an auto driver, talk like an authentic Bengaluru auto driver. If a Darshini waiter, talk with canteen speed and courtesy.
2. DO NOT complete the mission just because the user sent any message. Test whether they actually understood your last sentence and communicated meaningfully.
3. If the user spoke good Kannada, respond warmly and move the transaction forward.
4. If the user spoke broken Kannada or Kanglish, stay in character, clarify what they mean, and keep the interaction going.
5. Set 'is_objective_completed' to TRUE only when the real-world transaction is successfully finalized!

Return valid JSON according to schema.
"""

    return generate_structured_json(
        prompt=prompt,
        schema=RoleplayTurnPayload,
        system_instruction=f"You are {mission['character_name']}, roleplaying in Kannada.",
    )

def evaluate_completed_mission(
    mission_id: str,
    full_transcript: List[Dict[str, str]],
    user_id: Optional[str] = None,
) -> Dict[str, Any]:
    mission = get_mission_by_id(mission_id)
    if not mission:
        raise ValueError(f"Unknown mission ID: {mission_id}")

    transcript_str = ""
    for item in full_transcript:
        transcript_str += f"{item.get('sender')}: {item.get('text')}\n"

    prompt = f"""
Evaluate this completed Kannada real-world roleplay simulation:
SCENARIO: {mission['title']}
OBJECTIVE: {mission['communication_objective']}
REQUIRED CRITERIA:
{chr(10).join(f"- {c}" for c in mission['criteria'])}

TRANSCRIPT:
{transcript_str}

Evaluate fairly:
1. Did the learner achieve the communication objective?
2. Did they communicate understandable Kannada or meaningful Kanglish?
3. Did they satisfy each criterion?
Award 50 XP if achieved, or appropriate partial XP.
Return valid JSON.
"""

    eval_result = generate_structured_json(
        prompt=prompt,
        schema=MissionEvaluationPayload,
    )

    # Persist attempt to Supabase if authenticated
    if user_id:
        sb = get_supabase_client()
        if sb:
            try:
                attempt_id = str(uuid.uuid4())
                sb.table("mission_attempts").insert({
                    "id": attempt_id,
                    "user_id": user_id,
                    "scenario_id": mission_id,
                    "scenario_title": mission["title"],
                    "character_name": mission["character_name"],
                    "status": "completed",
                    "turns_count": len(full_transcript),
                    "objective_achieved": eval_result.get("is_objective_achieved", False),
                    "evaluation_score": eval_result.get("score_percent", 80),
                    "feedback_summary": eval_result.get("overall_feedback"),
                    "xp_awarded": eval_result.get("xp_earned", 30),
                }).execute()

                # If objective achieved, award XP in transactions
                if eval_result.get("is_objective_achieved") and eval_result.get("xp_earned", 0) > 0:
                    earned_xp = eval_result.get("xp_earned", 50)
                    sb.table("point_transactions").insert({
                        "user_id": user_id,
                        "currency_type": "XP",
                        "amount": earned_xp,
                        "reason": f"Completed real-world mission: {mission['title']}",
                        "reference_id": f"mission:{mission_id}:{attempt_id}",
                    }).execute()
            except Exception as e:
                logger.debug(f"Could not persist mission evaluation to Supabase: {e}")

    return eval_result

