import React, { useState, useEffect } from "react";
import {
  Bookmark,
  Volume2,
  LifeBuoy,
  Languages,
  Layers,
  Sparkles,
  Search,
} from "lucide-react";
import { api } from "../../services/api";
import { speechService } from "../../services/speech";
import type {
  SavedPhraseRecord,
  NaturalTranslationData,
  SentenceBreakdownData,
} from "../../types";

const SURVIVAL_PHRASES = [
  {
    id: "surv-1",
    kannada: "ನನಗೆ ನೀರು ಬೇಕು.",
    transliteration: "Nanage neeru beku.",
    english: "I need drinking water.",
    situation: "Thirst / Restaurant / Home",
  },
  {
    id: "surv-2",
    kannada: "ಬಸ್ ನಿಲ್ದಾಣ ಎಲ್ಲಿದೆ?",
    transliteration: "Bus nildaana ellide?",
    english: "Where is the bus stop?",
    situation: "Travel / Commute",
  },
  {
    id: "surv-3",
    kannada: "ಇದರ ಬೆಲೆ ಎಷ್ಟು?",
    transliteration: "Idara bele eshtu?",
    english: "How much does this cost?",
    situation: "Market / Shopping / Auto",
  },
  {
    id: "surv-4",
    kannada: "ದಯವಿಟ್ಟು ನನಗೆ ಸಹಾಯ ಮಾಡಿ.",
    transliteration: "Dayavittu nanage sahaaya maadi.",
    english: "Please help me.",
    situation: "Emergency / Assistance",
  },
  {
    id: "surv-5",
    kannada: "ನನಗೆ ಕನ್ನಡ ಸರಿಯಾಗಿ ಬರಲ್ಲ.",
    transliteration: "Nanage Kannada sariyaagi baralla.",
    english: "I don't understand / speak Kannada well.",
    situation: "Conversation / Clarification",
  },
  {
    id: "surv-6",
    kannada: "ದಯವಿಟ್ಟು ಸ್ವಲ್ಪ ನಿಧಾನವಾಗಿ ಮಾತನಾಡಿ.",
    transliteration: "Dayavittu swalpa nidhaanavaagi maatanaadi.",
    english: "Please speak a little slowly.",
    situation: "Listening assistance",
  },
  {
    id: "surv-7",
    kannada: "ಹತ್ತಿರದ ಆಸ್ಪತ್ರೆ ಎಲ್ಲಿದೆ?",
    transliteration: "Hattirada aaspatre ellide?",
    english: "Where is the nearest hospital?",
    situation: "Medical / Health",
  },
  {
    id: "surv-8",
    kannada: "ಸ್ವಲ್ಪ ಅಡ್ಜಸ್ಟ್ ಮಾಡಿ.",
    transliteration: "Swalpa adjust maadi.",
    english: "Please adjust a little.",
    situation: "Universal Karnataka cooperation",
  },
];

