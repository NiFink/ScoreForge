"use client";

import { gameThemes } from "@/lib/gameThemes";

import Image from "next/image";
import { use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useGame } from "@/lib/useGame";
import { format, useI18n } from "@/lib/i18n";
import { Lobby } from "@/components/Lobby";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { CodeBadge } from "@/components/CodeBadge";
import { DeleteGameButton } from "@/components/DeleteGameButton";
import { GameSettingsModal } from "@/components/GameSettingsModal";
import { WinnerCelebration } from "@/components/WinnerCelebration";
import { RoundModal } from "./RoundModal";
import type {
  DeviceMode,
  UniversalRound,
  UniversalState,
  WriteMode,
} from "@/types/gameTypes";

function getTotals(
  rounds: UniversalRound[],
  playerIds: string[],
  adjustments?: Record<string, number>,
): Record<string, number> {
  const totals = Object.fromEntries(
    playerIds.map((id) => [id, adjustments?.[id] ?? 0]),
  );

  for (const round of rounds) {
    for (const id of playerIds) {
      totals[id] += round[id] ?? 0;
    }
  }

  return totals;
}

// Spielende je nach eingestellter Bedingung (manuell zählt immer)
function isGameOver(state: UniversalState): boolean {
  if (state.phase === "finished") {
    return true;
  }

  if (state.endCondition === "target") {
    const totals = getTotals(
      state.rounds ?? [],
      state.players.map((player) => player.id),
      state.scoreAdjustments,
    );

    return state.players.some(
      (player) => totals[player.id] >= (state.targetScore ?? Infinity),
    );
  }

  if (state.endCondition === "rounds") {
    return (state.rounds ?? []).length >= (state.maxRounds ?? Infinity);
  }

  return false;
}

