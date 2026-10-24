import React from "react";
import {
  CalendarCheck,
  Sparkles,
  Coins,
  CheckCircle2,
  Clock,
  ArrowRight,
} from "lucide-react";
import confetti from "canvas-confetti";
import type { DailyChallenge } from "../../types";
import { storage } from "../../services/storage";

interface DailyChallengesViewProps {
  challenges: DailyChallenge[];
  onNavigate: (tab: string) => void;
}

export const DailyChallengesView: React.FC<DailyChallengesViewProps> = ({
  challenges,
  onNavigate,
}) => {
  function handleClaim(challenge: DailyChallenge) {
    const success = storage.claimChallengeReward(challenge.id);
    if (success) {
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    }
  }

  const completedCount = challenges.filter((c) => c.isCompleted).length;

  return (
    <div className="challenges-container">
      <div className="section-heading-with-action">
        <div>
          <div className="section-kicker">DAILY QUESTS</div>
          <h1>Daily Learning Challenges</h1>
          <p>
            Complete quick 2-5 minute activities each day to boost your streak, earn bonus XP, and stockpile Maatu Points.
          </p>
        </div>
        <div className="challenges-summary-stat">
          <CalendarCheck size={20} color="#174B3A" />
          <span>
            {completedCount} / {challenges.length} Done Today
          </span>
        </div>
      </div>

      <div className="challenges-grid">
        {challenges.map((ch) => {
          const progressPercent = Math.min(
            100,
            Math.round((ch.currentCount / ch.targetCount) * 100)
          );

          return (
            <div
              key={ch.id}
              className={`challenge-card ${ch.isCompleted ? "completed" : ""} ${
                ch.isClaimed ? "claimed" : ""
              }`}
            >
              <div className="challenge-card-top">
                <div className="challenge-difficulty-pill">{ch.difficulty}</div>
                <div className="challenge-time">
                  <Clock size={13} /> {ch.estimatedMinutes}
                </div>
              </div>

              <h3>{ch.title}</h3>
              <div className="challenge-kn-title">{ch.titleKannada}</div>
              <p>{ch.description}</p>

              {/* Progress Bar */}
              <div className="challenge-progress-section">
                <div className="progress-labels">
                  <span>Progress</span>
                  <strong>
                    {ch.currentCount} / {ch.targetCount}
                  </strong>
                </div>
                <div className="challenge-bar">
                  <span style={{ width: `${progressPercent}%` }} />
                </div>
              </div>

              {/* Reward Tags */}
              <div className="challenge-rewards-row">
                <span className="reward-tag xp">
                  <Sparkles size={13} /> +{ch.xpReward} XP
                </span>
                <span className="reward-tag points">
                  <Coins size={13} /> +{ch.pointsReward} Points
                </span>
              </div>

              {/* Action Buttons */}
              <div className="challenge-card-action">
                {ch.isClaimed ? (
                  <div className="claimed-status-pill">
                    <CheckCircle2 size={15} color="#26845B" /> Reward Claimed
                  </div>
                ) : ch.isCompleted ? (
                  <button
                    className="claim-reward-button"
                    onClick={() => handleClaim(ch)}
                  >
                    Claim Reward <Sparkles size={15} />
                  </button>
                ) : (
                  <button
                    className="action-link-btn"
                    onClick={() => {
                      if (ch.category === "words" || ch.category === "lesson") {
                        onNavigate("learn");
                      } else if (ch.category === "speaking") {
                        onNavigate("practice");
                      } else if (ch.category === "game" || ch.category === "quiz") {
                        onNavigate("games");
                      }
                    }}
                  >
                    Start Challenge <ArrowRight size={15} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
