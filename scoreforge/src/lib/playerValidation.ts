// Namen werden getrimmt und ohne Beachtung von Groß-/Kleinschreibung
// verglichen, damit "Anna" und "anna " als derselbe Name gelten.
const normalizeName = (name: string) => name.trim().toLowerCase();

export function findDuplicateNamePlayerIds(
  players: { id: string; name: string }[],
): Set<string> {
  const idsByName = new Map<string, string[]>();

  for (const player of players) {
    const normalized = normalizeName(player.name);

    if (!normalized) {
      continue;
    }

    idsByName.set(normalized, [...(idsByName.get(normalized) ?? []), player.id]);
  }

  const duplicates = new Set<string>();

  for (const ids of idsByName.values()) {
    if (ids.length > 1) {
      ids.forEach((id) => duplicates.add(id));
    }
  }

  return duplicates;
}

export function hasDuplicateNames(players: { name: string }[]): boolean {
  const normalized = players
    .map((player) => normalizeName(player.name))
    .filter(Boolean);

  return new Set(normalized).size !== normalized.length;
}

// Für "neuen Spieler hinzufügen"-Formulare: prüft einen Namensentwurf
// gegen die bereits vorhandenen Spieler.
export function isNameTaken(
  name: string,
  existingPlayers: { name: string }[],
): boolean {
  const normalized = normalizeName(name);

  if (!normalized) {
    return false;
  }

  return existingPlayers.some(
    (player) => normalizeName(player.name) === normalized,
  );
}
