import { useEffect, useState } from "react";
import { AudioLines, LogIn, Lock, Sparkles } from "lucide-react";
import { Sidebar } from "./components/Navigation/Sidebar";
import { Topbar } from "./components/Navigation/Topbar";
import { BottomNav } from "./components/Navigation/BottomNav";
import { LandingPage } from "./components/LandingPage/LandingPage";
import { HomeDashboard } from "./components/Home/HomeDashboard";
import { LearnView } from "./components/Learn/LearnView";
import { SpeakingStudio } from "./components/Practice/SpeakingStudio";
import { MissionsView } from "./components/Missions/MissionsView";
import { CameraLearningView } from "./components/Camera/CameraLearningView";
import { PersonalMistakesView } from "./components/Mistakes/PersonalMistakesView";
import { PhrasebookView } from "./components/Phrasebook/PhrasebookView";
import { RegionalExplorerView } from "./components/Regional/RegionalExplorerView";
import { DailyChallengesView } from "./components/Challenges/DailyChallengesView";
import { GamesHubView } from "./components/Games/GamesHubView";
import { ProgressView } from "./components/Progress/ProgressView";
import { CertificatesView } from "./components/Certificates/CertificatesView";
import { GoodiesStoreView } from "./components/Store/GoodiesStoreView";
import { LeaderboardView } from "./components/Leaderboard/LeaderboardView";
import { ProfileView } from "./components/Profile/ProfileView";
import { AuthModal } from "./components/AuthModal/AuthModal";
import { OnboardingModal } from "./components/OnboardingModal/OnboardingModal";
import { storage } from "./services/storage";
import { api } from "./services/api";
import { useAuth } from "./context/AuthContext";
import type { UserProfile, CertificateRecord, DailyChallenge } from "./types";
import "./App.css";

// Routes requiring authentication
const PROTECTED_ROUTES = new Set(["home", "progress", "profile", "store"]);

