import React, { useState } from "react";
import { Store, RotateCcw, Volume2, CheckCircle2, ArrowRight } from "lucide-react";
import confetti from "canvas-confetti";
import { storage } from "../../services/storage";
import { speechService } from "../../services/speech";

interface DialogTurn {
  shopkeeperSaid: string;
  shopkeeperSaidEnglish: string;
  options: {
    kannada: string;
    english: string;
    isCorrect: boolean;
    explanation: string;
  }[];
}

const shopkeeperStory: DialogTurn[] = [
  {
    shopkeeperSaid: "ನಮಸ್ಕಾರ ಬನ್ನಿ ಸರ್! ಏನು ಬೇಕಾಗಿತ್ತು ಇವತ್ತು?",
    shopkeeperSaidEnglish: "Hello, welcome sir! What do you need today?",
    options: [
      {
        kannada: "ನಮಸ್ಕಾರ ಅಣ್ಣಾ, ತಾಜಾ ಸೇಬು ಮತ್ತು ಮಾವಿನ ಹಣ್ಣು ಇದೆಯಾ?",
        english: "Hello brother, do you have fresh apples and mangoes?",
        isCorrect: true,
        explanation: "Polite and natural greeting using 'ಅಣ್ಣಾ' (brother) + asking for fresh fruits.",
      },
      {
        kannada: "ಬೇಗ ಕೊಡಿ, ನನಗೆ ಟೈಮ್ ಇಲ್ಲ.",
        english: "Give quickly, I don't have time.",
        isCorrect: false,
        explanation: "Too blunt! In Karnataka, friendly small talk and respect build great relations.",
      },
    ],
  },
  {
    shopkeeperSaid: "ಹೌದು ಸರ್, ಇವತ್ತೇ ತಂದಿದ್ದು! ತುಂಬಾ ಸಿಹಿಯಾಗಿದೆ.",
    shopkeeperSaidEnglish: "Yes sir, brought today itself! Very sweet.",
    options: [
      {
        kannada: "ಒಳ್ಳೆಯದು, ಒಂದು ಕೆಜಿ ಮಾವಿನ ಹಣ್ಣಿನ ಬೆಲೆ ಎಷ್ಟು?",
        english: "Good, how much is one kg of mangoes?",
        isCorrect: true,
        explanation: "Natural inquiry into price: 'ಬೆಲೆ ಎಷ್ಟು?'.",
      },
      {
        kannada: "ಮೆಟ್ರೋ ಸ್ಟೇಷನ್ ಎಲ್ಲಿ ಬರುತ್ತದೆ?",
        english: "Where is the metro station?",
        isCorrect: false,
        explanation: "Unrelated question to shopping for mangoes!",
      },
    ],
  },
  {
    shopkeeperSaid: "ಒಂದು ಕೆಜಿಗೆ ನೂರೈವತ್ತು ರೂಪಾಯಿ ಸರ್ (₹150).",
    shopkeeperSaidEnglish: "One hundred and fifty rupees per kg sir (₹150).",
    options: [
      {
        kannada: "ಸ್ವಲ್ಪ ಜಾಸ್ತಿ ಆಯ್ತು, ಕಮ್ಮಿ ಮಾಡಿ ಎರಡು ಕೆಜಿ ತಗೊಳ್ತೀನಿ.",
        english: "A little high, please reduce, I will take two kg.",
        isCorrect: true,
        explanation: "Classic polite Bengaluru bargaining: offering to buy more for a better rate.",
      },
      {
        kannada: "ನಾನು ದುಡ್ಡು ಕೊಡಲ್ಲ.",
        english: "I will not give money.",
        isCorrect: false,
        explanation: "You can't refuse to pay!",
      },
    ],
  },
  {
    shopkeeperSaid: "ಸರಿ ಸರ್, ನೀವು ಕನ್ನಡಿಗರ ಹಾಗೆ ಮಾತಾಡಿದ್ರಿ! ₹130 ಕೊಡಿ, ಎರಡು ಕೆಜಿ ಪ್ಯಾಕ್ ಮಾಡ್ತೀನಿ.",
    shopkeeperSaidEnglish: "Okay sir, you spoke Kannada so nicely! Give ₹130, I will pack two kg.",
    options: [
      {
        kannada: "ತುಂಬಾ ಧನ್ಯವಾದಗಳು ಅಣ್ಣಾ! ಫೋನ್-ಪೇ / ಯುಪಿಐ ಇದೆಯಾ?",
        english: "Thank you so much brother! Do you have PhonePe / UPI?",
        isCorrect: true,
        explanation: "Heartfelt thanks and modern digital payment question.",
      },
      {
        kannada: "ಬಸ್ ಹೊರಟು ಹೋಯಿತು.",
        english: "The bus left.",
        isCorrect: false,
        explanation: "Unrelated phrase.",
      },
    ],
  },
];

