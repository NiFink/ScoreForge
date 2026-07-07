"use client";

import { useState } from "react";

import { useI18n } from "@/lib/i18n";
import { QrCode } from "./QrCode";
import type { BaseGameState, GameRecord, Player } from "@/app/types/gameTypes";

export type LobbyGroup = {
  title: string;
  indexes: number[];
};

type LobbyProps = {
  game: GameRecord<BaseGameState>;
  clientId: string;
  isHost: boolean;
  onClaim: (playerId: string, name?: string) => Promise<number | null>;
  onStart: () => void;
  // Optional: Plätze gruppiert anzeigen (z.B. Binokel-Teams)
  groups?: LobbyGroup[];
};

export function Lobby({
  game,
  clientId,
  isHost,
  onClaim,
  onStart,
  groups,
}: LobbyProps) {
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [busyPlayerId, setBusyPlayerId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [draftPlayerId, setDraftPlayerId] = useState<string | null>(null);

  const players = game.state.players;
  const myPlayer = players.find((player) => player.claimedBy === clientId);
  const claimedCount = players.filter((player) => player.claimedBy).length;

  // Namensentwurf zurücksetzen, sobald ein anderer Platz übernommen wurde
  if (myPlayer && myPlayer.id !== draftPlayerId) {
    setDraftPlayerId(myPlayer.id);
    setNameDraft(myPlayer.name);
  }

  const claim = async (playerId: string, name?: string) => {
    setBusyPlayerId(playerId);
    setError(null);

    const status = await onClaim(playerId, name);

    if (status !== null) {
      setError(
        status === 409
          ? t.lobby.slotTaken
          : status === 0
            ? t.lobby.connectionFailed
            : t.lobby.claimFailed,
      );
    }

    setBusyPlayerId(null);
  };

  const renderSlot = (player: Player) => {
    const isMine = player.claimedBy === clientId;
    const isTaken = !!player.claimedBy && !isMine;

    return (
      <div
        key={player.id}
        className="bg-[#18262f] p-3 border border-[#f7e7ad]/10 rounded-lg"
        style={{ boxShadow: `inset 4px 0 0 ${player.color}` }}
      >
        <div className="flex justify-between items-center gap-3">
          <p className="font-bold">{player.name}</p>
          <span
            className={`rounded-md px-2 py-1 text-xs font-bold ${
              isMine
                ? "bg-(--accent) text-(--on-accent)"
                : isTaken
                  ? "bg-(--accent-2)/20 text-[#9fc9d5]"
                  : "bg-[#f7e7ad]/10 text-[#d8d3bd]"
            }`}
          >
            {isMine ? t.lobby.you : isTaken ? t.lobby.taken : t.lobby.free}
          </span>
        </div>

        {isMine ? (
          <div className="flex gap-2 mt-3">
            <input
              className="bg-[#101820] px-3 py-2 rounded-md w-full"
              value={nameDraft}
              onChange={(event) => setNameDraft(event.target.value)}
              placeholder={t.lobby.yourName}
            />
            <button
              onClick={() => claim(player.id, nameDraft)}
              disabled={busyPlayerId === player.id}
              className="bg-(--accent-2) disabled:opacity-50 px-4 py-2 rounded-md font-bold text-(--on-accent) text-sm whitespace-nowrap"
              type="button"
            >
              {t.common.save}
            </button>
          </div>
        ) : !isTaken ? (
          <button
            onClick={() => claim(player.id)}
            disabled={busyPlayerId === player.id}
            className="disabled:opacity-50 mt-3 px-4 py-2 border border-[#f7e7ad]/15 rounded-md w-full font-bold text-[#d8d3bd] text-sm"
            type="button"
          >
            {busyPlayerId === player.id ? t.lobby.claiming : t.lobby.claimSlot}
          </button>
        ) : null}
      </div>
    );
  };

  return (
    <div className="gap-4 grid lg:grid-cols-[0.9fr_1.1fr]">
      {/* CODE + STATUS */}
      <section className="bg-[#14222b]/90 p-5 border border-(--accent)/20 rounded-lg">
        <p className="font-semibold text-[#9fc9d5] text-sm uppercase tracking-[0.16em]">
          {t.lobby.joinCode}
        </p>
        <p className="bg-[#101820] mt-3 py-5 rounded-lg font-black text-(--accent) text-5xl text-center tracking-[0.35em]">
          {game.code}
        </p>

        {typeof window !== "undefined" ? (
          <div className="flex flex-col items-center mt-4">
            <QrCode value={window.location.href} size={180} />
            <p className="mt-2 text-[#9fc9d5] text-xs">{t.common.scanToJoin}</p>
          </div>
        ) : null}

        <p className="mt-3 text-[#d8d3bd] text-sm">{t.lobby.shareHint}</p>

        <div className="bg-[#18262f] mt-5 p-4 rounded-lg">
          <p className="text-[#9fc9d5] text-sm">{t.lobby.claimedSlots}</p>
          <p className="mt-1 font-black text-4xl">
            {claimedCount}/{players.length}
          </p>
        </div>

        {isHost ? (
          <button
            onClick={onStart}
            className="bg-(--accent) mt-5 px-5 py-4 rounded-lg w-full font-black text-(--on-accent)"
            type="button"
          >
            {t.common.startGame}
          </button>
        ) : (
          <p className="mt-5 py-4 text-[#9fc9d5] text-sm text-center animate-pulse">
            {t.lobby.waitingForHost}
          </p>
        )}
      </section>

      {/* SLOTS */}
      <section className="bg-[#14222b]/90 p-5 border border-(--accent)/20 rounded-lg">
        <div className="flex justify-between mb-4">
          <h2 className="font-black text-xl">{t.lobby.slotsTitle}</h2>
          <span className="text-[#9fc9d5] text-sm">{t.lobby.chooseSlot}</span>
        </div>

        {error ? <p className="mb-3 text-[#ef5b2a] text-sm">{error}</p> : null}

        {groups ? (
          <div className="space-y-5">
            {groups.map((group) => (
              <div key={group.title}>
                <p className="mb-2 font-black text-(--accent) text-sm uppercase tracking-[0.14em]">
                  {group.title}
                </p>
                <div className="space-y-3">
                  {group.indexes.map((index) => {
                    const player = players[index];
                    return player ? renderSlot(player) : null;
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">{players.map(renderSlot)}</div>
        )}
      </section>
    </div>
  );
}