export function App() {
  const { session, profile, isLoading: isAuthLoading, refreshProfile, updateProfileData } = useAuth();

  const [localUser, setLocalUser] = useState<UserProfile>(() => storage.getUser());

  const isAuthenticated = Boolean(session?.user);
  const activeUser: UserProfile = (isAuthenticated && profile)
    ? {
        ...profile,
        xp: Math.max(profile.xp ?? 0, localUser.xp ?? 0),
        points: Math.max(profile.points ?? 0, localUser.points ?? 0),
        currentStreak: Math.max(profile.currentStreak ?? 0, localUser.currentStreak ?? 0),
        bestStreak: Math.max(profile.bestStreak ?? 0, localUser.bestStreak ?? 0),
      }
    : localUser;

  const [currentTab, setCurrentTab] = useState<string>(() => (isAuthenticated ? "home" : "landing"));
  const [completedLessons, setCompletedLessons] = useState<string[]>(() =>
    storage.getCompletedLessons()
  );
  const [challenges, setChallenges] = useState<DailyChallenge[]>(() =>
    storage.getChallenges()
  );
  const [certificates, setCertificates] = useState<CertificateRecord[]>(() =>
    storage.getCertificates()
  );
  const [apiConnected, setApiConnected] = useState<boolean>(false);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [onboardingOpen, setOnboardingOpen] = useState<boolean>(false);
  const [targetScenarioId, setTargetScenarioId] = useState<string | undefined>(undefined);

  // Sync tab with auth state changes
  useEffect(() => {
    if (!isAuthLoading) {
      if (isAuthenticated) {
        if (currentTab === "landing") {
          setCurrentTab("home");
        }
        // Sync completed lessons from Supabase source of truth
        api.getUserProgress().then((remoteLessons) => {
          if (remoteLessons && remoteLessons.length > 0) {
            setCompletedLessons(remoteLessons);
            storage.syncCompletedLessons(remoteLessons);
          }
        });
      } else {
        if (PROTECTED_ROUTES.has(currentTab)) {
          setCurrentTab("landing");
        }
      }
    }
  }, [isAuthenticated, isAuthLoading]);

  // Subscribe to local storage updates for live XP, Points, Streaks, Lessons & Challenges
  useEffect(() => {
    const unsubscribe = storage.subscribe(() => {
      setCompletedLessons(storage.getCompletedLessons());
      setChallenges(storage.getChallenges());
      setCertificates(storage.getCertificates());
      setLocalUser(storage.getUser());
    });
    return () => unsubscribe();
  }, []);

  // Check backend health periodically
  useEffect(() => {
    let cancelled = false;

    async function checkBackend() {
      try {
        const health = await api.checkHealth();
        if (!cancelled) {
          setApiConnected(health.status === "ok");
        }
      } catch {
        if (!cancelled) {
          setApiConnected(false);
        }
      }
    }

    checkBackend();
    const interval = window.setInterval(checkBackend, 12000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  function handleNavigate(tab: string, scenarioId?: string) {
    if (scenarioId) {
      setTargetScenarioId(scenarioId);
    }

    // Intercept protected routes if not authenticated
    if (PROTECTED_ROUTES.has(tab) && !isAuthenticated) {
      setAuthModalOpen(true);
      return;
    }

    setCurrentTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleAuthSuccess() {
    refreshProfile();
    if (!activeUser.isOnboarded) {
      setOnboardingOpen(true);
    } else {
      setCurrentTab("home");
    }
  }

  if (isAuthLoading) {
    return (
      <div className="auth-loading-splash">
        <div className="splash-card">
          <div className="splash-logo">
            <AudioLines size={32} color="#174B3A" />
          </div>
          <h2>ಮಾತು — VOICE OF KANNADA</h2>
          <div className="splash-spinner" />
          <p>Verifying secure session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {/* Desktop Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => handleNavigate(tab)}
        user={activeUser}
      />

      {/* Main Workspace Area */}
      <main className="main-content">
        <Topbar
          currentTab={currentTab}
          user={activeUser}
          apiConnected={apiConnected}
          onOpenAuth={() => setAuthModalOpen(true)}
          onSelectTab={(tab) => handleNavigate(tab)}
        />

        <div className="content-viewport">
          {currentTab === "landing" && (
            <LandingPage
              onStartLearning={() => {
                if (!isAuthenticated) {
                  setAuthModalOpen(true);
                } else if (!activeUser.isOnboarded) {
                  setOnboardingOpen(true);
                } else {
                  handleNavigate("home");
                }
              }}
              onExploreFeatures={(tab) => handleNavigate(tab)}
              onOpenAuth={() => setAuthModalOpen(true)}
            />
          )}

          {/* Protected Home Dashboard */}
          {currentTab === "home" && (
            isAuthenticated ? (
              <HomeDashboard
                user={activeUser}
                completedLessons={completedLessons}
                challenges={challenges}
                onNavigate={(tab, scId) => handleNavigate(tab, scId)}
              />
            ) : (
              <div className="auth-required-card">
                <div className="auth-lock-circle">
                  <Lock size={32} color="#174B3A" />
                </div>
                <h2>Authentication Required</h2>
                <p>Please sign in to view your personalized daily learning dashboard, streak records, and progress.</p>
                <button className="primary-button" onClick={() => setAuthModalOpen(true)}>
                  <LogIn size={16} /> Sign In to Maatu
                </button>
              </div>
            )
          )}

          {/* Curriculum View */}
          {currentTab === "learn" && (
            <LearnView
              completedLessons={completedLessons}
              onLessonCompleted={() => {
                setCompletedLessons(storage.getCompletedLessons());
                if (isAuthenticated) refreshProfile();
              }}
            />
          )}

          {/* Feature 01 & 02: Speak with MAATHU & Pronunciation Intelligence */}
          {currentTab === "practice" && (
            <SpeakingStudio initialScenarioId={targetScenarioId} />
          )}

          {/* Feature 03: Real-World Roleplay Missions */}
          {currentTab === "missions" && <MissionsView />}

          {/* Feature 04: Camera-Based Learning */}
          {currentTab === "camera" && <CameraLearningView />}

          {/* Feature 05: Personal Mistake Library & Adaptive Tutor */}
          {currentTab === "mistakes" && <PersonalMistakesView />}

          {/* Phrasebook, Survival Mode, Natural Translator, Sentence Intel */}
          {currentTab === "phrasebook" && <PhrasebookView />}

          {/* Feature 06: Regional Kannada Explorer */}
          {currentTab === "regional" && <RegionalExplorerView />}

          {/* Daily Challenges */}
          {currentTab === "challenges" && (
            <DailyChallengesView
              challenges={challenges}
              onNavigate={(tab) => handleNavigate(tab)}
            />
          )}

          {/* Mini-Games Hub */}
          {currentTab === "games" && <GamesHubView />}

          {/* Protected Progress & Fluency Analytics */}
          {currentTab === "progress" && (
            isAuthenticated ? (
              <ProgressView
                user={activeUser}
                completedLessons={completedLessons}
                dailyActivities={storage.getDailyActivities()}
              />
            ) : (
              <div className="auth-required-card">
                <div className="auth-lock-circle">
                  <Lock size={32} color="#174B3A" />
                </div>
                <h2>Sign In to View Progress & Fluency Scorecard</h2>
                <p>Day-wise activity logs, learning minutes, and streak histories are securely saved to your verified account.</p>
                <button className="primary-button" onClick={() => setAuthModalOpen(true)}>
                  <LogIn size={16} /> Sign In to Maatu
                </button>
              </div>
            )
          )}

          {/* Certificates */}
          {currentTab === "certificates" && (
            <CertificatesView
              user={activeUser}
              completedLessons={completedLessons}
            />
          )}

          {/* Protected Goodies Store */}
          {currentTab === "store" && (
            isAuthenticated ? (
              <GoodiesStoreView user={activeUser} />
            ) : (
              <div className="auth-required-card">
                <div className="auth-lock-circle">
                  <Sparkles size={32} color="#D4A64A" />
                </div>
                <h2>Sign In to Access Rewards Store</h2>
                <p>Earn Maatu Points through lessons and challenges, then redeem them for exclusive Kannada merchandise.</p>
                <button className="primary-button" onClick={() => setAuthModalOpen(true)}>
                  <LogIn size={16} /> Sign In to Maatu
                </button>
              </div>
            )
          )}

          {/* Public Leaderboard */}
          {currentTab === "leaderboard" && <LeaderboardView user={activeUser} />}

          {/* Protected Profile */}
          {currentTab === "profile" && (
            isAuthenticated ? (
              <ProfileView
                user={activeUser}
                certificates={certificates}
                onProfileUpdated={() => refreshProfile()}
                onOpenAuth={() => setAuthModalOpen(true)}
              />
            ) : (
              <div className="auth-required-card">
                <div className="auth-lock-circle">
                  <Lock size={32} color="#174B3A" />
                </div>
                <h2>Sign In to Access Profile</h2>
                <p>Manage your display name, learning goals, and account security settings.</p>
                <button className="primary-button" onClick={() => setAuthModalOpen(true)}>
                  <LogIn size={16} /> Sign In to Maatu
                </button>
              </div>
            )
          )}
        </div>

        {/* Global Footer */}
        <footer className="footer">
          <div>
            <span className="footer-mark">ಕ</span>
            ಕನ್ನಡ ಕಲಿಯಿರಿ · ಆತ್ಮವಿಶ್ವಾಸದಿಂದ ಮಾತನಾಡಿ · ಹೆಮ್ಮೆಯಿಂದ ಬಾಳಿ
          </div>
          <span>ಮಾತು (MAATU) — Voice of Kannada &copy; 2026</span>
        </footer>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={(tab) => handleNavigate(tab)}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Onboarding Wizard Modal */}
      <OnboardingModal
        isOpen={onboardingOpen}
        onComplete={(onboardedUser) => {
          if (isAuthenticated) {
            updateProfileData({
              level: onboardedUser.level,
              dailyGoalMinutes: onboardedUser.dailyGoalMinutes,
              learningMotivation: onboardedUser.learningMotivation,
              preferredSituations: onboardedUser.preferredSituations,
            });
          }
          setOnboardingOpen(false);
          handleNavigate("home");
        }}
      />
    </div>
  );
}

export default App;
