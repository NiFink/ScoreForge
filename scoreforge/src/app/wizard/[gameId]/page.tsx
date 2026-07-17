"use client";

import { gameThemes } from "@/lib/gameThemes";

import Image from "next/image";
import { use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useGame } from "@/lib/useGame";
import { useI18n } from "@/lib/i18n";
import { Lobby } from "@/components/Lobby";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { CodeBadge } from "@/components/CodeBadge";
import { DeleteGameButton } from "@/components/DeleteGameButton";
import { GameSettingsModal } from "@/components/GameSettingsModal";
import { WinnerCelebration } from "@/components/WinnerCelebration";
import { CurrentRoundCard } from "./CurrentRoundCard";
import { GameModal } from "./GameModal";
import { StartPlayerModal } from "./StartPlayerModal";
import { RoundTable } from "./RoundTable";
import { ScoreSummary } from "./ScoreSummary";
import { WizardRules } from "./WizardRules";
import type { GameState, ModalPhase, RoundEntry } from "@/types/wizardTypes";
import type { DeviceMode, WriteMode } from "@/types/gameTypes";
import {
  getRoundScore,
  getActualRoundOptions,
  getRoundTurnOrder,
  isRoundComplete,
  isRoundPhaseComplete,
  isRoundUnlocked,
  rankPlayers,
} from "@/features/wizard/utils";

