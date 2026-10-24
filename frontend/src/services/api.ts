const API_BASE_URL = "http://127.0.0.1:8000";

export interface PracticeApiResponse {
  status: string;
  recognized_text: string;
  reply_kannada: string;
  reply_english: string;
}

export interface ScenarioApiResponse {
  id: string;
  title: string;
  kannada: string;
  description: string;
  greeting: string;
  meaning: string;
}

export const api = {
  async checkHealth(): Promise<{ status: string; ai_configured: boolean }> {
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
    const response = await fetch(`${API_BASE_URL}/api/practice`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        scenario_id: scenarioId,
        recognized_text: text,
      }),
      signal: AbortSignal.timeout(30000), // Gemini AI generation can take a few seconds
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `AI Practice API returned HTTP status ${response.status}`
      );
    }

    return await response.json();
  },

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
      score_percent: number;
      criteria_met: string[];
    };
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/verify-certificate/${encodeURIComponent(certId)}`, {
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        return await response.json();
      }
      return { found: false };
    } catch {
      return { found: false };
    }
  },

  async getChallenges(): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/challenges`, {
        signal: AbortSignal.timeout(4000),
      });
      if (response.ok) return await response.json();
      return [];
    } catch {
      return [];
    }
  },

  async getLeaderboard(): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/leaderboard`, {
        signal: AbortSignal.timeout(4000),
      });
      if (response.ok) return await response.json();
      return null;
    } catch {
      return null;
    }
  },
};
