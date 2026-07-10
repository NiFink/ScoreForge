"use client";

import { colorOptions } from "@/lib/colors";
import { useI18n } from "@/lib/i18n";
import type { Player } from "@/app/types/gameTypes";

type PlayerEditorProps = {
  players: Player[];
  onUpdate: (index: number, key: "name" | "color", value: string) => void;
};

export function PlayerEditor({ players, onUpdate }: PlayerEditorProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-3">
      {players.map((player, index) => (
        <div
          key={player.id}
          className="bg-[#18262f] p-3 border border-[#f7e7ad]/10 rounded-lg"
          style={{ boxShadow: `inset 4px 0 0 ${player.color}` }}
        >
          <input
            className="bg-[#101820] px-3 py-2 border border-[#f7e7ad]/10 focus:border-(--accent) rounded-md outline-none w-full"
            value={player.name}
            onChange={(event) => onUpdate(index, "name", event.target.value)}
            placeholder={t.common.namePlaceholder}
          />

          <div className="flex gap-2 mt-2">
            {colorOptions.map((color) => {
              const taken = players.some(
                (p, i) => p.color === color.value && i !== index,
              );

              return (
                <button
                  key={color.value}
                  disabled={taken}
                  onClick={() => onUpdate(index, "color", color.value)}
                  className={`w-8 h-8 rounded-md ${taken ? "opacity-30" : ""}`}
                  style={{ backgroundColor: color.value }}
                  type="button"
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
