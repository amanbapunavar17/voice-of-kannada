import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Sanitizes environment variable strings:
 * - Trims whitespace
 * - Strips enclosing single or double quotes
 */
function cleanEnv(val: unknown): string {
  if (typeof val !== "string") return "";
  let clean = val.trim();
  if (
    (clean.startsWith('"') && clean.endsWith('"')) ||
    (clean.startsWith("'") && clean.endsWith("'"))
  ) {
    clean = clean.slice(1, -1).trim();
  }
  return clean;
}

export function getSupabaseUrl(): string {
  const url = cleanEnv(import.meta.env.VITE_SUPABASE_URL);
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export function getSupabaseAnonKey(): string {
  return cleanEnv(import.meta.env.VITE_SUPABASE_ANON_KEY);
}

/**
 * Validates whether Supabase credentials have been configured:
 * 1. Both URL and Anon Key must be non-empty strings.
 * 2. Must not be the template placeholders ("your-project", "your-anon-key").
 * 3. URL must start with http:// or https://.
 * 4. Anon key must have a reasonable length (> 15 chars).
 */
export function checkIsSupabaseConfigured(): boolean {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();

  if (!url || !key) return false;
  if (url.includes("your-project") || key.includes("your-anon-key")) return false;
  if (!url.startsWith("http://") && !url.startsWith("https://")) return false;
  if (key.length < 15) return false;

  return true;
}

export const isSupabaseConfigured = checkIsSupabaseConfigured();

let clientInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (clientInstance) return clientInstance;

  if (checkIsSupabaseConfigured()) {
    const url = getSupabaseUrl();
    const key = getSupabaseAnonKey();

    try {
      clientInstance = createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storageKey: "maatu_supabase_auth_token",
        },
      });
      return clientInstance;
    } catch (error) {
      console.error("Failed to initialize Supabase client:", error);
      clientInstance = null;
      return null;
    }
  }

  return null;
}

// Default export instance
export const supabase: SupabaseClient | null = getSupabaseClient();

export function getSupabaseConfigStatus(): {
  configured: boolean;
  urlConfigured: boolean;
  anonKeyConfigured: boolean;
  message?: string;
} {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();

  const urlConfigured = Boolean(
    url &&
    (url.startsWith("http://") || url.startsWith("https://")) &&
    !url.includes("your-project")
  );

  const anonKeyConfigured = Boolean(
    key &&
    key.length >= 15 &&
    !key.includes("your-anon-key")
  );

  const configured = urlConfigured && anonKeyConfigured;

  let message = "Supabase connected";
  if (!configured) {
    if (!urlConfigured && !anonKeyConfigured) {
      message = "Supabase credentials not configured in frontend/.env (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required for live cloud auth).";
    } else if (!urlConfigured) {
      message = "VITE_SUPABASE_URL in frontend/.env is missing or invalid (must start with https:// or http://).";
    } else {
      message = "VITE_SUPABASE_ANON_KEY in frontend/.env is missing or invalid.";
    }
  }

  return {
    configured,
    urlConfigured,
    anonKeyConfigured,
    message,
  };
}
