import React, { useState } from "react";
import { Check, RotateCcw, Volume2, Sparkles, HelpCircle } from "lucide-react";
import confetti from "canvas-confetti";
import { storage } from "../../services/storage";
import { speechService } from "../../services/speech";

interface SentenceChallenge {
  id: string;
  englishTarget: string;
  correctWords: string[];
  kannadaComplete: string;
  hint: string;
}

const sentenceRounds: SentenceChallenge[] = [
  {
    id: "sb-1",
    englishTarget: "I am learning Kannada.",
    correctWords: ["ನಾನು", "ಕನ್ನಡ", "ಕಲಿಯುತ್ತಿದ್ದೇನೆ"],
    kannadaComplete: "ನಾನು ಕನ್ನಡ ಕಲಿಯುತ್ತಿದ್ದೇನೆ",
    hint: "Subject (ನಾನು) + Object (ಕನ್ನಡ) + Verb (ಕಲಿಯುತ್ತಿದ್ದೇನೆ).",
  },
  {
    id: "sb-2",
    englishTarget: "Please give one masala dosa.",
    correctWords: ["ಒಂದು", "ಮಸಾಲೆ", "ದೋಸೆ", "ಕೊಡಿ"],
    kannadaComplete: "ಒಂದು ಮಸಾಲೆ ದೋಸೆ ಕೊಡಿ",
    hint: "Start with quantity 'ಒಂದು' (one), then the food, then 'ಕೊಡಿ' (give).",
  },
  {
    id: "sb-3",
    englishTarget: "Where is the bus stop?",
    correctWords: ["ಬಸ್", "ನಿಲ್ದಾಣ", "ಎಲ್ಲಿದೆ?"],
    kannadaComplete: "ಬಸ್ ನಿಲ್ದಾಣ ಎಲ್ಲಿದೆ?",
    hint: "Topic (ಬಸ್ ನಿಲ್ದಾಣ) followed by question word (ಎಲ್ಲಿದೆ?).",
  },
  {
    id: "sb-4",
    englishTarget: "Thank you for your help.",
    correctWords: ["ನಿಮ್ಮ", "ಸಹಾಯಕ್ಕೆ", "ಧನ್ಯವಾದಗಳು"],
    kannadaComplete: "ನಿಮ್ಮ ಸಹಾಯಕ್ಕೆ ಧನ್ಯವಾದಗಳು",
    hint: "Your (ನಿಮ್ಮ) + For help (ಸಹಾಯಕ್ಕೆ) + Thank you (ಧನ್ಯವಾದಗಳು).",
  },
];

