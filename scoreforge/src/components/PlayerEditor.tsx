"use client";

import { colorOptions } from "@/lib/colors";
import { useI18n } from "@/lib/i18n";
import { findDuplicateNamePlayerIds } from "@/lib/playerValidation";
import type { Player } from "@/app/types/gameTypes";

type PlayerEditorProps = {
  players: Player[];
  onUpdate: (index: number, key: "name" | "color", value: string) => void;
};

export function PlayerEditor({ players, onUpdate }: PlayerEditorProps) {
  const { t } = useI18n();
  const duplicateIds = findDuplicateNamePlayerIds(players);

  return (
    <div className="space-y-3">
      {players.map((player, index) => {
        const isDuplicate = duplicateIds.has(player.id);

        return (
          <div
            key={player.id}
            className="bg-[#18262f] p-3 border border-[#f7e7ad]/10 rounded-lg"
            style={{ boxShadow: `inset 4px 0 0 ${player.color}` }}
          >
            <input
              className={`w-full rounded-md border bg-[#101820] px-3 py-2 outline-none ${
                isDuplicate
                  ? "border-[#ef5b2a] focus:border-[#ef5b2a]"
                  : "border-[#f7e7ad]/10 focus:border-(--accent)"
              }`}
              value={player.name}
              onChange={(event) => onUpdate(index, "name", event.target.value)}
              placeholder={t.common.namePlaceholder}
            />
            {isDuplicate ? (
              <p className="mt-1 text-[#ef5b2a] text-xs">
                {t.common.nameTaken}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2 mt-2">
              {colorOptions.map((color) => {
                const taken = players.some(
                  (p, i) => p.color === color.value && i !== index,
                );

                return (
                  <button
                    key={color.value}
                    disabled={taken}
                    onClick={() => onUpdate(index, "color", color.value)}
                    title={taken ? t.common.colorTaken : color.name}
                    aria-label={taken ? t.common.colorTaken : color.name}
                    className={`relative h-8 w-8 rounded-md ${
                      taken
                        ? "cursor-not-allowed opacity-25"
                        : "cursor-pointer"
                    }`}
                    style={{ backgroundColor: color.value }}
                    type="button"
                  >
                    {taken ? (
                      <span
                        aria-hidden="true"
                        className="absolute inset-0 flex items-center justify-center text-sm font-black text-[#101820]"
                      >
                        {"✕"}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
