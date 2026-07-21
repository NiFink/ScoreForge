"use client";

import { gameThemes } from "@/lib/gameThemes";

import Image from "next/image";
import { use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useGame } from "@/lib/useGame";
import { format, useI18n } from "@/lib/i18n";
import { Lobby } from "@/components/Lobby";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CodeBadge } from "@/components/CodeBadge";
import { GameSettingsModal } from "@/components/GameSettingsModal";
import {
  WinnerCelebration,
  type CelebrationStanding,
} from "@/components/WinnerCelebration";
import { MaexleGallows } from "./MaexleGallows";
import type { DeviceMode, MaexleState, WriteMode } from "@/types/gameTypes";

// Vorbei, sobald der Host manuell beendet oder das eingestellte Endziel
// erreicht ist: "lastStanding" -> nur noch einer übrig, "firstElimination"
// -> der erste Spieler ist ausgeschieden.
function isGameOver(state: MaexleState): boolean {
  if (state.phase === "finished") {
    return true;
  }

  if (state.players.length < 2) {
    return false;
  }

  const alive = state.players.filter(
    (player) => (state.lives[player.id] ?? 0) > 0,
  );

  if (state.endCondition === "firstElimination") {
    return alive.length < state.players.length;
  }

  return alive.length <= 1;
}

