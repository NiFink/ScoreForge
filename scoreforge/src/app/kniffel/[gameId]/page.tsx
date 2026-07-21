"use client";

import { gameThemes } from "@/lib/gameThemes";

import Image from "next/image";
import { use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useGame } from "@/lib/useGame";
import { useI18n } from "@/lib/i18n";
import { Lobby } from "@/components/Lobby";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CodeBadge } from "@/components/CodeBadge";
import { GameSettingsModal } from "@/components/GameSettingsModal";
import {
  WinnerCelebration,
  type CelebrationStanding,
} from "@/components/WinnerCelebration";
import { CategoryModal } from "./CategoryModal";
import { StartPlayerModal } from "./StartPlayerModal";
import {
  LOWER_CATEGORIES,
  UPPER_CATEGORIES,
  createEmptyScores,
  getGrandTotal,
  getNextPlayerIndex,
  getUpperBonus,
  getUpperSum,
  getYahtzeeBonusTotal,
  isScoresheetComplete,
} from "@/features/kniffel/utils";
import type {
  DeviceMode,
  KniffelCategory,
  KniffelState,
  WriteMode,
} from "@/types/gameTypes";

const YAHTZEE_BONUS_MAX = 9;

function isGameOver(state: KniffelState): boolean {
  const playerIds = state.players.map((player) => player.id);

  if (playerIds.length === 0) {
    return false;
  }

  return playerIds.every((id) => isScoresheetComplete(state.scores[id]));
}

