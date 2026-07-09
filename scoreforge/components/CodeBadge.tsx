"use client";

import { useState } from "react";

import { useI18n } from "@/lib/i18n";
import { QrCode } from "./QrCode";

type CodeBadgeProps = {
  code: string;
};

// Kleines QR-Symbol als visueller Hinweis, dass die Box einen QR-Code öffnet
function QrIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="3" height="3" />
      <rect x="18" y="14" width="3" height="3" />
      <rect x="14" y="18" width="3" height="3" />
      <rect x="18" y="18" width="3" height="3" />
    </svg>
  );
}

// Code-Chip im Spiel-Header: Antippen öffnet ein Modal mit QR-Code zum Beitreten
export function CodeBadge({ code }: CodeBadgeProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-[#18262f] hover:border-(--accent)/50 px-3 py-2 border border-[#f7e7ad]/10 rounded-md text-center transition"
        type="button"
      >
        <p className="flex justify-center items-center gap-1 text-[#9fc9d5]">
          <QrIcon />
          {t.common.code}
        </p>
        <p className="font-black tracking-widest">{code}</p>
      </button>

      {open ? (
        <div
          className="z-50 fixed inset-0 place-items-center grid bg-black/75 p-3"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-[#18262f] shadow-2xl p-5 border border-(--accent)/25 rounded-lg w-full max-w-xs text-center"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="font-semibold text-[#9fc9d5] text-sm uppercase tracking-[0.16em]">
              {t.lobby.joinCode}
            </p>
            <p className="mt-2 font-black text-(--accent) text-4xl tracking-[0.3em]">
              {code}
            </p>

            <div className="flex justify-center mt-4">
              <QrCode
                value={typeof window !== "undefined" ? window.location.href : ""}
              />
            </div>

            <p className="mt-3 text-[#d8d3bd] text-sm">{t.common.scanToJoin}</p>

            <button
              onClick={() => setOpen(false)}
              className="mt-4 px-4 py-3 border border-[#f7e7ad]/15 rounded-md w-full font-black text-[#d8d3bd]"
              type="button"
            >
              {t.common.close}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
