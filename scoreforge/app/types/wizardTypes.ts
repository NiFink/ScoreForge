import type { BaseGameState, GameRecord } from "./gameTypes";

export type { DeviceMode, GameRecord, Player, WriteMode } from "./gameTypes";

export type GamePhase = "lobby" | "playing";

export type GameState = BaseGameState & {
  gameType?: "wizard";
  rounds: number;
  startPlayerIndex: number;
  startPlayerChosen: boolean;
  phase: GamePhase;
  table: ScoreTable;
};

export type WizardGameRecord = GameRecord<GameState>;

export type RoundEntry = {
  bid: number | null;
  actual: number | null;
};

export type RoundData = Record<string, RoundEntry>;
export type ScoreTable = RoundData[];
export type ModalPhase = "bid" | "actual";
