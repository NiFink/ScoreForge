"use client";

import { useState } from "react";

import { format, useI18n } from "@/lib/i18n";
import type { BinokelParty, BinokelRound } from "../../types/gameTypes";
import { createEmptyRound } from "../../Utils/binokelUtils";

type RoundModalProps = {
  parties: BinokelParty[];
  roundNumber: number;
  initialRound: BinokelRound | null;
  canDelete: boolean;
  onSave: (round: BinokelRound) => void;
  onDelete: () => void;
  onClose: () => void;
  onShowMelds: () => void;
};

type Step = "bid" | "melds" | "tricks";

const parseNumber = (value: string): number | null => {
  if (value.trim() === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export function RoundModal({
  parties,
  roundNumber,
  initialRound,
  canDelete,
  onSave,
  onDelete,
  onClose,
  onShowMelds,
}: RoundModalProps) {
  const { t } = useI18n();
  const [step, setStep] = useState<Step>("bid");
  const [draft, setDraft] = useState<BinokelRound>(
    () => initialRound ?? createEmptyRound(parties),
  );

  const tricksSum = parties.reduce(
    (sum, party) => sum + (draft.tricks[party.id] ?? 0),
    0,
  );

  const setBid = (value: number) => {
    setDraft((current) => ({ ...current, bid: Math.max(0, value) }));
  };

  const setPartyValue = (
    key: "melds" | "tricks",
    partyId: string,
    value: number | null,
  ) => {
    setDraft((current) => ({
      ...current,
      [key]: { ...current[key], [partyId]: value },
    }));
  };

  const stepIndex = step === "bid" ? 0 : step === "melds" ? 1 : 2;
  const canContinue =
    step !== "bid" || (!!draft.bidderPartyId && draft.bid !== null);

  const goNext = () => {
    if (step === "bid") {
      setStep("melds");
      return;
    }

    if (step === "melds") {
      setStep("tricks");
      return;
    }

    onSave({
      ...draft,
      melds: Object.fromEntries(
        parties.map((party) => [party.id, draft.melds[party.id] ?? 0]),
      ),
      tricks: Object.fromEntries(
        parties.map((party) => [party.id, draft.tricks[party.id] ?? 0]),
      ),
    });
  };

  const goPrevious = () => {
    if (step === "tricks") {
      setStep("melds");
    } else if (step === "melds") {
      setStep("bid");
    }
  };

  return (
    <div className="z-40 fixed inset-0 place-items-end sm:place-items-center grid bg-black/70 p-3">
      <div className="bg-[#18262f] shadow-2xl p-4 border border-(--accent)/25 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start gap-3 mb-4">
          <div>
            <p className="font-semibold text-(--accent) text-sm uppercase tracking-[0.16em]">
              {format(t.wizard.roundLabel, { n: roundNumber })}
            </p>
            <h2 className="mt-1 font-black text-2xl">
              {step === "bid"
                ? t.binokel.bidStepTitle
                : step === "melds"
                  ? t.binokel.meldStepTitle
                  : t.binokel.tricksStepTitle}
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

        {/* STEP INDICATOR */}
        <div className="gap-2 grid grid-cols-3 bg-[#101820] mb-4 p-1 rounded-lg">
          {[
            t.binokel.bidStepTitle,
            t.binokel.meldStepTitle,
            t.binokel.tricksStepTitle,
          ].map((label, index) => (
            <div
              key={label}
              className={`rounded-md px-2 py-2 text-center text-xs font-black ${
                index === stepIndex
                  ? "bg-(--accent) text-(--on-accent)"
                  : "text-[#5f7f92]"
              }`}
            >
              {label}
            </div>
          ))}
        </div>

        {step === "bid" ? (
          <div>
            <p className="font-bold text-[#f7e7ad] text-sm">
              {t.binokel.bidderQuestion}
            </p>
            <div className="space-y-2 mt-3">
              {parties.map((party) => (
                <button
                  key={party.id}
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      bidderPartyId: party.id,
                      bid: current.bid ?? 150,
                    }))
                  }
                  className={`w-full rounded-lg border px-4 py-3 text-left font-bold ${
                    draft.bidderPartyId === party.id
                      ? "border-(--accent) bg-(--accent)/15"
                      : "border-[#f7e7ad]/10 bg-[#101820]"
                  }`}
                  style={{ boxShadow: `inset 4px 0 0 ${party.color}` }}
                  type="button"
                >
                  {party.name}
                </button>
              ))}
            </div>

            <label className="block mt-5 font-bold text-[#f7e7ad] text-sm">
              {t.binokel.bid}
            </label>
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => setBid((draft.bid ?? 150) - 10)}
                className="bg-[#101820] px-4 py-3 rounded-md font-black text-[#d8d3bd]"
                type="button"
              >
                -10
              </button>
              <input
                type="number"
                inputMode="numeric"
                step={10}
                value={draft.bid ?? ""}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    bid: parseNumber(event.target.value),
                  }))
                }
                className="bg-[#101820] px-3 py-3 border border-[#f7e7ad]/10 focus:border-(--accent) rounded-md outline-none w-full font-black text-xl text-center"
              />
              <button
                onClick={() => setBid((draft.bid ?? 150) + 10)}
                className="bg-[#101820] px-4 py-3 rounded-md font-black text-[#d8d3bd]"
                type="button"
              >
                +10
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="font-bold text-[#f7e7ad] text-sm">
              {step === "melds" ? t.binokel.meldPoints : t.binokel.tricksPoints}
            </p>
            {step === "tricks" ? (
              <p className="mt-1 text-[#9fc9d5] text-xs">
                {t.binokel.includesLastTrick}
              </p>
            ) : null}

            <div className="space-y-2 mt-3">
              {parties.map((party) => {
                const value =
                  step === "melds"
                    ? draft.melds[party.id]
                    : draft.tricks[party.id];

                return (
                  <div
                    key={party.id}
                    className="flex items-center gap-3 bg-[#101820] p-3 border border-[#f7e7ad]/10 rounded-lg"
                    style={{ boxShadow: `inset 4px 0 0 ${party.color}` }}
                  >
                    <p className="flex-1 font-bold truncate">
                      {party.name}
                      {draft.bidderPartyId === party.id ? (
                        <span className="block font-normal text-(--accent) text-xs">
                          {t.binokel.bidder} · {draft.bid ?? 0}
                        </span>
                      ) : null}
                    </p>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={value ?? ""}
                      onChange={(event) =>
                        setPartyValue(
                          step === "melds" ? "melds" : "tricks",
                          party.id,
                          parseNumber(event.target.value),
                        )
                      }
                      className="bg-[#18262f] px-3 py-3 border border-[#f7e7ad]/10 focus:border-(--accent) rounded-md outline-none w-24 font-black text-lg text-center"
                    />
                  </div>
                );
              })}
            </div>

            {step === "melds" ? (
              <button
                onClick={onShowMelds}
                className="mt-4 px-4 py-3 border border-(--accent-2)/40 rounded-md w-full font-bold text-[#9fc9d5] text-sm"
                type="button"
              >
                {t.binokel.showMelds}
              </button>
            ) : (
              <div className="bg-[#101820] mt-4 p-3 rounded-lg text-sm">
                <p
                  className={
                    tricksSum === 250 ? "text-[#2aa6c8]" : "text-(--accent-2)"
                  }
                >
                  {format(t.binokel.sumHint, { sum: tricksSum })}
                </p>
                <p className="mt-1 text-[#9fc9d5] text-xs">
                  {t.binokel.exactCountNote}
                </p>
                <p className="mt-1 text-[#9fc9d5] text-xs">
                  {t.binokel.noTricksNote}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="gap-2 grid grid-cols-2 mt-5">
          <button
            onClick={goPrevious}
            disabled={step === "bid"}
            className="disabled:opacity-35 px-4 py-3 border border-[#f7e7ad]/15 rounded-md font-black text-[#d8d3bd] disabled:cursor-not-allowed"
            type="button"
          >
            {t.common.previous}
          </button>
          <button
            onClick={goNext}
            disabled={!canContinue}
            className="bg-(--accent) disabled:opacity-50 px-4 py-3 rounded-md font-black text-(--on-accent) disabled:cursor-not-allowed"
            type="button"
          >
            {step === "tricks" ? t.binokel.saveRound : t.common.next}
          </button>
        </div>

        {canDelete ? (
          <button
            onClick={onDelete}
            className="mt-3 px-4 py-2 border border-[#ef5b2a]/40 rounded-md w-full font-bold text-[#ef5b2a] text-sm"
            type="button"
          >
            {t.binokel.deleteRound}
          </button>
        ) : null}
      </div>
    </div>
  );
}
