"use client";

import Image from "next/image";
import {
  use,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabaseClient";
import { getClientId } from "@/lib/clientId";
import { GameModal } from "./GameModal";
import { StartPlayerModal } from "./StartPlayerModal";
import { RoundTable } from "./RoundTable";
import { ScoreSummary } from "./ScoreSummary";
import { Lobby } from "./Lobby";
import type {
  GameRecord,
  GameState,
  ModalPhase,
  RoundEntry,
} from "../../types/wizardTypes";
import {
  getRoundScore,
  getActualRoundOptions,
  getRoundTurnOrder,
  isRoundPhaseComplete,
  isRoundUnlocked,
  rankPlayers,
} from "../../Utils/wizardUtils";

const subscribeToNothing = () => () => {};
const getServerClientId = () => "";

export default function WizardGame({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = use(params);
  const router = useRouter();

  const [game, setGame] = useState<GameRecord | null>(null);
  const [notFound, setNotFound] = useState(false);
  const gameRef = useRef<GameRecord | null>(null);

  const [activeRound, setActiveRound] = useState(0);
  const [modalPhase, setModalPhase] = useState<ModalPhase | null>(null);
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);
  const [startPlayerIndexDraft, setStartPlayerIndexDraft] = useState(0);

  // Auf dem Server "" liefern, im Browser die stabile Geräte-ID
  const clientId = useSyncExternalStore(
    subscribeToNothing,
    getClientId,
    getServerClientId,
  );

  // Spielstand initial laden
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`/api/games/${gameId}`);

        if (!response.ok) {
          if (!cancelled) {
            setNotFound(true);
          }
          return;
        }

        const data = (await response.json()) as { game: GameRecord };

        if (!cancelled) {
          gameRef.current = data.game;
          setGame(data.game);
          setStartPlayerIndexDraft(data.game.state.startPlayerIndex ?? 0);
        }
      } catch {
        if (!cancelled) {
          setNotFound(true);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [gameId]);

  // Realtime: Änderungen anderer Geräte übernehmen
  useEffect(() => {
    const channel = supabase
      .channel(`game-${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "games",
          filter: `id=eq.${gameId}`,
        },
        (payload) => {
          const next = payload.new as GameRecord;
          gameRef.current = next;
          setGame(next);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [gameId]);

  const state = game?.state ?? null;
  const table = useMemo(() => state?.table ?? [], [state]);

  const isHost = !!state && !!clientId && state.hostId === clientId;
  const canWrite = isHost || state?.writeMode === "all";

  // Lokale Änderung sofort anzeigen und an den Server schicken;
  // Realtime bestätigt sie danach auf allen Geräten (last-write-wins).
  const mutateState = (updater: (current: GameState) => GameState) => {
    const current = gameRef.current;

    if (!current || !clientId) {
      return;
    }

    const nextState = updater(current.state);
    const next = { ...current, state: nextState };

    gameRef.current = next;
    setGame(next);

    void fetch(`/api/games/${current.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: nextState, clientId }),
    });
  };

  const claimSlot = async (
    playerId: string,
    name?: string,
  ): Promise<string | null> => {
    try {
      const response = await fetch(`/api/games/${gameId}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, clientId, name }),
      });

      const data = (await response.json()) as {
        game?: GameRecord;
        error?: string;
      };

      if (!response.ok || !data.game) {
        return data.error ?? "Konnte den Platz nicht übernehmen.";
      }

      gameRef.current = data.game;
      setGame(data.game);
      return null;
    } catch {
      return "Verbindung fehlgeschlagen.";
    }
  };

  const totals = useMemo(() => {
    if (!state) {
      return {};
    }

    return Object.fromEntries(
      state.players.map((player) => [
        player.id,
        table.reduce((sum, round) => sum + getRoundScore(round[player.id]), 0),
      ]),
    );
  }, [state, table]);

  const currentRound = table[activeRound];
  const roundNumber = activeRound + 1;
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
    mutateState((current) => ({
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
    }));
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

    if (modalPhase === "actual") {
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

          return getActualRoundOptions(roundNumber, takenSoFar);
        })()
      : [];

  const actualMinimum = actualOptions[0] ?? 0;
  const actualMaximum = actualOptions[actualOptions.length - 1] ?? 0;

  const activeRoundBidsDone =
    !!state &&
    !!currentRound &&
    isRoundPhaseComplete(currentRound, state.players, "bid");

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

  if (notFound) {
    return (
      <main className="place-items-center grid bg-[#101820] px-4 min-h-screen text-[#fff4c7]">
        <div className="text-center">
          <Image
            src="/Logo.png"
            alt="ScoreForge Logo"
            width={96}
            height={96}
            loading="eager"
            className="mx-auto mb-4 rounded-lg w-20 h-20 object-cover"
          />
          <h1 className="font-black text-2xl">Spiel nicht gefunden</h1>
          <p className="mt-2 text-[#d8d3bd]">
            Der Link ist ungültig oder das Spiel existiert nicht mehr.
          </p>
          <div className="flex justify-center gap-2 mt-5">
            <button
              onClick={() => router.push("/wizard/join")}
              className="bg-[#f59e22] px-4 py-3 rounded-md font-black text-[#101820]"
              type="button"
            >
              Lobby beitreten
            </button>
            <button
              onClick={() => router.push("/")}
              className="px-4 py-3 border border-[#f7e7ad]/15 rounded-md font-bold text-[#d8d3bd]"
              type="button"
            >
              Zur Startseite
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!game || !state) {
    return (
      <main className="place-items-center grid bg-[#101820] px-4 min-h-screen text-[#fff4c7]">
        <div className="text-center">
          <Image
            src="/Logo.png"
            alt="ScoreForge Logo"
            width={96}
            height={96}
            loading="eager"
            className="mx-auto mb-4 rounded-lg w-20 h-20 object-cover"
          />
          <p className="text-[#d8d3bd]">Wizard wird geladen...</p>
        </div>
      </main>
    );
  }

  if (state.phase === "lobby") {
    return (
      <main className="bg-[#101820] px-3 sm:px-6 py-4 min-h-screen text-[#fff4c7]">
        <div className="mx-auto max-w-5xl">
          <header className="mb-5">
            <button
              onClick={() => router.push("/")}
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
                loading="eager"
                className="border border-[#f59e22]/35 rounded-lg w-14 h-14 object-cover"
              />
              <div>
                <p className="font-semibold text-[#f59e22] text-sm uppercase tracking-[0.18em]">
                  Wizard Lobby
                </p>
                <h1 className="mt-1 font-black text-3xl">
                  Warten auf Spieler
                </h1>
              </div>
            </div>
          </header>

          <Lobby
            game={game}
            clientId={clientId}
            isHost={isHost}
            onClaim={claimSlot}
            onStart={startGameFromLobby}
          />
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
              onClick={() => router.push("/")}
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
                loading="eager"
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
          <div className="gap-2 grid grid-cols-4 text-sm text-center">
            <div className="bg-[#18262f] px-3 py-2 border border-[#f7e7ad]/10 rounded-md">
              <p className="text-[#9fc9d5]">Code</p>
              <p className="font-black tracking-widest">{game.code}</p>
            </div>
            <div className="bg-[#18262f] px-3 py-2 border border-[#f7e7ad]/10 rounded-md">
              <p className="text-[#9fc9d5]">Spieler</p>
              <p className="font-black">{state.playerCount}</p>
            </div>
            <div className="bg-[#18262f] px-3 py-2 border border-[#f7e7ad]/10 rounded-md">
              <p className="text-[#9fc9d5]">Runden</p>
              <p className="font-black">{state.rounds}</p>
            </div>
            <div className="bg-[#18262f] px-3 py-2 border border-[#f7e7ad]/10 rounded-md">
              <p className="text-[#9fc9d5]">Modus</p>
              <p className="font-black">
                {state.writeMode === "host" ? "Host" : "Alle"}
              </p>
            </div>
          </div>
        </header>

        {!canWrite ? (
          <p className="bg-[#18262f] mb-4 px-4 py-3 border border-[#2aa6c8]/25 rounded-md text-[#9fc9d5] text-sm">
            Nur der Host trägt Punkte ein — deine Ansicht aktualisiert sich
            automatisch.
          </p>
        ) : null}

        <ScoreSummary
          totals={totals}
          orderedPlayers={scoreOrderedPlayers}
          rankings={rankings}
        />

        <RoundTable
          players={state.players}
          table={table}
          totals={totals}
          startPlayerIndex={resolvedStartPlayerIndex}
          onOpenRound={openRound}
          onOpenPlayer={openPlayerInCurrentRound}
        />
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
