import React, { createContext, useContext, useEffect, useState } from "react";
import type { Session, User as SupabaseAuthUser } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured, getSupabaseConfigStatus } from "../services/supabase";
import type { UserProfile } from "../types";

export interface AuthContextType {
  session: Session | null;
  authUser: SupabaseAuthUser | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isConfigured: boolean;
  configMessage?: string;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<{ success: boolean; needsVerification?: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  refreshProfile: () => Promise<void>;
  updateProfileData: (data: Partial<UserProfile>) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [authUser, setAuthUser] = useState<SupabaseAuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const configStatus = getSupabaseConfigStatus();

  async function fetchProfile(userId: string, email?: string): Promise<UserProfile | null> {
    if (!supabase) return null;

    try {
      const { data, error: profileErr } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileErr) {
        // If profile doesn't exist yet, insert a default zero-state profile
        if (profileErr.code === "PGRST116") {
          const defaultName = email ? email.split("@")[0] : "ಕನ್ನಡ ಕಲಿ";
          const newProfile: Partial<UserProfile> = {
            id: userId,
            email: email || "",
            displayName: defaultName,
            avatarChar: defaultName.charAt(0).toUpperCase() || "ಅ",
            level: "Beginner",
            dailyGoalMinutes: 15,
            learningMotivation: "Everyday conversations",
            preferredSituations: ["daily", "food", "travel"],
            xp: 0,
            points: 0,
            currentStreak: 0,
            bestStreak: 0,
            lastActiveDate: new Date().toISOString().split("T")[0],
            isPublicLeaderboard: true,
            isOnboarded: false,
            isAuthenticated: true,
            createdAt: new Date().toISOString(),
          };

          const { data: inserted, error: insertErr } = await supabase
            .from("profiles")
            .insert({
              id: userId,
              email: email || "",
              display_name: defaultName,
              kannada_level: "Beginner",
              daily_goal_minutes: 15,
              xp_balance: 0,
              points_balance: 0,
              current_streak: 0,
              best_streak: 0,
              is_public_leaderboard: true,
            })
            .select()
            .single();

          if (!insertErr && inserted) {
            return {
              id: inserted.id,
              email: inserted.email,
              displayName: inserted.display_name,
              avatarChar: (inserted.display_name || "ಅ").charAt(0).toUpperCase(),
              level: inserted.kannada_level,
              dailyGoalMinutes: inserted.daily_goal_minutes,
              learningMotivation: inserted.learning_motivation || "Everyday conversations",
              preferredSituations: inserted.preferred_situations || ["daily", "food", "travel"],
              xp: inserted.xp_balance || 0,
              points: inserted.points_balance || 0,
              currentStreak: inserted.current_streak || 0,
              bestStreak: inserted.best_streak || 0,
              lastActiveDate: inserted.last_activity_date,
              isPublicLeaderboard: inserted.is_public_leaderboard,
              isOnboarded: inserted.xp_balance > 0 || Boolean(inserted.learning_motivation),
              isAuthenticated: true,
              createdAt: inserted.created_at,
            };
          }
          return newProfile as UserProfile;
        }
        console.warn("Could not fetch profile from Supabase:", profileErr.message);
        return null;
      }

      return {
        id: data.id,
        email: data.email,
        displayName: data.display_name,
        avatarChar: (data.display_name || "ಅ").charAt(0).toUpperCase(),
        level: data.kannada_level || "Beginner",
        dailyGoalMinutes: data.daily_goal_minutes || 15,
        learningMotivation: data.learning_motivation || "Everyday conversations",
        preferredSituations: data.preferred_situations || ["daily", "food", "travel"],
        xp: data.xp_balance || 0,
        points: data.points_balance || 0,
        currentStreak: data.current_streak || 0,
        bestStreak: data.best_streak || 0,
        lastActiveDate: data.last_activity_date,
        isPublicLeaderboard: data.is_public_leaderboard ?? true,
        isOnboarded: Boolean(data.learning_motivation && data.daily_goal_minutes),
        isAuthenticated: true,
        createdAt: data.created_at,
      };
    } catch (err) {
      console.error("Exception loading user profile:", err);
      return null;
    }
  }

