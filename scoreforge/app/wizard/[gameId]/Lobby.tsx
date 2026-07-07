"use client";

import { useState } from "react";

import type { GameRecord } from "../../types/wizardTypes";

type LobbyProps = {
  game: GameRecord;
  clientId: string;
  isHost: boolean;
  onClaim: (playerId: string, name?: string) => Promise<string | null>;
  onStart: () => void;
};

export function Lobby({ game, clientId, isHost, onClaim, onStart }: LobbyProps) {
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

    const claimError = await onClaim(playerId, name);

    if (claimError) {
      setError(claimError);
    }

    setBusyPlayerId(null);
  };

  return (
    <div className="gap-4 grid lg:grid-cols-[0.9fr_1.1fr]">
      {/* CODE + STATUS */}
      <section className="bg-[#14222b]/90 p-5 border border-[#f59e22]/20 rounded-lg">
        <p className="font-semibold text-[#9fc9d5] text-sm uppercase tracking-[0.16em]">
          Beitritts-Code
        </p>
        <p className="bg-[#101820] mt-3 py-5 rounded-lg font-black text-[#f59e22] text-5xl text-center tracking-[0.35em]">
          {game.code}
        </p>
        <p className="mt-3 text-[#d8d3bd] text-sm">
          Andere Spieler öffnen ScoreForge, wählen &bdquo;Lobby beitreten&ldquo;
          und geben diesen Code ein.
        </p>

        <div className="bg-[#18262f] mt-5 p-4 rounded-lg">
          <p className="text-[#9fc9d5] text-sm">Belegte Plätze</p>
          <p className="mt-1 font-black text-4xl">
            {claimedCount}/{players.length}
          </p>
        </div>

        {isHost ? (
          <button
            onClick={onStart}
            className="bg-[#f59e22] mt-5 px-5 py-4 rounded-lg w-full font-black text-[#101820]"
            type="button"
          >
            Spiel starten
          </button>
        ) : (
          <p className="mt-5 py-4 text-[#9fc9d5] text-sm text-center animate-pulse">
            Warten auf den Host...
          </p>
        )}
      </section>

      {/* SLOTS */}
      <section className="bg-[#14222b]/90 p-5 border border-[#f59e22]/20 rounded-lg">
        <div className="flex justify-between mb-4">
          <h2 className="font-black text-xl">Spieler-Plätze</h2>
          <span className="text-[#9fc9d5] text-sm">Wähle deinen Platz</span>
        </div>

        {error ? (
          <p className="mb-3 text-[#ef5b2a] text-sm">{error}</p>
        ) : null}

        <div className="space-y-3">
          {players.map((player) => {
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
                        ? "bg-[#f59e22] text-[#101820]"
                        : isTaken
                          ? "bg-[#2aa6c8]/20 text-[#9fc9d5]"
                          : "bg-[#f7e7ad]/10 text-[#d8d3bd]"
                    }`}
                  >
                    {isMine ? "Du" : isTaken ? "Belegt" : "Frei"}
                  </span>
                </div>

                {isMine ? (
                  <div className="flex gap-2 mt-3">
                    <input
                      className="bg-[#101820] px-3 py-2 rounded-md w-full"
                      value={nameDraft}
                      onChange={(event) => setNameDraft(event.target.value)}
                      placeholder="Dein Name"
                    />
                    <button
                      onClick={() => claim(player.id, nameDraft)}
                      disabled={busyPlayerId === player.id}
                      className="bg-[#2aa6c8] disabled:opacity-50 px-4 py-2 rounded-md font-bold text-[#101820] text-sm whitespace-nowrap"
                      type="button"
                    >
                      Speichern
                    </button>
                  </div>
                ) : !isTaken ? (
                  <button
                    onClick={() => claim(player.id)}
                    disabled={busyPlayerId === player.id}
                    className="disabled:opacity-50 mt-3 px-4 py-2 border border-[#f7e7ad]/15 rounded-md w-full font-bold text-[#d8d3bd] text-sm"
                    type="button"
                  >
                    {busyPlayerId === player.id
                      ? "Übernehme..."
                      : "Platz übernehmen"}
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
