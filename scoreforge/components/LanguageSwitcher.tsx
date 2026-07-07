"use client";

import { useI18n } from "@/lib/i18n";
import type { Language } from "@/lib/i18n/dictionaries";

const languages: Language[] = ["de", "en"];

export function LanguageSwitcher() {
  const { lang, setLanguage } = useI18n();

  return (
    <div className="inline-flex bg-[#18262f] p-1 border border-[#f7e7ad]/15 rounded-md">
      {languages.map((option) => (
        <button
          key={option}
          onClick={() => setLanguage(option)}
          className={`rounded px-2 py-1 text-xs font-black uppercase ${
            lang === option
              ? "bg-[#f59e22] text-[#101820]"
              : "text-[#d8d3bd]"
          }`}
          type="button"
        >
          {option}
        </button>
      ))}
    </div>
  );
}
