"use client";

import { useMemo, useState } from "react";

import { format, useI18n } from "@/lib/i18n";

type MeldCalculatorProps = {
  partyName: string;
  onApply: (sum: number) => void;
  onClose: () => void;
};

type CalcRow = {
  id: string;
  name: string;
  value: number;
};

export function MeldCalculator({
  partyName,
  onApply,
  onClose,
}: MeldCalculatorProps) {
  const { t } = useI18n();
  const [counts, setCounts] = useState<Record<string, number>>({});

  // Aus der Meldbilder-Referenz abgeleitet; Trumpf-Varianten nur dort,
  // wo der Wert tatsächlich abweicht (Paar, Familie).
  const rows = useMemo(() => {
    const result: CalcRow[] = [];

    t.binokel.melds.forEach((meld, index) => {
      const value = Number(meld.value);

      if (Number.isFinite(value)) {
        result.push({ id: `meld-${index}`, name: meld.name, value });
      }

      const trumpValue = Number(meld.trump);

      if (
        meld.trump &&
        Number.isFinite(trumpValue) &&
        trumpValue !== value
      ) {
        result.push({
          id: `meld-${index}-trump`,
          name: `${meld.name} — ${t.binokel.inTrump}`,
          value: trumpValue,
        });
      }
    });

    return result;
  }, [t]);

  const sum = rows.reduce(
    (total, row) => total + row.value * (counts[row.id] ?? 0),
    0,
  );

  const changeCount = (rowId: string, delta: number) => {
    setCounts((current) => ({
      ...current,
      [rowId]: Math.max(0, (current[rowId] ?? 0) + delta),
    }));
  };

  return (
    <div className="z-50 fixed inset-0 place-items-end sm:place-items-center grid bg-black/75 p-3">
      <div className="bg-(--sf-surface) shadow-2xl p-4 border border-(--accent)/25 rounded-lg w-full max-w-md max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-start gap-3 mb-2">
          <div>
            <p className="font-semibold text-(--accent) text-sm uppercase tracking-[0.16em]">
              {partyName}
            </p>
            <h2 className="mt-1 font-black text-2xl">
              {t.binokel.calculatorTitle}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-2 border border-(--sf-text)/15 rounded-md text-sm"
            type="button"
          >
            X
          </button>
        </div>

        <p className="mb-3 text-(--sf-text-subtle) text-xs">{t.binokel.calculatorHint}</p>

        <div className="space-y-2">
          {rows.map((row) => {
            const count = counts[row.id] ?? 0;

            return (
              <div
                key={row.id}
                className={`flex items-center gap-2 rounded-lg border p-2 ${
                  count > 0
                    ? "border-(--accent)/50 bg-(--accent)/10"
                    : "border-(--sf-text)/10 bg-(--sf-bg)"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{row.name}</p>
                  <p className="font-black text-(--accent) text-sm">
                    {row.value}
                  </p>
                </div>
                <button
                  onClick={() => changeCount(row.id, -1)}
                  disabled={count === 0}
                  className="disabled:opacity-30 bg-(--sf-surface) px-3 py-2 border border-(--sf-text)/15 rounded-md font-black"
                  type="button"
                >
                  -
                </button>
                <p className="w-6 font-black text-center">{count}</p>
                <button
                  onClick={() => changeCount(row.id, 1)}
                  className="bg-(--sf-surface) px-3 py-2 border border-(--sf-text)/15 rounded-md font-black"
                  type="button"
                >
                  +
                </button>
              </div>
            );
          })}
        </div>

        <div className="gap-2 grid grid-cols-[auto_1fr] mt-4">
          <button
            onClick={() => setCounts({})}
            className="px-4 py-3 border border-(--sf-text)/15 rounded-md font-bold text-(--sf-text-muted) text-sm"
            type="button"
          >
            {t.binokel.calculatorReset}
          </button>
          <button
            onClick={() => onApply(sum)}
            className="bg-(--accent) px-4 py-3 rounded-md font-black text-(--on-accent)"
            type="button"
          >
            {format(t.binokel.calculatorApply, { sum })}
          </button>
        </div>
      </div>
    </div>
  );
}
