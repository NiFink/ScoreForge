"use client";

import { format, useI18n } from "@/lib/i18n";
import type { Player, ScoreTable } from "@/types/wizardTypes";
import { getRoundScore, getRoundStartIndex } from "@/features/wizard/utils";

type CurrentRoundCardProps = {
  players: Player[];
  round: ScoreTable[number] | undefined;
  roundIndex: number;
  totalRounds: number;
  startPlayerIndex: number;
  onOpenPlayer: (playerIndex: number) => void;
  // Startet die Eingabe für die Runde — Vorhersage oder Stiche, je nachdem
  // was als Nächstes ansteht.
  onStart: () => void;
};

// Zeigt nur die aktuell gespielte Runde als Karten-Liste: Vorhersage groß und
// prominent, tatsächliche Stiche und Punkte kleiner daneben. Ein kleiner
// Start-Button öffnet die Eingabe der Runde direkt.
export function CurrentRoundCard({
  players,
  round,
  roundIndex,
  totalRounds,
  startPlayerIndex,
  onOpenPlayer,
  onStart,
}: CurrentRoundCardProps) {
  const { t } = useI18n();

  if (!round) {
    return null;
  }

  const roundStartIndex = getRoundStartIndex(
    roundIndex,
    players.length,
    startPlayerIndex,
  );
  const roundStartPlayer = players[roundStartIndex];

  return (
    <section className="bg-(--sf-surface-2)/90 mb-4 p-4 border border-(--accent)/30 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <div>
          <p className="font-semibold text-(--accent) text-sm uppercase tracking-[0.16em]">
            {t.wizard.currentRoundTag}
          </p>
          <h2 className="mt-1 font-black text-xl">
            {format(t.wizard.roundProgress, {
              n: roundIndex + 1,
              total: totalRounds,
            })}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 bg-(--sf-bg) px-2 py-1 rounded-full text-(--sf-text-subtle) text-[11px] leading-none">
            <span
              className="inline-block rounded-full w-2 h-2"
              style={{ backgroundColor: roundStartPlayer?.color }}
            />
            {format(t.wizard.startShort, {
              name: roundStartPlayer?.name ?? "",
            })}
          </span>
          <button
            onClick={onStart}
            className="bg-(--accent) px-3 py-1.5 rounded-full font-black text-(--on-accent) text-xs"
            type="button"
          >
            {t.wizard.startRoundButton}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {players.map((player, playerIndex) => {
          const entry = round[player.id] ?? { bid: null, actual: null };
          const points = getRoundScore(entry);
          const hasActual = entry.actual !== null;

          return (
            <button
              key={player.id}
              onClick={() => onOpenPlayer(playerIndex)}
              className="flex items-center gap-3 bg-(--sf-bg) hover:bg-(--sf-surface-2) p-3 border border-(--sf-text)/10 rounded-lg w-full text-left transition"
              style={{ boxShadow: `inset 4px 0 0 ${player.color}` }}
              type="button"
            >
              <p className="flex-1 min-w-0 font-bold truncate">
                {player.name}
              </p>

              <div className="text-right">
                <p className="text-(--sf-text-subtle) text-[10px] uppercase tracking-wide">
                  {t.wizard.predicted}
                </p>
                <p className="font-black text-(--accent) text-2xl leading-none">
                  {entry.bid ?? "–"}
                </p>
              </div>

              <div className="w-12 text-right">
                <p className="text-(--sf-text-subtle) text-[10px] uppercase tracking-wide">
                  {t.wizard.actual}
                </p>
                <p className="font-bold text-(--sf-text-muted) text-lg leading-none">
                  {entry.actual ?? "–"}
                </p>
              </div>

              <p
                className={`w-12 text-right font-black text-lg ${
                  !hasActual
                    ? "text-(--sf-disabled)"
                    : points >= 0
                      ? "text-[#2aa6c8]"
                      : "text-[#ef5b2a]"
                }`}
              >
                {hasActual ? (points >= 0 ? `+${points}` : points) : "·"}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
