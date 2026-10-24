import React, { useState, useEffect } from "react";
import { Zap, RotateCcw, Award, CheckCircle2, XCircle } from "lucide-react";
import confetti from "canvas-confetti";
import { storage } from "../../services/storage";

interface Question {
  kannada: string;
  transliteration: string;
  correct: string;
  options: string[];
}

const sprintQuestions: Question[] = [
  {
    kannada: "ನಮಸ್ಕಾರ",
    transliteration: "Namaskāra",
    correct: "Hello / Greetings",
    options: ["Hello / Greetings", "Thank you", "Goodbye", "Please"],
  },
  {
    kannada: "ಧನ್ಯವಾದಗಳು",
    transliteration: "Dhanyavādagaḷu",
    correct: "Thank you",
    options: ["Thank you", "Sorry", "Welcome", "How are you?"],
  },
  {
    kannada: "ಊಟ",
    transliteration: "Ūṭa",
    correct: "Meal / Food",
    options: ["Meal / Food", "Water", "House", "Friend"],
  },
  {
    kannada: "ಹಾಲು",
    transliteration: "Hālu",
    correct: "Milk",
    options: ["Milk", "Tea", "Coffee", "Juice"],
  },
  {
    kannada: "ನೀರು",
    transliteration: "Nīru",
    correct: "Water",
    options: ["Water", "River", "Rain", "Fire"],
  },
  {
    kannada: "ಇಲ್ಲಿ",
    transliteration: "Illi",
    correct: "Here",
    options: ["Here", "There", "Where", "Everywhere"],
  },
  {
    kannada: "ಅಲ್ಲಿ",
    transliteration: "Alli",
    correct: "There",
    options: ["There", "Here", "Near", "Far"],
  },
  {
    kannada: "ದೋಸೆ",
    transliteration: "Dōse",
    correct: "Dosa",
    options: ["Dosa", "Idli", "Vada", "Rice"],
  },
  {
    kannada: "ಸ್ನೇಹಿತ",
    transliteration: "Snēhita",
    correct: "Friend",
    options: ["Friend", "Teacher", "Brother", "Neighbor"],
  },
  {
    kannada: "ಪುಸ್ತಕ",
    transliteration: "Pustaka",
    correct: "Book",
    options: ["Book", "Pen", "School", "Library"],
  },
];

