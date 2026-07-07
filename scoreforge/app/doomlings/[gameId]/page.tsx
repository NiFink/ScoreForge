"use client";

import { gameThemes } from "@/lib/gameThemes";

import Image from "next/image";
import { use } from "react";
import { useRouter } from "next/navigation";

import { useGame } from "@/lib/useGame";
import { format, useI18n } from "@/lib/i18n";
import { Lobby } from "@/components/Lobby";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { CodeBadge } from "@/components/CodeBadge";
import type {
  DoomlingsScores,
  DoomlingsState,
} from "../../types/gameTypes";

const scoreKeys: (keyof DoomlingsScores)[] = [
  "numbers",
  "cross",
  "sickle",
  "worldsEnd",
];

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

  const {
    game,
    state,
    notFound,
    clientId,
    isHost,
    canWrite,
    mutateState,
    claimSlot,
  } = useGame<DoomlingsState>(gameId);

  const stepLabels = [
    { title: t.doomlings.stepNumbersTitle, hint: t.doomlings.stepNumbersHint },
    { title: t.doomlings.stepCrossTitle, hint: t.doomlings.stepCrossHint },
    { title: t.doomlings.stepSickleTitle, hint: t.doomlings.stepSickleHint },
    {
      title: t.doomlings.stepWorldsEndTitle,
      hint: t.doomlings.stepWorldsEndHint,
    },
  ];

  const getScores = (playerId: string): DoomlingsScores =>
    state?.scores?.[playerId] ?? emptyScores();

  const getTotal = (playerId: string): number => {
    const scores = getScores(playerId);
    return scoreKeys.reduce((sum, key) => sum + (scores[key] ?? 0), 0);
  };

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
        <LanguageSwitcher />
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
                onClick={() => setPhase("scoring")}
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

  if (state.phase === "scoring") {
    const step = Math.min(state.scoringStep ?? 0, scoreKeys.length - 1);
    const scoreKey = scoreKeys[step];
    const stepLabel = stepLabels[step];

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

            <div className="space-y-3 mt-5">
              {state.players.map((player) => {
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
      </main>
    );
  }

  // phase === "finished"
  const ranked = [...state.players].sort(
    (left, right) => getTotal(right.id) - getTotal(left.id),
  );
  const winner = ranked[0];

  return (
    <main style={gameThemes.doomlings.style} className="bg-[#101820] px-3 sm:px-6 py-4 min-h-screen text-[#fff4c7]">
      <div className="mx-auto max-w-3xl">
        {header(t.doomlings.tag, t.doomlings.results)}

        {winner ? (
          <p className="bg-(--accent)/10 mb-4 px-4 py-3 border border-(--accent)/40 rounded-lg font-black text-(--accent-2) text-xl text-center">
            {format(t.doomlings.winner, { name: winner.name })}
          </p>
        ) : null}

        <section className="space-y-3">
          {ranked.map((player, index) => (
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
                  {getScores(player.id).numbers} · {getScores(player.id).cross}{" "}
                  · {getScores(player.id).sickle} ·{" "}
                  {getScores(player.id).worldsEnd}
                </p>
              </div>
              <p className="font-black text-2xl">{getTotal(player.id)}</p>
            </div>
          ))}
        </section>

        {canWrite ? (
          <button
            onClick={() => setPhase("scoring")}
            className="mt-5 px-4 py-3 border border-[#f7e7ad]/15 rounded-md w-full font-black text-[#d8d3bd]"
            type="button"
          >
            {t.doomlings.backToScoring}
          </button>
        ) : null}
      </div>
    </main>
  );
}
