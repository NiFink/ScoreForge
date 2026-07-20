"use client";

import { useState } from "react";

import { format, useI18n } from "@/lib/i18n";
import type { Player, UniversalRound } from "@/types/gameTypes";

type RoundModalProps = {
  players: Player[];
  roundNumber: number;
  initialRound: UniversalRound | null;
  canDelete: boolean;
  onSave: (round: UniversalRound) => void;
  onDelete: () => void;
  onClose: () => void;
};

const parseNumber = (value: string): number | null => {
  if (value.trim() === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export function RoundModal({
  players,
  roundNumber,
  initialRound,
  canDelete,
  onSave,
  onDelete,
  onClose,
}: RoundModalProps) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<UniversalRound>(
    () =>
      initialRound ??
      Object.fromEntries(players.map((player) => [player.id, null])),
  );

  const setValue = (playerId: string, value: number | null) => {
    setDraft((current) => ({ ...current, [playerId]: value }));
  };

  const save = () => {
    onSave(
      Object.fromEntries(
        players.map((player) => [player.id, draft[player.id] ?? 0]),
      ),
    );
  };

  return (
    <div className="z-40 fixed inset-0 place-items-end sm:place-items-center grid bg-black/70 p-3">
      <div className="bg-(--sf-surface) shadow-2xl p-4 border border-(--accent)/25 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start gap-3 mb-4">
          <div>
            <p className="font-semibold text-(--accent) text-sm uppercase tracking-[0.16em]">
              {format(t.wizard.roundLabel, { n: roundNumber })}
            </p>
            <h2 className="mt-1 font-black text-2xl">
              {t.universal.pointsThisRound}
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

        <div className="space-y-2">
          {players.map((player) => (
            <div
              key={player.id}
              className="flex items-center gap-3 bg-(--sf-bg) p-3 border border-(--sf-text)/10 rounded-lg"
              style={{ boxShadow: `inset 4px 0 0 ${player.color}` }}
            >
              <p className="flex-1 font-bold truncate">{player.name}</p>
              <input
                type="number"
                inputMode="numeric"
                value={draft[player.id] ?? ""}
                onChange={(event) =>
                  setValue(player.id, parseNumber(event.target.value))
                }
                className="bg-(--sf-surface) px-3 py-3 border border-(--sf-text)/10 focus:border-(--accent) rounded-md outline-none w-24 font-black text-lg text-center"
              />
            </div>
          ))}
        </div>

        <button
          onClick={save}
          className="bg-(--accent) mt-5 px-4 py-3 rounded-md w-full font-black text-(--on-accent)"
          type="button"
        >
          {t.universal.saveRound}
        </button>

        {canDelete ? (
          <button
            onClick={onDelete}
            className="mt-3 px-4 py-2 border border-[#ef5b2a]/40 rounded-md w-full font-bold text-[#ef5b2a] text-sm"
            type="button"
          >
            {t.universal.deleteRound}
          </button>
        ) : null}
      </div>
    </div>
  );
}
