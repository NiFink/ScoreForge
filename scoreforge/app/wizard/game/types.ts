export type Player = {
  id: string;
  name: string;
  color: string;
};

export type Setup = {
  playerCount: number;
  deviceMode: "single" | "multi";
  writeMode: "host" | "all";
  rounds: number;
  startPlayerIndex: number;
  players: Player[];
};

export type RoundEntry = {
  bid: number | null;
  actual: number | null;
};

export type RoundData = Record<string, RoundEntry>;
export type ScoreTable = RoundData[];
export type ModalPhase = "bid" | "actual";
