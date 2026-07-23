import type {
  WordleLanguage,
  WordleMark,
  WordleVariant,
} from "@/types/gameTypes";
import { WORDLE_WORDS } from "./words";

export const WORDLE_WORD_LENGTH = 5;
export const WORDLE_MAX_GUESSES = 6;

// Symbol-Vorrat für die Symbol-/Cryptic-Varianten. Bei "cryptic" werden hieraus
// zufällig drei gezogen und den Bewertungen verdeckt zugeordnet.
const CRYPTIC_SYMBOLS = ["◆", "▲", "●", "■", "★", "✦", "◼", "⬟"];

// Feste, intuitive Zuordnung für die Variante "symbols" (mit Legende):
// gefülltes Zeichen = richtig, Dreieck = enthalten, Punkt = fehlt.
const SYMBOLS_FIXED: Record<WordleMark, string> = {
  correct: "◆",
  present: "▲",
  absent: "·",
};

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Zieht ein zufälliges Wort der gewählten Sprache. `exclude` verhindert, dass
// beim "neues Wort" direkt dasselbe Wort noch einmal kommt.
export function pickSolution(
  language: WordleLanguage,
  exclude?: string,
): string {
  const pool = WORDLE_WORDS[language];
  const candidates =
    exclude && pool.length > 1
      ? pool.filter((word) => word !== exclude)
      : pool;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// Baut die Symbol-Zuordnung für eine Variante. Bei "cryptic" ist sie zufällig
// gemischt (Bedeutung verdeckt), sonst fest bzw. für "classic" irrelevant.
export function buildSymbolMap(
  variant: WordleVariant,
): Record<WordleMark, string> {
  if (variant === "cryptic") {
    const symbols = shuffle(CRYPTIC_SYMBOLS).slice(0, 3);
    const marks = shuffle<WordleMark>(["correct", "present", "absent"]);
    return {
      [marks[0]]: symbols[0],
      [marks[1]]: symbols[1],
      [marks[2]]: symbols[2],
    } as Record<WordleMark, string>;
  }
  return { ...SYMBOLS_FIXED };
}

// Bewertet einen Rateversuch gegen das Lösungswort - Standard-Wordle-Logik
// inklusive korrekter Behandlung mehrfach vorkommender Buchstaben: zuerst alle
// exakten Treffer zählen, dann die restlichen "enthalten"-Treffer aus dem noch
// verfügbaren Buchstaben-Vorrat vergeben.
export function evaluateGuess(guess: string, solution: string): WordleMark[] {
  const result: WordleMark[] = Array.from({ length: guess.length }, () => "absent");
  const remaining: Record<string, number> = {};

  for (const char of solution) {
    remaining[char] = (remaining[char] ?? 0) + 1;
  }

  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === solution[i]) {
      result[i] = "correct";
      remaining[guess[i]] -= 1;
    }
  }

  for (let i = 0; i < guess.length; i++) {
    if (result[i] === "correct") {
      continue;
    }
    const char = guess[i];
    if ((remaining[char] ?? 0) > 0) {
      result[i] = "present";
      remaining[char] -= 1;
    }
  }

  return result;
}

// Beste je Buchstabe erreichte Bewertung über alle bisherigen Versuche - für
// die Einfärbung/Markierung der Bildschirmtastatur (correct > present > absent).
const MARK_RANK: Record<WordleMark, number> = {
  absent: 0,
  present: 1,
  correct: 2,
};

export function letterMarks(
  guesses: string[],
  solution: string,
): Record<string, WordleMark> {
  const marks: Record<string, WordleMark> = {};

  for (const guess of guesses) {
    const evaluation = evaluateGuess(guess, solution);
    for (let i = 0; i < guess.length; i++) {
      const char = guess[i];
      const current = marks[char];
      if (!current || MARK_RANK[evaluation[i]] > MARK_RANK[current]) {
        marks[char] = evaluation[i];
      }
    }
  }

  return marks;
}

// Ein Versuch ist zulässig, wenn er die richtige Länge hat und nur aus A-Z
// besteht. Absichtlich KEINE Wörterbuchprüfung, damit auch nicht gelistete
// (seltene) Wörter geraten werden dürfen.
export function isAllowedGuess(guess: string, wordLength: number): boolean {
  return guess.length === wordLength && /^[A-Z]+$/.test(guess);
}

// Tastaturlayout je Sprache. Beide nutzen A-Z; Deutsch tauscht nur Z/Y
// gegenüber Englisch (QWERTZ vs. QWERTY).
export function keyboardRows(language: WordleLanguage): string[][] {
  const topRow =
    language === "de"
      ? ["Q", "W", "E", "R", "T", "Z", "U", "I", "O", "P"]
      : ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"];
  const bottomLetters =
    language === "de"
      ? ["Y", "X", "C", "V", "B", "N", "M"]
      : ["Z", "X", "C", "V", "B", "N", "M"];

  return [
    topRow,
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    bottomLetters,
  ];
}
