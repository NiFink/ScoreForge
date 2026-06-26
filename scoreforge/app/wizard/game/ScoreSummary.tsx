import type { Player } from "./types";

type ScoreSummaryProps = {
  totals: Record<string, number>;
  orderedPlayers: Player[];
  rankings: { max: number; min: number } | null;
};

export function ScoreSummary({
  totals,
  orderedPlayers,
  rankings,
}: ScoreSummaryProps) {
  return (
    <section className="grid grid-cols-3 gap-2 mb-4 pb-1">
      {orderedPlayers.map((player) => {
        const score = totals[player.id] ?? 0;
        const isFirst = rankings && score === rankings.max;
        const isLast =
          rankings && score === rankings.min && rankings.max !== rankings.min;

        return (
          <div
            key={player.id}
            className="bg-[#14222b]/90 p-2 sm:p-3 border border-[#f7e7ad]/10 rounded-lg min-w-0 w-full"
            style={{ boxShadow: `inset 4px 0 0 ${player.color}` }}
          >
            <p className="text-[#d8d3bd] text-sm truncate">{player.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="font-black text-2xl">{score}</p>
              {isFirst ? (
                <span aria-label="Erster Platz" title="Erster Platz">
                  {"\u2655"}
                </span>
              ) : null}
              {isLast ? (
                <span aria-label="Letzter Platz" title="Letzter Platz">
                  {"\u25bc"}
                </span>
              ) : null}
            </div>
          </div>
        );
      })}
    </section>
  );
}
