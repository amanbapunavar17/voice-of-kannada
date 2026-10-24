import React from "react";
import {
  Flame,
  Sparkles,
  Coins,
  ArrowRight,
  BookOpen,
  Award,
  ShoppingBag,
  Clock,
  Compass,
  MessageCircle,
  Utensils,
} from "lucide-react";
import type { UserProfile, DailyChallenge } from "../../types";
import { calculateLevel, allAchievements } from "../../data/badgesData";
import { curriculumCategories } from "../../data/curriculumData";
import { goodiesCatalog } from "../../data/rewardsData";

interface HomeDashboardProps {
  user: UserProfile;
  completedLessons: string[];
  challenges: DailyChallenge[];
  onNavigate: (tab: string, scenarioId?: string) => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  user,
  completedLessons,
  challenges,
  onNavigate,
}) => {
  const { currentLevel, nextLevel, progressPercent, xpToNext } = calculateLevel(user.xp);

  // Find next incomplete lesson
  let nextLesson = curriculumCategories[0].lessons[0];
  for (const cat of curriculumCategories) {
    for (const les of cat.lessons) {
      if (!completedLessons.includes(les.id)) {
        nextLesson = les;
        break;
      }
    }
  }

  // Find next attainable reward in goodies store
  const sortedRewards = [...goodiesCatalog].sort((a, b) => a.pointsRequired - b.pointsRequired);
  const nextAttainableReward =
    sortedRewards.find((r) => r.pointsRequired > user.points) || sortedRewards[sortedRewards.length - 1];
  const pointsNeeded = Math.max(0, nextAttainableReward.pointsRequired - user.points);

  // Today's mission completion calculation
  const completedChallengesCount = challenges.filter((c) => c.isCompleted).length;
  const missionProgressPercent = Math.round((completedChallengesCount / challenges.length) * 100);

  // 7-day mini calendar representation
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const currentDayIndex = (new Date().getDay() + 6) % 7; // Monday = 0

  return (
    <div className="dashboard-container">
      {/* A. WELCOME & GREETING BANNER */}
      <section className="dashboard-welcome-banner">
        <div className="welcome-text-side">
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            TODAY IN BENGALURU
          </div>
          <h1>ನಮಸ್ಕಾರ, {user.displayName}!</h1>
          <p>
            Welcome back to your Kannada speaking journey. You are on a{" "}
            <strong>{user.currentStreak}-day learning streak</strong>. Let's make today count!
          </p>
        </div>

        <div className="welcome-level-badge">
          <div className="level-badge-emblem">
            <span>{currentLevel.badge}</span>
          </div>
          <div>
            <div className="badge-level-name">{currentLevel.title}</div>
            <div className="badge-kannada">{currentLevel.titleKannada}</div>
            <span className="badge-xp-text">{user.xp} Total XP</span>
          </div>
        </div>
      </section>

      {/* B. DUAL ECONOMY BALANCES & STREAK CARDS */}
      <section className="dashboard-stats-grid">
        {/* Streak Card */}
        <div className="stat-card streak-card" onClick={() => onNavigate("progress")}>
          <div className="stat-card-header">
            <span className="stat-label">DAILY STREAK</span>
            <div className="stat-icon-gold">
              <Flame size={20} color="#D4A64A" />
            </div>
          </div>
          <div className="stat-main-value">
            {user.currentStreak} <span className="stat-unit">Days</span>
          </div>
          <p className="stat-subtext">Best Streak: {user.bestStreak} days</p>

          <div className="mini-calendar-row">
            {days.map((day, idx) => {
              const isPastOrToday = idx <= currentDayIndex;
              return (
                <div
                  key={idx}
                  className={`mini-day-cell ${isPastOrToday ? "active" : ""}`}
                  title={isPastOrToday ? "Activity Completed" : "Upcoming"}
                >
                  <span>{day}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* XP & Level Card */}
        <div className="stat-card xp-card" onClick={() => onNavigate("progress")}>
          <div className="stat-card-header">
            <span className="stat-label">LEARNING XP</span>
            <div className="stat-icon-green">
              <Sparkles size={20} color="#174B3A" />
            </div>
          </div>
          <div className="stat-main-value">
            {user.xp} <span className="stat-unit">XP</span>
          </div>
          <p className="stat-subtext">
            {nextLevel ? `${xpToNext} XP to ${nextLevel.title}` : "Maximum Level Reached!"}
          </p>
          <div className="stat-progress-bar">
            <span style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        {/* Maatu Points Card */}
        <div className="stat-card points-card" onClick={() => onNavigate("store")}>
          <div className="stat-card-header">
            <span className="stat-label">MAATU POINTS (GOODIES)</span>
            <div className="stat-icon-gold">
              <Coins size={20} color="#D4A64A" />
            </div>
          </div>
          <div className="stat-main-value">
            {user.points} <span className="stat-unit">Pts</span>
          </div>
          <p className="stat-subtext">
            {pointsNeeded > 0
              ? `${pointsNeeded} pts to ${nextAttainableReward.title}`
              : "Ready to redeem in Goodies Store!"}
          </p>
          <button className="small-action-btn" onClick={() => onNavigate("store")}>
            Redeem Store <ArrowRight size={14} />
          </button>
        </div>
      </section>

      {/* C. TODAY'S LEARNING MISSION & CONTINUE LEARNING */}
      <section className="dashboard-twocol-grid">
        {/* Mission Card */}
        <div className="dashboard-panel mission-panel">
          <div className="panel-top-row">
            <div>
              <span className="section-kicker">DAILY LEARNING MISSION</span>
              <h3>Today's Habit Target</h3>
            </div>
            <span className="mission-percent">{missionProgressPercent}% Done</span>
          </div>

          <div className="mission-progress-bar">
            <span style={{ width: `${missionProgressPercent}%` }} />
          </div>

          <div className="mission-tasks-list">
            {challenges.slice(0, 3).map((ch) => (
              <div key={ch.id} className={`mission-task-row ${ch.isCompleted ? "done" : ""}`}>
                <div className={`task-status-circle ${ch.isCompleted ? "checked" : ""}`}>
                  {ch.isCompleted ? "✓" : "○"}
                </div>
                <div className="task-content">
                  <strong>{ch.title}</strong>
                  <span>
                    {ch.currentCount}/{ch.targetCount} completed · +{ch.xpReward} XP, +{ch.pointsReward} pts
                  </span>
                </div>
                {ch.isCompleted && !ch.isClaimed && (
                  <button
                    className="claim-mini-btn"
                    onClick={() => onNavigate("challenges")}
                  >
                    Claim
                  </button>
                )}
              </div>
            ))}
          </div>

          <button className="primary-button full-width" onClick={() => onNavigate("learn")}>
            Continue Today's Learning <ArrowRight size={16} />
          </button>
        </div>

        {/* Continue Next Lesson */}
        <div className="dashboard-panel continue-panel">
          <div className="panel-top-row">
            <div>
              <span className="section-kicker">RECOMMENDED LESSON</span>
              <h3>Pick Up Where You Left Off</h3>
            </div>
            <div className="lesson-badge-level">{nextLesson.level}</div>
          </div>

          <div className="next-lesson-card">
            <div className="next-lesson-icon">
              <BookOpen size={24} color="#174B3A" />
            </div>
            <div>
              <h4>{nextLesson.title}</h4>
              <div className="next-lesson-kannada">{nextLesson.titleKannada}</div>
              <p>{nextLesson.description}</p>
            </div>
          </div>

          <div className="next-lesson-meta">
            <span>
              <Clock size={14} /> ~{nextLesson.estimatedMinutes} mins
            </span>
            <span>
              <Sparkles size={14} /> +{nextLesson.xpReward} XP
            </span>
            <span>
              <Coins size={14} /> +{nextLesson.pointsReward} Points
            </span>
          </div>

          <button className="secondary-button full-width" onClick={() => onNavigate("learn")}>
            Start Lesson <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* D. RECOMMENDED SPEAKING PRACTICE */}
      <section className="dashboard-section">
        <div className="section-header-row">
          <div>
            <span className="section-kicker">AI SPEAKING STUDIO</span>
            <h2>Practice Spoken Kannada Today</h2>
            <p>Real-world situations. Let our Gemini AI listen and converse with you.</p>
          </div>
          <button className="text-button" onClick={() => onNavigate("practice")}>
            View All Scenarios <ArrowRight size={16} />
          </button>
        </div>

        <div className="dashboard-scenarios-grid">
          {[
            {
              id: "food",
              title: "Order Dosa & Coffee",
              kn: "ಊಟ ಆರ್ಡರ್ ಮಾಡುವುದು",
              desc: "Talk to restaurant staff and order breakfast like a local.",
              icon: Utensils,
              color: "yellow",
            },
            {
              id: "auto",
              title: "Hailing an Auto Rickshaw",
              kn: "ಆಟೋ ಪ್ರಯಾಣ",
              desc: "Ask meter, specify landmarks, and guide your driver.",
              icon: Compass,
              color: "green",
            },
            {
              id: "daily",
              title: "Everyday Greetings",
              kn: "ದೈನಂದಿನ ಸಂಭಾಷಣೆ",
              desc: "Introduce yourself, say hello, and ask 'ಊಟ ಆಯ್ತಾ?' with ease.",
              icon: MessageCircle,
              color: "peach",
            },
          ].map((sc) => {
            const Icon = sc.icon;
            return (
              <div
                key={sc.id}
                className="scenario-quick-card"
                onClick={() => onNavigate("practice", sc.id)}
              >
                <div className={`quick-card-icon ${sc.color}`}>
                  <Icon size={20} />
                </div>
                <h4>{sc.title}</h4>
                <div className="quick-kn">{sc.kn}</div>
                <p>{sc.desc}</p>
                <div className="quick-card-cta">
                  <span>Speak Scenario</span>
                  <ArrowRight size={15} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* E. ACHIEVEMENTS & GOODIES PREVIEW ROW */}
      <section className="dashboard-bottom-grid">
        <div className="dashboard-panel">
          <div className="panel-top-row">
            <div>
              <span className="section-kicker">ACHIEVEMENT BADGES</span>
              <h3>Milestones Unlocked</h3>
            </div>
            <button className="text-button" onClick={() => onNavigate("progress")}>
              All Badges <ArrowRight size={15} />
            </button>
          </div>

          <div className="badges-showcase-row">
            {allAchievements.slice(0, 4).map((ach) => (
              <div key={ach.id} className="badge-item-mini">
                <div className="badge-circle-mini">
                  <Award size={20} color="#D4A64A" />
                </div>
                <span className="badge-title-mini">{ach.title}</span>
                <span className="badge-kn-mini">{ach.titleKannada}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-panel">
          <div className="panel-top-row">
            <div>
              <span className="section-kicker">NEXT GOODIE UNLOCK</span>
              <h3>{nextAttainableReward.title}</h3>
            </div>
            <button className="text-button" onClick={() => onNavigate("store")}>
              Store <ShoppingBag size={15} />
            </button>
          </div>

          <p className="goodie-panel-desc">{nextAttainableReward.description}</p>
          <div className="goodie-points-requirement">
            <span>Points Balance: {user.points} pts</span>
            <strong>Cost: {nextAttainableReward.pointsRequired} pts</strong>
          </div>
          <button className="secondary-button full-width" onClick={() => onNavigate("store")}>
            View Goodies Store <ArrowRight size={16} />
          </button>
        </div>
      </section>
    </div>
  );
};
