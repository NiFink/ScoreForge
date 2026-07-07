export type Player = {
  id: string;
  name: string;
  color: string;
  claimedBy?: string | null;
};

export type DeviceMode = "single" | "multi";
export type WriteMode = "host" | "all";
export type GameType = "wizard" | "doomlings" | "binokel";

export type BaseGameState = {
  gameType?: GameType;
  deviceMode: DeviceMode;
  writeMode: WriteMode;
  playerCount: number;
  players: Player[];
  hostId: string;
  phase: string;
  lobbyName?: string;
};

export type GameRecord<S extends BaseGameState = BaseGameState> = {
  id: string;
  code: string;
  state: S;
  created_at?: string;
  expires_at?: string;
};

export type LobbySummary = {
  id: string;
  name: string | null;
  gameType: GameType;
  phase: string;
  playerCount: number;
  claimedCount: number;
  createdAt: string;
};

// --- Doomlings ---

export type DoomlingsScores = {
  numbers: number;
  cross: number;
  sickle: number;
  worldsEnd: number;
};

export type DoomlingsState = BaseGameState & {
  gameType: "doomlings";
  addons: string[];
  phase: "lobby" | "playing" | "scoring" | "finished";
  scoringStep: number;
  scores: Record<string, DoomlingsScores>;
};

// --- Binokel ---

export type BinokelRound = {
  bidderPartyId: string | null;
  bid: number | null;
  melds: Record<string, number | null>;
  tricks: Record<string, number | null>;
};

export type BinokelState = BaseGameState & {
  gameType: "binokel";
  targetScore: number;
  phase: "lobby" | "playing";
  rounds: BinokelRound[];
};

export type BinokelParty = {
  id: string;
  name: string;
  color: string;
  memberIds: string[];
};
