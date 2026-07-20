export const colorOptions = [
  { name: "Forge Orange", value: "#f59e22", emoji: "🐻" },
  { name: "Flamme", value: "#ef5b2a", emoji: "🦊" },
  { name: "Runen Cyan", value: "#2aa6c8", emoji: "🐬" },
  { name: "Gold", value: "#f7c65f", emoji: "🦁" },
  { name: "Creme", value: "#fff4c7", emoji: "🐑" },
  { name: "Stahlblau", value: "#5f7f92", emoji: "🐺" },
  { name: "Violett", value: "#a78bfa", emoji: "🦄" },
  { name: "Mint", value: "#34d399", emoji: "🐸" },
];

const emojiByColor = new Map(
  colorOptions.map((option) => [option.value, option.emoji]),
);

// Fallback für Farbwerte außerhalb der Palette (sollte praktisch nie vorkommen).
export function getPlayerEmoji(color: string): string {
  return emojiByColor.get(color) ?? "🐾";
}
