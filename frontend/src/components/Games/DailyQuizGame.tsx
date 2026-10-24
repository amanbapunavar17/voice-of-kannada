import React, { useState } from "react";
import { CheckCircle2, RotateCcw, HelpCircle, ArrowRight } from "lucide-react";
import confetti from "canvas-confetti";
import { storage } from "../../services/storage";

interface QuizQuestion {
  question: string;
  questionKannada?: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const quizQuestions: QuizQuestion[] = [
  {
    question: "How do you politely ask for someone's name in Kannada?",
    questionKannada: "ನಿಮ್ಮ ಹೆಸರೇನು ಎಂದು ಗೌರವಯುತವಾಗಿ ಕೇಳುವುದು ಹೇಗೆ?",
    options: [
      "ನಿಮ್ಮ ಹೆಸರೇನು? (Nimma hesarēnu?)",
      "ನೀವು ಎಲ್ಲಿಗೆ ಹೋಗ್ತೀರಾ?",
      "ಇದರ ಬೆಲೆ ಎಷ್ಟು?",
      "ಊಟ ಆಯ್ತಾ?",
    ],
    correctIndex: 0,
    explanation: "'ನಿಮ್ಮ' (your, polite) + 'ಹೆಸರೇನು?' (what is the name?).",
  },
  {
    question: "What does the iconic phrase 'ಸ್ವಲ್ಪ ಅಡ್ಜಸ್ಟ್ ಮಾಡಿ' mean?",
    options: [
      "Please run faster",
      "Please accommodate / adjust a little",
      "The shop is closed",
      "I am not interested",
    ],
    correctIndex: 1,
    explanation: "'ಸ್ವಲ್ಪ ಅಡ್ಜಸ್ಟ್ ಮಾಡಿ' is the beloved Bengaluru spirit of accommodation and flexibility.",
  },
  {
    question: "Which of these is the correct Kannada word for 'Water'?",
    options: ["ಹಾಲು (Hālu)", "ನೀರು (Nīru)", "ಕಾಫಿ (Kāphi)", "ಹಣ್ಣು (Haṇṇu)"],
    correctIndex: 1,
    explanation: "'ನೀರು' (Nīru) means water. 'ಹಾಲು' means milk, 'ಹಣ್ಣು' means fruit.",
  },
  {
    question: "In Kannada grammar, what is the usual sentence order?",
    options: [
      "Subject - Verb - Object (SVO)",
      "Subject - Object - Verb (SOV)",
      "Verb - Subject - Object (VSO)",
      "Object - Verb - Subject (OVS)",
    ],
    correctIndex: 1,
    explanation: "Kannada follows Subject-Object-Verb (e.g. ನಾನು [I] ಕನ್ನಡ [Kannada] ಕಲಿಯುತ್ತಿದ್ದೇನೆ [am learning]).",
  },
  {
    question: "What is the traditional caring greeting asking if someone has eaten?",
    options: [
      "ಮತ್ತೆ ಸಿಗೋಣ (Matte sigōṇa)",
      "ಊಟ ಆಯ್ತಾ? (Ūṭa āytā?)",
      "ಬಸ್ ನಿಲ್ದಾಣ (Bas nildāṇa)",
      "ಶುಭೋದಯ (Shubhōdaya)",
    ],
    correctIndex: 1,
    explanation: "'ಊಟ ಆಯ್ತಾ?' (Had your meal?) is a deep cultural greeting used across Karnataka to show love and warmth.",
  },
];

export const DailyQuizGame: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const currentQ = quizQuestions[currentIndex];

  function handleSelect(index: number) {
    if (isAnswered) return;
    setSelectedOption(index);
    setIsAnswered(true);

    const isCorrect = index === currentQ.correctIndex;
    if (isCorrect) {
      setScore((s) => s + 1);
    }
  }

  function handleNext() {
    if (currentIndex + 1 < quizQuestions.length) {
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setIsCompleted(true);
      const finalScore = score + (selectedOption === currentQ.correctIndex ? 1 : 0);
      if (finalScore >= 4) {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      }

      storage.awardCurrency({
        xpAmount: 35,
        pointsAmount: 10,
        reason: `Completed Daily Kannada Quiz (Score: ${finalScore}/5)`,
        referenceId: `game:quiz:${Date.now()}`,
        idempotencyKey: `daily_quiz_${Date.now()}`,
      });
      storage.incrementChallengeProgress("quiz", 5);
      storage.incrementChallengeProgress("game", 1);
    }
  }

  function restart() {
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setScore(0);
    setIsCompleted(false);
  }

  return (
    <div className="game-card-container">
      <div className="game-header">
        <div>
          <span className="section-kicker">MINI-GAME 5</span>
          <h2>Daily Kannada Quiz</h2>
          <p>5 quick questions on vocabulary, culture, and spoken expressions.</p>
        </div>
        <button className="text-button" onClick={onBack}>
          ← Back to Games
        </button>
      </div>

      {!isCompleted ? (
        <div className="quiz-play-area">
          <div className="quiz-meta-bar">
            <span>
              Question {currentIndex + 1} of {quizQuestions.length}
            </span>
            <span>Current Score: {score}</span>
          </div>

          <div className="quiz-question-box">
            <h3>{currentQ.question}</h3>
            {currentQ.questionKannada && (
              <p className="quiz-question-kannada">{currentQ.questionKannada}</p>
            )}
          </div>

          <div className="quiz-options-list">
            {currentQ.options.map((opt, idx) => {
              let btnClass = "quiz-opt-btn";
              if (isAnswered) {
                if (idx === currentQ.correctIndex) btnClass += " correct";
                else if (idx === selectedOption) btnClass += " wrong";
              } else if (selectedOption === idx) {
                btnClass += " selected";
              }

              return (
                <button
                  key={idx}
                  className={btnClass}
                  onClick={() => handleSelect(idx)}
                  disabled={isAnswered}
                >
                  <span className="opt-letter">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span>{opt}</span>
                </button>
              );
            })}
          </div>

          {isAnswered && (
            <div className="quiz-explanation-box">
              <div className="explanation-title">
                <HelpCircle size={16} /> Explanation
              </div>
              <p>{currentQ.explanation}</p>
              <button className="primary-button" onClick={handleNext}>
                {currentIndex + 1 < quizQuestions.length ? "Next Question" : "See Results"}{" "}
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="game-results">
          <div className="results-trophy">
            <CheckCircle2 size={48} color="#26845B" />
          </div>
          <h3>Quiz Complete!</h3>
          <div className="final-score-display">
            <span>Score</span>
            <strong>
              {score} / {quizQuestions.length}
            </strong>
          </div>
          <p>
            {score === 5
              ? "ಪರಿಪೂರ್ಣ! Perfect score! You have an outstanding command of everyday Kannada."
              : score >= 3
              ? "ಉತ್ತಮ ಪ್ರಯತ್ನ! Very good effort. You are progressing fast!"
              : "Good practice! Review the lesson modules and try again tomorrow."}
          </p>
          <div className="results-rewards">
            <span>Rewards Earned:</span>
            <strong>+35 XP</strong>
            <strong>+10 Maatu Points</strong>
          </div>
          <div className="game-actions">
            <button className="primary-button" onClick={restart}>
              <RotateCcw size={16} /> Replay Quiz
            </button>
            <button className="text-button" onClick={onBack}>
              Explore More Games
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
