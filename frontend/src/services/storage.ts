import type {
  UserProfile,
  PointTransaction,
  DailyActivityRecord,
  CertificateRecord,
  RewardRedemption,
  DailyChallenge,
} from "../types";
import { allAchievements, calculateLevel } from "../data/badgesData";
import { initialDailyChallenges } from "../data/challengesData";

const STORAGE_KEYS = {
  USER: "maatu_user_profile_v2",
  TRANSACTIONS: "maatu_transactions_v2",
  DAILY_ACTIVITY: "maatu_daily_activity_v2",
  COMPLETED_LESSONS: "maatu_completed_lessons_v2",
  SAVED_PHRASES: "maatu_saved_phrases_v2",
  CHALLENGES: "maatu_challenges_v2",
  UNLOCKED_ACHIEVEMENTS: "maatu_unlocked_achievements_v2",
  CERTIFICATES: "maatu_certificates_v2",
  REDEMPTIONS: "maatu_redemptions_v2",
};

function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const defaultUser: UserProfile = {
  id: "",
  email: "",
  displayName: "ಅತಿಥಿ ಕಲಿ (Guest)",
  avatarChar: "ಅ",
  level: "Beginner",
  dailyGoalMinutes: 15,
  learningMotivation: "Everyday conversations",
  preferredSituations: ["daily", "food", "travel"],
  xp: 0,
  points: 0,
  currentStreak: 0,
  bestStreak: 0,
  lastActiveDate: "",
  isPublicLeaderboard: true,
  isOnboarded: false,
  isAuthenticated: false,
  createdAt: new Date().toISOString(),
};

type Listener = () => void;
const listeners = new Set<Listener>();

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.error("Storage listener error:", e);
    }
  });
}

