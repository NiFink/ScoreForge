"use client";

import { useState } from "react";

import { format, useI18n } from "@/lib/i18n";
import {
  FIXED_CATEGORY_VALUES,
  isFixedCategory,
} from "@/features/kniffel/utils";
import type { KniffelCategory } from "@/types/gameTypes";

type CategoryModalProps = {
  playerName: string;
  category: KniffelCategory;
  currentValue: number | null;
  onSave: (value: number | null) => void;
  onClose: () => void;
};

const parseNumber = (value: string): number | null => {
  if (value.trim() === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : null;
};

export function CategoryModal({
  playerName,
  category,
  currentValue,
  onSave,
  onClose,
}: CategoryModalProps) {
  const { t } = useI18n();
  const fixed = isFixedCategory(category);
  const [draft, setDraft] = useState<number | null>(currentValue);

  const categoryLabel = t.kniffel.categories[category];
  const fixedValue = FIXED_CATEGORY_VALUES[category] ?? 0;

  return (
    <div className="z-40 fixed inset-0 place-items-end sm:place-items-center grid bg-black/70 p-3">
      <div className="bg-(--sf-surface) shadow-2xl p-4 border border-(--accent)/25 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start gap-3 mb-4">
          <div>
            <p className="font-semibold text-(--accent) text-sm uppercase tracking-[0.16em]">
              {playerName}
            </p>
            <h2 className="mt-1 font-black text-2xl">{categoryLabel}</h2>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-2 border border-(--sf-text)/15 rounded-md text-sm"
            type="button"
          >
            X
          </button>
        </div>

        {fixed ? (
          <div className="space-y-3">
            <button
              onClick={() => onSave(fixedValue)}
              className="bg-(--accent) px-4 py-4 rounded-lg w-full font-black text-(--on-accent)"
              type="button"
            >
              {format(t.kniffel.scoredValue, { points: fixedValue })}
            </button>
            <button
              onClick={() => onSave(0)}
              className="px-4 py-3 border border-(--sf-text)/15 rounded-md w-full font-bold text-(--sf-text-muted)"
              type="button"
            >
              {t.kniffel.notScored}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="font-bold text-(--sf-text) text-sm">
                {t.kniffel.enterValuePrompt}
              </label>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                autoFocus
                value={draft ?? ""}
                onChange={(event) => setDraft(parseNumber(event.target.value))}
                className="bg-(--sf-bg) mt-2 px-3 py-4 border border-(--sf-text)/10 focus:border-(--accent) rounded-md outline-none w-full font-black text-2xl text-center"
              />
            </div>

            <button
              onClick={() => onSave(draft)}
              disabled={draft === null}
              className="bg-(--accent) disabled:opacity-50 px-4 py-3 rounded-md w-full font-black text-(--on-accent) disabled:cursor-not-allowed"
              type="button"
            >
              {t.kniffel.saveValue}
            </button>

            <button
              onClick={() => onSave(0)}
              className="px-4 py-3 border border-(--sf-text)/15 rounded-md w-full font-bold text-(--sf-text-muted) text-sm"
              type="button"
            >
              {t.kniffel.strike}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
