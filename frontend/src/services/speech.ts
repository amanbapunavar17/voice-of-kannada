export interface SpeechServiceOptions {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (errorMsg: string) => void;
  onResult?: (transcript: string) => void;
}

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

  startListening(options: SpeechServiceOptions): any {
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

    recognition.lang = "kn-IN";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      options.onStart?.();
    };

    recognition.onerror = (event: { error: string }) => {
      const errorMap: Record<string, string> = {
        "not-allowed": "Microphone permission denied. Please allow microphone access in your browser settings.",
        "no-speech": "No Kannada speech detected. Please speak clearly into your microphone.",
        "audio-capture": "No microphone detected. Check your audio input hardware.",
        network: "Network connection error in speech service. Please try again.",
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

  speakKannada(
    text: string,
    callbacks?: {
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (msg: string) => void;
    }
  ): void {
    if (!this.isSynthesisSupported()) {
      callbacks?.onError?.("Speech audio synthesis is not supported in this browser.");
      return;
    }

    const cleanText = text.trim();
    if (!cleanText) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "kn-IN";
    utterance.rate = 0.85;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const kannadaVoice = voices.find(
      (v) => v.lang.toLowerCase() === "kn-in" || v.lang.toLowerCase().startsWith("kn")
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
  },

  stopSpeaking(): void {
    if (this.isSynthesisSupported()) {
      window.speechSynthesis.cancel();
    }
  },
};
