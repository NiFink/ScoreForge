import type {
  ModalPhase,
  Player,
  RoundEntry,
  ScoreTable,
} from "../../types/wizardTypes";

type GameModalProps = {
  activePlayer: Player;
  activePlayerIndex: number;
  activeRoundBidsDone: boolean;
  allowedBidOptions: number[];
  actualMaximum: number;
  actualMinimum: number;
  currentRound: ScoreTable[number];
  modalPhase: ModalPhase;
  roundNumber: number;
  roundStartPlayerIndex: number;
  actualOptions: number[];
  isLastTurnPlayer: boolean;
  totals: Record<string, number>;
  onClose: () => void;
  onMoveNext: () => void;
  onMovePrevious: () => void;
  onPhaseChange: (phase: ModalPhase) => void;
  onUpdateEntry: (
    playerId: string,
    key: keyof RoundEntry,
    value: number,
  ) => void;
};

export function GameModal({
  activePlayer,
  activePlayerIndex,
  activeRoundBidsDone,
  allowedBidOptions,
  actualMaximum,
  actualMinimum,
  currentRound,
  modalPhase,
  roundNumber,
  roundStartPlayerIndex,
  actualOptions,
  isLastTurnPlayer,
  totals,
  onClose,
  onMoveNext,
  onMovePrevious,
  onPhaseChange,
  onUpdateEntry,
}: GameModalProps) {
  return (
    <div className="z-50 fixed inset-0 place-items-end sm:place-items-center grid bg-black/70 p-3">
      <div className="bg-[#18262f] shadow-2xl p-4 border border-[#f59e22]/25 rounded-lg w-full max-w-md">
        <div className="flex justify-between items-start gap-3 mb-4">
          <div>
            <p className="font-semibold text-[#f59e22] text-sm uppercase tracking-[0.16em]">
              Runde {roundNumber}
            </p>
            <p className="mt-1 text-[#9fc9d5] text-xs">
              Startspieler: Spieler {roundStartPlayerIndex + 1}
            </p>
            <h2 className="mt-1 font-black text-2xl">
              {modalPhase === "bid" ? "Vorhersage" : "Tatsächliche Stiche"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-2 border border-[#f7e7ad]/15 rounded-md text-sm"
            type="button"
          >
            X
          </button>
        </div>

        <div className="gap-2 grid grid-cols-2 bg-[#101820] mb-4 p-1 rounded-lg">
          {[
            ["bid", "Vorhergesagt"],
            ["actual", "Tatsächlich"],
          ].map(([phase, label]) => (
            <button
              key={phase}
              disabled={phase === "actual" && !activeRoundBidsDone}
              onClick={() => {
                if (phase === "actual" && !activeRoundBidsDone) {
                  return;
                }

                onPhaseChange(phase as ModalPhase);
              }}
              className={`rounded-md px-3 py-2 text-sm font-black ${
                modalPhase === phase
                  ? "bg-[#f59e22] text-[#101820]"
                  : phase === "actual" && !activeRoundBidsDone
                    ? "cursor-not-allowed text-[#5f7f92]"
                    : "text-[#d8d3bd]"
              }`}
              title={
                phase === "actual" && !activeRoundBidsDone
                  ? "Erst alle Vorhersagen eintragen"
                  : undefined
              }
              type="button"
            >
              {label}
            </button>
          ))}
        </div>

        <div
          key={`${modalPhase}-${activePlayer.id}`}
          className="bg-[#101820] p-4 rounded-lg transition"
          style={{ boxShadow: `inset 4px 0 0 ${activePlayer.color}` }}
        >
          <p className="text-[#9fc9d5] text-sm">Aktiver Spieler</p>
          <p className="mt-1 font-black text-2xl">{activePlayer.name}</p>
          <p className="mt-1 text-[#d8d3bd] text-sm">
            Punkte: {totals[activePlayer.id] ?? 0}
          </p>

          <label className="block mt-5">
            <span className="font-bold text-[#f7e7ad] text-sm">
              {modalPhase === "bid" ? "Vorhersage" : "Stiche"}
            </span>
            <select
              className="bg-[#18262f] mt-2 px-3 py-4 border border-[#f7e7ad]/10 focus:border-[#f59e22] rounded-md outline-none w-full font-black text-lg"
              value={
                modalPhase === "bid"
                  ? (currentRound[activePlayer.id].bid ?? "")
                  : (currentRound[activePlayer.id].actual ?? "")
              }
              onChange={(event) => {
                const value = Number(event.target.value);
                onUpdateEntry(
                  activePlayer.id,
                  modalPhase === "bid" ? "bid" : "actual",
                  value,
                );
              }}
            >
              <option value="" disabled>
                Auswählen
              </option>
              {(modalPhase === "bid" ? allowedBidOptions : actualOptions).map(
                (value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ),
              )}
            </select>
          </label>

          {modalPhase === "bid" && isLastTurnPlayer ? (
            <p className="mt-3 text-[#f7c65f] text-sm">
              Der letzte Spieler darf die Summe der Vorhersagen nicht genau auf
              {roundNumber} bringen.
            </p>
          ) : null}

          {modalPhase === "actual" && isLastTurnPlayer ? (
            <p className="mt-3 text-[#f7c65f] text-sm">
              Bei den tatsächlichen Stichen musst du zwischen {actualMinimum}{" "}
              und {actualMaximum} bleiben.
            </p>
          ) : null}
        </div>

        <div className="gap-2 grid grid-cols-2 mt-4">
          <button
            onClick={onMovePrevious}
            disabled={modalPhase === "bid" && activePlayerIndex === 0}
            className="disabled:opacity-35 px-4 py-3 border border-[#f7e7ad]/15 rounded-md font-black text-[#d8d3bd] disabled:cursor-not-allowed"
            type="button"
          >
            Zurück
          </button>
          <button
            onClick={onMoveNext}
            className="bg-[#f59e22] disabled:opacity-50 px-4 py-3 rounded-md font-black text-[#101820] disabled:cursor-not-allowed"
            type="button"
            disabled={
              modalPhase === "bid" && currentRound[activePlayer.id].bid === null
            }
          >
            {modalPhase === "actual" && isLastTurnPlayer ? "Fertig" : "Weiter"}
          </button>
        </div>
      </div>
    </div>
  );
}
