import React, { useState } from "react";
import {
  Home,
  BookOpen,
  Mic,
  Target,
  MoreHorizontal,
  Camera,
  AlertTriangle,
  Bookmark,
  Compass,
  TrendingUp,
  Award,
  ShoppingBag,
  Trophy,
  User,
  X,
} from "lucide-react";

interface BottomNavProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onSelectTab }) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const primaryTabs = [
    { id: "home", label: "Home", icon: Home },
    { id: "learn", label: "Learn", icon: BookOpen },
    { id: "practice", label: "Speak", icon: Mic },
    { id: "missions", label: "Missions", icon: Target },
  ];

  const secondaryTabs = [
    { id: "camera", label: "Camera Learning", icon: Camera },
    { id: "mistakes", label: "My Mistakes", icon: AlertTriangle },
    { id: "phrasebook", label: "Phrasebook & Translator", icon: Bookmark },
    { id: "regional", label: "Regional Kannada", icon: Compass },
    { id: "progress", label: "Progress & Fluency", icon: TrendingUp },
    { id: "certificates", label: "Certificates", icon: Award },
    { id: "store", label: "Rewards Store", icon: ShoppingBag },
    { id: "leaderboard", label: "Leaderboard", icon: Trophy },
    { id: "profile", label: "Profile & Settings", icon: User },
  ];

  function handleSelect(id: string) {
    onSelectTab(id);
    setShowMoreMenu(false);
  }

  return (
    <>
      <nav className="mobile-bottom-nav">
        {primaryTabs.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              className={`bottom-nav-item ${isActive ? "active" : ""}`}
              onClick={() => handleSelect(item.id)}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}

        <button
          className={`bottom-nav-item ${showMoreMenu ? "active" : ""}`}
          onClick={() => setShowMoreMenu(true)}
        >
          <MoreHorizontal size={20} />
          <span>More</span>
        </button>
      </nav>

      {/* Full Sheet More Menu for Mobile */}
      {showMoreMenu && (
        <div className="mobile-more-backdrop" onClick={() => setShowMoreMenu(false)}>
          <div className="mobile-more-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="more-sheet-header">
              <h3>All MAATHU Features</h3>
              <button className="more-close-btn" onClick={() => setShowMoreMenu(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="more-sheet-grid">
              {secondaryTabs.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;

                return (
                  <button
                    key={item.id}
                    className={`more-grid-item ${isActive ? "active" : ""}`}
                    onClick={() => handleSelect(item.id)}
                  >
                    <div className="more-icon-box">
                      <Icon size={20} />
                    </div>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
