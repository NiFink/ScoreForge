"use client";

import { useState } from "react";

import { format, useI18n } from "@/lib/i18n";
import { WhoAmIAuthorForm } from "./WhoAmIAuthorForm";

type WhoAmIAuthorModalProps = {
  writerName: string;
  targetName: string;
  onSubmit: (word: string) => void;
  onCancel: () => void;
};

// Pass-and-play: erst bestätigen, wer gerade schreibt, dann das Formular.
export function WhoAmIAuthorModal({
  writerName,
  targetName,
  onSubmit,
  onCancel,
}: WhoAmIAuthorModalProps) {
  const { t } = useI18n();
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div className="z-50 fixed inset-0 place-items-center grid bg-black/80 p-3">
      <div className="bg-(--sf-surface) shadow-2xl p-6 border border-(--accent)/25 rounded-lg w-full max-w-md text-center">
        {!confirmed ? (
          <>
            <h2 className="font-black text-2xl">
              {format(t.whoAmI.authoringWriterPrompt, { writer: writerName })}
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
                {format(t.whoAmI.authoringConfirmWriterButton, {
                  writer: writerName,
                })}
              </button>
            </div>
          </>
        ) : (
          <WhoAmIAuthorForm targetName={targetName} onSubmit={onSubmit} />
        )}
      </div>
    </div>
  );
}