export default function KniffelGame({
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
  } = useGame<KniffelState>(gameId);

  const [selectedCell, setSelectedCell] = useState<{
    playerId: string;
    category: KniffelCategory;
  } | null>(null);
  const [celebrationDismissed, setCelebrationDismissed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [startPlayerIndexDraft, setStartPlayerIndexDraft] = useState(0);

  const totals = useMemo(() => {
    if (!state) {
      return {};
    }

    return Object.fromEntries(
      state.players.map((player) => [
        player.id,
        getGrandTotal(
          state.scores[player.id] ?? createEmptyScores(),
          state.yahtzeeBonus[player.id] ?? 0,
        ),
      ]),
    );
  }, [state]);

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
  const showCelebration = gameOver && !celebrationDismissed && !!leader;

  // Bei nur einem Spieler gibt es nichts zu wählen/hervorzuheben - der
  // Startspieler-Dialog und die "Am Zug"-Markierung sind dann übersprungen.
  const isStartPlayerModalOpen =
    !!state &&
    state.phase === "playing" &&
    state.players.length > 1 &&
    !state.startPlayerChosen &&
    isHost;
  const currentPlayerId =
    state && state.startPlayerChosen && state.players.length > 1 && !gameOver
      ? state.players[state.currentPlayerIndex ?? state.startPlayerIndex ?? 0]
          ?.id
      : undefined;

  const celebrationStandings: CelebrationStanding[] = rankedPlayers.map(
    (player) => ({
      id: player.id,
      name: player.name,
      color: player.color,
      score: totals[player.id] ?? 0,
    }),
  );

  const openCategory = (playerId: string, category: KniffelCategory) => {
    if (!canWrite) {
      return;
    }

    setSelectedCell({ playerId, category });
  };

  const setCategoryValue = (
    playerId: string,
    category: KniffelCategory,
    value: number | null,
  ) => {
    mutateState(
      (current) => {
        const nextScores = {
          ...current.scores,
          [playerId]: {
            ...(current.scores[playerId] ?? createEmptyScores()),
            [category]: value,
          },
        };

        // Zug geht nur weiter, wenn der aktuell an der Reihe stehende
        // Spieler eingetragen hat - Korrekturen bei anderen Spielern lassen
        // den Zug unangetastet.
        const currentIndex = current.currentPlayerIndex ?? current.startPlayerIndex ?? 0;
        const currentTurnPlayer = current.players[currentIndex];
        const nextCurrentPlayerIndex =
          current.startPlayerChosen && currentTurnPlayer?.id === playerId
            ? getNextPlayerIndex(current.players, nextScores, currentIndex)
            : current.currentPlayerIndex;

        return {
          ...current,
          scores: nextScores,
          currentPlayerIndex: nextCurrentPlayerIndex,
        };
      },
      (next) => isGameOver(next),
    );

    setSelectedCell(null);
  };

  const confirmStartPlayer = () => {
    mutateState((current) => ({
      ...current,
      startPlayerIndex: startPlayerIndexDraft,
      startPlayerChosen: true,
      currentPlayerIndex: startPlayerIndexDraft,
    }));
  };

  const changeYahtzeeBonus = (playerId: string, delta: number) => {
    mutateState(
      (current) => ({
        ...current,
        yahtzeeBonus: {
          ...current.yahtzeeBonus,
          [playerId]: Math.min(
            YAHTZEE_BONUS_MAX,
            Math.max(0, (current.yahtzeeBonus[playerId] ?? 0) + delta),
          ),
        },
      }),
      (next) => isGameOver(next),
    );
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

  const addPlayer = (name: string, color: string) => {
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
        scores: { ...current.scores, [newId]: createEmptyScores() },
        yahtzeeBonus: { ...current.yahtzeeBonus, [newId]: 0 },
      };
    });
  };

  const removePlayer = (playerId: string) => {
    mutateState((current) => {
      const nextPlayers = current.players.filter(
        (player) => player.id !== playerId,
      );
      const nextScores = Object.fromEntries(
        Object.entries(current.scores).filter(([id]) => id !== playerId),
      );
      const nextBonus = Object.fromEntries(
        Object.entries(current.yahtzeeBonus).filter(([id]) => id !== playerId),
      );

      return {
        ...current,
        players: nextPlayers,
        playerCount: nextPlayers.length,
        scores: nextScores,
        yahtzeeBonus: nextBonus,
      };
    });
  };

  if (notFound) {
    return (
      <main
        style={gameThemes.kniffel.style}
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
        style={gameThemes.kniffel.style}
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
          <p className="text-(--sf-text-muted)">{t.kniffel.loadingGame}</p>
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
          totals={totals}
          minPlayers={1}
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
        style={gameThemes.kniffel.style}
        className="bg-(--sf-bg) px-3 sm:px-6 py-4 min-h-screen text-(--sf-text-strong)"
      >
        <div className="mx-auto max-w-5xl">
          {header(t.kniffel.lobbyTag, t.lobby.header)}
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

  const upperCategoriesBeforeBonus = UPPER_CATEGORIES;
  const lowerCategoriesBeforeBonus = LOWER_CATEGORIES.filter(
    (category) => category !== "chance",
  );

  const renderCategoryCell = (playerId: string, category: KniffelCategory) => {
    const value = state.scores[playerId]?.[category] ?? null;
    // 0 = bewusst gestrichen -> als Kreuz statt "0" anzeigen, damit es sich
    // klar von noch nicht eingetragenen Zellen ("–") unterscheidet.
    const display = value === null ? "–" : value === 0 ? "✕" : value;

    return (
      <td key={playerId} className="py-1 pr-2">
        {canWrite ? (
          <button
            onClick={() => openCategory(playerId, category)}
            className="bg-(--sf-bg) hover:bg-(--accent)/15 px-2 py-2.5 border border-(--sf-text)/10 rounded-md w-full font-black text-right transition"
            type="button"
          >
            {display}
          </button>
        ) : (
          <div className="px-2 py-2.5 font-black text-right">
            {display}
          </div>
        )}
      </td>
    );
  };

  const renderCategoryRow = (category: KniffelCategory) => (
    <tr key={category} className="border-t border-(--sf-text)/10">
      <td className="py-1 pr-3 font-bold whitespace-nowrap">
        {t.kniffel.categories[category]}
      </td>
      {state.players.map((player) => renderCategoryCell(player.id, category))}
    </tr>
  );

  const renderSectionHeader = (label: string) => (
    <tr key={`section-${label}`}>
      <td
        colSpan={state.players.length + 1}
        className="pt-4 pb-1 font-black text-(--accent) text-xs uppercase tracking-[0.16em]"
      >
        {label}
      </td>
    </tr>
  );

  return (
    <main
      style={gameThemes.kniffel.style}
      className="bg-(--sf-bg) px-3 sm:px-6 py-4 min-h-screen text-(--sf-text-strong)"
    >
      <div className="mx-auto max-w-5xl">
        {header(t.kniffel.tag, t.kniffel.scoreTable)}

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
            {t.kniffel.allDone}
            <span className="block mt-0.5 font-semibold text-(--sf-text-subtle) text-xs">
              {t.celebration.showResult}
            </span>
          </button>
        ) : null}

        {/* TOTALS */}
        <section className="gap-2 grid grid-cols-2 sm:grid-cols-4 mb-4">
          {rankedPlayers.map((player) => {
            const isCurrentTurn = player.id === currentPlayerId;

            return (
              <div
                key={player.id}
                className={`bg-(--sf-surface-2)/90 p-3 border rounded-lg min-w-0 ${
                  isCurrentTurn
                    ? "border-(--accent) ring-2 ring-(--accent)/50"
                    : "border-(--sf-text)/10"
                }`}
                style={{ boxShadow: `inset 4px 0 0 ${player.color}` }}
              >
                <div className="flex justify-between items-center gap-2">
                  <p className="flex items-center gap-1.5 min-w-0 text-(--sf-text-muted) text-sm truncate">
                    <PlayerAvatar color={player.color} size="sm" />
                    {player.name}
                  </p>
                  {isCurrentTurn ? (
                    <span className="flex-none bg-(--accent)/15 px-1.5 py-0.5 rounded font-black text-(--accent) text-[10px] uppercase tracking-wide">
                      {t.kniffel.yourTurn}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 font-black text-2xl">
                  {totals[player.id] ?? 0}
                </p>
              </div>
            );
          })}
        </section>

        {/* SCORESHEET */}
        <section className="bg-(--sf-surface-2)/90 p-4 border border-(--accent)/20 rounded-lg overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-(--sf-text-subtle) text-left">
                <th className="py-2 pr-3 font-semibold">
                  {t.kniffel.scoreTable}
                </th>
                {state.players.map((player) => (
                  <th
                    key={player.id}
                    className={`py-2 pr-2 font-semibold text-right ${
                      player.id === currentPlayerId ? "text-(--accent)" : ""
                    }`}
                  >
                    <span className="inline-flex justify-end items-center gap-1.5">
                      <PlayerAvatar color={player.color} size="sm" />
                      {player.name}
                      {player.id === currentPlayerId ? (
                        <span aria-hidden="true">{"▶"}</span>
                      ) : null}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {renderSectionHeader(t.kniffel.upperSection)}
              {upperCategoriesBeforeBonus.map((category) =>
                renderCategoryRow(category),
              )}

              {/* BONUS */}
              <tr className="border-t border-(--sf-text)/10">
                <td className="py-1 pr-3 font-bold whitespace-nowrap">
                  {t.kniffel.bonusRow}
                </td>
                {state.players.map((player) => {
                  const scores = state.scores[player.id] ?? createEmptyScores();
                  const bonus = getUpperBonus(scores);
                  const achieved = bonus > 0;

                  return (
                    <td key={player.id} className="py-1 pr-2 text-right">
                      <div
                        className={`px-2 py-2.5 rounded-md font-black ${
                          achieved
                            ? "bg-[#22c55e]/15 text-[#22c55e]"
                            : "text-(--sf-text-subtle)"
                        }`}
                      >
                        {bonus > 0 ? `+${bonus}` : getUpperSum(scores) + "/63"}
                      </div>
                    </td>
                  );
                })}
              </tr>

              {renderSectionHeader(t.kniffel.lowerSection)}
              {lowerCategoriesBeforeBonus.map((category) =>
                renderCategoryRow(category),
              )}

              {/* YAHTZEE BONUS */}
              <tr className="border-t border-(--sf-text)/10">
                <td className="py-1 pr-3 font-bold whitespace-nowrap">
                  {t.kniffel.yahtzeeBonusRow}
                </td>
                {state.players.map((player) => {
                  const scores = state.scores[player.id] ?? createEmptyScores();
                  const bonusCount = state.yahtzeeBonus[player.id] ?? 0;
                  const canBonus = canWrite && scores.yahtzee === 50;

                  return (
                    <td key={player.id} className="py-1 pr-2">
                      <div className="flex justify-end items-center gap-1">
                        <button
                          onClick={() => changeYahtzeeBonus(player.id, -1)}
                          disabled={!canBonus || bonusCount <= 0}
                          className="bg-(--sf-bg) disabled:opacity-30 px-2 py-1.5 border border-(--sf-text)/10 rounded-md font-black disabled:cursor-not-allowed"
                          type="button"
                        >
                          -
                        </button>
                        <span className="w-6 font-black text-center">
                          {bonusCount}
                        </span>
                        <button
                          onClick={() => changeYahtzeeBonus(player.id, 1)}
                          disabled={!canBonus || bonusCount >= YAHTZEE_BONUS_MAX}
                          className="bg-(--sf-bg) disabled:opacity-30 px-2 py-1.5 border border-(--sf-text)/10 rounded-md font-black disabled:cursor-not-allowed"
                          type="button"
                        >
                          +
                        </button>
                      </div>
                      <p className="mt-0.5 text-(--sf-text-subtle) text-xs text-right">
                        +{getYahtzeeBonusTotal(bonusCount)}
                      </p>
                    </td>
                  );
                })}
              </tr>

              {renderCategoryRow("chance")}

              {/* TOTAL */}
              <tr className="border-t-2 border-(--accent)/40">
                <td className="py-3 pr-3 font-black text-lg whitespace-nowrap">
                  {t.kniffel.totalRow}
                </td>
                {state.players.map((player) => (
                  <td
                    key={player.id}
                    className="py-3 pr-2 font-black text-(--accent-2) text-lg text-right"
                  >
                    {totals[player.id] ?? 0}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </section>
      </div>

      {selectedCell ? (
        <CategoryModal
          playerName={
            state.players.find((player) => player.id === selectedCell.playerId)
              ?.name ?? ""
          }
          category={selectedCell.category}
          currentValue={
            state.scores[selectedCell.playerId]?.[selectedCell.category] ??
            null
          }
          onSave={(value) =>
            setCategoryValue(
              selectedCell.playerId,
              selectedCell.category,
              value,
            )
          }
          onClose={() => setSelectedCell(null)}
        />
      ) : null}

      {showCelebration ? (
        <WinnerCelebration
          gameType="kniffel"
          gameLabel={state.lobbyName || t.kniffel.tag}
          standings={celebrationStandings}
          code={game.code}
          lobbyName={state.lobbyName}
          scoreUnit={t.celebration.pointsLabel}
          onClose={() => setCelebrationDismissed(true)}
        />
      ) : null}

      {isStartPlayerModalOpen ? (
        <StartPlayerModal
          players={state.players}
          selectedPlayerIndex={startPlayerIndexDraft}
          onChange={setStartPlayerIndexDraft}
          onConfirm={confirmStartPlayer}
        />
      ) : null}
    </main>
  );
}
