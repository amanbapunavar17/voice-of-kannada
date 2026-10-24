
import { useEffect, useState } from "react";
import {
  AudioLines,
  ArrowRight,
  BookOpen,
  Check,
  Clock3,
  Compass,
  Headphones,
  Languages,
  Mic,
  MessageCircle,
  Search,
  Sparkles,
  Utensils,
  ShoppingBag,
  Volume2,
  Waves,
} from "lucide-react";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";

const scenarios = [
  {
    id: "daily",
    title: "Everyday conversation",
    kannada: "ದೈನಂದಿನ ಸಂಭಾಷಣೆ",
    description: "Greetings, introductions and everyday expressions.",
    icon: MessageCircle,
    color: "peach",
    level: "Beginner",
    duration: "5 min",
  },
  {
    id: "travel",
    title: "Explore Karnataka",
    kannada: "ಕರ್ನಾಟಕ ಪ್ರವಾಸ",
    description: "Ask directions and discover places with confidence.",
    icon: Compass,
    color: "green",
    level: "Beginner",
    duration: "7 min",
  },
  {
    id: "food",
    title: "Order something delicious",
    kannada: "ಊಟ ಆರ್ಡರ್ ಮಾಡುವುದು",
    description: "Talk to restaurant staff and order your favourite food.",
    icon: Utensils,
    color: "yellow",
    level: "Beginner",
    duration: "5 min",
  },
  {
    id: "shopping",
    title: "At the local market",
    kannada: "ಸ್ಥಳೀಯ ಮಾರುಕಟ್ಟೆ",
    description: "Ask prices, understand replies and shop in Kannada.",
    icon: ShoppingBag,
    color: "blue",
    level: "Intermediate",
    duration: "8 min",
  },
];

const phrases = [
  {
    kannada: "ನಮಸ್ಕಾರ",
    transliteration: "Namaskāra",
    meaning: "Hello / Greetings",
  },
  {
    kannada: "ನೀವು ಹೇಗಿದ್ದೀರಿ?",
    transliteration: "Nīvu hēgiddīri?",
    meaning: "How are you?",
  },
  {
    kannada: "ಧನ್ಯವಾದಗಳು",
    transliteration: "Dhanyavādagaḷu",
    meaning: "Thank you",
  },
];

