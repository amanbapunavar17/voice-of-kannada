import React, { useState, useEffect } from "react";
import { X, Mail, Lock, User, ArrowRight, Sparkles, AlertCircle, CheckCircle2, ShieldAlert } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { signIn, signUp, resetPassword, isConfigured, configMessage } = useAuth();

  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Reset all fields when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setEmail("");
      setPassword("");
      setDisplayName("");
      setError("");
      setSuccessMsg("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  function switchMode(newMode: "signin" | "signup" | "forgot") {
    setMode(newMode);
    setEmail("");
    setPassword("");
    setDisplayName("");
    setError("");
    setSuccessMsg("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!isConfigured) {
      setError(
        "Supabase credentials are not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to frontend/.env (save the file and restart Vite dev server)."
      );
      return;
    }

    if (mode === "forgot") {
      setIsLoading(true);
      try {
        const result = await resetPassword(cleanEmail);
        setIsLoading(false);
        if (result.success) {
          setSuccessMsg(
            `Password recovery link has been sent to ${cleanEmail}. Please check your inbox.`
          );
        } else {
          setError(result.error || "Failed to send reset email.");
        }
      } catch (err: any) {
        setIsLoading(false);
        setError(err.message || "An unexpected error occurred.");
      }
      return;
    }

    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setIsLoading(true);

    try {
      if (mode === "signin") {
        const result = await signIn(cleanEmail, password);
        setIsLoading(false);
        if (result.success) {
          if (onSuccess) onSuccess();
          onClose();
        } else {
          setError(result.error || "Invalid login credentials.");
        }
      } else {
        // Sign up
        const result = await signUp(cleanEmail, password, displayName);
        setIsLoading(false);
        if (result.success) {
          if (result.needsVerification) {
            setSuccessMsg(
              `Account created! A confirmation email has been sent to ${cleanEmail}. Please verify your email before logging in.`
            );
          } else {
            if (onSuccess) onSuccess();
            onClose();
          }
        } else {
          setError(result.error || "Registration could not be completed.");
        }
      }
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || "Authentication error occurred.");
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card auth-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="brand-mark-mini">
              <Sparkles size={16} />
            </span>
            <h3>
              {mode === "signin"
                ? "Welcome Back to Maatu"
                : mode === "signup"
                ? "Join Voice of Kannada"
                : "Reset Your Password"}
            </h3>
          </div>
          <button className="icon-close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Warning banner is displayed ONLY if credentials are missing or invalid */}
        {!isConfigured && (
          <div className="form-alert warning" style={{ marginBottom: "1rem" }}>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
              <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
              <div>
                <strong>Supabase Authentication Required:</strong>
                <p style={{ margin: "4px 0 0", fontSize: "0.85rem" }}>
                  {configMessage || "Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env to enable live sign-in."}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="auth-tab-buttons">
          <button
            type="button"
            className={`auth-tab-btn ${mode === "signin" ? "active" : ""}`}
            onClick={() => switchMode("signin")}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${mode === "signup" ? "active" : ""}`}
            onClick={() => switchMode("signup")}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form" autoComplete="off">
          {mode === "signup" && (
            <div className="form-group">
              <label>Your Display Name</label>
              <div className="input-with-icon">
                <User size={18} />
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  autoComplete="off"
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Email Address</label>
            <div className="input-with-icon">
              <Mail size={18} />
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>

          {mode !== "forgot" && (
            <div className="form-group">
              <div className="label-with-action">
                <label>Password</label>
                {mode === "signin" && (
                  <button
                    type="button"
                    className="text-link-btn"
                    onClick={() => switchMode("forgot")}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="input-with-icon">
                <Lock size={18} />
                <input
                  type="password"
                  placeholder="Enter your password (min 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="form-alert error" role="alert">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="form-alert success" role="status">
              <CheckCircle2 size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          <button
            type="submit"
            className="primary-button full-width"
            disabled={isLoading || !isConfigured}
          >
            {isLoading
              ? "Connecting..."
              : mode === "signin"
              ? "Sign In to Maatu"
              : mode === "signup"
              ? "Start My Kannada Journey"
              : "Send Reset Link"}
            <ArrowRight size={17} />
          </button>
        </form>

        <div className="auth-footer-notice">
          <span>
            Secured by Supabase Auth & PostgreSQL Row Level Security (RLS).
          </span>
        </div>
      </div>
    </div>
  );
};
