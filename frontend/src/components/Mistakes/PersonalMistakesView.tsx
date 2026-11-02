import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Volume2,
  CheckCircle2,
  Mic,
} from "lucide-react";
import { api } from "../../services/api";
import { speechService } from "../../services/speech";
import { storage } from "../../services/storage";
import type { PersonalMistakeItem, AdaptiveLessonData, LearnerSkillsProfile } from "../../types";

export const PersonalMistakesView: React.FC = () => {
  const [mistakes, setMistakes] = useState<PersonalMistakeItem[]>([]);
  const [skillsProfile, setSkillsProfile] = useState<LearnerSkillsProfile | null>(null);
  const [activeLesson, setActiveLesson] = useState<AdaptiveLessonData | null>(null);
  const [isGeneratingLesson, setIsGeneratingLesson] = useState(false);
  const [lessonModalOpen, setLessonModalOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState("");
  const [listeningAnswer, setListeningAnswer] = useState<string | null>(null);
  const [speakingFeedback, setSpeakingFeedback] = useState("");
  const [isListeningMic, setIsListeningMic] = useState(false);

  useEffect(() => {
    loadData();
    return () => speechService.stopSpeaking();
  }, []);

  async function loadData() {
    try {
      const [mistakesList, skills] = await Promise.all([
        api.getPersonalMistakes(),
        api.getLearnerSkills(),
      ]);
      setMistakes(mistakesList);
      setSkillsProfile(skills);
    } catch (e) {
      console.warn("Could not load mistakes or skills:", e);
    }
  }

  async function handleStartAdaptiveLesson(topic: string) {
    setSelectedTopic(topic);
    setIsGeneratingLesson(true);
    setLessonModalOpen(true);
    setActiveLesson(null);
    setListeningAnswer(null);
    setSpeakingFeedback("");

    try {
      const lesson = await api.getAdaptiveExercise(topic, "Beginner");
      setActiveLesson(lesson);
    } catch (e: any) {
      console.error("Adaptive lesson error:", e);
    } finally {
      setIsGeneratingLesson(false);
    }
  }

  function handleCheckListening(option: string) {
    if (!activeLesson) return;
    setListeningAnswer(option);
  }

  function handlePracticeSpeakingChallenge() {
    if (!activeLesson || isListeningMic) return;

    speechService.stopSpeaking();
    setIsListeningMic(true);
    setSpeakingFeedback("");

    speechService.startListening({
      onStart: () => setSpeakingFeedback("Listening... Speak the target sentence!"),
      onEnd: () => setIsListeningMic(false),
      onError: (msg) => {
        setIsListeningMic(false);
        setSpeakingFeedback(msg);
      },
      onResult: (transcript) => {
        setIsListeningMic(false);
        const target = activeLesson.speaking_prompt.target_sentence;
        if (transcript.length > 2 || transcript.includes(target)) {
          setSpeakingFeedback(`Well done! Recognized: "${transcript}". Practice completed (+15 XP)!`);
          storage.awardCurrency({
            xpAmount: 15,
            pointsAmount: 3,
            reason: `Adaptive Exercise Practice: ${selectedTopic}`,
          });
        }
      },
    });
  }

  return (
    <div className="mistakes-container">
      {/* Header */}
      <div className="practice-header">
        <div>
          <div className="section-pill">
            <Sparkles size={14} /> FEATURE 05 · ADAPTIVE INTELLIGENCE
          </div>
          <h1>My Personal Mistake Library</h1>
          <p className="page-lead">
            Turn every stumble into fluency. MAATHU tracks recurring Kannada grammar and speech difficulties and creates personalized targeted drills.
          </p>
        </div>
      </div>

      {/* Intelligence Summary Banner */}
      {skillsProfile && (
        <div className="skills-overview-card">
          <div className="skills-card-left">
            <span className="badge-tag">LEARNER PROFILE</span>
            <h3>Weakest Skill: {skillsProfile.needs_improvement}</h3>
            <p>{skillsProfile.recommendation}</p>
            <button
              className="primary-button"
              onClick={() => handleStartAdaptiveLesson(skillsProfile.needs_improvement)}
            >
              Generate Targeted Lesson for {skillsProfile.needs_improvement}
            </button>
          </div>

          <div className="skills-card-right">
            <div className="skill-meter-row">
              <span>Vocabulary:</span>
              <div className="meter-track"><div className="meter-fill" style={{ width: `${skillsProfile.skills.vocabulary}%` }} /></div>
              <strong>{skillsProfile.skills.vocabulary}%</strong>
            </div>
            <div className="skill-meter-row">
              <span>Grammar:</span>
              <div className="meter-track"><div className="meter-fill" style={{ width: `${skillsProfile.skills.grammar}%` }} /></div>
              <strong>{skillsProfile.skills.grammar}%</strong>
            </div>
            <div className="skill-meter-row">
              <span>Speaking:</span>
              <div className="meter-track"><div className="meter-fill" style={{ width: `${skillsProfile.skills.speaking}%` }} /></div>
              <strong>{skillsProfile.skills.speaking}%</strong>
            </div>
            <div className="skill-meter-row">
              <span>Questions:</span>
              <div className="meter-track"><div className="meter-fill" style={{ width: `${skillsProfile.skills.question_formation}%` }} /></div>
              <strong>{skillsProfile.skills.question_formation}%</strong>
            </div>
          </div>
        </div>
      )}

      {/* Mistake Library Grid */}
      <div className="mistakes-list-section">
        <div className="panel-title-row">
          <h3>Observed Learning Difficulties ({mistakes.length})</h3>
          <span className="badge-tag">Evidence-Based</span>
        </div>

        {mistakes.length > 0 ? (
          <div className="mistakes-grid">
            {mistakes.map((item) => (
              <div key={item.id} className="mistake-item-card">
                <div className="mistake-card-top">
                  <span className="category-pill">{item.category.toUpperCase()}</span>
                  <span className="occurrences-badge">Observed {item.occurrences_count} times</span>
                </div>

                <div className="mistake-diff-box">
                  <div className="diff-row wrong">
                    <span className="indicator">✗ What was said:</span>
                    <span className="text">{item.original_expression}</span>
                  </div>
                  <div className="diff-row correct">
                    <span className="indicator">✓ Natural Kannada:</span>
                    <span className="text">{item.suggested_correction}</span>
                    <button
                      className="audio-listen-icon-btn"
                      onClick={() => speechService.speakKannada(item.suggested_correction, undefined, 0.85)}
                      title="Listen"
                    >
                      <Volume2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="mistake-explanation">
                  <strong>Why:</strong> {item.explanation}
                </div>

                <button
                  className="outline-button full-width"
                  onClick={() => handleStartAdaptiveLesson(`${item.category}: ${item.suggested_correction}`)}
                >
                  <Sparkles size={16} /> Practice Targeted Drill
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-detection-state">
            <CheckCircle2 size={40} color="#174B3A" />
            <h3>No Recurring Mistakes Recorded Yet</h3>
            <p>
              As you converse in the Speaking Studio or Real-Life Missions, MAATHU will automatically identify patterns and log corrections here.
            </p>
          </div>
        )}
      </div>

      {/* Adaptive Lesson Modal */}
      {lessonModalOpen && (
        <div className="modal-backdrop" onClick={() => setLessonModalOpen(false)}>
          <div className="modal-sheet large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="badge-tag">TARGETED DRILL</span>
                <h2>Adaptive Lesson: {selectedTopic}</h2>
              </div>
              <button className="modal-close" onClick={() => setLessonModalOpen(false)}>✕</button>
            </div>

            <div className="modal-body">
              {isGeneratingLesson ? (
                <div className="loading-state-box">
                  <div className="splash-spinner" />
                  <p>Generating personalized exercise with Gemini...</p>
                </div>
              ) : activeLesson ? (
                <div className="adaptive-lesson-content">
                  {/* Explanation */}
                  <div className="lesson-explanation-card">
                    <h4>Concept Explanation:</h4>
                    <p>{activeLesson.short_explanation}</p>
                  </div>

                  {/* Examples */}
                  <div className="lesson-examples-card">
                    <h4>Key Kannada Examples:</h4>
                    <div className="examples-list">
                      {activeLesson.kannada_examples.map((ex, i) => (
                        <div key={i} className="example-item">
                          <div className="ex-kannada-row">
                            <strong>{ex.kannada}</strong>
                            <button
                              className="audio-listen-icon-btn"
                              onClick={() => speechService.speakKannada(ex.kannada, undefined, 0.85)}
                            >
                              <Volume2 size={14} />
                            </button>
                          </div>
                          <span className="ex-translit">{ex.transliteration}</span>
                          <span className="ex-meaning">"{ex.english}"</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Listening Comprehension */}
                  <div className="lesson-exercise-box">
                    <h4>1. Listening Comprehension Drill:</h4>
                    <div className="audio-play-row">
                      <button
                        className="primary-button"
                        onClick={() => speechService.speakKannada(activeLesson.listening_prompt.audio_text, undefined, 0.85)}
                      >
                        <Volume2 size={16} /> Play Kannada Audio
                      </button>
                      <span>Listen carefully, then answer:</span>
                    </div>

                    <p className="drill-question">{activeLesson.listening_prompt.question}</p>
                    <div className="drill-options">
                      {activeLesson.listening_prompt.options.map((opt, idx) => {
                        const isSelected = listeningAnswer === opt;
                        const isCorrect = opt === activeLesson.listening_prompt.correct_answer;
                        return (
                          <button
                            key={idx}
                            className={`drill-option-btn ${isSelected ? (isCorrect ? "correct" : "incorrect") : ""}`}
                            onClick={() => handleCheckListening(opt)}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Speaking Challenge */}
                  <div className="lesson-exercise-box">
                    <h4>2. Speaking Practice:</h4>
                    <div className="target-speech-prompt">
                      <div className="target-kannada">{activeLesson.speaking_prompt.target_sentence}</div>
                      <div className="target-translit">{activeLesson.speaking_prompt.transliteration}</div>
                      <div className="target-eng">"{activeLesson.speaking_prompt.english}"</div>
                      <div className="phonetic-tip">Tip: {activeLesson.speaking_prompt.phonetic_tip}</div>
                    </div>

                    <div className="speech-drill-controls">
                      <button
                        className={`mic-record-btn ${isListeningMic ? "listening" : ""}`}
                        onClick={handlePracticeSpeakingChallenge}
                        disabled={isListeningMic}
                      >
                        <Mic size={20} />
                      </button>
                      <span>{isListeningMic ? "Listening to your voice..." : "Click to speak this sentence"}</span>
                    </div>

                    {speakingFeedback && (
                      <div className="speech-feedback-banner">
                        <CheckCircle2 size={16} color="#174B3A" />
                        <span>{speakingFeedback}</span>
                      </div>
                    )}
                  </div>

                  {/* Independent Challenge */}
                  <div className="lesson-challenge-box">
                    <h4>3. Real-Life Independent Challenge:</h4>
                    <p>{activeLesson.independent_challenge.prompt_situation}</p>
                  </div>

                  <button className="primary-button full-width" onClick={() => setLessonModalOpen(false)}>
                    Complete Lesson & Return
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
