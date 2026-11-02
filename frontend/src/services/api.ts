import { getSupabaseClient, supabase } from "./supabase";
import type {
  ConversationMode,
  PronunciationSentence,
  PronunciationAssessmentResult,
  RealWorldMission,
  MissionEvaluationResult,
  CameraDetectedWord,
  LearnerSkillsProfile,
  PersonalMistakeItem,
  AdaptiveLessonData,
  RegionalDialect,
  CrossRegionalComparison,
  NaturalTranslationData,
  SentenceBreakdownData,
  SavedPhraseRecord,
  LeaderboardEntry,
} from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export interface PracticeApiResponse {
  status: string;
  recognized_text: string;
  reply_kannada: string;
  reply_english: string;
  authenticated?: boolean;
}

export interface ScenarioApiResponse {
  id: string;
  title: string;
  kannada: string;
  description: string;
  greeting: string;
  meaning: string;
}

async function getAuthHeader(): Promise<Record<string, string>> {
  const client = getSupabaseClient() || supabase;
  if (client) {
    try {
      const { data: { session } } = await client.auth.getSession();
      if (session?.access_token) {
        return {
          Authorization: `Bearer ${session.access_token}`,
        };
      }
    } catch (e) {
      console.warn("Could not retrieve Supabase session token:", e);
    }
  }
  return {};
}

