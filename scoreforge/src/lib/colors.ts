export const colorOptions = [
  { name: "Forge Orange", value: "#f59e22", emoji: "🐻" },
  { name: "Flamme", value: "#ef5b2a", emoji: "🦊" },
  { name: "Runen Cyan", value: "#2aa6c8", emoji: "🐬" },
  { name: "Gold", value: "#f7c65f", emoji: "🦁" },
  { name: "Creme", value: "#fff4c7", emoji: "🐑" },
  { name: "Stahlblau", value: "#5f7f92", emoji: "🐺" },
  { name: "Violett", value: "#a78bfa", emoji: "🦄" },
  { name: "Mint", value: "#34d399", emoji: "🐸" },
  // Erweiterte Palette - vor allem für Spiele mit vielen Spielern (z.B.
  // Mäxle mit bis zu 20 Leuten), damit Farbe/Tier nicht so schnell wiederholt.
  { name: "Pink", value: "#f472b6", emoji: "🦩" },
  { name: "Indigo", value: "#818cf8", emoji: "🦉" },
  { name: "Türkis", value: "#2dd4bf", emoji: "🐢" },
  { name: "Kastanie", value: "#a1662f", emoji: "🦫" },
  { name: "Limette", value: "#a3e635", emoji: "🦎" },
  { name: "Karmin", value: "#dc2626", emoji: "🦀" },
  { name: "Himmelblau", value: "#38bdf8", emoji: "🐧" },
  { name: "Bernstein", value: "#d97706", emoji: "🐝" },
  { name: "Schiefer", value: "#94a3b8", emoji: "🐘" },
  { name: "Magenta", value: "#e879f9", emoji: "🐙" },
  { name: "Smaragd", value: "#10b981", emoji: "🐊" },
  { name: "Pfirsich", value: "#fb923c", emoji: "🐿️" },
];

// Spiele mit max. 6 Spielern zeigen nur die ersten 8 Farben zur Auswahl (wie
// vor der erweiterten Palette) - Spiele, bei denen mehr als 6 Spieler
// eingestellt werden können, bekommen die volle Palette.
export const BASE_COLOR_COUNT = 8;
export const baseColorOptions = colorOptions.slice(0, BASE_COLOR_COUNT);

const emojiByColor = new Map(
  colorOptions.map((option) => [option.value, option.emoji]),
);

// Fallback für Farbwerte außerhalb der Palette (sollte praktisch nie vorkommen).
export function getPlayerEmoji(color: string): string {
  return emojiByColor.get(color) ?? "🐾";
}

// Etwas dunklere Variante der Spielerfarbe - als Avatar-Hintergrund, damit
// sich das (oft helle) Tier-Emoji besser davon abhebt als auf der reinen,
// oft sehr hellen Spielerfarbe.
export function getAvatarBackground(color: string, amount = 0.28): string {
  const clean = color.replace("#", "");
  const value = parseInt(clean, 16);
  const darken = (channel: number) =>
    Math.round(channel * (1 - amount))
      .toString(16)
      .padStart(2, "0");

  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;

  return `#${darken(r)}${darken(g)}${darken(b)}`;
}
