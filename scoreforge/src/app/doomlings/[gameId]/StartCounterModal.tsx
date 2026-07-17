"use client";

import { useI18n } from "@/lib/i18n";
import type { Player } from "../../types/gameTypes";

type StartCounterModalProps = {
  players: Player[];
  selectedPlayerIndex: number;
  onChange: (playerIndex: number) => void;
  onConfirm: () => void;
};

export function StartCounterModal({
  players,
  selectedPlayerIndex,
  onChange,
  onConfirm,
}: StartCounterModalProps) {
  const { t } = useI18n();

  return (
    <div className="z-50 fixed inset-0 place-items-center grid bg-black/75 p-3">
      <div className="bg-[#18262f] shadow-2xl p-5 border border-(--accent)/25 rounded-lg w-full max-w-md">
        <p className="font-semibold text-(--accent) text-sm uppercase tracking-[0.16em]">
          {t.doomlings.beforeScoring}
        </p>
        <h2 className="mt-1 font-black text-2xl">{t.doomlings.whoCounts}</h2>
        <p className="mt-2 text-[#d8d3bd] text-sm">
          {t.doomlings.chooseCounter}
        </p>

        <label className="block mt-5">
          <span className="font-bold text-[#f7e7ad] text-sm">
            {t.doomlings.counterPlayer}
          </span>
          <select
            className="bg-[#101820] mt-2 px-3 py-3 border border-[#f7e7ad]/10 focus:border-(--accent) rounded-md outline-none w-full font-bold text-[#fff4c7]"
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
          {t.doomlings.startScoring}
        </button>
      </div>
    </div>
  );
}
