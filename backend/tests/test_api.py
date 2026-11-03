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
