import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { PartyCategorySelection, PartyWordCategoryKey } from "@/types/gameTypes";

type Categories = Dictionary["partyWords"]["categories"];

export const CATEGORY_KEYS: PartyWordCategoryKey[] = [
  "animals",
  "jobs",
  "food",
  "places",
  "famous",
];

function poolFor(categories: Categories, selection: PartyCategorySelection): string[] {
  if (selection === "random") {
    return CATEGORY_KEYS.flatMap((key) => categories[key].words);
  }

  return categories[selection].words;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

// Ein zufälliges Wort aus der gewählten Kategorie (Imposter-Geheimwort).
export function pickRandomWord(
  categories: Categories,
  selection: PartyCategorySelection,
): string {
  const pool = poolFor(categories, selection);
  return pool[Math.floor(Math.random() * pool.length)];
}

// `count` verschiedene Wörter (Wer bin ich - jeder Spieler eine eigene
// Identität). Wiederholt den Pool, falls die Kategorie kleiner als die
// Spielerzahl ist.
export function pickRandomWords(
  categories: Categories,
  selection: PartyCategorySelection,
  count: number,
): string[] {
  const pool = shuffle(poolFor(categories, selection));
  const result: string[] = [];

  while (result.length < count) {
    result.push(...shuffle(pool));
  }

  return result.slice(0, count);
}

// Zwei Beispielwörter für Infotexte (z.B. im Aufdeck-Popup von "Wer bin ich").
// Bei "random" kommen die Beispiele aus zwei verschiedenen Kategorien, damit
// die Vielfalt sichtbar wird.
export function categoryExamples(
  categories: Categories,
  selection: PartyCategorySelection,
): string[] {
  if (selection === "random") {
    return [categories.animals.words[0], categories.famous.words[0]];
  }

  return categories[selection].words.slice(0, 2);
}

// `count` zufällige Spieler-IDs als Imposter (mindestens 1, höchstens
// Spieleranzahl - 1, damit immer noch echte Crew übrig bleibt).
export function pickRandomImposters(playerIds: string[], count: number): string[] {
  const clamped = Math.max(1, Math.min(count, playerIds.length - 1));
  return shuffle(playerIds).slice(0, clamped);
}
