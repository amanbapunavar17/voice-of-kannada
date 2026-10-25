import { getSupabaseClient, supabase } from "./supabase";

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
  async checkHealth(): Promise<{ status: string; ai_configured: boolean; supabase_configured?: boolean }> {
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

  async getLeaderboard(): Promise<{ weekly: any[]; all_time: any[] } | null> {
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

  async getRewards(): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/rewards`, {
        signal: AbortSignal.timeout(4000),
      });
      if (response.ok) return await response.json();
      return [];
    } catch {
      return [];
    }
  },

  async redeemReward(params: {
    rewardId: string;
    shippingName: string;
    shippingContact: string;
    shippingCity: string;
    notes?: string;
  }): Promise<{ success: boolean; order_id?: string; error?: string }> {
    const authHeaders = await getAuthHeader();

    const response = await fetch(`${API_BASE_URL}/api/redeem`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify({
        reward_id: params.rewardId,
        shipping_name: params.shippingName,
        shipping_contact: params.shippingContact,
        shipping_city: params.shippingCity,
        notes: params.notes,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || "Redemption request failed");
    }

    return await response.json();
  },

  async recordLessonProgress(lessonId: string, scorePercent: number = 100): Promise<{
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
      body: JSON.stringify({
        lesson_id: lessonId,
        score_percent: scorePercent,
        xp_reward: 20,
        points_reward: 5,
      }),
      signal: AbortSignal.timeout(6000),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || "Failed to sync lesson progress");
    }

    return await response.json();
  },
};
