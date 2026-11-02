import logging
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from services.gemini_service import generate_structured_json

logger = logging.getLogger("maatu.regional")

REGIONAL_DIALECTS_DATA = [
    {
        "region_id": "bengaluru",
        "name": "Bengaluru Kannada",
        "name_kannada": "ಬೆಂಗಳೂರು ಕನ್ನಡ",
        "tagline": "Dynamic, cosmopolitan, and fast-paced city life",
        "cultural_note": "Heavily used in IT parks, Darshinis, BMTC buses, and commercial markets. Known for welcoming blends and practical shortcuts.",
        "expressions": [
            {
                "kannada": "ಸ್ವಲ್ಪ ಅಡ್ಜಸ್ಟ್ ಮಾಡಿ, ಗುರು!",
                "transliteration": "Swalpa adjust maadi, guru!",
                "meaning": "Please adjust a little, friend / brother!",
                "formality": "Casual / Friendly",
                "context": "Universally heard in Bengaluru traffic, autos, queues, and cafes.",
                "intention": "Asking for flexibility or cooperation",
            },
            {
                "kannada": "ಏನ್ ಸಮಾಚಾರ? ಟೀ ಕುಡಿದ್ರಾ?",
                "transliteration": "Yen samachara? Tea kudidra?",
                "meaning": "What's the news? Did you have tea?",
                "formality": "Casual",
                "context": "Everyday office or neighborhood greeting.",
                "intention": "Casual friendly greeting",
            },
            {
                "kannada": "ಇಲ್ಲೇ ಹತ್ತಿರದಲ್ಲಿ ಇಳಿಸಿ ಬಿಡಿ.",
                "transliteration": "Ille hattiradalli ilisi bidi.",
                "meaning": "Drop me right here nearby.",
                "formality": "Polite / Everyday",
                "context": "Used with auto and taxi drivers.",
                "intention": "Requesting drop-off point",
            },
        ],
    },
    {
        "region_id": "mysuru",
        "name": "Mysuru Kannada",
        "name_kannada": "ಮೈಸೂರು ಕನ್ನಡ",
        "tagline": "Royal, courteous, and grammatically graceful",
        "cultural_note": "Known as the cultural capital's dialect. Characterized by respectful pronouns like 'ತಾವು' (Taavu) and gentle, lyrical cadence.",
        "expressions": [
            {
                "kannada": "ತಾವು ಯಾವಾಗ ದಯಮಾಡಿಸಿದಿರಿ?",
                "transliteration": "Taavu yaavaga dayamaadisidiri?",
                "meaning": "When did you arrive / grace us with your visit?",
                "formality": "Very Respectful / Honorific",
                "context": "Welcoming guests or elders warmly into a home.",
                "intention": "Honoring a visitor's arrival",
            },
            {
                "kannada": "ಊಟಕ್ಕೆ ದಯವಿಟ್ಟು ಬನ್ನಿ.",
                "transliteration": "Ootakke dayavittu banni.",
                "meaning": "Please grace us by joining for the meal.",
                "formality": "Polite",
                "context": "Traditional hospitable dinner invitation.",
                "intention": "Inviting to a meal",
            },
            {
                "kannada": "ನಿಮ್ಮ ಕ್ಷೇಮವೇ ನಮ್ಮ ಸಂತೋಷ.",
                "transliteration": "Nimma kshemave namma santosha.",
                "meaning": "Your well-being is our true joy.",
                "formality": "Traditional Courtesy",
                "context": "Parting blessing or greeting elders.",
                "intention": "Expressing goodwill",
            },
        ],
    },
    {
        "region_id": "north_karnataka",
        "name": "North Karnataka (Dharwad / Hubballi)",
        "name_kannada": "ಉತ್ತರ ಕರ್ನಾಟಕ (ಧಾರವಾಡ / ಹುಬ್ಬಳ್ಳಿ)",
        "tagline": "Direct, deeply affectionate, and rhythmically rich",
        "cultural_note": "Spoken across Belagavi, Dharwad, Hubballi, and Bagalkote. Known for warmth, vibrant vowel endings, and hearty honorific 'ರೀ' (ree).",
        "expressions": [
            {
                "kannada": "ಏನ್ರೀ ಆರಾಮ ಅದೀರೇನು?",
                "transliteration": "Yenree aaraam adeereynu?",
                "meaning": "Hello sir/madam, are you doing comfortably well?",
                "formality": "Affectionately Respectful",
                "context": "Everyday greeting between neighbors and friends in North Karnataka.",
                "intention": "Inquiring about health and well-being",
            },
            {
                "kannada": "ನಾ ಬರಾಕತ್ತೇನ್ರಿ, ಸ್ವಲ್ಪ ತಡೀರಿ!",
                "transliteration": "Naa baraakattenri, swalpa tadeeri!",
                "meaning": "I am coming right now, please wait a moment!",
                "formality": "Colloquial",
                "context": "On phone calls or when hurrying to meet someone.",
                "intention": "Saying you are on the way",
            },
            {
                "kannada": "ಜೋಳದ ರೊಟ್ಟಿ ಜೊತೆ ಬದನೆಕಾಯಿ ಎಣಗಾಯಿ ಮಸ್ತ್ ಐತ್ರಿ!",
                "transliteration": "Jolada rotti jote badanekaayi yenagaayi mast aitree!",
                "meaning": "Jowar rotti with stuffed brinjal curry is absolutely fantastic!",
                "formality": "Expressive / Casual",
                "context": "Dining at a Khanavali or home kitchen.",
                "intention": "Praising delicious food",
            },
        ],
    },
    {
        "region_id": "coastal",
        "name": "Coastal Karnataka (Karavali / Mangaluru)",
        "name_kannada": "ಕರಾವಳಿ ಕನ್ನಡ (ಮಂಗಳೂರು / ಕುಂದಾಪುರ)",
        "tagline": "Melodic, coastal cadence with unique regional expressions",
        "cultural_note": "Spoken across Udupi, Mangaluru, and Kundapura. Renowned for its singing rhythm, coastal warmth, and distinctive address terms.",
        "expressions": [
            {
                "kannada": "ಎಂತ ಮಾರಾಯ್ರೇ, ಆರಾಮ ಇದ್ದೀರಾ?",
                "transliteration": "Yenta maarayre, aaraam iddeera?",
                "meaning": "What friend/gentleman, are you doing well?",
                "formality": "Warm Coastal Colloquial",
                "context": "The hallmark coastal greeting across Udupi and Mangaluru.",
                "intention": "Warm friendly greeting",
            },
            {
                "kannada": "ನಮ್ಮ ಕಡೆ ಬಂದು ಮೀನು ಊಟ ಮಾಡಿ ಹೋಗಿ.",
                "transliteration": "Namma kade bandu meenu oota maadi hogi.",
                "meaning": "Come visit our coastal side and enjoy a traditional fish meal.",
                "formality": "Hospitable",
                "context": "Inviting friends to visit coastal hometowns.",
                "intention": "Warm regional invitation",
            },
            {
                "kannada": "ಮಳೆ ಭರ್ಜರಿ ಬೀಳ್ತಾಯಿದೆ ಮಾರಾಯ್ರೆ!",
                "transliteration": "Male bharjari beeltayide maarayre!",
                "meaning": "It is raining heavily, my friend!",
                "formality": "Expressive",
                "context": "Monsoon conversations in coastal Karnataka.",
                "intention": "Commenting on weather",
            },
        ],
    },
]

