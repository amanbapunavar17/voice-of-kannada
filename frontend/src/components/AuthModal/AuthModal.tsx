import React, { useState, useEffect } from "react";
import {
  X,
  Mail,
  Lock,
  User,
  ArrowRight,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  Eye,
  EyeOff,
  Compass,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface KarnatakaRegionPin {
  id: string;
  name: string;
  kannada: string;
  tagline: string;
  description: string;
  x: number;
  y: number;
  color: string;
  isCapital?: boolean;
}

const KARNATAKA_REGIONS: KarnatakaRegionPin[] = [
  {
    id: "kalaburagi",
    name: "Kalaburagi / Bidar",
    kannada: "ಕಲಬುರಗಿ / ಬೀದರ್",
    tagline: "Northern Forts & Bahmani Heritage",
    description: "ಗುಲ್ಬರ್ಗಾ ಕೋಟೆ, ಐತಿಹಾಸಿಕ ಪರಂಪರೆ ಮತ್ತು ವಿಶಿಷ್ಟ ಉತ್ತರ ಕರ್ನಾಟಕದ ಸೊಬಗು.",
    x: 198,
    y: 65,
    color: "#F5D77F",
  },
  {
    id: "hubballi",
    name: "Hubballi-Dharwad",
    kannada: "ಹುಬ್ಬಳ್ಳಿ-ಧಾರವಾಡ",
    tagline: "North Karnataka Gateway",
    description: "ಉತ್ತರ ಕರ್ನಾಟಕದ ಸಾಹಿತ್ಯ, ಧಾರವಾಡ ಪೇಡ ಮತ್ತು ಚುರುಕಿನ ವಾಣಿಜ್ಯ ಕೇಂದ್ರ.",
    x: 108,
    y: 145,
    color: "#F5D77F",
  },
  {
    id: "hampi",
    name: "Hampi / Ballari",
    kannada: "ಹಂಪಿ (ವಿಜಯನಗರ)",
    tagline: "UNESCO World Heritage",
    description: "ವಿಜಯನಗರ ಸಾಮ್ರಾಜ್ಯದ ಶಿಲ್ಪಕಲೆ, ಕಲ್ಲಿನ ರಥ ಮತ್ತು ವಿಶ್ವವಿಖ್ಯಾತ ವಾಸ್ತುಶಿಲ್ಪ.",
    x: 180,
    y: 175,
    color: "#FFA73B",
  },
  {
    id: "karavali",
    name: "Karavali / Mangaluru",
    kannada: "ಕರಾವಳಿ / ಮಂಗಳೂರು",
    tagline: "Coastal Beauty & Yakshagana",
    description: "ಅರೇಬಿಯನ್ ಸಮುದ್ರ ತೀರ, ಯಕ್ಷಗಾನ, ಕಂಬಳ ಮತ್ತು ಸಮೃದ್ಧ ತುಳುನಾಡ ಸಂಸ್ಕೃತಿ.",
    x: 78,
    y: 285,
    color: "#47BFFF",
  },
  {
    id: "bengaluru",
    name: "Bengaluru",
    kannada: "ಬೆಂಗಳೂರು",
    tagline: "Silicon Valley & State Capital",
    description: "ನಮ್ಮ ಬೆಂಗಳೂರು — ಗಾರ್ಡನ್ ಸಿಟಿ, ಐಟಿ ಹಬ್ ಮತ್ತು ಕನ್ನಡ ಸಂಸ್ಕೃತಿಯ ಸಂಗಮ.",
    x: 208,
    y: 305,
    color: "#FFD700",
    isCapital: true,
  },
  {
    id: "mysuru",
    name: "Mysuru",
    kannada: "ಮೈಸೂರು",
    tagline: "Cultural Capital & Palaces",
    description: "ಸಾಂಸ್ಕೃತಿಕ ರಾಜಧಾನಿ — ಅರಮನೆಗಳ ನಗರಿ, ವಿಶ್ವಪ್ರಸಿದ್ಧ ದಸರಾ ಮತ್ತು ಶ್ರೀಗಂಧದ ನಾಡು.",
    x: 155,
    y: 342,
    color: "#F5D77F",
  },
];

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
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRegionId, setSelectedRegionId] = useState<string>("bengaluru");

  // Reset all fields when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setEmail("");
      setPassword("");
      setDisplayName("");
      setError("");
      setSuccessMsg("");
      setShowPassword(false);
      setSelectedRegionId("bengaluru");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const activeRegion =
    KARNATAKA_REGIONS.find((r) => r.id === selectedRegionId) ||
    KARNATAKA_REGIONS[4]; // Default to Bengaluru

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
      <div
        className="modal-card auth-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        {/* Left Column: Karnataka Heritage Showcase & Interactive Map */}
        <div className="auth-karnataka-showcase">
          <div className="auth-showcase-header">
            <span className="auth-showcase-badge">
              <Compass size={13} />
              ನಮ್ಮ ಕರ್ನಾಟಕ · Voice of Kannada
            </span>
            <h2 className="auth-showcase-title">ಕನ್ನಡವೇ ಸತ್ಯ, ಕನ್ನಡವೇ ನಿತ್ಯ</h2>
            <p className="auth-showcase-sub">
              Don't just learn words. Speak, think, and communicate in authentic Kannada across 31 districts.
            </p>
          </div>

          {/* Karnataka State Vector Map */}
          <div className="karnataka-map-wrapper">
            <svg
              viewBox="0 0 320 390"
              className="karnataka-map-svg"
              xmlns="http://www.w3.org/2000/svg"
              aria-label="Interactive Map of Karnataka State"
            >
              <defs>
                <linearGradient id="authKarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1E5E4B" />
                  <stop offset="45%" stopColor="#144636" />
                  <stop offset="100%" stopColor="#0B2B20" />
                </linearGradient>

                <linearGradient id="goldContour" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#D4A64A" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#F5D77F" stopOpacity="1" />
                  <stop offset="100%" stopColor="#B3862A" stopOpacity="0.8" />
                </linearGradient>

                <filter id="authMapShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#000000" floodOpacity="0.6" />
                  <feDropShadow dx="0" dy="1" stdDeviation="3" floodColor="#D4A64A" floodOpacity="0.3" />
                </filter>
              </defs>

              {/* State boundary background halo */}
              <path
                d="M 185,25 
                   C 205,38 215,65 225,95 
                   C 230,120 205,140 215,160 
                   C 225,175 240,185 235,210 
                   C 230,230 215,245 235,265 
                   C 250,275 258,285 245,305 
                   C 235,320 210,330 185,355 
                   C 170,370 145,370 130,350 
                   C 115,335 95,315 80,295 
                   C 68,265 65,225 60,185 
                   C 55,150 68,125 90,105 
                   C 115,80 145,55 165,35 
                   Z"
                fill="url(#authKarGradient)"
                stroke="url(#goldContour)"
                strokeWidth="2.8"
                filter="url(#authMapShadow)"
                className="karnataka-state-shape"
              />

              {/* Arabian Sea Coastal Waves Indication */}
              <path
                d="M 52,220 Q 56,235 50,250 T 60,280"
                fill="none"
                stroke="rgba(71, 191, 255, 0.45)"
                strokeWidth="1.6"
                strokeDasharray="4 4"
              />
              <text x="36" y="245" fill="rgba(71, 191, 255, 0.75)" fontSize="9" fontWeight="600" transform="rotate(-75 36 245)">
                ಅರಬ್ಬಿ ಸಮುದ್ರ (Coast)
              </text>

              {/* River contours: Krishna, Tungabhadra, Kaveri */}
              <path
                d="M 90,120 Q 150,110 210,130"
                fill="none"
                stroke="rgba(212, 166, 74, 0.2)"
                strokeWidth="1.2"
                strokeDasharray="3 3"
              />
              <path
                d="M 100,190 Q 150,185 230,175"
                fill="none"
                stroke="rgba(212, 166, 74, 0.2)"
                strokeWidth="1.2"
                strokeDasharray="3 3"
              />
              <path
                d="M 120,330 Q 165,335 210,325"
                fill="none"
                stroke="rgba(212, 166, 74, 0.2)"
                strokeWidth="1.2"
                strokeDasharray="3 3"
              />

              {/* City Markers */}
              {KARNATAKA_REGIONS.map((region) => {
                const isSelected = region.id === selectedRegionId;
                return (
                  <g
                    key={region.id}
                    className={`map-city-pin ${isSelected ? "active" : ""}`}
                    transform={`translate(${region.x}, ${region.y})`}
                    onClick={() => setSelectedRegionId(region.id)}
                    onMouseEnter={() => setSelectedRegionId(region.id)}
                  >
                    {/* Pulsing ring for selected or capital city */}
                    {(isSelected || region.isCapital) && (
                      <circle
                        r={isSelected ? "14" : "10"}
                        fill="none"
                        stroke={region.isCapital ? "#FFD700" : region.color}
                        strokeWidth={isSelected ? "1.6" : "1"}
                        className={isSelected ? "ping-ring-fast" : "ping-ring"}
                      />
                    )}

                    {/* Central pin circle */}
                    <circle
                      r={isSelected ? "5.5" : region.isCapital ? "5" : "4"}
                      fill={region.color}
                      stroke="#FFFFFF"
                      strokeWidth={isSelected ? "1.5" : "1"}
                    />

                    {/* City label text */}
                    <text
                      x={region.x > 150 ? 12 : -12}
                      y={4}
                      textAnchor={region.x > 150 ? "start" : "end"}
                      fill={isSelected ? "#FFD700" : "#FAF7F0"}
                      fontSize={isSelected ? "11.5" : "10"}
                      fontWeight={isSelected ? "800" : "600"}
                      style={{
                        paintOrder: "stroke",
                        stroke: "#09241B",
                        strokeWidth: "3px",
                        strokeLinejoin: "round",
                      }}
                    >
                      {region.kannada}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Active City Card */}
          <div className="city-highlight-card">
            <div className="city-highlight-top">
              <span className="city-highlight-name">
                <MapPin size={14} color="#F5D77F" />
                {activeRegion.name}
              </span>
              <span className="city-highlight-kannada">{activeRegion.kannada}</span>
            </div>
            <p className="city-highlight-tag">{activeRegion.tagline}</p>
          </div>

          {/* Heritage Highlights Pill Row */}
          <div className="auth-showcase-features">
            <div className="showcase-stat-pill">
              <strong>31</strong>
              <span>ಜಿಲ್ಲೆಗಳು</span>
            </div>
            <div className="showcase-stat-pill">
              <strong>6</strong>
              <span>ಸನ್ನಿವೇಶಗಳು</span>
            </div>
            <div className="showcase-stat-pill">
              <strong>ಧ್ವನಿ AI</strong>
              <span>ಲೈವ್ ಮಾತು</span>
            </div>
          </div>
        </div>

        {/* Right Column: Authentication Form Area */}
        <div className="auth-form-column">
          <div className="modal-header">
            <div className="modal-title-group">
              <span className="brand-mark-mini">
                <Sparkles size={16} />
              </span>
              <div>
                <h3 id="auth-modal-title">
                  {mode === "signin"
                    ? "Welcome Back to Maatu"
                    : mode === "signup"
                    ? "Join Voice of Kannada"
                    : "Reset Your Password"}
                </h3>
              </div>
            </div>
            <button className="icon-close-btn" onClick={onClose} aria-label="Close authentication modal">
              <X size={20} />
            </button>
          </div>

          <p className="auth-subtitle-text">
            {mode === "signin"
              ? "Sign in to resume your learning streaks, voice progress, and XP."
              : mode === "signup"
              ? "Create your free account and start speaking natural Kannada today."
              : "Enter your registered email to receive secure recovery instructions."}
          </p>

          {/* Warning banner is displayed ONLY if credentials are missing or invalid */}
          {!isConfigured && (
            <div className="form-alert warning" style={{ marginBottom: "1rem" }}>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <strong>Supabase Authentication Required:</strong>
                  <p style={{ margin: "4px 0 0", fontSize: "0.85rem" }}>
                    {configMessage ||
                      "Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env to enable live sign-in."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Mode Switcher Tabs */}
          {mode !== "forgot" && (
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
          )}

          <form onSubmit={handleSubmit} className="auth-form" autoComplete="off">
            {mode === "signup" && (
              <div className="form-group">
                <label htmlFor="auth-name-input">Your Display Name</label>
                <div className="input-with-icon">
                  <User size={18} className="input-icon-left" />
                  <input
                    id="auth-name-input"
                    type="text"
                    placeholder="Enter your name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    autoComplete="name"
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="auth-email-input">Email Address</label>
              <div className="input-with-icon">
                <Mail size={18} className="input-icon-left" />
                <input
                  id="auth-email-input"
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
                  <label htmlFor="auth-password-input">Password</label>
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
                  <Lock size={18} className="input-icon-left" />
                  <input
                    id="auth-password-input"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password (min 6 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
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

            {mode === "forgot" && (
              <button
                type="button"
                className="guest-login-btn"
                style={{ marginTop: "12px" }}
                onClick={() => switchMode("signin")}
              >
                Back to Sign In
              </button>
            )}
          </form>

          <div className="auth-footer-notice">
            <ShieldCheck size={14} color="#174B3A" />
            <span>Secured by Supabase Auth & PostgreSQL Row Level Security (RLS).</span>
          </div>

          {/* Test User Credentials Card for Hackathon Judges & Evaluators */}
          <div className="test-credentials-card">
            <div className="test-credentials-header">
              <User size={13} className="test-credentials-icon" />
              <span>Test User Credentials</span>
            </div>
            <div className="test-credentials-grid">
              <div className="test-cred-item">
                <Mail size={12} className="test-cred-icon" />
                <span>Email: <strong className="test-cred-value">test1@gmail.com</strong></span>
              </div>
              <div className="test-cred-item">
                <Lock size={12} className="test-cred-icon" />
                <span>Pass: <strong className="test-cred-value">test1786</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
