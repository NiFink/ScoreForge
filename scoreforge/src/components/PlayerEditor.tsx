"use client";

import { colorOptions as allColorOptions } from "@/lib/colors";
import { useI18n } from "@/lib/i18n";
import { findDuplicateNamePlayerIds } from "@/lib/playerValidation";
import { PlayerAvatar } from "./PlayerAvatar";
import type { Player } from "@/types/gameTypes";

type PlayerEditorProps = {
  players: Player[];
  onUpdate: (index: number, key: "name" | "color", value: string) => void;
  // Eingeschränkte Palette für Spiele mit wenigen Spielern (siehe lib/colors);
  // Standard ist die volle Palette.
  colorOptions?: typeof allColorOptions;
};

export function PlayerEditor({
  players,
  onUpdate,
  colorOptions = allColorOptions,
}: PlayerEditorProps) {
  const { t } = useI18n();
  const duplicateIds = findDuplicateNamePlayerIds(players);

  return (
    <div className="space-y-3">
      {players.map((player, index) => {
        const isDuplicate = duplicateIds.has(player.id);

        return (
          <div
            key={player.id}
            className="bg-(--sf-surface) p-3 border border-(--sf-text)/10 rounded-lg"
            style={{ boxShadow: `inset 4px 0 0 ${player.color}` }}
          >
            <div className="flex items-center gap-2">
              <PlayerAvatar color={player.color} size="xl" />
              <input
                className={`w-full rounded-md border bg-(--sf-bg) px-3 py-2 outline-none ${
                  isDuplicate
                    ? "border-[#ef5b2a] focus:border-[#ef5b2a]"
                    : "border-(--sf-text)/10 focus:border-(--accent)"
                }`}
                value={player.name}
                onChange={(event) =>
                  onUpdate(index, "name", event.target.value)
                }
                placeholder={t.common.namePlaceholder}
              />
            </div>
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
                const selected = player.color === color.value;

                return (
                  <button
                    key={color.value}
                    disabled={taken}
                    onClick={() => onUpdate(index, "color", color.value)}
                    title={taken ? t.common.colorTaken : color.name}
                    aria-label={taken ? t.common.colorTaken : color.name}
                    className={`relative flex h-9 w-9 items-center justify-center rounded-md text-lg ${
                      taken
                        ? "cursor-not-allowed opacity-25"
                        : "cursor-pointer"
                    }`}
                    style={{
                      backgroundColor: `${color.value}26`,
                      boxShadow: selected
                        ? `inset 0 0 0 2px ${color.value}`
                        : `inset 0 0 0 1px ${color.value}55`,
                    }}
                    type="button"
                  >
                    {taken ? (
                      <span
                        aria-hidden="true"
                        className="absolute inset-0 flex items-center justify-center text-sm font-black text-(--sf-text)"
                      >
                        {"✕"}
                      </span>
                    ) : (
                      <span aria-hidden="true">{color.emoji}</span>
                    )}
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
