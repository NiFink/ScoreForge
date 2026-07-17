// Serverseitige Verifikation der Host-Berechtigung.
//
// Der Host beweist seine Berechtigung über ein Geheimnis (`hostSecret`), das
// nur auf seinem Gerät liegt (siehe lib/games/hostSession auf der Client-Seite).
// In der DB speichern wir ausschließlich den SHA-256-Hash davon.
//
// SICHERHEIT: Im alten Modell stand die Host-Kennung (`hostId`) in der
// öffentlich lesbaren `state`-Spalte - jeder konnte sie auslesen und als
// eigene `clientId` ausgeben, um Host-Rechte zu übernehmen oder ein Spiel zu
// löschen. Jetzt liegt nur ein Hash in der DB (zusätzlich per REVOKE verborgen,
// siehe supabase/setup.sql). Selbst wenn er je nach außen gelangt, lässt sich
// daraus das Rohgeheimnis nicht rekonstruieren.

export async function hashHostSecret(secret: string): Promise<string> {
  const bytes = new TextEncoder().encode(secret);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

// Konstant-zeitlicher Vergleich zweier Hex-Hashes (kein früher Abbruch, damit
// die Antwortzeit nichts über den korrekten Wert verrät).
export function hashesEqual(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  if (!a || !b || a.length !== b.length) {
    return false;
  }

  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return diff === 0;
}

// Prüft, ob der Aufrufer als Host autorisiert ist.
//  - Neue Spiele: SHA-256(providedSecret) muss zum gespeicherten Hash passen.
//  - Legacy-Spiele (vor der Migration, storedHash == null): Fallback auf den
//    alten clientId/hostId-Abgleich, damit bereits laufende Spiele nicht
//    ausgesperrt werden. Solche Spiele verfallen ohnehin nach spätestens 2 Tagen.
export async function isHostAuthorized(
  storedHash: string | null | undefined,
  providedSecret: string | undefined,
  legacyHostId: string | undefined,
  clientId: string | undefined,
): Promise<boolean> {
  if (storedHash) {
    if (typeof providedSecret !== "string" || !providedSecret) {
      return false;
    }

    return hashesEqual(await hashHostSecret(providedSecret), storedHash);
  }

  return !!clientId && clientId === legacyHostId;
}
