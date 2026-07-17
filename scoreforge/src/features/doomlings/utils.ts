import type { DoomlingsScores, Player } from "@/types/gameTypes";

export const MEANING_OF_LIFE_ADDON = "The Meaning of Life";

// Zählreihenfolge: World's End, Sicheln, Zahlen, Kreuze — zuletzt die
// geheimen Ziele, falls "The Meaning of Life" gespielt wird.
const BASE_SCORE_KEYS: (keyof DoomlingsScores)[] = [
  "worldsEnd",
  "sickle",
  "numbers",
  "cross",
];

export function getScoreKeys(addons: string[]): (keyof DoomlingsScores)[] {
  return addons.includes(MEANING_OF_LIFE_ADDON)
    ? [...BASE_SCORE_KEYS, "secretGoals"]
    : BASE_SCORE_KEYS;
}

const DEFAULT_SCORES: DoomlingsScores = {
  numbers: 0,
  cross: 0,
  sickle: 0,
  worldsEnd: 0,
};

export function getScoreTotal(
  scores: DoomlingsScores,
  keys: (keyof DoomlingsScores)[],
) {
  return keys.reduce((sum, key) => sum + (scores[key] ?? 0), 0);
}

// Zähl-Reihenfolge ab dem gewählten Startspieler, wie der Startspieler bei
// Wizard — rein organisatorisch, hat keinen Einfluss auf die Punkte.
export function getCountingOrder<T>(items: T[], startIndex: number): T[] {
  if (items.length === 0) {
    return items;
  }

  const offset = ((startIndex % items.length) + items.length) % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
}

// Enthüllungs-Reihenfolge: aufsteigend nach Punktzahl, damit die Spannung bis
// zum Sieger steigt (wie bei Kahoot).
export function getRevealOrder(
  players: Player[],
  scores: Record<string, DoomlingsScores>,
  keys: (keyof DoomlingsScores)[],
): Player[] {
  return [...players].sort((left, right) => {
    const leftTotal = getScoreTotal(scores[left.id] ?? DEFAULT_SCORES, keys);
    const rightTotal = getScoreTotal(scores[right.id] ?? DEFAULT_SCORES, keys);
    return leftTotal - rightTotal;
  });
}
