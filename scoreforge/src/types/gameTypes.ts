export type Player = {
  id: string;
  name: string;
  color: string;
  claimedBy?: string | null;
};

export type DeviceMode = "single" | "multi";
export type WriteMode = "host" | "all";
export type GameType =
  | "wizard"
  | "doomlings"
  | "binokel"
  | "universal"
  | "kniffel"
  | "maexle"
  | "imposter"
  | "whoAmI"
  | "wordle";

export type BaseGameState = {
  gameType?: GameType;
  deviceMode: DeviceMode;
  writeMode: WriteMode;
  playerCount: number;
  players: Player[];
  // Nicht-autoritativer Hinweis auf das erstellende Gerät. Die Host-Berechtigung
  // wird NICHT hierüber geprüft (die Spalte ist öffentlich lesbar), sondern
  // serverseitig über das gehashte Host-Geheimnis - siehe lib/games/hostAuth.
  hostId: string;
  phase: string;
  lobbyName?: string;
  // Startpunkte-Ausgleich für nachträglich hinzugefügte Spieler
  // (wird bei der Gesamtwertung aufaddiert)
  scoreAdjustments?: Record<string, number>;
  // Pausiert: Lobby wird 30 statt 2 Tage aufbewahrt, damit man später
  // weiterspielen kann, ohne dass sie zwischenzeitlich gelöscht wird.
  paused?: boolean;
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
  // isMine/code kommen NICHT von der API (der PIN darf nicht über die
  // öffentliche Liste leaken), sondern werden clientseitig aus dem lokalen
  // Host-Store ergänzt (lib/games/hostSession) - siehe join/page.tsx.
  isMine: boolean;
  code: string | null;
};

// Spiele-Übersicht im Konto-Bereich (geräteübergreifend, per user_id).
export type AccountGameSummary = {
  id: string;
  gameType: GameType;
  phase: string;
  lobbyName: string | null;
  playerCount: number;
  createdAt: string;
  // Inhaltlich abgeschlossen (alle Kategorien/Runden gespielt) - Basis für
  // die Statistiken im Konto-Bereich, siehe lib/stats/gameStats.
  finished: boolean;
  // Höchste erreichte Punktzahl, nur gesetzt wenn finished true ist.
  topScore: number | null;
};

