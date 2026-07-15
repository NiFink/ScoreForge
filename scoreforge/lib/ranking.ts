// Turnier-Rangfolge (1224-Ranking): punktgleiche Spieler teilen sich den
// Platz, der nächste Rang überspringt entsprechend viele Plätze.
// Beispiel: 31, 31, 20 -> Ränge 1, 1, 3.
// Erwartet eine bereits absteigend nach Punktzahl sortierte Liste.
export function computeRanks(scoresDesc: number[]): number[] {
  const ranks: number[] = [];

  for (let i = 0; i < scoresDesc.length; i++) {
    ranks.push(
      i > 0 && scoresDesc[i] === scoresDesc[i - 1] ? ranks[i - 1] : i + 1,
    );
  }

  return ranks;
}

// Bequemlichkeit für { id, score }-Listen (bereits absteigend sortiert):
// liefert eine id -> Rang Map, unabhängig von der späteren Anzeige-Reihenfolge.
export function computeRankMap(
  entriesDesc: { id: string; score: number }[],
): Record<string, number> {
  const ranks = computeRanks(entriesDesc.map((entry) => entry.score));

  return Object.fromEntries(
    entriesDesc.map((entry, index) => [entry.id, ranks[index]]),
  );
}
