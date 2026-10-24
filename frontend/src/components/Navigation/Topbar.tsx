import React from "react";
import { Flame, Sparkles, Coins, Languages, LogIn } from "lucide-react";
import type { UserProfile } from "../../types";

interface TopbarProps {
  currentTab: string;
  user: UserProfile;
  apiConnected: boolean;
  onOpenAuth: () => void;
  onSelectTab: (tab: string) => void;
}

const tabTitles: Record<string, string> = {
  home: "Home Dashboard",
  learn: "Learn Kannada Curriculum",
  practice: "AI Speaking Studio",
  challenges: "Daily Challenges",
  games: "Kannada Mini-Games",
  progress: "My Learning Progress",
  certificates: "Course Certificates",
  store: "Maatu Goodies Store",
  leaderboard: "Learners Leaderboard",
  profile: "Profile & Settings",
};

export const Topbar: React.FC<TopbarProps> = ({
  currentTab,
  user,
  apiConnected,
  onOpenAuth,
  onSelectTab,
}) => {
  return (
    <header className="topbar">
      <div className="breadcrumb">
        Learn <span>/</span> <strong>{tabTitles[currentTab] || "Dashboard"}</strong>
      </div>

      <div className="topbar-right">
        {/* Backend health status pill */}
        <span
          className="api-status-pill"
          style={{
            fontSize: "11px",
            color: apiConnected ? "#26845B" : "#C84C4C",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
          title={apiConnected ? "Backend & AI Connected" : "Backend Offline"}
        >
          <span
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              background: apiConnected ? "#26845B" : "#C84C4C",
            }}
          />
          {apiConnected ? "AI online" : "AI offline"}
        </span>

        {/* Daily Streak Indicator */}
        <div
          className="stat-pill streak-pill"
          title={`${user.currentStreak}-day learning streak!`}
          onClick={() => onSelectTab("progress")}
          style={{ cursor: "pointer" }}
        >
          <Flame size={15} color="#D4A64A" />
          <span>{user.currentStreak}d</span>
        </div>

        {/* XP Balance */}
        <div
          className="stat-pill xp-pill"
          title={`${user.xp} XP earned toward Level progression`}
          onClick={() => onSelectTab("progress")}
          style={{ cursor: "pointer" }}
        >
          <Sparkles size={14} color="#174B3A" />
          <span>{user.xp} XP</span>
        </div>

        {/* Maatu Points Balance */}
        <div
          className="stat-pill points-pill"
          title={`${user.points} redeemable Maatu Points for Goodies Store`}
          onClick={() => onSelectTab("store")}
          style={{ cursor: "pointer" }}
        >
          <Coins size={14} color="#D4A64A" />
          <span>{user.points} pts</span>
        </div>

        <span className="language-label">
          <Languages size={15} />
          ಕನ್ನಡ · English
        </span>

        {user.isAuthenticated ? (
          <button
            className="avatar-btn"
            onClick={() => onSelectTab("profile")}
            title={user.displayName}
          >
            {user.avatarChar || "ಅ"}
          </button>
        ) : (
          <button className="auth-signin-btn" onClick={onOpenAuth}>
            <LogIn size={15} />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};