function App() {
  const [apiConnected, setApiConnected] = useState(false);
  const [activeTab, setActiveTab] = useState("Discover");
  const [search, setSearch] = useState("");
  const [selectedScenario, setSelectedScenario] = useState<string | null>(
    "daily",
  );
  const [savedPhrases, setSavedPhrases] = useState<string[]>([]);
  const [showAllPhrases, setShowAllPhrases] = useState(false);

  const [isListening, setIsListening] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [recognizedText, setRecognizedText] = useState("");
  const [practiceReply, setPracticeReply] = useState("");
  const [practiceReplyEnglish, setPracticeReplyEnglish] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechMessage, setSpeechMessage] = useState("");
  const [practiceError, setPracticeError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function checkBackend() {
      try {
        const response = await fetch(`${API_URL}/api/health`);

        if (!response.ok) {
          throw new Error("Backend health check failed");
        }

        const data = await response.json();

        if (!cancelled) {
          setApiConnected(data.status === "ok");
        }
      } catch {
        if (!cancelled) {
          setApiConnected(false);
        }
      }
    }

    checkBackend();

    const interval = window.setInterval(checkBackend, 10000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const filteredScenarios = scenarios.filter((scenario) =>
    `${scenario.title} ${scenario.kannada} ${scenario.description}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  function toggleSaved(phrase: string) {
    setSavedPhrases((previous) =>
      previous.includes(phrase)
        ? previous.filter((item) => item !== phrase)
        : [...previous, phrase],
    );
  }

  async function sendRecognizedText(text: string) {
    setIsSending(true);
    setPracticeError("");
    setPracticeReply("");
    setPracticeReplyEnglish("");
    setSpeechMessage("");
    stopSpeaking();

    try {
      const response = await fetch(`${API_URL}/api/practice`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scenario_id: selectedScenario ?? "daily",
          recognized_text: text,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Practice API returned HTTP ${response.status}.`,
        );
      }

      const data = await response.json();

      setPracticeReply(data.reply_kannada ?? "");
      setPracticeReplyEnglish(data.reply_english ?? "");
    } catch (error) {
      console.error("Practice request failed:", error);
      setPracticeError(
        "Speech was recognized, but the backend could not respond. Check that FastAPI is running and that /api/practice is available.",
      );
    } finally {
      setIsSending(false);
    }
  }

  function stopSpeaking() {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setSpeechMessage("");
  }

  function speakKannada() {
    const text = practiceReply.trim();

    if (!text) {
      setSpeechMessage("There is no Kannada reply to play yet.");
      return;
    }

    if (!("speechSynthesis" in window)) {
      setSpeechMessage(
        "Audio playback is not supported in this browser. Try the latest Google Chrome.",
      );
      return;
    }

    window.speechSynthesis.cancel();
    setIsSpeaking(false);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "kn-IN";
    utterance.rate = 0.85;
    utterance.pitch = 1;

    const voices = window.speechSynthesis.getVoices();
    const kannadaVoice = voices.find(
      (voice) => voice.lang.toLowerCase() === "kn-in",
    );

    if (kannadaVoice) {
      utterance.voice = kannadaVoice;
      setSpeechMessage(`Speaking with ${kannadaVoice.name}.`);
    } else {
      setSpeechMessage(
        "No dedicated Kannada voice was found. Your browser will try its default voice for Kannada.",
      );
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (event) => {
      setIsSpeaking(false);
      if (event.error !== "canceled" && event.error !== "interrupted") {
        setSpeechMessage(
          "Could not play the audio. Check your browser's speech voice settings.",
        );
      }
    };

    window.speechSynthesis.speak(utterance);
  }

  function startVoicePractice() {
    if (isListening || isSending) return;

    stopSpeaking();
    setPracticeError("");
    setRecognizedText("");
    setPracticeReply("");
    setPracticeReplyEnglish("");

    const browserWindow = window as Window & {
      SpeechRecognition?: new () => any;
      webkitSpeechRecognition?: new () => any;
    };

    const SpeechRecognition =
      browserWindow.SpeechRecognition ??
      browserWindow.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setPracticeError(
        "Speech recognition is unavailable in this browser. Try the latest Google Chrome and allow microphone access.",
      );
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "kn-IN";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onerror = (event: { error: string }) => {
      setIsListening(false);

      const messages: Record<string, string> = {
        "not-allowed":
          "Microphone permission was denied. Allow microphone access in your browser settings.",
        "no-speech":
          "No speech was detected. Please try again and speak clearly.",
        "audio-capture":
          "No microphone was found. Check your microphone connection.",
        network:
          "The browser speech service encountered a network error. Please try again.",
        "service-not-allowed":
          "The browser does not allow the speech recognition service.",
      };

      setPracticeError(
        messages[event.error] ??
          `Speech recognition failed (${event.error}). Please try again.`,
      );
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      const text = event.results?.[0]?.[0]?.transcript?.trim();

      if (!text) {
        setPracticeError(
          "No words were recognized. Please try speaking again.",
        );
        return;
      }

      setRecognizedText(text);
      void sendRecognizedText(text);
    };

    try {
      recognition.start();
    } catch (error) {
      console.error("Could not start speech recognition:", error);
      setIsListening(false);
      setPracticeError(
        "Could not start the microphone. Wait a moment and try again.",
      );
    }
  }

  function openPractice(scenarioId: string) {
    setSelectedScenario(scenarioId);
    setPracticeError("");
    setRecognizedText("");
    stopSpeaking();
    setPracticeReply("");
    setPracticeReplyEnglish("");
    setSpeechMessage("");
    setActiveTab("Practice");
  }

  const currentScenario = scenarios.find(
    (item) => item.id === selectedScenario,
  );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(event) => {
            event.preventDefault();
            setActiveTab("Discover");
          }}
        >
          <div className="brand-mark">
            <AudioLines size={23} />
          </div>
          <div>
            <div className="brand-name">ಮಾತು</div>
            <div className="brand-subtitle">VOICE OF KANNADA</div>
          </div>
        </a>

        <div className="sidebar-label">YOUR SPACE</div>

        <nav className="navigation">
          <button
            className={`nav-link ${activeTab === "Discover" ? "active" : ""}`}
            onClick={() => setActiveTab("Discover")}
          >
            <Compass size={19} />
            <span>Discover</span>
          </button>

          <button
            className={`nav-link ${activeTab === "Practice" ? "active" : ""}`}
            onClick={() => setActiveTab("Practice")}
          >
            <Mic size={19} />
            <span>Voice practice</span>
          </button>

          <button
            className={`nav-link ${activeTab === "Phrasebook" ? "active" : ""}`}
            onClick={() => setActiveTab("Phrasebook")}
          >
            <BookOpen size={19} />
            <span>My phrasebook</span>
            {savedPhrases.length > 0 && (
              <span className="nav-count">{savedPhrases.length}</span>
            )}
          </button>
        </nav>

        <div className="sidebar-divider" />

        <div className="sidebar-label">YOUR JOURNEY</div>

        <div className="journey-card">
          <div className="journey-icon">
            <Sparkles size={18} />
          </div>
          <div className="journey-title">Every word counts.</div>
          <p>Little conversations today. Bigger confidence tomorrow.</p>
          <div className="journey-progress">
            <span />
          </div>
          <div className="journey-caption">Your journey starts here</div>
        </div>

        <div className="sidebar-bottom">
          <div className="karnataka-symbol">ಕ</div>
          <div>
            <div className="sidebar-bottom-title">ನಮ್ಮ ಕನ್ನಡ</div>
            <div className="sidebar-bottom-text">Our language, our pride.</div>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            Learn <span>/</span>{" "}
            <strong>
              {activeTab === "Discover" ? "Discover" : activeTab}
            </strong>
          </div>

          <div className="topbar-right">
            <span
              style={{
                fontSize: "11px",
                color: apiConnected ? "#526d51" : "#a65335",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: apiConnected ? "#6b8a58" : "#b85834",
                }}
              />
              {apiConnected ? "API connected" : "API disconnected"}
            </span>

            <span className="language-label">
              <Languages size={16} />
              ಕನ್ನಡ · English
            </span>

            <div className="avatar">ಅ</div>
          </div>
        </header>

        {activeTab === "Discover" && (
          <>
            <section className="hero">
              <div className="hero-content">
                <div className="eyebrow">
                  <span className="eyebrow-dot" />
                  YOUR KANNADA JOURNEY BEGINS
                </div>

                <h1>
                  A new language.
                  <br />
                  <span>A closer connection.</span>
                </h1>

                <p className="hero-description">
                  Learn Kannada the way it is spoken every day. Start with
                  small conversations, discover local expressions, and build
                  the confidence to speak.
                </p>

                <button
                  className="primary-button"
                  onClick={() => openPractice("daily")}
                >
                  <Mic size={18} />
                  Start speaking
                  <ArrowRight size={17} />
                </button>

                <div className="hero-note">
                  <Volume2 size={15} />
                  Listen. Speak. Understand.
                </div>
              </div>

              <div
                className="hero-art"
                aria-label="Kannada language illustration"
              >
                <div className="orbit orbit-one" />
                <div className="orbit orbit-two" />
                <div className="orbit orbit-three" />
                <div className="art-sun" />
                <div className="art-leaf leaf-one" />
                <div className="art-leaf leaf-two" />

                <div className="speech-card speech-top">
                  <span>ನಮಸ್ಕಾರ!</span>
                  <Volume2 size={16} />
                </div>

                <div className="art-letter">ಕ</div>

                <div className="speech-card speech-bottom">
                  <AudioLines size={19} />
                  <div>
                    <span className="wave-label">
                      A LANGUAGE THAT CONNECTS
                    </span>
                    <div className="mini-wave">
                      {Array.from({ length: 19 }, (_, index) => (
                        <span
                          key={index}
                          style={{
                            height: `${8 + ((index * 13 + 7) % 20)}px`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="art-caption">ಸಂಭಾಷಣೆ · Connection</div>
              </div>
            </section>

            <section className="section">
              <div className="section-heading">
                <div>
                  <div className="section-kicker">LEARN THROUGH LIFE</div>
                  <h2>Where would you like to begin?</h2>
                  <p>
                    Real situations. Useful Kannada. One conversation at a
                    time.
                  </p>
                </div>

                <div className="scenario-count">
                  <span>0{scenarios.length}</span> scenarios
                </div>
              </div>

              <div className="search-box">
                <Search size={18} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Find a situation to practise..."
                  aria-label="Search conversation scenarios"
                />
                <span className="search-shortcut">SEARCH</span>
              </div>

              <div className="scenario-grid">
                {filteredScenarios.map((scenario, index) => {
                  const Icon = scenario.icon;

                  return (
                    <button
                      className="scenario-card"
                      key={scenario.id}
                      onClick={() => openPractice(scenario.id)}
                    >
                      <div className="scenario-card-top">
                        <div className={`scenario-icon ${scenario.color}`}>
                          <Icon size={21} />
                        </div>
                        <span className="scenario-number">
                          0{index + 1}
                        </span>
                      </div>

                      <div className="scenario-kannada">
                        {scenario.kannada}
                      </div>

                      <h3>{scenario.title}</h3>
                      <p>{scenario.description}</p>

                      <div className="scenario-footer">
                        <span>{scenario.level}</span>
                        <span className="scenario-duration">
                          <Clock3 size={14} />
                          {scenario.duration}
                        </span>
                        <ArrowRight
                          size={17}
                          className="scenario-arrow"
                        />
                      </div>
                    </button>
                  );
                })}
              </div>

              {filteredScenarios.length === 0 && (
                <div className="empty-state">
                  No scenarios found. Try another search.
                </div>
              )}
            </section>

            <section className="bottom-grid">
              <div className="phrase-panel">
                <div className="panel-heading">
                  <div>
                    <div className="section-kicker">
                      A LITTLE KANNADA, DAILY
                    </div>
                    <h2>Words worth knowing.</h2>
                  </div>

                  <div className="panel-icon">
                    <BookOpen size={19} />
                  </div>
                </div>

                <div className="phrase-list">
                  {phrases.slice(0, 2).map((phrase) => (
                    <div className="phrase-row" key={phrase.kannada}>
                      <div className="phrase-letter">ಅ</div>

                      <div className="phrase-copy">
                        <strong>{phrase.kannada}</strong>
                        <span>
                          {phrase.transliteration} · {phrase.meaning}
                        </span>
                      </div>

                      <button
                        className={`save-button ${
                          savedPhrases.includes(phrase.kannada)
                            ? "saved"
                            : ""
                        }`}
                        aria-label={`Save ${phrase.kannada}`}
                        onClick={() => toggleSaved(phrase.kannada)}
                      >
                        {savedPhrases.includes(phrase.kannada) ? (
                          <Check size={17} />
                        ) : (
                          <BookOpen size={17} />
                        )}
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  className="text-button"
                  onClick={() => setActiveTab("Phrasebook")}
                >
                  Explore your phrasebook <ArrowRight size={15} />
                </button>
              </div>

              <div className="practice-panel">
                <div className="practice-panel-top">
                  <div className="practice-decoration">
                    <Waves size={23} />
                  </div>
                  <span className="live-label">
                    <span /> READY WHEN YOU ARE
                  </span>
                </div>

                <h2>Your voice is the best place to start.</h2>
                <p>
                  No memorising endless lists. Begin with one phrase, say it
                  aloud, and build from there.
                </p>

                <button
                  className="practice-button"
                  onClick={() => openPractice("daily")}
                >
                  Try a conversation <ArrowRight size={16} />
                </button>
              </div>
            </section>
          </>
        )}

        {activeTab === "Practice" && (
          <section className="workspace">
            <button
              className="back-link"
              onClick={() => setActiveTab("Discover")}
            >
              ← Back to Discover
            </button>

            <div className="workspace-heading">
              <div className="section-kicker">YOUR SPEAKING STUDIO</div>
              <h1>Let's have a conversation.</h1>
              <p>
                Choose a real-life situation. Your Kannada journey begins
                with one small step.
              </p>
            </div>

            <div className="practice-workspace">
              <div className="scenario-picker">
                <h2>Choose your situation</h2>

                {scenarios.map((scenario) => {
                  const Icon = scenario.icon;

                  return (
                    <button
                      key={scenario.id}
                      className={`picker-item ${
                        selectedScenario === scenario.id ? "selected" : ""
                      }`}
                      onClick={() => {
                        setSelectedScenario(scenario.id);
                        stopSpeaking();
                        setPracticeError("");
                        setRecognizedText("");
                        setPracticeReply("");
                        setPracticeReplyEnglish("");
                        setSpeechMessage("");
                      }}
                    >
                      <div className={`scenario-icon ${scenario.color}`}>
                        <Icon size={19} />
                      </div>

                      <div className="picker-copy">
                        <strong>{scenario.title}</strong>
                        <span>{scenario.kannada}</span>
                      </div>

                      {selectedScenario === scenario.id && (
                        <Check size={17} />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="conversation-area">
                <div className="conversation-status">
                  <span className="status-dot" /> PRACTICE SESSION
                </div>

                <div className="conversation-welcome">
                  <div className="welcome-icon">
                    <Headphones size={28} />
                  </div>
                  <h2>ನಮಸ್ಕಾರ!</h2>
                  <p>Namaskāra! Hello, and welcome.</p>
                  <div className="conversation-hint">
                    Select a situation, then get ready to practise speaking
                    Kannada.
                  </div>
                </div>

                <div className="conversation-prompt">
                  <span>YOUR SELECTED SITUATION</span>
                  <strong>
                    {currentScenario?.title ?? "Everyday conversation"}
                  </strong>
                  <p>
                    {currentScenario?.description ??
                      "Start with greetings and everyday expressions."}
                  </p>
                </div>

                <button
                  className="mic-button"
                  onClick={startVoicePractice}
                  disabled={isListening || isSending}
                >
                  <Mic size={23} />
                  {isListening
                    ? "Listening... Speak Kannada"
                    : isSending
                      ? "Getting response..."
                      : "Start voice practice"}
                </button>

                <p className="microphone-note">
                  <Volume2 size={14} />
                  {isListening
                    ? "Listening to your Kannada speech..."
                    : isSending
                      ? "Sending your recognized words to the backend..."
                      : "Allow microphone access when your browser asks."}
                </p>

                {practiceError && (
                  <div
                    className="empty-state"
                    role="alert"
                    style={{ marginTop: "16px" }}
                  >
                    {practiceError}
                  </div>
                )}

                {recognizedText && (
                  <div
                    className="conversation-prompt"
                    style={{ marginTop: "20px" }}
                  >
                    <span>YOU SAID</span>
                    <strong>{recognizedText}</strong>
                  </div>
                )}

                {practiceReply && (
                  <div
                    className="conversation-prompt"
                    style={{ marginTop: "12px" }}
                  >
                    <span>KANNADA RESPONSE</span>
                    <strong style={{ display: "block", whiteSpace: "pre-line" }}>
                      {practiceReply}
                    </strong>

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        gap: "10px",
                        marginTop: "16px",
                      }}
                    >
                      <button
                        type="button"
                        className="practice-button"
                        onClick={speakKannada}
                        disabled={isSpeaking}
                      >
                        <Volume2 size={17} />
                        {isSpeaking ? "Speaking Kannada..." : "Listen to Kannada"}
                      </button>

                      {isSpeaking && (
                        <button
                          type="button"
                          className="text-button"
                          onClick={stopSpeaking}
                        >
                          Stop audio
                        </button>
                      )}
                    </div>

                    {speechMessage && (
                      <p role="status" style={{ marginTop: "10px" }}>
                        {speechMessage}
                      </p>
                    )}

                    {practiceReplyEnglish && (
                      <div style={{ marginTop: "18px" }}>
                        <span>ENGLISH MEANING</span>
                        <p>{practiceReplyEnglish}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {activeTab === "Phrasebook" && (
          <section className="workspace phrasebook-workspace">
            <div className="workspace-heading">
              <div className="section-kicker">
                WORDS THAT BRING US CLOSER
              </div>
              <h1>Your Kannada phrasebook.</h1>
              <p>
                Keep useful expressions close and revisit them whenever you
                practise.
              </p>
            </div>

            <div className="phrasebook-summary">
              <BookOpen size={22} />
              <div>
                <strong>{savedPhrases.length} saved phrases</strong>
                <span>
                  Your personal collection of Kannada expressions.
                </span>
              </div>
            </div>

            <div className="phrasebook-list">
              {phrases
                .filter(
                  (phrase) =>
                    showAllPhrases ||
                    savedPhrases.includes(phrase.kannada),
                )
                .map((phrase) => (
                  <div className="phrasebook-item" key={phrase.kannada}>
                    <div>
                      <strong className="phrasebook-kannada">
                        {phrase.kannada}
                      </strong>
                      <div className="phrasebook-transliteration">
                        {phrase.transliteration}
                      </div>
                      <div className="phrasebook-meaning">
                        {phrase.meaning}
                      </div>
                    </div>

                    <button
                      className={`save-button ${
                        savedPhrases.includes(phrase.kannada)
                          ? "saved"
                          : ""
                      }`}
                      aria-label={`Save ${phrase.kannada}`}
                      onClick={() => toggleSaved(phrase.kannada)}
                    >
                      {savedPhrases.includes(phrase.kannada) ? (
                        <Check size={17} />
                      ) : (
                        <BookOpen size={17} />
                      )}
                    </button>
                  </div>
                ))}
            </div>

            {savedPhrases.length === 0 && !showAllPhrases && (
              <div className="empty-state">
                You haven't saved any phrases yet. Explore all phrases to
                start building your collection.
              </div>
            )}

            <button
              className="primary-button"
              onClick={() =>
                setShowAllPhrases((previous) => !previous)
              }
            >
              {showAllPhrases ? "Show saved phrases" : "Explore all phrases"}
              <ArrowRight size={17} />
            </button>
          </section>
        )}

        <footer className="footer">
          <div>
            <span className="footer-mark">ಕ</span>
            Made with care for Kannada.
          </div>
          <span>ಮಾತು · Voice of Kannada</span>
        </footer>
      </main>
    </div>
  );
}

export default App;
