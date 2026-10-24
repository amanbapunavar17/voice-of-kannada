import React, { useState, useEffect } from "react";
import {
  Mic,
  Volume2,
  Sparkles,
  RotateCcw,
  Check,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { speakingScenarios } from "../../data/scenariosData";
import { speechService } from "../../services/speech";
import { api } from "../../services/api";
import { storage } from "../../services/storage";

interface SpeakingStudioProps {
  initialScenarioId?: string;
}

export const SpeakingStudio: React.FC<SpeakingStudioProps> = ({
  initialScenarioId = "daily",
}) => {
  const [selectedScenarioId, setSelectedScenarioId] = useState(initialScenarioId);
  const [isListening, setIsListening] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [recognizedText, setRecognizedText] = useState("");
  const [practiceReply, setPracticeReply] = useState("");
  const [practiceReplyEnglish, setPracticeReplyEnglish] = useState("");
  const [speechError, setSpeechError] = useState("");
  const [isSpeakingTts, setIsSpeakingTts] = useState(false);
  const [speechStatusMsg, setSpeechStatusMsg] = useState("");

  const currentScenario =
    speakingScenarios.find((s) => s.id === selectedScenarioId) ||
    speakingScenarios[0];

  useEffect(() => {
    return () => {
      speechService.stopSpeaking();
    };
  }, []);

  function handleSelectScenario(id: string) {
    setSelectedScenarioId(id);
    setRecognizedText("");
    setPracticeReply("");
    setPracticeReplyEnglish("");
    setSpeechError("");
    setSpeechStatusMsg("");
    speechService.stopSpeaking();
  }

  function handleStartMicrophone() {
    if (isListening || isSending) return;

    speechService.stopSpeaking();
    setSpeechError("");
    setRecognizedText("");
    setPracticeReply("");
    setPracticeReplyEnglish("");
    setSpeechStatusMsg("");

    speechService.startListening({
      onStart: () => {
        setIsListening(true);
      },
      onEnd: () => {
        setIsListening(false);
      },
      onError: (msg) => {
        setIsListening(false);
        setSpeechError(msg);
      },
      onResult: (transcript) => {
        setIsListening(false);
        setRecognizedText(transcript);
        void handleSendToBackend(transcript);
      },
    });
  }

  async function handleSendToBackend(text: string) {
    setIsSending(true);
    setSpeechError("");

    try {
      const data = await api.sendPractice(selectedScenarioId, text);
      setPracticeReply(data.reply_kannada || "");
      setPracticeReplyEnglish(data.reply_english || "");

      // Award XP and Maatu Points for speaking practice!
      storage.awardCurrency({
        xpAmount: 15,
        pointsAmount: 3,
        reason: `AI Speaking Practice (${currentScenario.title})`,
        referenceId: `practice:${selectedScenarioId}:${Date.now()}`,
        idempotencyKey: `practice_${Date.now()}`,
      });

      storage.recordDailyActivity({
        speakingAttempts: 1,
        minutesSpent: 2,
      });

      storage.incrementChallengeProgress("speaking", 1);
      storage.unlockAchievement("first_speak");

      // Auto-pronounce AI response for seamless conversational flow
      if (data.reply_kannada) {
        handlePlayAudio(data.reply_kannada);
      }
    } catch (err: any) {
      console.error("Practice call failed:", err);
      setSpeechError(
        err.message ||
          "Could not connect to Gemini AI practice endpoint. Please check if FastAPI backend is running on port 8000."
      );
    } finally {
      setIsSending(false);
    }
  }

  function handlePlayAudio(textToSpeak: string) {
    if (!textToSpeak.trim()) return;

    speechService.speakKannada(textToSpeak, {
      onStart: () => {
        setIsSpeakingTts(true);
        setSpeechStatusMsg("Playing audio...");
      },
      onEnd: () => {
        setIsSpeakingTts(false);
        setSpeechStatusMsg("");
      },
      onError: (msg) => {
        setIsSpeakingTts(false);
        setSpeechStatusMsg(msg);
      },
    });
  }

  return (
    <div className="speaking-studio-container">
      <div className="section-heading-with-action">
        <div>
          <div className="section-kicker">AI SPEAKING STUDIO</div>
          <h1>Speak Kannada with Confidence</h1>
          <p>
            Choose a situation, tap the microphone, and speak Kannada. Our Gemini AI coach responds naturally, provides transliteration, and guides pronunciation.
          </p>
        </div>
      </div>

      <div className="practice-workspace-layout">
        {/* Scenario Selection Column */}
        <div className="scenarios-picker-panel">
          <h3>Choose Situation</h3>
          <div className="picker-items-stack">
            {speakingScenarios.map((sc) => {
              const isSelected = selectedScenarioId === sc.id;
              return (
                <button
                  key={sc.id}
                  className={`picker-scenario-btn ${isSelected ? "selected" : ""}`}
                  onClick={() => handleSelectScenario(sc.id)}
                >
                  <div className="picker-btn-text">
                    <strong>{sc.title}</strong>
                    <span>{sc.kannada}</span>
                  </div>
                  {isSelected && <Check size={18} color="#174B3A" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Conversation Workspace */}
        <div className="conversation-stage-panel">
          <div className="stage-top-bar">
            <span className="live-status-pill">
              <span className="pulse-dot" /> LIVE CONVERSATION
            </span>
            <span className="scenario-tag">{currentScenario.title}</span>
          </div>

          <div className="scenario-prompt-banner">
            <div className="prompt-header-row">
              <span className="prompt-badge">SCENARIO PROMPT</span>
              <button
                className="listen-icon-btn"
                onClick={() => handlePlayAudio(currentScenario.greeting)}
                title="Listen to scenario greeting"
              >
                <Volume2 size={16} /> Listen Prompt
              </button>
            </div>
            <div className="scenario-greeting-kn">{currentScenario.greeting}</div>
            <div className="scenario-greeting-en">"{currentScenario.meaning}"</div>
            <p className="scenario-desc-note">{currentScenario.description}</p>
          </div>

          {/* Microphone Action Area */}
          <div className="mic-interactive-area">
            <button
              className={`giant-mic-button ${isListening ? "listening" : ""} ${isSending ? "sending" : ""}`}
              onClick={handleStartMicrophone}
              disabled={isListening || isSending}
            >
              <Mic size={36} />
              <div className="mic-btn-label">
                {isListening
                  ? "Listening to Kannada..."
                  : isSending
                  ? "AI thinking..."
                  : "Tap to Speak Kannada"}
              </div>
            </button>

            <p className="mic-hint-text">
              {isListening
                ? "Speak clearly into your microphone in Kannada..."
                : isSending
                ? "Connecting with Gemini AI conversation coach..."
                : "Tap once, allow microphone permission, and speak your reply."}
            </p>
          </div>

          {/* Error Notice */}
          {speechError && (
            <div className="practice-error-banner">
              <AlertCircle size={18} />
              <span>{speechError}</span>
            </div>
          )}

          {/* Transcript You Said */}
          {recognizedText && (
            <div className="user-transcript-card">
              <div className="card-kicker">YOU SAID</div>
              <div className="transcript-body">{recognizedText}</div>
            </div>
          )}

          {/* Gemini AI Response Card */}
          {practiceReply && (
            <div className="ai-response-card">
              <div className="card-kicker-row">
                <span className="card-kicker">
                  <Sparkles size={14} /> KANNADA AI RESPONSE
                </span>
                <button
                  className="listen-response-btn"
                  onClick={() => handlePlayAudio(practiceReply)}
                  disabled={isSpeakingTts}
                >
                  <Volume2 size={16} />
                  {isSpeakingTts ? "Playing..." : "Listen to Audio"}
                </button>
              </div>

              <div className="response-kn">{practiceReply}</div>

              {practiceReplyEnglish && (
                <div className="response-en-box">
                  <div className="en-box-title">
                    <HelpCircle size={15} /> English Meaning & Coach Note
                  </div>
                  <p>{practiceReplyEnglish}</p>
                </div>
              )}

              <div className="response-footer-row">
                <span className="awarded-badge">
                  <Sparkles size={14} /> +15 XP & +3 Points Earned
                </span>
                <button
                  className="small-retry-btn"
                  onClick={handleStartMicrophone}
                  disabled={isListening || isSending}
                >
                  <RotateCcw size={14} /> Speak Again
                </button>
              </div>
            </div>
          )}

          {speechStatusMsg && (
            <div className="speech-status-note">{speechStatusMsg}</div>
          )}
        </div>
      </div>
    </div>
  );
};
