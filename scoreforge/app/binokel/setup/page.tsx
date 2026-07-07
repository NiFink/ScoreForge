"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { getClientId } from "@/lib/clientId";
import { colorOptions } from "@/lib/colors";
import { format, useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { PlayerEditor } from "@/components/PlayerEditor";
import { SetupModes } from "@/components/SetupModes";
import type {
  BinokelState,
  DeviceMode,
  Player,
  WriteMode,
} from "../../types/gameTypes";

const createPlayers = (count: number, nameTemplate: string): Player[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `player-${i + 1}`,
    name: format(nameTemplate, { n: i + 1 }),
    color: colorOptions[i % colorOptions.length].value,
  }));

export default function BinokelSetup() {
  const router = useRouter();
  const { t } = useI18n();

  const [playerCount, setPlayerCount] = useState(3);
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("single");
  const [writeMode, setWriteMode] = useState<WriteMode>("host");
  const [targetScore, setTargetScore] = useState(1000);
  const [players, setPlayers] = useState<Player[]>(() =>
    createPlayers(3, "Spieler {n}"),
  );
  const [loading, setLoading] = useState(false);

  const updatePlayer = (i: number, key: "name" | "color", value: string) => {
    setPlayers((current) =>
      current.map((player, index) =>
        index === i ? { ...player, [key]: value } : player,
      ),
    );
  };

  const teamsNote = useMemo(() => {
    if (playerCount !== 4 || players.length < 4) {
      return null;
    }

    return format(t.binokel.teamsNote, {
      teamA: `${players[0].name} & ${players[2].name}`,
      teamB: `${players[1].name} & ${players[3].name}`,
    });
  }, [playerCount, players, t]);

  const startGame = async () => {
    setLoading(true);

    try {
      const cleanPlayers: Player[] = players.map((player, index) => ({
        id: player.id,
        name:
          player.name.trim() ||
          format(t.common.defaultPlayerName, { n: index + 1 }),
        color: player.color,
        claimedBy: null,
      }));

      const state: BinokelState = {
        gameType: "binokel",
        playerCount,
        deviceMode,
        writeMode,
        targetScore,
        players: cleanPlayers,
        phase: deviceMode === "multi" ? "lobby" : "playing",
        hostId: getClientId(),
        rounds: [],
      };

      const response = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state }),
      });

      if (!response.ok) {
        console.error(await response.json());
        return;
      }

      const { game } = (await response.json()) as { game: { id: string } };
      router.push(`/binokel/${game.id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="bg-[#101820] px-4 sm:px-6 py-5 min-h-screen text-[#fff4c7]">
      <div className="mx-auto max-w-5xl">
        <div className="flex justify-between items-center mb-5">
          <button
            onClick={() => router.push("/")}
            className="px-3 py-2 border border-[#f7e7ad]/15 rounded-md text-[#d8d3bd] text-sm"
            type="button"
          >
            {t.common.back}
          </button>
          <LanguageSwitcher />
        </div>

        <header className="flex items-center gap-4 mb-6">
          <Image
            src="/Logo.png"
            alt="ScoreForge Logo"
            width={80}
            height={80}
            className="border border-[#f59e22]/35 rounded-lg w-16 h-16 object-cover"
          />

          <div>
            <p className="font-semibold text-[#f59e22] text-sm uppercase tracking-[0.18em]">
              {t.binokel.setupTag}
            </p>
            <h1 className="mt-1 font-black text-3xl sm:text-5xl">
              {t.common.prepareGame}
            </h1>
          </div>
        </header>

        <div className="gap-4 grid lg:grid-cols-[0.85fr_1.15fr]">
          {/* LEFT */}
          <section className="bg-[#14222b]/90 p-4 border border-[#f59e22]/20 rounded-lg">
            <label className="font-bold text-[#f7e7ad] text-sm">
              {t.common.playerCount}
            </label>

            <div className="gap-2 grid grid-cols-2 mt-3">
              {[3, 4].map((count) => (
                <button
                  key={count}
                  onClick={() => {
                    setPlayerCount(count);
                    setPlayers((current) =>
                      Array.from({ length: count }, (_, index) => {
                        return (
                          current[index] ?? {
                            id: `player-${index + 1}`,
                            name: format(t.common.defaultPlayerName, {
                              n: index + 1,
                            }),
                            color:
                              colorOptions[index % colorOptions.length].value,
                          }
                        );
                      }),
                    );
                  }}
                  className={`rounded-md px-3 py-3 font-black ${
                    playerCount === count
                      ? "bg-[#f59e22] text-[#101820]"
                      : "bg-[#18262f] text-[#d8d3bd]"
                  }`}
                  type="button"
                >
                  {count}
                </button>
              ))}
            </div>

            {teamsNote ? (
              <p className="bg-[#2aa6c8]/10 mt-3 px-3 py-2 border border-[#2aa6c8]/25 rounded-md text-[#9fc9d5] text-sm">
                {teamsNote}
              </p>
            ) : null}

            {/* TARGET SCORE */}
            <div className="mt-5">
              <label className="font-bold text-[#f7e7ad] text-sm">
                {t.binokel.targetScore}
              </label>
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() =>
                    setTargetScore((current) => Math.max(100, current - 100))
                  }
                  className="bg-[#18262f] px-4 py-3 rounded-md font-black text-[#d8d3bd]"
                  type="button"
                >
                  -100
                </button>
                <input
                  type="number"
                  inputMode="numeric"
                  min={100}
                  step={50}
                  value={targetScore}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    setTargetScore(Number.isFinite(next) ? next : 1000);
                  }}
                  className="bg-[#101820] px-3 py-3 border border-[#f7e7ad]/10 focus:border-[#f59e22] rounded-md outline-none w-full font-black text-lg text-center"
                />
                <button
                  onClick={() => setTargetScore((current) => current + 100)}
                  className="bg-[#18262f] px-4 py-3 rounded-md font-black text-[#d8d3bd]"
                  type="button"
                >
                  +100
                </button>
              </div>
            </div>

            {/* MODES */}
            <div className="mt-5">
              <SetupModes
                deviceMode={deviceMode}
                writeMode={writeMode}
                onDeviceModeChange={setDeviceMode}
                onWriteModeChange={setWriteMode}
              />
            </div>
          </section>

          {/* RIGHT */}
          <section className="bg-[#14222b]/90 p-4 border border-[#f59e22]/20 rounded-lg">
            <div className="flex justify-between mb-4">
              <h2 className="font-black text-xl">{t.common.players}</h2>
              <span className="text-[#9fc9d5] text-sm">
                {t.common.nameAndColor}
              </span>
            </div>

            <PlayerEditor players={players} onUpdate={updatePlayer} />

            <button
              onClick={startGame}
              disabled={loading}
              className="bg-[#f59e22] mt-5 px-5 py-4 rounded-lg w-full font-black text-[#101820]"
            >
              {loading ? t.common.creatingGame : t.common.startGame}
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}
