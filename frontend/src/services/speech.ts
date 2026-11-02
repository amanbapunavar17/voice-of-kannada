export interface SpeechServiceOptions {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (errorMsg: string) => void;
  onResult?: (transcript: string) => void;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

let activeAudio: HTMLAudioElement | null = null;
let activeMediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];

export const speechService = {
  isRecognitionSupported(): boolean {
    if (typeof window === "undefined") return false;
    const browserWindow = window as Window & {
      SpeechRecognition?: any;
      webkitSpeechRecognition?: any;
    };
    return Boolean(browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition);
  },

  isSynthesisSupported(): boolean {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  },

  /**
   * Resilient speech recognition with automatic dialect/network fallback
   */
  startListening(options: SpeechServiceOptions, retryCount: number = 0): any {
    if (!this.isRecognitionSupported()) {
      options.onError?.(
        "Speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge and ensure microphone permissions are granted."
      );
      return null;
    }

    const browserWindow = window as Window & {
      SpeechRecognition?: any;
      webkitSpeechRecognition?: any;
    };
    const SpeechRecognition = browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    // On network failure or retry, try Indian English (which recognizes Kanglish / transliterated speech)
    recognition.lang = retryCount > 0 ? "en-IN" : "kn-IN";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      options.onStart?.();
    };

    recognition.onerror = (event: { error: string }) => {
      // If network error occurred and we haven't retried yet, auto-retry once with en-IN (Kanglish)
      if (event.error === "network" && retryCount === 0) {
        console.warn("Speech recognition network error on kn-IN. Falling back to en-IN (Kanglish)...");
        try {
          recognition.abort();
        } catch {}
        setTimeout(() => {
          this.startListening(options, 1);
        }, 200);
        return;
      }

      const errorMap: Record<string, string> = {
        "not-allowed": "Microphone permission denied. Please allow microphone access in your browser settings.",
        "no-speech": "No speech detected. Please speak clearly into your microphone.",
        "audio-capture": "No microphone detected. Check your audio input hardware.",
        network: "Web Speech network is temporarily unreachable. You can also type or use the voice recording button.",
        "service-not-allowed": "Speech recognition service is disabled or blocked.",
      };

      options.onError?.(errorMap[event.error] || `Speech recognition error: ${event.error}`);
    };

    recognition.onend = () => {
      options.onEnd?.();
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim();
      if (transcript) {
        options.onResult?.(transcript);
      } else {
        options.onError?.("No speech was recognized. Please speak again.");
      }
    };

    try {
      recognition.start();
      return recognition;
    } catch (e) {
      console.error("Speech recognition start failed:", e);
      options.onError?.("Could not start microphone. Please try again.");
      return null;
    }
  },

  /**
   * High-fidelity Native Kannada Audio Output.
   * Priority:
   * 1. Backend /api/tts streaming (native Google Kannada audio, eliminates OS voice pack requirements)
   * 2. Direct Google TTS audio stream
   * 3. Browser SpeechSynthesis fallback
   */
  speakKannada(
    text: string,
    callbacks?: {
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (msg: string) => void;
    },
    rate: number = 0.85
  ): void {
    const cleanText = text.trim();
    if (!cleanText) return;

    this.stopSpeaking();

    // Extract first 240 chars for clean sentence playback
    const snippet = cleanText.length > 250 ? cleanText.substring(0, 250) : cleanText;
    const backendTtsUrl = `${API_BASE_URL}/api/tts?text=${encodeURIComponent(snippet)}&lang=kn`;

    const audio = new Audio(backendTtsUrl);
    activeAudio = audio;

    audio.onplay = () => {
      callbacks?.onStart?.();
    };

    audio.onended = () => {
      activeAudio = null;
      callbacks?.onEnd?.();
    };

    audio.onerror = () => {
      // Fallback 1: Direct Google Translate TTS endpoint
      const directGoogleUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=kn&client=tw-ob&q=${encodeURIComponent(snippet)}`;
      const fallbackAudio = new Audio(directGoogleUrl);
      activeAudio = fallbackAudio;

      fallbackAudio.onplay = () => {
        callbacks?.onStart?.();
      };
      fallbackAudio.onended = () => {
        activeAudio = null;
        callbacks?.onEnd?.();
      };
      fallbackAudio.onerror = () => {
        // Fallback 2: Browser SpeechSynthesis
        this.speakViaSpeechSynthesis(cleanText, callbacks, rate);
      };

      fallbackAudio.play().catch(() => {
        this.speakViaSpeechSynthesis(cleanText, callbacks, rate);
      });
    };

    audio.play().catch((err) => {
      console.warn("Native TTS audio playback deferred or blocked, trying fallback:", err);
      // Try direct Google or speech synthesis
      const directGoogleUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=kn&client=tw-ob&q=${encodeURIComponent(snippet)}`;
      const fallbackAudio = new Audio(directGoogleUrl);
      activeAudio = fallbackAudio;
      fallbackAudio.play().catch(() => {
        this.speakViaSpeechSynthesis(cleanText, callbacks, rate);
      });
    });
  },

  /**
   * Browser SpeechSynthesis fallback with Indian language matching
   */
  speakViaSpeechSynthesis(
    text: string,
    callbacks?: {
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (msg: string) => void;
    },
    rate: number = 0.85
  ) {
    if (!this.isSynthesisSupported()) {
      callbacks?.onError?.("Speech audio synthesis is not supported in this browser.");
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "kn-IN";
      utterance.rate = rate;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const kannadaVoice =
        voices.find(
          (v) => v.lang.toLowerCase() === "kn-in" || v.lang.toLowerCase().startsWith("kn")
        ) ||
        voices.find(
          (v) => v.lang.toLowerCase().startsWith("hi") || v.lang.toLowerCase().startsWith("en-in")
        );

      if (kannadaVoice) {
        utterance.voice = kannadaVoice;
      }

      utterance.onstart = () => callbacks?.onStart?.();
      utterance.onend = () => callbacks?.onEnd?.();
      utterance.onerror = (e) => {
        if (e.error !== "canceled" && e.error !== "interrupted") {
          callbacks?.onError?.("Could not play audio. Check your audio output.");
        }
        callbacks?.onEnd?.();
      };

      window.speechSynthesis.speak(utterance);
    } catch (e: any) {
      console.error("SpeechSynthesis error:", e);
      callbacks?.onError?.("Speech playback could not be started.");
    }
  },

  stopSpeaking(): void {
    if (activeAudio) {
      activeAudio.pause();
      activeAudio.currentTime = 0;
      activeAudio = null;
    }
    if (this.isSynthesisSupported()) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
  },

  /**
   * MediaRecorder helper: Records raw audio from the user's microphone
   * for backend Gemini audio transcription (bypasses browser Web Speech network limitations)
   */
  async startAudioRecording(onRecorded: (blob: Blob) => void): Promise<() => void> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Microphone recording is not supported in this browser.");
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks = [];
    activeMediaRecorder = new MediaRecorder(stream);

    activeMediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    activeMediaRecorder.onstop = () => {
      const mimeType = activeMediaRecorder?.mimeType || "audio/webm";
      const audioBlob = new Blob(audioChunks, { type: mimeType });
      // Stop all tracks to release the hardware mic
      stream.getTracks().forEach((track) => track.stop());
      activeMediaRecorder = null;
      onRecorded(audioBlob);
    };

    activeMediaRecorder.start();

    // Return stop function
    return () => {
      if (activeMediaRecorder && activeMediaRecorder.state !== "inactive") {
        activeMediaRecorder.stop();
      }
    };
  },
};
