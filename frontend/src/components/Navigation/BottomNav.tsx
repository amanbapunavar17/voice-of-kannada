import React, { useState } from "react";
import {
  Home,
  BookOpen,
  Mic,
  CalendarCheck,
  MoreHorizontal,
  Gamepad2,
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
    { id: "challenges", label: "Daily", icon: CalendarCheck },
  ];

  const secondaryTabs = [
    { id: "games", label: "Kannada Games", icon: Gamepad2 },
    { id: "progress", label: "My Progress", icon: TrendingUp },
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
          onClick={() => setShowMoreMenu(!showMoreMenu)}
        >
          <MoreHorizontal size={20} />
          <span>More</span>
        </button>
      </nav>

      {showMoreMenu && (
        <div className="mobile-more-overlay" onClick={() => setShowMoreMenu(false)}>
          <div className="mobile-more-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="more-sheet-header">
              <span className="brand-name">ಮಾತು ಇನ್ನಷ್ಟು (More)</span>
              <button className="icon-close-btn" onClick={() => setShowMoreMenu(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="more-grid">
              {secondaryTabs.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    className={`more-grid-btn ${isActive ? "active" : ""}`}
                    onClick={() => handleSelect(item.id)}
                  >
                    <Icon size={20} />
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
