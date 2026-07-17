"use client";

import { useSyncExternalStore } from "react";

import { dictionaries, type Language } from "./dictionaries";

const STORAGE_KEY = "scoreforge:lang";

let currentLang: Language | null = null;
const listeners = new Set<() => void>();

function getLanguageSnapshot(): Language {
  if (currentLang) {
    return currentLang;
  }

  if (typeof window === "undefined") {
    return "de";
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  currentLang = stored === "en" ? "en" : "de";
  return currentLang;
}

function getServerLanguage(): Language {
  return "de";
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setLanguage(lang: Language) {
  currentLang = lang;
  window.localStorage.setItem(STORAGE_KEY, lang);
  listeners.forEach((listener) => listener());
}

export function useI18n() {
  const lang = useSyncExternalStore(
    subscribe,
    getLanguageSnapshot,
    getServerLanguage,
  );

  return { lang, t: dictionaries[lang], setLanguage };
}

export function format(
  template: string,
  values: Record<string, string | number>,
) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    String(values[key] ?? ""),
  );
}
