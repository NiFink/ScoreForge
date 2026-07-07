"use client";

import { format, useI18n } from "@/lib/i18n";
import type { ModalPhase, Player, ScoreTable } from "../../types/wizardTypes";
import {
  getRoundScore,
  getRoundStartIndex,
  isRoundUnlocked,
} from "../../Utils/wizardUtils";

type RoundTableProps = {
  players: Player[];
  table: ScoreTable;
  totals: Record<string, number>;
  startPlayerIndex: number;
  onOpenRound: (
    roundIndex: number,
    phase?: ModalPhase,
    playerIndex?: number,
  ) => void;
  onOpenPlayer: (playerIndex: number, roundIndex?: number) => void;
};

export function RoundTable({
  players,
  table,
  totals,
  startPlayerIndex,
  onOpenRound,
  onOpenPlayer,
}: RoundTableProps) {
  const { t } = useI18n();

  return (
    <div className="bg-[#14222b]/80 border border-(--accent)/20 rounded-lg overflow-x-auto">
      <table className="min-w-230 text-sm border-collapse">
        <thead>
          <tr>
            <th className="left-0 z-10 sticky bg-[#18262f] px-3 py-3 text-left">
              {t.common.players}
            </th>
            {table.map((_, roundIndex) => {
              const unlocked = isRoundUnlocked(table, players, roundIndex);
              const roundStartIndex = getRoundStartIndex(
                roundIndex,
                players.length,
                startPlayerIndex,
              );
              const roundStartPlayer = players[roundStartIndex];

              return (
                <th
                  key={roundIndex}
                  className="px-3 py-3 border-[#f7e7ad]/10 border-l min-w-40 text-center"
                >
                  <div className="flex flex-col justify-center items-center gap-2">
                    <button
                      onClick={() => onOpenRound(roundIndex)}
                      disabled={!unlocked}
                      className={`rounded-md px-3 py-2 font-black ${
                        unlocked
                          ? "bg-(--accent) text-(--on-accent)"
                          : "cursor-not-allowed bg-[#18262f] text-[#5f7f92]"
                      }`}
                      title={
                        unlocked
                          ? format(t.wizard.enterRound, { n: roundIndex + 1 })
                          : t.wizard.finishPreviousRound
                      }
                      type="button"
                    >
                      {unlocked ? t.common.round : "\u{1f512}"} {roundIndex + 1}
                    </button>
                    <span className="inline-flex items-center gap-1 bg-[#101820] px-2 py-1 rounded-full text-[#9fc9d5] text-[11px] leading-none">
                      <span
                        className="inline-block rounded-full w-2 h-2"
                        style={{ backgroundColor: roundStartPlayer?.color }}
                      />
                      {format(t.wizard.startShort, {
                        name: roundStartPlayer?.name ?? "",
                      })}
                    </span>
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {players.map((player, playerIndex) => (
            <tr key={player.id}>
              <th
                className="left-0 z-10 sticky bg-[#18262f] px-3 py-3 border-[#f7e7ad]/10 border-t text-left"
                style={{ boxShadow: `inset 4px 0 0 ${player.color}` }}
              >
                <button
                  className="block w-full text-left"
                  onClick={() => onOpenPlayer(playerIndex)}
                  type="button"
                >
                  <span className="block max-w-32 truncate">{player.name}</span>
                  <span className="text-[#9fc9d5] text-xs">
                    {format(t.wizard.scoreShort, {
                      points: totals[player.id] ?? 0,
                    })}
                  </span>
                </button>
              </th>
              {table.map((round, roundIndex) => {
                const entry = round[player.id];
                const points = getRoundScore(entry);

                return (
                  <td
                    key={`${player.id}-${roundIndex}`}
                    className="px-3 py-3 border-[#f7e7ad]/10 border-t border-l min-w-32 text-center"
                    style={{ background: `${player.color}14` }}
                  >
                    <button
                      className="gap-1 grid w-full text-center"
                      // onClick={() =>
                      //   onOpenRound(roundIndex, undefined, playerIndex)
                      // }
                      // type="button"
                    >
                      <span>
                        {t.wizard.bidShort} {entry.bid ?? "-"}
                      </span>
                      <span>
                        {t.wizard.tricks} {entry.actual ?? "-"}
                      </span>
                      <span
                        className={`font-black ${
                          points >= 0 ? "text-[#2aa6c8]" : "text-[#ef5b2a]"
                        }`}
                      >
                        {entry.actual === null ? "-" : points}
                      </span>
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