// Dauerhafter Historien-Eintrag eines beendeten Spiels (nur für Konten).
// Überlebt den Ablauf des eigentlichen Spiels (siehe game_results-Tabelle).
export type GameHistoryEntry = {
  id: string;
  gameType: GameType;
  lobbyName: string | null;
  // Anzeigename des Gewinners (bei Gleichstand verbunden); null = unentschieden.
  winner: string | null;
  players: string[];
  finishedAt: string;
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

// --- Universal (freies Punkteboard für beliebige Spiele) ---

// "target" = bis Zielpunktzahl, "rounds" = feste Rundenzahl, "none" = offen
export type UniversalEndCondition = "target" | "rounds" | "none";

// Punkte pro Spieler in einer Runde (null = noch nicht eingetragen)
export type UniversalRound = Record<string, number | null>;

export type UniversalState = BaseGameState & {
  gameType: "universal";
  phase: "lobby" | "playing" | "finished";
  endCondition: UniversalEndCondition;
  // Nur bei endCondition "target" bzw. "rounds" gesetzt
  targetScore?: number;
  maxRounds?: number;
  rounds: UniversalRound[];
};

// --- Kniffel (deutsche Yahtzee-Variante) ---

export type KniffelCategory =
  | "ones"
  | "twos"
  | "threes"
  | "fours"
  | "fives"
  | "sixes"
  | "threeOfAKind"
  | "fourOfAKind"
  | "fullHouse"
  | "smallStraight"
  | "largeStraight"
  | "yahtzee"
  | "chance";

// null = noch nicht eingetragen, 0 = bewusst gestrichen (kein Wert erzielt)
export type KniffelScores = Record<KniffelCategory, number | null>;

export type KniffelState = BaseGameState & {
  gameType: "kniffel";
  phase: "lobby" | "playing" | "finished";
  scores: Record<string, KniffelScores>; // playerId -> Kategorie-Werte
  yahtzeeBonus: Record<string, number>; // playerId -> Anzahl zusätzlicher Kniffel (je +50)
  // Startspieler-Auswahl (analog zu Wizard) + wer aktuell am Zug ist - rein
  // organisatorisch, hat keinen Einfluss auf die Punkte.
  startPlayerIndex?: number;
  startPlayerChosen?: boolean;
  currentPlayerIndex?: number;
};

// --- Mäxle (Meiern/Mexicali - Bluff-Würfelspiel mit 2 Würfeln) ---
//
// ScoreForge simuliert das Würfeln/Bluffen nicht - das passiert am Tisch.
// Die App ist hier nur der Lebenszähler: wer eine Runde verliert, verliert
// ein Leben; wessen Leben aufgebraucht sind, scheidet aus.

// "lastStanding" = spielt bis nur noch einer übrig ist, "firstElimination" =
// endet, sobald der erste Spieler ausscheidet.
export type MaexleEndCondition = "lastStanding" | "firstElimination";

export type MaexleState = BaseGameState & {
  gameType: "maexle";
  phase: "lobby" | "playing" | "finished";
  // Startleben pro Spieler, bei der Einrichtung festgelegt (max. 12).
  livesTotal: number;
  // playerId -> verbleibende Leben (0 = ausgeschieden).
  lives: Record<string, number>;
  endCondition: MaexleEndCondition;
};

// --- Party-Wortlisten (gemeinsam für Imposter & Wer bin ich) ---

export type PartyWordCategoryKey =
  | "animals"
  | "jobs"
  | "food"
  | "places"
  | "famous";

export type PartyCategorySelection = PartyWordCategoryKey | "random";

// --- Imposter (Spyfall-artiges Bluffspiel) ---
//
// Alle außer dem/den Imposter(n) sehen dasselbe Geheimwort und beschreiben
// es am Tisch, ohne es zu verraten - der Imposter kennt es nicht und muss
// mitraten/bluffen. Reihum wird das Handy herumgereicht: jeder deckt privat
// seine eigene Rolle auf (siehe ImposterRevealModal).

export type ImposterState = BaseGameState & {
  gameType: "imposter";
  phase: "lobby" | "playing" | "finished";
  categoryKey: PartyCategorySelection;
  imposterCount: number;
  round: number;
  word: string;
  imposterIds: string[];
  // playerId -> hat seine Rolle für die aktuelle Runde schon privat gesehen.
  revealedIds: string[];
  crewWins: number;
  imposterWins: number;
};

// --- Wer bin ich? ---
//
// Jeder Spieler bekommt eine geheime Identität zugewiesen, die nur die
// ANDEREN sehen dürfen (nicht die eigene) - erraten wird per Ja/Nein-Fragen
// am Tisch. Reihum wird das Handy herumgereicht, siehe WhoAmIRevealModal.

// "category" = Wörter kommen aus der eingebauten Liste, "custom" = Spieler
// schreiben sich reihum gegenseitig eine Identität (siehe authoredIds unten).
export type WhoAmIWordMode = "category" | "custom";

export type WhoAmIState = BaseGameState & {
  gameType: "whoAmI";
  // "authoring" nur bei wordMode "custom": Phase, in der die Identitäten
  // erst reihum geschrieben werden, bevor geraten werden kann.
  phase: "lobby" | "authoring" | "playing";
  categoryKey: PartyCategorySelection;
  wordMode: WhoAmIWordMode;
  round: number;
  // playerId -> zugewiesenes Wort/Identität. Bei wordMode "custom" von den
  // Mitspielern geschrieben statt zufällig gezogen.
  words: Record<string, string>;
  // playerId -> hat das Brett für die aktuelle Runde schon privat gesehen.
  revealedIds: string[];
  // Nur wordMode "custom": playerId des Schreibers -> hat seinen Eintrag
  // schon abgegeben (Spieler i schreibt für Spieler i+1 in der players-Liste).
  authoredIds?: string[];
  // Mehrgeräte-Modus: erzwingt für alle den manuellen Bestätigen-Ablauf,
  // auch auf dem eigenen (verbundenen) Gerät - z.B. wenn das Handy nicht als
  // wirklich privat gilt. Ohne diese Option sieht jeder mit eigenem Gerät
  // sein Brett automatisch, ohne extra zu bestätigen.
  everyoneActsAsHost?: boolean;
  // Reihenfolge, in der Spieler ihre Identität richtig erraten haben
  // (Basis für die Rangliste am Rundenende).
  guessedOrder: string[];
  // Host hat die Runde manuell beendet, auch wenn noch nicht alle erraten
  // haben (siehe "Runde beenden"-Button).
  roundEnded?: boolean;
};

// --- Wördle (Wortraten à la Wordle) ---
//
// Ein zufällig gezogenes Wort wird Zeile für Zeile erraten. Nach jedem Versuch
// gibt es Rückmeldung pro Buchstabe: richtige Position / im Wort enthalten /
// nicht enthalten. Im Mehrgeräte-Modus teilen sich alle dasselbe Rätselbrett
// (Koop) und sehen die Versuche live.

// Sprache der zu erratenden Wörter (bestimmt die Wortliste + Tastaturlayout).
export type WordleLanguage = "de" | "en";

// "classic" = Farben (grün = richtig, gelb = enthalten, grau = fehlt).
// "symbols" = Symbole statt Farben, mit sichtbarer Legende (barrierefrei).
// "cryptic" = Symbole statt Farben, aber OHNE Legende - man muss selbst
//             herausfinden, welches Zeichen "richtig am Platz" und welches
//             "im Wort enthalten" bedeutet (die Zuordnung ist verdeckt/gemischt).
export type WordleVariant = "classic" | "symbols" | "cryptic";

// Bewertung eines einzelnen Buchstabens.
export type WordleMark = "correct" | "present" | "absent";

export type WordleState = BaseGameState & {
  gameType: "wordle";
  phase: "playing" | "finished";
  language: WordleLanguage;
  variant: WordleVariant;
  // Länge des zu erratenden Wortes und maximale Anzahl Versuche.
  wordLength: number;
  maxGuesses: number;
  // Das aktuell zu erratende Wort (Großbuchstaben, A-Z).
  solution: string;
  // Bereits abgegebene Rateversuche (Großbuchstaben), einer pro Zeile.
  guesses: string[];
  // Zuordnung Bewertung -> angezeigtes Symbol. Bei "cryptic" zufällig gemischt
  // und ohne Legende, sodass die Bedeutung erst erraten werden muss.
  symbolMap: Record<WordleMark, string>;
  // Zähler über die gesamte Sitzung (mehrere Wörter nacheinander).
  solvedCount: number;
  lostCount: number;
  // Ergebnis des aktuellen Wortes (nur in Phase "finished" gesetzt).
  won?: boolean;
};
