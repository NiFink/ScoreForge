"use client";

import { useState } from "react";

import { format, useI18n } from "@/lib/i18n";
import type {
  BinokelParty,
  BinokelRound,
  BinokelSpecial,
} from "@/types/gameTypes";
import { createEmptyRound, roundToTens } from "@/features/binokel/utils";
import { MeldCalculator } from "./MeldCalculator";

// Easy Mode ist eine Geräte-Einstellung — jeder Spieler entscheidet selbst.
const EASY_MODE_KEY = "scoreforge:binokelEasyMode";

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

type Step = "bid" | "melds" | "tricks" | "special";

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
  const [easyMode, setEasyMode] = useState(
    () =>
      typeof window !== "undefined" &&
      window.localStorage.getItem(EASY_MODE_KEY) === "1",
  );
  const [calcPartyId, setCalcPartyId] = useState<string | null>(null);

  const toggleEasyMode = () => {
    setEasyMode((current) => {
      const next = !current;
      window.localStorage.setItem(EASY_MODE_KEY, next ? "1" : "0");
      return next;
    });
  };

  const calcParty = parties.find((party) => party.id === calcPartyId) ?? null;

  const isSpecial = draft.special !== null && draft.special !== undefined;

  // Die letzte Partei wird automatisch ausgerechnet: 250 minus die
  // Augen der anderen. Geht das nicht auf (Summe > 250), lässt sich die
  // Runde nicht speichern.
  const lastPartyId = parties[parties.length - 1]?.id;
  const enteredTricksSum = parties
    .filter((party) => party.id !== lastPartyId)
    .reduce((sum, party) => sum + (draft.tricks[party.id] ?? 0), 0);
  const computedLastTricks = 250 - enteredTricksSum;
  const tricksValid = computedLastTricks >= 0;
  const tricksSum = tricksValid ? 250 : enteredTricksSum;

  const bidderParty = parties.find(
    (party) => party.id === draft.bidderPartyId,
  );

  // Gebote nur in Zehnerschritten – 285/287 gibt es nicht.
  const setBid = (value: number) => {
    setDraft((current) => ({ ...current, bid: Math.max(0, roundToTens(value)) }));
  };

  const setSpecial = (value: BinokelSpecial | null) => {
    setDraft((current) => ({
      ...current,
      special: value,
      // Sonderspiel und Abgeben schließen sich aus.
      conceded: value === null ? current.conceded : null,
      specialMade: value === null ? null : current.specialMade ?? null,
    }));
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

  // Steigern immer normal; erst im Melden entscheidet sich 1000/1500.
  const steps: { key: Step; label: string }[] = [
    { key: "bid", label: t.binokel.bidStepTitle },
    { key: "melds", label: t.binokel.meldStepTitle },
    isSpecial
      ? { key: "special", label: t.binokel.resultStepTitle }
      : { key: "tricks", label: t.binokel.tricksStepTitle },
  ];

  const stepIndex = Math.max(
    0,
    steps.findIndex((entry) => entry.key === step),
  );
  const isLastStep = step === steps[steps.length - 1]?.key;

  const canContinue =
    step === "bid"
      ? !!draft.bidderPartyId && draft.bid !== null
      : step === "special"
        ? draft.specialMade !== null && draft.specialMade !== undefined
        : step === "tricks"
          ? tricksValid
          : true;

  // Schritt anklickbar, wenn er schon erreichbar ist bzw. gerade dran ist.
  const bidDone = !!draft.bidderPartyId && draft.bid !== null;
  const canGoToStep = (target: Step) => {
    if (target === "bid") {
      return true;
    }
    if (target === "melds") {
      return bidDone;
    }
    if (target === "tricks") {
      return bidDone && !isSpecial;
    }
    return bidDone && isSpecial;
  };

  const goToStep = (target: Step) => {
    if (target === step || !canGoToStep(target)) {
      return;
    }
    if (step === "bid" && draft.bid !== null) {
      setBid(draft.bid);
    }
    setStep(target);
  };

  const stepTitle =
    step === "bid"
      ? t.binokel.bidStepTitle
      : step === "melds"
        ? t.binokel.meldStepTitle
        : step === "tricks"
          ? t.binokel.tricksStepTitle
          : t.binokel.resultStepTitle;

  const finish = () => {
    onSave({
      ...draft,
      bid: draft.bid === null ? null : roundToTens(draft.bid),
      // Meldungen gibt es nur in Zehnerschritten (240, nicht 241).
      melds: Object.fromEntries(
        parties.map((party) => [
          party.id,
          roundToTens(draft.melds[party.id] ?? 0),
        ]),
      ),
      // Stiche auf Zehner runden; die letzte Partei ergibt sich aus 250 − Rest.
      tricks: Object.fromEntries(
        parties.map((party) => [
          party.id,
          party.id === lastPartyId
            ? Math.max(0, computedLastTricks)
            : roundToTens(draft.tricks[party.id] ?? 0),
        ]),
      ),
    });
  };

  const goNext = () => {
    if (step === "bid") {
      // Gebot beim Weitergehen auf Zehner runden.
      if (draft.bid !== null) {
        setBid(draft.bid);
      }
      setStep("melds");
      return;
    }

    if (step === "melds") {
      setStep(isSpecial ? "special" : "tricks");
      return;
    }

    // "tricks" oder "special" -> speichern
    finish();
  };

  const goPrevious = () => {
    if (step === "special" || step === "tricks") {
      setStep("melds");
    } else if (step === "melds") {
      setStep("bid");
    }
  };

  // Spielmacher gibt beim Melden ab -> sofort speichern (Stiche irrelevant).
  const concede = () => {
    onSave({
      ...draft,
      special: null,
      conceded: true,
      bid: draft.bid === null ? null : roundToTens(draft.bid),
      melds: Object.fromEntries(
        parties.map((party) => [
          party.id,
          roundToTens(draft.melds[party.id] ?? 0),
        ]),
      ),
      tricks: Object.fromEntries(
        parties.map((party) => [party.id, draft.tricks[party.id] ?? 0]),
      ),
    });
  };

  return (
    <div className="z-40 fixed inset-0 place-items-end sm:place-items-center grid bg-black/70 p-3">
      <div className="bg-[#18262f] shadow-2xl p-4 border border-(--accent)/25 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start gap-3 mb-4">
          <div>
            <p className="font-semibold text-(--accent) text-sm uppercase tracking-[0.16em]">
              {format(t.wizard.roundLabel, { n: roundNumber })}
            </p>
            <h2 className="mt-1 font-black text-2xl">{stepTitle}</h2>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-2 border border-[#f7e7ad]/15 rounded-md text-sm"
            type="button"
          >
            X
          </button>
        </div>

        {/* STEP INDICATOR — anklickbar, wenn der Schritt erreichbar ist */}
        <div className="gap-2 grid grid-cols-3 bg-[#101820] mb-4 p-1 rounded-lg">
          {steps.map((entry, index) => {
            const reachable = canGoToStep(entry.key);

            return (
              <button
                key={entry.key}
                onClick={() => goToStep(entry.key)}
                disabled={!reachable}
                className={`rounded-md px-2 py-2 text-center text-xs font-black ${
                  index === stepIndex
                    ? "bg-(--accent) text-(--on-accent)"
                    : reachable
                      ? "text-[#d8d3bd] hover:bg-[#18262f]"
                      : "text-[#5f7f92] cursor-not-allowed"
                }`}
                type="button"
              >
                {entry.label}
              </button>
            );
          })}
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
                onBlur={() => {
                  if (draft.bid !== null) {
                    setBid(draft.bid);
                  }
                }}
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
            <p className="mt-2 text-[#9fc9d5] text-xs">
              {t.binokel.bidTensNote}
            </p>
          </div>
        ) : step === "special" ? (
          <div>
            <p className="font-bold text-[#f7e7ad] text-sm">
              {format(t.binokel.allTricksQuestion, {
                name: bidderParty?.name ?? "",
                value: draft.special ?? 0,
              })}
            </p>
            <div className="space-y-2 mt-4">
              <button
                onClick={() =>
                  setDraft((current) => ({ ...current, specialMade: true }))
                }
                className={`w-full rounded-lg border px-4 py-4 text-left font-black ${
                  draft.specialMade === true
                    ? "border-(--accent) bg-(--accent)/15 text-(--accent-2)"
                    : "border-[#f7e7ad]/10 bg-[#101820]"
                }`}
                type="button"
              >
                {t.binokel.allTricksMade}
                <span className="block mt-0.5 font-bold text-[#9fc9d5] text-xs">
                  +{draft.special}
                </span>
              </button>
              <button
                onClick={() =>
                  setDraft((current) => ({ ...current, specialMade: false }))
                }
                className={`w-full rounded-lg border px-4 py-4 text-left font-black ${
                  draft.specialMade === false
                    ? "border-[#ef5b2a] bg-[#ef5b2a]/15 text-[#ef5b2a]"
                    : "border-[#f7e7ad]/10 bg-[#101820]"
                }`}
                type="button"
              >
                {t.binokel.allTricksFailed}
                <span className="block mt-0.5 font-bold text-[#9fc9d5] text-xs">
                  -{draft.special}
                </span>
              </button>
            </div>
            <p className="mt-4 text-[#9fc9d5] text-xs">
              {t.binokel.specialOthersNote}
            </p>
          </div>
        ) : step === "melds" ? (
          <div>
            {/* SPIELART: erst hier entscheidet sich Normal / 1000 / 1500 */}
            <p className="font-bold text-[#f7e7ad] text-sm">
              {t.binokel.bidType}
            </p>
            <div className="space-y-2 mt-3">
              {(
                [
                  {
                    value: null as BinokelSpecial | null,
                    label: t.binokel.normalBid,
                    hint: t.binokel.normalBidHint,
                  },
                  {
                    value: 1000 as BinokelSpecial | null,
                    label: t.binokel.durch1000,
                    hint: t.binokel.durchHint,
                  },
                  {
                    value: 1500 as BinokelSpecial | null,
                    label: t.binokel.aufgelegt1500,
                    hint: t.binokel.aufgelegtHint,
                  },
                ] as const
              ).map((option) => {
                const active = (draft.special ?? null) === option.value;

                return (
                  <button
                    key={String(option.value)}
                    onClick={() => setSpecial(option.value)}
                    className={`w-full rounded-lg border px-4 py-3 text-left ${
                      active
                        ? "border-(--accent) bg-(--accent)/15"
                        : "border-[#f7e7ad]/10 bg-[#101820]"
                    }`}
                    type="button"
                  >
                    <span className="block font-bold">{option.label}</span>
                    <span className="block mt-0.5 text-[#9fc9d5] text-xs">
                      {option.hint}
                    </span>
                  </button>
                );
              })}
            </div>

            {isSpecial ? (
              <p className="bg-[#101820] mt-4 p-3 rounded-lg text-[#9fc9d5] text-xs">
                {t.binokel.specialOthersNote}
              </p>
            ) : (
              <>
                <p className="mt-5 font-bold text-[#f7e7ad] text-sm">
                  {t.binokel.meldPoints}
                </p>
                <p className="mt-1 text-[#9fc9d5] text-xs">
                  {t.binokel.meldTensNote}
                </p>

                <button
                  onClick={toggleEasyMode}
                  className={`mt-3 w-full rounded-md border px-3 py-2 text-left text-sm font-bold ${
                    easyMode
                      ? "border-(--accent) bg-(--accent)/15 text-(--accent-2)"
                      : "border-[#f7e7ad]/10 bg-[#101820] text-[#d8d3bd]"
                  }`}
                  type="button"
                >
                  {easyMode ? "✓ " : ""}
                  {t.binokel.easyModeLabel}
                  <span className="block mt-0.5 font-normal text-[#9fc9d5] text-xs">
                    {t.binokel.easyModeHint}
                  </span>
                </button>

                <div className="space-y-2 mt-3">
                  {parties.map((party) => (
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
                      {easyMode ? (
                        <button
                          onClick={() => setCalcPartyId(party.id)}
                          className="px-3 py-3 border border-(--accent-2)/40 rounded-md font-black text-(--accent-2)"
                          title={t.binokel.calculatorTitle}
                          aria-label={t.binokel.calculatorTitle}
                          type="button"
                        >
                          {"🧮"}
                        </button>
                      ) : null}
                      <input
                        type="number"
                        inputMode="numeric"
                        step={10}
                        value={draft.melds[party.id] ?? ""}
                        onChange={(event) =>
                          setPartyValue(
                            "melds",
                            party.id,
                            parseNumber(event.target.value),
                          )
                        }
                        onBlur={() => {
                          const value = draft.melds[party.id];

                          if (value !== null && value !== undefined) {
                            setPartyValue(
                              "melds",
                              party.id,
                              Math.max(0, roundToTens(value)),
                            );
                          }
                        }}
                        className="bg-[#18262f] px-3 py-3 border border-[#f7e7ad]/10 focus:border-(--accent) rounded-md outline-none w-24 font-black text-lg text-center"
                      />
                    </div>
                  ))}
                </div>

                <button
                  onClick={onShowMelds}
                  className="mt-4 px-4 py-3 border border-(--accent-2)/40 rounded-md w-full font-bold text-[#9fc9d5] text-sm"
                  type="button"
                >
                  {t.binokel.showMelds}
                </button>

                {draft.bidderPartyId ? (
                  <div className="mt-4 pt-4 border-[#f7e7ad]/10 border-t">
                    <button
                      onClick={concede}
                      className="px-4 py-3 border border-[#ef5b2a]/40 rounded-md w-full font-black text-[#ef5b2a] text-sm"
                      type="button"
                    >
                      {t.binokel.concedeButton}
                    </button>
                    <p className="mt-2 text-[#9fc9d5] text-xs">
                      {t.binokel.concedeNote}
                    </p>
                  </div>
                ) : null}
              </>
            )}
          </div>
        ) : (
          <div>
            <p className="font-bold text-[#f7e7ad] text-sm">
              {t.binokel.tricksPoints}
            </p>
            <p className="mt-1 text-[#9fc9d5] text-xs">
              {t.binokel.includesLastTrick}
            </p>

            <p className="mt-1 text-[#9fc9d5] text-xs">
              {t.binokel.meldTensNote}
            </p>

            <div className="space-y-2 mt-3">
              {parties.map((party) => {
                const isLast = party.id === lastPartyId;

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
                    {isLast ? (
                      // Ergibt sich automatisch aus 250 − Rest
                      <div
                        className={`w-24 rounded-md border px-3 py-3 text-center text-lg font-black ${
                          tricksValid
                            ? "border-(--accent-2)/40 bg-[#18262f] text-(--accent-2)"
                            : "border-[#ef5b2a]/50 bg-[#ef5b2a]/10 text-[#ef5b2a]"
                        }`}
                        title="250 − Rest"
                      >
                        {computedLastTricks}
                      </div>
                    ) : (
                      <input
                        type="number"
                        inputMode="numeric"
                        step={10}
                        value={draft.tricks[party.id] ?? ""}
                        onChange={(event) =>
                          setPartyValue(
                            "tricks",
                            party.id,
                            parseNumber(event.target.value),
                          )
                        }
                        onBlur={() => {
                          const value = draft.tricks[party.id];

                          if (value !== null && value !== undefined) {
                            setPartyValue(
                              "tricks",
                              party.id,
                              Math.max(0, roundToTens(value)),
                            );
                          }
                        }}
                        className="bg-[#18262f] px-3 py-3 border border-[#f7e7ad]/10 focus:border-(--accent) rounded-md outline-none w-24 font-black text-lg text-center"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="bg-[#101820] mt-4 p-3 rounded-lg text-sm">
              <p className={tricksValid ? "text-[#2aa6c8]" : "text-[#ef5b2a]"}>
                {format(t.binokel.sumHint, { sum: tricksSum })}
              </p>
              <p className="mt-1 text-[#9fc9d5] text-xs">
                {t.binokel.exactCountNote}
              </p>
              <p className="mt-1 text-[#9fc9d5] text-xs">
                {t.binokel.noTricksNote}
              </p>
            </div>
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
            {isLastStep ? t.binokel.saveRound : t.common.next}
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

      {calcParty ? (
        <MeldCalculator
          partyName={calcParty.name}
          onApply={(sum) => {
            setPartyValue("melds", calcParty.id, sum);
            setCalcPartyId(null);
          }}
          onClose={() => setCalcPartyId(null)}
        />
      ) : null}
    </div>
  );
}
