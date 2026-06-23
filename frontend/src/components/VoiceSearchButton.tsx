import { useState, useEffect, useRef } from "react";
import { Mic, MicOff } from "lucide-react";

interface VoiceSearchButtonProps {
  onTranscript: (text: string) => void;
  className?: string;
  candidates?: string[];
}

export function VoiceSearchButton({ onTranscript, className = "", candidates = [] }: VoiceSearchButtonProps) {
  const [status, setStatus] = useState<"idle" | "requesting" | "listening">("idle");
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const wasSuccessRef = useRef<boolean>(false);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSupported(true);
    }
  }, []);

  // Cleanup: Abort any active speech capture streams on unmount to release browser microphone
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // ignore
        }
      }
    };
  }, []);

  if (!supported) return null;

  const toggleListening = () => {
    // If already requesting or recording, stop and cancel the active session
    if (status === "requesting" || status === "listening") {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // ignore
        }
      }
      playChime("cancel");
      setStatus("idle");
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    wasSuccessRef.current = false;

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-IN";

    recognition.onstart = () => {
      setStatus("listening");
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript) {
        wasSuccessRef.current = true;
        playChime("success");
        if (candidates && candidates.length > 0) {
          const matchResult = findBestMatch(transcript, candidates);
          if (matchResult) {
            onTranscript(matchResult.bestMatch);
            return;
          }
        }
        onTranscript(transcript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setStatus("idle");
      recognitionRef.current = null;
      if (!wasSuccessRef.current) {
        playChime("cancel");
      }
      if (event.error === "not-allowed") {
        alert("Microphone permission was denied. Please allow microphone access in your browser settings to use voice search.");
      }
    };

    recognition.onend = () => {
      setStatus("idle");
      recognitionRef.current = null;
      if (!wasSuccessRef.current) {
        playChime("cancel");
      }
    };

    try {
      setStatus("requesting");
      playChime("start");
      recognition.start();
    } catch (err) {
      console.error("Failed to start speech recognition", err);
      setStatus("idle");
      recognitionRef.current = null;
    }
  };

  const isListening = status === "listening" || status === "requesting";

  return (
    <>
      <button
        type="button"
        onClick={toggleListening}
        className={[
          "flex h-9 w-9 items-center justify-center rounded-lg transition-all",
          isListening
            ? "bg-danger text-white animate-pulse"
            : "bg-surface hover:bg-surface-sunken border border-border text-ink-soft hover:text-ink active:scale-95",
          className,
        ].join(" ")}
        title={isListening ? "Stop listening" : "Voice search"}
        aria-label={isListening ? "Stop listening" : "Voice search"}
      >
        {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      </button>

      {isListening && (
        <div
          className="fixed bottom-6 left-1/2 z-[9999] rounded-full bg-ink/95 px-6 py-3 shadow-card-lg backdrop-blur flex items-center gap-3 text-white border border-white/10"
          style={{
            animation: "fadeInVoiceSearch 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards",
            opacity: 0,
          }}
        >
          <style>{`
            @keyframes fadeInVoiceSearch {
              from { opacity: 0; transform: translate(-50%, 15px); }
              to { opacity: 1; transform: translate(-50%, 0); }
            }
          `}</style>
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </div>
          <span className="text-sm font-semibold tracking-wide">
            {status === "listening" ? "Listening..." : "Initializing microphone..."}
          </span>
        </div>
      )}
    </>
  );
}

/**
 * Programmatically generates double-rising start tones, success triad chimes,
 * and descending cancel beeps using Web Audio API oscillators.
 */
function playChime(type: "start" | "success" | "cancel") {
  try {
    const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === "start") {
      // Soft double rising beep
      playBeep(ctx, 440, 0.08, 0);
      playBeep(ctx, 554.37, 0.08, 0.08);
    } else if (type === "success") {
      // Soft high success chime
      playBeep(ctx, 523.25, 0.06, 0);
      playBeep(ctx, 659.25, 0.06, 0.06);
      playBeep(ctx, 783.99, 0.12, 0.12);
    } else if (type === "cancel") {
      // Soft descending cancel tone
      playBeep(ctx, 349.23, 0.1, 0);
      playBeep(ctx, 293.66, 0.15, 0.08);
    }
  } catch (e) {
    // Ignore audio context autoplay browser blocks
  }
}

function playBeep(ctx: AudioContext, frequency: number, duration: number, delay: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(frequency, ctx.currentTime + delay);

  gain.gain.setValueAtTime(0, ctx.currentTime + delay);
  gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + delay + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(ctx.currentTime + delay);
  osc.stop(ctx.currentTime + delay + duration);
}

/**
 * Normalizes common pronunciations, specifically addressing Indian English speech patterns:
 * - V/W equivalence (V/W merger).
 * - S/SH equivalence.
 * - Z/S equivalence (e.g. zinnia / xenia / sinia).
 * - Double consonant deduplication (e.g. nn -> n, ll -> l).
 * - Start letter replacements (e.g. initial 'x' starts with 'z').
 * - Vowel deletion to form consonant-based phonetic key.
 */