  // Initial session restoration and auth state subscription
  useEffect(() => {
    let mounted = true;

    if (!supabase || !isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    async function initAuth() {
      try {
        const { data: { session: initialSession }, error: sessionError } =
          await supabase!.auth.getSession();

        if (sessionError) {
          console.error("Session retrieval error:", sessionError);
        }

        if (mounted) {
          if (initialSession?.user) {
            setSession(initialSession);
            setAuthUser(initialSession.user);
            const userProf = await fetchProfile(
              initialSession.user.id,
              initialSession.user.email
            );
            if (mounted) setProfile(userProf);
          } else {
            setSession(null);
            setAuthUser(null);
            setProfile(null);
          }
          setIsLoading(false);
        }
      } catch (e) {
        console.error("Auth init failure:", e);
        if (mounted) setIsLoading(false);
      }
    }

    initAuth();

    // Listen for auth state changes (sign in, sign out, token refresh, password reset)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;

        if (event === "SIGNED_OUT") {
          setSession(null);
          setAuthUser(null);
          setProfile(null);
          setIsLoading(false);
          return;
        }

        if (newSession?.user) {
          setSession(newSession);
          setAuthUser(newSession.user);
          const userProf = await fetchProfile(newSession.user.id, newSession.user.email);
          if (mounted) {
            setProfile(userProf);
            setIsLoading(false);
          }
        } else {
          setSession(null);
          setAuthUser(null);
          setProfile(null);
          setIsLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    setError(null);
    if (!supabase || !isSupabaseConfigured) {
      const msg = "Supabase Auth is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env to enable live sign-in.";
      setError(msg);
      return { success: false, error: msg };
    }

    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authErr) {
        setError(authErr.message);
        return { success: false, error: authErr.message };
      }

      if (data.session && data.user) {
        setSession(data.session);
        setAuthUser(data.user);
        const userProf = await fetchProfile(data.user.id, data.user.email);
        setProfile(userProf);
        return { success: true };
      }

      return { success: false, error: "Authentication failed. No active session returned." };
    } catch (e: any) {
      const msg = e.message || "An unexpected error occurred during sign-in.";
      setError(msg);
      return { success: false, error: msg };
    }
  }

  async function signUp(email: string, password: string, displayName: string) {
    setError(null);
    if (!supabase || !isSupabaseConfigured) {
      const msg = "Supabase Auth is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env.";
      setError(msg);
      return { success: false, error: msg };
    }

    try {
      const cleanEmail = email.trim();
      const cleanName = displayName.trim() || cleanEmail.split("@")[0];

      const { data, error: authErr } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            display_name: cleanName,
          },
        },
      });

      if (authErr) {
        setError(authErr.message);
        return { success: false, error: authErr.message };
      }

      // Check if email confirmation is required by Supabase
      if (data.user && !data.session) {
        return {
          success: true,
          needsVerification: true,
        };
      }

      if (data.session && data.user) {
        setSession(data.session);
        setAuthUser(data.user);
        const userProf = await fetchProfile(data.user.id, data.user.email);
        setProfile(userProf);
        return { success: true, needsVerification: false };
      }

      return { success: true, needsVerification: true };
    } catch (e: any) {
      const msg = e.message || "An unexpected error occurred during registration.";
      setError(msg);
      return { success: false, error: msg };
    }
  }

  async function signOut() {
    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.error("Sign-out error:", e);
      }
    }
    setSession(null);
    setAuthUser(null);
    setProfile(null);
  }

  async function resetPassword(email: string) {
    setError(null);
    if (!supabase || !isSupabaseConfigured) {
      const msg = "Supabase Auth is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env.";
      setError(msg);
      return { success: false, error: msg };
    }

    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });

      if (resetErr) {
        setError(resetErr.message);
        return { success: false, error: resetErr.message };
      }

      return { success: true };
    } catch (e: any) {
      const msg = e.message || "Could not process password recovery request.";
      setError(msg);
      return { success: false, error: msg };
    }
  }

  async function updatePassword(newPassword: string) {
    setError(null);
    if (!supabase || !isSupabaseConfigured) {
      return { success: false, error: "Supabase is not configured." };
    }

    try {
      const { error: updateErr } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateErr) {
        setError(updateErr.message);
        return { success: false, error: updateErr.message };
      }

      return { success: true };
    } catch (e: any) {
      const msg = e.message || "Password update failed.";
      setError(msg);
      return { success: false, error: msg };
    }
  }

  async function refreshProfile() {
    if (authUser) {
      const prof = await fetchProfile(authUser.id, authUser.email);
      setProfile(prof);
    }
  }

  async function updateProfileData(data: Partial<UserProfile>): Promise<{ success: boolean; error?: string }> {
    if (!supabase || !authUser) {
      return { success: false, error: "User is not authenticated with Supabase." };
    }

    try {
      const dbUpdates: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (data.displayName !== undefined) dbUpdates.display_name = data.displayName;
      if (data.level !== undefined) dbUpdates.kannada_level = data.level;
      if (data.dailyGoalMinutes !== undefined) dbUpdates.daily_goal_minutes = data.dailyGoalMinutes;
      if (data.learningMotivation !== undefined) dbUpdates.learning_motivation = data.learningMotivation;
      if (data.preferredSituations !== undefined) dbUpdates.preferred_situations = data.preferredSituations;
      if (data.isPublicLeaderboard !== undefined) dbUpdates.is_public_leaderboard = data.isPublicLeaderboard;

      const { error: updErr } = await supabase
        .from("profiles")
        .update(dbUpdates)
        .eq("id", authUser.id);

      if (updErr) {
        return { success: false, error: updErr.message };
      }

      await refreshProfile();
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || "Failed to update profile." };
    }
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        authUser,
        profile,
        isLoading,
        isConfigured: isSupabaseConfigured,
        configMessage: configStatus.message,
        error,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updatePassword,
        refreshProfile,
        updateProfileData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
