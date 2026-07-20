import type { KniffelCategory, KniffelScores } from "@/types/gameTypes";

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
