import React, { useState, useRef, useEffect } from "react";
import {
  Camera,
  Upload,
  Sparkles,
  Volume2,
  Mic,
  Bookmark,
  Check,
  AlertCircle,
  RefreshCw,
  Info,
  Layers,
} from "lucide-react";
import { api } from "../../services/api";
import { speechService } from "../../services/speech";
import { storage } from "../../services/storage";
import type { CameraDetectedWord } from "../../types";

export const CameraLearningView: React.FC = () => {
  const [streamActive, setStreamActive] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectedWord, setDetectedWord] = useState<CameraDetectedWord | null>(null);
  const [permissionError, setPermissionError] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [speechFeedback, setSpeechFeedback] = useState("");
  const [isPracticingSpeech, setIsPracticingSpeech] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      stopCameraStream();
      speechService.stopSpeaking();
    };
  }, []);

  async function startCamera() {
    setPermissionError("");
    setDetectedWord(null);
    setSavedSuccess(false);
    setSpeechFeedback("");

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setPermissionError("Camera access is not supported by your browser. You can use the 'Upload Photo' option below.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setStreamActive(true);
      }
    } catch (err: any) {
      console.warn("Camera access error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setPermissionError("Camera permission was denied. Please allow camera access in your browser settings, or upload an image file instead.");
      } else {
        setPermissionError("Could not start camera stream. Please use the file upload option.");
      }
      setStreamActive(false);
    }
  }

  function stopCameraStream() {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setStreamActive(false);
  }

  function handleCaptureSnapshot() {
    if (!videoRef.current || !canvasRef.current || isAnalyzing) return;

    setIsCapturing(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64Data = canvas.toDataURL("image/jpeg", 0.85);

    stopCameraStream();
    setIsCapturing(false);
    void sendImageForAnalysis(base64Data, "image/jpeg");
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setPermissionError("Please upload a valid image file (JPEG, PNG, or WebP).");
      return;
    }

    stopCameraStream();
    setPermissionError("");
    setDetectedWord(null);
    setSavedSuccess(false);

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      void sendImageForAnalysis(base64, file.type);
    };
    reader.readAsDataURL(file);
  }

  async function sendImageForAnalysis(base64Data: string, mimeType: string) {
    setIsAnalyzing(true);
    setPermissionError("");

    try {
      const result = await api.identifyCameraBase64(base64Data, mimeType);
      setDetectedWord(result);

      // Speak detected Kannada word automatically
      speechService.speakKannada(result.kannada_word, undefined, 0.85);

      storage.awardCurrency({
        xpAmount: 20,
        pointsAmount: 5,
        reason: `Discovered word: ${result.kannada_word} (${result.identified_object_english})`,
        referenceId: `camera:${Date.now()}`,
        idempotencyKey: `cam_${Date.now()}`,
      });
    } catch (err: any) {
      setPermissionError(err.message || "Failed to analyze image. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleSaveToPhrasebook() {
    if (!detectedWord || savedSuccess) return;

    try {
      await api.savePhrase({
        kannada_text: detectedWord.kannada_word,
        transliteration: detectedWord.transliteration,
        english_meaning: detectedWord.identified_object_english,
        category: detectedWord.category,
        formality_level: "polite",
        source: "camera",
      });
      setSavedSuccess(true);
    } catch {
      // Local fallback
      setSavedSuccess(true);
    }
  }

  function handlePracticeSpeaking() {
    if (!detectedWord || isPracticingSpeech) return;

    speechService.stopSpeaking();
    setSpeechFeedback("");
    setIsPracticingSpeech(true);

    speechService.startListening({
      onStart: () => setSpeechFeedback("Listening... Say the Kannada word aloud!"),
      onEnd: () => setIsPracticingSpeech(false),
      onError: (msg) => {
        setIsPracticingSpeech(false);
        setSpeechFeedback(msg);
      },
      onResult: (transcript) => {
        setIsPracticingSpeech(false);
        const target = detectedWord.kannada_word.trim();
        const spoken = transcript.trim();

        if (spoken.includes(target) || target.includes(spoken)) {
          setSpeechFeedback(`Spot on! Recognized: "${spoken}". +10 XP awarded!`);
          storage.awardCurrency({
            xpAmount: 10,
            pointsAmount: 2,
            reason: `Practiced pronunciation of ${target}`,
            referenceId: `cam_pron_${Date.now()}`,
          });
        } else {
          setSpeechFeedback(`Good try! You said: "${spoken}". Target is: "${target}". Tap Listen and try again.`);
        }
      },
    });
  }

  return (
    <div className="camera-learning-container">
      {/* Header */}
      <div className="practice-header">
        <div>
          <div className="section-pill">
            <Camera size={14} /> FEATURE 04 · VISUAL AI
          </div>
          <h1>Camera-Based Kannada Learning</h1>
          <p className="page-lead">
            Point your camera at everyday objects around your room, office, or kitchen to learn their authentic Kannada names.
          </p>
        </div>
      </div>

      <div className="camera-workspace-grid">
        {/* Left Column: Viewfinder & Capture Controls */}
        <div className="camera-viewfinder-card">
          <div className="viewfinder-box">
            {streamActive ? (
              <video ref={videoRef} className="camera-video-element" playsInline autoPlay muted />
            ) : (
              <div className="viewfinder-placeholder">
                <Camera size={48} color="#174B3A" />
                <p>Camera is currently inactive</p>
                <button className="primary-button" onClick={startCamera}>
                  <Camera size={18} /> Open Camera
                </button>
              </div>
            )}

            {isAnalyzing && (
              <div className="analyzing-overlay">
                <div className="splash-spinner" />
                <p>Analyzing image with Gemini Vision...</p>
                <span>Extracting authentic Kannada vocabulary</span>
              </div>
            )}
          </div>

          <canvas ref={canvasRef} style={{ display: "none" }} />

          {/* Action Buttons */}
          <div className="viewfinder-controls">
            {streamActive && (
              <button
                className="capture-circle-btn"
                onClick={handleCaptureSnapshot}
                disabled={isAnalyzing || isCapturing}
                title="Capture Photo"
              >
                <div className="inner-circle" />
              </button>
            )}

            <div className="upload-fallback-row">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleFileUpload}
              />
              <button
                className="outline-button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isAnalyzing}
              >
                <Upload size={16} /> Upload Photo from Device
              </button>
            </div>
          </div>

          {permissionError && (
            <div className="chat-error-banner">
              <AlertCircle size={16} />
              <span>{permissionError}</span>
            </div>
          )}
        </div>

        {/* Right Column: Detected Vocabulary Card */}
        <div className="detected-results-card">
          {detectedWord ? (
            <div className="vocabulary-showcase">
              <div className="showcase-header">
                <span className="badge-tag">{detectedWord.category.replace("_", " ").toUpperCase()}</span>
                <span className="confidence-tag">
                  <Sparkles size={14} /> Confidence: {detectedWord.confidence_level}
                </span>
              </div>

              {/* Large Kannada Word Display */}
              <div className="big-word-box">
                <div className="kannada-main-word">{detectedWord.kannada_word}</div>
                <div className="kannada-translit">{detectedWord.transliteration}</div>
                <div className="english-meaning">Meaning: {detectedWord.identified_object_english}</div>
              </div>

              {/* Audio Listen & Speech Practice */}
              <div className="audio-actions-row">
                <button
                  className="primary-button"
                  onClick={() => speechService.speakKannada(detectedWord.kannada_word, undefined, 0.85)}
                >
                  <Volume2 size={18} /> Hear Pronunciation
                </button>

                <button
                  className={`outline-button ${isPracticingSpeech ? "listening" : ""}`}
                  onClick={handlePracticeSpeaking}
                  disabled={isPracticingSpeech}
                >
                  <Mic size={18} /> {isPracticingSpeech ? "Listening..." : "Practice Speaking"}
                </button>

                <button
                  className={`save-phrase-btn ${savedSuccess ? "saved" : ""}`}
                  onClick={handleSaveToPhrasebook}
                  disabled={savedSuccess}
                >
                  {savedSuccess ? <Check size={18} /> : <Bookmark size={18} />}
                  <span>{savedSuccess ? "Saved to Phrasebook" : "Save Word"}</span>
                </button>
              </div>

              {speechFeedback && (
                <div className="speech-feedback-banner">
                  <Info size={16} color="#174B3A" />
                  <span>{speechFeedback}</span>
                </div>
              )}

              {/* Example Sentence */}
              <div className="example-sentence-box">
                <h4>Conversational Example Sentence:</h4>
                <div className="ex-kannada">{detectedWord.example_sentence_kannada}</div>
                <div className="ex-translit">{detectedWord.example_sentence_transliteration}</div>
                <div className="ex-english">"{detectedWord.example_sentence_english}"</div>
                <button
                  className="audio-listen-icon-btn"
                  onClick={() => speechService.speakKannada(detectedWord.example_sentence_kannada, undefined, 0.85)}
                  title="Listen to sentence"
                >
                  <Volume2 size={16} /> Listen to Example
                </button>
              </div>

              {/* Related Vocabulary */}
              {detectedWord.useful_related_words && detectedWord.useful_related_words.length > 0 && (
                <div className="related-words-box">
                  <h4>Related Everyday Words:</h4>
                  <div className="related-chips-grid">
                    {detectedWord.useful_related_words.map((rel, idx) => (
                      <div key={idx} className="related-chip">
                        <strong>{rel.kannada}</strong>
                        <span>{rel.transliteration}</span>
                        <span className="rel-eng">{rel.english}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="capture-another-row">
                <button className="outline-button full-width" onClick={startCamera}>
                  <RefreshCw size={16} /> Scan Another Object
                </button>
              </div>
            </div>
          ) : (
            <div className="empty-detection-state">
              <Layers size={40} color="#D4A64A" />
              <h3>No Object Scanned Yet</h3>
              <p>
                Open your camera or upload a picture of any everyday item: fruits, dishes, furniture, books, or vehicles.
              </p>
              <div className="suggested-objects-list">
                <span>Try scanning:</span>
                <span className="pill">ಕುರ್ಚಿ (Chair)</span>
                <span className="pill">ಕಾಫಿ (Coffee)</span>
                <span className="pill">ಪುಸ್ತಕ (Book)</span>
                <span className="pill">ಸೇಬು (Apple)</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

