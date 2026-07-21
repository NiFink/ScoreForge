"use client";

import { useState } from "react";

import { format, useI18n } from "@/lib/i18n";

type WhoAmIAuthorFormProps = {
  targetName: string;
  onSubmit: (word: string) => void;
};

// Eingabeformular "Schreib eine Identität für {target}" - wird sowohl im
// Pass-and-play-Modal (nach Bestätigung) als auch inline auf dem eigenen
// Gerät (Mehrgeräte-Automodus) verwendet.
export function WhoAmIAuthorForm({ targetName, onSubmit }: WhoAmIAuthorFormProps) {
  const { t } = useI18n();
  const [draft, setDraft] = useState("");

  const submit = () => {
    const trimmed = draft.trim();

    if (!trimmed) {
      return;
    }

    onSubmit(trimmed);
    setDraft("");
  };

  return (
    <div>
      <p className="text-(--sf-text-muted) text-sm">
        {format(t.whoAmI.authoringInstruction, { target: targetName })}
      </p>
      <input
        autoFocus
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            submit();
          }
        }}
        placeholder={t.whoAmI.authoringPlaceholder}
        maxLength={40}
        className="bg-(--sf-bg) mt-3 px-3 py-3 border border-(--sf-text)/10 focus:border-(--accent) rounded-md outline-none w-full font-bold text-center"
      />
      <button
        onClick={submit}
        disabled={!draft.trim()}
        className="bg-(--accent) disabled:opacity-50 mt-3 px-4 py-3 rounded-md w-full font-black text-(--on-accent) disabled:cursor-not-allowed"
        type="button"
      >
        {t.whoAmI.authoringSubmitButton}
      </button>
    </div>
  );
}
