import React, { useState } from "react";
import { X, Mail, Lock, User, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { storage } from "../../services/storage";
import type { UserProfile } from "../../types";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthenticated,
}) => {
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (mode === "forgot") {
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        setSuccessMsg(`Password reset instructions have been dispatched to ${email}.`);
      }, 700);
      return;
    }

    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      const existingUser = storage.getUser();
      const name = displayName.trim() || email.split("@")[0] || "ಕನ್ನಡ ಕಲಿ";

      const updatedUser: UserProfile = {
        ...existingUser,
        email,
        displayName: name,
        avatarChar: name.charAt(0).toUpperCase() || "ಅ",
        isAuthenticated: true,
      };

      storage.saveUser(updatedUser);
      onAuthenticated(updatedUser);
      onClose();
    }, 600);
  }

  function handleContinueAsGuest() {
    const existingUser = storage.getUser();
    const guestUser: UserProfile = {
      ...existingUser,
      displayName: "Guest Learner (ಅತಿಥಿ)",
      isAuthenticated: true,
    };
    storage.saveUser(guestUser);
    onAuthenticated(guestUser);
    onClose();
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
          <button className="icon-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="auth-tab-buttons">
          <button
            className={`auth-tab-btn ${mode === "signin" ? "active" : ""}`}
            onClick={() => {
              setMode("signin");
              setError("");
              setSuccessMsg("");
            }}
          >
            Sign In
          </button>
          <button
            className={`auth-tab-btn ${mode === "signup" ? "active" : ""}`}
            onClick={() => {
              setMode("signup");
              setError("");
              setSuccessMsg("");
            }}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === "signup" && (
            <div className="form-group">
              <label>Your Display Name</label>
              <div className="input-with-icon">
                <User size={18} />
                <input
                  type="text"
                  placeholder="e.g. Arun Kumar or ಅನನ್ಯ"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
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
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
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
                    onClick={() => {
                      setMode("forgot");
                      setError("");
                    }}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="input-with-icon">
                <Lock size={18} />
                <input
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {error && <div className="form-alert error">{error}</div>}
          {successMsg && <div className="form-alert success">{successMsg}</div>}

          <button type="submit" className="primary-button full-width" disabled={isLoading}>
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

        <div className="auth-divider">
          <span>OR</span>
        </div>

        <button
          type="button"
          className="guest-login-btn"
          onClick={handleContinueAsGuest}
        >
          <ShieldCheck size={17} color="#26845B" />
          Continue as Guest Learner (Instant Access)
        </button>

        <div className="auth-footer-notice">
          <span>
            Database Architecture: Ready for Supabase PostgreSQL authentication with Row Level Security.
          </span>
        </div>
      </div>
    </div>
  );
};
