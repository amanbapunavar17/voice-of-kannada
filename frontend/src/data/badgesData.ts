import type { Achievement } from "../types";

export const allAchievements: Achievement[] = [
  {
    id: "first_lesson",
    title: "First Step",
    titleKannada: "ಮೊದಲ ಹೆಜ್ಜೆ",
    description: "Complete your very first Kannada lesson.",
    iconName: "Sparkles",
    conditionDescription: "Complete 1 lesson",
    isUnlocked: false,
  },
  {
    id: "first_speak",
    title: "Voice of Courage",
    titleKannada: "ಧೈರ್ಯದ ಧ್ವನಿ",
    description: "Speak your first Kannada sentence in the AI Speaking Studio.",
    iconName: "Mic",
    conditionDescription: "Complete 1 voice practice session",
    isUnlocked: false,
  },
  {
    id: "five_lessons",
    title: "Consistent Learner",
    titleKannada: "ನಿರಂತರ ಕಲಿ",
    description: "Complete 5 interactive Kannada lessons.",
    iconName: "BookOpen",
    conditionDescription: "Complete 5 lessons",
    isUnlocked: false,
  },
  {
    id: "ten_words",
    title: "Word Collector",
    titleKannada: "ಪದ ಸಂಗ್ರಾಹಕ",
    description: "Learn and practice 10 practical Kannada vocabulary words.",
    iconName: "Languages",
    conditionDescription: "Learn 10 words",
    isUnlocked: false,
  },
  {
    id: "streak_3",
    title: "Habit Builder",
    titleKannada: "ಅಭ್ಯಾಸ ವೀರ",
    description: "Maintain a 3-day continuous learning streak.",
    iconName: "Flame",
    conditionDescription: "Reach a 3-day streak",
    isUnlocked: false,
  },
  {
    id: "streak_7",
    title: "Kannada Champion",
    titleKannada: "ಕನ್ನಡ ಚಾಂಪಿಯನ್",
    description: "Maintain a 7-day continuous learning streak.",
    iconName: "Trophy",
    conditionDescription: "Reach a 7-day streak",
    isUnlocked: false,
  },
  {
    id: "game_master",
    title: "Game Master",
    titleKannada: "ಆಟಗಾರ",
    description: "Play and win all 4 Kannada mini-games.",
    iconName: "Gamepad2",
    conditionDescription: "Play all 4 mini-games",
    isUnlocked: false,
  },
  {
    id: "first_certificate",
    title: "Certified Scholar",
    titleKannada: "ಪ್ರಮಾಣಿತ ವಿದ್ವಾಂಸ",
    description: "Earn your first verifiable Maatu course certificate.",
    iconName: "Award",
    conditionDescription: "Earn 1 certificate",
    isUnlocked: false,
  },
];

export interface LevelThreshold {
  levelNumber: number;
  title: string;
  titleKannada: string;
  minXp: number;
  badge: string;
}

export const levelThresholds: LevelThreshold[] = [
  {
    levelNumber: 1,
    title: "Kannada Explorer",
    titleKannada: "ಕನ್ನಡ ಅನ್ವೇಷಕ",
    minXp: 0,
    badge: "🌱",
  },
  {
    levelNumber: 2,
    title: "Word Collector",
    titleKannada: "ಪದ ಸಂಗ್ರಾಹಕ",
    minXp: 100,
    badge: "📖",
  },
  {
    levelNumber: 3,
    title: "Conversation Starter",
    titleKannada: "ಸಂಭಾಷಣಾ ಪ್ರವೀಣ",
    minXp: 300,
    badge: "💬",
  },
  {
    levelNumber: 4,
    title: "Confident Speaker",
    titleKannada: "ಆತ್ಮವಿಶ್ವಾಸದ ಮಾತುಗಾರ",
    minXp: 600,
    badge: "🗣️",
  },
  {
    levelNumber: 5,
    title: "Kannada Champion",
    titleKannada: "ಕನ್ನಡ ಚಾಂಪಿಯನ್",
    minXp: 1000,
    badge: "👑",
  },
];

export function calculateLevel(xp: number): {
  currentLevel: LevelThreshold;
  nextLevel: LevelThreshold | null;
  progressPercent: number;
  xpToNext: number;
} {
  let currentLevel = levelThresholds[0];
  let nextLevel: LevelThreshold | null = levelThresholds[1];

  for (let i = levelThresholds.length - 1; i >= 0; i--) {
    if (xp >= levelThresholds[i].minXp) {
      currentLevel = levelThresholds[i];
      nextLevel = i + 1 < levelThresholds.length ? levelThresholds[i + 1] : null;
      break;
    }
  }

  if (!nextLevel) {
    return {
      currentLevel,
      nextLevel: null,
      progressPercent: 100,
      xpToNext: 0,
    };
  }

  const range = nextLevel.minXp - currentLevel.minXp;
  const earnedInRange = xp - currentLevel.minXp;
  const progressPercent = Math.min(100, Math.max(0, Math.round((earnedInRange / range) * 100)));
  const xpToNext = Math.max(0, nextLevel.minXp - xp);

  return {
    currentLevel,
    nextLevel,
    progressPercent,
    xpToNext,
  };
}
