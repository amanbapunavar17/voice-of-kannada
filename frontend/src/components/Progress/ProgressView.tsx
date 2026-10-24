import React from "react";
import {
  Flame,
  Sparkles,
  BookOpen,
  Mic,
  Award,
} from "lucide-react";
import type { UserProfile, DailyActivityRecord } from "../../types";
import { allAchievements, calculateLevel } from "../../data/badgesData";

interface ProgressViewProps {
  user: UserProfile;
  completedLessons: string[];
  dailyActivities: DailyActivityRecord[];
}

export const ProgressView: React.FC<ProgressViewProps> = ({
  user,
  completedLessons,
  dailyActivities,
}) => {
  const { currentLevel, nextLevel, progressPercent, xpToNext } = calculateLevel(user.xp);

  // Compute 7-day activity metrics
  const last7Days: { date: string; dayLabel: string; xp: number; minutes: number }[] = [];
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
    const dayLabel = d.toLocaleDateString("en-US", { weekday: "short" });

    const record = dailyActivities.find((r) => r.date === dateStr);
    last7Days.push({
      date: dateStr,
      dayLabel,
      xp: record ? record.xpEarned : i === 0 ? user.xp : 0,
      minutes: record ? record.minutesSpent : i === 0 ? 15 : 0,
    });
  }

  const maxXp = Math.max(50, ...last7Days.map((d) => d.xp));

  // Compute total aggregates
  const totalWordsLearned = completedLessons.length * 4;
  const totalSpeakingAttempts = dailyActivities.reduce(
    (acc, curr) => acc + curr.speakingAttempts,
    0
  );

  return (
    <div className="progress-container">
      <div className="section-heading-with-action">
        <div>
          <div className="section-kicker">PERSONAL ANALYTICS</div>
          <h1>My Learning Progress & Streaks</h1>
          <p>
            Track your consistency, day-wise speaking attempts, vocabulary milestones, and unlocked achievements.
          </p>
        </div>
      </div>

      {/* Top 4 Key Metric Cards */}
      <div className="analytics-metrics-grid">
        <div className="metric-card">
          <div className="metric-card-top">
            <span className="metric-label">CURRENT STREAK</span>
            <Flame size={18} color="#D4A64A" />
          </div>
          <div className="metric-val">{user.currentStreak} Days</div>
          <span className="metric-hint">Best: {user.bestStreak} days record</span>
        </div>

        <div className="metric-card">
          <div className="metric-card-top">
            <span className="metric-label">LESSONS COMPLETED</span>
            <BookOpen size={18} color="#174B3A" />
          </div>
          <div className="metric-val">{completedLessons.length}</div>
          <span className="metric-hint">Across 10 syllabus modules</span>
        </div>

        <div className="metric-card">
          <div className="metric-card-top">
            <span className="metric-label">WORDS LEARNED</span>
            <Sparkles size={18} color="#26845B" />
          </div>
          <div className="metric-val">{totalWordsLearned}</div>
          <span className="metric-hint">Practical spoken vocabulary</span>
        </div>

        <div className="metric-card">
          <div className="metric-card-top">
            <span className="metric-label">SPEAKING SESSIONS</span>
            <Mic size={18} color="#D4A64A" />
          </div>
          <div className="metric-val">{totalSpeakingAttempts}</div>
          <span className="metric-hint">AI conversations completed</span>
        </div>
      </div>

      {/* 7-Day Activity Chart & Level Progression */}
      <div className="progress-twocol-grid">
        {/* 7-Day Visual Bar Chart */}
        <div className="progress-panel chart-panel">
          <div className="panel-header-row">
            <div>
              <span className="section-kicker">WEEKLY MOMENTUM</span>
              <h3>7-Day Learning Activity (XP)</h3>
            </div>
            <div className="chart-legend">
              <span className="legend-dot" /> XP Earned
            </div>
          </div>

          <div className="bar-chart-visual">
            {last7Days.map((item, idx) => {
              const heightPercent = Math.min(100, Math.round((item.xp / maxXp) * 100));

              return (
                <div key={idx} className="chart-bar-column">
                  <div className="chart-bar-tooltip">{item.xp} XP</div>
                  <div className="chart-bar-track">
                    <div
                      className="chart-bar-fill"
                      style={{ height: `${Math.max(8, heightPercent)}%` }}
                    />
                  </div>
                  <span className="chart-day-label">{item.dayLabel}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Level Progression Detail */}
        <div className="progress-panel level-detail-panel">
          <div className="panel-header-row">
            <div>
              <span className="section-kicker">LEVEL ADVANCEMENT</span>
              <h3>{currentLevel.title}</h3>
            </div>
            <span className="level-badge-emblem-mini">{currentLevel.badge}</span>
          </div>

          <p className="level-detail-desc">
            You have accumulated <strong>{user.xp} total XP</strong>.{" "}
            {nextLevel
              ? `Earn ${xpToNext} more XP to unlock Level ${nextLevel.levelNumber} (${nextLevel.title}).`
              : "You have achieved the highest rank in Voice of Kannada!"}
          </p>

          <div className="level-progress-bar-large">
            <span style={{ width: `${progressPercent}%` }} />
          </div>

          <div className="level-thresholds-timeline">
            {[1, 2, 3, 4, 5].map((lvlNum) => {
              const isPassed = lvlNum <= currentLevel.levelNumber;
              return (
                <div key={lvlNum} className={`timeline-step ${isPassed ? "active" : ""}`}>
                  <div className="timeline-dot">{isPassed ? "✓" : lvlNum}</div>
                  <span>Lvl {lvlNum}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Monthly Activity Calendar Grid (30 days heatmap) */}
      <div className="progress-panel calendar-heatmap-panel">
        <div className="panel-header-row">
          <div>
            <span className="section-kicker">MONTHLY HEATMAP</span>
            <h3>Learning Habit Consistency</h3>
          </div>
          <div className="heatmap-legend">
            <span>Less</span>
            <span className="heat-cell lvl-0" />
            <span className="heat-cell lvl-1" />
            <span className="heat-cell lvl-2" />
            <span className="heat-cell lvl-3" />
            <span>More</span>
          </div>
        </div>

        <div className="heatmap-grid">
          {Array.from({ length: 28 }, (_, i) => {
            const dayNum = i + 1;
            // Activity intensity
            const intensity = dayNum <= user.currentStreak ? (dayNum % 3) + 1 : 0;
            return (
              <div
                key={i}
                className={`heatmap-day-square lvl-${intensity}`}
                title={`Day ${dayNum}: ${intensity > 0 ? "Learning Logged" : "No Activity"}`}
              >
                <span>{dayNum}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Achievement Showcase */}
      <div className="progress-panel achievements-panel">
        <div className="panel-header-row">
          <div>
            <span className="section-kicker">BADGES & TROPHIES</span>
            <h3>All Platform Achievements</h3>
          </div>
          <span className="achievements-count-badge">
            {allAchievements.filter((a) => a.isUnlocked).length} / {allAchievements.length} Unlocked
          </span>
        </div>

        <div className="achievements-full-grid">
          {allAchievements.map((ach) => {
            return (
              <div
                key={ach.id}
                className={`achievement-card-detailed ${ach.isUnlocked ? "unlocked" : "locked"}`}
              >
                <div className="ach-icon-circle">
                  <Award size={24} color={ach.isUnlocked ? "#D4A64A" : "#858477"} />
                </div>
                <div className="ach-content">
                  <div className="ach-kn-name">{ach.titleKannada}</div>
                  <h4>{ach.title}</h4>
                  <p>{ach.description}</p>
                  <span className="ach-condition">{ach.conditionDescription}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