export const storage = {
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getUser(): UserProfile {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USER);
      if (data) {
        return { ...defaultUser, ...JSON.parse(data) };
      }
    } catch (e) {
      console.error("Failed to load user profile:", e);
    }
    return defaultUser;
  },

  saveUser(user: UserProfile) {
    try {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      notifyListeners();
    } catch (e) {
      console.error("Failed to save user profile:", e);
    }
  },

  getTransactions(): PointTransaction[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error("Failed to load transactions:", e);
    }
    return [];
  },

  /**
   * Securely award or deduct XP & Maatu Points atomically with idempotency protection.
   */
  awardCurrency(params: {
    xpAmount: number;
    pointsAmount: number;
    reason: string;
    referenceId?: string;
    idempotencyKey?: string;
  }): { success: boolean; duplicate: boolean } {
    const transactions = this.getTransactions();

    if (params.idempotencyKey) {
      const alreadyAwarded = transactions.some(
        (t) => t.idempotencyKey === params.idempotencyKey
      );
      if (alreadyAwarded) {
        return { success: false, duplicate: true };
      }
    }

    const now = new Date().toISOString();
    const newTransactions: PointTransaction[] = [];

    if (params.xpAmount !== 0) {
      newTransactions.push({
        id: `tx_${Date.now()}_xp`,
        currency: "XP",
        amount: params.xpAmount,
        reason: params.reason,
        timestamp: now,
        referenceId: params.referenceId,
        idempotencyKey: params.idempotencyKey ? `${params.idempotencyKey}_xp` : undefined,
      });
    }

    if (params.pointsAmount !== 0) {
      newTransactions.push({
        id: `tx_${Date.now()}_pts`,
        currency: "POINTS",
        amount: params.pointsAmount,
        reason: params.reason,
        timestamp: now,
        referenceId: params.referenceId,
        idempotencyKey: params.idempotencyKey ? `${params.idempotencyKey}_pts` : undefined,
      });
    }

    const updatedTransactions = [...newTransactions, ...transactions];
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(updatedTransactions));

    // Update user balances and streak
    const user = this.getUser();
    const newXp = Math.max(0, user.xp + params.xpAmount);
    const newPoints = Math.max(0, user.points + params.pointsAmount);

    // Calculate level based on XP
    const { currentLevel } = calculateLevel(newXp);
    const levelMap: Record<number, UserProfile["level"]> = {
      1: "Beginner",
      2: "Beginner",
      3: "Elementary",
      4: "Intermediate",
      5: "Advanced",
    };

    const updatedUser: UserProfile = {
      ...user,
      xp: newXp,
      points: newPoints,
      level: levelMap[currentLevel.levelNumber] || user.level,
    };

    this.recordDailyActivity({
      xpEarned: Math.max(0, params.xpAmount),
      pointsEarned: Math.max(0, params.pointsAmount),
    });

    this.updateStreakOnActivity(updatedUser);
    this.checkAndUnlockAchievements(updatedUser);

    return { success: true, duplicate: false };
  },

  /**
   * Reconciles balances directly from verified transaction records.
   */
  reconcileBalances(): { xp: number; points: number } {
    const transactions = this.getTransactions();
    let calculatedXp = 0;
    let calculatedPoints = 0;

    for (const tx of transactions) {
      if (tx.currency === "XP") calculatedXp += tx.amount;
      if (tx.currency === "POINTS") calculatedPoints += tx.amount;
    }

    calculatedXp = Math.max(0, calculatedXp);
    calculatedPoints = Math.max(0, calculatedPoints);

    const user = this.getUser();
    if (user.xp !== calculatedXp || user.points !== calculatedPoints) {
      user.xp = calculatedXp;
      user.points = calculatedPoints;
      this.saveUser(user);
    }

    return { xp: calculatedXp, points: calculatedPoints };
  },

  updateStreakOnActivity(user: UserProfile) {
    const today = getTodayString();
    const lastDate = user.lastActiveDate;

    if (!lastDate) {
      user.currentStreak = 1;
      user.bestStreak = Math.max(user.bestStreak, 1);
      user.lastActiveDate = today;
    } else if (lastDate === today) {
      // Activity already logged today
    } else {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

      if (lastDate === yesterdayStr) {
        user.currentStreak += 1;
        user.bestStreak = Math.max(user.bestStreak, user.currentStreak);
      } else {
        // Missed day
        user.currentStreak = 1;
      }
      user.lastActiveDate = today;
    }

    this.saveUser(user);
  },

  getDailyActivities(): DailyActivityRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DAILY_ACTIVITY);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error("Failed to load daily activities:", e);
    }
    return [];
  },

  recordDailyActivity(delta: Partial<DailyActivityRecord>) {
    const today = getTodayString();
    const records = this.getDailyActivities();
    let existingIndex = records.findIndex((r) => r.date === today);

    if (existingIndex === -1) {
      records.unshift({
        date: today,
        minutesSpent: delta.minutesSpent ?? 2,
        lessonsCompleted: delta.lessonsCompleted ?? 0,
        speakingAttempts: delta.speakingAttempts ?? 0,
        wordsPracticed: delta.wordsPracticed ?? 0,
        xpEarned: delta.xpEarned ?? 0,
        pointsEarned: delta.pointsEarned ?? 0,
      });
    } else {
      records[existingIndex] = {
        ...records[existingIndex],
        minutesSpent: records[existingIndex].minutesSpent + (delta.minutesSpent ?? 0),
        lessonsCompleted: records[existingIndex].lessonsCompleted + (delta.lessonsCompleted ?? 0),
        speakingAttempts: records[existingIndex].speakingAttempts + (delta.speakingAttempts ?? 0),
        wordsPracticed: records[existingIndex].wordsPracticed + (delta.wordsPracticed ?? 0),
        xpEarned: records[existingIndex].xpEarned + (delta.xpEarned ?? 0),
        pointsEarned: records[existingIndex].pointsEarned + (delta.pointsEarned ?? 0),
      };
    }

    localStorage.setItem(STORAGE_KEYS.DAILY_ACTIVITY, JSON.stringify(records.slice(0, 60)));
  },

  getCompletedLessons(): string[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.COMPLETED_LESSONS);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error("Failed to load completed lessons:", e);
    }
    return [];
  },

  completeLesson(lessonId: string, xpReward: number, pointsReward: number): boolean {
    const completed = this.getCompletedLessons();
    const isFirstTime = !completed.includes(lessonId);

    if (isFirstTime) {
      completed.push(lessonId);
      localStorage.setItem(STORAGE_KEYS.COMPLETED_LESSONS, JSON.stringify(completed));

      this.awardCurrency({
        xpAmount: xpReward,
        pointsAmount: pointsReward,
        reason: `Completed lesson: ${lessonId}`,
        referenceId: `lesson:${lessonId}`,
        idempotencyKey: `complete_lesson_${lessonId}`,
      });

      this.recordDailyActivity({
        lessonsCompleted: 1,
        wordsPracticed: 4,
        minutesSpent: 5,
      });

      // Update challenge progress if active
      this.incrementChallengeProgress("words", 4);
      this.incrementChallengeProgress("lesson", 1);
    }

    notifyListeners();
    return isFirstTime;
  },

  getSavedPhrases(): string[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SAVED_PHRASES);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error("Failed to load saved phrases:", e);
    }
    return ["ನಮಸ್ಕಾರ", "ಧನ್ಯವಾದಗಳು"];
  },

  toggleSavedPhrase(phrase: string): boolean {
    const phrases = this.getSavedPhrases();
    let isNowSaved = false;
    let updated: string[];

    if (phrases.includes(phrase)) {
      updated = phrases.filter((p) => p !== phrase);
      isNowSaved = false;
    } else {
      updated = [...phrases, phrase];
      isNowSaved = true;
    }

    localStorage.setItem(STORAGE_KEYS.SAVED_PHRASES, JSON.stringify(updated));
    notifyListeners();
    return isNowSaved;
  },

  getChallenges(): DailyChallenge[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CHALLENGES);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error("Failed to load challenges:", e);
    }
    return initialDailyChallenges;
  },

  saveChallenges(challenges: DailyChallenge[]) {
    localStorage.setItem(STORAGE_KEYS.CHALLENGES, JSON.stringify(challenges));
    notifyListeners();
  },

  incrementChallengeProgress(category: DailyChallenge["category"], count: number = 1) {
    const challenges = this.getChallenges();
    let updated = false;

    const modified = challenges.map((ch) => {
      if (ch.category === category && !ch.isCompleted) {
        const newCount = Math.min(ch.targetCount, ch.currentCount + count);
        const isCompleted = newCount >= ch.targetCount;
        updated = true;
        return {
          ...ch,
          currentCount: newCount,
          isCompleted,
        };
      }
      return ch;
    });

    if (updated) {
      this.saveChallenges(modified);
    }
  },

  claimChallengeReward(challengeId: string): boolean {
    const challenges = this.getChallenges();
    const challenge = challenges.find((ch) => ch.id === challengeId);

    if (!challenge || !challenge.isCompleted || challenge.isClaimed) {
      return false;
    }

    challenge.isClaimed = true;
    this.saveChallenges([...challenges]);

    this.awardCurrency({
      xpAmount: challenge.xpReward,
      pointsAmount: challenge.pointsReward,
      reason: `Daily challenge completed: ${challenge.title}`,
      referenceId: `challenge:${challenge.id}:${getTodayString()}`,
      idempotencyKey: `claim_challenge_${challenge.id}_${getTodayString()}`,
    });

    return true;
  },

  getUnlockedAchievements(): string[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.UNLOCKED_ACHIEVEMENTS);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error("Failed to load unlocked achievements:", e);
    }
    return [];
  },

  checkAndUnlockAchievements(user: UserProfile) {
    const unlocked = this.getUnlockedAchievements();
    const newlyUnlocked: string[] = [];
    const completedLessons = this.getCompletedLessons();

    for (const ach of allAchievements) {
      if (unlocked.includes(ach.id)) continue;

      let shouldUnlock = false;
      if (ach.id === "first_lesson" && completedLessons.length >= 1) shouldUnlock = true;
      if (ach.id === "five_lessons" && completedLessons.length >= 5) shouldUnlock = true;
      if (ach.id === "ten_words" && completedLessons.length * 4 >= 10) shouldUnlock = true;
      if (ach.id === "streak_3" && user.currentStreak >= 3) shouldUnlock = true;
      if (ach.id === "streak_7" && user.currentStreak >= 7) shouldUnlock = true;

      if (shouldUnlock) {
        newlyUnlocked.push(ach.id);
      }
    }

    if (newlyUnlocked.length > 0) {
      const updated = [...unlocked, ...newlyUnlocked];
      localStorage.setItem(STORAGE_KEYS.UNLOCKED_ACHIEVEMENTS, JSON.stringify(updated));

      for (const id of newlyUnlocked) {
        this.awardCurrency({
          xpAmount: 50,
          pointsAmount: 10,
          reason: `Achievement unlocked: ${id}`,
          referenceId: `achievement:${id}`,
          idempotencyKey: `achievement_bonus_${id}`,
        });
      }
    }
  },

  unlockAchievement(achievementId: string) {
    const unlocked = this.getUnlockedAchievements();
    if (!unlocked.includes(achievementId)) {
      unlocked.push(achievementId);
      localStorage.setItem(STORAGE_KEYS.UNLOCKED_ACHIEVEMENTS, JSON.stringify(unlocked));

      this.awardCurrency({
        xpAmount: 50,
        pointsAmount: 10,
        reason: `Achievement unlocked: ${achievementId}`,
        referenceId: `achievement:${achievementId}`,
        idempotencyKey: `achievement_bonus_${achievementId}`,
      });
      notifyListeners();
    }
  },

  getCertificates(): CertificateRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CERTIFICATES);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error("Failed to load certificates:", e);
    }
    return [];
  },

  issueCertificate(record: Omit<CertificateRecord, "id" | "issuedDate" | "verificationUrl">): CertificateRecord {
    const certificates = this.getCertificates();
    const existing = certificates.find((c) => c.courseId === record.courseId);
    if (existing) return existing;

    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const certId = `MAATU-${record.courseId.toUpperCase().slice(0, 3)}-2026-${randomSuffix}`;
    const today = getTodayString();

    const newCert: CertificateRecord = {
      ...record,
      id: certId,
      issuedDate: today,
      verificationUrl: `https://maatu.in/verify/${certId}`,
    };

    certificates.push(newCert);
    localStorage.setItem(STORAGE_KEYS.CERTIFICATES, JSON.stringify(certificates));

    this.awardCurrency({
      xpAmount: 100,
      pointsAmount: 25,
      reason: `Earned Certificate: ${record.courseTitle}`,
      referenceId: `cert:${certId}`,
      idempotencyKey: `cert_award_${certId}`,
    });

    this.unlockAchievement("first_certificate");
    notifyListeners();
    return newCert;
  },

  getRedemptions(): RewardRedemption[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.REDEMPTIONS);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error("Failed to load redemptions:", e);
    }
    return [];
  },

  /**
   * Atomic point redemption for Maatu Goodies Store.
   * Checks real balance, deducts points, writes transaction and order record atomically.
   */
  redeemReward(params: {
    rewardId: string;
    rewardTitle: string;
    pointsRequired: number;
    shippingName: string;
    shippingContact: string;
    shippingCity: string;
    notes?: string;
  }): { success: boolean; error?: string; orderId?: string } {
    const user = this.getUser();

    if (user.points < params.pointsRequired) {
      return {
        success: false,
        error: `Insufficient Maatu Points. You have ${user.points} points, but this item requires ${params.pointsRequired} points.`,
      };
    }

    const orderId = `ORD-MAATU-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    // 1. Deduct points atomically
    const txId = `tx_${Date.now()}_redemption`;
    const transactions = this.getTransactions();
    const newTx: PointTransaction = {
      id: txId,
      currency: "POINTS",
      amount: -params.pointsRequired,
      reason: `Redeemed ${params.rewardTitle} (Order #${orderId})`,
      timestamp: now,
      referenceId: orderId,
      idempotencyKey: `redeem_${orderId}`,
    };
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([newTx, ...transactions]));

    // 2. Update user profile balance
    user.points = user.points - params.pointsRequired;
    this.saveUser(user);

    // 3. Save order record
    const redemptions = this.getRedemptions();
    const newOrder: RewardRedemption = {
      id: orderId,
      rewardId: params.rewardId,
      rewardTitle: params.rewardTitle,
      pointsSpent: params.pointsRequired,
      redeemedAt: now,
      status: "pending",
      shippingName: params.shippingName,
      shippingContact: params.shippingContact,
      shippingCity: params.shippingCity,
      notes: params.notes,
    };
    localStorage.setItem(STORAGE_KEYS.REDEMPTIONS, JSON.stringify([newOrder, ...redemptions]));

    notifyListeners();
    return { success: true, orderId };
  },

  resetAllData() {
    localStorage.clear();
    notifyListeners();
  },
};
