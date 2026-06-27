"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { GameModal } from "./GameModal";
import { StartPlayerModal } from "./StartPlayerModal";
import { RoundTable } from "./RoundTable";
import { ScoreSummary } from "./ScoreSummary";
import type { ModalPhase, RoundEntry, ScoreTable, Setup } from "./types";
import {
  createScoreTable,
  getRoundScore,
  getActualRoundOptions,
  getRoundTurnOrder,
  isRoundPhaseComplete,
  isRoundUnlocked,
  rankPlayers,
} from "./utils";

export default function WizardGame() {
  const router = useRouter();
  const [setup, setSetup] = useState<Setup | null>(null);
  const [table, setTable] = useState<ScoreTable>([]);
  const [activeRound, setActiveRound] = useState(0);
  const [modalPhase, setModalPhase] = useState<ModalPhase | null>(null);
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);
  const [startPlayerIndexDraft, setStartPlayerIndexDraft] = useState(0);
  const [isStartPlayerModalOpen, setIsStartPlayerModalOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("scoreforge:wizard:setup");

    if (!stored) {
      router.replace("/wizard/setup");
      return;
    }

    queueMicrotask(() => {
      const parsed = JSON.parse(stored) as Setup;
      setSetup(parsed);
      setTable(createScoreTable(parsed.rounds, parsed.players));
      setStartPlayerIndexDraft(parsed.startPlayerIndex ?? 0);
      setIsStartPlayerModalOpen(true);
    });
  }, [router]);

  const totals = useMemo(() => {
    if (!setup) {
      return {};
    }

    return Object.fromEntries(
      setup.players.map((player) => [
        player.id,
        table.reduce((sum, round) => sum + getRoundScore(round[player.id]), 0),
      ]),
    );
  }, [setup, table]);

  const currentRound = table[activeRound];
  const roundNumber = activeRound + 1;
  const activePlayer = setup?.players[activePlayerIndex];
  const rankings = setup ? rankPlayers(setup.players, totals) : null;
  const resolvedStartPlayerIndex = isStartPlayerModalOpen
    ? startPlayerIndexDraft
    : (setup?.startPlayerIndex ?? 0);
  const roundTurnOrder = useMemo(() => {
    if (!setup) {
      return [];
    }

    return getRoundTurnOrder(
      activeRound,
      setup.players.length,
      resolvedStartPlayerIndex,
    );
  }, [activeRound, resolvedStartPlayerIndex, setup]);
  const activeTurnPosition = roundTurnOrder.indexOf(activePlayerIndex);
  const isLastTurnPlayer =
    !!setup && activeTurnPosition === roundTurnOrder.length - 1;
  const roundStartPlayerIndex = roundTurnOrder[0] ?? 0;

  const scoreOrderedPlayers = useMemo(() => {
    if (!setup) {
      return [];
    }

    const playerOrder = new Map(
      setup.players.map((player, index) => [player.id, index]),
    );

    return [...setup.players].sort((left, right) => {
      const leftScore = totals[left.id] ?? 0;
      const rightScore = totals[right.id] ?? 0;

      if (leftScore !== rightScore) {
        return rightScore - leftScore;
      }

      return (playerOrder.get(left.id) ?? 0) - (playerOrder.get(right.id) ?? 0);
    });
  }, [setup, totals]);

  const openRound = (
    roundIndex: number,
    phase?: ModalPhase,
    playerIndex?: number,
  ) => {
    if (!setup || !isRoundUnlocked(table, setup.players, roundIndex)) {
      return;
    }

    const round = table[roundIndex];
    const bidsDone = isRoundPhaseComplete(round, setup.players, "bid");
    const nextPhase = phase ?? (bidsDone ? "actual" : "bid");
    const roundOrder = getRoundTurnOrder(
      roundIndex,
      setup.players.length,
      resolvedStartPlayerIndex,
    );
    const startPlayerIndex = roundOrder[0] ?? 0;

    if (nextPhase === "actual" && !bidsDone) {
      return;
    }

    setActiveRound(roundIndex);
    setActivePlayerIndex(playerIndex ?? startPlayerIndex);
    setModalPhase(nextPhase);
  };

  const openPlayerInCurrentRound = (playerIndex: number) => {
    openRound(activeRound, undefined, playerIndex);
  };

  const updateEntry = (
    playerId: string,
    key: keyof RoundEntry,
    value: number,
  ) => {
    setTable((current) =>
      current.map((round, index) =>
        index === activeRound
          ? {
              ...round,
              [playerId]: {
                ...round[playerId],
                [key]: value,
              },
            }
          : round,
      ),
    );
  };

  const moveNext = () => {
    if (!setup || !modalPhase) {
      return;
    }

    if (
      modalPhase === "actual" &&
      activePlayer &&
      currentRound &&
      actualOptions.length === 1
    ) {
      const forcedValue = actualOptions[0];
      const currentActual = currentRound[activePlayer.id]?.actual;

      if (currentActual !== forcedValue) {
        setTable((current) =>
          current.map((round, index) =>
            index === activeRound
              ? {
                  ...round,
                  [activePlayer.id]: {
                    ...round[activePlayer.id],
                    actual: forcedValue,
                  },
                }
              : round,
          ),
        );
      }
    }

    if (activeTurnPosition === -1) {
      setActivePlayerIndex(roundTurnOrder[0] ?? 0);
      return;
    }

    const nextTurnPosition = activeTurnPosition + 1;

    if (nextTurnPosition < roundTurnOrder.length) {
      setActivePlayerIndex(roundTurnOrder[nextTurnPosition]);
      return;
    }

    if (
      modalPhase === "bid" &&
      currentRound &&
      isRoundPhaseComplete(currentRound, setup.players, "bid")
    ) {
      setModalPhase("actual");
      setActivePlayerIndex(roundTurnOrder[0] ?? 0);
      return;
    }

    setModalPhase(null);
  };

  const movePrevious = () => {
    if (!setup || !modalPhase) {
      return;
    }

    if (activeTurnPosition === -1) {
      setActivePlayerIndex(roundTurnOrder[0] ?? 0);
      return;
    }

    const previousTurnPosition = activeTurnPosition - 1;

    if (previousTurnPosition >= 0) {
      setActivePlayerIndex(roundTurnOrder[previousTurnPosition]);
      return;
    }

    if (modalPhase === "actual") {
      setModalPhase("bid");
      setActivePlayerIndex(roundTurnOrder[roundTurnOrder.length - 1] ?? 0);
    }
  };

  const allowedBidOptions = useMemo(() => {
    if (!setup || !currentRound || !activePlayer) {
      return [];
    }

    const allOptions = Array.from({ length: roundNumber + 1 }, (_, i) => i);

    if (!isLastTurnPlayer) {
      return allOptions;
    }

    const previousBids = roundTurnOrder
      .slice(0, -1)
      .reduce((sum, playerIndex) => {
        const playerId = setup.players[playerIndex]?.id;
        return sum + (playerId ? (currentRound[playerId]?.bid ?? 0) : 0);
      }, 0);

    return allOptions.filter((option) => previousBids + option !== roundNumber);
  }, [
    activePlayer,
    currentRound,
    isLastTurnPlayer,
    roundNumber,
    roundTurnOrder,
    setup,
  ]);

  const actualOptions =
    setup && currentRound && modalPhase === "actual" && activePlayer
      ? (() => {
          const actualTurnPosition = roundTurnOrder.indexOf(activePlayerIndex);
          const takenSoFar = roundTurnOrder
            .slice(0, actualTurnPosition)
            .reduce((sum, playerIndex) => {
              const playerId = setup.players[playerIndex]?.id;
              return (
                sum + (playerId ? (currentRound[playerId]?.actual ?? 0) : 0)
              );
            }, 0);

          return getActualRoundOptions(roundNumber, takenSoFar);
        })()
      : [];

  const actualMinimum = actualOptions[0] ?? 0;
  const actualMaximum = actualOptions[actualOptions.length - 1] ?? 0;

  const activeRoundBidsDone =
    !!setup &&
    !!currentRound &&
    isRoundPhaseComplete(currentRound, setup.players, "bid");

  const confirmStartPlayer = () => {
    if (!setup) {
      return;
    }

    const nextSetup = {
      ...setup,
      startPlayerIndex: startPlayerIndexDraft,
    };

    setSetup(nextSetup);
    localStorage.setItem("scoreforge:wizard:setup", JSON.stringify(nextSetup));
    setIsStartPlayerModalOpen(false);
  };

  if (!setup) {
    return (
      <main className="place-items-center grid bg-[#101820] px-4 min-h-screen text-[#fff4c7]">
        <div className="text-center">
          <Image
            src="/Logo.png"
            alt="ScoreForge Logo"
            width={96}
            height={96}
            className="mx-auto mb-4 rounded-lg w-20 h-20 object-cover"
          />
          <p className="text-[#d8d3bd]">Wizard wird geladen...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-[#101820] px-3 sm:px-6 py-4 min-h-screen text-[#fff4c7]">
      <div className="mx-auto max-w-7xl">
        <header className="flex sm:flex-row flex-col sm:justify-between sm:items-end gap-3 mb-4">
          <div>
            <button
              onClick={() => router.push("/wizard/setup")}
              className="mb-3 px-3 py-2 border border-[#f7e7ad]/15 rounded-md text-[#d8d3bd] text-sm"
              type="button"
            >
              Zurück
            </button>
            <div className="flex items-center gap-3">
              <Image
                src="/Logo.png"
                alt="ScoreForge Logo"
                width={72}
                height={72}
                className="border border-[#f59e22]/35 rounded-lg w-14 h-14 object-cover"
              />
              <div>
                <p className="font-semibold text-[#f59e22] text-sm uppercase tracking-[0.18em]">
                  Wizard
                </p>
                <h1 className="mt-1 font-black text-3xl">Score-Tabelle</h1>
              </div>
            </div>
          </div>
          <div className="gap-2 grid grid-cols-3 text-sm text-center">
            <div className="bg-[#18262f] px-3 py-2 border border-[#f7e7ad]/10 rounded-md">
              <p className="text-[#9fc9d5]">Spieler</p>
              <p className="font-black">{setup.playerCount}</p>
            </div>
            <div className="bg-[#18262f] px-3 py-2 border border-[#f7e7ad]/10 rounded-md">
              <p className="text-[#9fc9d5]">Runden</p>
              <p className="font-black">{setup.rounds}</p>
            </div>
            <div className="bg-[#18262f] px-3 py-2 border border-[#f7e7ad]/10 rounded-md">
              <p className="text-[#9fc9d5]">Modus</p>
              <p className="font-black">
                {setup.writeMode === "host" ? "Host" : "Alle"}
              </p>
            </div>
          </div>
        </header>

        <ScoreSummary
          totals={totals}
          orderedPlayers={scoreOrderedPlayers}
          rankings={rankings}
        />

        <RoundTable
          players={setup.players}
          table={table}
          totals={totals}
          startPlayerIndex={resolvedStartPlayerIndex}
          onOpenRound={openRound}
          onOpenPlayer={openPlayerInCurrentRound}
        />
      </div>

      {setup && isStartPlayerModalOpen ? (
        <StartPlayerModal
          players={setup.players}
          selectedPlayerIndex={startPlayerIndexDraft}
          onChange={setStartPlayerIndexDraft}
          onConfirm={confirmStartPlayer}
        />
      ) : null}

      {modalPhase && activePlayer && currentRound ? (
        <GameModal
          activePlayer={activePlayer}
          activePlayerIndex={activePlayerIndex}
          activeRoundBidsDone={activeRoundBidsDone}
          allowedBidOptions={allowedBidOptions}
          actualOptions={actualOptions}
          currentRound={currentRound}
          modalPhase={modalPhase}
          roundNumber={roundNumber}
          actualMaximum={actualMaximum}
          actualMinimum={actualMinimum}
          roundStartPlayerIndex={roundStartPlayerIndex}
          totals={totals}
          isLastTurnPlayer={isLastTurnPlayer}
          onClose={() => setModalPhase(null)}
          onMoveNext={moveNext}
          onMovePrevious={movePrevious}
          onPhaseChange={setModalPhase}
          onUpdateEntry={updateEntry}
        />
      ) : null}
    </main>
  );
}