export const SentenceBuilderGame: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [currentRound, setCurrentRound] = useState(0);
  const [placedWords, setPlacedWords] = useState<string[]>([]);
  const [availableWords, setAvailableWords] = useState<string[]>(() => {
    return [...sentenceRounds[0].correctWords].sort(() => Math.random() - 0.5);
  });
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const current = sentenceRounds[currentRound];

  function handleSelectWord(word: string, index: number) {
    const updatedAvailable = [...availableWords];
    updatedAvailable.splice(index, 1);
    setAvailableWords(updatedAvailable);
    setPlacedWords([...placedWords, word]);
    setIsCorrect(null);
  }

  function handleRemoveWord(index: number) {
    const word = placedWords[index];
    const updatedPlaced = [...placedWords];
    updatedPlaced.splice(index, 1);
    setPlacedWords(updatedPlaced);
    setAvailableWords([...availableWords, word]);
    setIsCorrect(null);
  }

  function checkSentence() {
    const isMatch = placedWords.join(" ") === current.correctWords.join(" ");
    setIsCorrect(isMatch);

    if (isMatch) {
      speechService.speakKannada(current.kannadaComplete);

      if (currentRound + 1 < sentenceRounds.length) {
        setTimeout(() => {
          const next = currentRound + 1;
          setCurrentRound(next);
          setPlacedWords([]);
          setAvailableWords([...sentenceRounds[next].correctWords].sort(() => Math.random() - 0.5));
          setIsCorrect(null);
          setShowHint(false);
        }, 1200);
      } else {
        setIsCompleted(true);
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });

        storage.awardCurrency({
          xpAmount: 30,
          pointsAmount: 8,
          reason: "Completed Kannada Sentence Builder game",
          referenceId: `game:sentence_builder:${Date.now()}`,
          idempotencyKey: `sentence_builder_${Date.now()}`,
        });
        storage.incrementChallengeProgress("game", 1);
      }
    }
  }

  function restartGame() {
    setCurrentRound(0);
    setPlacedWords([]);
    setAvailableWords([...sentenceRounds[0].correctWords].sort(() => Math.random() - 0.5));
    setIsCorrect(null);
    setShowHint(false);
    setIsCompleted(false);
  }

  return (
    <div className="game-card-container">
      <div className="game-header">
        <div>
          <span className="section-kicker">MINI-GAME 2</span>
          <h2>Kannada Sentence Builder</h2>
          <p>Assemble words in their natural Subject-Object-Verb order to build authentic sentences.</p>
        </div>
        <button className="text-button" onClick={onBack}>
          ← Back to Games
        </button>
      </div>

      {!isCompleted ? (
        <div className="sentence-builder-board">
          <div className="round-progress-indicator">
            Round {currentRound + 1} of {sentenceRounds.length}
          </div>

          <div className="target-sentence-card">
            <span className="stat-label">ENGLISH MEANING TO BUILD</span>
            <h3>"{current.englishTarget}"</h3>
          </div>

          <div className={`construction-box ${isCorrect === true ? "correct" : isCorrect === false ? "wrong" : ""}`}>
            <span className="box-label">YOUR SENTENCE:</span>
            <div className="placed-tiles-row">
              {placedWords.length === 0 ? (
                <span className="placeholder-text">Tap the words below to place them here...</span>
              ) : (
                placedWords.map((word, idx) => (
                  <button key={idx} className="sentence-tile placed" onClick={() => handleRemoveWord(idx)}>
                    {word} <span className="tile-remove">×</span>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="word-pool-area">
            <span className="stat-label">AVAILABLE KANNADA WORDS</span>
            <div className="pool-tiles-row">
              {availableWords.map((word, idx) => (
                <button key={idx} className="sentence-tile pool" onClick={() => handleSelectWord(word, idx)}>
                  {word}
                </button>
              ))}
            </div>
          </div>

          <div className="sentence-controls">
            <button
              className="primary-button"
              onClick={checkSentence}
              disabled={placedWords.length === 0}
            >
              <Check size={18} /> Check Sentence
            </button>

            <button
              className="text-button"
              onClick={() => speechService.speakKannada(current.kannadaComplete)}
            >
              <Volume2 size={16} /> Listen to Sentence
            </button>

            <button
              className="text-button"
              onClick={() => setShowHint(!showHint)}
            >
              <HelpCircle size={16} /> {showHint ? "Hide Hint" : "Hint"}
            </button>
          </div>

          {showHint && (
            <div className="game-hint-box">
              <strong>Grammar Tip:</strong> {current.hint}
            </div>
          )}

          {isCorrect === false && (
            <div className="feedback-banner wrong">
              Not quite yet. Remember Kannada puts the verb at the end! Tap a placed word to remove it.
            </div>
          )}
          {isCorrect === true && (
            <div className="feedback-banner correct">
              ಉತ್ತಮ! Perfectly structured sentence!
            </div>
          )}
        </div>
      ) : (
        <div className="game-results">
          <div className="results-trophy">
            <Sparkles size={46} color="#26845B" />
          </div>
          <h3>Sentence Master!</h3>
          <p>You have mastered Kannada sentence structure and syntax across all {sentenceRounds.length} rounds.</p>
          <div className="results-rewards">
            <span>Rewards Earned:</span>
            <strong>+30 XP</strong>
            <strong>+8 Maatu Points</strong>
          </div>
          <div className="game-actions">
            <button className="primary-button" onClick={restartGame}>
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
