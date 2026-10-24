import React, { useState } from "react";
import { Zap, BookOpen, Layers, Store, HelpCircle, ArrowRight, Gamepad2 } from "lucide-react";
import { WordSprintGame } from "./WordSprintGame";
import { SentenceBuilderGame } from "./SentenceBuilderGame";
import { MemoryMatchGame } from "./MemoryMatchGame";
import { ShopkeeperGame } from "./ShopkeeperGame";
import { DailyQuizGame } from "./DailyQuizGame";

type ActiveGame = "sprint" | "sentence" | "memory" | "shopkeeper" | "quiz" | null;

export const GamesHubView: React.FC = () => {
  const [activeGame, setActiveGame] = useState<ActiveGame>(null);

  if (activeGame === "sprint") {
    return <WordSprintGame onBack={() => setActiveGame(null)} />;
  }
  if (activeGame === "sentence") {
    return <SentenceBuilderGame onBack={() => setActiveGame(null)} />;
  }
  if (activeGame === "memory") {
    return <MemoryMatchGame onBack={() => setActiveGame(null)} />;
  }
  if (activeGame === "shopkeeper") {
    return <ShopkeeperGame onBack={() => setActiveGame(null)} />;
  }
  if (activeGame === "quiz") {
    return <DailyQuizGame onBack={() => setActiveGame(null)} />;
  }

  const games = [
    {
      id: "sprint" as const,
      title: "Kannada Word Sprint",
      titleKn: "ಪದ ಸ್ಪ್ರಿಂಟ್",
      desc: "Fast-paced vocabulary flashcard sprint against a 30-second countdown.",
      icon: Zap,
      color: "yellow",
      reward: "+40 XP, +8 Pts",
    },
    {
      id: "sentence" as const,
      title: "Sentence Builder",
      titleKn: "ವಾಕ್ಯ ರಚನೆ",
      desc: "Assemble shuffled Kannada word tiles into grammatically correct sentences.",
      icon: BookOpen,
      color: "green",
      reward: "+30 XP, +8 Pts",
    },
    {
      id: "memory" as const,
      title: "Kannada Memory Match",
      titleKn: "ಮೆಮೊರಿ ಮ್ಯಾಚ್",
      desc: "Flip and match Kannada script cards with their English meanings.",
      icon: Layers,
      color: "blue",
      reward: "+25 XP, +6 Pts",
    },
    {
      id: "shopkeeper" as const,
      title: "Shopkeeper Challenge",
      titleKn: "ಮಾರುಕಟ್ಟೆ ಸಂಭಾಷಣೆ",
      desc: "Simulate an authentic street market conversation: bargain, order, and pay in Kannada.",
      icon: Store,
      color: "peach",
      reward: "+35 XP, +10 Pts",
    },
    {
      id: "quiz" as const,
      title: "Daily Kannada Quiz",
      titleKn: "ದೈನಂದಿನ ರಸಪ್ರಶ್ನೆ",
      desc: "5 multiple-choice questions on Kannada vocabulary, grammar, and Karnataka culture.",
      icon: HelpCircle,
      color: "green",
      reward: "+35 XP, +10 Pts",
    },
  ];

  return (
    <div className="games-hub-container">
      <div className="section-heading-with-action">
        <div>
          <div className="section-kicker">INTERACTIVE ENTERTAINMENT</div>
          <h1>Fun Kannada Mini-Games</h1>
          <p>
            Reinforce vocabulary, grammar, and listening through rapid, lightweight, and genuinely playable games.
          </p>
        </div>
      </div>

      <div className="games-catalog-grid">
        {games.map((g) => {
          const Icon = g.icon;
          return (
            <div key={g.id} className="game-catalog-card">
              <div className={`catalog-game-icon ${g.color}`}>
                <Icon size={26} />
              </div>
              <div className="catalog-game-content">
                <div className="catalog-game-kn">{g.titleKn}</div>
                <h3>{g.title}</h3>
                <p>{g.desc}</p>
                <div className="catalog-reward-tag">
                  <Gamepad2 size={13} /> Max Reward: {g.reward}
                </div>
              </div>
              <button
                className="primary-button full-width"
                onClick={() => setActiveGame(g.id)}
              >
                Play Now <ArrowRight size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
