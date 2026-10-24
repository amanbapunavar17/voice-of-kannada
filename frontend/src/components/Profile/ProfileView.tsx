import React, { useState } from "react";
import {
  Award,
  Flame,
  Sparkles,
  Coins,
  CheckCircle2,
  Trash2,
  RefreshCw,
} from "lucide-react";
import type { UserProfile, CertificateRecord, KannadaLevel } from "../../types";
import { storage } from "../../services/storage";
import { calculateLevel } from "../../data/badgesData";

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
  const [displayName, setDisplayName] = useState(user.displayName);
  const [level, setLevel] = useState<KannadaLevel>(user.level);
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(user.dailyGoalMinutes);
  const [isPublic, setIsPublic] = useState(user.isPublicLeaderboard);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const { currentLevel } = calculateLevel(user.xp);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const updated: UserProfile = {
      ...user,
      displayName: displayName.trim() || user.displayName,
      level,
      dailyGoalMinutes,
      isPublicLeaderboard: isPublic,
      avatarChar: displayName.trim().charAt(0).toUpperCase() || "ಅ",
    };
    storage.saveUser(updated);
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
        "Are you sure you want to reset all learning progress, points, and streaks? This cannot be undone."
      )
    ) {
      storage.resetAllData();
      window.location.reload();
    }
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
            <h2>{user.displayName}</h2>
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

            {!user.isAuthenticated && (
              <button className="primary-button full-width" onClick={onOpenAuth}>
                Sign In to Sync Progress
              </button>
            )}
          </div>

          {/* Earned Certificates Mini-List */}
          <div className="profile-certs-panel">
            <h3>Earned Certificates ({certificates.length})</h3>
            {certificates.length === 0 ? (
              <p className="empty-subtext">No certificates claimed yet. Complete course modules to earn.</p>
            ) : (
              <div className="profile-cert-items">
                {certificates.map((c) => (
                  <div key={c.id} className="profile-cert-row">
                    <Award size={18} color="#D4A64A" />
                    <div>
                      <strong>{c.courseTitle}</strong>
                      <span className="cert-mono">{c.id}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Settings Form */}
        <div className="profile-settings-col">
          <form onSubmit={handleSave} className="profile-settings-form">
            <h3>Preferences & Goals</h3>

            <div className="form-group">
              <label>Public Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How your name appears on leaderboards & certificates"
                required
              />
            </div>

            <div className="form-group">
              <label>Current Kannada Level</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as KannadaLevel)}
                className="select-dropdown"
              >
                <option value="Beginner">Beginner (Zero / Few Words)</option>
                <option value="Elementary">Elementary (Basic Phrases)</option>
                <option value="Intermediate">Intermediate (Understand, Practicing Speech)</option>
                <option value="Advanced">Advanced (Fluent Conversations)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Daily Study Commitment</label>
              <div className="time-chips-row">
                {[5, 15, 30, 45].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    className={`time-chip ${dailyGoalMinutes === mins ? "selected" : ""}`}
                    onClick={() => setDailyGoalMinutes(mins)}
                  >
                    {mins} mins
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group-checkbox">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                />
                <span>Include my display name on public Community Leaderboards</span>
              </label>
            </div>

            {saveSuccess && (
              <div className="form-alert success">
                <CheckCircle2 size={16} /> Preferences successfully saved!
              </div>
            )}

            <button type="submit" className="primary-button">
              Save Preferences
            </button>
          </form>

          {/* Account & Storage Utilities */}
          <div className="profile-utilities-card">
            <h3>Account & Data Integrity</h3>
            <div className="utility-action-row">
              <div>
                <strong>Reconcile Balances</strong>
                <p>Verifies XP and points directly against transaction logs.</p>
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
                <strong>Reset Learning Progress</strong>
                <p>Clears stored progress and resets habits back to day one.</p>
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