export const ShopkeeperGame: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [turnIndex, setTurnIndex] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isWrongChoice, setIsWrongChoice] = useState(false);

  const currentTurn = shopkeeperStory[turnIndex];

  function handleChooseOption(opt: (typeof currentTurn.options)[0]) {
    speechService.speakKannada(opt.kannada);

    if (opt.isCorrect) {
      setIsWrongChoice(false);
      setFeedback(opt.explanation);

      if (turnIndex + 1 < shopkeeperStory.length) {
        setTimeout(() => {
          setTurnIndex((i) => i + 1);
          setFeedback(null);
        }, 1800);
      } else {
        setTimeout(() => {
          setIsSuccess(true);
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });

          storage.awardCurrency({
            xpAmount: 35,
            pointsAmount: 10,
            reason: "Completed Shopkeeper Market Dialogue Challenge",
            referenceId: `game:shopkeeper:${Date.now()}`,
            idempotencyKey: `shopkeeper_${Date.now()}`,
          });
          storage.incrementChallengeProgress("game", 1);
        }, 1500);
      }
    } else {
      setIsWrongChoice(true);
      setFeedback(opt.explanation);
    }
  }

  function restart() {
    setTurnIndex(0);
    setFeedback(null);
    setIsSuccess(false);
    setIsWrongChoice(false);
  }

  return (
    <div className="game-card-container">
      <div className="game-header">
        <div>
          <span className="section-kicker">MINI-GAME 4</span>
          <h2>Shopkeeper Challenge</h2>
          <p>Practice bargaining, ordering, and courteous conversations at a Bengaluru vegetable market.</p>
        </div>
        <button className="text-button" onClick={onBack}>
          ← Back to Games
        </button>
      </div>

      {!isSuccess ? (
        <div className="shopkeeper-scene">
          <div className="scene-progress">
            Step {turnIndex + 1} of {shopkeeperStory.length}
          </div>

          <div className="shopkeeper-avatar-card">
            <div className="shopkeeper-icon">
              <Store size={32} color="#174B3A" />
            </div>
            <div className="shopkeeper-bubble">
              <span className="bubble-speaker">ಮಂಜುನಾಥ್ (Shopkeeper)</span>
              <h3>"{currentTurn.shopkeeperSaid}"</h3>
              <p>{currentTurn.shopkeeperSaidEnglish}</p>
              <button
                className="listen-icon-btn"
                onClick={() => speechService.speakKannada(currentTurn.shopkeeperSaid)}
                title="Listen to shopkeeper"
              >
                <Volume2 size={16} /> Listen
              </button>
            </div>
          </div>

          <div className="learner-choices-area">
            <span className="stat-label">WHAT WILL YOU SAY?</span>
            <div className="choices-stack">
              {currentTurn.options.map((opt, idx) => (
                <button
                  key={idx}
                  className="dialog-choice-btn"
                  onClick={() => handleChooseOption(opt)}
                >
                  <strong className="choice-kannada">{opt.kannada}</strong>
                  <span className="choice-english">{opt.english}</span>
                </button>
              ))}
            </div>
          </div>

          {feedback && (
            <div className={`feedback-banner ${isWrongChoice ? "wrong" : "correct"}`}>
              {isWrongChoice ? (
                <span>⚠️ {feedback}</span>
              ) : (
                <span>
                  <CheckCircle2 size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: "6px" }} />
                  {feedback}
                </span>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="game-results">
          <div className="results-trophy">
            <CheckCircle2 size={48} color="#26845B" />
          </div>
          <h3>Deal Closed Like a True Local!</h3>
          <p>
            You bargained politely, ordered fresh fruits in natural Kannada, and completed your shopping interaction with flying colors.
          </p>
          <div className="results-rewards">
            <span>Rewards Earned:</span>
            <strong>+35 XP</strong>
            <strong>+10 Maatu Points</strong>
          </div>
          <div className="game-actions">
            <button className="primary-button" onClick={restart}>
              <RotateCcw size={16} /> Replay Scenario
            </button>
            <button className="text-button" onClick={onBack}>
              Explore More Games <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
