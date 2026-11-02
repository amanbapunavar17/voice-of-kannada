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
  fillSentence?: string;
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
  date: string;
  minutesSpent: number;
  lessonsCompleted: number;
  speakingAttempts: number;
  wordsPracticed: number;
  xpEarned: number;
  pointsEarned: number;
}

export interface CertificateRecord {
  id: string;
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

// ==========================================
// NEW SIGNATURE FEATURE TYPES
// ==========================================

export type ConversationMode = "beginner" | "intermediate" | "challenge";

export interface ConversationTurn {
  id: string;
  sender: "learner" | "companion";
  kannadaText: string;
  transliteration?: string;
  englishMeaning?: string;
  understoodIntent?: string;
  naturalAlternative?: string;
  grammarNotes?: string;
  suggestedReplies?: string[];
  timestamp: string;
}

export interface PronunciationSentence {
  id: string;
  kannada: string;
  transliteration: string;
  english: string;
  category: string;
  difficulty: string;
  phonetic_focus: string;
}

export interface WordDiffItem {
  target_word: string;
  spoken_word?: string;
  status: "match" | "substituted" | "missing" | "extra";
}

export interface PronunciationAssessmentResult {
  accuracy_percent: number;
  assessment_method: string;
  method_note: string;
  word_diffs: WordDiffItem[];
  feedback_notes: string;
  matches_count: number;
  total_words: number;
}

export interface RealWorldMission {
  id: string;
  title: string;
  title_kannada: string;
  character_name: string;
  character_role: string;
  difficulty: string;
  description: string;
  communication_objective: string;
  initial_greeting: string;
  initial_transliteration: string;
  initial_english: string;
  hints: string[];
  criteria: string[];
}

export interface MissionEvaluationResult {
  is_objective_achieved: boolean;
  score_percent: number;
  criteria_evaluations: Array<{ name: string; satisfied: boolean; note?: string }>;
  overall_feedback: string;
  xp_earned: number;
}

export interface CameraDetectedWord {
  identified_object_english: string;
  kannada_word: string;
  transliteration: string;
  category: string;
  confidence_level: "high" | "medium" | "uncertain";
  identification_note: string;
  example_sentence_kannada: string;
  example_sentence_transliteration: string;
  example_sentence_english: string;
  useful_related_words?: Array<{ kannada: string; transliteration: string; english: string }>;
}

export interface LearnerSkillsProfile {
  overall_fluency_score: number;
  skills: {
    vocabulary: number;
    grammar: number;
    speaking: number;
    listening: number;
    question_formation: number;
    sentence_structure: number;
  };
  strongest_skill: string;
  needs_improvement: string;
  total_activities: number;
  recommendation: string;
  lessons_completed?: number;
  practice_sessions_count?: number;
  missions_completed?: number;
}

export interface PersonalMistakeItem {
  id: string;
  category: string;
  original_expression: string;
  suggested_correction: string;
  explanation: string;
  occurrences_count: number;
  is_resolved: boolean;
  last_observed_at: string;
}

export interface AdaptiveLessonData {
  weakness_topic: string;
  short_explanation: string;
  kannada_examples: Array<{ kannada: string; transliteration: string; english: string }>;
  listening_prompt: { audio_text: string; question: string; options: string[]; correct_answer: string };
  speaking_prompt: { target_sentence: string; transliteration: string; english: string; phonetic_tip: string };
  independent_challenge: { prompt_situation: string; expected_kannada_gist: string };
}

export interface RegionalDialect {
  region_id: string;
  name: string;
  name_kannada: string;
  tagline: string;
  cultural_note: string;
  expressions: Array<{
    kannada: string;
    transliteration: string;
    meaning: string;
    formality: string;
    context: string;
    intention: string;
  }>;
}

export interface CrossRegionalComparison {
  intention: string;
  variations: Array<{
    region: string;
    kannada: string;
    transliteration: string;
    notes: string;
  }>;
}

export interface NaturalTranslationData {
  kannada_script: string;
  transliteration: string;
  english_meaning: string;
  formal_version: string;
  informal_version: string;
  usage_context: string;
  example_conversation: Array<{ sender?: string; kannada?: string; text?: string; meaning?: string }>;
}

export interface SentenceBreakdownData {
  full_sentence_kannada: string;
  full_sentence_transliteration: string;
  full_sentence_english: string;
  words: Array<{
    kannada_word: string;
    transliteration: string;
    english_meaning: string;
    grammatical_role: string;
  }>;
  grammar_insight: string;
}

export interface SavedPhraseRecord {
  id?: string;
  kannada_text: string;
  transliteration: string;
  english_meaning: string;
  category: string;
  formality_level?: string;
  learning_status?: "learning" | "mastered";
}
