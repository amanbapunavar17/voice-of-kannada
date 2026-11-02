import React from "react";
import {
  AudioLines,
  Home,
  BookOpen,
  Mic,
  Target,
  Camera,
  AlertTriangle,
  Bookmark,
  Compass,
  TrendingUp,
  Award,
  ShoppingBag,
  Trophy,
  User,
  Sparkles,
} from "lucide-react";
import type { UserProfile } from "../../types";
import { calculateLevel } from "../../data/badgesData";

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  user: UserProfile;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  user,
}) => {
  const { currentLevel, progressPercent } = calculateLevel(user.xp);

  const mainNavItems = [
    { id: "home", label: "Home", icon: Home },
    { id: "learn", label: "Learn Kannada", icon: BookOpen },
    { id: "practice", label: "Speak with MAATHU", icon: Mic },
    { id: "missions", label: "Real-Life Missions", icon: Target },
    { id: "camera", label: "Camera Learning", icon: Camera },
    { id: "mistakes", label: "My Mistakes", icon: AlertTriangle },
    { id: "phrasebook", label: "Phrasebook", icon: Bookmark },
    { id: "regional", label: "Regional Kannada", icon: Compass },
    { id: "progress", label: "Progress & Fluency", icon: TrendingUp },
    { id: "profile", label: "Profile", icon: User },
  ];

  const secondaryNavItems = [
    { id: "certificates", label: "Certificates", icon: Award },
    { id: "store", label: "Rewards Store", icon: ShoppingBag },
    { id: "leaderboard", label: "Leaderboard", icon: Trophy },
  ];

  return (
    <aside className="sidebar">
      <div className="brand" onClick={() => onSelectTab("home")} style={{ cursor: "pointer" }}>
        <div className="brand-mark">
          <AudioLines size={22} />
        </div>
        <div>
          <div className="brand-name">ಮಾತು</div>
          <div className="brand-subtitle">VOICE OF KANNADA</div>
        </div>
      </div>

      <div className="sidebar-label">LEARNING PLATFORM</div>

      <nav className="navigation">
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              className={`nav-link ${isActive ? "active" : ""}`}
              onClick={() => onSelectTab(item.id)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-divider" />
      <div className="sidebar-label">ACHIEVEMENTS & COMMERCE</div>

      <nav className="navigation">
        {secondaryNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              className={`nav-link ${isActive ? "active" : ""}`}
              onClick={() => onSelectTab(item.id)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-divider" />
      <div className="sidebar-label">LEVEL PROGRESSION</div>

      <div className="journey-card">
        <div className="journey-card-header">
          <div className="journey-icon">
            <Sparkles size={16} color="#D4A64A" />
          </div>
          <div>
            <div className="journey-title">{currentLevel.title}</div>
            <div className="journey-kannada-title">{currentLevel.titleKannada}</div>
          </div>
        </div>
        <p className="journey-subtext">Level {currentLevel.levelNumber} · {user.xp} XP total</p>
        <div className="journey-progress">
          <span style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="journey-caption">{progressPercent}% to next level</div>
      </div>

      <div className="sidebar-bottom">
        <div className="karnataka-symbol">ಕ</div>
        <div>
          <strong>ಕನ್ನಡವೇ ಸತ್ಯ</strong>
          <span>Voice of Karnataka</span>
        </div>
      </div>
    </aside>
  );
};
