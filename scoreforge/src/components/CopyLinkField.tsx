"use client";

import { useState } from "react";

import { useI18n } from "@/lib/i18n";

type CopyLinkFieldProps = {
  url: string;
};

// Schreibgeschütztes Link-Feld + Kopieren-Button, mit Fallback für
// Browser/Kontexte ohne (sicheren) Zugriff auf navigator.clipboard.
export function CopyLinkField({ url }: CopyLinkFieldProps) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = url;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex gap-2">
      <input
        readOnly
        value={url}
        onFocus={(event) => event.target.select()}
        className="bg-(--sf-bg) px-3 py-3 border border-(--sf-text)/10 rounded-md outline-none w-full text-(--sf-text-muted) text-xs truncate"
      />
      <button
        onClick={copy}
        className="bg-(--sf-bg) px-4 py-3 border border-(--accent-2)/40 rounded-md font-bold text-(--accent-2) text-sm whitespace-nowrap"
        type="button"
      >
        {copied ? t.common.linkCopied : t.common.copyLink}
      </button>
    </div>
  );
}