CROSS_REGIONAL_COMPARISONS = [
    {
        "intention": "How are you doing?",
        "variations": [
            {
                "region": "Bengaluru",
                "kannada": "ಹೇಗಿದ್ದೀರಾ? ಆರಾಮಾ?",
                "transliteration": "Hegiddira? Aarama?",
                "notes": "Crisp, brisk, common in tech parks and cafes",
            },
            {
                "region": "Mysuru",
                "kannada": "ತಾವು ಕುಶಲವೇ? ಕ್ಷೇಮವೇ?",
                "transliteration": "Taavu kushalave? Kshemave?",
                "notes": "Courteous, classical honorific cadence",
            },
            {
                "region": "North Karnataka",
                "kannada": "ಏನ್ರೀ, ಆರಾಮ ಅದೀರೇನು?",
                "transliteration": "Yenree, aaraam adeereynu?",
                "notes": "Warm 'adeereynu' verb ending with respectful 'ree'",
            },
            {
                "region": "Coastal Karavali",
                "kannada": "ಎಂತ ಮಾರಾಯ್ರೇ, ಆರಾಮ ಇದ್ದೀರಾ?",
                "transliteration": "Yenta maarayre, aaraam iddeera?",
                "notes": "Classic coastal 'maarayre' vocative cadence",
            },
        ],
    },
    {
        "intention": "I am coming right now",
        "variations": [
            {
                "region": "Bengaluru",
                "kannada": "ನಾನು ಬರ್ತಾ ಇದೀನಿ, ೨ ನಿಮಿಷ.",
                "transliteration": "Naanu barta ideeni, 2 nimisha.",
                "notes": "Fast continuous contraction 'barta ideeni'",
            },
            {
                "region": "Mysuru",
                "kannada": "ನಾನು ಈಗಲೇ ಬರುತ್ತಿದ್ದೇನೆ.",
                "transliteration": "Naanu eegale baruttiddene.",
                "notes": "Standard classical grammatical participle",
            },
            {
                "region": "North Karnataka",
                "kannada": "ನಾ ಬರಾಕತ್ತೇನ್ರಿ!",
                "transliteration": "Naa baraakattenri!",
                "notes": "Distinctive progressive '-aakatteeni' verb ending",
            },
            {
                "region": "Coastal Karavali",
                "kannada": "ನಾನ್ ಇವಾಗ್ಲೇ ಬರ್ತೀನಿ ಮಾರಾಯ್ರೆ.",
                "transliteration": "Naan ivaagle barteeni maarayre.",
                "notes": "Melodic coastal cadence",
            },
        ],
    },
    {
        "intention": "Please wait a little bit",
        "variations": [
            {
                "region": "Bengaluru",
                "kannada": "ಸ್ವಲ್ಪ ವೇಟ್ ಮಾಡಿ / ಸ್ವಲ್ಪ ತಡೀರಿ.",
                "transliteration": "Swalpa wait maadi / swalpa tadeeri.",
                "notes": "Practical city phrasing, occasional English loanword",
            },
            {
                "region": "Mysuru",
                "kannada": "ದಯವಿಟ್ಟು ಸ್ವಲ್ಪ ನಿರೀಕ್ಷಿಸಿ.",
                "transliteration": "Dayavittu swalpa nireekshisi.",
                "notes": "Formal literary request",
            },
            {
                "region": "North Karnataka",
                "kannada": "ಸ್ವಲ್ಪ ತಡೀರಿಪ್ಪಾ!",
                "transliteration": "Swalpa tadeerippaa!",
                "notes": "Affectionate 'ippaa' tag",
            },
            {
                "region": "Coastal Karavali",
                "kannada": "ಸ್ವಲ್ಪ ಹೊತ್ತು ತಡ್ಕೊಳ್ಳಿ.",
                "transliteration": "Swalpa hottu tadkolli.",
                "notes": "Lyrical 'swalpa hottu' temporal phrasing",
            },
        ],
    },
]

def get_regional_dialects() -> List[Dict[str, Any]]:
    return REGIONAL_DIALECTS_DATA

def get_regional_comparisons() -> List[Dict[str, Any]]:
    return CROSS_REGIONAL_COMPARISONS

