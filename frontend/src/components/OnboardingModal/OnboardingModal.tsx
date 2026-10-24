import React, { useState } from "react";
import { Sparkles, ArrowRight, Check } from "lucide-react";
import type { UserProfile, KannadaLevel } from "../../types";
import { storage } from "../../services/storage";

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: (user: UserProfile) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onComplete,
}) => {
  const [step, setStep] = useState(1);
  const [level, setLevel] = useState<KannadaLevel>("Beginner");
  const [dailyMinutes, setDailyMinutes] = useState(15);
  const [motivation, setMotivation] = useState("Everyday conversations & street life");
  const [selectedSituations, setSelectedSituations] = useState<string[]>([
    "daily",
    "food",
    "travel",
  ]);

  if (!isOpen) return null;

  const motivations = [
    "Everyday conversations & street life",
    "College & campus connections",
    "Food ordering & Darshinis",
    "Namma Metro & Auto rides",
    "Workplace & tech team bonding",
    "Appreciating Kannada music & films",
  ];

  const situations = [
    { id: "daily", label: "Everyday Greetings", kn: "ದೈನಂದಿನ ಸಂಭಾಷಣೆ" },
    { id: "food", label: "Ordering Food & Coffee", kn: "ಊಟ ಮತ್ತು ಉಪಾಹಾರ" },
    { id: "travel", label: "Directions & Travel", kn: "ಪ್ರವಾಸ ಮತ್ತು ದಾರಿ" },
    { id: "shopping", label: "Market & Bargaining", kn: "ಸ್ಥಳೀಯ ಮಾರುಕಟ್ಟೆ" },
    { id: "college", label: "College Life", kn: "ಕಾಲೇಜು ಮತ್ತು ಕ್ಯಾಂಪಸ್" },
    { id: "auto", label: "Auto-Rickshaw Rides", kn: "ಆಟೋ ಪ್ರಯಾಣ" },
    { id: "office", label: "Office & Colleagues", kn: "ಕಚೇರಿ ಮಾತುಕತೆ" },
  ];

  function toggleSituation(id: string) {
    setSelectedSituations((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  function handleFinish() {
    const user = storage.getUser();
    const updatedUser: UserProfile = {
      ...user,
      level,
      dailyGoalMinutes: dailyMinutes,
      learningMotivation: motivation,
      preferredSituations: selectedSituations,
      isOnboarded: true,
    };
    storage.saveUser(updatedUser);
    onComplete(updatedUser);
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card onboarding-modal-card">
        <div className="onboarding-progress-dots">
          <span className={`dot ${step >= 1 ? "active" : ""}`} />
          <span className={`dot ${step >= 2 ? "active" : ""}`} />
          <span className={`dot ${step >= 3 ? "active" : ""}`} />
        </div>

        {step === 1 && (
          <div className="onboarding-step">
            <div className="step-icon">
              <Sparkles size={32} color="#D4A64A" />
            </div>
            <h2>ನಮಸ್ಕಾರ! Welcome to Maatu</h2>
            <p>Let's personalize your Kannada journey. What is your current Kannada level?</p>

            <div className="choice-cards-list">
              {[
                {
                  lvl: "Beginner" as KannadaLevel,
                  title: "Complete Beginner",
                  desc: "I know few or no Kannada words and want to start from zero.",
                },
                {
                  lvl: "Elementary" as KannadaLevel,
                  title: "Know a few phrases",
                  desc: "I understand basic greetings and want to build vocabulary.",
                },
                {
                  lvl: "Intermediate" as KannadaLevel,
                  title: "Can understand, want to speak",
                  desc: "I understand when locals speak, but lack confidence in speaking.",
                },
              ].map((item) => (
                <button
                  key={item.lvl}
                  className={`choice-card ${level === item.lvl ? "selected" : ""}`}
                  onClick={() => setLevel(item.lvl)}
                >
                  <div className="choice-card-content">
                    <strong>{item.title}</strong>
                    <span>{item.desc}</span>
                  </div>
                  {level === item.lvl && <Check size={18} color="#174B3A" />}
                </button>
              ))}
            </div>

            <button className="primary-button full-width" onClick={() => setStep(2)}>
              Continue <ArrowRight size={17} />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="onboarding-step">
            <h2>Why do you want to learn Kannada?</h2>
            <p>Pick your primary motivation so we can suggest relevant scenarios.</p>

            <div className="choice-chips-grid">
              {motivations.map((mot) => (
                <button
                  key={mot}
                  className={`choice-chip ${motivation === mot ? "selected" : ""}`}
                  onClick={() => setMotivation(mot)}
                >
                  {mot}
                </button>
              ))}
            </div>

            <div style={{ marginTop: "24px" }}>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "#73786F", letterSpacing: "1px" }}>
                DAILY TIME COMMITMENT
              </label>
              <div className="time-chips-row">
                {[5, 15, 30].map((mins) => (
                  <button
                    key={mins}
                    className={`time-chip ${dailyMinutes === mins ? "selected" : ""}`}
                    onClick={() => setDailyMinutes(mins)}
                  >
                    {mins} mins / day
                  </button>
                ))}
              </div>
            </div>

            <div className="step-nav-buttons">
              <button className="text-button" onClick={() => setStep(1)}>
                Back
              </button>
              <button className="primary-button" onClick={() => setStep(3)}>
                Continue <ArrowRight size={17} />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="onboarding-step">
            <h2>Select Situations to Master</h2>
            <p>Pick the real-world situations you want to practice first.</p>

            <div className="situations-checklist">
              {situations.map((sit) => {
                const isChecked = selectedSituations.includes(sit.id);
                return (
                  <button
                    key={sit.id}
                    className={`situation-check-item ${isChecked ? "selected" : ""}`}
                    onClick={() => toggleSituation(sit.id)}
                  >
                    <div>
                      <strong>{sit.label}</strong>
                      <span className="sit-kn">{sit.kn}</span>
                    </div>
                    {isChecked ? (
                      <div className="checkbox-box checked">
                        <Check size={14} color="#FFFFFF" />
                      </div>
                    ) : (
                      <div className="checkbox-box" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="step-nav-buttons">
              <button className="text-button" onClick={() => setStep(2)}>
                Back
              </button>
              <button className="primary-button" onClick={handleFinish}>
                Launch My Dashboard <ArrowRight size={17} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
