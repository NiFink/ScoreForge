"use client";

import { useI18n } from "@/lib/i18n";
import type { Language } from "@/lib/i18n/dictionaries";

const languages: Language[] = ["de", "en"];

export function LanguageSwitcher() {
  const { lang, setLanguage } = useI18n();

  return (
    <div className="inline-flex bg-(--sf-surface) p-1 border border-(--sf-text)/15 rounded-md">
      {languages.map((option) => (
        <button
          key={option}
          onClick={() => setLanguage(option)}
          className={`rounded px-2 py-1 text-xs font-black uppercase ${
            lang === option
              ? "bg-(--accent) text-(--on-accent)"
              : "text-(--sf-text-muted)"
          }`}
          type="button"
        >
          {option}
        </button>
      ))}
    </div>
  );
}
