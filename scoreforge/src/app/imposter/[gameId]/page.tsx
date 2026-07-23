"use client";

import { gameThemes } from "@/lib/gameThemes";

import Image from "next/image";
import { use, useState } from "react";
import { useRouter } from "next/navigation";

import { useGame } from "@/lib/useGame";
import { format, useI18n } from "@/lib/i18n";
import { Lobby } from "@/components/Lobby";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CodeBadge } from "@/components/CodeBadge";
import { GameSettingsModal } from "@/components/GameSettingsModal";
import { ImposterRevealModal } from "./ImposterRevealModal";
import { pickRandomImposters, pickRandomWord } from "@/features/partyWords/utils";
import type { DeviceMode, ImposterState, WriteMode } from "@/types/gameTypes";

export default function ImposterGame({
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
  } = useGame<ImposterState>(gameId);

  const [showSettings, setShowSettings] = useState(false);
  const [revealingPlayerId, setRevealingPlayerId] = useState<string | null>(
    null,
  );

  const changeWriteMode = (writeMode: WriteMode) => {
    mutateState((current) => ({ ...current, writeMode }));
  };

  const changeDeviceMode = (deviceMode: DeviceMode) => {
    mutateState((current) => ({
      ...current,
      deviceMode,
      // Ein gemeinsames Gerät -> nur der Host (wer es in der Hand hält) editiert;
      // vergibt evtl. vorher erteilte "Alle"-Rechte automatisch wieder.
      writeMode: deviceMode === "single" ? "host" : current.writeMode,
    }));
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

  const markRevealed = (playerId: string) => {
    mutateState((current) => ({
      ...current,
      revealedIds: current.revealedIds.includes(playerId)
        ? current.revealedIds
        : [...current.revealedIds, playerId],
    }));
    setRevealingPlayerId(null);
  };

  const startNewRound = (winner?: "crew" | "imposter") => {
    mutateState((current) => {
      const word = pickRandomWord(t.partyWords.categories, current.categoryKey);
      const imposterIds = pickRandomImposters(
        current.players.map((player) => player.id),
        current.imposterCount,
      );

      return {
        ...current,
        word,
        imposterIds,
        revealedIds: [],
        round: current.round + 1,
        crewWins: winner === "crew" ? current.crewWins + 1 : current.crewWins,
        imposterWins:
          winner === "imposter" ? current.imposterWins + 1 : current.imposterWins,
      };
    });
  };

  const endGame = () => {
    mutateState(
      (current) => ({ ...current, phase: "finished" }),
      () => true,
    );
  };

  const continuePlaying = () => {
    mutateState((current) => ({ ...current, phase: "playing" }));
  };

  if (notFound) {
    return (
      <main
        style={gameThemes.imposter.style}
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
        style={gameThemes.imposter.style}
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
          <p className="text-(--sf-text-muted)">{t.imposter.loadingGame}</p>
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
          totals={{}}
          minPlayers={3}
          maxPlayers={10}
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
        style={gameThemes.imposter.style}
        className="bg-(--sf-bg) px-3 sm:px-6 py-4 min-h-screen text-(--sf-text-strong)"
      >
        <div className="mx-auto max-w-5xl">
          {header(t.imposter.lobbyTag, t.lobby.header)}
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

  if (state.phase === "finished") {
    const resultText =
      state.crewWins > state.imposterWins
        ? t.imposter.resultCrewWins
        : state.imposterWins > state.crewWins
          ? t.imposter.resultImposterWins
          : t.imposter.resultTie;

    return (
      <main
        style={gameThemes.imposter.style}
        className="bg-(--sf-bg) px-3 sm:px-6 py-4 min-h-screen text-(--sf-text-strong)"
      >
        <div className="mx-auto max-w-5xl">
          {header(t.imposter.finishedTag, t.imposter.finishedTitle)}

          <section className="bg-(--sf-surface-2)/90 mx-auto p-6 border border-(--accent)/20 rounded-lg max-w-md text-center">
            <p className="font-black text-2xl">{resultText}</p>

            <div className="gap-3 grid grid-cols-2 mt-5">
              <div className="bg-(--sf-surface) p-3 rounded-lg">
                <p className="text-(--sf-text-subtle) text-xs">
                  {t.imposter.crewLabel}
                </p>
                <p className="font-black text-3xl">{state.crewWins}</p>
              </div>
              <div className="bg-(--sf-surface) p-3 rounded-lg">
                <p className="text-(--sf-text-subtle) text-xs">
                  {t.imposter.imposterLabel}
                </p>
                <p className="font-black text-3xl">{state.imposterWins}</p>
              </div>
            </div>

            {canWrite ? (
              <button
                onClick={continuePlaying}
                className="bg-(--accent) mt-5 px-5 py-3 rounded-lg w-full font-black text-(--on-accent)"
                type="button"
              >
                {t.imposter.continuePlaying}
              </button>
            ) : null}

            <button
              onClick={() => router.push("/")}
              className="mt-2 px-5 py-3 border border-(--sf-text)/15 rounded-lg w-full font-bold text-(--sf-text-muted)"
              type="button"
            >
              {t.common.toHome}
            </button>
          </section>
        </div>
      </main>
    );
  }

  const allRevealed = state.revealedIds.length >= state.players.length;
  const revealingPlayer = state.players.find(
    (player) => player.id === revealingPlayerId,
  );
  const categoryLabel =
    state.categoryKey === "random"
      ? null
      : t.partyWords.categories[state.categoryKey].label;

  return (
    <main
      style={gameThemes.imposter.style}
      className="bg-(--sf-bg) px-3 sm:px-6 py-4 min-h-screen text-(--sf-text-strong)"
    >
      <div className="mx-auto max-w-5xl">
        {header(t.imposter.tag, format(t.imposter.roundLabel, { n: state.round }))}

        {!canWrite ? (
          <p className="bg-(--sf-surface) mb-4 px-4 py-3 border border-(--accent-2)/25 rounded-md text-(--sf-text-subtle) text-sm">
            {t.common.hostOnlyBanner}
          </p>
        ) : null}

        <p className="bg-(--sf-surface-2)/90 mb-4 px-4 py-3 border border-(--accent)/30 rounded-lg font-bold text-(--accent-2) text-sm text-center">
          {allRevealed ? t.imposter.allRevealed : t.imposter.waitingForReveals}
        </p>

        {/* SPIELER */}
        <section className="gap-3 grid sm:grid-cols-2 lg:grid-cols-3">
          {state.players.map((player) => {
            const seen = state.revealedIds.includes(player.id);

            return (
              <div
                key={player.id}
                className="flex justify-between items-center gap-3 bg-(--sf-surface-2)/90 p-3 border border-(--sf-text)/10 rounded-lg"
                style={{ boxShadow: `inset 4px 0 0 ${player.color}` }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <PlayerAvatar color={player.color} size="lg" />
                  <p className="font-bold truncate">{player.name}</p>
                </div>
                {seen ? (
                  <span className="flex-none bg-(--accent)/15 px-2 py-1 rounded-md font-bold text-(--accent-2) text-xs whitespace-nowrap">
                    {"✓ "}
                    {t.imposter.seen}
                  </span>
                ) : canWrite ? (
                  <button
                    onClick={() => setRevealingPlayerId(player.id)}
                    className="flex-none bg-(--accent) px-3 py-2 rounded-md font-black text-(--on-accent) text-sm whitespace-nowrap"
                    type="button"
                  >
                    {t.imposter.view}
                  </button>
                ) : null}
              </div>
            );
          })}
        </section>

        {/* SCOREBOARD */}
        <section className="bg-(--sf-surface-2)/90 mt-4 p-4 border border-(--accent)/20 rounded-lg">
          <p className="font-black text-(--sf-text) text-sm uppercase tracking-[0.14em]">
            {t.imposter.scoreboardTitle}
          </p>
          <div className="gap-3 grid grid-cols-2 mt-3">
            <div className="bg-(--sf-surface) p-3 rounded-lg text-center">
              <p className="text-(--sf-text-subtle) text-xs">{t.imposter.crewLabel}</p>
              <p className="font-black text-3xl">{state.crewWins}</p>
            </div>
            <div className="bg-(--sf-surface) p-3 rounded-lg text-center">
              <p className="text-(--sf-text-subtle) text-xs">{t.imposter.imposterLabel}</p>
              <p className="font-black text-3xl">{state.imposterWins}</p>
            </div>
          </div>

          {canWrite ? (
            <div className="gap-2 grid grid-cols-2 mt-3">
              <button
                onClick={() => startNewRound("crew")}
                className="bg-(--accent-2)/15 px-3 py-3 rounded-md font-bold text-(--accent-2) text-sm"
                type="button"
              >
                {t.imposter.crewWinsButton}
              </button>
              <button
                onClick={() => startNewRound("imposter")}
                className="bg-[#ef4444]/15 px-3 py-3 rounded-md font-bold text-[#ef4444] text-sm"
                type="button"
              >
                {t.imposter.imposterWinsButton}
              </button>
            </div>
          ) : null}

          {canWrite ? (
            <button
              onClick={() => startNewRound()}
              className="mt-2 px-4 py-3 border border-(--sf-text)/15 rounded-md w-full font-bold text-(--sf-text-muted) text-sm"
              type="button"
            >
              {t.imposter.newRoundButton}
            </button>
          ) : null}

          {canWrite ? (
            <button
              onClick={endGame}
              className="mt-2 px-4 py-3 border border-[#ef4444]/40 rounded-md w-full font-bold text-[#ef4444] text-sm"
              type="button"
            >
              {t.imposter.endGameButton}
            </button>
          ) : null}
        </section>
      </div>

      {revealingPlayer ? (
        <ImposterRevealModal
          player={revealingPlayer}
          isImposter={state.imposterIds.includes(revealingPlayer.id)}
          word={state.word}
          categoryLabel={categoryLabel}
          onDone={() => markRevealed(revealingPlayer.id)}
          onCancel={() => setRevealingPlayerId(null)}
        />
      ) : null}
    </main>
  );
}
