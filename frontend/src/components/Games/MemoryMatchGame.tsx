import React, { useState, useEffect } from "react";
import { RotateCcw, Award } from "lucide-react";
import confetti from "canvas-confetti";
import { storage } from "../../services/storage";

interface CardItem {
  id: string;
  pairId: string;
  type: "kannada" | "english";
  content: string;
  sub?: string;
}

const memoryPairs = [
  { pairId: "m1", kannada: "ಅಮ್ಮ", sub: "Amma", english: "Mother" },
  { pairId: "m2", kannada: "ಆನೆ", sub: "Āne", english: "Elephant" },
  { pairId: "m3", kannada: "ಹಾಲು", sub: "Hālu", english: "Milk" },
  { pairId: "m4", kannada: "ನೀರು", sub: "Nīru", english: "Water" },
  { pairId: "m5", kannada: "ಸ್ನೇಹಿತ", sub: "Snēhita", english: "Friend" },
  { pairId: "m6", kannada: "ಪುಸ್ತಕ", sub: "Pustaka", english: "Book" },
];

function createShuffledCards(): CardItem[] {
  const cards: CardItem[] = [];
  memoryPairs.forEach((p) => {
    cards.push({
      id: `${p.pairId}_kn`,
      pairId: p.pairId,
      type: "kannada",
      content: p.kannada,
      sub: p.sub,
    });
    cards.push({
      id: `${p.pairId}_en`,
      pairId: p.pairId,
      type: "english",
      content: p.english,
    });
  });
  return cards.sort(() => Math.random() - 0.5);
}

export const MemoryMatchGame: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [cards, setCards] = useState<CardItem[]>(createShuffledCards);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    let timer: number;
    if (!isCompleted) {
      timer = window.setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isCompleted]);

  function handleCardClick(index: number) {
    if (flippedIndices.length === 2) return;
    if (flippedIndices.includes(index)) return;
    if (matchedPairs.includes(cards[index].pairId)) return;

    const newFlipped = [...flippedIndices, index];
    setFlippedIndices(newFlipped);

    if (newFlipped.length === 2) {
      setMoves((m) => m + 1);
      const firstCard = cards[newFlipped[0]];
      const secondCard = cards[newFlipped[1]];

      if (firstCard.pairId === secondCard.pairId) {
        // Matched!
        const newMatched = [...matchedPairs, firstCard.pairId];
        setMatchedPairs(newMatched);
        setFlippedIndices([]);

        if (newMatched.length === memoryPairs.length) {
          setIsCompleted(true);
          confetti({ particleCount: 75, spread: 65, origin: { y: 0.6 } });

          storage.awardCurrency({
            xpAmount: 25,
            pointsAmount: 6,
            reason: "Completed Kannada Memory Match game",
            referenceId: `game:memory_match:${Date.now()}`,
            idempotencyKey: `memory_match_${Date.now()}`,
          });
          storage.incrementChallengeProgress("game", 1);
        }
      } else {
        setTimeout(() => {
          setFlippedIndices([]);
        }, 1000);
      }
    }
  }

  function restartGame() {
    setCards(createShuffledCards());
    setFlippedIndices([]);
    setMatchedPairs([]);
    setMoves(0);
    setSeconds(0);
    setIsCompleted(false);
  }

  return (
    <div className="game-card-container">
      <div className="game-header">
        <div>
          <span className="section-kicker">MINI-GAME 3</span>
          <h2>Kannada Memory Match</h2>
          <p>Flip the cards to match Kannada words with their English meanings.</p>
        </div>
        <button className="text-button" onClick={onBack}>
          ← Back to Games
        </button>
      </div>

      <div className="game-stats-bar">
        <div className="game-stat">
          <span className="stat-label">TIME</span>
          <strong>{seconds}s</strong>
        </div>
        <div className="game-stat">
          <span className="stat-label">MOVES</span>
          <strong>{moves}</strong>
        </div>
        <div className="game-stat">
          <span className="stat-label">MATCHED</span>
          <strong style={{ color: "#26845B" }}>
            {matchedPairs.length} / {memoryPairs.length}
          </strong>
        </div>
      </div>

      {!isCompleted ? (
        <div className="memory-grid">
          {cards.map((card, idx) => {
            const isFlipped = flippedIndices.includes(idx);
            const isMatched = matchedPairs.includes(card.pairId);

            return (
              <button
                key={card.id}
                className={`memory-card ${isFlipped ? "flipped" : ""} ${isMatched ? "matched" : ""}`}
                onClick={() => handleCardClick(idx)}
                disabled={isMatched || isFlipped}
              >
                {isFlipped || isMatched ? (
                  <div className="memory-card-front">
                    <div className="memory-word">{card.content}</div>
                    {card.sub && <div className="memory-sub">{card.sub}</div>}
                  </div>
                ) : (
                  <div className="memory-card-back">
                    <span className="back-emblem">ಕ</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="game-results">
          <div className="results-trophy">
            <Award size={46} color="#D4A64A" />
          </div>
          <h3>Superb Memory!</h3>
          <p>
            You matched all {memoryPairs.length} pairs in {moves} moves and {seconds} seconds.
          </p>
          <div className="results-rewards">
            <span>Rewards Earned:</span>
            <strong>+25 XP</strong>
            <strong>+6 Maatu Points</strong>
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