export default function UniversalGame({
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
  } = useGame<UniversalState>(gameId);

  const [editingRoundIndex, setEditingRoundIndex] = useState<number | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [celebrationDismissed, setCelebrationDismissed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const rounds = useMemo(() => state?.rounds ?? [], [state]);
  const totals = useMemo(
    () =>
      state
        ? getTotals(
            rounds,
            state.players.map((player) => player.id),
            state.scoreAdjustments,
          )
        : {},
    [rounds, state],
  );

  const gameOver = !!state && isGameOver(state);

  const rankedPlayers = useMemo(() => {
    if (!state) {
      return [];
    }

    return [...state.players].sort(
      (left, right) => (totals[right.id] ?? 0) - (totals[left.id] ?? 0),
    );
  }, [state, totals]);

  const leader = rankedPlayers[0] ?? null;
  const targetLeader =
    state?.endCondition === "target" &&
    leader &&
    (totals[leader.id] ?? 0) >= (state.targetScore ?? Infinity)
      ? leader
      : null;

  const canAddRound =
    canWrite &&
    !!state &&
    state.phase !== "finished" &&
    (state.endCondition !== "rounds" ||
      rounds.length < (state.maxRounds ?? Infinity));

  const showCelebration = gameOver && !celebrationDismissed && !!leader;

  const celebrationStandings = rankedPlayers.map((player) => ({
    id: player.id,
    name: player.name,
    color: player.color,
    score: totals[player.id] ?? 0,
  }));

  const openNewRound = () => {
    if (!canAddRound) {
      return;
    }

    setEditingRoundIndex(null);
    setIsModalOpen(true);
  };

  const openExistingRound = (index: number) => {
    if (!canWrite) {
      return;
    }

    setEditingRoundIndex(index);
    setIsModalOpen(true);
  };

  const saveRound = (round: UniversalRound) => {
    mutateState(
      (current) => {
        const nextRounds = [...(current.rounds ?? [])];

        if (editingRoundIndex === null) {
          nextRounds.push(round);
        } else {
          nextRounds[editingRoundIndex] = round;
        }

        return { ...current, rounds: nextRounds };
      },
      // Spielende erreicht -> Lobby läuft nur noch 1 Stunde weiter
      (next) => isGameOver(next),
    );

    setIsModalOpen(false);
  };

  const deleteRound = () => {
    if (editingRoundIndex === null) {
      return;
    }

    mutateState((current) => ({
      ...current,
      rounds: (current.rounds ?? []).filter(
        (_, index) => index !== editingRoundIndex,
      ),
    }));

    setIsModalOpen(false);
  };

  const setFinished = (finished: boolean) => {
    mutateState(
      (current) => ({
        ...current,
        phase: finished ? "finished" : "playing",
      }),
      (next) => isGameOver(next),
    );

    if (finished) {
      setCelebrationDismissed(false);
    }
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
      const nextPlayers = [
        ...current.players,
        { id: newId, name, color, claimedBy: null },
      ];

      return {
        ...current,
        players: nextPlayers,
        playerCount: nextPlayers.length,
        scoreAdjustments: {
          ...current.scoreAdjustments,
          [newId]: startingPoints,
        },
      };
    });
  };

  const removePlayer = (playerId: string) => {
    mutateState((current) => {
      const nextPlayers = current.players.filter(
        (player) => player.id !== playerId,
      );
      const nextRounds = (current.rounds ?? []).map((round) =>
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
        rounds: nextRounds,
        scoreAdjustments: nextAdjustments,
      };
    });
  };

  if (notFound) {
    return (
      <main
        style={gameThemes.universal.style}
        className="place-items-center grid bg-[#101820] px-4 min-h-screen text-[#fff4c7]"
      >
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
      <main
        style={gameThemes.universal.style}
        className="place-items-center grid bg-[#101820] px-4 min-h-screen text-[#fff4c7]"
      >
        <div className="text-center">
          <Image
            src="/Logo.png"
            alt="ScoreForge Logo"
            width={96}
            height={96}
            loading="eager"
            className="mx-auto mb-4 rounded-lg w-20 h-20 object-cover"
          />
          <p className="text-[#d8d3bd]">{t.universal.loadingGame}</p>
        </div>
      </main>
    );
  }

  const endLabel =
    state.endCondition === "target"
      ? t.universal.endTarget
      : state.endCondition === "rounds"
        ? t.universal.endRounds
        : t.universal.endNone;
  const endValue =
    state.endCondition === "target"
      ? String(state.targetScore ?? 0)
      : state.endCondition === "rounds"
        ? `${rounds.length}/${state.maxRounds ?? 0}`
        : "∞";

  const header = (tag: string, title: string) => (
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
      {showSettings && isHost ? (
        <GameSettingsModal
          state={state}
          totals={totals}
          minPlayers={2}
          maxPlayers={8}
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
      <div className="flex sm:flex-row flex-col sm:justify-between sm:items-end gap-3">
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
              {tag}
            </p>
            <h1 className="mt-1 font-black text-3xl">{title}</h1>
          </div>
        </div>
        <div className="gap-2 grid grid-cols-3 text-sm text-center">
          <CodeBadge code={game.code} />
          <div className="bg-[#18262f] px-3 py-2 border border-[#f7e7ad]/10 rounded-md">
            <p className="text-[#9fc9d5]">{endLabel}</p>
            <p className="font-black">{endValue}</p>
          </div>
          <div className="bg-[#18262f] px-3 py-2 border border-[#f7e7ad]/10 rounded-md">
            <p className="text-[#9fc9d5]">{t.common.mode}</p>
            <p className="font-black">
              {state.writeMode === "host" ? t.common.modeHost : t.common.modeAll}
            </p>
          </div>
        </div>
      </div>
    </header>
  );

  if (state.phase === "lobby") {
    return (
      <main
        style={gameThemes.universal.style}
        className="bg-[#101820] px-3 sm:px-6 py-4 min-h-screen text-[#fff4c7]"
      >
        <div className="mx-auto max-w-5xl">
          {header(t.universal.lobbyTag, t.lobby.header)}
          <Lobby
            game={game}
            clientId={clientId}
            isHost={isHost}
            onClaim={claimSlot}
            onStart={() =>
              mutateState((current) => ({ ...current, phase: "playing" }))
            }
          />
        </div>
      </main>
    );
  }

  return (
    <main
      style={gameThemes.universal.style}
      className="bg-[#101820] px-3 sm:px-6 py-4 min-h-screen text-[#fff4c7]"
    >
      <div className="mx-auto max-w-5xl">
        {header(t.universal.tag, t.wizard.scoreTable)}

        {!canWrite ? (
          <p className="bg-[#18262f] mb-4 px-4 py-3 border border-(--accent-2)/25 rounded-md text-[#9fc9d5] text-sm">
            {t.common.hostOnlyBanner}
          </p>
        ) : null}

        {gameOver && leader ? (
          <button
            onClick={() => setCelebrationDismissed(false)}
            className="bg-(--accent)/10 hover:bg-(--accent)/20 mb-4 px-4 py-3 border border-(--accent)/40 rounded-lg w-full font-black text-(--accent-2) text-lg text-center"
            type="button"
          >
            {"\u{1F3C6} "}
            {targetLeader
              ? format(t.universal.targetReached, { name: targetLeader.name })
              : state.endCondition === "rounds" && state.phase !== "finished"
                ? t.universal.allRoundsPlayed
                : format(t.celebration.winsTitle, { name: leader.name })}
            <span className="block mt-0.5 font-semibold text-[#9fc9d5] text-xs">
              {t.celebration.showResult}
            </span>
          </button>
        ) : null}

        {/* TOTALS */}
        <section className="gap-2 grid grid-cols-2 sm:grid-cols-4 mb-4">
          {rankedPlayers.map((player) => (
            <div
              key={player.id}
              className="bg-[#14222b]/90 p-3 border border-[#f7e7ad]/10 rounded-lg min-w-0"
              style={{ boxShadow: `inset 4px 0 0 ${player.color}` }}
            >
              <p className="text-[#d8d3bd] text-sm truncate">{player.name}</p>
              <p className="mt-1 font-black text-2xl">
                {totals[player.id] ?? 0}
              </p>
            </div>
          ))}
        </section>

        {/* ROUNDS */}
        <section className="bg-[#14222b]/90 p-4 border border-(--accent)/20 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-black text-xl">
              {t.universal.roundsHeader}
              {state.endCondition === "rounds" ? (
                <span className="ml-2 font-semibold text-[#9fc9d5] text-sm">
                  {format(t.universal.roundOfTotal, {
                    n: rounds.length,
                    total: state.maxRounds ?? 0,
                  })}
                </span>
              ) : null}
            </h2>
            {canAddRound ? (
              <button
                onClick={openNewRound}
                className="bg-(--accent) px-4 py-2 rounded-md font-black text-(--on-accent) text-sm"
                type="button"
              >
                {t.universal.newRound}
              </button>
            ) : null}
          </div>

          {rounds.length === 0 ? (
            <p className="py-6 text-[#9fc9d5] text-sm text-center">
              {t.universal.noRounds}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-[#9fc9d5] text-left">
                    <th className="py-2 pr-3 font-semibold">#</th>
                    {state.players.map((player) => (
                      <th
                        key={player.id}
                        className="py-2 pr-3 font-semibold text-right"
                      >
                        <span
                          className="inline-block mr-1 rounded-full w-2 h-2"
                          style={{ backgroundColor: player.color }}
                        />
                        {player.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rounds.map((round, index) => (
                    <tr
                      key={index}
                      onClick={() => openExistingRound(index)}
                      className={`border-t border-[#f7e7ad]/10 ${
                        canWrite ? "cursor-pointer hover:bg-[#18262f]" : ""
                      }`}
                    >
                      <td className="py-3 pr-3 font-black">{index + 1}</td>
                      {state.players.map((player) => {
                        const value = round[player.id];

                        return (
                          <td
                            key={player.id}
                            className={`py-3 pr-3 text-right font-black ${
                              value !== null &&
                              value !== undefined &&
                              value < 0
                                ? "text-[#ef5b2a]"
                                : ""
                            }`}
                          >
                            {value ?? "-"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {canWrite ? (
          state.phase === "finished" ? (
            <button
              onClick={() => setFinished(false)}
              className="mt-4 px-4 py-3 border border-[#f7e7ad]/15 rounded-md w-full font-black text-[#d8d3bd]"
              type="button"
            >
              {t.universal.resumeGameButton}
            </button>
          ) : (
            <button
              onClick={() => setFinished(true)}
              className="mt-4 px-4 py-3 border border-(--accent-2)/40 rounded-md w-full font-bold text-[#9fc9d5] text-sm"
              type="button"
            >
              {t.universal.endGameButton}
            </button>
          )
        ) : null}
      </div>

      {isModalOpen ? (
        <RoundModal
          players={state.players}
          roundNumber={
            editingRoundIndex === null
              ? rounds.length + 1
              : editingRoundIndex + 1
          }
          initialRound={
            editingRoundIndex === null
              ? null
              : (rounds[editingRoundIndex] ?? null)
          }
          canDelete={editingRoundIndex !== null}
          onSave={saveRound}
          onDelete={deleteRound}
          onClose={() => setIsModalOpen(false)}
        />
      ) : null}

      {showCelebration ? (
        <WinnerCelebration
          gameType="universal"
          gameLabel={state.lobbyName || t.universal.tag}
          standings={celebrationStandings}
          code={game.code}
          lobbyName={state.lobbyName}
          scoreUnit={t.celebration.pointsLabel}
          onClose={() => setCelebrationDismissed(true)}
        />
      ) : null}
    </main>
  );
}
