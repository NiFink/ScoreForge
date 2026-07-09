"use client";

import { gameThemes } from "@/lib/gameThemes";

import Image from "next/image";
import { use, useState } from "react";
import { useRouter } from "next/navigation";

import { useGame } from "@/lib/useGame";
import { format, useI18n } from "@/lib/i18n";
import { Lobby } from "@/components/Lobby";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { CodeBadge } from "@/components/CodeBadge";
import { DeleteGameButton } from "@/components/DeleteGameButton";
import { WinnerCelebration } from "@/components/WinnerCelebration";
import { StartCounterModal } from "./StartCounterModal";
import type {
  DoomlingsScores,
  DoomlingsState,
} from "../../types/gameTypes";
import {
  getCountingOrder,
  getRevealOrder,
  getScoreKeys,
  getScoreTotal,
} from "../../Utils/doomlingsUtils";

const emptyScores = (): DoomlingsScores => ({
  numbers: 0,
  cross: 0,
  sickle: 0,
  worldsEnd: 0,
});

export default function DoomlingsGame({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = use(params);
  const router = useRouter();
  const { t } = useI18n();
  const [celebrationDismissed, setCelebrationDismissed] = useState(false);
  const [counterIndexDraft, setCounterIndexDraft] = useState(0);

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
  } = useGame<DoomlingsState>(gameId);

  const scoreKeys = getScoreKeys(state?.addons ?? []);

  const stepLabelMap: Record<
    keyof DoomlingsScores,
    { title: string; hint: string }
  > = {
    worldsEnd: {
      title: t.doomlings.stepWorldsEndTitle,
      hint: t.doomlings.stepWorldsEndHint,
    },
    sickle: {
      title: t.doomlings.stepSickleTitle,
      hint: t.doomlings.stepSickleHint,
    },
    numbers: {
      title: t.doomlings.stepNumbersTitle,
      hint: t.doomlings.stepNumbersHint,
    },
    cross: {
      title: t.doomlings.stepCrossTitle,
      hint: t.doomlings.stepCrossHint,
    },
    secretGoals: {
      title: t.doomlings.stepSecretGoalsTitle,
      hint: t.doomlings.stepSecretGoalsHint,
    },
  };

  const getScores = (playerId: string): DoomlingsScores =>
    state?.scores?.[playerId] ?? emptyScores();

  const getTotal = (playerId: string): number =>
    getScoreTotal(getScores(playerId), scoreKeys);

  const setScore = (
    playerId: string,
    key: keyof DoomlingsScores,
    value: number,
  ) => {
    mutateState((current) => ({
      ...current,
      scores: {
        ...current.scores,
        [playerId]: {
          ...(current.scores?.[playerId] ?? emptyScores()),
          [key]: value,
        },
      },
    }));
  };

  const setPhase = (phase: DoomlingsState["phase"]) => {
    // "finished" -> Lobby läuft nur noch 1 Stunde weiter
    mutateState(
      (current) => ({ ...current, phase }),
      (next) => next.phase === "finished",
    );
  };

  const setStep = (step: number) => {
    mutateState((current) => ({ ...current, scoringStep: step }));
  };

  const startScoring = () => {
    mutateState((current) => ({
      ...current,
      phase: "scoring",
      scoringStep: 0,
      scoringStartPlayerChosen: false,
      readyPlayers: {},
      revealIndex: 0,
    }));
  };

  const backToScoring = () => {
    mutateState((current) => ({
      ...current,
      phase: "scoring",
      readyPlayers: {},
      revealIndex: 0,
    }));
  };

  const confirmCounter = () => {
    mutateState((current) => ({
      ...current,
      scoringStartPlayerIndex: counterIndexDraft,
      scoringStartPlayerChosen: true,
    }));
  };

  const toggleReady = (playerId: string) => {
    mutateState((current) => ({
      ...current,
      readyPlayers: {
        ...current.readyPlayers,
        [playerId]: !current.readyPlayers?.[playerId],
      },
    }));
  };

  const startReveal = () => {
    mutateState((current) => ({
      ...current,
      phase: "revealing",
      revealIndex: 0,
    }));
  };

  const revealNext = () => {
    mutateState((current) => ({
      ...current,
      revealIndex: Math.min(
        (current.revealIndex ?? 0) + 1,
        current.players.length,
      ),
    }));
  };

  if (notFound) {
    return (
      <main style={gameThemes.doomlings.style} className="place-items-center grid bg-[#101820] px-4 min-h-screen text-[#fff4c7]">
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
      <main style={gameThemes.doomlings.style} className="place-items-center grid bg-[#101820] px-4 min-h-screen text-[#fff4c7]">
        <div className="text-center">
          <Image
            src="/Logo.png"
            alt="ScoreForge Logo"
            width={96}
            height={96}
            loading="eager"
            className="mx-auto mb-4 rounded-lg w-20 h-20 object-cover"
          />
          <p className="text-[#d8d3bd]">{t.doomlings.loadingGame}</p>
        </div>
      </main>
    );
  }

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
          {isHost ? <DeleteGameButton onDelete={deleteGame} /> : null}
          <LanguageSwitcher />
        </div>
      </div>
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
            <p className="text-[#9fc9d5]">{t.common.players}</p>
            <p className="font-black">{state.playerCount}</p>
          </div>
          <div className="bg-[#18262f] px-3 py-2 border border-[#f7e7ad]/10 rounded-md">
            <p className="text-[#9fc9d5]">{t.common.mode}</p>
            <p className="font-black">
              {state.writeMode === "host" ? t.common.modeHost : t.common.modeAll}
            </p>
          </div>
        </div>
      </div>
      {state.addons.length > 0 ? (
        <div className="flex flex-wrap gap-2 mt-3">
          {state.addons.map((addon) => (
            <span
              key={addon}
              className="bg-(--accent-2)/10 px-2 py-1 border border-(--accent-2)/25 rounded-md text-[#9fc9d5] text-xs"
            >
              {addon}
            </span>
          ))}
        </div>
      ) : null}
    </header>
  );

  if (state.phase === "lobby") {
    return (
      <main style={gameThemes.doomlings.style} className="bg-[#101820] px-3 sm:px-6 py-4 min-h-screen text-[#fff4c7]">
        <div className="mx-auto max-w-5xl">
          {header(t.doomlings.lobbyTag, t.lobby.header)}
          <Lobby
            game={game}
            clientId={clientId}
            isHost={isHost}
            onClaim={claimSlot}
            onStart={() => setPhase("playing")}
          />
        </div>
      </main>
    );
  }

  if (state.phase === "playing") {
    return (
      <main style={gameThemes.doomlings.style} className="bg-[#101820] px-3 sm:px-6 py-4 min-h-screen text-[#fff4c7]">
        <div className="mx-auto max-w-5xl">
          {header(t.doomlings.tag, t.doomlings.overview)}

          <section className="bg-[#14222b]/90 p-5 border border-(--accent)/20 rounded-lg">
            <p className="text-[#d8d3bd]">{t.doomlings.playingHint}</p>

            <div className="gap-2 grid sm:grid-cols-2 mt-4">
              {state.players.map((player) => (
                <div
                  key={player.id}
                  className="bg-[#18262f] p-3 border border-[#f7e7ad]/10 rounded-lg"
                  style={{ boxShadow: `inset 4px 0 0 ${player.color}` }}
                >
                  <p className="font-bold">{player.name}</p>
                </div>
              ))}
            </div>

            {canWrite ? (
              <button
                onClick={startScoring}
                className="bg-(--accent) mt-5 px-5 py-4 rounded-lg w-full font-black text-(--on-accent)"
                type="button"
              >
                {t.doomlings.startScoring}
              </button>
            ) : (
              <p className="mt-5 text-[#9fc9d5] text-sm text-center">
                {t.common.hostOnlyBanner}
              </p>
            )}
          </section>
        </div>
      </main>
    );
  }

  const isStartCounterModalOpen =
    state.phase === "scoring" && !state.scoringStartPlayerChosen && isHost;

  if (state.phase === "scoring") {
    const orderedPlayers = getCountingOrder(
      state.players,
      state.scoringStartPlayerIndex ?? 0,
    );

    if (state.deviceMode === "multi") {
      const readyCount = state.players.filter(
        (player) => state.readyPlayers?.[player.id],
      ).length;
      const allReady =
        state.players.length > 0 && readyCount === state.players.length;

      return (
        <main style={gameThemes.doomlings.style} className="bg-[#101820] px-3 sm:px-6 py-4 min-h-screen text-[#fff4c7]">
          <div className="mx-auto max-w-3xl">
            {header(t.doomlings.scoringTag, t.doomlings.overview)}

            {state.scoringStartPlayerChosen ? (
              <p className="mb-4 text-[#9fc9d5] text-sm">
                {format(t.doomlings.countingOrderHint, {
                  name:
                    state.players[state.scoringStartPlayerIndex ?? 0]?.name ??
                    "",
                })}
              </p>
            ) : null}

            {isHost ? (
              <p className="bg-(--accent-2)/10 mb-4 px-4 py-3 border border-(--accent-2)/25 rounded-md text-[#9fc9d5] text-sm">
                {t.doomlings.hostEditHint}
              </p>
            ) : null}

            <section className="bg-[#14222b]/90 mb-4 p-4 border border-(--accent)/20 rounded-lg">
              <div className="flex justify-between items-center">
                <p className="font-bold text-[#f7e7ad]">
                  {t.doomlings.readyCountLabel}
                </p>
                <p className="font-black text-xl">
                  {format(t.doomlings.readyCount, {
                    ready: readyCount,
                    total: state.players.length,
                  })}
                </p>
              </div>
              <div className="bg-[#101820] mt-3 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-(--accent) h-full transition-all"
                  style={{
                    width: `${
                      state.players.length
                        ? (readyCount / state.players.length) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </section>

            <div className="space-y-3">
              {orderedPlayers.map((player) => {
                const editable = isHost || player.claimedBy === clientId;
                const ready = !!state.readyPlayers?.[player.id];
                const playerScores = getScores(player.id);

                return (
                  <div
                    key={player.id}
                    className={`rounded-lg border p-4 ${
                      ready
                        ? "border-(--accent)/50 bg-(--accent)/5"
                        : "border-[#f7e7ad]/10 bg-[#18262f]"
                    }`}
                    style={{ boxShadow: `inset 4px 0 0 ${player.color}` }}
                  >
                    <div className="flex justify-between items-center gap-3">
                      <div>
                        <p className="font-bold">{player.name}</p>
                        <p className="text-[#9fc9d5] text-xs">
                          {t.doomlings.subtotal}: {getTotal(player.id)}
                        </p>
                      </div>
                      {ready ? (
                        <span className="bg-(--accent)/20 px-2 py-1 rounded-md font-bold text-(--accent-2) text-xs whitespace-nowrap">
                          {t.doomlings.readyBadge}
                        </span>
                      ) : null}
                    </div>

                    <div className="gap-2 grid grid-cols-2 mt-3">
                      {scoreKeys.map((key) => (
                        <label key={key} className="block">
                          <span className="text-[#9fc9d5] text-xs">
                            {stepLabelMap[key].title}
                          </span>
                          {editable ? (
                            <input
                              key={`${key}-${player.id}-${playerScores[key] ?? 0}`}
                              type="number"
                              inputMode="numeric"
                              defaultValue={playerScores[key] ?? 0}
                              onBlur={(event) => {
                                const next = Number(event.target.value);
                                const parsed = Number.isFinite(next)
                                  ? next
                                  : 0;

                                if (parsed !== (playerScores[key] ?? 0)) {
                                  setScore(player.id, key, parsed);
                                }
                              }}
                              className="bg-[#101820] mt-1 px-2 py-2 border border-[#f7e7ad]/10 focus:border-(--accent) rounded-md outline-none w-full font-black text-center"
                            />
                          ) : (
                            <p className="mt-1 font-black text-center">
                              {playerScores[key] ?? 0}
                            </p>
                          )}
                        </label>
                      ))}
                    </div>

                    {editable ? (
                      <button
                        onClick={() => toggleReady(player.id)}
                        className={`mt-3 w-full rounded-md px-3 py-2 text-sm font-black ${
                          ready
                            ? "border border-(--accent)/40 text-(--accent-2)"
                            : "bg-(--accent) text-(--on-accent)"
                        }`}
                        type="button"
                      >
                        {ready
                          ? t.doomlings.unreadyButton
                          : t.doomlings.readyButton}
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {isHost ? (
              <button
                onClick={startReveal}
                disabled={!allReady}
                className="bg-(--accent) disabled:opacity-40 mt-5 px-5 py-4 rounded-lg w-full font-black text-(--on-accent) disabled:cursor-not-allowed"
                type="button"
              >
                {allReady
                  ? t.doomlings.startReveal
                  : format(t.doomlings.readyCount, {
                      ready: readyCount,
                      total: state.players.length,
                    })}
              </button>
            ) : (
              <p className="mt-5 text-[#9fc9d5] text-sm text-center">
                {allReady
                  ? t.doomlings.waitingForHostReveal
                  : t.doomlings.waitingForOthers}
              </p>
            )}
          </div>

          {isStartCounterModalOpen ? (
            <StartCounterModal
              players={state.players}
              selectedPlayerIndex={counterIndexDraft}
              onChange={setCounterIndexDraft}
              onConfirm={confirmCounter}
            />
          ) : null}
        </main>
      );
    }

    // deviceMode === "single": ein Gerät geht die Schritte der Reihe nach durch
    const step = Math.min(state.scoringStep ?? 0, scoreKeys.length - 1);
    const scoreKey = scoreKeys[step];
    const stepLabel = stepLabelMap[scoreKey];

    return (
      <main style={gameThemes.doomlings.style} className="bg-[#101820] px-3 sm:px-6 py-4 min-h-screen text-[#fff4c7]">
        <div className="mx-auto max-w-3xl">
          {header(t.doomlings.scoringTag, stepLabel.title)}

          <section className="bg-[#14222b]/90 p-5 border border-(--accent)/20 rounded-lg">
            <p className="font-semibold text-(--accent) text-sm uppercase tracking-[0.16em]">
              {format(t.doomlings.stepOf, {
                current: step + 1,
                total: scoreKeys.length,
              })}
            </p>
            <p className="mt-2 text-[#d8d3bd]">{stepLabel.hint}</p>
            {state.scoringStartPlayerChosen ? (
              <p className="mt-1 text-[#9fc9d5] text-xs">
                {format(t.doomlings.countingOrderHint, {
                  name:
                    state.players[state.scoringStartPlayerIndex ?? 0]?.name ??
                    "",
                })}
              </p>
            ) : null}

            <div className="space-y-3 mt-5">
              {orderedPlayers.map((player) => {
                const value = getScores(player.id)[scoreKey] ?? 0;

                return (
                  <div
                    key={player.id}
                    className="flex items-center gap-3 bg-[#18262f] p-3 border border-[#f7e7ad]/10 rounded-lg"
                    style={{ boxShadow: `inset 4px 0 0 ${player.color}` }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate">{player.name}</p>
                      <p className="text-[#9fc9d5] text-xs">
                        {t.doomlings.subtotal}: {getTotal(player.id)}
                      </p>
                    </div>
                    {canWrite ? (
                      <input
                        key={`${scoreKey}-${player.id}-${value}`}
                        type="number"
                        inputMode="numeric"
                        defaultValue={value}
                        onBlur={(event) => {
                          const next = Number(event.target.value);
                          const parsed = Number.isFinite(next) ? next : 0;

                          if (parsed !== value) {
                            setScore(player.id, scoreKey, parsed);
                          }
                        }}
                        className="bg-[#101820] px-3 py-3 border border-[#f7e7ad]/10 focus:border-(--accent) rounded-md outline-none w-24 font-black text-lg text-center"
                      />
                    ) : (
                      <p className="w-24 font-black text-lg text-center">
                        {value}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {canWrite ? (
              <div className="gap-2 grid grid-cols-2 mt-5">
                <button
                  onClick={() =>
                    step === 0 ? setPhase("playing") : setStep(step - 1)
                  }
                  className="px-4 py-3 border border-[#f7e7ad]/15 rounded-md font-black text-[#d8d3bd]"
                  type="button"
                >
                  {t.common.previous}
                </button>
                <button
                  onClick={() =>
                    step === scoreKeys.length - 1
                      ? setPhase("finished")
                      : setStep(step + 1)
                  }
                  className="bg-(--accent) px-4 py-3 rounded-md font-black text-(--on-accent)"
                  type="button"
                >
                  {step === scoreKeys.length - 1
                    ? t.doomlings.finishScoring
                    : t.common.next}
                </button>
              </div>
            ) : null}
          </section>
        </div>

        {isStartCounterModalOpen ? (
          <StartCounterModal
            players={state.players}
            selectedPlayerIndex={counterIndexDraft}
            onChange={setCounterIndexDraft}
            onConfirm={confirmCounter}
          />
        ) : null}
      </main>
    );
  }

  if (state.phase === "revealing") {
    const revealOrder = getRevealOrder(state.players, state.scores, scoreKeys);
    const revealIndex = Math.min(state.revealIndex ?? 0, revealOrder.length);
    const revealed = revealOrder.slice(0, revealIndex);
    const isDone = revealIndex >= revealOrder.length;

    return (
      <main style={gameThemes.doomlings.style} className="bg-[#101820] px-3 sm:px-6 py-4 min-h-screen text-[#fff4c7]">
        <div className="mx-auto max-w-2xl">
          {header(t.doomlings.revealTag, t.doomlings.revealTitle)}

          {revealed.length === 0 ? (
            <p className="py-10 text-[#9fc9d5] text-sm text-center">
              {t.doomlings.revealWaiting}
            </p>
          ) : (
            <div className="space-y-3">
              {[...revealed].reverse().map((player, reverseIndex) => {
                const index = revealed.length - 1 - reverseIndex;
                const rank = revealOrder.length - index;
                const scores = getScores(player.id);
                const detail = scoreKeys
                  .map((key) => scores[key] ?? 0)
                  .join(" · ");

                return (
                  <div
                    key={player.id}
                    className="sf-reveal-pop flex items-center gap-3 bg-[#14222b]/90 p-4 border border-[#f7e7ad]/10 rounded-lg"
                    style={{ boxShadow: `inset 4px 0 0 ${player.color}` }}
                  >
                    <p className="w-8 font-black text-[#9fc9d5] text-xl">
                      {rank}.
                    </p>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate">{player.name}</p>
                      <p className="text-[#9fc9d5] text-xs">{detail}</p>
                    </div>
                    <p className="font-black text-2xl">
                      {getScoreTotal(scores, scoreKeys)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {isHost ? (
            <button
              onClick={isDone ? () => setPhase("finished") : revealNext}
              className="bg-(--accent) mt-6 px-5 py-4 rounded-lg w-full font-black text-(--on-accent)"
              type="button"
            >
              {isDone
                ? t.doomlings.revealToResults
                : format(t.doomlings.revealNextLabel, {
                    rank: revealOrder.length - revealIndex,
                  })}
            </button>
          ) : (
            <p className="mt-6 text-[#9fc9d5] text-sm text-center">
              {isDone
                ? t.doomlings.revealWaitingResults
                : t.doomlings.revealWaiting}
            </p>
          )}
        </div>
      </main>
    );
  }

  // phase === "finished"
  const ranked = [...state.players].sort(
    (left, right) => getTotal(right.id) - getTotal(left.id),
  );
  const winner = ranked[0];
  const showCelebration = !!winner && !celebrationDismissed;
  const celebrationStandings = ranked.map((player) => {
    const scores = getScores(player.id);
    return {
      id: player.id,
      name: player.name,
      color: player.color,
      score: getTotal(player.id),
      detail: scoreKeys.map((key) => scores[key] ?? 0).join(" · "),
    };
  });

  return (
    <main style={gameThemes.doomlings.style} className="bg-[#101820] px-3 sm:px-6 py-4 min-h-screen text-[#fff4c7]">
      <div className="mx-auto max-w-3xl">
        {header(t.doomlings.tag, t.doomlings.results)}

        {winner ? (
          <button
            onClick={() => setCelebrationDismissed(false)}
            className="bg-(--accent)/10 hover:bg-(--accent)/20 mb-4 px-4 py-3 border border-(--accent)/40 rounded-lg w-full font-black text-(--accent-2) text-xl text-center"
            type="button"
          >
            {"\u{1F3C6} "}
            {format(t.doomlings.winner, { name: winner.name })}
            <span className="block mt-0.5 font-semibold text-[#9fc9d5] text-xs">
              {t.celebration.showResult}
            </span>
          </button>
        ) : null}

        <section className="space-y-3">
          {ranked.map((player, index) => {
            const scores = getScores(player.id);

            return (
              <div
                key={player.id}
                className="flex items-center gap-3 bg-[#14222b]/90 p-4 border border-[#f7e7ad]/10 rounded-lg"
                style={{ boxShadow: `inset 4px 0 0 ${player.color}` }}
              >
                <p className="w-8 font-black text-[#9fc9d5] text-xl">
                  {index + 1}.
                </p>
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{player.name}</p>
                  <p className="text-[#9fc9d5] text-xs">
                    {scoreKeys.map((key) => scores[key] ?? 0).join(" · ")}
                  </p>
                </div>
                <p className="font-black text-2xl">{getTotal(player.id)}</p>
              </div>
            );
          })}
        </section>

        {canWrite ? (
          <button
            onClick={backToScoring}
            className="mt-5 px-4 py-3 border border-[#f7e7ad]/15 rounded-md w-full font-black text-[#d8d3bd]"
            type="button"
          >
            {t.doomlings.backToScoring}
          </button>
        ) : null}
      </div>

      {showCelebration ? (
        <WinnerCelebration
          gameType="doomlings"
          gameLabel={t.doomlings.tag}
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