export const PhrasebookView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"phrases" | "survival" | "translator" | "breakdown">("phrases");
  const [savedPhrases, setSavedPhrases] = useState<SavedPhraseRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Natural translator state
  const [translateInput, setTranslateInput] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationResult, setTranslationResult] = useState<NaturalTranslationData | null>(null);

  // Sentence intelligence state
  const [breakdownInput, setBreakdownInput] = useState("ನಾನು ಶಾಲೆಗೆ ಹೋಗುತ್ತಿದ್ದೇನೆ.");
  const [isBreakingDown, setIsBreakingDown] = useState(false);
  const [breakdownResult, setBreakdownResult] = useState<SentenceBreakdownData | null>(null);

  useEffect(() => {
    loadPhrases();
    return () => speechService.stopSpeaking();
  }, []);

  async function loadPhrases() {
    try {
      const data = await api.getSavedPhrases();
      setSavedPhrases(data);
    } catch (e) {
      console.warn("Could not load phrases:", e);
    }
  }

  async function handleTranslate() {
    if (!translateInput.trim() || isTranslating) return;
    setIsTranslating(true);
    try {
      const res = await api.translateNatural(translateInput.trim());
      setTranslationResult(res);
      speechService.speakKannada(res.kannada_script, undefined, 0.85);
    } catch (e) {
      console.error("Translation error:", e);
    } finally {
      setIsTranslating(false);
    }
  }

  async function handleBreakdown() {
    if (!breakdownInput.trim() || isBreakingDown) return;
    setIsBreakingDown(true);
    try {
      const res = await api.breakdownSentence(breakdownInput.trim());
      setBreakdownResult(res);
    } catch (e) {
      console.error("Breakdown error:", e);
    } finally {
      setIsBreakingDown(false);
    }
  }

  const filteredPhrases = savedPhrases.filter(
    (p) =>
      p.kannada_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.english_meaning.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.transliteration.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="phrasebook-container">
      {/* Header */}
      <div className="practice-header">
        <div>
          <div className="section-pill">
            <Bookmark size={14} /> COMMUNICATION TOOLKIT
          </div>
          <h1>Kannada Phrasebook & Translator</h1>
          <p className="page-lead">
            Your personal treasury of Kannada expressions, quick-access Survival Mode audio, and contextual translation tools.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="filter-pill-group">
          <button
            className={`filter-pill ${activeTab === "phrases" ? "active" : ""}`}
            onClick={() => setActiveTab("phrases")}
          >
            <Bookmark size={16} /> Saved Phrases ({savedPhrases.length})
          </button>
          <button
            className={`filter-pill ${activeTab === "survival" ? "active" : ""}`}
            onClick={() => setActiveTab("survival")}
          >
            <LifeBuoy size={16} /> Survival Mode
          </button>
          <button
            className={`filter-pill ${activeTab === "translator" ? "active" : ""}`}
            onClick={() => setActiveTab("translator")}
          >
            <Languages size={16} /> Natural Translator
          </button>
          <button
            className={`filter-pill ${activeTab === "breakdown" ? "active" : ""}`}
            onClick={() => setActiveTab("breakdown")}
          >
            <Layers size={16} /> Sentence Intel
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: SAVED PHRASES                                     */}
      {/* ======================================================== */}
      {activeTab === "phrases" && (
        <div className="saved-phrases-view">
          <div className="phrase-search-bar">
            <Search size={18} color="#888" />
            <input
              type="text"
              placeholder="Search by Kannada word, transliteration, or English meaning..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="phrases-grid">
            {filteredPhrases.map((phrase, idx) => (
              <div key={phrase.id || idx} className="phrase-card">
                <div className="phrase-card-top">
                  <span className="category-pill">{phrase.category}</span>
                  <span className="status-badge">{phrase.learning_status || "learning"}</span>
                </div>

                <div className="phrase-kannada">{phrase.kannada_text}</div>
                <div className="phrase-translit">{phrase.transliteration}</div>
                <div className="phrase-english">"{phrase.english_meaning}"</div>

                <div className="phrase-card-bottom">
                  <button
                    className="audio-listen-icon-btn"
                    onClick={() => speechService.speakKannada(phrase.kannada_text, undefined, 0.85)}
                    title="Listen"
                  >
                    <Volume2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: SURVIVAL MODE                                     */}
      {/* ======================================================== */}
      {activeTab === "survival" && (
        <div className="survival-mode-view">
          <div className="survival-banner">
            <h3>Essential Emergency & Immediate Survival Phrases</h3>
            <p>Tap the audio button to play clear spoken Kannada for drivers, conductors, shopkeepers, and doctors.</p>
          </div>

          <div className="survival-grid">
            {SURVIVAL_PHRASES.map((item) => (
              <div key={item.id} className="survival-card">
                <div className="survival-situation-tag">{item.situation}</div>
                <div className="surv-kannada">{item.kannada}</div>
                <div className="surv-translit">{item.transliteration}</div>
                <div className="surv-english">"{item.english}"</div>

                <button
                  className="primary-button-small full-width"
                  onClick={() => speechService.speakKannada(item.kannada, undefined, 0.85)}
                >
                  <Volume2 size={18} /> Play Audio Loud
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: NATURAL TRANSLATOR                                */}
      {/* ======================================================== */}
      {activeTab === "translator" && (
        <div className="translator-view">
          <div className="translator-box">
            <h3>Translate English into Authentic Conversational Kannada</h3>
            <p>Unlike robotic translators, MAATHU provides native colloquial phrasing used in daily Karnataka life.</p>

            <div className="translator-input-row">
              <input
                type="text"
                placeholder="e.g. Can you please tell me which bus goes to Electronic City?"
                value={translateInput}
                onChange={(e) => setTranslateInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleTranslate()}
              />
              <button
                className="primary-button"
                onClick={handleTranslate}
                disabled={!translateInput.trim() || isTranslating}
              >
                {isTranslating ? "Translating..." : "Translate"}
              </button>
            </div>

            {translationResult && (
              <div className="translation-result-card">
                <div className="main-translation-box">
                  <div className="res-kannada">{translationResult.kannada_script}</div>
                  <div className="res-translit">{translationResult.transliteration}</div>
                  <div className="res-english">"{translationResult.english_meaning}"</div>

                  <button
                    className="primary-button-small"
                    onClick={() => speechService.speakKannada(translationResult.kannada_script, undefined, 0.85)}
                  >
                    <Volume2 size={16} /> Listen to Translation
                  </button>
                </div>

                <div className="formality-versions-grid">
                  <div className="version-col">
                    <strong>Formal / Polite (For elders & officials):</strong>
                    <p>{translationResult.formal_version}</p>
                  </div>
                  <div className="version-col">
                    <strong>Informal / Colloquial (For peers, autos, street):</strong>
                    <p>{translationResult.informal_version}</p>
                  </div>
                </div>

                <div className="usage-context-box">
                  <strong>Usage Note:</strong> {translationResult.usage_context}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: SENTENCE INTELLIGENCE                             */}
      {/* ======================================================== */}
      {activeTab === "breakdown" && (
        <div className="sentence-intel-view">
          <div className="translator-box">
            <h3>Sentence Intelligence: Anatomy of a Kannada Sentence</h3>
            <p>Deconstruct any Kannada sentence to understand how subjects, case suffixes, and verb endings work together.</p>

            <div className="translator-input-row">
              <input
                type="text"
                placeholder="Enter any Kannada sentence..."
                value={breakdownInput}
                onChange={(e) => setBreakdownInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleBreakdown()}
              />
              <button
                className="primary-button"
                onClick={handleBreakdown}
                disabled={!breakdownInput.trim() || isBreakingDown}
              >
                {isBreakingDown ? "Analyzing..." : "Analyze Sentence"}
              </button>
            </div>

            {breakdownResult && (
              <div className="breakdown-result-card">
                <div className="sentence-header-box">
                  <div className="big-kannada">{breakdownResult.full_sentence_kannada}</div>
                  <div className="big-translit">{breakdownResult.full_sentence_transliteration}</div>
                  <div className="big-eng">"{breakdownResult.full_sentence_english}"</div>
                </div>

                <div className="words-breakdown-list">
                  <h4>Word-by-Word Grammatical Breakdown:</h4>
                  <div className="words-cards-grid">
                    {breakdownResult.words.map((w, i) => (
                      <div key={i} className="word-intel-card">
                        <div className="word-kannada">{w.kannada_word}</div>
                        <div className="word-translit">{w.transliteration}</div>
                        <div className="word-meaning">"{w.english_meaning}"</div>
                        <div className="word-role-tag">{w.grammatical_role}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grammar-insight-box">
                  <Sparkles size={18} color="#D4A64A" />
                  <div>
                    <strong>Grammar Takeaway:</strong>
                    <p>{breakdownResult.grammar_insight}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
