import {
  createEmptyScores,
  getGrandTotal,
  isScoresheetComplete,
} from "@/features/kniffel/utils";
import { getScoreKeys, getScoreTotal } from "@/features/doomlings/utils";
import { getTotals as getUniversalTotals, isGameOver as isUniversalGameOver } from "@/features/universal/utils";
import {
  getBinokelTotals,
  getParties,
} from "@/features/binokel/utils";
import { getRoundScore, isRoundComplete as isWizardRoundComplete } from "@/features/wizard/utils";
import type {
  BaseGameState,
  BinokelState,
  DoomlingsScores,
  DoomlingsState,
  GameType,
  KniffelState,
  UniversalState,
} from "@/types/gameTypes";
import type { GameState as WizardState } from "@/types/wizardTypes";

export type GameStats = {
  // Ob das Spiel inhaltlich abgeschlossen ist (nicht nur "expired"/gelöscht).
  finished: boolean;
  // Höchste erreichte Punktzahl unter den Spielern/Parteien, falls das Spiel
  // fertig ist - dient in der Kontoübersicht als Basis für den Ø-Wert.
  topScore: number | null;
};

const EMPTY_DOOMLINGS_SCORES: DoomlingsScores = {
  numbers: 0,
  cross: 0,
  sickle: 0,
  worldsEnd: 0,
};

function statsForKniffel(state: KniffelState): GameStats {
  const playerIds = state.players.map((player) => player.id);
  const finished =
    playerIds.length > 0 &&
    playerIds.every((id) =>
      isScoresheetComplete(state.scores[id] ?? createEmptyScores()),
    );

  if (!finished) {
    return { finished: false, topScore: null };
  }

  const totals = playerIds.map((id) =>
    getGrandTotal(
      state.scores[id] ?? createEmptyScores(),
      state.yahtzeeBonus[id] ?? 0,
    ),
  );

  return { finished: true, topScore: Math.max(...totals) };
}

function statsForWizard(state: WizardState): GameStats {
  const table = state.table ?? [];
  const finished =
    table.length > 0 &&
    table.every((round) => isWizardRoundComplete(round, state.players));

  if (!finished) {
    return { finished: false, topScore: null };
  }

  const totals = state.players.map((player) =>
    table.reduce(
      (sum, round) =>
        sum + getRoundScore(round[player.id] ?? { bid: null, actual: null }),
      state.scoreAdjustments?.[player.id] ?? 0,
    ),
  );

  return { finished: true, topScore: Math.max(...totals) };
}

function statsForDoomlings(state: DoomlingsState): GameStats {
  const finished = state.phase === "finished";

  if (!finished) {
    return { finished: false, topScore: null };
  }

  const keys = getScoreKeys(state.addons ?? []);
  const totals = state.players.map((player) =>
    getScoreTotal(state.scores[player.id] ?? EMPTY_DOOMLINGS_SCORES, keys),
  );

  return { finished: true, topScore: Math.max(...totals) };
}

function statsForUniversal(state: UniversalState): GameStats {
  const finished = isUniversalGameOver(state);

  if (!finished) {
    return { finished: false, topScore: null };
  }

  const totals = getUniversalTotals(
    state.rounds ?? [],
    state.players.map((player) => player.id),
    state.scoreAdjustments,
  );
  const values = Object.values(totals);

  return { finished: true, topScore: values.length ? Math.max(...values) : null };
}

function statsForBinokel(state: BinokelState): GameStats {
  const parties = getParties(state.players);
  const totals = getBinokelTotals(state.rounds ?? [], parties);
  const values = Object.values(totals);
  const finished = values.length > 0 && values.some((value) => value >= state.targetScore);

  if (!finished) {
    return { finished: false, topScore: null };
  }

  return { finished: true, topScore: Math.max(...values) };
}

export function computeGameStats(
  gameType: GameType | undefined,
  state: BaseGameState,
): GameStats {
  switch (gameType) {
    case "kniffel":
      return statsForKniffel(state as KniffelState);
    case "wizard":
      return statsForWizard(state as unknown as WizardState);
    case "doomlings":
      return statsForDoomlings(state as DoomlingsState);
    case "universal":
      return statsForUniversal(state as UniversalState);
    case "binokel":
      return statsForBinokel(state as BinokelState);
    default:
      return { finished: false, topScore: null };
  }
}