export default function WizardGame({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = use(params);
  const router = useRouter();
  const { t } = useI18n();

  const {
    game,
    state,
    notFound,
    clientId,
    isHost,
    canWrite,
    mutateState,
    claimSlot,
    deleteGame,
  } = useGame<GameState>(gameId);

  const [activeRound, setActiveRound] = useState(0);
  const [modalPhase, setModalPhase] = useState<ModalPhase | null>(null);
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);
  const [startPlayerIndexDraft, setStartPlayerIndexDraft] = useState(0);
  const [celebrationDismissed, setCelebrationDismissed] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAllRounds, setShowAllRounds] = useState(false);

  const table = useMemo(() => state?.table ?? [], [state]);

  const totals = useMemo(() => {
    if (!state) {
      return {};
    }

    return Object.fromEntries(
      state.players.map((player) => [
        player.id,
        table.reduce(
          (sum, round) =>
            sum +
            getRoundScore(round[player.id] ?? { bid: null, actual: null }),
          state.scoreAdjustments?.[player.id] ?? 0,
        ),
      ]),
    );
  }, [state, table]);

  const currentRound = table[activeRound];
  const roundNumber = activeRound + 1;
  // Bombe/Wolke im Jubiläumsmodus lassen einen Stich ersatzlos entfallen —
  // dadurch sinkt die tatsächlich zu verteilende Stichzahl der Runde um 1,
  // und die Vorhersage darf trotz gesperrter "Tatsächlich"-Phase noch
  // angepasst werden.
  const hasVoidingSpecialCard =
    state?.mode === "anniversary" &&
    (state.specialCards?.includes("bombe") ||
      state.specialCards?.includes("wolke")) === true;
  const activePlayer = state?.players[activePlayerIndex];
  const rankings = state ? rankPlayers(state.players, totals) : null;
  const isStartPlayerModalOpen =
    !!state && state.phase === "playing" && !state.startPlayerChosen && isHost;
  const resolvedStartPlayerIndex = isStartPlayerModalOpen
    ? startPlayerIndexDraft
    : (state?.startPlayerIndex ?? 0);
  const roundTurnOrder = useMemo(() => {
    if (!state) {
      return [];
    }

    return getRoundTurnOrder(
      activeRound,
      state.players.length,
      resolvedStartPlayerIndex,
    );
  }, [activeRound, resolvedStartPlayerIndex, state]);
  const activeTurnPosition = roundTurnOrder.indexOf(activePlayerIndex);
  const isLastTurnPlayer =
    !!state && activeTurnPosition === roundTurnOrder.length - 1;
  const roundStartPlayerIndex = roundTurnOrder[0] ?? 0;

  const scoreOrderedPlayers = useMemo(() => {
    if (!state) {
      return [];
    }

    const playerOrder = new Map(
      state.players.map((player, index) => [player.id, index]),
    );

    return [...state.players].sort((left, right) => {
      const leftScore = totals[left.id] ?? 0;
      const rightScore = totals[right.id] ?? 0;

      if (leftScore !== rightScore) {
        return rightScore - leftScore;
      }

      return (playerOrder.get(left.id) ?? 0) - (playerOrder.get(right.id) ?? 0);
    });
  }, [state, totals]);

  const gameOver = useMemo(
    () =>
      !!state &&
      table.length > 0 &&
      table.every((round) => isRoundComplete(round, state.players)),
    [state, table],
  );

  // Aktuell zu spielende Runde: die erste noch unvollständige, sonst die letzte.
  const currentRoundIndex = useMemo(() => {
    if (!state || table.length === 0) {
      return 0;
    }

    const firstIncomplete = table.findIndex(
      (round) => !isRoundComplete(round, state.players),
    );

    return firstIncomplete === -1 ? table.length - 1 : firstIncomplete;
  }, [state, table]);

  const celebrationStandings = useMemo(
    () =>
      scoreOrderedPlayers.map((player) => ({
        id: player.id,
        name: player.name,
        color: player.color,
        score: totals[player.id] ?? 0,
      })),
    [scoreOrderedPlayers, totals],
  );

  // Siegerehrung erscheint automatisch, sobald alle Runden gespielt sind,
  // und lässt sich schließen bzw. über den Button erneut öffnen.
  const showCelebration = gameOver && !celebrationDismissed;

  const openRound = (
    roundIndex: number,
    phase?: ModalPhase,
    playerIndex?: number,
  ) => {
    if (
      !state ||
      !canWrite ||
      !isRoundUnlocked(table, state.players, roundIndex)
    ) {
      return;
    }

    const round = table[roundIndex];
    const bidsDone = isRoundPhaseComplete(round, state.players, "bid");
    const nextPhase = phase ?? (bidsDone ? "actual" : "bid");
    const roundOrder = getRoundTurnOrder(
      roundIndex,
      state.players.length,
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
    mutateState(
      (current) => ({
        ...current,
        table: current.table.map((round, index) =>
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
      }),
      // Alle Runden komplett -> Lobby läuft nur noch 1 Stunde weiter
      (next) =>
        next.table.every((round) => isRoundComplete(round, next.players)),
    );
  };

  const moveNext = () => {
    if (!state || !modalPhase) {
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
        updateEntry(activePlayer.id, "actual", forcedValue);
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
      isRoundPhaseComplete(currentRound, state.players, "bid")
    ) {
      setModalPhase("actual");
      setActivePlayerIndex(roundTurnOrder[0] ?? 0);
      return;
    }

    setModalPhase(null);
  };

  const movePrevious = () => {
    if (!state || !modalPhase) {
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

    if (modalPhase === "actual" && canEditBidAfterLock) {
      setModalPhase("bid");
      setActivePlayerIndex(roundTurnOrder[roundTurnOrder.length - 1] ?? 0);
    }
  };

  const allowedBidOptions = useMemo(() => {
    if (!state || !currentRound || !activePlayer) {
      return [];
    }

    const allOptions = Array.from({ length: roundNumber + 1 }, (_, i) => i);

    if (!isLastTurnPlayer) {
      return allOptions;
    }

    const previousBids = roundTurnOrder
      .slice(0, -1)
      .reduce((sum, playerIndex) => {
        const playerId = state.players[playerIndex]?.id;
        return sum + (playerId ? (currentRound[playerId]?.bid ?? 0) : 0);
      }, 0);

    return allOptions.filter((option) => previousBids + option !== roundNumber);
  }, [
    activePlayer,
    currentRound,
    isLastTurnPlayer,
    roundNumber,
    roundTurnOrder,
    state,
  ]);

  const actualOptions =
    state && currentRound && modalPhase === "actual" && activePlayer
      ? (() => {
          const actualTurnPosition = roundTurnOrder.indexOf(activePlayerIndex);
          const takenSoFar = roundTurnOrder
            .slice(0, actualTurnPosition)
            .reduce((sum, playerIndex) => {
              const playerId = state.players[playerIndex]?.id;
              return (
                sum + (playerId ? (currentRound[playerId]?.actual ?? 0) : 0)
              );
            }, 0);

          // Bombe/Wolke KANN einen Stich ersatzlos entfallen lassen (muss
          // aber nicht) -> die Obergrenze bleibt roundNumber, "ein Stich
          // weniger" ist über die stets bei 0 startende Optionsliste schon
          // ohne Zwang wählbar.
          return getActualRoundOptions(roundNumber, takenSoFar);
        })()
      : [];

  const actualMinimum = actualOptions[0] ?? 0;
  const actualMaximum = actualOptions[actualOptions.length - 1] ?? 0;

  const activeRoundBidsDone =
    !!state &&
    !!currentRound &&
    isRoundPhaseComplete(currentRound, state.players, "bid");

  const canEditBidAfterLock = hasVoidingSpecialCard;

  const previousDisabled =
    (modalPhase === "bid" && activePlayerIndex === 0) ||
    (modalPhase === "actual" &&
      activeTurnPosition === 0 &&
      !canEditBidAfterLock);

  const confirmStartPlayer = () => {
    mutateState((current) => ({
      ...current,
      startPlayerIndex: startPlayerIndexDraft,
      startPlayerChosen: true,
    }));
  };

  const startGameFromLobby = () => {
    mutateState((current) => ({
      ...current,
      phase: "playing",
    }));
  };

  // --- Host-Einstellungen im laufenden Spiel ---

  const changeWriteMode = (writeMode: WriteMode) => {
    mutateState((current) => ({ ...current, writeMode }));
  };

  const changeDeviceMode = (deviceMode: DeviceMode) => {
    mutateState((current) => ({ ...current, deviceMode }));
  };

  const backToLobby = () => {
    setShowSettings(false);
    mutateState((current) => ({ ...current, phase: "lobby" }));
  };

  const pauseGame = () => {
    mutateState(
      (current) => ({ ...current, paused: true }),
      undefined,
      () => true,
    );
  };

  const resumeGame = () => {
    mutateState((current) => ({ ...current, paused: false }));
  };

  const addPlayer = (name: string, color: string, startingPoints: number) => {
    mutateState((current) => {
      const newId = `player-${Date.now()}`;

      // Bereits komplette Runden mit 0/0 auffüllen, damit die
      // Rundenfreischaltung intakt bleibt; die 20 Punkte pro aufgefüllter
      // Runde werden über scoreAdjustments wieder herausgerechnet.
      let filledRounds = 0;
      const nextTable = current.table.map((round) => {
        if (isRoundComplete(round, current.players)) {
          filledRounds += 1;
          return { ...round, [newId]: { bid: 0, actual: 0 } };
        }

        return { ...round, [newId]: { bid: null, actual: null } };
      });

      const nextPlayers = [
        ...current.players,
        { id: newId, name, color, claimedBy: null },
      ];

      return {
        ...current,
        players: nextPlayers,
        playerCount: nextPlayers.length,
        table: nextTable,
        scoreAdjustments: {
          ...current.scoreAdjustments,
          [newId]: startingPoints - filledRounds * 20,
        },
      };
    });
  };

  const removePlayer = (playerId: string) => {
    mutateState((current) => {
      const nextPlayers = current.players.filter(
        (player) => player.id !== playerId,
      );
      const nextTable = current.table.map((round) =>
        Object.fromEntries(
          Object.entries(round).filter(([id]) => id !== playerId),
        ),
      );
      const nextAdjustments = Object.fromEntries(
        Object.entries(current.scoreAdjustments ?? {}).filter(
          ([id]) => id !== playerId,
        ),
      );

      return {
        ...current,
        players: nextPlayers,
        playerCount: nextPlayers.length,
        table: nextTable,
        scoreAdjustments: nextAdjustments,
        startPlayerIndex:
          current.startPlayerIndex % Math.max(1, nextPlayers.length),
      };
    });
  };

  if (notFound) {
    return (
      <main style={gameThemes.wizard.style} className="place-items-center grid bg-[#101820] px-4 min-h-screen text-[#fff4c7]">
        <div className="text-center">
          <Image
            src="/Logo.png"
            alt="ScoreForge Logo"
            width={96}
            height={96}
            loading="eager"
            className="mx-auto mb-4 rounded-lg w-20 h-20 object-cover"
          />
          <h1 className="font-black text-2xl">{t.common.gameNotFound}</h1>
          <p className="mt-2 text-[#d8d3bd]">{t.common.invalidLink}</p>
          <div className="flex justify-center gap-2 mt-5">
            <button
              onClick={() => router.push("/join")}
              className="bg-(--accent) px-4 py-3 rounded-md font-black text-(--on-accent)"
              type="button"
            >
              {t.common.joinLobby}
            </button>
            <button
              onClick={() => router.push("/")}
              className="px-4 py-3 border border-[#f7e7ad]/15 rounded-md font-bold text-[#d8d3bd]"
              type="button"
            >
              {t.common.toHome}
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!game || !state) {
    return (
      <main style={gameThemes.wizard.style} className="place-items-center grid bg-[#101820] px-4 min-h-screen text-[#fff4c7]">
        <div className="text-center">
          <Image
            src="/Logo.png"
            alt="ScoreForge Logo"
            width={96}
            height={96}
            loading="eager"
            className="mx-auto mb-4 rounded-lg w-20 h-20 object-cover"
          />
          <p className="text-[#d8d3bd]">{t.wizard.loadingGame}</p>
        </div>
      </main>
    );
  }

  if (state.phase === "lobby") {
    return (
      <main style={gameThemes.wizard.style} className="bg-[#101820] px-3 sm:px-6 py-4 min-h-screen text-[#fff4c7]">
        <div className="mx-auto max-w-5xl">
          <header className="mb-5">
            <div className="flex justify-between items-center mb-3">
              <button
                onClick={() => router.push("/")}
                className="px-3 py-2 border border-[#f7e7ad]/15 rounded-md text-[#d8d3bd] text-sm"
                type="button"
              >
                {t.common.back}
              </button>
              <div className="flex items-center gap-2">
                {isHost ? (
                  <button
                    onClick={() => setShowSettings(true)}
                    className="px-3 py-2 border border-[#f7e7ad]/15 rounded-md text-sm"
                    title={t.settings.openButton}
                    aria-label={t.settings.openButton}
                    type="button"
                  >
                    {"⚙️"}
                  </button>
                ) : null}
                {isHost ? <DeleteGameButton onDelete={deleteGame} /> : null}
                <LanguageSwitcher />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Image
                src="/Logo.png"
                alt="ScoreForge Logo"
                width={72}
                height={72}
                loading="eager"
                className="border border-(--accent)/35 rounded-lg w-14 h-14 object-cover"
              />
              <div>
                <p className="font-semibold text-(--accent) text-sm uppercase tracking-[0.18em]">
                  {t.wizard.lobbyTag}
                </p>
                <h1 className="mt-1 font-black text-3xl">{t.lobby.header}</h1>
              </div>
            </div>
            {state.mode === "anniversary" && state.specialCards?.length ? (
              <div className="flex flex-wrap gap-2 mt-3">
                {state.specialCards.map((id) => {
                  const card = t.wizard.specialCards.find(
                    (entry) => entry.id === id,
                  );

                  return card ? (
                    <span
                      key={id}
                      className="bg-(--accent-2)/10 px-2 py-1 border border-(--accent-2)/25 rounded-md text-[#9fc9d5] text-xs"
                    >
                      {card.name}
                    </span>
                  ) : null;
                })}
              </div>
            ) : null}
          </header>

          <Lobby
            game={game}
            clientId={clientId}
            isHost={isHost}
            onClaim={claimSlot}
            onStart={startGameFromLobby}
          />
        </div>

        {showSettings && isHost ? (
          <GameSettingsModal
            state={state}
            totals={totals}
            minPlayers={3}
            maxPlayers={6}
            allowPlayerChanges
            expiresAt={game.expires_at}
            onChangeWriteMode={changeWriteMode}
            onChangeDeviceMode={changeDeviceMode}
            onBackToLobby={backToLobby}
            onPause={pauseGame}
            onResume={resumeGame}
            onAddPlayer={addPlayer}
            onRemovePlayer={removePlayer}
            onClose={() => setShowSettings(false)}
          />
        ) : null}
      </main>
    );
  }

  return (
    <main style={gameThemes.wizard.style} className="bg-[#101820] px-3 sm:px-6 py-4 min-h-screen text-[#fff4c7]">
      <div className="mx-auto max-w-7xl">
        <header className="flex sm:flex-row flex-col sm:justify-between sm:items-end gap-3 mb-4">
          <div>
            <div className="flex justify-between items-center mb-3">
              <button
                onClick={() => router.push("/")}
                className="px-3 py-2 border border-[#f7e7ad]/15 rounded-md text-[#d8d3bd] text-sm"
                type="button"
              >
                {t.common.back}
              </button>
              <div className="flex items-center gap-2">
                {isHost ? (
                  <button
                    onClick={() => setShowSettings(true)}
                    className="px-3 py-2 border border-[#f7e7ad]/15 rounded-md text-sm"
                    title={t.settings.openButton}
                    aria-label={t.settings.openButton}
                    type="button"
                  >
                    {"⚙️"}
                  </button>
                ) : null}
                {isHost ? <DeleteGameButton onDelete={deleteGame} /> : null}
                <span className="sm:hidden">
                  <LanguageSwitcher />
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Image
                src="/Logo.png"
                alt="ScoreForge Logo"
                width={72}
                height={72}
                loading="eager"
                className="border border-(--accent)/35 rounded-lg w-14 h-14 object-cover"
              />
              <div>
                <p className="font-semibold text-(--accent) text-sm uppercase tracking-[0.18em]">
                  {t.wizard.tag}
                </p>
                <h1 className="mt-1 font-black text-3xl">
                  {t.wizard.scoreTable}
                </h1>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="hidden sm:block">
              <LanguageSwitcher />
            </span>
            <div className="gap-2 grid grid-cols-4 text-sm text-center">
              <CodeBadge code={game.code} />
              <div className="bg-[#18262f] px-3 py-2 border border-[#f7e7ad]/10 rounded-md">
                <p className="text-[#9fc9d5]">{t.common.players}</p>
                <p className="font-black">{state.playerCount}</p>
              </div>
              <div className="bg-[#18262f] px-3 py-2 border border-[#f7e7ad]/10 rounded-md">
                <p className="text-[#9fc9d5]">{t.common.rounds}</p>
                <p className="font-black">{state.rounds}</p>
              </div>
              <div className="bg-[#18262f] px-3 py-2 border border-[#f7e7ad]/10 rounded-md">
                <p className="text-[#9fc9d5]">{t.common.mode}</p>
                <p className="font-black">
                  {state.writeMode === "host"
                    ? t.common.modeHost
                    : t.common.modeAll}
                </p>
              </div>
            </div>
          </div>
        </header>

        {state.mode === "anniversary" && state.specialCards?.length ? (
          <div className="flex flex-wrap gap-2 mb-4">
            {state.specialCards.map((id) => {
              const card = t.wizard.specialCards.find(
                (entry) => entry.id === id,
              );

              return card ? (
                <span
                  key={id}
                  className="bg-(--accent-2)/10 px-2 py-1 border border-(--accent-2)/25 rounded-md text-[#9fc9d5] text-xs"
                >
                  {card.name}
                </span>
              ) : null;
            })}
          </div>
        ) : null}

        {!canWrite ? (
          <p className="bg-[#18262f] mb-4 px-4 py-3 border border-(--accent-2)/25 rounded-md text-[#9fc9d5] text-sm">
            {t.common.hostOnlyBanner}
          </p>
        ) : null}

        {gameOver ? (
          <button
            onClick={() => setCelebrationDismissed(false)}
            className="bg-(--accent)/10 hover:bg-(--accent)/20 mb-4 px-4 py-3 border border-(--accent)/40 rounded-lg w-full font-black text-(--accent) text-center"
            type="button"
          >
            {"\u{1F3C6} "}
            {t.celebration.showResult}
          </button>
        ) : null}

        <ScoreSummary
          totals={totals}
          orderedPlayers={scoreOrderedPlayers}
          rankings={rankings}
        />

        <CurrentRoundCard
          players={state.players}
          round={table[currentRoundIndex]}
          roundIndex={currentRoundIndex}
          totalRounds={table.length}
          startPlayerIndex={resolvedStartPlayerIndex}
          onOpenPlayer={(playerIndex) =>
            openRound(currentRoundIndex, undefined, playerIndex)
          }
          onStart={() => openRound(currentRoundIndex)}
        />

        <button
          onClick={() => setShowAllRounds((current) => !current)}
          className="mb-4 px-4 py-3 border border-(--accent-2)/40 rounded-md w-full font-bold text-[#9fc9d5] text-sm"
          type="button"
        >
          {showAllRounds
            ? t.wizard.hidePreviousRounds
            : t.wizard.showPreviousRounds}
        </button>

        {showAllRounds ? (
          <div className="sf-fade-in mb-4">
            <RoundTable
              players={state.players}
              table={table}
              totals={totals}
              startPlayerIndex={resolvedStartPlayerIndex}
              onOpenRound={openRound}
              onOpenPlayer={openPlayerInCurrentRound}
            />
          </div>
        ) : null}

        <button
          onClick={() => setShowRules(true)}
          className="mt-4 px-4 py-3 border border-(--accent-2)/40 rounded-md w-full font-bold text-[#9fc9d5] text-sm"
          type="button"
        >
          {t.wizard.rulesReferenceButton}
        </button>
      </div>

      {isStartPlayerModalOpen ? (
        <StartPlayerModal
          players={state.players}
          selectedPlayerIndex={startPlayerIndexDraft}
          onChange={setStartPlayerIndexDraft}
          onConfirm={confirmStartPlayer}
        />
      ) : null}

      {modalPhase && activePlayer && currentRound ? (
        <GameModal
          activePlayer={activePlayer}
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
          canEditBidAfterLock={canEditBidAfterLock}
          previousDisabled={previousDisabled}
          onClose={() => setModalPhase(null)}
          onMoveNext={moveNext}
          onMovePrevious={movePrevious}
          onPhaseChange={setModalPhase}
          onUpdateEntry={updateEntry}
        />
      ) : null}

      {showCelebration ? (
        <WinnerCelebration
          gameType="wizard"
          gameLabel={t.wizard.tag}
          standings={celebrationStandings}
          code={game.code}
          lobbyName={state.lobbyName}
          scoreUnit={t.celebration.pointsLabel}
          onClose={() => setCelebrationDismissed(true)}
        />
      ) : null}

      {showRules ? (
        <WizardRules
          activeSpecialCardIds={
            state.mode === "anniversary" ? (state.specialCards ?? []) : []
          }
          onClose={() => setShowRules(false)}
        />
      ) : null}

      {showSettings && isHost ? (
        <GameSettingsModal
          state={state}
          totals={totals}
          minPlayers={3}
          maxPlayers={6}
          allowPlayerChanges
          expiresAt={game.expires_at}
          onChangeWriteMode={changeWriteMode}
          onChangeDeviceMode={changeDeviceMode}
          onBackToLobby={backToLobby}
          onPause={pauseGame}
          onResume={resumeGame}
          onAddPlayer={addPlayer}
          onRemovePlayer={removePlayer}
          onClose={() => setShowSettings(false)}
        />
      ) : null}
    </main>
  );
}