export const api = {
  async checkHealth(): Promise<{ status: string; ai_configured: boolean; supabase_configured?: boolean; models?: string[] }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`, {
        signal: AbortSignal.timeout(4000),
      });
      if (!response.ok) throw new Error("Health check failed");
      return await response.json();
    } catch {
      return { status: "offline", ai_configured: false };
    }
  },

  async getScenarios(): Promise<ScenarioApiResponse[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/scenarios`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new Error("Failed to fetch scenarios");
      return await response.json();
    } catch (e) {
      console.warn("Backend scenarios unavailable, using local fallback", e);
      return [];
    }
  },

  async sendPractice(scenarioId: string, text: string): Promise<PracticeApiResponse> {
    const authHeaders = await getAuthHeader();

    const response = await fetch(`${API_BASE_URL}/api/practice`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify({
        scenario_id: scenarioId,
        recognized_text: text,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `AI Practice API returned HTTP status ${response.status}`
      );
    }

    return await response.json();
  },

  // ==========================================
  // FEATURE 01: MAATHU AI KANNADA COMPANION
  // ==========================================
  async sendConversationMessage(
    sessionId: string,
    message: string,
    situationId: string = "daily",
    learningMode: ConversationMode = "beginner",
  ): Promise<{
    status: string;
    session_id: string;
    reply_kannada: string;
    transliteration: string;
    reply_english: string;
    understood_intent: string;
    is_comprehensible: boolean;
    natural_kannada_alternative?: string;
    grammar_notes?: string;
    suggested_replies: string[];
    followup_question?: string;
    turns_count: number;
    authenticated?: boolean;
  }> {
    const authHeaders = await getAuthHeader();
    const response = await fetch(`${API_BASE_URL}/api/conversation/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify({
        session_id: sessionId,
        message,
        situation_id: situationId,
        learning_mode: learningMode,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Conversation request failed (${response.status})`);
    }
    return await response.json();
  },

  async getConversationSummary(sessionId: string): Promise<any> {
    const authHeaders = await getAuthHeader();
    const response = await fetch(`${API_BASE_URL}/api/conversation/summary`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify({ session_id: sessionId }),
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error("Failed to generate conversation summary");
    return await response.json();
  },

  // ==========================================
  // FEATURE 02: PRONUNCIATION INTELLIGENCE
  // ==========================================
  async getPronunciationSentences(): Promise<PronunciationSentence[]> {
    const response = await fetch(`${API_BASE_URL}/api/pronunciation/sentences`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error("Failed to fetch pronunciation sentences");
    return await response.json();
  },

  async assessPronunciation(
    targetKannada: string,
    targetTransliteration: string,
    targetEnglish: string,
    recognizedTranscript: string,
  ): Promise<PronunciationAssessmentResult> {
    const authHeaders = await getAuthHeader();
    const response = await fetch(`${API_BASE_URL}/api/pronunciation/assess`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify({
        target_kannada: targetKannada,
        target_transliteration: targetTransliteration,
        target_english: targetEnglish,
        recognized_transcript: recognizedTranscript,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || "Pronunciation assessment failed");
    }
    return await response.json();
  },

  // ==========================================
  // FEATURE 03: REAL-WORLD MISSIONS
  // ==========================================
  async getMissions(): Promise<RealWorldMission[]> {
    const response = await fetch(`${API_BASE_URL}/api/missions`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error("Failed to fetch roleplay missions");
    return await response.json();
  },

  async sendMissionTurn(
    missionId: string,
    userMessage: string,
    history: Array<{ sender: string; text: string }>,
  ): Promise<{
    character_reply_kannada: string;
    character_transliteration: string;
    character_reply_english: string;
    character_mood: string;
    objective_progress_percent: number;
    is_objective_completed: boolean;
    feedback_for_learner?: string;
  }> {
    const response = await fetch(`${API_BASE_URL}/api/missions/turn`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mission_id: missionId,
        user_message: userMessage,
        history,
      }),
      signal: AbortSignal.timeout(25000),
    });
    if (!response.ok) throw new Error("Mission turn failed");
    return await response.json();
  },

  async evaluateMission(
    missionId: string,
    fullTranscript: Array<{ sender: string; text: string }>,
  ): Promise<MissionEvaluationResult> {
    const authHeaders = await getAuthHeader();
    const response = await fetch(`${API_BASE_URL}/api/missions/evaluate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify({
        mission_id: missionId,
        full_transcript: fullTranscript,
      }),
      signal: AbortSignal.timeout(25000),
    });
    if (!response.ok) throw new Error("Mission evaluation failed");
    return await response.json();
  },

  // ==========================================
  // FEATURE 04: CAMERA-BASED LEARNING
  // ==========================================
  async identifyCameraImage(file: File): Promise<CameraDetectedWord> {
    const authHeaders = await getAuthHeader();
    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch(`${API_BASE_URL}/api/camera/identify`, {
      method: "POST",
      headers: {
        ...authHeaders,
      },
      body: formData,
      signal: AbortSignal.timeout(35000),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || "Image analysis failed");
    }
    return await response.json();
  },

  async identifyCameraBase64(base64Data: string, mimeType: string = "image/jpeg"): Promise<CameraDetectedWord> {
    const authHeaders = await getAuthHeader();
    const response = await fetch(`${API_BASE_URL}/api/camera/identify-json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify({
        image_base64: base64Data,
        mime_type: mimeType,
      }),
      signal: AbortSignal.timeout(35000),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || "Base64 image analysis failed");
    }
    return await response.json();
  },

  // ==========================================
  // FEATURE 05: LEARNER INTELLIGENCE & TUTOR
  // ==========================================
  async getLearnerSkills(): Promise<LearnerSkillsProfile> {
    const authHeaders = await getAuthHeader();
    const response = await fetch(`${API_BASE_URL}/api/tutor/skills`, {
      headers: authHeaders,
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) throw new Error("Failed to fetch learner skills");
    return await response.json();
  },

  async getPersonalMistakes(): Promise<PersonalMistakeItem[]> {
    const authHeaders = await getAuthHeader();
    const response = await fetch(`${API_BASE_URL}/api/tutor/mistakes`, {
      headers: authHeaders,
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) throw new Error("Failed to fetch personal mistakes");
    return await response.json();
  },

  async recordMistake(mistake: {
    category: string;
    original_expression: string;
    suggested_correction: string;
    explanation: string;
  }): Promise<void> {
    const authHeaders = await getAuthHeader();
    await fetch(`${API_BASE_URL}/api/tutor/mistake/record`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify(mistake),
    });
  },

  async getAdaptiveExercise(weaknessTopic: string, level: string = "Beginner"): Promise<AdaptiveLessonData> {
    const response = await fetch(`${API_BASE_URL}/api/tutor/exercise`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weakness_topic: weaknessTopic, user_level: level }),
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error("Failed to generate adaptive exercise");
    return await response.json();
  },

  async getFluencyScorecard(): Promise<LearnerSkillsProfile> {
    const authHeaders = await getAuthHeader();
    const response = await fetch(`${API_BASE_URL}/api/fluency/scorecard`, {
      headers: authHeaders,
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) throw new Error("Failed to fetch fluency scorecard");
    const data = await response.json();
    return data.scorecard;
  },

  // ==========================================
  // FEATURE 06: REGIONAL KANNADA EXPLORER
  // ==========================================
  async getRegionalDialects(): Promise<RegionalDialect[]> {
    const response = await fetch(`${API_BASE_URL}/api/regional/dialects`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error("Failed to fetch regional dialects");
    return await response.json();
  },

  async getRegionalComparisons(): Promise<CrossRegionalComparison[]> {
    const response = await fetch(`${API_BASE_URL}/api/regional/comparisons`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error("Failed to fetch regional comparisons");
    return await response.json();
  },

  // ==========================================
  // SUPPORTING: TRANSLATOR, SENTENCE INTEL, PHRASEBOOK
  // ==========================================
  async translateNatural(englishText: string): Promise<NaturalTranslationData> {
    const response = await fetch(`${API_BASE_URL}/api/translator`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ english_text: englishText }),
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error("Natural translation failed");
    return await response.json();
  },

  async breakdownSentence(kannadaSentence: string): Promise<SentenceBreakdownData> {
    const response = await fetch(`${API_BASE_URL}/api/sentence/breakdown`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kannada_sentence: kannadaSentence }),
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error("Sentence breakdown failed");
    return await response.json();
  },

  async getSavedPhrases(): Promise<SavedPhraseRecord[]> {
    const authHeaders = await getAuthHeader();
    const response = await fetch(`${API_BASE_URL}/api/phrasebook`, {
      headers: authHeaders,
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) throw new Error("Failed to fetch phrasebook");
    return await response.json();
  },

  async savePhrase(phrase: {
    kannada_text: string;
    transliteration: string;
    english_meaning: string;
    category?: string;
    formality_level?: string;
    source?: string;
  }): Promise<{ success: boolean; message?: string }> {
    const authHeaders = await getAuthHeader();
    const response = await fetch(`${API_BASE_URL}/api/phrasebook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify(phrase),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error("Failed to save phrase");
    return await response.json();
  },

  async getUserProgress(): Promise<string[]> {
    const authHeaders = await getAuthHeader();
    try {
      const response = await fetch(`${API_BASE_URL}/api/user/progress`, {
        headers: authHeaders,
        signal: AbortSignal.timeout(6000),
      });
      if (response.ok) {
        const data = await response.json();
        return data.completed_lessons || [];
      }
    } catch (e) {
      console.warn("Could not fetch remote user progress:", e);
    }
    return [];
  },

  // ==========================================
  // EXISTING CERTIFICATES, LEADERBOARD, REDEMPTION
  // ==========================================
  async verifyCertificate(certId: string): Promise<{
    found: boolean;
    certificate?: {
      id: string;
      course_title: string;
      course_title_kannada: string;
      learner_name: string;
      issued_date: string;
      status: string;
      issuer: string;
      score_percent?: number;
      criteria_met?: string[];
    };
  }> {
    const response = await fetch(`${API_BASE_URL}/api/verify-certificate/${encodeURIComponent(certId)}`, {
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { found: false };
      }
      throw new Error(`Certificate lookup failed with status ${response.status}`);
    }

    return await response.json();
  },

  async getLeaderboard(): Promise<{
    weekly: LeaderboardEntry[];
    all_time: LeaderboardEntry[];
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/leaderboard`, {
        signal: AbortSignal.timeout(6000),
      });
      if (!response.ok) throw new Error("Leaderboard API returned error");
      const raw = await response.json();
      const mapItem = (p: any): LeaderboardEntry => ({
        rank: p.rank,
        displayName: p.display_name || p.displayName || "ಕನ್ನಡ ಕಲಿ",
        xp: p.xp || 0,
        level: p.level || "Beginner",
        streak: p.streak || 0,
        avatarChar: p.avatar_char || p.avatarChar || "ಅ",
      });
      return {
        weekly: (raw.weekly || []).map(mapItem),
        all_time: (raw.all_time || []).map(mapItem),
      };
    } catch {
      return { weekly: [], all_time: [] };
    }
  },

  async getRewards(): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/rewards`, {
        signal: AbortSignal.timeout(6000),
      });
      if (!response.ok) throw new Error("Rewards API returned error");
      return await response.json();
    } catch {
      return [];
    }
  },

  async redeemReward(data: {
    reward_id: string;
    shipping_name: string;
    shipping_contact: string;
    shipping_city: string;
    notes?: string;
  }): Promise<{
    success: boolean;
    order_id?: string;
    message?: string;
  }> {
    const authHeaders = await getAuthHeader();

    const response = await fetch(`${API_BASE_URL}/api/redeem`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(12000),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || "Redemption request failed");
    }

    return await response.json();
  },

  async recordLessonProgress(data: {
    lesson_id: string;
    score_percent: number;
    xp_reward: number;
    points_reward: number;
  }): Promise<{
    success: boolean;
    first_time: boolean;
    xp_awarded: number;
    points_awarded: number;
  }> {
    const authHeaders = await getAuthHeader();

    const response = await fetch(`${API_BASE_URL}/api/progress/lesson`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to sync lesson progress to Supabase");
    }

    return await response.json();
  },

  async getChallenges(): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/challenges`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new Error("Challenges API error");
      return await response.json();
    } catch {
      return [];
    }
  },

  async transcribeAudio(audioBlob: Blob): Promise<{ transcript_kannada: string; transcript_english?: string }> {
    const formData = new FormData();
    formData.append("audio_file", audioBlob, "recording.webm");

    const authHeaders = await getAuthHeader();
    const response = await fetch(`${API_BASE_URL}/api/transcribe`, {
      method: "POST",
      headers: {
        ...authHeaders,
      },
      body: formData,
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || "Audio transcription service failed.");
    }

    return await response.json();
  },
};
