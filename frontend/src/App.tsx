import { useEffect, useState } from "react";
import { Sidebar } from "./components/Navigation/Sidebar";
import { Topbar } from "./components/Navigation/Topbar";
import { BottomNav } from "./components/Navigation/BottomNav";
import { LandingPage } from "./components/LandingPage/LandingPage";
import { HomeDashboard } from "./components/Home/HomeDashboard";
import { LearnView } from "./components/Learn/LearnView";
import { SpeakingStudio } from "./components/Practice/SpeakingStudio";
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
import type { UserProfile, CertificateRecord, DailyChallenge } from "./types";
import "./App.css";

export function App() {
  const [user, setUser] = useState<UserProfile>(() => storage.getUser());
  const [currentTab, setCurrentTab] = useState<string>("home");
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
  const [targetScenarioId, setTargetScenarioId] = useState<string | undefined>(
    undefined
  );

  // Subscribe to storage updates for reactive re-renders
  useEffect(() => {
    const unsubscribe = storage.subscribe(() => {
      setUser(storage.getUser());
      setCompletedLessons(storage.getCompletedLessons());
      setChallenges(storage.getChallenges());
      setCertificates(storage.getCertificates());
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

  // Trigger onboarding on first visit if not onboarded
  useEffect(() => {
    if (!user.isOnboarded && !user.isAuthenticated) {
      // Allow user to explore landing page or launch onboarding
    }
  }, [user]);

  function handleNavigate(tab: string, scenarioId?: string) {
    if (scenarioId) {
      setTargetScenarioId(scenarioId);
    }
    setCurrentTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleAuthSuccess(updatedUser: UserProfile) {
    setUser(updatedUser);
    if (!updatedUser.isOnboarded) {
      setOnboardingOpen(true);
    }
  }

  return (
    <div className="app-shell">
      {/* Desktop Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => handleNavigate(tab)}
        user={user}
      />

      {/* Main Workspace Area */}
      <main className="main-content">
        <Topbar
          currentTab={currentTab}
          user={user}
          apiConnected={apiConnected}
          onOpenAuth={() => setAuthModalOpen(true)}
          onSelectTab={(tab) => handleNavigate(tab)}
        />

        <div className="content-viewport">
          {currentTab === "landing" && (
            <LandingPage
              onStartLearning={() => {
                if (!user.isOnboarded) {
                  setOnboardingOpen(true);
                } else {
                  handleNavigate("home");
                }
              }}
              onExploreFeatures={(tab) => handleNavigate(tab)}
              onOpenAuth={() => setAuthModalOpen(true)}
            />
          )}

          {currentTab === "home" && (
            <HomeDashboard
              user={user}
              completedLessons={completedLessons}
              challenges={challenges}
              onNavigate={(tab, scId) => handleNavigate(tab, scId)}
            />
          )}

          {currentTab === "learn" && (
            <LearnView
              completedLessons={completedLessons}
              onLessonCompleted={() => {
                setCompletedLessons(storage.getCompletedLessons());
              }}
            />
          )}

          {currentTab === "practice" && (
            <SpeakingStudio initialScenarioId={targetScenarioId} />
          )}

          {currentTab === "challenges" && (
            <DailyChallengesView
              challenges={challenges}
              onNavigate={(tab) => handleNavigate(tab)}
            />
          )}

          {currentTab === "games" && <GamesHubView />}

          {currentTab === "progress" && (
            <ProgressView
              user={user}
              completedLessons={completedLessons}
              dailyActivities={storage.getDailyActivities()}
            />
          )}

          {currentTab === "certificates" && (
            <CertificatesView
              user={user}
              completedLessons={completedLessons}
            />
          )}

          {currentTab === "store" && <GoodiesStoreView user={user} />}

          {currentTab === "leaderboard" && <LeaderboardView user={user} />}

          {currentTab === "profile" && (
            <ProfileView
              user={user}
              certificates={certificates}
              onProfileUpdated={() => setUser(storage.getUser())}
              onOpenAuth={() => setAuthModalOpen(true)}
            />
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
        onAuthenticated={handleAuthSuccess}
      />

      {/* Onboarding Wizard Modal */}
      <OnboardingModal
        isOpen={onboardingOpen}
        onComplete={(onboardedUser) => {
          setUser(onboardedUser);
          setOnboardingOpen(false);
          handleNavigate("home");
        }}
      />
    </div>
  );
}

export default App;