export default function MaexleGame({
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
  } = useGame<MaexleState>(gameId);

  const [celebrationDismissed, setCelebrationDismissed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const gameOver = !!state && isGameOver(state);

  const rankedPlayers = useMemo(() => {
    if (!state) {
      return [];
    }

    return [...state.players].sort(
      (left, right) =>
        (state.lives[right.id] ?? 0) - (state.lives[left.id] ?? 0),
    );
  }, [state]);

  const leader = rankedPlayers[0] ?? null;
  const showCelebration = gameOver && !celebrationDismissed && !!leader;
  const firstEliminated =
    state?.players.find((player) => (state.lives[player.id] ?? 0) <= 0) ??
    null;

  const celebrationStandings: CelebrationStanding[] = rankedPlayers.map(
    (player) => ({
      id: player.id,
      name: player.name,
      color: player.color,
      score: state?.lives[player.id] ?? 0,
    }),
  );

  const loseLife = (playerId: string) => {
    mutateState(
      (current) => ({
        ...current,
        lives: {
          ...current.lives,
          [playerId]: Math.max(0, (current.lives[playerId] ?? 0) - 1),
        },
      }),
      (next) => isGameOver(next),
    );
  };

  const restoreLife = (playerId: string) => {
    mutateState(
      (current) => ({
        ...current,
        lives: {
          ...current.lives,
          [playerId]: Math.min(
            current.livesTotal,
            (current.lives[playerId] ?? 0) + 1,
          ),
        },
      }),
      (next) => isGameOver(next),
    );
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

  if (notFound) {
    return (
      <main
        style={gameThemes.maexle.style}
        className="place-items-center grid bg-(--sf-bg) px-4 min-h-screen text-(--sf-text-strong)"
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
          <p className="mt-2 text-(--sf-text-muted)">{t.common.invalidLink}</p>
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
              className="px-4 py-3 border border-(--sf-text)/15 rounded-md font-bold text-(--sf-text-muted)"
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
        style={gameThemes.maexle.style}
        className="place-items-center grid bg-(--sf-bg) px-4 min-h-screen text-(--sf-text-strong)"
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
          <p className="text-(--sf-text-muted)">{t.maexle.loadingGame}</p>
        </div>
      </main>
    );
  }

  const header = (tag: string, title: string) => (
    <header className="mb-5">
      <div className="flex justify-between items-center mb-3">
        <button
          onClick={() => router.push("/")}
          className="px-3 py-2 border border-(--sf-text)/15 rounded-md text-(--sf-text-muted) text-sm"
          type="button"
        >
          {t.common.back}
        </button>
        <div className="flex items-center gap-2">
          {isHost ? (
            <button
              onClick={() => setShowSettings(true)}
              className="px-3 py-2 border border-(--sf-text)/15 rounded-md text-sm"
              title={t.settings.openButton}
              aria-label={t.settings.openButton}
              type="button"
            >
              {"⚙️"}
            </button>
          ) : null}
          <ThemeToggle />
        </div>
      </div>
      {showSettings && isHost ? (
        <GameSettingsModal
          state={state}
          totals={state.lives}
          minPlayers={1}
          maxPlayers={20}
          // Neue Spieler mitten im Spiel würden ohne definierte Startleben
          // dastehen - Spielerliste steht daher schon bei der Einrichtung fest.
          allowPlayerChanges={false}
          expiresAt={game.expires_at}
          onChangeWriteMode={changeWriteMode}
          onChangeDeviceMode={changeDeviceMode}
          onBackToLobby={backToLobby}
          onPause={pauseGame}
          onResume={resumeGame}
          onAddPlayer={() => {}}
          onRemovePlayer={() => {}}
          onDelete={deleteGame}
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
        <div className="gap-2 grid grid-cols-2 text-sm text-center">
          <CodeBadge code={game.code} />
          <div className="bg-(--sf-surface) px-3 py-2 border border-(--sf-text)/10 rounded-md">
            <p className="text-(--sf-text-subtle)">{t.common.mode}</p>
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
        style={gameThemes.maexle.style}
        className="bg-(--sf-bg) px-3 sm:px-6 py-4 min-h-screen text-(--sf-text-strong)"
      >
        <div className="mx-auto max-w-5xl">
          {header(t.maexle.lobbyTag, t.lobby.header)}
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
      style={gameThemes.maexle.style}
      className="bg-(--sf-bg) px-3 sm:px-6 py-4 min-h-screen text-(--sf-text-strong)"
    >
      <div className="mx-auto max-w-5xl">
        {header(t.maexle.tag, t.maexle.livesLabel)}

        {!canWrite ? (
          <p className="bg-(--sf-surface) mb-4 px-4 py-3 border border-(--accent-2)/25 rounded-md text-(--sf-text-subtle) text-sm">
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
            {state.endCondition === "firstElimination" && firstEliminated
              ? format(t.maexle.firstEliminationBanner, {
                  name: firstEliminated.name,
                })
              : format(t.maexle.lastOneStanding, { name: leader.name })}
            <span className="block mt-0.5 font-semibold text-(--sf-text-subtle) text-xs">
              {t.celebration.showResult}
            </span>
          </button>
        ) : null}

        {/* LEBEN-KARTEN */}
        {/* Feste Reihenfolge (Einrichtung) statt nach Leben sortiert, damit
            die Karten beim Leben verlieren/zurückgeben nicht herumspringen. */}
        <section className="gap-3 grid sm:grid-cols-2 lg:grid-cols-3">
          {state.players.map((player) => {
            const remaining = state.lives[player.id] ?? 0;
            const eliminated = remaining <= 0;

            return (
              <div
                key={player.id}
                className={`bg-(--sf-surface-2)/90 p-4 border rounded-lg ${
                  eliminated ? "border-(--sf-text)/10 opacity-60" : "border-(--sf-text)/10"
                }`}
                style={{ boxShadow: `inset 4px 0 0 ${player.color}` }}
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <PlayerAvatar color={player.color} size="lg" />
                    <div className="min-w-0">
                      <p className="font-bold truncate">{player.name}</p>
                      <p
                        className={`text-xs ${
                          eliminated
                            ? "font-bold text-[#ef5b2a]"
                            : "text-(--sf-text-subtle)"
                        }`}
                      >
                        {eliminated
                          ? t.maexle.eliminated
                          : format(t.maexle.livesRemaining, {
                              n: remaining,
                              total: state.livesTotal,
                            })}
                      </p>
                    </div>
                  </div>
                  <MaexleGallows
                    livesTotal={state.livesTotal}
                    livesRemaining={remaining}
                    className="w-16 h-20 text-(--sf-text-strong) shrink-0"
                  />
                </div>

                {canWrite ? (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => restoreLife(player.id)}
                      disabled={remaining >= state.livesTotal}
                      title={t.maexle.restoreLife}
                      aria-label={t.maexle.restoreLife}
                      className="bg-(--sf-bg) disabled:opacity-30 px-3 py-2.5 border border-(--sf-text)/10 rounded-md font-black disabled:cursor-not-allowed"
                      type="button"
                    >
                      +
                    </button>
                    <button
                      onClick={() => loseLife(player.id)}
                      disabled={remaining <= 0}
                      className="flex-1 bg-[#ef5b2a]/15 hover:bg-[#ef5b2a]/25 disabled:opacity-30 px-3 py-2.5 rounded-md font-black text-[#ef5b2a] disabled:cursor-not-allowed"
                      type="button"
                    >
                      {t.maexle.loseLife}
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </section>

        {canWrite ? (
          state.phase === "finished" ? (
            <button
              onClick={() => setFinished(false)}
              className="mt-4 px-4 py-3 border border-(--sf-text)/15 rounded-md w-full font-black text-(--sf-text-muted)"
              type="button"
            >
              {t.maexle.resumeGameButton}
            </button>
          ) : (
            <button
              onClick={() => setFinished(true)}
              className="mt-4 px-4 py-3 border border-(--accent-2)/40 rounded-md w-full font-bold text-(--sf-text-subtle) text-sm"
              type="button"
            >
              {t.maexle.endGameButton}
            </button>
          )
        ) : null}
      </div>

      {showCelebration ? (
        <WinnerCelebration
          gameType="maexle"
          gameLabel={state.lobbyName || t.maexle.tag}
          standings={celebrationStandings}
          code={game.code}
          lobbyName={state.lobbyName}
          scoreUnit={t.maexle.livesUnit}
          onClose={() => setCelebrationDismissed(true)}
        />
      ) : null}
    </main>
  );
}
