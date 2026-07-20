import type { KniffelCategory, KniffelScores, Player } from "@/types/gameTypes";

// Offizielle Reihenfolge des deutschen Kniffel-Zettels.
export const CATEGORY_ORDER: KniffelCategory[] = [
  "ones",
  "twos",
  "threes",
  "fours",
  "fives",
  "sixes",
  "threeOfAKind",
  "fourOfAKind",
  "fullHouse",
  "smallStraight",
  "largeStraight",
  "yahtzee",
  "chance",
];

export const UPPER_CATEGORIES: KniffelCategory[] = [
  "ones",
  "twos",
  "threes",
  "fours",
  "fives",
  "sixes",
];

export const LOWER_CATEGORIES: KniffelCategory[] = [
  "threeOfAKind",
  "fourOfAKind",
  "fullHouse",
  "smallStraight",
  "largeStraight",
  "yahtzee",
  "chance",
];

// Feste Punktwerte: entweder erzielt (voller Wert) oder gestrichen (0).
export const FIXED_CATEGORY_VALUES: Partial<Record<KniffelCategory, number>> =
  {
    fullHouse: 25,
    smallStraight: 30,
    largeStraight: 40,
    yahtzee: 50,
  };

export function isFixedCategory(category: KniffelCategory): boolean {
  return category in FIXED_CATEGORY_VALUES;
}

export function createEmptyScores(): KniffelScores {
  return Object.fromEntries(
    CATEGORY_ORDER.map((category) => [category, null]),
  ) as KniffelScores;
}

export function getUpperSum(scores: KniffelScores): number {
  return UPPER_CATEGORIES.reduce(
    (sum, category) => sum + (scores[category] ?? 0),
    0,
  );
}

// Bonus ab 63 Punkten im oberen Bereich: +35.
export function getUpperBonus(scores: KniffelScores): number {
  return getUpperSum(scores) >= 63 ? 35 : 0;
}

export function getLowerSum(scores: KniffelScores): number {
  return LOWER_CATEGORIES.reduce(
    (sum, category) => sum + (scores[category] ?? 0),
    0,
  );
}

export function getYahtzeeBonusTotal(bonusCount: number): number {
  return bonusCount * 50;
}

export function getGrandTotal(
  scores: KniffelScores,
  bonusCount: number,
): number {
  return (
    getUpperSum(scores) +
    getUpperBonus(scores) +
    getLowerSum(scores) +
    getYahtzeeBonusTotal(bonusCount)
  );
}

export function isScoresheetComplete(scores: KniffelScores): boolean {
  return CATEGORY_ORDER.every((category) => scores[category] !== null);
}

// Vervielfacher der oberen Kategorien - Augenzahl mal Anzahl gewürfelter
// Würfel mit dieser Zahl (0 bis 5).
const UPPER_MULTIPLIER: Partial<Record<KniffelCategory, number>> = {
  ones: 1,
  twos: 2,
  threes: 3,
  fours: 4,
  fives: 5,
  sixes: 6,
};

// Augensumme aller 5 Würfel: von "alle Einsen" (5) bis "alle Sechsen" (30).
// Gilt unverändert für Dreierpasch, Viererpasch (sobald das Muster erfüllt
// ist, zählt die volle Augensumme) und Chance.
const DICE_SUM_MIN = 5;
const DICE_SUM_MAX = 30;

// Tatsächlich mit 5 Würfeln erreichbare Werte für eine Kategorie - Basis für
// die Auswahl im Eingabe-Dropdown, damit man sich nicht vertippen kann.
// Feste Kategorien (Full House etc.) haben ohnehin nur einen Wert (siehe
// FIXED_CATEGORY_VALUES) und tauchen hier nicht auf.
export function getAchievableValues(category: KniffelCategory): number[] {
  const multiplier = UPPER_MULTIPLIER[category];

  if (multiplier) {
    return [0, 1, 2, 3, 4, 5].map((count) => count * multiplier);
  }

  if (
    category === "threeOfAKind" ||
    category === "fourOfAKind" ||
    category === "chance"
  ) {
    return Array.from(
      { length: DICE_SUM_MAX - DICE_SUM_MIN + 1 },
      (_, index) => DICE_SUM_MIN + index,
    );
  }

  return [];
}

// Nächster Spieler am Zug ab (exklusiv) fromIndex - überspringt Spieler mit
// bereits vollständigem Zettel. Bleibt bei fromIndex, wenn niemand mehr offen ist.
export function getNextPlayerIndex(
  players: Player[],
  scores: Record<string, KniffelScores>,
  fromIndex: number,
): number {
  const count = players.length;

  if (count === 0) {
    return 0;
  }

  for (let step = 1; step <= count; step++) {
    const index = (fromIndex + step) % count;
    const player = players[index];

    if (!isScoresheetComplete(scores[player.id] ?? createEmptyScores())) {
      return index;
    }
  }

  return fromIndex;
}
