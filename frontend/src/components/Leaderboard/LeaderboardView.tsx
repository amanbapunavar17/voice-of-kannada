import React, { useState, useEffect } from "react";
import { Trophy, Medal, Flame, Sparkles, Shield } from "lucide-react";
import type { UserProfile, LeaderboardEntry } from "../../types";
import { api } from "../../services/api";

interface LeaderboardViewProps {
  user: UserProfile;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({ user }) => {
  const [activePeriod, setActivePeriod] = useState<"weekly" | "all_time">("weekly");
  const [boardData, setBoardData] = useState<{
    weekly: LeaderboardEntry[];
    all_time: LeaderboardEntry[];
  }>({
    weekly: [
      {
        rank: 1,
        displayName: "ಅನನ್ಯ (Ananya K.)",
        xp: 940,
        level: "Level 5 — Kannada Champion",
        streak: 14,
        avatarChar: "ಅ",
      },
      {
        rank: 2,
        displayName: "ರೋಹನ್ (Rohan M.)",
        xp: 820,
        level: "Level 4 — Confident Speaker",
        streak: 9,
        avatarChar: "ರ",
      },
      {
        rank: 3,
        displayName: "ವಿದ್ಯಾ (Vidya S.)",
        xp: 760,
        level: "Level 4 — Confident Speaker",
        streak: 11,
        avatarChar: "ವ",
      },
      {
        rank: 4,
        displayName: "ಕಾರ್ತಿಕ್ (Karthik B.)",
        xp: 690,
        level: "Level 3 — Conversation Starter",
        streak: 7,
        avatarChar: "ಕ",
      },
      {
        rank: 5,
        displayName: "ಮೇಘನಾ (Meghana R.)",
        xp: 610,
        level: "Level 3 — Conversation Starter",
        streak: 6,
        avatarChar: "ಮ",
      },
    ],
    all_time: [
      {
        rank: 1,
        displayName: "ಅನನ್ಯ (Ananya K.)",
        xp: 4820,
        level: "Level 5 — Kannada Champion",
        avatarChar: "ಅ",
      },
      {
        rank: 2,
        displayName: "ಚೇತನ್ (Chetan P.)",
        xp: 4150,
        level: "Level 5 — Kannada Champion",
        avatarChar: "ಚ",
      },
      {
        rank: 3,
        displayName: "ರೋಹನ್ (Rohan M.)",
        xp: 3890,
        level: "Level 4 — Confident Speaker",
        avatarChar: "ರ",
      },
    ],
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const data = await api.getLeaderboard();
      if (data && !cancelled) {
        setBoardData(data);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const currentList = activePeriod === "weekly" ? boardData.weekly : boardData.all_time;

  return (
    <div className="leaderboard-container">
      <div className="section-heading-with-action">
        <div>
          <div className="section-kicker">COMMUNITY PROGRESS</div>
          <h1>Learners Leaderboard</h1>
          <p>
            Celebrate your weekly progress and peer learning. Privacy-first: display names only, no personal contact data is ever revealed.
          </p>
        </div>
      </div>

      {/* User's Current Standings Banner */}
      <div className="user-standings-banner">
        <div className="standings-avatar-circle">
          <span>{user.avatarChar || "ಅ"}</span>
        </div>
        <div className="standings-user-info">
          <h3>{user.displayName} (You)</h3>
          <span>
            {user.level} · {user.xp} Total XP · {user.currentStreak}-day streak
          </span>
        </div>
        <div className="standings-privacy-tag">
          <Shield size={14} color="#26845B" />
          <span>Public Display Name</span>
        </div>
      </div>

      {/* Period Tabs: Weekly vs All-Time */}
      <div className="leaderboard-period-tabs">
        <button
          className={`period-tab-btn ${activePeriod === "weekly" ? "active" : ""}`}
          onClick={() => setActivePeriod("weekly")}
        >
          <Trophy size={16} /> This Week's Leaders
        </button>
        <button
          className={`period-tab-btn ${activePeriod === "all_time" ? "active" : ""}`}
          onClick={() => setActivePeriod("all_time")}
        >
          <Medal size={16} /> All-Time Champions
        </button>
      </div>

      {/* Leaderboard Table / Cards */}
      <div className="leaderboard-list-card">
        {currentList.map((entry) => {
          const isTop3 = entry.rank <= 3;

          return (
            <div
              key={entry.rank}
              className={`leaderboard-row ${isTop3 ? `rank-${entry.rank}` : ""}`}
            >
              <div className="rank-position-col">
                {entry.rank === 1 ? (
                  <span className="trophy-gold">🥇 1</span>
                ) : entry.rank === 2 ? (
                  <span className="trophy-silver">🥈 2</span>
                ) : entry.rank === 3 ? (
                  <span className="trophy-bronze">🥉 3</span>
                ) : (
                  <span className="rank-number">#{entry.rank}</span>
                )}
              </div>

              <div className="leader-avatar-col">
                <div className="leader-avatar">{entry.avatarChar}</div>
              </div>

              <div className="leader-name-col">
                <strong>{entry.displayName}</strong>
                <span className="leader-level-label">{entry.level}</span>
              </div>

              {entry.streak !== undefined && (
                <div className="leader-streak-col">
                  <Flame size={14} color="#D4A64A" />
                  <span>{entry.streak}d</span>
                </div>
              )}

              <div className="leader-xp-col">
                <Sparkles size={14} color="#174B3A" />
                <strong>{entry.xp} XP</strong>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
