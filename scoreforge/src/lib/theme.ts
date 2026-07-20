"use client";

import { useSyncExternalStore } from "react";

export type Theme = "dark" | "light";

const STORAGE_KEY = "scoreforge:theme";

let currentTheme: Theme | null = null;
const listeners = new Set<() => void>();

function applyThemeToDocument(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

function getThemeSnapshot(): Theme {
  if (currentTheme) {
    return currentTheme;
  }

  if (typeof window === "undefined") {
    return "dark";
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  currentTheme = stored === "light" ? "light" : "dark";
  applyThemeToDocument(currentTheme);
  return currentTheme;
}

function getServerTheme(): Theme {
  return "dark";
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setTheme(theme: Theme) {
  currentTheme = theme;
  window.localStorage.setItem(STORAGE_KEY, theme);
  applyThemeToDocument(theme);
  listeners.forEach((listener) => listener());
}

export function useTheme() {
  const theme = useSyncExternalStore(
    subscribe,
    getThemeSnapshot,
    getServerTheme,
  );

  return { theme, setTheme };
}
