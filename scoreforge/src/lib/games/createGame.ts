import type { BaseGameState, GameRecord } from "@/types/gameTypes";
import { rememberHostGame } from "@/lib/games/hostSession";

// Legt ein neues Spiel an (Client-Seite):
//  1. erzeugt ein zufälliges Host-Geheimnis,
//  2. schickt `state` + Geheimnis an die API (die nur den Hash speichert),
//  3. merkt sich Geheimnis + Beitritts-Code lokal (siehe hostSession).
//
// Gibt den Spiel-Datensatz zurück oder `null` bei einem Fehler (Fehler werden
// hier geloggt, damit die Setup-Seiten nur noch weiterleiten müssen).
export async function createGame<S extends BaseGameState>(
  state: S,
): Promise<GameRecord<S> | null> {
  const hostSecret =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);

  try {
    const response = await fetch("/api/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state, hostSecret }),
    });

    if (!response.ok) {
      console.error(await response.json());
      return null;
    }

    const { game } = (await response.json()) as { game: GameRecord<S> };
    rememberHostGame(game.id, game.code, hostSecret);

    return game;
  } catch (err) {
    console.error(err);
    return null;
  }
}
