import React, { useState, useEffect } from "react";
import { Trophy, Medal, Flame, Sparkles, Shield, Users } from "lucide-react";
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
    weekly: [],
    all_time: [],
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      try {
        const data = await api.getLeaderboard();
        if (data && !cancelled) {
          setBoardData(data);
        }
      } catch (e) {
        console.warn("Could not load leaderboard:", e);
      } finally {
        if (!cancelled) setIsLoading(false);
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
            Celebrate real learning milestones with peers. Privacy-first: public display names only, never personal contact details.
          </p>
        </div>
      </div>

      {/* User's Current Standings Banner */}
      <div className="user-standings-banner">
        <div className="standings-avatar-circle">
          <span>{user.avatarChar || "ಅ"}</span>
        </div>
        <div className="standings-user-info">
          <h3>{user.displayName || "ಕನ್ನಡ ಕಲಿ"} (You)</h3>
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
        {isLoading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#73786F" }}>
            <Sparkles size={24} className="spin-icon" style={{ marginBottom: "0.5rem" }} />
            <p>Loading real rankings from Supabase...</p>
          </div>
        ) : currentList.length === 0 ? (
          <div style={{ padding: "3rem 1.5rem", textAlign: "center" }}>
            <div style={{ display: "inline-flex", padding: "1rem", borderRadius: "50%", background: "#F7EAC8", color: "#D4A64A", marginBottom: "1rem" }}>
              <Users size={32} />
            </div>
            <h3 style={{ margin: "0 0 0.5rem", color: "#174B3A" }}>No Leaderboard Entries Yet</h3>
            <p style={{ margin: "0 auto", maxWidth: "420px", color: "#73786F", fontSize: "0.95rem" }}>
              Be the first learner on the leaderboard! Complete a lesson or practice speaking with the AI coach to earn XP and claim the #1 spot.
            </p>
          </div>
        ) : (
          currentList.map((entry) => {
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
          })
        )}
      </div>
    </div>
  );
};
