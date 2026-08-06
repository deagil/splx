"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: { transcript: string };
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike> & {
    length: number;
  };
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

const FATAL_ERRORS = new Set([
  "not-allowed",
  "service-not-allowed",
  "audio-capture",
  "network",
  "bad-grammar",
  "language-not-supported",
]);

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") {
    return null;
  }

  const win = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
}

export function isSpeechDictationSupported() {
  return getSpeechRecognitionConstructor() !== null;
}

function appendTranscript(base: string, chunk: string) {
  if (!chunk) {
    return base;
  }
  const needsSpace = base.length > 0 && !/\s$/.test(base) && !/^\s/.test(chunk);
  return `${base}${needsSpace ? " " : ""}${chunk}`;
}

function messageForError(code: string) {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone permission was denied.";
    case "audio-capture":
      return "No microphone available.";
    case "network":
      return "Dictation needs network access (Chrome uses a cloud speech service). Try Chrome or Safari outside an embedded preview.";
    case "language-not-supported":
      return "This language is not supported for dictation.";
    default:
      return `Dictation error: ${code}`;
  }
}

export type UseSpeechDictationOptions = {
  /** Called with the full draft text as recognition updates. */
  onTranscript: (value: string) => void;
  /** Base text already in the composer when dictation starts. */
  getBaseText: () => string;
  lang?: string;
  disabled?: boolean;
};

export function useSpeechDictation({
  onTranscript,
  getBaseText,
  lang,
  disabled = false,
}: UseSpeechDictationOptions) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const baseTextRef = useRef("");
  const wantListeningRef = useRef(false);
  const ignoreEndRef = useRef(false);
  const fatalErrorRef = useRef(false);
  const gotResultRef = useRef(false);
  const startedAtRef = useRef(0);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  const getBaseTextRef = useRef(getBaseText);
  const langRef = useRef(lang);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    getBaseTextRef.current = getBaseText;
  }, [getBaseText]);

  useEffect(() => {
    langRef.current = lang;
  }, [lang]);

  useEffect(() => {
    setSupported(isSpeechDictationSupported());
  }, []);

  const clearRestartTimer = useCallback(() => {
    if (restartTimerRef.current !== null) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }, []);

  const finish = useCallback(
    (message?: string) => {
      wantListeningRef.current = false;
      clearRestartTimer();
      setListening(false);
      if (message) {
        setError(message);
      }
    },
    [clearRestartTimer]
  );

  const scheduleRestart = useCallback(() => {
    clearRestartTimer();
    restartTimerRef.current = setTimeout(() => {
      restartTimerRef.current = null;
      if (!wantListeningRef.current || fatalErrorRef.current) {
        setListening(false);
        return;
      }

      const recognition = recognitionRef.current;
      if (!recognition) {
        finish("Dictation is not available.");
        return;
      }

      try {
        recognition.start();
      } catch {
        restartTimerRef.current = setTimeout(() => {
          restartTimerRef.current = null;
          if (!wantListeningRef.current || !recognitionRef.current) {
            setListening(false);
            return;
          }
          try {
            recognitionRef.current.start();
          } catch {
            finish("Could not continue dictation.");
          }
        }, 250);
      }
    }, 150);
  }, [clearRestartTimer, finish]);

  const ensureRecognition = useCallback(() => {
    if (recognitionRef.current) {
      return recognitionRef.current;
    }

    const SpeechRecognitionCtor = getSpeechRecognitionConstructor();
    if (!SpeechRecognitionCtor) {
      return null;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang =
      langRef.current ??
      (typeof navigator === "undefined" ? "en-US" : navigator.language);

    recognition.onstart = () => {
      if (!wantListeningRef.current) {
        return;
      }
      startedAtRef.current = Date.now();
      setListening(true);
    };

    recognition.onresult = (event) => {
      if (!wantListeningRef.current) {
        return;
      }
      gotResultRef.current = true;

      let finalChunk = "";
      let interimChunk = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result) {
          continue;
        }
        const transcript = result[0]?.transcript ?? "";
        if (result.isFinal) {
          finalChunk += transcript;
        } else {
          interimChunk += transcript;
        }
      }

      if (finalChunk) {
        baseTextRef.current = appendTranscript(baseTextRef.current, finalChunk);
      }

      onTranscriptRef.current(
        appendTranscript(baseTextRef.current, interimChunk)
      );
    };

    recognition.onerror = (event) => {
      if (event.error === "no-speech" || event.error === "aborted") {
        return;
      }

      if (FATAL_ERRORS.has(event.error)) {
        fatalErrorRef.current = true;
        ignoreEndRef.current = true;
        finish(messageForError(event.error));
        return;
      }

      setError(messageForError(event.error));
    };

    recognition.onend = () => {
      if (ignoreEndRef.current) {
        ignoreEndRef.current = false;
        return;
      }

      if (!wantListeningRef.current || fatalErrorRef.current) {
        setListening(false);
        return;
      }

      const elapsed = Date.now() - startedAtRef.current;
      // Permission dialog / unsupported webview often ends within ~300ms
      // without any transcript. Surface that instead of silently flickering.
      if (!gotResultRef.current && elapsed < 400) {
        finish(
          "Dictation stopped immediately. Use Chrome or Safari (not an embedded preview), and ensure the page is on https:// or localhost."
        );
        return;
      }

      scheduleRestart();
    };

    recognitionRef.current = recognition;
    return recognition;
  }, [finish, scheduleRestart]);

  const stop = useCallback(() => {
    ignoreEndRef.current = true;
    fatalErrorRef.current = false;
    finish();

    const recognition = recognitionRef.current;
    if (!recognition) {
      return;
    }
    try {
      recognition.stop();
    } catch {
      // Already stopped.
    }
  }, [finish]);

  const start = useCallback(() => {
    if (disabled || wantListeningRef.current) {
      return;
    }

    const recognition = ensureRecognition();
    if (!recognition) {
      setError("Dictation is not supported in this browser.");
      return;
    }

    // Keep lang in sync if it changed after first create.
    recognition.lang =
      langRef.current ??
      (typeof navigator === "undefined" ? "en-US" : navigator.language);

    setError(null);
    fatalErrorRef.current = false;
    gotResultRef.current = false;
    ignoreEndRef.current = false;
    baseTextRef.current = getBaseTextRef.current();
    wantListeningRef.current = true;
    startedAtRef.current = Date.now();
    setListening(true);

    // Must run in the same turn as the click (user activation).
    try {
      recognition.start();
    } catch {
      // A previous session may still be settling — stop then restart.
      try {
        ignoreEndRef.current = true;
        recognition.stop();
      } catch {
        // Ignore.
      }
      scheduleRestart();
    }
  }, [disabled, ensureRecognition, scheduleRestart]);

  const toggle = useCallback(() => {
    if (wantListeningRef.current || listening) {
      stop();
      return;
    }
    start();
  }, [listening, start, stop]);

  useEffect(() => {
    if (disabled && wantListeningRef.current) {
      stop();
    }
  }, [disabled, stop]);

  useEffect(
    () => () => {
      wantListeningRef.current = false;
      clearRestartTimer();
      const recognition = recognitionRef.current;
      recognitionRef.current = null;
      if (!recognition) {
        return;
      }
      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        recognition.abort();
      } catch {
        // Ignore.
      }
    },
    [clearRestartTimer]
  );

  return {
    error,
    listening,
    start,
    stop,
    supported,
    toggle,
  };
}
