"use client";

import { useI18n } from "@/lib/i18n";
import type { Player } from "../../types/wizardTypes";

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
      <div className="bg-[#18262f] shadow-2xl p-5 border border-[#f59e22]/25 rounded-lg w-full max-w-md">
        <p className="font-semibold text-[#f59e22] text-sm uppercase tracking-[0.16em]">
          {t.wizard.beforeStart}
        </p>
        <h2 className="mt-1 font-black text-2xl">{t.wizard.whoStarts}</h2>
        <p className="mt-2 text-[#d8d3bd] text-sm">{t.wizard.chooseStarter}</p>

        <label className="block mt-5">
          <span className="font-bold text-[#f7e7ad] text-sm">
            {t.wizard.startPlayer}
          </span>
          <select
            className="bg-[#101820] mt-2 px-3 py-3 border border-[#f7e7ad]/10 focus:border-[#f59e22] rounded-md outline-none w-full font-bold text-[#fff4c7]"
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
          className="bg-[#f59e22] mt-5 px-4 py-3 rounded-md w-full font-black text-[#101820]"
          type="button"
        >
          {t.common.startGame}
        </button>
      </div>
    </div>
  );
}
