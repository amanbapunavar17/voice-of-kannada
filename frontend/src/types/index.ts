export type KannadaLevel = "Beginner" | "Elementary" | "Intermediate" | "Advanced";

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarChar: string;
  level: KannadaLevel;
  dailyGoalMinutes: number;
  learningMotivation: string;
  preferredSituations: string[];
  xp: number;
  points: number;
  currentStreak: number;
  bestStreak: number;
  lastActiveDate: string; // YYYY-MM-DD
  isPublicLeaderboard: boolean;
  isOnboarded: boolean;
  isAuthenticated: boolean;
  createdAt: string;
}

export type ExerciseType =
  | "multiple_choice"
  | "matching"
  | "reorder"
  | "fill_blank"
  | "listen";

export interface ExerciseOption {
  id: string;
  text: string;
  textKannada?: string;
  isCorrect: boolean;
}

export interface MatchingPair {
  id: string;
  kannada: string;
  english: string;
}

export interface LessonExercise {
  id: string;
  type: ExerciseType;
  prompt: string;
  promptKannada?: string;
  audioText?: string;
  options?: ExerciseOption[];
  pairs?: MatchingPair[];
  wordsToArrange?: string[];
  correctSentence?: string;
  fillSentence?: string; // e.g. "ನಮಸ್ಕಾರ, ನೀವು ___ ಇದ್ದೀರಿ?"
  missingWord?: string;
  explanation: string;
}

export interface PhraseItem {
  id: string;
  kannada: string;
  transliteration: string;
  meaning: string;
  usageContext?: string;
  exampleSentence?: {
    kannada: string;
    transliteration: string;
    english: string;
  };
}

export interface Lesson {
  id: string;
  categoryId: string;
  title: string;
  titleKannada: string;
  description: string;
  level: KannadaLevel;
  estimatedMinutes: number;
  xpReward: number;
  pointsReward: number;
  phrases: PhraseItem[];
  exercises: LessonExercise[];
}

export interface LearningCategory {
  id: string;
  title: string;
  titleKannada: string;
  description: string;
  iconName: string;
  color: string;
  lessons: Lesson[];
}

export interface SpeakingScenario {
  id: string;
  title: string;
  kannada: string;
  description: string;
  greeting: string;
  meaning: string;
  color?: string;
  level?: string;
  duration?: string;
}

export interface DailyChallenge {
  id: string;
  title: string;
  titleKannada: string;
  description: string;
  category: "words" | "speaking" | "lesson" | "game" | "quiz";
  targetCount: number;
  currentCount: number;
  xpReward: number;
  pointsReward: number;
  estimatedMinutes: string;
  difficulty: "Easy" | "Medium" | "Fun";
  isCompleted: boolean;
  isClaimed: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  titleKannada: string;
  description: string;
  iconName: string;
  unlockedAt?: string;
  isUnlocked: boolean;
  conditionDescription: string;
}

export interface PointTransaction {
  id: string;
  currency: "XP" | "POINTS";
  amount: number;
  reason: string;
  timestamp: string;
  referenceId?: string;
  idempotencyKey?: string;
}

export interface DailyActivityRecord {
  date: string; // YYYY-MM-DD
  minutesSpent: number;
  lessonsCompleted: number;
  speakingAttempts: number;
  wordsPracticed: number;
  xpEarned: number;
  pointsEarned: number;
}

export interface CertificateRecord {
  id: string; // e.g. MAATU-KB-2026-89412
  courseId: string;
  courseTitle: string;
  courseTitleKannada: string;
  learnerName: string;
  issuedDate: string;
  scorePercent: number;
  criteriaMet: string[];
  verificationUrl: string;
}

export interface RewardProduct {
  id: string;
  title: string;
  titleKannada: string;
  category: "apparel" | "stationery" | "lifestyle" | "accessories";
  pointsRequired: number;
  badge?: string;
  description: string;
  inStock: boolean;
  details: string[];
}

export interface RewardRedemption {
  id: string;
  rewardId: string;
  rewardTitle: string;
  pointsSpent: number;
  redeemedAt: string;
  status: "pending" | "processing" | "shipped" | "delivered";
  shippingName: string;
  shippingContact: string;
  shippingCity: string;
  notes?: string;
}

export interface LeaderboardEntry {
  rank: number;
  displayName: string;
  xp: number;
  level: string;
  streak?: number;
  avatarChar: string;
  isCurrentUser?: boolean;
}
