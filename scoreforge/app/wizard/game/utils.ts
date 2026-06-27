import type { Player, RoundData, RoundEntry, ScoreTable } from "./types";

const emptyEntry = (): RoundEntry => ({ bid: null, actual: null });

export function getRoundScore(entry: RoundEntry) {
  if (entry.bid === null || entry.actual === null) {
    return 0;
  }

  if (entry.bid === entry.actual) {
    return 20 + entry.actual * 10;
  }

  return Math.abs(entry.bid - entry.actual) * -10;
}

export function createScoreTable(
  rounds: number,
  players: Player[],
): ScoreTable {
  return Array.from({ length: rounds }, () =>
    Object.fromEntries(players.map((player) => [player.id, emptyEntry()])),
  );
}

export function getRoundStartIndex(
  roundIndex: number,
  playerCount: number,
  startPlayerIndex = 0,
) {
  if (playerCount === 0) {
    return 0;
  }

  return (startPlayerIndex + roundIndex) % playerCount;
}

export function getRoundTurnOrder(
  roundIndex: number,
  playerCount: number,
  startPlayerIndex = 0,
) {
  const startIndex = getRoundStartIndex(
    roundIndex,
    playerCount,
    startPlayerIndex,
  );

  return Array.from(
    { length: playerCount },
    (_, offset) => (startIndex + offset) % playerCount,
  );
}

export function getActualRoundOptions(roundNumber: number, takenSoFar = 0) {
  const minimum = 0;
  const maximum = Math.max(0, roundNumber - takenSoFar);

  return Array.from(
    { length: maximum - minimum + 1 },
    (_, index) => minimum + index,
  );
}

export function rankPlayers(players: Player[], scores: Record<string, number>) {
  const values = players.map((player) => scores[player.id] ?? 0);
  const max = Math.max(...values);
  const min = Math.min(...values);

  return { max, min };
}

export function isRoundPhaseComplete(
  round: RoundData,
  players: Player[],
  phase: keyof RoundEntry,
) {
  return players.every((player) => round[player.id]?.[phase] !== null);
}

export function isRoundComplete(round: RoundData, players: Player[]) {
  return (
    isRoundPhaseComplete(round, players, "bid") &&
    isRoundPhaseComplete(round, players, "actual")
  );
}

export function isRoundUnlocked(
  table: ScoreTable,
  players: Player[],
  roundIndex: number,
) {
  return roundIndex === 0 || isRoundComplete(table[roundIndex - 1], players);
}
