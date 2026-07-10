"use client";

import { format, useI18n } from "@/lib/i18n";
import type {
  ModalPhase,
  Player,
  RoundEntry,
  ScoreTable,
} from "../../types/wizardTypes";

type GameModalProps = {
  activePlayer: Player;
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
  // Bombe/Wolke im Jubiläumsmodus: Vorhersage bleibt auch in der
  // "Tatsächlich"-Phase noch änderbar, weil sich die Stichzahl ändern kann.
  canEditBidAfterLock: boolean;
  previousDisabled: boolean;
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
  canEditBidAfterLock,
  previousDisabled,
  onClose,
  onMoveNext,
  onMovePrevious,
  onPhaseChange,
  onUpdateEntry,
}: GameModalProps) {
  const { t } = useI18n();
  const bidTabLocked = modalPhase === "actual" && !canEditBidAfterLock;

  return (
    <div className="z-50 fixed inset-0 place-items-end sm:place-items-center grid bg-black/70 p-3">
      <div className="bg-[#18262f] shadow-2xl p-4 border border-(--accent)/25 rounded-lg w-full max-w-md">
        <div className="flex justify-between items-start gap-3 mb-4">
          <div>
            <p className="font-semibold text-(--accent) text-sm uppercase tracking-[0.16em]">
              {format(t.wizard.roundLabel, { n: roundNumber })}
            </p>
            <p className="mt-1 text-[#9fc9d5] text-xs">
              {format(t.wizard.startPlayerShort, {
                n: roundStartPlayerIndex + 1,
              })}
            </p>
            <h2 className="mt-1 font-black text-2xl">
              {modalPhase === "bid" ? t.wizard.prediction : t.wizard.actualTricks}
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
            ["bid", t.wizard.predicted],
            ["actual", t.wizard.actual],
          ].map(([phase, label]) => (
            <button
              key={phase}
              disabled={
                (phase === "actual" && !activeRoundBidsDone) ||
                (phase === "bid" && bidTabLocked)
              }
              onClick={() => {
                if (
                  (phase === "actual" && !activeRoundBidsDone) ||
                  (phase === "bid" && bidTabLocked)
                ) {
                  return;
                }

                onPhaseChange(phase as ModalPhase);
              }}
              className={`rounded-md px-3 py-2 text-sm font-black ${
                modalPhase === phase
                  ? "bg-(--accent) text-(--on-accent)"
                  : (phase === "actual" && !activeRoundBidsDone) ||
                      (phase === "bid" && bidTabLocked)
                    ? "cursor-not-allowed text-[#5f7f92]"
                    : "text-[#d8d3bd]"
              }`}
              title={
                phase === "actual" && !activeRoundBidsDone
                  ? t.wizard.bidsFirst
                  : phase === "bid" && bidTabLocked
                    ? t.wizard.bidLocked
                    : undefined
              }
              type="button"
            >
              {label}
            </button>
          ))}
        </div>

        {modalPhase === "actual" && canEditBidAfterLock ? (
          <div className="space-y-1 mb-4">
            <p className="text-(--accent-2) text-xs">
              {t.wizard.bidEditableHint}
            </p>
            <p className="text-(--accent-2) text-xs">
              {t.wizard.actualVoidedHint}
            </p>
          </div>
        ) : null}

        <div
          key={`${modalPhase}-${activePlayer.id}`}
          className="bg-[#101820] p-4 rounded-lg transition"
          style={{ boxShadow: `inset 4px 0 0 ${activePlayer.color}` }}
        >
          <p className="text-[#9fc9d5] text-sm">{t.wizard.activePlayer}</p>
          <p className="mt-1 font-black text-2xl">{activePlayer.name}</p>
          <p className="mt-1 text-[#d8d3bd] text-sm">
            {format(t.wizard.pointsLabel, {
              points: totals[activePlayer.id] ?? 0,
            })}
          </p>

          <label className="block mt-5">
            <span className="font-bold text-[#f7e7ad] text-sm">
              {modalPhase === "bid" ? t.wizard.prediction : t.wizard.tricks}
            </span>
            <select
              className="bg-[#18262f] mt-2 px-3 py-4 border border-[#f7e7ad]/10 focus:border-(--accent) rounded-md outline-none w-full font-black text-lg"
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
                {t.common.select}
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
            <p className="mt-3 text-(--accent-2) text-sm">
              {format(t.wizard.lastPlayerBidHint, { n: roundNumber })}
            </p>
          ) : null}

          {modalPhase === "actual" && isLastTurnPlayer ? (
            <p className="mt-3 text-(--accent-2) text-sm">
              {format(t.wizard.lastPlayerActualHint, {
                min: actualMinimum,
                max: actualMaximum,
              })}
            </p>
          ) : null}
        </div>

        <div className="gap-2 grid grid-cols-2 mt-4">
          <button
            onClick={onMovePrevious}
            disabled={previousDisabled}
            className="disabled:opacity-35 px-4 py-3 border border-[#f7e7ad]/15 rounded-md font-black text-[#d8d3bd] disabled:cursor-not-allowed"
            type="button"
          >
            {t.common.previous}
          </button>
          <button
            onClick={onMoveNext}
            className="bg-(--accent) disabled:opacity-50 px-4 py-3 rounded-md font-black text-(--on-accent) disabled:cursor-not-allowed"
            type="button"
            disabled={
              modalPhase === "bid" && currentRound[activePlayer.id].bid === null
            }
          >
            {modalPhase === "actual" && isLastTurnPlayer
              ? t.common.done
              : t.common.next}
          </button>
        </div>
      </div>
    </div>
  );
}
