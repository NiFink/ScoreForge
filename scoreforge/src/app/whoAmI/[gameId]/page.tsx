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
import { WhoAmIRevealModal } from "./WhoAmIRevealModal";
import { WhoAmIAuthorModal } from "./WhoAmIAuthorModal";
import { WhoAmIAuthorForm } from "./WhoAmIAuthorForm";
import { WhoAmIBoardList } from "./WhoAmIBoardList";
import { pickRandomWord, pickRandomWords } from "@/features/partyWords/utils";
import type { DeviceMode, Player, WhoAmIState, WriteMode } from "@/types/gameTypes";

function isGameOver(state: WhoAmIState): boolean {
  return !!state.roundEnded || state.guessedOrder.length >= state.players.length;
}

// Spieler i schreibt in der Autoren-Phase die Identität von Spieler i+1.
function authorTargetFor(players: Player[], writerId: string): Player | undefined {
  const index = players.findIndex((player) => player.id === writerId);

  if (index === -1) {
    return undefined;
  }

  return players[(index + 1) % players.length];
}

export default function WhoAmIGame({
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
  } = useGame<WhoAmIState>(gameId);

  const [showSettings, setShowSettings] = useState(false);
  const [revealingPlayerId, setRevealingPlayerId] = useState<string | null>(
    null,
  );
  const [authoringWriterId, setAuthoringWriterId] = useState<string | null>(
    null,
  );
  const [celebrationDismissed, setCelebrationDismissed] = useState(false);
  // Host-lokaler Aufdeck-Modus: für Mitspieler ohne eigenes Handy. Der Host
  // gibt seine Gesamtübersicht (eigenes Auto-Brett) auf und deckt stattdessen
  // jedes Brett einzeln per Identitäts-Bestätigung auf (wie Pass-and-play).
  const [hostRevealMode, setHostRevealMode] = useState(false);

  const gameOver = !!state && isGameOver(state);

  // Gerät gehört klar einer Person (Lobby-Claim) -> die sieht ihr Brett
  // automatisch, ohne jedes Mal zu bestätigen. Außer "everyoneActsAsHost"
  // ist an, dann läuft für alle der manuelle Pass-and-play-Ablauf.
  const myPlayer =
    state &&
    state.deviceMode === "multi" &&
    !state.everyoneActsAsHost
      ? (state.players.find((player) => player.claimedBy === clientId) ?? null)
      : null;

  const rankedPlayers = useMemo(() => {
    if (!state) {
      return [];
    }

    const order = state.guessedOrder;

    return [...state.players].sort((left, right) => {
      const leftIndex = order.indexOf(left.id);
      const rightIndex = order.indexOf(right.id);

      if (leftIndex === -1 && rightIndex === -1) {
        return 0;
      }
      if (leftIndex === -1) {
        return 1;
      }
      if (rightIndex === -1) {
        return -1;
      }

      return leftIndex - rightIndex;
    });
  }, [state]);

  const showCelebration = gameOver && !celebrationDismissed;

  const celebrationStandings: CelebrationStanding[] = useMemo(() => {
    if (!state) {
      return [];
    }

    return rankedPlayers.map((player) => {
      const position = state.guessedOrder.indexOf(player.id);
      const guessed = position !== -1;

      return {
        id: player.id,
        name: player.name,
        color: player.color,
        score: guessed ? state.players.length - position : 0,
        detail: guessed
          ? format(t.whoAmI.wordRevealDetail, { word: state.words[player.id] })
          : t.whoAmI.notGuessedDetail,
      };
    });
  }, [rankedPlayers, state, t]);

  const changeWriteMode = (writeMode: WriteMode) => {
    mutateState((current) => ({ ...current, writeMode }));
  };

  const changeDeviceMode = (deviceMode: DeviceMode) => {
    mutateState((current) => ({
      ...current,
      deviceMode,
      // Mehrgeräte: jeder verwaltet sein eigenes Gerät -> "Alle". Ein
      // gemeinsames Gerät -> nur der Host, damit vorher erteilte Rechte
      // automatisch wieder wegfallen.
      writeMode: deviceMode === "multi" ? "all" : "host",
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
  };

  const toggleGuessed = (playerId: string) => {
    mutateState(
      (current) => ({
        ...current,
        guessedOrder: current.guessedOrder.includes(playerId)
          ? current.guessedOrder.filter((id) => id !== playerId)
          : [...current.guessedOrder, playerId],
      }),
      (next) => isGameOver(next),
    );
  };

  const reassignWord = (playerId: string) => {
    mutateState((current) => {
      if (current.wordMode !== "category") {
        return current;
      }

      return {
        ...current,
        words: {
          ...current.words,
          [playerId]: pickRandomWord(t.partyWords.categories, current.categoryKey),
        },
        // Das alte Wort war die Grundlage fürs Erraten - mit neuem Wort
        // zählt ein bisheriger "erraten"-Status nicht mehr.
        guessedOrder: current.guessedOrder.filter((id) => id !== playerId),
      };
    });
  };

  const endRound = () => {
    mutateState(
      (current) => ({ ...current, roundEnded: true }),
      () => true,
    );
    setCelebrationDismissed(false);
  };

  const startNewRound = () => {
    mutateState((current) => {
      if (current.wordMode === "custom") {
        return {
          ...current,
          words: {},
          authoredIds: [],
          revealedIds: [],
          guessedOrder: [],
          roundEnded: false,
          phase: "authoring",
          round: current.round + 1,
        };
      }

      const words = pickRandomWords(
        t.partyWords.categories,
        current.categoryKey,
        current.players.length,
      );

      return {
        ...current,
        words: Object.fromEntries(
          current.players.map((player, index) => [player.id, words[index]]),
        ),
        revealedIds: [],
        guessedOrder: [],
        roundEnded: false,
        round: current.round + 1,
      };
    });
    setCelebrationDismissed(false);
  };

  const submitAuthoredWord = (
    writerId: string,
    targetId: string,
    word: string,
  ) => {
    mutateState((current) => {
      const authored = current.authoredIds ?? [];
      const nextAuthored = authored.includes(writerId)
        ? authored
        : [...authored, writerId];
      const allDone = nextAuthored.length >= current.players.length;

      return {
        ...current,
        words: { ...current.words, [targetId]: word },
        authoredIds: nextAuthored,
        phase: allDone ? "playing" : current.phase,
      };
    });
    setAuthoringWriterId(null);
  };

  if (notFound) {
    return (
      <main
        style={gameThemes.whoAmI.style}
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
        style={gameThemes.whoAmI.style}
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
          <p className="text-(--sf-text-muted)">{t.whoAmI.loadingGame}</p>
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
          minPlayers={2}
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
          hideWriteMode={state.deviceMode === "multi"}
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
        style={gameThemes.whoAmI.style}
        className="bg-(--sf-bg) px-3 sm:px-6 py-4 min-h-screen text-(--sf-text-strong)"
      >
        <div className="mx-auto max-w-5xl">
          {header(t.whoAmI.lobbyTag, t.lobby.header)}
          <Lobby
            game={game}
            clientId={clientId}
            isHost={isHost}
            onClaim={claimSlot}
            onStart={() =>
              mutateState((current) => ({
                ...current,
                phase: current.wordMode === "custom" ? "authoring" : "playing",
              }))
            }
          />
        </div>
      </main>
    );
  }

  if (state.phase === "authoring") {
    const authoredSet = new Set(state.authoredIds ?? []);
    const nextWriter = state.players.find((player) => !authoredSet.has(player.id));
    const myTarget = myPlayer && !authoredSet.has(myPlayer.id)
      ? authorTargetFor(state.players, myPlayer.id)
      : undefined;
    const writerForModal = state.players.find(
      (player) => player.id === authoringWriterId,
    );

    return (
      <main
        style={gameThemes.whoAmI.style}
        className="bg-(--sf-bg) px-3 sm:px-6 py-4 min-h-screen text-(--sf-text-strong)"
      >
        <div className="mx-auto max-w-5xl">
          {header(t.whoAmI.tag, t.whoAmI.authoringTag)}

          <section className="bg-(--sf-surface-2)/90 p-5 border border-(--accent)/30 rounded-lg text-center">
            {myTarget ? (
              <WhoAmIAuthorForm
                targetName={myTarget.name}
                onSubmit={(word) =>
                  submitAuthoredWord(myPlayer!.id, myTarget.id, word)
                }
              />
            ) : myPlayer ? (
              <p className="text-(--sf-text-muted) text-sm">
                {t.whoAmI.authoringWaitingForOthers}
              </p>
            ) : nextWriter ? (
              <>
                <h2 className="font-black text-2xl">
                  {format(t.whoAmI.authoringWriterPrompt, {
                    writer: nextWriter.name,
                  })}
                </h2>
                {canWrite ? (
                  <button
                    onClick={() => setAuthoringWriterId(nextWriter.id)}
                    className="bg-(--accent) mt-4 px-5 py-3.5 rounded-lg font-black text-(--on-accent)"
                    type="button"
                  >
                    {t.whoAmI.view}
                  </button>
                ) : null}
              </>
            ) : (
              <p className="text-(--sf-text-muted) text-sm">
                {t.whoAmI.authoringWaitingForOthers}
              </p>
            )}
          </section>

          <div className="gap-2 grid grid-cols-2 mt-4">
            {state.players.map((player) => (
              <div
                key={player.id}
                className="flex items-center gap-2 bg-(--sf-surface-2)/90 px-3 py-2 border border-(--sf-text)/10 rounded-lg"
                style={{ boxShadow: `inset 4px 0 0 ${player.color}` }}
              >
                <PlayerAvatar color={player.color} size="sm" />
                <span className="flex-1 min-w-0 font-bold text-sm truncate">
                  {player.name}
                </span>
                {authoredSet.has(player.id) ? (
                  <span className="flex-none text-[#22c55e] text-xs">✓</span>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        {writerForModal && authorTargetFor(state.players, writerForModal.id) ? (
          <WhoAmIAuthorModal
            writerName={writerForModal.name}
            targetName={authorTargetFor(state.players, writerForModal.id)!.name}
            onSubmit={(word) =>
              submitAuthoredWord(
                writerForModal.id,
                authorTargetFor(state.players, writerForModal.id)!.id,
                word,
              )
            }
            onCancel={() => setAuthoringWriterId(null)}
          />
        ) : null}
      </main>
    );
  }

  const revealingPlayer = state.players.find(
    (player) => player.id === revealingPlayerId,
  );

  // Wer selbst einen Platz belegt hat, sieht ausschließlich sein eigenes
  // Brett (wird oben automatisch angezeigt). Fremde Bretter darf nur der Host
  // per Weiterreichen aufdecken - sonst würde man beim Aufdecken eines anderen
  // Spielers sein eigenes geheimes Wort sehen.
  const canRevealOthers = isHost || !myPlayer;

  // Aktiver Host-Aufdeck-Modus: der Host verzichtet auf sein Auto-Brett und
  // deckt jedes Brett einzeln auf (auch belegte Plätze) - für Runden, in denen
  // nicht jeder ein eigenes Handy hat.
  const hostRevealing = isHost && hostRevealMode;
  // Gibt es überhaupt etwas zu übernehmen (eigene Übersicht oder Plätze mit
  // eigenem Gerät)? Nur dann ist der Umschalter sinnvoll.
  const someoneHasOwnDevice =
    state.deviceMode === "multi" &&
    !state.everyoneActsAsHost &&
    state.players.some(
      (player) => !!player.claimedBy && player.claimedBy !== clientId,
    );
  const showHostRevealToggle = isHost && (!!myPlayer || someoneHasOwnDevice);

  return (
    <main
      style={gameThemes.whoAmI.style}
      className="bg-(--sf-bg) px-3 sm:px-6 py-4 min-h-screen text-(--sf-text-strong)"
    >
      <div className="mx-auto max-w-5xl">
        {header(t.whoAmI.tag, format(t.whoAmI.roundLabel, { n: state.round }))}

        {!canWrite ? (
          <p className="bg-(--sf-surface) mb-4 px-4 py-3 border border-(--accent-2)/25 rounded-md text-(--sf-text-subtle) text-sm">
            {t.common.hostOnlyBanner}
          </p>
        ) : null}

        {gameOver ? (
          <button
            onClick={() => setCelebrationDismissed(false)}
            className="bg-(--accent)/10 hover:bg-(--accent)/20 mb-4 px-4 py-3 border border-(--accent)/40 rounded-lg w-full font-black text-(--accent-2) text-lg text-center"
            type="button"
          >
            {"\u{1F3C6} "}
            {t.celebration.showResult}
          </button>
        ) : (
          <p className="bg-(--sf-surface-2)/90 mb-4 px-4 py-3 border border-(--accent)/30 rounded-lg text-(--sf-text-subtle) text-xs text-center">
            {t.whoAmI.guessedOrderHint}
          </p>
        )}

        {/* HOST-AUFDECK-MODUS (für Mitspieler ohne eigenes Handy) */}
        {showHostRevealToggle ? (
          <div className="bg-(--sf-surface-2)/90 mb-4 p-3 border border-(--accent-2)/30 rounded-lg">
            <button
              onClick={() => setHostRevealMode((active) => !active)}
              className={`px-4 py-2.5 rounded-md w-full font-black text-sm ${
                hostRevealMode
                  ? "bg-(--accent) text-(--on-accent)"
                  : "bg-(--sf-bg) text-(--sf-text-muted) border border-(--sf-text)/15"
              }`}
              type="button"
            >
              {hostRevealMode
                ? t.whoAmI.hostRevealModeActive
                : t.whoAmI.hostRevealMode}
            </button>
            <p className="mt-1.5 text-(--sf-text-subtle) text-xs">
              {t.whoAmI.hostRevealModeHint}
            </p>
          </div>
        ) : null}

        {/* AUTO-BRETT (eigenes verbundenes Gerät) */}
        {myPlayer && !hostRevealing ? (
          <section className="bg-(--sf-surface-2)/90 mb-4 p-4 border border-(--accent)/30 rounded-lg">
            <p className="font-black text-(--sf-text) text-sm uppercase tracking-[0.14em]">
              {t.whoAmI.boardTitle}
            </p>
            <div className="mt-3">
              <WhoAmIBoardList
                players={state.players}
                words={state.words}
                selfId={myPlayer.id}
              />
            </div>
          </section>
        ) : null}

        {/* SPIELER */}
        <section className="gap-3 grid sm:grid-cols-2 lg:grid-cols-3">
          {state.players.map((player) => {
            const seen = state.revealedIds.includes(player.id);
            const guessed = state.guessedOrder.includes(player.id);
            const isMine = myPlayer?.id === player.id;
            const hasOwnDevice =
              !isMine &&
              state.deviceMode === "multi" &&
              !state.everyoneActsAsHost &&
              !!player.claimedBy &&
              player.claimedBy !== clientId;

            return (
              <div
                key={player.id}
                className="bg-(--sf-surface-2)/90 p-3 border border-(--sf-text)/10 rounded-lg"
                style={{ boxShadow: `inset 4px 0 0 ${player.color}` }}
              >
                <div className="flex justify-between items-center gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <PlayerAvatar color={player.color} size="lg" />
                    <p className="font-bold truncate">{player.name}</p>
                  </div>
                  <div className="flex flex-none items-center gap-1.5">
                    {seen ? (
                      <span
                        aria-hidden="true"
                        className="text-[#22c55e] text-sm"
                      >
                        ✓
                      </span>
                    ) : null}
                    {(isMine || hasOwnDevice) && !hostRevealing ? (
                      <span className="bg-(--sf-bg) px-2 py-1 rounded-md text-(--sf-text-subtle) text-xs whitespace-nowrap">
                        {"📱"}
                      </span>
                    ) : canRevealOthers ? (
                      <button
                        onClick={() => setRevealingPlayerId(player.id)}
                        className="bg-(--accent) px-3 py-2 rounded-md font-black text-(--on-accent) text-sm whitespace-nowrap"
                        type="button"
                      >
                        {seen ? t.whoAmI.viewAgain : t.whoAmI.view}
                      </button>
                    ) : null}
                    {isHost && state.wordMode === "category" ? (
                      <button
                        onClick={() => reassignWord(player.id)}
                        title={t.whoAmI.reassignWordButton}
                        aria-label={t.whoAmI.reassignWordButton}
                        className="bg-(--sf-bg) px-2 py-2 border border-(--sf-text)/10 rounded-md text-sm"
                        type="button"
                      >
                        {"🔄"}
                      </button>
                    ) : null}
                  </div>
                </div>

                {canWrite ? (
                  <button
                    onClick={() => toggleGuessed(player.id)}
                    className={`mt-2 px-3 py-2 rounded-md w-full font-bold text-sm ${
                      guessed
                        ? "bg-[#22c55e]/15 text-[#22c55e]"
                        : "bg-(--sf-bg) text-(--sf-text-muted)"
                    }`}
                    type="button"
                  >
                    {guessed
                      ? `✓ ${t.whoAmI.alreadyGuessed}`
                      : t.whoAmI.markGuessed}
                  </button>
                ) : null}
              </div>
            );
          })}
        </section>

        {canWrite ? (
          <div className="gap-2 grid grid-cols-2 mt-4">
            <button
              onClick={endRound}
              className="px-4 py-3 border border-(--accent-2)/40 rounded-md font-bold text-(--sf-text-subtle) text-sm"
              type="button"
            >
              {t.whoAmI.endRoundButton}
            </button>
            <button
              onClick={startNewRound}
              className="bg-(--accent) px-4 py-3 rounded-md font-black text-(--on-accent) text-sm"
              type="button"
            >
              {t.whoAmI.newRoundButton}
            </button>
          </div>
        ) : null}
      </div>

      {revealingPlayer ? (
        <WhoAmIRevealModal
          player={revealingPlayer}
          players={state.players}
          words={state.words}
          categoryKey={state.categoryKey}
          wordMode={state.wordMode}
          onDone={() => {
            markRevealed(revealingPlayer.id);
            setRevealingPlayerId(null);
          }}
          onCancel={() => setRevealingPlayerId(null)}
        />
      ) : null}

      {showCelebration ? (
        <WinnerCelebration
          gameType="whoAmI"
          gameLabel={state.lobbyName || t.whoAmI.tag}
          standings={celebrationStandings}
          code={game.code}
          lobbyName={state.lobbyName}
          scoreUnit={t.common.points}
          onClose={() => setCelebrationDismissed(true)}
        />
      ) : null}
    </main>
  );
}
