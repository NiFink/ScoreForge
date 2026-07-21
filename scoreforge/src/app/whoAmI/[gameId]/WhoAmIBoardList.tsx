"use client";

import { useI18n } from "@/lib/i18n";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import type { Player } from "@/types/gameTypes";

type WhoAmIBoardListProps = {
  players: Player[];
  words: Record<string, string>;
  // Wessen Zeile maskiert wird ("??? (deine eigene)") - die eigene Identität.
  selfId: string;
};

export function WhoAmIBoardList({ players, words, selfId }: WhoAmIBoardListProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-2 text-left">
      {players.map((entry) => {
        const isSelf = entry.id === selfId;

        return (
          <div
            key={entry.id}
            className="flex justify-between items-center gap-3 bg-(--sf-bg) px-3 py-2.5 rounded-md"
            style={{ boxShadow: `inset 4px 0 0 ${entry.color}` }}
          >
            <span className="flex items-center gap-2 min-w-0 font-bold truncate">
              <PlayerAvatar color={entry.color} size="sm" />
              {entry.name}
            </span>
            <span
              className={`flex-none font-black text-right ${
                isSelf ? "text-(--sf-text-subtle)" : "text-(--accent-2)"
              }`}
            >
              {isSelf ? t.whoAmI.yourEntryHidden : words[entry.id] || "…"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
