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
  // Ob die anfragende Person selbst der Host ist (per clientId erkannt).
  isMine: boolean;
  // Nur bei isMine gesetzt — der Code ist sonst bewusst der PIN.
  code: string | null;
};

// --- Doomlings ---

export type DoomlingsScores = {
  numbers: number;
  cross: number;
  sickle: number;
  worldsEnd: number;
  // Nur befüllt, wenn das Addon "The Meaning of Life" aktiv ist.
  secretGoals?: number;
};

export type DoomlingsPhase =
  | "lobby"
  | "playing"
  | "scoring"
  | "revealing"
  | "finished";

export type DoomlingsState = BaseGameState & {
  gameType: "doomlings";
  addons: string[];
  phase: DoomlingsPhase;
  scoringStep: number;
  scores: Record<string, DoomlingsScores>;
  // Zähl-Reihenfolge bei der Endwertung (analog zum Startspieler bei Wizard).
  scoringStartPlayerIndex?: number;
  scoringStartPlayerChosen?: boolean;
  // Mehrgeräte-Modus: wer hat seine Werte bereits bestätigt.
  readyPlayers?: Record<string, boolean>;
  // Enthüllungs-Fortschritt: wie viele Plätze schon aufgedeckt sind.
  revealIndex?: number;
};

// --- Binokel ---

// "durch" = 1000 (alle Stiche angesagt), "aufgelegt" = 1500 (Karten offen)
export type BinokelSpecial = 1000 | 1500;

export type BinokelRound = {
  bidderPartyId: string | null;
  bid: number | null;
  melds: Record<string, number | null>;
  tricks: Record<string, number | null>;
  // Sonderspiel des Ersteigerers: alle Stiche für +1000/+1500, sonst -1000/-1500.
  // Andere melden nicht und bekommen keine Stichpunkte.
  special?: BinokelSpecial | null;
  // Ob der Ersteigerer alle Stiche gemacht hat (nur bei special relevant).
  specialMade?: boolean | null;
  // Spielmacher gibt schon beim Melden ab: er bekommt -Gebot, die anderen
  // behalten ihre Meldung und erhalten zusätzlich +40 Punkte.
  conceded?: boolean | null;
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
