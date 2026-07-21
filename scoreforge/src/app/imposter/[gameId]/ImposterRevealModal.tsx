"use client";

import { useState } from "react";

import { format, useI18n } from "@/lib/i18n";
import type { Player } from "@/types/gameTypes";

type ImposterRevealModalProps = {
  player: Player;
  isImposter: boolean;
  word: string;
  categoryLabel: string | null;
  onDone: () => void;
  onCancel: () => void;
};

export function ImposterRevealModal({
  player,
  isImposter,
  word,
  categoryLabel,
  onDone,
  onCancel,
}: ImposterRevealModalProps) {
  const { t } = useI18n();
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div className="z-50 fixed inset-0 place-items-center grid bg-black/80 p-3">
      <div className="bg-(--sf-surface) shadow-2xl p-6 border border-(--accent)/25 rounded-lg w-full max-w-md text-center">
        {!confirmed ? (
          <>
            <h2 className="font-black text-2xl">
              {format(t.imposter.revealConfirmTitle, { name: player.name })}
            </h2>
            <p className="mt-2 text-(--sf-text-muted) text-sm">
              {t.imposter.revealConfirmHint}
            </p>
            <div className="gap-2 grid grid-cols-2 mt-5">
              <button
                onClick={onCancel}
                className="px-4 py-3 border border-(--sf-text)/15 rounded-md font-bold text-(--sf-text-muted)"
                type="button"
              >
                {t.imposter.revealCancelButton}
              </button>
              <button
                onClick={() => setConfirmed(true)}
                className="bg-(--accent) px-4 py-3 rounded-md font-black text-(--on-accent)"
                type="button"
              >
                {format(t.imposter.revealConfirmButton, { name: player.name })}
              </button>
            </div>
          </>
        ) : isImposter ? (
          <>
            <div className="text-5xl">{"\u{1F575}\u{FE0F}"}</div>
            <h2 className="mt-3 font-black text-[#ef4444] text-2xl">
              {t.imposter.imposterRevealTitle}
            </h2>
            <p className="mt-2 text-(--sf-text-muted) text-sm">
              {t.imposter.imposterRevealHint}
            </p>
            <button
              onClick={onDone}
              className="bg-(--accent) mt-6 px-4 py-3 rounded-md w-full font-black text-(--on-accent)"
              type="button"
            >
              {t.imposter.continueButton}
            </button>
          </>
        ) : (
          <>
            {categoryLabel ? (
              <p className="font-semibold text-(--accent) text-xs uppercase tracking-[0.18em]">
                {format(t.imposter.categoryHint, { category: categoryLabel })}
              </p>
            ) : null}
            <p className="mt-1 text-(--sf-text-subtle) text-sm">
              {t.imposter.secretWordTitle}
            </p>
            <h2 className="mt-2 font-black text-4xl break-words">{word}</h2>
            <button
              onClick={onDone}
              className="bg-(--accent) mt-6 px-4 py-3 rounded-md w-full font-black text-(--on-accent)"
              type="button"
            >
              {t.imposter.continueButton}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
