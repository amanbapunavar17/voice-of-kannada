import React, { useState } from "react";
import {
  X,
  Volume2,
  CheckCircle2,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import confetti from "canvas-confetti";
import type { Lesson, LessonExercise } from "../../types";
import { speechService } from "../../services/speech";
import { storage } from "../../services/storage";

interface LessonViewerModalProps {
  lesson: Lesson;
  onClose: () => void;
  onCompleted: () => void;
}

export const LessonViewerModal: React.FC<LessonViewerModalProps> = ({
  lesson,
  onClose,
  onCompleted,
}) => {
  // Steps: 0 to phrases.length - 1 = Flashcards; then exercises; then summary
  const [activeStep, setActiveStep] = useState(0);
  const totalFlashcards = lesson.phrases.length;
  const totalExercises = lesson.exercises.length;
  const totalSteps = totalFlashcards + totalExercises;

  // Exercise state
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [reorderedWords, setReorderedWords] = useState<string[]>([]);
  const [availableReorderWords, setAvailableReorderWords] = useState<string[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<string[]>([]);
  const [selectedPairLeft, setSelectedPairLeft] = useState<string | null>(null);
  const [exerciseFeedback, setExerciseFeedback] = useState<"correct" | "wrong" | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  // Initialize reorder words if active exercise is reorder
  const isExercisePhase = activeStep >= totalFlashcards;
  const currentExerciseIndex = activeStep - totalFlashcards;
  const currentExercise: LessonExercise | undefined = isExercisePhase
    ? lesson.exercises[currentExerciseIndex]
    : undefined;

  function handleNextStep() {
    setExerciseFeedback(null);
    setSelectedOption(null);
    setSelectedPairLeft(null);

    if (activeStep + 1 < totalSteps) {
      const nextStep = activeStep + 1;
      setActiveStep(nextStep);

      // Pre-populate reorder exercise if next step is reorder
      if (nextStep >= totalFlashcards) {
        const nextEx = lesson.exercises[nextStep - totalFlashcards];
        if (nextEx && nextEx.type === "reorder" && nextEx.wordsToArrange) {
          setAvailableReorderWords([...nextEx.wordsToArrange].sort(() => Math.random() - 0.5));
          setReorderedWords([]);
        }
      }
    } else {
      // Completed entire lesson!
      setIsCompleted(true);
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
      storage.completeLesson(lesson.id, lesson.xpReward, lesson.pointsReward);
      onCompleted();
    }
  }

  function handleOptionSelect(optId: string, isCorrect: boolean) {
    if (exerciseFeedback !== null) return;
    setSelectedOption(optId);

    if (isCorrect) {
      setExerciseFeedback("correct");
    } else {
      setExerciseFeedback("wrong");
    }
  }

  function handleCheckReorder() {
    if (!currentExercise || !currentExercise.correctSentence) return;
    const constructed = reorderedWords.join(" ").trim();
    const correct = currentExercise.correctSentence.trim();

    if (constructed === correct) {
      setExerciseFeedback("correct");
      speechService.speakKannada(correct);
    } else {
      setExerciseFeedback("wrong");
    }
  }

  function handlePairMatch(kannadaText: string, englishText: string) {
    if (!currentExercise || !currentExercise.pairs) return;
    const pair = currentExercise.pairs.find(
      (p) => p.kannada === kannadaText && p.english === englishText
    );

    if (pair) {
      setMatchedPairs((prev) => [...prev, pair.id]);
      setSelectedPairLeft(null);
      if (matchedPairs.length + 1 === currentExercise.pairs.length) {
        setExerciseFeedback("correct");
      }
    } else {
      setSelectedPairLeft(null);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card lesson-viewer-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Top Header */}
        <div className="lesson-modal-header">
          <div>
            <span className="lesson-category-tag">LESSON</span>
            <h3>{lesson.title}</h3>
            <span className="lesson-kannada-subtitle">{lesson.titleKannada}</span>
          </div>
          <button className="icon-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="lesson-step-progressbar">
          <span
            style={{
              width: `${Math.round(((activeStep + 1) / totalSteps) * 100)}%`,
            }}
          />
        </div>

        {!isCompleted ? (
          <div className="lesson-content-body">
            {!isExercisePhase ? (
              /* FLASHCARD PHASE */
              <div className="flashcard-step-view">
                <div className="flashcard-counter">
                  Card {activeStep + 1} of {totalFlashcards}
                </div>

                {(() => {
                  const phrase = lesson.phrases[activeStep];
                  return (
                    <div className="interactive-phrase-card">
                      <div className="phrase-top-row">
                        <span className="badge-pill">Vocabulary</span>
                        <button
                          className="sound-round-btn"
                          onClick={() => speechService.speakKannada(phrase.kannada)}
                          title="Listen to Kannada"
                        >
                          <Volume2 size={20} />
                        </button>
                      </div>

                      <div className="main-phrase-kannada">{phrase.kannada}</div>
                      <div className="main-phrase-transliteration">{phrase.transliteration}</div>
                      <div className="main-phrase-meaning">"{phrase.meaning}"</div>

                      {phrase.usageContext && (
                        <div className="phrase-context-note">
                          <strong>Cultural Note:</strong> {phrase.usageContext}
                        </div>
                      )}

                      {phrase.exampleSentence && (
                        <div className="phrase-example-box">
                          <span className="example-label">EXAMPLE SENTENCE</span>
                          <div className="example-kn">{phrase.exampleSentence.kannada}</div>
                          <div className="example-trans">{phrase.exampleSentence.transliteration}</div>
                          <div className="example-en">"{phrase.exampleSentence.english}"</div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div className="lesson-actions-bar">
                  <button
                    className="primary-button"
                    onClick={handleNextStep}
                  >
                    {activeStep + 1 < totalSteps ? "Next" : "Finish Lesson"}{" "}
                    <ArrowRight size={17} />
                  </button>
                </div>
              </div>
            ) : (
              /* EXERCISE PHASE */
              <div className="exercise-step-view">
                <div className="flashcard-counter">
                  Exercise {currentExerciseIndex + 1} of {totalExercises}
                </div>

                {currentExercise && (
                  <div className="exercise-container">
                    <h4 className="exercise-prompt">{currentExercise.prompt}</h4>
                    {currentExercise.promptKannada && (
                      <div className="exercise-prompt-kn">{currentExercise.promptKannada}</div>
                    )}

                    {/* Multiple Choice */}
                    {currentExercise.type === "multiple_choice" && currentExercise.options && (
                      <div className="options-stack">
                        {currentExercise.options.map((opt) => {
                          const isSelected = selectedOption === opt.id;
                          let btnClass = "exercise-opt-btn";
                          if (isSelected) {
                            btnClass += opt.isCorrect ? " correct" : " wrong";
                          }

                          return (
                            <button
                              key={opt.id}
                              className={btnClass}
                              onClick={() => handleOptionSelect(opt.id, opt.isCorrect)}
                              disabled={exerciseFeedback !== null}
                            >
                              <span>{opt.text}</span>
                              {opt.textKannada && (
                                <span className="opt-kn">{opt.textKannada}</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Fill in the Blank Exercise */}
                    {currentExercise.type === "fill_blank" && (
                      <div className="fill-blank-exercise-box">
                        <div className="fill-sentence-card">
                          {(() => {
                            const sentence = currentExercise.fillSentence || "___";
                            const parts = sentence.split("___");
                            const chosenOpt = selectedOption
                              ? currentExercise.options?.find((o) => o.id === selectedOption)
                              : null;

                            return (
                              <div className="fill-sentence-row">
                                <span className="fill-part">{parts[0]}</span>
                                <span
                                  className={`fill-blank-slot ${
                                    chosenOpt
                                      ? chosenOpt.isCorrect
                                        ? "correct"
                                        : "wrong"
                                      : "empty"
                                  }`}
                                >
                                  {chosenOpt ? chosenOpt.text : "______"}
                                </span>
                                <span className="fill-part">{parts[1] || ""}</span>
                              </div>
                            );
                          })()}
                        </div>

                        <div className="fill-options-container">
                          <p className="fill-options-label">Choose the correct word to complete the sentence:</p>
                          <div className="options-stack">
                            {currentExercise.options?.map((opt) => {
                              const isSelected = selectedOption === opt.id;
                              let btnClass = "exercise-opt-btn";
                              if (isSelected) {
                                btnClass += opt.isCorrect ? " correct" : " wrong";
                              }

                              return (
                                <button
                                  key={opt.id}
                                  className={btnClass}
                                  onClick={() => {
                                    if (exerciseFeedback !== null) return;
                                    handleOptionSelect(opt.id, opt.isCorrect);
                                    if (opt.isCorrect) {
                                      const full = (currentExercise.fillSentence || "")
                                        .replace("___", opt.text)
                                        .trim();
                                      speechService.speakKannada(full || opt.text);
                                    }
                                  }}
                                  disabled={exerciseFeedback !== null}
                                >
                                  <span>{opt.text}</span>
                                  {opt.textKannada && (
                                    <span className="opt-kn">{opt.textKannada}</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Reorder Sentence */}
                    {currentExercise.type === "reorder" && (
                      <div className="reorder-exercise-box">
                        <div className="placed-row-reorder">
                          {reorderedWords.length === 0 ? (
                            <span className="placeholder-reorder">Tap words below to arrange...</span>
                          ) : (
                            reorderedWords.map((w, idx) => (
                              <button
                                key={idx}
                                className="reorder-tile placed"
                                onClick={() => {
                                  if (exerciseFeedback === "correct") return;
                                  const updated = [...reorderedWords];
                                  updated.splice(idx, 1);
                                  setReorderedWords(updated);
                                  setAvailableReorderWords([...availableReorderWords, w]);
                                  setExerciseFeedback(null);
                                }}
                              >
                                {w}
                              </button>
                            ))
                          )}
                        </div>

                        <div className="pool-row-reorder">
                          {availableReorderWords.map((w, idx) => (
                            <button
                              key={idx}
                              className="reorder-tile pool"
                              onClick={() => {
                                if (exerciseFeedback === "correct") return;
                                const updated = [...availableReorderWords];
                                updated.splice(idx, 1);
                                setAvailableReorderWords(updated);
                                setReorderedWords([...reorderedWords, w]);
                                setExerciseFeedback(null);
                              }}
                            >
                              {w}
                            </button>
                          ))}
                        </div>

                        {exerciseFeedback !== "correct" && (
                          <button
                            className="secondary-button"
                            onClick={handleCheckReorder}
                            disabled={reorderedWords.length === 0}
                          >
                            Check Sentence
                          </button>
                        )}
                      </div>
                    )}

                    {/* Matching Pairs */}
                    {currentExercise.type === "matching" && currentExercise.pairs && (
                      <div className="matching-exercise-grid">
                        <div className="match-col left">
                          <span className="col-label">Kannada</span>
                          {currentExercise.pairs.map((p) => {
                            const isMatched = matchedPairs.includes(p.id);
                            return (
                              <button
                                key={p.id}
                                className={`match-tile ${
                                  selectedPairLeft === p.kannada ? "selected" : ""
                                } ${isMatched ? "matched" : ""}`}
                                onClick={() => setSelectedPairLeft(p.kannada)}
                                disabled={isMatched}
                              >
                                {p.kannada}
                              </button>
                            );
                          })}
                        </div>

                        <div className="match-col right">
                          <span className="col-label">English Meaning</span>
                          {currentExercise.pairs.map((p) => {
                            const isMatched = matchedPairs.includes(p.id);
                            return (
                              <button
                                key={p.id}
                                className={`match-tile ${isMatched ? "matched" : ""}`}
                                onClick={() => {
                                  if (selectedPairLeft) {
                                    handlePairMatch(selectedPairLeft, p.english);
                                  }
                                }}
                                disabled={isMatched}
                              >
                                {p.english}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Feedback and Continue */}
                    {exerciseFeedback && (
                      <div className={`exercise-feedback-banner ${exerciseFeedback}`}>
                        <div>
                          <strong>
                            {exerciseFeedback === "correct" ? "ಸರಿಯಾಗಿದೆ! Correct!" : "Try again!"}
                          </strong>
                          <p>{currentExercise.explanation}</p>
                        </div>
                        {exerciseFeedback === "correct" && (
                          <button className="primary-button" onClick={handleNextStep}>
                            Continue <ArrowRight size={16} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* COMPLETION SUMMARY */
          <div className="lesson-completion-view">
            <div className="trophy-circle">
              <Sparkles size={46} color="#D4A64A" />
            </div>
            <h2>ಪಾಠ ಪೂರ್ಣಗೊಂಡಿದೆ!</h2>
            <h3>Lesson Completed!</h3>
            <p>
              You have successfully completed <strong>"{lesson.title}"</strong> and practiced practical Kannada vocabulary.
            </p>

            <div className="completion-rewards-card">
              <div className="completion-reward-pill">
                <Sparkles size={18} color="#174B3A" />
                <span>+{lesson.xpReward} Learning XP</span>
              </div>
              <div className="completion-reward-pill gold">
                <CheckCircle2 size={18} color="#D4A64A" />
                <span>+{lesson.pointsReward} Maatu Points</span>
              </div>
            </div>

            <button className="primary-button full-width" onClick={onClose}>
              Continue Learning <ArrowRight size={17} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
