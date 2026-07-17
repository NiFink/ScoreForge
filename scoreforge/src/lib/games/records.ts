// Zentrale Definitionen für den Zugriff auf die `games`-Tabelle.
//
// Warum diese Datei existiert: mehrere API-Routes lesen/schreiben dieselbe
// Tabelle über den Service-Role-Client (der RLS UND Spalten-Grants umgeht).
// Ohne eine gemeinsame Stelle driftet leicht auseinander, welche Spalten an
// den Client zurückgehen dürfen - genau so leakt sensible Information.

// Spalten, die gefahrlos an (auch anonyme) Clients gehen dürfen.
//
// SICHERHEIT: `user_id` fehlt hier bewusst. Es ist eine echte Konto-Kennung
// und wird in supabase/setup.sql (Abschnitt 6) per REVOKE vor anon/authenticated
// verborgen, damit niemand die Spiele eines Kontos korrelieren kann. Da die
// API den Service-Role-Key nutzt, greift dieses REVOKE hier NICHT - deshalb
// müssen wir die Spalten selbst explizit auflisten und dürfen niemals
// `select("*")` an den Client zurückgeben.
export const GAME_CLIENT_COLUMNS = "id, code, state, created_at, expires_at";

// Obergrenze für die serialisierte Größe von `state`. Der Service-Role-Client
// umgeht RLS, d. h. ohne Limit könnte ein Client beliebig große Payloads in
// die Tabelle schreiben (Storage-Missbrauch). 64 KB sind für ein Punkteboard
// mit ~10 Spielern großzügig bemessen.
export const MAX_STATE_BYTES = 64 * 1024;

// true, wenn `state` serialisierbar ist und das Größenlimit einhält.
export function isStateWithinLimit(state: unknown): boolean {
  try {
    return new TextEncoder().encode(JSON.stringify(state)).length <= MAX_STATE_BYTES;
  } catch {
    // Nicht serialisierbar (z. B. zirkuläre Referenz) -> ablehnen.
    return false;
  }
}

// Maximale Länge eines vom Client gesetzten Spielernamens (Anzeige-Wert).
export const MAX_PLAYER_NAME_LENGTH = 40;
