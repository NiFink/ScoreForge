export type Player = {
  id: string;
  name: string;
  color: string;
  claimedBy?: string | null;
};

export type DeviceMode = "single" | "multi";
export type WriteMode = "host" | "all";
export type GamePhase = "lobby" | "playing";

export type GameState = {
  playerCount: number;
  deviceMode: DeviceMode;
  writeMode: WriteMode;
  rounds: number;
  startPlayerIndex: number;
  startPlayerChosen: boolean;
  players: Player[];
  phase: GamePhase;
  hostId: string;
  table: ScoreTable;
};

export type GameRecord = {
  id: string;
  code: string;
  state: GameState;
  created_at?: string;
};

export type RoundEntry = {
  bid: number | null;
  actual: number | null;
};

export type RoundData = Record<string, RoundEntry>;
export type ScoreTable = RoundData[];
export type ModalPhase = "bid" | "actual";
