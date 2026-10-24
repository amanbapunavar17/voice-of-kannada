import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith("https://") &&
  !supabaseUrl.includes("your-project") &&
  !supabaseAnonKey.includes("your-anon-key")
);

export let supabase: SupabaseClient | null = null;

if (isSupabaseConfigured) {
  try {
    supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "maatu_supabase_auth_token",
      },
    });
  } catch (error) {
    console.error("Failed to initialize Supabase client:", error);
    supabase = null;
  }
}

export function getSupabaseConfigStatus(): {
  configured: boolean;
  urlConfigured: boolean;
  anonKeyConfigured: boolean;
  message?: string;
} {
  const urlConfigured = Boolean(
    supabaseUrl && supabaseUrl.startsWith("https://") && !supabaseUrl.includes("your-project")
  );
  const anonKeyConfigured = Boolean(
    supabaseAnonKey && !supabaseAnonKey.includes("your-anon-key")
  );

  return {
    configured: isSupabaseConfigured,
    urlConfigured,
    anonKeyConfigured,
    message: isSupabaseConfigured
      ? "Supabase connected"
      : "Supabase credentials not configured in frontend/.env (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required for live cloud auth).",
  };
}