function getPhoneticCode(word: string): string {
  let w = word.toLowerCase().trim();
  if (!w) return "";

  // 1. Map initial letters
  // 'x' at start is pronounced 'z' (e.g. xenia -> zenia)
  if (w.startsWith("x")) {
    w = "z" + w.substring(1);
  }

  // 2. Simplify consonant clusters & replacements
  w = w
    .replace(/ph/g, "f")
    .replace(/gh/g, "g")
    .replace(/kh/g, "k")
    .replace(/sh/g, "s")   // Merge sh and s
    .replace(/w/g, "v")    // Merge w and v (Indian V/W merger)
    .replace(/c/g, "k")    // Treat c as k (simple approximation)
    .replace(/q/g, "k")
    .replace(/z/g, "s")    // Merge z and s
    .replace(/y/g, "i");   // Merge y and i

  // 3. Remove double letters (e.g. nn -> n, ll -> l)
  let simplified = "";
  for (let i = 0; i < w.length; i++) {
    if (i === 0 || w[i] !== w[i - 1]) {
      simplified += w[i];
    }
  }
  w = simplified;

  // 4. Drop vowels (a, e, i, o, u) after first letter to form phonetic key
  if (w.length <= 1) return w;
  const first = w[0];
  const rest = w.substring(1).replace(/[aeiou]/g, "");
  return first + rest;
}

/**
 * Calculates a match score based on Jaccard similarity of word-based phonetic codes.
 */
function getPhoneticMatchScore(str1: string, str2: string): number {
  const words1 = str1.toLowerCase().split(/\s+/).map(getPhoneticCode).filter(Boolean);
  const words2 = str2.toLowerCase().split(/\s+/).map(getPhoneticCode).filter(Boolean);

  if (words1.length === 0 || words2.length === 0) return 0;

  const set1 = new Set(words1);
  const set2 = new Set(words2);
  let intersection = 0;
  for (const w of set1) {
    if (set2.has(w)) intersection++;
  }
  const union = set1.size + set2.size - intersection;
  return union > 0 ? intersection / union : 0;
}

/**
 * Normalizes two strings and returns a similarity score from 0.0 to 1.0.
 * Utilizes exact matching, substring inclusions, word Jaccard overlaps,
 * phonetic Jaccard codes, and Levenshtein edit distance logic.
 */
function findBestMatch(transcript: string, candidates: string[]): { bestMatch: string; score: number } | null {
  if (candidates.length === 0) return null;

  const cleanText = transcript.toLowerCase().trim();
  let bestCandidate = "";
  let highestScore = -1;

  for (const candidate of candidates) {
    const cleanCand = candidate.toLowerCase().trim();

    // 1. Exact match
    if (cleanText === cleanCand) {
      return { bestMatch: candidate, score: 1.0 };
    }

    // 2. Substring matches
    if (cleanCand.includes(cleanText) || cleanText.includes(cleanCand)) {
      const score =
        0.8 +
        0.15 * (Math.min(cleanText.length, cleanCand.length) / Math.max(cleanText.length, cleanCand.length));
      if (score > highestScore) {
        highestScore = score;
        bestCandidate = candidate;
      }
      continue;
    }

    // 3. Word Jaccard similarity
    const wordsText = new Set(cleanText.split(/\s+/));
    const wordsCand = new Set(cleanCand.split(/\s+/));
    let intersection = 0;
    for (const w of wordsText) {
      if (wordsCand.has(w)) intersection++;
    }
    const union = wordsText.size + wordsCand.size - intersection;
    const wordScore = union > 0 ? (intersection / union) * 0.9 : 0;

    if (wordScore > highestScore && wordScore > 0.2) {
      highestScore = wordScore;
      bestCandidate = candidate;
      continue;
    }

    // 4. Phonetic matching score
    const phoneticScore = getPhoneticMatchScore(cleanText, cleanCand) * 0.95;
    if (phoneticScore > highestScore && phoneticScore > 0.2) {
      highestScore = phoneticScore;
      bestCandidate = candidate;
      continue;
    }

    // 5. Levenshtein edit distance similarity
    const distance = levenshteinDistance(cleanText, cleanCand);
    const maxLen = Math.max(cleanText.length, cleanCand.length);
    const levScore = maxLen > 0 ? (1 - distance / maxLen) * 0.85 : 0;

    if (levScore > highestScore && levScore > 0.2) {
      highestScore = levScore;
      bestCandidate = candidate;
    }
  }

  // Only return if the matching strength is above a confident threshold
  if (highestScore > 0.2) {
    return { bestMatch: bestCandidate, score: highestScore };
  }

  return null;
}

function levenshteinDistance(a: string, b: string): number {
  const an = a.length;
  const bn = b.length;
  if (an === 0) return bn;
  if (bn === 0) return an;
  const matrix = Array.from({ length: an + 1 }, (_, i) => [i]);
  for (let j = 0; j <= bn; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= an; i++) {
    for (let j = 1; j <= bn; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  return matrix[an][bn];
}
