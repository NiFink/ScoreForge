"use client";

import { gameThemes } from "@/lib/gameThemes";

import Image from "next/image";
import { Fragment, use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useGame } from "@/lib/useGame";
import { format, useI18n } from "@/lib/i18n";
import { Lobby } from "@/components/Lobby";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CodeBadge } from "@/components/CodeBadge";
import { DeleteGameButton } from "@/components/DeleteGameButton";
import { GameSettingsModal } from "@/components/GameSettingsModal";
import { WinnerCelebration } from "@/components/WinnerCelebration";
import { MeldReference } from "./MeldReference";
import { RoundModal } from "./RoundModal";
import type {
  BinokelRound,
  BinokelState,
  DeviceMode,
  WriteMode,
} from "@/types/gameTypes";
import {
  getBinokelTotals,
  getParties,
  isRoundComplete,
  scoreBinokelRound,
} from "@/features/binokel/utils";

export default function BinokelGame({
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
  } = useGame<BinokelState>(gameId);

  const [editingRoundIndex, setEditingRoundIndex] = useState<number | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showMelds, setShowMelds] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [celebrationDismissed, setCelebrationDismissed] = useState(false);

  const parties = useMemo(
    () => (state ? getParties(state.players) : []),
    [state],
  );
  const rounds = useMemo(() => state?.rounds ?? [], [state]);
  const totals = useMemo(
    () => getBinokelTotals(rounds, parties),
    [rounds, parties],
  );

  // Zwischenstand nach jeder Runde (nur komplette Runden zählen)
  const runningTotals = useMemo(() => {
    const acc = Object.fromEntries(parties.map((party) => [party.id, 0]));

    return rounds.map((round) => {
      if (isRoundComplete(round, parties)) {
        const results = scoreBinokelRound(round, parties);

        for (const party of parties) {
          acc[party.id] += results[party.id]?.points ?? 0;
        }
      }

      return { ...acc };
    });
  }, [parties, rounds]);

  const leader = useMemo(() => {
    if (!state) {
      return null;
    }

    const reached = parties
      .filter((party) => (totals[party.id] ?? 0) >= state.targetScore)
      .sort((left, right) => (totals[right.id] ?? 0) - (totals[left.id] ?? 0));

    return reached[0] ?? null;
  }, [parties, state, totals]);

  const celebrationStandings = useMemo(
    () =>
      [...parties]
        .sort((left, right) => (totals[right.id] ?? 0) - (totals[left.id] ?? 0))
        .map((party) => ({
          id: party.id,
          name: party.name,
          color: party.color,
          score: totals[party.id] ?? 0,
        })),
    [parties, totals],
  );

  // Siegerehrung erscheint automatisch, sobald das Ziel erreicht ist.
  const showCelebration = !!leader && !celebrationDismissed;

  const openNewRound = () => {
    if (!canWrite) {
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

  const saveRound = (round: BinokelRound) => {
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
      // Ziel erreicht -> Lobby läuft nur noch 1 Stunde weiter
      (next) => {
        const nextParties = getParties(next.players);
        const nextTotals = getBinokelTotals(next.rounds ?? [], nextParties);

        return nextParties.some(
          (party) => (nextTotals[party.id] ?? 0) >= next.targetScore,
        );
      },
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
      <main style={gameThemes.binokel.style} className="place-items-center grid bg-(--sf-bg) px-4 min-h-screen text-(--sf-text-strong)">
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
      <main style={gameThemes.binokel.style} className="place-items-center grid bg-(--sf-bg) px-4 min-h-screen text-(--sf-text-strong)">
        <div className="text-center">
          <Image
            src="/Logo.png"
            alt="ScoreForge Logo"
            width={96}
            height={96}
            loading="eager"
            className="mx-auto mb-4 rounded-lg w-20 h-20 object-cover"
          />
          <p className="text-(--sf-text-muted)">{t.binokel.loadingGame}</p>
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
          {isHost ? <DeleteGameButton onDelete={deleteGame} /> : null}
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
      {showSettings && isHost ? (
        <GameSettingsModal
          state={state}
          totals={{}}
          minPlayers={3}
          maxPlayers={4}
          allowPlayerChanges={false}
          expiresAt={game.expires_at}
          onChangeWriteMode={changeWriteMode}
          onChangeDeviceMode={changeDeviceMode}
          onBackToLobby={backToLobby}
          onPause={pauseGame}
          onResume={resumeGame}
          onAddPlayer={() => {}}
          onRemovePlayer={() => {}}
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
          <div className="bg-(--sf-surface) px-3 py-2 border border-(--sf-text)/10 rounded-md">
            <p className="text-(--sf-text-subtle)">{t.binokel.target}</p>
            <p className="font-black">{state.targetScore}</p>
          </div>
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
      <main style={gameThemes.binokel.style} className="bg-(--sf-bg) px-3 sm:px-6 py-4 min-h-screen text-(--sf-text-strong)">
        <div className="mx-auto max-w-5xl">
          {header(t.binokel.lobbyTag, t.lobby.header)}
          <Lobby
            game={game}
            clientId={clientId}
            isHost={isHost}
            onClaim={claimSlot}
            onStart={() =>
              mutateState((current) => ({ ...current, phase: "playing" }))
            }
            groups={
              state.players.length === 4
                ? [
                    { title: t.binokel.team1, indexes: [0, 2] },
                    { title: t.binokel.team2, indexes: [1, 3] },
                  ]
                : undefined
            }
          />
        </div>
      </main>
    );
  }

  return (
    <main style={gameThemes.binokel.style} className="bg-(--sf-bg) px-3 sm:px-6 py-4 min-h-screen text-(--sf-text-strong)">
      <div className="mx-auto max-w-5xl">
        {header(t.binokel.tag, t.wizard.scoreTable)}

        {!canWrite ? (
          <p className="bg-(--sf-surface) mb-4 px-4 py-3 border border-(--accent-2)/25 rounded-md text-(--sf-text-subtle) text-sm">
            {t.common.hostOnlyBanner}
          </p>
        ) : null}

        {leader ? (
          <button
            onClick={() => setCelebrationDismissed(false)}
            className="bg-(--accent)/10 hover:bg-(--accent)/20 mb-4 px-4 py-3 border border-(--accent)/40 rounded-lg w-full font-black text-(--accent-2) text-lg text-center"
            type="button"
          >
            {"\u{1F3C6} "}
            {format(t.binokel.targetReached, { name: leader.name })}
            <span className="block mt-0.5 font-semibold text-(--sf-text-subtle) text-xs">
              {t.celebration.showResult}
            </span>
          </button>
        ) : null}

        {/* TOTALS */}
        <section
          className={`gap-2 grid mb-4 ${
            parties.length === 2 ? "grid-cols-2" : "grid-cols-3"
          }`}
        >
          {parties.map((party) => (
            <div
              key={party.id}
              className="bg-(--sf-surface-2)/90 p-3 border border-(--sf-text)/10 rounded-lg min-w-0"
              style={{ boxShadow: `inset 4px 0 0 ${party.color}` }}
            >
              <p className="text-(--sf-text-muted) text-sm truncate">{party.name}</p>
              <p className="mt-1 font-black text-2xl">
                {totals[party.id] ?? 0}
              </p>
            </div>
          ))}
        </section>

        {/* ROUNDS */}
        <section className="bg-(--sf-surface-2)/90 p-4 border border-(--accent)/20 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-black text-xl">{t.binokel.roundsHeader}</h2>
            {canWrite ? (
              <button
                onClick={openNewRound}
                className="bg-(--accent) px-4 py-2 rounded-md font-black text-(--on-accent) text-sm"
                type="button"
              >
                {t.binokel.newRound}
              </button>
            ) : null}
          </div>

          {rounds.length === 0 ? (
            <p className="py-6 text-(--sf-text-subtle) text-sm text-center">
              {t.binokel.noRounds}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-(--sf-text-subtle) text-left">
                    <th className="py-2 pr-3 font-semibold">#</th>
                    <th className="py-2 pr-3 font-semibold">
                      {t.binokel.bidder}
                    </th>
                    {parties.map((party) => (
                      <th
                        key={party.id}
                        className="py-2 pr-3 font-semibold text-right"
                      >
                        <span
                          className="inline-block mr-1 rounded-full w-2 h-2"
                          style={{ backgroundColor: party.color }}
                        />
                        {party.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rounds.map((round, index) => {
                    const complete = isRoundComplete(round, parties);
                    const results = complete
                      ? scoreBinokelRound(round, parties)
                      : null;
                    const bidderParty = parties.find(
                      (party) => party.id === round.bidderPartyId,
                    );
                    const bidderFailed =
                      results && round.bidderPartyId
                        ? results[round.bidderPartyId]?.madeBid === false
                        : false;
                    // Aufschlüsselung nur bei normal gespielten Runden —
                    // bei Sonderspiel/Abgeben gibt es keine Stichwertung.
                    const showBreakdown =
                      complete && !round.special && !round.conceded;
                    const roundTricksSum = parties.reduce(
                      (sum, party) => sum + (round.tricks[party.id] ?? 0),
                      0,
                    );

                    return (
                      <Fragment key={index}>
                      <tr
                        onClick={() => openExistingRound(index)}
                        className={`border-t border-(--sf-text)/10 ${
                          canWrite ? "cursor-pointer hover:bg-(--sf-surface)" : ""
                        }`}
                      >
                        <td className="py-3 pr-3 font-black">{index + 1}</td>
                        <td className="py-3 pr-3">
                          {bidderParty ? (
                            <>
                              <span className="font-bold">
                                {bidderParty.name}
                              </span>
                              <span className="text-(--sf-text-subtle)">
                                {" "}
                                ·{" "}
                                {round.special
                                  ? round.special === 1500
                                    ? t.binokel.aufgelegt1500
                                    : t.binokel.durch1000
                                  : (round.bid ?? 0)}
                              </span>
                              {round.special ? (
                                <span
                                  className={`block text-xs ${
                                    round.specialMade
                                      ? "text-(--accent-2)"
                                      : "text-[#ef5b2a]"
                                  }`}
                                >
                                  {format(
                                    round.specialMade
                                      ? t.binokel.specialMadeBadge
                                      : t.binokel.specialFailedBadge,
                                    { value: round.special },
                                  )}
                                </span>
                              ) : round.conceded ? (
                                <span className="block text-[#ef5b2a] text-xs">
                                  {format(t.binokel.concedeBadge, {
                                    bid: round.bid ?? 0,
                                  })}
                                </span>
                              ) : bidderFailed ? (
                                <span className="block text-[#ef5b2a] text-xs">
                                  {format(t.binokel.bidFailed, {
                                    bid: round.bid ?? 0,
                                  })}
                                </span>
                              ) : null}
                            </>
                          ) : (
                            <span className="text-(--sf-text-subtle)">
                              {t.binokel.inProgress}
                            </span>
                          )}
                        </td>
                        {parties.map((party) => {
                          const result = results?.[party.id];

                          return (
                            <td
                              key={party.id}
                              className={`py-3 pr-3 text-right font-black ${
                                result && result.points < 0
                                  ? "text-[#ef5b2a]"
                                  : ""
                              }`}
                            >
                              {result
                                ? result.points
                                : (round.tricks[party.id] ??
                                    round.melds[party.id] ??
                                    "-")}
                            </td>
                          );
                        })}
                      </tr>
                      {/* ZWISCHENSTAND: Meldung + Stiche der Runde, kumulierter Stand */}
                      <tr
                        onClick={() => openExistingRound(index)}
                        className={`text-xs text-(--sf-text-subtle) ${
                          canWrite ? "cursor-pointer hover:bg-(--sf-surface)" : ""
                        }`}
                      >
                        <td className="pb-3 pr-3" />
                        <td className="pb-3 pr-3">
                          {showBreakdown ? (
                            <span
                              className={
                                roundTricksSum === 250 ? "" : "text-[#ef5b2a]"
                              }
                            >
                              {format(t.binokel.roundTricksSum, {
                                sum: roundTricksSum,
                              })}
                            </span>
                          ) : null}
                        </td>
                        {parties.map((party) => (
                          <td key={party.id} className="pb-3 pr-3 text-right">
                            {showBreakdown ? (
                              <span className="block">
                                {format(t.binokel.subRowBreakdown, {
                                  melds: round.melds[party.id] ?? 0,
                                  tricks: round.tricks[party.id] ?? 0,
                                })}
                              </span>
                            ) : null}
                            <span className="block font-bold text-(--sf-text-muted)">
                              {format(t.binokel.runningTotalShort, {
                                total: runningTotals[index]?.[party.id] ?? 0,
                              })}
                            </span>
                          </td>
                        ))}
                      </tr>
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <button
            onClick={() => setShowMelds(true)}
            className="mt-4 px-4 py-3 border border-(--accent-2)/40 rounded-md w-full font-bold text-(--sf-text-subtle) text-sm"
            type="button"
          >
            {t.binokel.showMelds}
          </button>
        </section>
      </div>

      {isModalOpen ? (
        <RoundModal
          parties={parties}
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
          onShowMelds={() => setShowMelds(true)}
        />
      ) : null}

      {showMelds ? <MeldReference onClose={() => setShowMelds(false)} /> : null}

      {showCelebration && leader ? (
        <WinnerCelebration
          gameType="binokel"
          gameLabel={t.binokel.tag}
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
