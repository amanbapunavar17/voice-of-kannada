import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert "MAATHU" in data["app_name"]

def test_scenarios():
    res = client.get("/api/scenarios")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 6
    assert any(s["id"] == "daily" for s in data)

def test_pronunciation_sentences():
    res = client.get("/api/pronunciation/sentences")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 5
    assert "kannada" in data[0]

def test_pronunciation_assessment():
    res = client.post(
        "/api/pronunciation/assess",
        json={
            "target_kannada": "ನಮಸ್ಕಾರ, ನೀವು ಹೇಗಿದ್ದೀರಿ?",
            "target_transliteration": "Namaskara, neevu hegiddiri?",
            "target_english": "Hello, how are you?",
            "recognized_transcript": "ನಮಸ್ಕಾರ ನೀವು ಹೇಗಿದ್ದೀರಿ",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["accuracy_percent"] >= 90
    assert data["assessment_method"] == "transcription_alignment"

def test_missions_list():
    res = client.get("/api/missions")
    assert res.status_code == 200
    missions = res.json()
    assert len(missions) >= 6
    ids = [m["id"] for m in missions]
    assert "mission-canteen" in ids
    assert "mission-auto" in ids

def test_regional_dialects_and_comparisons():
    res1 = client.get("/api/regional/dialects")
    assert res1.status_code == 200
    dialects = res1.json()
    assert len(dialects) >= 4

    res2 = client.get("/api/regional/comparisons")
    assert res2.status_code == 200
    comparisons = res2.json()
    assert len(comparisons) >= 3

def test_unauthenticated_protected_endpoints():
    res = client.post(
        "/api/progress/lesson",
        json={"lesson_id": "daily-1", "score_percent": 100, "xp_reward": 20, "points_reward": 5},
    )
    assert res.status_code == 401

    res_prof = client.get("/api/user/profile")
    assert res_prof.status_code == 401

def test_fluency_scorecard_guest():
    res = client.get("/api/fluency/scorecard")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert "scorecard" in data
    assert "skills" in data["scorecard"]

def test_challenges():
    res = client.get("/api/challenges")
    assert res.status_code == 200
    challenges = res.json()
    assert len(challenges) >= 4

def test_phrasebook_guest():
    res = client.get("/api/phrasebook")
    assert res.status_code == 200
    phrases = res.json()
    assert len(phrases) >= 3
    assert any("ಕನ್ನಡ" in p["kannada_text"] for p in phrases)

def test_mistakes_guest():
    res = client.get("/api/tutor/mistakes")
    assert res.status_code == 200
    mistakes = res.json()
    assert len(mistakes) >= 2

def test_native_tts():
    res = client.get("/api/tts?text=ನಮಸ್ಕಾರ")
    assert res.status_code == 200
    assert res.headers["content-type"] == "audio/mpeg"
    assert len(res.content) > 500

def test_translator_endpoint(monkeypatch):
    # 1. Verify unconfigured behavior when GEMINI_API_KEY is absent
    monkeypatch.setenv("GEMINI_API_KEY", "")
    unconfigured_res = client.post(
        "/api/translator",
        json={"english_text": "Good morning, how are you?"},
    )
    assert unconfigured_res.status_code == 500
    assert "GEMINI_API_KEY" in unconfigured_res.json()["detail"]

    # 2. Mock Gemini service dependency with realistic Kannada translation
    mock_payload = {
        "kannada_script": "ನಮಸ್ಕಾರ, ನೀವು ಹೇಗಿದ್ದೀರಿ?",
        "transliteration": "Namaskara, neevu hegiddiri?",
        "english_meaning": "Good morning, how are you?",
        "formal_version": "ಶುಭೋದಯ, ತಾವು ಹೇಗಿದ್ದೀರಿ? (Shubhodaya, taavu hegiddiri?)",
        "informal_version": "ಹೇಗಿದ್ದೀಯಾ? (Hegiddeeya?)",
        "usage_context": "Polite everyday greeting used across Karnataka in the morning.",
        "example_conversation": [
            {
                "speaker": "Person A",
                "kannada": "ನಮಸ್ಕಾರ, ನೀವು ಹೇಗಿದ್ದೀರಿ?",
                "english": "Good morning, how are you?",
            },
            {
                "speaker": "Person B",
                "kannada": "ನಾನು ಆರಾಮಾಗಿದ್ದೀನಿ, ಧನ್ಯವಾದಗಳು.",
                "english": "I am fine, thank you.",
            },
        ],
    }
    monkeypatch.setattr(
        "services.phrasebook_service.generate_structured_json",
        lambda *args, **kwargs: mock_payload,
    )
    monkeypatch.setattr(
        "main.translate_to_natural_kannada",
        lambda text: mock_payload,
    )

    # 3. Test translator endpoint with mock
    res = client.post(
        "/api/translator",
        json={"english_text": "Good morning, how are you?"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["kannada_script"] == "ನಮಸ್ಕಾರ, ನೀವು ಹೇಗಿದ್ದೀರಿ?"
    assert data["transliteration"] == "Namaskara, neevu hegiddiri?"
    assert data["english_meaning"] == "Good morning, how are you?"
    assert "formal_version" in data
    assert "informal_version" in data
    assert "usage_context" in data
    assert len(data["example_conversation"]) == 2

SAMPLE_TINY_JPEG_B64 = (
    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBk"
    "SEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIy"
    "MjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAKAAoDASIAAhEBA"
    "xEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBR"
    "IhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1h"
    "ZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT"
    "1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAt"
    "REAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRo"
    "mJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkp"
    "aanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD"
    "xyiiiv3E8w//Z"
)

def test_vision_successful_identification(monkeypatch):
    mock_vision_data = {
        "identified_object_english": "Cup",
        "kannada_word": "ಲೋಟ",
        "transliteration": "Lota",
        "category": "household",
        "confidence_level": "high",
        "identification_note": "A ceramic coffee mug on the table",
        "example_sentence_kannada": "ಈ ಲೋಟದಲ್ಲಿ ಬಿಸಿ ಕಾಫಿ ಇದೆ.",
        "example_sentence_transliteration": "Ee lotadalli bisi kaafi ide.",
        "example_sentence_english": "There is hot coffee in this cup.",
        "useful_related_words": [
            {"kannada": "ತಟ್ಟೆ", "transliteration": "Thatte", "english": "Plate"},
            {"kannada": "ಚಮಚ", "transliteration": "Chamacha", "english": "Spoon"},
        ],
    }

    monkeypatch.setattr(
        "main.identify_object_from_image",
        lambda *args, **kwargs: mock_vision_data,
    )

    res = client.post(
        "/api/camera/identify-json",
        json={
            "image_base64": SAMPLE_TINY_JPEG_B64,
            "mime_type": "image/jpeg",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["kannada_word"] == "ಲೋಟ"
    assert data["transliteration"] == "Lota"
    assert data["identified_object_english"] == "Cup"
    assert "example_sentence_kannada" in data
    assert len(data["useful_related_words"]) >= 1

def test_vision_timeout_handling(monkeypatch):
    def mock_timeout(*args, **kwargs):
        raise TimeoutError("MAATHU is taking longer than expected to identify this object. Please try again.")

    monkeypatch.setattr("main.identify_object_from_image", mock_timeout)

    res = client.post(
        "/api/camera/identify-json",
        json={
            "image_base64": SAMPLE_TINY_JPEG_B64,
            "mime_type": "image/jpeg",
        },
    )
    assert res.status_code == 504
    assert "longer than expected" in res.json()["detail"]

def test_vision_invalid_image():
    # Empty base64
    res_empty = client.post(
        "/api/camera/identify-json",
        json={"image_base64": "", "mime_type": "image/jpeg"},
    )
    assert res_empty.status_code == 400

    # Corrupt non-image data
    res_corrupt = client.post(
        "/api/camera/identify-json",
        json={
            "image_base64": "data:image/jpeg;base64,bm90LWF2YWxpZC1pbWFnZS1ieXRlcw==",
            "mime_type": "image/jpeg",
        },
    )
    assert res_corrupt.status_code == 400
    assert "Invalid" in res_corrupt.json()["detail"] or "corrupted" in res_corrupt.json()["detail"]

def test_vision_missing_credentials(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "")

    res = client.post(
        "/api/camera/identify-json",
        json={
            "image_base64": SAMPLE_TINY_JPEG_B64,
            "mime_type": "image/jpeg",
        },
    )
    # When credentials are missing and service is unmocked, it fails safely with 500 without leaking secrets
    assert res.status_code in (400, 500)
    assert "AIza" not in res.text
