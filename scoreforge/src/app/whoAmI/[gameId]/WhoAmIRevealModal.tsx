"use client";

import { useState } from "react";

import { format, useI18n } from "@/lib/i18n";
import { categoryExamples } from "@/features/partyWords/utils";
import { WhoAmIBoardList } from "./WhoAmIBoardList";
import type {
  PartyCategorySelection,
  Player,
  WhoAmIWordMode,
} from "@/types/gameTypes";

type WhoAmIRevealModalProps = {
  player: Player;
  players: Player[];
  words: Record<string, string>;
  categoryKey: PartyCategorySelection;
  wordMode: WhoAmIWordMode;
  onDone: () => void;
  onCancel: () => void;
};

// Pass-and-play: Bestätigen "Bist du {name}?" -> Brett zeigen. Beliebig oft
// wiederholbar - "onDone" schließt nur das Modal, ohne dauerhaft zu sperren.
export function WhoAmIRevealModal({
  player,
  players,
  words,
  categoryKey,
  wordMode,
  onDone,
  onCancel,
}: WhoAmIRevealModalProps) {
  const { t } = useI18n();
  const [confirmed, setConfirmed] = useState(false);

  // Nur bei Kategorie-Modus gibt es eine feste Kategorie mit Beispielen -
  // beim "Selbst schreiben"-Modus haben sich die Spieler die Identitäten
  // gegenseitig ausgedacht.
  const categoryInfo =
    wordMode === "category"
      ? format(t.whoAmI.categoryInfoHint, {
          category:
            categoryKey === "random"
              ? t.partyWords.categoryRandomLabel
              : t.partyWords.categories[categoryKey].label,
          examples: categoryExamples(t.partyWords.categories, categoryKey).join(
            ", ",
          ),
        })
      : null;

  return (
    <div className="z-50 fixed inset-0 place-items-center grid bg-black/80 p-3">
      <div className="bg-(--sf-surface) shadow-2xl p-6 border border-(--accent)/25 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto text-center">
        {!confirmed ? (
          <>
            <h2 className="font-black text-2xl">
              {format(t.whoAmI.revealConfirmTitle, { name: player.name })}
            </h2>
            <p className="mt-2 text-(--sf-text-muted) text-sm">
              {t.whoAmI.revealConfirmHint}
            </p>
            <div className="gap-2 grid grid-cols-2 mt-5">
              <button
                onClick={onCancel}
                className="px-4 py-3 border border-(--sf-text)/15 rounded-md font-bold text-(--sf-text-muted)"
                type="button"
              >
                {t.whoAmI.revealCancelButton}
              </button>
              <button
                onClick={() => setConfirmed(true)}
                className="bg-(--accent) px-4 py-3 rounded-md font-black text-(--on-accent)"
                type="button"
              >
                {format(t.whoAmI.revealConfirmButton, { name: player.name })}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="font-black text-xl">{t.whoAmI.boardTitle}</h2>
            {categoryInfo ? (
              <p className="mt-2 text-(--sf-text-muted) text-sm">
                {categoryInfo}
              </p>
            ) : null}
            <div className="mt-4">
              <WhoAmIBoardList players={players} words={words} selfId={player.id} />
            </div>
            <button
              onClick={onDone}
              className="bg-(--accent) mt-6 px-4 py-3 rounded-md w-full font-black text-(--on-accent)"
              type="button"
            >
              {t.whoAmI.continueButton}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
