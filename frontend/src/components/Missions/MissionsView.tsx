import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  Send,
  Volume2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Award,
  ChevronRight,
  RotateCcw,
  UserCheck,
  Target,
} from "lucide-react";
import { api } from "../../services/api";
import { speechService } from "../../services/speech";
import { storage } from "../../services/storage";
import type { RealWorldMission, MissionEvaluationResult } from "../../types";

export const MissionsView: React.FC = () => {
  const [missions, setMissions] = useState<RealWorldMission[]>([]);
  const [activeMission, setActiveMission] = useState<RealWorldMission | null>(null);
  const [dialogue, setDialogue] = useState<Array<{ sender: string; text: string; transliteration?: string; english?: string; mood?: string }>>([]);
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [showHints, setShowHints] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<MissionEvaluationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const stopRecordRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    api.getMissions()
      .then((data) => setMissions(data))
      .catch((e) => console.warn("Failed to load missions:", e));

    return () => {
      speechService.stopSpeaking();
    };
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [dialogue]);

  function handleStartMission(mission: RealWorldMission) {
    setActiveMission(mission);
    setProgressPercent(15);
    setEvaluationResult(null);
    setErrorMsg("");
    setShowHints(false);

    // Initial character greeting
    setDialogue([
      {
        sender: mission.character_name,
        text: mission.initial_greeting,
        transliteration: mission.initial_transliteration,
        english: mission.initial_english,
        mood: "friendly",
      },
    ]);

    // Speak initial character greeting
    speechService.speakKannada(mission.initial_greeting, undefined, 0.85);
  }

  async function handleSendTurn(overrideText?: string) {
    const text = (overrideText || inputText).trim();
    if (!text || !activeMission || isProcessing) return;

    setInputText("");
    setErrorMsg("");
    speechService.stopSpeaking();

    const userEntry = { sender: "You", text };
    const updatedHistory = [...dialogue, userEntry];
    setDialogue(updatedHistory);
    setIsProcessing(true);

    try {
      const data = await api.sendMissionTurn(
        activeMission.id,
        text,
        updatedHistory.map((d) => ({ sender: d.sender, text: d.text }))
      );

      const characterEntry = {
        sender: activeMission.character_name,
        text: data.character_reply_kannada,
        transliteration: data.character_transliteration,
        english: data.character_reply_english,
        mood: data.character_mood,
      };

      setDialogue((prev) => [...prev, characterEntry]);
      setProgressPercent(data.objective_progress_percent || 50);

      // Speak response
      speechService.speakKannada(data.character_reply_kannada, undefined, 0.85);

      // Check if objective accomplished
      if (data.is_objective_completed) {
        setProgressPercent(100);
        await triggerEvaluation([...updatedHistory, characterEntry]);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to communicate with roleplay character.");
    } finally {
      setIsProcessing(false);
    }
  }

  async function triggerEvaluation(fullTranscript: Array<{ sender: string; text: string }>) {
    if (!activeMission) return;
    try {
      const evalRes = await api.evaluateMission(
        activeMission.id,
        fullTranscript.map((t) => ({ sender: t.sender, text: t.text }))
      );
      setEvaluationResult(evalRes);

      if (evalRes.is_objective_achieved) {
        storage.awardCurrency({
          xpAmount: evalRes.xp_earned || 50,
          pointsAmount: 15,
          reason: `Accomplished Mission: ${activeMission.title}`,
          referenceId: `mission:${activeMission.id}:${Date.now()}`,
          idempotencyKey: `mission_${Date.now()}`,
        });

        storage.recordDailyActivity({
          minutesSpent: 4,
          lessonsCompleted: 0,
          speakingAttempts: fullTranscript.length,
          wordsPracticed: 10,
          xpEarned: evalRes.xp_earned || 50,
          pointsEarned: 15,
        });
      }
    } catch (e: any) {
      console.error("Evaluation failed:", e);
    }
  }

  async function handleStartMic() {
    if (isProcessing) return;

    if (isRecordingAudio) {
      if (stopRecordRef.current) {
        stopRecordRef.current();
        stopRecordRef.current = null;
      }
      setIsRecordingAudio(false);
      return;
    }

    if (isListening) {
      speechService.stopSpeaking();
      setIsListening(false);
      return;
    }

    speechService.stopSpeaking();
    setErrorMsg("");

    speechService.startListening({
      onStart: () => setIsListening(true),
      onEnd: () => setIsListening(false),
      onError: async (msg) => {
        setIsListening(false);
        if (msg.includes("network") || msg.includes("unreachable")) {
          console.warn("Missions: Web speech network unreachable; auto-falling back to audio recording...");
          try {
            setIsRecordingAudio(true);
            const stopFn = await speechService.startAudioRecording(async (audioBlob) => {
              setIsProcessing(true);
              try {
                const res = await api.transcribeAudio(audioBlob);
                const transcript = res.transcript_kannada || res.transcript_english || "";
                if (transcript) {
                  void handleSendTurn(transcript);
                } else {
                  setErrorMsg("Could not detect clear speech. Please try speaking again.");
                }
              } catch (e: any) {
                setErrorMsg(e.message || "Failed to transcribe speech.");
              } finally {
                setIsProcessing(false);
              }
            });
            stopRecordRef.current = stopFn;
            setTimeout(() => {
              if (stopRecordRef.current) {
                stopRecordRef.current();
                stopRecordRef.current = null;
                setIsRecordingAudio(false);
              }
            }, 8000);
          } catch {
            setIsRecordingAudio(false);
            setErrorMsg("Microphone permission required.");
          }
          return;
        }
        setErrorMsg(msg);
      },
      onResult: (transcript) => {
        setIsListening(false);
        void handleSendTurn(transcript);
      },
    });
  }

  return (
    <div className="missions-container">
      {/* Header */}
      <div className="practice-header">
        <div>
          <div className="section-pill">
            <Target size={14} /> FEATURE 03 · SIMULATOR
          </div>
          <h1>Real-World Kannada Missions</h1>
          <p className="page-lead">
            Step into actual Karnataka life situations. Talk with an auto driver, order at a Darshini, or talk with classmates.
          </p>
        </div>
      </div>

      {/* Grid of Missions */}
      {!activeMission ? (
        <div className="missions-grid">
          {missions.map((mission) => (
            <div key={mission.id} className="mission-card">
              <div className="mission-card-top">
                <span className="badge-tag">{mission.difficulty}</span>
                <span className="character-tag">
                  <UserCheck size={14} /> {mission.character_name}
                </span>
              </div>

              <h3>{mission.title}</h3>
              <div className="mission-kannada-title">{mission.title_kannada}</div>
              <p className="mission-desc">{mission.description}</p>

              <div className="mission-objective-box">
                <div className="objective-label">Objective:</div>
                <div className="objective-text">{mission.communication_objective}</div>
              </div>

              <button className="primary-button full-width" onClick={() => handleStartMission(mission)}>
                Start Mission <ChevronRight size={16} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        /* Active Roleplay Simulator Arena */
        <div className="active-mission-arena">
          <div className="mission-arena-header">
            <div>
              <button className="text-back-btn" onClick={() => setActiveMission(null)}>
                ← Back to Missions
              </button>
              <h2>{activeMission.title} ({activeMission.title_kannada})</h2>
              <p className="objective-callout">
                <strong>Objective:</strong> {activeMission.communication_objective}
              </p>
            </div>

            {/* Progress Meter */}
            <div className="mission-progress-box">
              <div className="progress-label">
                <span>Objective Progress</span>
                <strong>{progressPercent}%</strong>
              </div>
              <div className="progress-bar-track">
                <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          </div>

          {/* Dialogue Transcript */}
          <div className="mission-dialogue-box">
            {dialogue.map((item, idx) => {
              const isUser = item.sender === "You";
              return (
                <div key={idx} className={`mission-bubble-row ${isUser ? "user-row" : "character-row"}`}>
                  <div className={`mission-bubble ${isUser ? "user-bubble" : "character-bubble"}`}>
                    <div className="sender-tag">{item.sender}</div>
                    <div className="bubble-kannada">{item.text}</div>
                    {item.transliteration && (
                      <div className="bubble-translit">{item.transliteration}</div>
                    )}
                    {item.english && (
                      <div className="bubble-english">{item.english}</div>
                    )}

                    {!isUser && (
                      <button
                        className="audio-listen-icon-btn"
                        onClick={() => speechService.speakKannada(item.text, undefined, 0.85)}
                        title="Listen"
                      >
                        <Volume2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {isProcessing && (
              <div className="mission-bubble-row character-row">
                <div className="mission-bubble character-bubble processing">
                  <div className="typing-dots"><span /><span /><span /></div>
                  <span>{activeMission.character_name} is replying...</span>
                </div>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="chat-error-banner">
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Hints Drawer */}
          <div className="hints-toggle-row">
            <button className="hints-toggle-btn" onClick={() => setShowHints(!showHints)}>
              <HelpCircle size={15} /> {showHints ? "Hide Suggested Phrases" : "Need a Hint? Show Suggested Phrases"}
            </button>
          </div>

          {showHints && (
            <div className="mission-hints-box">
              <h4>Suggested Kannada Phrases for this situation:</h4>
              <ul>
                {activeMission.hints.map((hint, i) => (
                  <li key={i}>
                    <span>{hint}</span>
                    <button
                      className="use-hint-btn"
                      onClick={() => {
                        const kannadaOnly = hint.split("(")[0].replace("Say:", "").replace("For the bill:", "").replace("If asked about sugar:", "").replace("State destination:", "").replace("Ask price:", "").replace("Ask notes:", "").trim();
                        handleSendTurn(kannadaOnly);
                      }}
                    >
                      Use This
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Input Bar */}
          {!evaluationResult && (
            <div className="chat-input-bar">
              <button
                className={`mic-record-btn ${isListening ? "listening" : ""}`}
                onClick={handleStartMic}
                disabled={isProcessing}
                title="Speak your reply in Kannada"
              >
                <Mic size={20} />
              </button>

              <input
                type="text"
                className="chat-text-input"
                placeholder={isListening ? "Listening to your Kannada speech..." : "Speak or type your reply..."}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendTurn()}
                disabled={isProcessing || isListening}
              />

              <button
                className="chat-send-btn"
                onClick={() => handleSendTurn()}
                disabled={!inputText.trim() || isProcessing}
              >
                <Send size={18} />
              </button>
            </div>
          )}

          {/* Mission Evaluation Results Modal / Card */}
          {evaluationResult && (
            <div className="evaluation-card">
              <div className="eval-header-row">
                <div className="eval-score-badge">
                  <Award size={28} color="#D4A64A" />
                  <div>
                    <span className="score-num">{evaluationResult.score_percent}%</span>
                    <span className="score-status">
                      {evaluationResult.is_objective_achieved ? "Objective Accomplished! 🎉" : "Good Attempt!"}
                    </span>
                  </div>
                </div>

                <div className="xp-earned-badge">
                  +{evaluationResult.xp_earned} XP
                </div>
              </div>

              <div className="eval-criteria-list">
                <h4>Communication Criteria Checked:</h4>
                {evaluationResult.criteria_evaluations?.map((crit, idx) => (
                  <div key={idx} className="criterion-row">
                    <CheckCircle2
                      size={18}
                      color={crit.satisfied ? "#174B3A" : "#888"}
                    />
                    <span>{crit.name}</span>
                  </div>
                ))}
              </div>

              <div className="eval-feedback-text">
                <p>{evaluationResult.overall_feedback}</p>
              </div>

              <div className="eval-actions-row">
                <button className="primary-button" onClick={() => handleStartMission(activeMission)}>
                  <RotateCcw size={16} /> Replay Mission
                </button>
                <button className="outline-button" onClick={() => setActiveMission(null)}>
                  Choose Another Mission
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
