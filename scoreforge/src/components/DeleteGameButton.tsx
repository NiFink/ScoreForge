"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useI18n } from "@/lib/i18n";

type DeleteGameButtonProps = {
  onDelete: () => Promise<boolean>;
};

// Host-Aktion im Spiel-Header: löscht Lobby + Spielstand unwiderruflich,
// nach Bestätigung in einem Modal (kein natives window.confirm).
export function DeleteGameButton({ onDelete }: DeleteGameButtonProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const confirmDelete = async () => {
    setBusy(true);
    setFailed(false);

    const ok = await onDelete();

    if (ok) {
      router.push("/");
      return;
    }

    setFailed(true);
    setBusy(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-2 border border-[#ef5b2a]/30 rounded-md font-bold text-[#ef5b2a] text-sm whitespace-nowrap"
        type="button"
      >
        {"\u{1F5D1}️ "}
        {t.common.deleteGame}
      </button>

      {open ? (
        <div className="z-50 fixed inset-0 place-items-center grid bg-black/75 p-3">
          <div className="bg-[#18262f] shadow-2xl p-5 border border-[#ef5b2a]/40 rounded-lg w-full max-w-sm text-center">
            <p className="font-semibold text-[#ef5b2a] text-sm uppercase tracking-[0.16em]">
              {t.common.deleteGame}
            </p>
            <h2 className="mt-1 font-black text-2xl">
              {t.common.deleteConfirmTitle}
            </h2>
            <p className="mt-2 text-[#d8d3bd] text-sm">
              {t.common.deleteConfirmBody}
            </p>

            {failed ? (
              <p className="mt-3 text-[#ef5b2a] text-sm">
                {t.common.deleteFailed}
              </p>
            ) : null}

            <div className="gap-2 grid grid-cols-2 mt-5">
              <button
                onClick={() => setOpen(false)}
                disabled={busy}
                className="disabled:opacity-50 px-4 py-3 border border-[#f7e7ad]/15 rounded-md font-black text-[#d8d3bd] disabled:cursor-not-allowed"
                type="button"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={confirmDelete}
                disabled={busy}
                className="bg-[#ef5b2a] disabled:opacity-50 px-4 py-3 rounded-md font-black text-white disabled:cursor-wait"
                type="button"
              >
                {busy ? t.common.deleting : t.common.deleteConfirmButton}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
