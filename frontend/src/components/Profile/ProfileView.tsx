import React, { useState } from "react";
import {
  Award,
  Flame,
  Sparkles,
  Coins,
  CheckCircle2,
  Trash2,
  RefreshCw,
  LogOut,
  Shield,
  User,
} from "lucide-react";
import type { UserProfile, CertificateRecord, KannadaLevel } from "../../types";
import { storage } from "../../services/storage";
import { calculateLevel } from "../../data/badgesData";
import { useAuth } from "../../context/AuthContext";

interface ProfileViewProps {
  user: UserProfile;
  certificates: CertificateRecord[];
  onProfileUpdated: () => void;
  onOpenAuth: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  certificates,
  onProfileUpdated,
  onOpenAuth,
}) => {
  const { signOut, updateProfileData, authUser } = useAuth();

  const [displayName, setDisplayName] = useState(user.displayName);
  const [level, setLevel] = useState<KannadaLevel>(user.level);
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(user.dailyGoalMinutes);
  const [isPublic, setIsPublic] = useState(user.isPublicLeaderboard);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { currentLevel } = calculateLevel(user.xp);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);

    const cleanName = displayName.trim() || user.displayName;

    // 1. Update in local storage
    const updated: UserProfile = {
      ...user,
      displayName: cleanName,
      level,
      dailyGoalMinutes,
      isPublicLeaderboard: isPublic,
      avatarChar: cleanName.charAt(0).toUpperCase() || "ಅ",
    };
    storage.saveUser(updated);

    // 2. Sync to Supabase if authenticated
    if (authUser) {
      await updateProfileData({
        displayName: cleanName,
        level,
        dailyGoalMinutes,
        isPublicLeaderboard: isPublic,
      });
    }

    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
    onProfileUpdated();
  }

  function handleReconcile() {
    storage.reconcileBalances();
    onProfileUpdated();
  }

  function handleReset() {
    if (
      window.confirm(
        "Are you sure you want to reset all local learning cache? This cannot be undone."
      )
    ) {
      storage.resetAllData();
      window.location.reload();
    }
  }

  async function handleSignOut() {
    await signOut();
    window.location.reload();
  }

  return (
    <div className="profile-container">
      <div className="section-heading-with-action">
        <div>
          <div className="section-kicker">USER ACCOUNT</div>
          <h1>Profile & Learning Preferences</h1>
          <p>
            Manage your public display name, daily study goals, certificates, and privacy settings.
          </p>
        </div>
      </div>

      <div className="profile-twocol-layout">
        {/* Left Column: User Card & Quick Summary */}
        <div className="profile-summary-col">
          <div className="profile-identity-card">
            <div className="profile-avatar-giant">
              <span>{user.avatarChar || "ಅ"}</span>
            </div>
            <h2>{user.displayName || "ಕನ್ನಡ ಕಲಿ"}</h2>
            <div className="profile-role-badge">
              <span>{currentLevel.title}</span> ({currentLevel.titleKannada})
            </div>
            <p className="profile-email-text">{user.email || "Guest Learner Mode"}</p>

            <div className="profile-stats-grid">
              <div className="profile-stat-cell">
                <Flame size={18} color="#D4A64A" />
                <span className="pstat-val">{user.currentStreak}d</span>
                <span className="pstat-lbl">Streak</span>
              </div>
              <div className="profile-stat-cell">
                <Sparkles size={18} color="#174B3A" />
                <span className="pstat-val">{user.xp}</span>
                <span className="pstat-lbl">XP</span>
              </div>
              <div className="profile-stat-cell">
                <Coins size={18} color="#D4A64A" />
                <span className="pstat-val">{user.points}</span>
                <span className="pstat-lbl">Points</span>
              </div>
            </div>

            {user.isAuthenticated ? (
              <button
                type="button"
                className="secondary-button full-width"
                onClick={handleSignOut}
                style={{ marginTop: "1rem", color: "#C84C4C", borderColor: "#E9E4D9" }}
              >
                <LogOut size={16} /> Sign Out
              </button>
            ) : (
              <button
                type="button"
                className="primary-button full-width"
                onClick={onOpenAuth}
                style={{ marginTop: "1rem" }}
              >
                <User size={16} /> Sign In to Sync Progress
              </button>
            )}
          </div>

          {/* Earned Certificates Mini-List */}
          <div className="profile-certs-panel">
            <h3>Earned Certificates ({certificates.length})</h3>
            {certificates.length === 0 ? (
              <p className="no-certs-text">
                No certificates earned yet. Complete the foundational curriculum modules to unlock your first verified certificate.
              </p>
            ) : (
              <div className="profile-certs-list">
                {certificates.map((cert) => (
                  <div key={cert.id} className="profile-cert-chip">
                    <Award size={16} color="#D4A64A" />
                    <div>
                      <strong>{cert.courseTitle}</strong>
                      <span>ID: {cert.id}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Settings Form */}
        <div className="profile-form-col">
          <form onSubmit={handleSave} className="profile-form-card">
            <h3>Learning Preferences</h3>

            <div className="form-group">
              <label>Public Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your Name or Kannada Pen Name"
                required
              />
              <span className="input-hint">
                Visible on public leaderboards. Never reveals your email or personal credentials.
              </span>
            </div>

            <div className="form-group">
              <label>Current Kannada Proficiency Level</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as KannadaLevel)}
              >
                <option value="Beginner">Beginner (ಹರಿಕಾರ) — Starting from scratch</option>
                <option value="Elementary">Elementary (ಪ್ರಾಥಮಿಕ) — Know basic words & greetings</option>
                <option value="Intermediate">Intermediate (ಮಧ್ಯಮ) — Can form simple sentences</option>
                <option value="Advanced">Advanced (ಪ್ರವೀಣ) — Seeking conversational fluency</option>
              </select>
            </div>

            <div className="form-group">
              <label>Daily Study Commitment</label>
              <div className="daily-goal-options">
                {[10, 15, 20, 30].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    className={`goal-btn ${dailyGoalMinutes === mins ? "active" : ""}`}
                    onClick={() => setDailyGoalMinutes(mins)}
                  >
                    {mins} mins / day
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                />
                <span>Include my display name on weekly public leaderboards</span>
              </label>
            </div>

            {saveSuccess && (
              <div className="form-alert success">
                <CheckCircle2 size={16} /> Preferences successfully saved!
              </div>
            )}

            <button type="submit" className="primary-button" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Preferences"}
            </button>
          </form>

          {/* Account & Storage Utilities */}
          <div className="profile-utilities-card">
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <Shield size={18} color="#174B3A" />
              <h3 style={{ margin: 0 }}>Account & Data Integrity</h3>
            </div>
            <div className="utility-action-row">
              <div>
                <strong>Reconcile Balances</strong>
                <p>Verifies XP and points directly against auditable transaction logs.</p>
              </div>
              <button
                type="button"
                className="secondary-button small"
                onClick={handleReconcile}
              >
                <RefreshCw size={15} /> Reconcile
              </button>
            </div>

            <div className="utility-action-row danger">
              <div>
                <strong>Reset Local Progress</strong>
                <p>Clears cached local progress if you want to start fresh.</p>
              </div>
              <button
                type="button"
                className="danger-button small"
                onClick={handleReset}
              >
                <Trash2 size={15} /> Reset
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
