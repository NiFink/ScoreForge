import type { UniversalRound, UniversalState } from "@/types/gameTypes";

export function getTotals(
  rounds: UniversalRound[],
  playerIds: string[],
  adjustments?: Record<string, number>,
): Record<string, number> {
  const totals = Object.fromEntries(
    playerIds.map((id) => [id, adjustments?.[id] ?? 0]),
  );

  for (const round of rounds) {
    for (const id of playerIds) {
      totals[id] += round[id] ?? 0;
    }
  }

  return totals;
}

// Spielende je nach eingestellter Bedingung (manuell zählt immer)
export function isGameOver(state: UniversalState): boolean {
  if (state.phase === "finished") {
    return true;
  }

  if (state.endCondition === "target") {
    const totals = getTotals(
      state.rounds ?? [],
      state.players.map((player) => player.id),
      state.scoreAdjustments,
    );

    return state.players.some(
      (player) => totals[player.id] >= (state.targetScore ?? Infinity),
    );
  }

  if (state.endCondition === "rounds") {
    return (state.rounds ?? []).length >= (state.maxRounds ?? Infinity);
  }

  return false;
}
