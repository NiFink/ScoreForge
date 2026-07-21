import type { CSSProperties } from "react";

import type { GameType } from "@/types/gameTypes";

export type GameThemeKey = GameType | "forge";

export type GameTheme = {
  label: string;
  // CSS-Variablen, die die Akzentklassen (bg-(--accent) usw.) der Seite steuern
  style: CSSProperties;
  hex: string;
  hex2: string;
  gradient: string;
};

const makeStyle = (
  accent: string,
  accent2: string,
  onAccent = "#101820",
): CSSProperties =>
  ({
    "--accent": accent,
    "--accent-2": accent2,
    "--on-accent": onAccent,
  }) as CSSProperties;

export const gameThemes: Record<GameThemeKey, GameTheme> = {
  // ScoreForge-Standard (Startseite, Beitreten)
  forge: {
    label: "ScoreForge",
    style: makeStyle("#f59e22", "#2aa6c8"),
    hex: "#f59e22",
    hex2: "#2aa6c8",
    gradient: "bg-linear-to-r from-[#f59e22] to-[#f7e7ad]",
  },
  // Wizard: Lila/Gold wie die Spielschachtel
  wizard: {
    label: "Wizard",
    style: makeStyle("#a78bfa", "#f7c65f"),
    hex: "#a78bfa",
    hex2: "#f7c65f",
    gradient: "bg-linear-to-r from-[#7c3aed] to-[#c4b5fd]",
  },
  // Doomlings: Türkis/Koralle wie das Artwork
  doomlings: {
    label: "Doomlings",
    style: makeStyle("#2dd4bf", "#fb7185"),
    hex: "#2dd4bf",
    hex2: "#fb7185",
    gradient: "bg-linear-to-r from-[#14b8a6] to-[#fb7185]",
  },
  // Binokel: Grün/Mint/Weiß wie das württembergische Blatt
  binokel: {
    label: "Binokel",
    style: makeStyle("#34d399", "#f8fafc"),
    hex: "#34d399",
    hex2: "#f8fafc",
    gradient: "bg-linear-to-r from-[#059669] to-[#a7f3d0]",
  },
  // Universal: neutrales Blau/Gold — passt zu jedem Spiel
  universal: {
    label: "Universal",
    style: makeStyle("#60a5fa", "#fbbf24"),
    hex: "#60a5fa",
    hex2: "#fbbf24",
    gradient: "bg-linear-to-r from-[#2563eb] to-[#93c5fd]",
  },
  // Kniffel: Rubinrot/Gold — Würfelspiel-Assoziation
  kniffel: {
    label: "Kniffel",
    style: makeStyle("#e11d48", "#fbbf24"),
    hex: "#e11d48",
    hex2: "#fbbf24",
    gradient: "bg-linear-to-r from-[#be123c] to-[#fde68a]",
  },
  // Mäxle: Galgenholz-Braun/Wiesengrün — passend zur Galgenmännchen-Grafik
  maexle: {
    label: "Mäxle",
    style: makeStyle("#c2793a", "#4ade80"),
    hex: "#c2793a",
    hex2: "#4ade80",
    gradient: "bg-linear-to-r from-[#92400e] to-[#86efac]",
  },
  // Imposter: Alarmrot/Verdächtig-Cyan — Among-Us-artige Bluff-Stimmung
  imposter: {
    label: "Imposter",
    style: makeStyle("#ef4444", "#22d3ee"),
    hex: "#ef4444",
    hex2: "#22d3ee",
    gradient: "bg-linear-to-r from-[#b91c1c] to-[#67e8f9]",
  },
  // Wer bin ich: Violett/Gold — Rätsel- und Detektiv-Stimmung
  whoAmI: {
    label: "Wer bin ich?",
    style: makeStyle("#8b5cf6", "#fbbf24"),
    hex: "#8b5cf6",
    hex2: "#fbbf24",
    gradient: "bg-linear-to-r from-[#6d28d9] to-[#fde68a]",
  },
};

export function themeForGameType(gameType: string | undefined): GameTheme {
  if (gameType && gameType in gameThemes) {
    return gameThemes[gameType as GameThemeKey];
  }

  return gameThemes.forge;
}
