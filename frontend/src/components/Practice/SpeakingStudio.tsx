import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  Volume2,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Send,
  Sliders,
  Award,
  Info,
  MessageSquare,
  Radio,
  Square,
} from "lucide-react";
import { speakingScenarios } from "../../data/scenariosData";
import { speechService } from "../../services/speech";
import { api } from "../../services/api";
import { storage } from "../../services/storage";
import type {
  ConversationMode,
  ConversationTurn,
  PronunciationSentence,
  PronunciationAssessmentResult,
} from "../../types";

interface SpeakingStudioProps {
  initialScenarioId?: string;
}

export const SpeakingStudio: React.FC<SpeakingStudioProps> = ({
  initialScenarioId = "daily",
}) => {
  const [activeModule, setActiveModule] = useState<"companion" | "pronunciation">("companion");

  // ========================================================
  // FEATURE 01: MAATHU AI KANNADA COMPANION STATE
  // ========================================================
  const [sessionId] = useState<string>(() => `session-${Date.now()}`);
  const [learningMode, setLearningMode] = useState<ConversationMode>("beginner");
  const [selectedScenarioId, setSelectedScenarioId] = useState(initialScenarioId);
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [activePlaybackId, setActivePlaybackId] = useState<string | null>(null);
  const [sessionSummary, setSessionSummary] = useState<any | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const stopRecordRef = useRef<(() => void) | null>(null);

  // ========================================================
  // FEATURE 02: PRONUNCIATION INTELLIGENCE STATE
  // ========================================================
  const [sentences, setSentences] = useState<PronunciationSentence[]>([]);
  const [selectedSentence, setSelectedSentence] = useState<PronunciationSentence | null>(null);
  const [isPronListening, setIsPronListening] = useState(false);
  const [pronRecognizedText, setPronRecognizedText] = useState("");
  const [pronResult, setPronResult] = useState<PronunciationAssessmentResult | null>(null);
  const [pronError, setPronError] = useState("");
  const [isPronEvaluating, setIsPronEvaluating] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentScenario =
    speakingScenarios.find((s) => s.id === selectedScenarioId) ||
    speakingScenarios[0];

  useEffect(() => {
    // Initial welcome turn from MAATHU AI Companion
    setTurns([
      {
        id: "turn-welcome",
        sender: "companion",
        kannadaText: currentScenario.greeting,
        transliteration: "Namaskara! Neevu hegiddiri?",
        englishMeaning: currentScenario.meaning,
        understoodIntent: "Greeting you to begin the conversation",
        suggestedReplies: [
          "ನಾನು ಆರಾಮಾಗಿದ್ದೀನಿ (Naanu aaramaagiddeeni)",
          "ನನಗೆ ಕನ್ನಡ ಸ್ವಲ್ಪ ಬರುತ್ತೆ (Nanage Kannada swalpa barutte)",
          "ನೀವು ಹೇಗಿದ್ದೀರಿ? (Neevu hegiddiri?)",
        ],
        timestamp: "Just now",
      },
    ]);

    // Load pronunciation sentences
    api.getPronunciationSentences()
      .then((data) => {
        setSentences(data);
        if (data.length > 0) setSelectedSentence(data[0]);
      })
      .catch((e) => console.warn("Could not load pronunciation sentences:", e));

    return () => {
      speechService.stopSpeaking();
    };
  }, [selectedScenarioId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);

  // ========================================================
  // COMPANION ACTIONS
  // ========================================================
  async function handleSendMessage(textToSend?: string) {
    const text = (textToSend || inputText).trim();
    if (!text || isProcessing) return;

    setInputText("");
    setErrorMessage("");
    speechService.stopSpeaking();

    // 1. Add learner turn
    const learnerTurn: ConversationTurn = {
      id: `turn-${Date.now()}-user`,
      sender: "learner",
      kannadaText: text,
      timestamp: "Just now",
    };
    setTurns((prev) => [...prev, learnerTurn]);
    setIsProcessing(true);

    try {
      const data = await api.sendConversationMessage(
        sessionId,
        text,
        selectedScenarioId,
        learningMode
      );

      const aiTurn: ConversationTurn = {
        id: `turn-${Date.now()}-ai`,
        sender: "companion",
        kannadaText: data.reply_kannada,
        transliteration: data.transliteration,
        englishMeaning: data.reply_english,
        understoodIntent: data.understood_intent,
        naturalAlternative: data.natural_kannada_alternative,
        grammarNotes: data.grammar_notes,
        suggestedReplies: data.suggested_replies || [],
        timestamp: "Just now",
      };

      setTurns((prev) => [...prev, aiTurn]);

      // Auto-play audio response in natural Kannada
      handlePlayAudio(data.reply_kannada, aiTurn.id, 0.85);

      // Award XP
      storage.awardCurrency({
        xpAmount: 15,
        pointsAmount: 3,
        reason: `Spoke in Kannada (${currentScenario.title})`,
        referenceId: `conv:${sessionId}:${Date.now()}`,
        idempotencyKey: `conv_${Date.now()}`,
      });

      storage.recordDailyActivity({
        minutesSpent: 2,
        lessonsCompleted: 0,
        speakingAttempts: 1,
        wordsPracticed: 5,
        xpEarned: 15,
        pointsEarned: 3,
      });
    } catch (err: any) {
      setErrorMessage(err.message || "Could not connect to MAATHU Companion. Check connection.");
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleStartMicrophone() {
    if (isProcessing) return;

    // If already recording audio, clicking the mic stops recording and triggers transcription
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
    setErrorMessage("");

    speechService.startListening({
      onStart: () => setIsListening(true),
      onEnd: () => setIsListening(false),
      onError: async (msg) => {
        setIsListening(false);
        // If browser Web Speech network is unreachable, seamlessly activate direct audio recording
        if (msg.includes("network") || msg.includes("unreachable")) {
          console.warn("Web Speech network unreachable. Seamlessly falling back to direct audio recording...");
          void handleToggleAudioRecording();
          return;
        }
        setErrorMessage(msg);
      },
      onResult: (transcript) => {
        setIsListening(false);
        void handleSendMessage(transcript);
      },
    });
  }

  async function handleToggleAudioRecording() {
    if (isRecordingAudio) {
      if (stopRecordRef.current) {
        stopRecordRef.current();
        stopRecordRef.current = null;
      }
      setIsRecordingAudio(false);
      return;
    }

    speechService.stopSpeaking();
    setErrorMessage("");

    try {
      setIsRecordingAudio(true);
      const stopFn = await speechService.startAudioRecording(async (audioBlob) => {
        setIsProcessing(true);
        try {
          const res = await api.transcribeAudio(audioBlob);
          const transcript = res.transcript_kannada || res.transcript_english || "";
          if (transcript) {
            void handleSendMessage(transcript);
          } else {
            setErrorMessage("No clear speech detected. Please speak clearly into your mic and try again.");
          }
        } catch (err: any) {
          setErrorMessage(err.message || "Speech transcription service temporarily unreachable.");
        } finally {
          setIsProcessing(false);
        }
      });
      stopRecordRef.current = stopFn;

      // Safety timeout: auto-stop after 8 seconds of speech
      setTimeout(() => {
        if (stopRecordRef.current) {
          stopRecordRef.current();
          stopRecordRef.current = null;
          setIsRecordingAudio(false);
        }
      }, 8000);
    } catch (err: any) {
      setIsRecordingAudio(false);
      setErrorMessage(err.message || "Microphone access is required for audio recording.");
    }
  }

  function handlePlayAudio(kannadaText: string, turnId: string, rate: number = 0.85) {
    if (activePlaybackId === turnId) {
      speechService.stopSpeaking();
      setActivePlaybackId(null);
      return;
    }

    setActivePlaybackId(turnId);
    speechService.speakKannada(
      kannadaText,
      {
        onEnd: () => setActivePlaybackId(null),
        onError: () => setActivePlaybackId(null),
      },
      rate
    );
  }

  async function handleFinishSession() {
    try {
      const summaryData = await api.getConversationSummary(sessionId);
      setSessionSummary(summaryData.summary || summaryData);
      setShowSummaryModal(true);
    } catch {
      setShowSummaryModal(true);
    }
  }

  // ========================================================
  // PRONUNCIATION ACTIONS
  // ========================================================
  function handleStartPronMicrophone() {
    if (!selectedSentence || isPronListening || isPronEvaluating) return;

    speechService.stopSpeaking();
    setPronError("");
    setPronRecognizedText("");
    setPronResult(null);

    speechService.startListening({
      onStart: () => setIsPronListening(true),
      onEnd: () => setIsPronListening(false),
      onError: (msg) => {
        setIsPronListening(false);
        setPronError(msg);
      },
      onResult: async (transcript) => {
        setIsPronListening(false);
        setPronRecognizedText(transcript);
        setIsPronEvaluating(true);

        try {
          const res = await api.assessPronunciation(
            selectedSentence.kannada,
            selectedSentence.transliteration,
            selectedSentence.english,
            transcript
          );
          setPronResult(res);

          storage.awardCurrency({
            xpAmount: 10,
            pointsAmount: 2,
            reason: `Pronunciation Training: ${selectedSentence.english}`,
            referenceId: `pron:${selectedSentence.id}:${Date.now()}`,
            idempotencyKey: `pron_${Date.now()}`,
          });
        } catch (e: any) {
          setPronError(e.message || "Failed to assess pronunciation.");
        } finally {
          setIsPronEvaluating(false);
        }
      },
    });
  }

  return (
    <div className="practice-container">
      {/* Top Header & Feature Tabs */}
      <div className="practice-header">
        <div>
          <div className="section-pill">
            <Sparkles size={14} /> MAATHU AUDIO INTELLIGENCE
          </div>
          <h1>Speak with MAATHU (ಮಾತು)</h1>
          <p className="page-lead">
            Talk naturally in Kannada with our AI Companion or train your pronunciation syllable-by-syllable.
          </p>
        </div>

        {/* Feature 01 vs Feature 02 Switcher */}
        <div className="filter-pill-group">
          <button
            className={`filter-pill ${activeModule === "companion" ? "active" : ""}`}
            onClick={() => setActiveModule("companion")}
          >
            <MessageSquare size={16} /> AI Kannada Friend
          </button>
          <button
            className={`filter-pill ${activeModule === "pronunciation" ? "active" : ""}`}
            onClick={() => setActiveModule("pronunciation")}
          >
            <Mic size={16} /> Pronunciation Intelligence
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODULE 1: AI REAL-TIME KANNADA CONVERSATION COMPANION   */}
      {/* ======================================================== */}
      {activeModule === "companion" && (
        <div className="speaking-grid">
          {/* Left Column: Situation & Mode Controls */}
          <div className="scenarios-panel">
            <div className="panel-title-row">
              <h3>Choose Situation</h3>
              <span className="badge-tag">Context Aware</span>
            </div>

            <div className="scenarios-list">
              {speakingScenarios.map((sc) => {
                const isSelected = sc.id === selectedScenarioId;
                return (
                  <button
                    key={sc.id}
                    className={`scenario-card ${isSelected ? "active" : ""}`}
                    onClick={() => setSelectedScenarioId(sc.id)}
                  >
                    <div className="scenario-card-top">
                      <h4>{sc.title}</h4>
                      <span className="scenario-badge">{sc.level}</span>
                    </div>
                    <div className="scenario-kannada">{sc.kannada}</div>
                    <p className="scenario-desc">{sc.description}</p>
                  </button>
                );
              })}
            </div>

            {/* Assistance Mode Selector */}
            <div className="companion-mode-card">
              <div className="mode-header">
                <Sliders size={16} color="#174B3A" />
                <h4>Learning Assistance Mode</h4>
              </div>
              <div className="mode-buttons">
                {(["beginner", "intermediate", "challenge"] as ConversationMode[]).map((mode) => (
                  <button
                    key={mode}
                    className={`mode-btn ${learningMode === mode ? "active" : ""}`}
                    onClick={() => setLearningMode(mode)}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
              <p className="mode-hint">
                {learningMode === "beginner" && "Slower, simpler words with friendly explanations & hints."}
                {learningMode === "intermediate" && "Natural conversational Kannada with fewer hints."}
                {learningMode === "challenge" && "Fast native colloquial responses with authentic speed."}
              </p>
            </div>
          </div>

          {/* Right Column: Multi-turn Chat Arena */}
          <div className="chat-arena-card">
            {/* Arena Header */}
            <div className="chat-arena-header">
              <div className="ai-status">
                <span className="live-dot" />
                <div>
                  <strong>ಮಾತು AI Companion</strong>
                  <span className="ai-sub">Speaking in {currentScenario.title} · {learningMode} mode</span>
                </div>
              </div>

              <button className="outline-button-small" onClick={handleFinishSession}>
                <Award size={14} /> End Session & View Report
              </button>
            </div>

            {/* Message Thread */}
            <div className="chat-messages-container">
              {turns.map((turn) => {
                const isAi = turn.sender === "companion";
                return (
                  <div key={turn.id} className={`chat-bubble-row ${isAi ? "ai-row" : "user-row"}`}>
                    <div className={`chat-bubble ${isAi ? "ai-bubble" : "user-bubble"}`}>
                      {/* Kannada Script */}
                      <div className="bubble-kannada">{turn.kannadaText}</div>

                      {/* Transliteration */}
                      {turn.transliteration && (
                        <div className="bubble-translit">{turn.transliteration}</div>
                      )}

                      {/* English Meaning */}
                      {turn.englishMeaning && (
                        <div className="bubble-english">{turn.englishMeaning}</div>
                      )}

                      {/* Audio Controls */}
                      {isAi && (
                        <div className="bubble-audio-actions">
                          <button
                            className="audio-action-btn"
                            onClick={() => handlePlayAudio(turn.kannadaText, turn.id, 0.85)}
                            title="Play normal speed"
                          >
                            <Volume2 size={16} />
                            <span>{activePlaybackId === turn.id ? "Playing..." : "Listen"}</span>
                          </button>

                          <button
                            className="audio-action-btn secondary"
                            onClick={() => handlePlayAudio(turn.kannadaText, turn.id, 0.65)}
                            title="Play slow pronunciation"
                          >
                            <span>Slow 0.6x</span>
                          </button>
                        </div>
                      )}

                      {/* Context-Sensitive Feedback Drawer */}
                      {(turn.naturalAlternative || turn.grammarNotes) && (
                        <div className="feedback-drawer">
                          <div className="drawer-title">
                            <Info size={14} color="#D4A64A" /> Helpful Speaking Tip
                          </div>
                          {turn.naturalAlternative && (
                            <div className="drawer-item">
                              <span className="label">More authentic Kannada:</span>
                              <strong>{turn.naturalAlternative}</strong>
                            </div>
                          )}
                          {turn.grammarNotes && (
                            <div className="drawer-item">
                              <span className="label">Note:</span>
                              <span>{turn.grammarNotes}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Suggested Replies */}
                      {turn.suggestedReplies && turn.suggestedReplies.length > 0 && (
                        <div className="suggested-replies-block">
                          <span className="suggested-label">Suggested replies to try:</span>
                          <div className="suggested-pills">
                            {turn.suggestedReplies.map((reply, idx) => (
                              <button
                                key={idx}
                                className="suggested-pill"
                                onClick={() => handleSendMessage(reply)}
                              >
                                {reply}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {isProcessing && (
                <div className="chat-bubble-row ai-row">
                  <div className="chat-bubble ai-bubble processing">
                    <div className="typing-dots">
                      <span /><span /><span />
                    </div>
                    <span>MAATHU is thinking in Kannada...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Error Banner with Quick Action Recovery */}
            {errorMessage && (
              <div className="chat-error-banner">
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{errorMessage}</span>
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexShrink: 0 }}>
                  <button
                    type="button"
                    className="error-action-btn"
                    onClick={() => {
                      setErrorMessage("");
                      handleStartMicrophone();
                    }}
                  >
                    Retry Voice
                  </button>
                  <button
                    type="button"
                    className="error-action-btn primary"
                    onClick={() => {
                      setErrorMessage("");
                      void handleToggleAudioRecording();
                    }}
                  >
                    Record Audio with AI
                  </button>
                </div>
              </div>
            )}

            {/* Input Bar */}
            <div className="chat-input-bar">
              {/* Primary Live Web Speech Mic */}
              <button
                className={`mic-record-btn ${isListening ? "listening" : ""}`}
                onClick={handleStartMicrophone}
                disabled={isProcessing || isRecordingAudio}
                title="Tap to speak with live speech recognition"
              >
                <Mic size={20} />
                {isListening && <span className="mic-pulse" />}
              </button>

              {/* Direct Microphone Audio Recording (Gemini Multimodal) */}
              <button
                className={`audio-record-toggle-btn ${isRecordingAudio ? "recording" : ""}`}
                onClick={() => void handleToggleAudioRecording()}
                disabled={isProcessing || isListening}
                title={isRecordingAudio ? "Click to stop recording and send" : "Record audio directly with Gemini AI"}
              >
                {isRecordingAudio ? <Square size={16} /> : <Radio size={16} />}
                <span>{isRecordingAudio ? "Stop & Send" : "AI Audio"}</span>
              </button>

              <input
                type="text"
                className="chat-text-input"
                placeholder={
                  isListening
                    ? "Listening to Kannada speech..."
                    : isRecordingAudio
                    ? "Recording audio... click 'Stop & Send' when done speaking"
                    : "Speak Kannada or type message..."
                }
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                disabled={isProcessing || isListening || isRecordingAudio}
              />

              <button
                className="chat-send-btn"
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim() || isProcessing}
                title="Send message"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODULE 2: PRONUNCIATION INTELLIGENCE                     */}
      {/* ======================================================== */}
      {activeModule === "pronunciation" && (
        <div className="pronunciation-grid">
          {/* Left Column: Sentences List */}
          <div className="pron-sentences-card">
            <div className="panel-title-row">
              <h3>Select Sentence</h3>
              <span className="badge-tag">Phonetic Training</span>
            </div>

            <div className="pron-list">
              {sentences.map((sent) => {
                const isSelected = selectedSentence?.id === sent.id;
                return (
                  <button
                    key={sent.id}
                    className={`pron-item-card ${isSelected ? "active" : ""}`}
                    onClick={() => {
                      setSelectedSentence(sent);
                      setPronResult(null);
                      setPronRecognizedText("");
                      setPronError("");
                    }}
                  >
                    <div className="pron-card-top">
                      <span className="badge-level">{sent.difficulty}</span>
                      <span className="category-tag">{sent.category}</span>
                    </div>
                    <div className="pron-kannada">{sent.kannada}</div>
                    <div className="pron-english">{sent.english}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Training Arena */}
          {selectedSentence && (
            <div className="pron-arena-card">
              <div className="pron-arena-header">
                <div>
                  <span className="focus-pill">Phonetic Focus</span>
                  <p className="focus-text">{selectedSentence.phonetic_focus}</p>
                </div>

                <button
                  className="audio-action-btn"
                  onClick={() => speechService.speakKannada(selectedSentence.kannada, undefined, 0.85)}
                >
                  <Volume2 size={18} /> Listen to Model
                </button>
              </div>

              {/* Target Sentence Display */}
              <div className="target-sentence-box">
                <div className="target-kannada-large">{selectedSentence.kannada}</div>
                <div className="target-translit">{selectedSentence.transliteration}</div>
                <div className="target-english">"{selectedSentence.english}"</div>
              </div>

              {/* Recording Controls */}
              <div className="pron-record-area">
                <button
                  className={`pron-mic-btn ${isPronListening ? "recording" : ""}`}
                  onClick={handleStartPronMicrophone}
                  disabled={isPronEvaluating}
                >
                  <Mic size={28} />
                </button>
                <div className="mic-instructions">
                  <strong>{isPronListening ? "Listening... Speak the Kannada sentence clearly!" : "Click the microphone and speak aloud"}</strong>
                  <span>Web Speech recognition transcribes your utterance for word-level comparison.</span>
                </div>
              </div>

              {pronError && (
                <div className="chat-error-banner">
                  <AlertCircle size={16} />
                  <span>{pronError}</span>
                </div>
              )}

              {/* Assessment Evaluation Card */}
              {pronResult && (
                <div className="pron-result-card">
                  <div className="result-score-row">
                    <div>
                      <div className="score-number">{pronResult.accuracy_percent}%</div>
                      <div className="score-label">Clarity & Word Match</div>
                    </div>
                    <div className="assessment-badge">
                      <CheckCircle2 size={16} color="#174B3A" />
                      <span>{pronResult.assessment_method}</span>
                    </div>
                  </div>

                  {/* Word-by-Word Alignment */}
                  <div className="word-diff-section">
                    <h4>Word Recognition Breakdown:</h4>
                    {pronRecognizedText && (
                      <p className="diff-spoken" style={{ marginBottom: "8px", fontStyle: "italic", color: "#555" }}>
                        Recognized spoken utterance: "{pronRecognizedText}"
                      </p>
                    )}
                    <div className="diff-chips-row">
                      {pronResult.word_diffs.map((diff, i) => (
                        <div key={i} className={`diff-chip ${diff.status}`}>
                          <span className="diff-target">{diff.target_word || "(extra)"}</span>
                          {diff.spoken_word && (
                            <span className="diff-spoken">Recognized: "{diff.spoken_word}"</span>
                          )}
                          <span className="diff-status-label">{diff.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Phonetic Feedback Notes */}
                  <div className="phonetic-feedback-box">
                    <Info size={16} color="#174B3A" />
                    <div>
                      <strong>Pronunciation Feedback:</strong>
                      <p>{pronResult.feedback_notes}</p>
                    </div>
                  </div>

                  <div className="retry-row">
                    <button className="primary-button" onClick={handleStartPronMicrophone}>
                      <RotateCcw size={16} /> Try Again
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* End of Session Summary Modal */}
      {showSummaryModal && (
        <div className="modal-backdrop" onClick={() => setShowSummaryModal(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Session Performance Report</h2>
              <button className="modal-close" onClick={() => setShowSummaryModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="summary-stat-grid">
                <div className="stat-card">
                  <span className="num">{sessionSummary?.fluency_score || 85}%</span>
                  <span className="lbl">Conversational Fluency</span>
                </div>
                <div className="stat-card">
                  <span className="num">{turns.length}</span>
                  <span className="lbl">Turns Completed</span>
                </div>
              </div>

              <div className="summary-section">
                <h4>What You Did Well:</h4>
                <p>{sessionSummary?.positive_feedback || "Great confidence speaking and responding in Kannada!"}</p>
              </div>

              <div className="summary-section">
                <h4>Tip for Next Time:</h4>
                <p>{sessionSummary?.improvement_tip || "Try using question words like 'ಹೇಗೆ' and 'ಯಾವಾಗ' to lead the conversation."}</p>
              </div>

              <button className="primary-button full-width" onClick={() => setShowSummaryModal(false)}>
                Continue Learning
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
