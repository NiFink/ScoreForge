// Lokaler Host-Nachweis pro Spiel (nur im Browser, localStorage).
//
// Beim Erstellen eines Spiels legen wir hier das Host-Geheimnis UND den
// Beitritts-Code ab:
//  - Das Geheimnis wandert bei Host-Aktionen (Bearbeiten im "host"-Modus,
//    Löschen) an die API und beweist dort die Berechtigung (siehe hostAuth).
//  - Der Code wird nur noch lokal für die Anzeige "eigene Lobby" gehalten - er
//    kommt bewusst NICHT mehr über die öffentliche Lobby-Liste zurück, damit
//    PINs nicht massenhaft abgegriffen werden können.
//
// Folge: Host-Rechte sind (wie schon im alten Modell) an das erstellende Gerät
// gebunden. Auf einem anderen Gerät ist man nicht Host - das ist beabsichtigt.

const STORAGE_KEY = "scoreforge:hostGames";

export type HostSession = { code: string; secret: string };

type Store = Record<string, HostSession>;

function readStore(): Store {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    return JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? "{}",
    ) as Store;
  } catch {
    return {};
  }
}

function writeStore(store: Store): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function rememberHostGame(
  gameId: string,
  code: string,
  secret: string,
): void {
  const store = readStore();
  store[gameId] = { code, secret };
  writeStore(store);
}

export function getHostSession(gameId: string): HostSession | null {
  return readStore()[gameId] ?? null;
}

export function forgetHostGame(gameId: string): void {
  const store = readStore();

  if (store[gameId]) {
    delete store[gameId];
    writeStore(store);
  }
}