export const WordSprintGame: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [gameState, setGameState] = useState<"ready" | "playing" | "ended">("ready");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);

  useEffect(() => {
    let timer: number;
    if (gameState === "playing" && timeLeft > 0) {
      timer = window.setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (gameState === "playing" && timeLeft === 0) {
      finishGame(score);
    }
    return () => clearInterval(timer);
  }, [gameState, timeLeft, score]);

  function startGame() {
    setGameState("playing");
    setCurrentIndex(0);
    setScore(0);
    setStreak(0);
    setTimeLeft(30);
    setFeedback(null);
  }

  function handleSelect(option: string) {
    if (gameState !== "playing" || feedback !== null) return;

    const currentQ = sprintQuestions[currentIndex % sprintQuestions.length];
    const isCorrect = option === currentQ.correct;

    if (isCorrect) {
      const multiplier = Math.min(3, 1 + Math.floor(streak / 2));
      const pointsEarned = 10 * multiplier;
      setScore((prev) => prev + pointsEarned);
      setStreak((prev) => prev + 1);
      setFeedback("correct");
    } else {
      setStreak(0);
      setFeedback("wrong");
    }

    setTimeout(() => {
      setFeedback(null);
      setCurrentIndex((prev) => prev + 1);
    }, 450);
  }

  function finishGame(finalScore: number) {
    setGameState("ended");
    if (finalScore >= 40) {
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } });
    }

    // Award XP and Maatu points
    const xpReward = Math.min(40, 10 + Math.floor(finalScore / 3));
    const pointsReward = Math.min(8, 2 + Math.floor(finalScore / 15));

    storage.awardCurrency({
      xpAmount: xpReward,
      pointsAmount: pointsReward,
      reason: `Completed Kannada Word Sprint (Score: ${finalScore})`,
      referenceId: `game:wordsprint:${Date.now()}`,
      idempotencyKey: `wordsprint_${Date.now()}`,
    });

    storage.incrementChallengeProgress("game", 1);
  }

  const currentQ = sprintQuestions[currentIndex % sprintQuestions.length];

  return (
    <div className="game-card-container">
      <div className="game-header">
        <div>
          <span className="section-kicker">MINI-GAME 1</span>
          <h2>Kannada Word Sprint</h2>
          <p>Speed vocabulary test. Pick the right English meaning before the clock hits zero!</p>
        </div>
        <button className="text-button" onClick={onBack}>
          ← Back to Games
        </button>
      </div>

      {gameState === "ready" && (
        <div className="game-lobby">
          <div className="game-badge-icon">
            <Zap size={36} color="#D4A64A" />
          </div>
          <h3>Ready for the 30-Second Sprint?</h3>
          <p>Test your rapid word recognition. Build streaks for 2x and 3x multiplier points!</p>
          <div className="game-rules-list">
            <span>⚡ 30 seconds total</span>
            <span>🎯 10 points per correct answer</span>
            <span>🔥 Consecutive streaks multiply your score</span>
          </div>
          <button className="primary-button" onClick={startGame}>
            Start Word Sprint
          </button>
        </div>
      )}

      {gameState === "playing" && (
        <div className="game-play-area">
          <div className="game-stats-bar">
            <div className="game-stat">
              <span className="stat-label">TIME</span>
              <strong className={timeLeft <= 5 ? "time-urgent" : ""}>{timeLeft}s</strong>
            </div>
            <div className="game-stat">
              <span className="stat-label">SCORE</span>
              <strong>{score}</strong>
            </div>
            <div className="game-stat">
              <span className="stat-label">STREAK</span>
              <strong style={{ color: "#D4A64A" }}>{streak}x</strong>
            </div>
          </div>

          <div className={`word-prompt-card ${feedback || ""}`}>
            <div className="prompt-kannada">{currentQ.kannada}</div>
            <div className="prompt-transliteration">{currentQ.transliteration}</div>
          </div>

          <div className="options-grid">
            {currentQ.options.map((option, idx) => (
              <button
                key={idx}
                className="game-option-btn"
                onClick={() => handleSelect(option)}
                disabled={feedback !== null}
              >
                {option}
              </button>
            ))}
          </div>

          {feedback === "correct" && (
            <div className="feedback-banner correct">
              <CheckCircle2 size={18} /> Correct! +10
            </div>
          )}
          {feedback === "wrong" && (
            <div className="feedback-banner wrong">
              <XCircle size={18} /> Correct answer: {currentQ.correct}
            </div>
          )}
        </div>
      )}

      {gameState === "ended" && (
        <div className="game-results">
          <div className="results-trophy">
            <Award size={44} color="#D4A64A" />
          </div>
          <h3>Sprint Complete!</h3>
          <div className="final-score-display">
            <span>Final Score</span>
            <strong>{score}</strong>
          </div>
          <p>
            {score >= 60
              ? "ಕಮಾಲ್! Spectacular vocabulary speed and accuracy!"
              : score >= 30
              ? "ಚೆನ್ನಾಗಿದೆ! Great effort. Practice again to break your record!"
              : "Good start! The more you play, the faster you get."}
          </p>

          <div className="results-rewards">
            <span>Rewards Earned:</span>
            <strong>+{Math.min(40, 10 + Math.floor(score / 3))} XP</strong>
            <strong>+{Math.min(8, 2 + Math.floor(score / 15))} Maatu Points</strong>
          </div>

          <div className="game-actions">
            <button className="primary-button" onClick={startGame}>
              <RotateCcw size={16} /> Play Again
            </button>
            <button className="text-button" onClick={onBack}>
              Choose Another Game
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
