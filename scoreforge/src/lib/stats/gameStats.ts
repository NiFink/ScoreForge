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
  ImposterState,
  KniffelState,
  MaexleState,
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

// --- Ergebnis-Ermittlung für die dauerhafte Spiel-Historie ---
//
// Anders als computeGameStats liefert dies zusätzlich den/die Gewinner-Namen.
// Wird serverseitig beim Speichern eines beendeten Spiels genutzt (siehe
// PATCH /api/games/[gameId]). `finished` folgt derselben Logik wie in den
// jeweiligen Spielseiten.

export type GameResult = {
  finished: boolean;
  // Anzeigename des Gewinners (bei Gleichstand mit " & " verbunden); null,
  // wenn (noch) kein Gewinner feststeht bzw. Unentschieden.
  winner: string | null;
  // Teilnehmernamen (bei Binokel die Team-Namen).
  players: string[];
};

// Gewinner = höchste Punktzahl; bei Gleichstand alle Namen mit " & " verbunden.
function pickWinner(entries: { name: string; score: number }[]): string | null {
  if (entries.length === 0) {
    return null;
  }
  const max = Math.max(...entries.map((entry) => entry.score));
  const winners = entries
    .filter((entry) => entry.score === max)
    .map((entry) => entry.name);
  return winners.length > 0 ? winners.join(" & ") : null;
}

export function resolveGameResult(
  gameType: GameType | undefined,
  state: BaseGameState,
): GameResult {
  switch (gameType) {
    case "kniffel": {
      const s = state as KniffelState;
      const finished = statsForKniffel(s).finished;
      const entries = s.players.map((player) => ({
        name: player.name,
        score: getGrandTotal(
          s.scores[player.id] ?? createEmptyScores(),
          s.yahtzeeBonus[player.id] ?? 0,
        ),
      }));
      return {
        finished,
        winner: finished ? pickWinner(entries) : null,
        players: s.players.map((player) => player.name),
      };
    }
    case "wizard": {
      const s = state as unknown as WizardState;
      const table = s.table ?? [];
      const finished =
        table.length > 0 &&
        table.every((round) => isWizardRoundComplete(round, s.players));
      const entries = s.players.map((player) => ({
        name: player.name,
        score: table.reduce(
          (sum, round) =>
            sum + getRoundScore(round[player.id] ?? { bid: null, actual: null }),
          s.scoreAdjustments?.[player.id] ?? 0,
        ),
      }));
      return {
        finished,
        winner: finished ? pickWinner(entries) : null,
        players: s.players.map((player) => player.name),
      };
    }
    case "doomlings": {
      const s = state as DoomlingsState;
      const finished = s.phase === "finished";
      const keys = getScoreKeys(s.addons ?? []);
      const entries = s.players.map((player) => ({
        name: player.name,
        score: getScoreTotal(
          s.scores[player.id] ?? EMPTY_DOOMLINGS_SCORES,
          keys,
        ),
      }));
      return {
        finished,
        winner: finished ? pickWinner(entries) : null,
        players: s.players.map((player) => player.name),
      };
    }
    case "universal": {
      const s = state as UniversalState;
      const finished = isUniversalGameOver(s);
      const totals = getUniversalTotals(
        s.rounds ?? [],
        s.players.map((player) => player.id),
        s.scoreAdjustments,
      );
      const entries = s.players.map((player) => ({
        name: player.name,
        score: totals[player.id] ?? 0,
      }));
      return {
        finished,
        winner: finished ? pickWinner(entries) : null,
        players: s.players.map((player) => player.name),
      };
    }
    case "binokel": {
      const s = state as BinokelState;
      const parties = getParties(s.players);
      const totals = getBinokelTotals(s.rounds ?? [], parties);
      const finished = Object.values(totals).some(
        (value) => value >= s.targetScore,
      );
      const entries = parties.map((party) => ({
        name: party.name,
        score: totals[party.id] ?? 0,
      }));
      return {
        finished,
        winner: finished ? pickWinner(entries) : null,
        players: parties.map((party) => party.name),
      };
    }
    case "maexle": {
      const s = state as MaexleState;
      const alive = s.players.filter(
        (player) => (s.lives[player.id] ?? 0) > 0,
      );
      let finished = s.phase === "finished";
      if (!finished && s.players.length >= 2) {
        finished =
          s.endCondition === "firstElimination"
            ? alive.length < s.players.length
            : alive.length <= 1;
      }
      const entries = s.players.map((player) => ({
        name: player.name,
        score: s.lives[player.id] ?? 0,
      }));
      return {
        finished,
        winner: finished ? pickWinner(entries) : null,
        players: s.players.map((player) => player.name),
      };
    }
    case "imposter": {
      const s = state as ImposterState;
      const finished = s.phase === "finished";
      const winner =
        !finished
          ? null
          : s.crewWins > s.imposterWins
            ? "Crew"
            : s.imposterWins > s.crewWins
              ? "Imposter"
              : null;
      return {
        finished,
        winner,
        players: s.players.map((player) => player.name),
      };
    }
    default:
      // whoAmI, wordle & Unbekanntes: (noch) keine Historie.
      return { finished: false, winner: null, players: [] };
  }
}
