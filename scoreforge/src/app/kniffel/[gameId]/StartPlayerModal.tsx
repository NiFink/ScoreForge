"use client";

import { useI18n } from "@/lib/i18n";
import type { Player } from "@/types/gameTypes";

type StartPlayerModalProps = {
  players: Player[];
  selectedPlayerIndex: number;
  onChange: (playerIndex: number) => void;
  onConfirm: () => void;
};

export function StartPlayerModal({
  players,
  selectedPlayerIndex,
  onChange,
  onConfirm,
}: StartPlayerModalProps) {
  const { t } = useI18n();

  return (
    <div className="z-50 fixed inset-0 place-items-center grid bg-black/75 p-3">
      <div className="bg-(--sf-surface) shadow-2xl p-5 border border-(--accent)/25 rounded-lg w-full max-w-md">
        <p className="font-semibold text-(--accent) text-sm uppercase tracking-[0.16em]">
          {t.kniffel.beforeStart}
        </p>
        <h2 className="mt-1 font-black text-2xl">{t.kniffel.whoStarts}</h2>
        <p className="mt-2 text-(--sf-text-muted) text-sm">
          {t.kniffel.chooseStarter}
        </p>

        <label className="block mt-5">
          <span className="font-bold text-(--sf-text) text-sm">
            {t.kniffel.startPlayer}
          </span>
          <select
            className="bg-(--sf-bg) mt-2 px-3 py-3 border border-(--sf-text)/10 focus:border-(--accent) rounded-md outline-none w-full font-bold text-(--sf-text-strong)"
            value={selectedPlayerIndex}
            onChange={(event) => onChange(Number(event.target.value))}
          >
            {players.map((player, index) => (
              <option key={player.id} value={index}>
                {player.name}
              </option>
            ))}
          </select>
        </label>

        <button
          onClick={onConfirm}
          className="bg-(--accent) mt-5 px-4 py-3 rounded-md w-full font-black text-(--on-accent)"
          type="button"
        >
          {t.common.startGame}
        </button>
      </div>
    </div>
  );
}
