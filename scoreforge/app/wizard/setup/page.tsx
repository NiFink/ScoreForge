"use client";

import { gameThemes } from "@/lib/gameThemes";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { getClientId } from "@/lib/clientId";
import { colorOptions } from "@/lib/colors";
import { format, useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { PlayerEditor } from "@/components/PlayerEditor";
import { SetupModes } from "@/components/SetupModes";
import { createScoreTable } from "../../Utils/wizardUtils";
import type { GameState } from "../../types/wizardTypes";
import type { DeviceMode, Player, WriteMode } from "../../types/gameTypes";

const roundMap: Record<number, number> = {
  3: 20,
  4: 15,
  5: 12,
  6: 10,
};

const createPlayers = (count: number, nameTemplate: string): Player[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `player-${i + 1}`,
    name: format(nameTemplate, { n: i + 1 }),
    color: colorOptions[i % colorOptions.length].value,
  }));

export default function WizardSetup() {
  const router = useRouter();
  const { t } = useI18n();

  const [playerCount, setPlayerCount] = useState(3);
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("single");
  const [writeMode, setWriteMode] = useState<WriteMode>("host");
  const [players, setPlayers] = useState<Player[]>(() =>
    createPlayers(3, "Spieler {n}"),
  );
  const [lobbyName, setLobbyName] = useState("");
  const [loading, setLoading] = useState(false);

  const rounds = useMemo(() => roundMap[playerCount] || 10, [playerCount]);

  const updatePlayer = (i: number, key: "name" | "color", value: string) => {
    setPlayers((current) =>
      current.map((player, index) =>
        index === i ? { ...player, [key]: value } : player,
      ),
    );
  };

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

      const state: GameState = {
        gameType: "wizard",
        playerCount,
        deviceMode,
        writeMode,
        rounds,
        startPlayerIndex: 0,
        startPlayerChosen: false,
        players: cleanPlayers,
        phase: deviceMode === "multi" ? "lobby" : "playing",
        lobbyName: lobbyName.trim() || undefined,
        hostId: getClientId(),
        table: createScoreTable(rounds, cleanPlayers),
      };

      const response = await fetch("/api/games", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ state }),
      });

      if (!response.ok) {
        console.error(await response.json());
        return;
      }

      const { game } = (await response.json()) as { game: { id: string } };
      router.push(`/wizard/${game.id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={gameThemes.wizard.style} className="bg-[#101820] px-4 sm:px-6 py-5 min-h-screen text-[#fff4c7]">
      <div className="mx-auto max-w-5xl">
        {/* BACK */}
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

        {/* HEADER */}
        <header className="flex items-center gap-4 mb-6">
          <Image
            src="/Logo.png"
            alt="ScoreForge Logo"
            width={80}
            height={80}
            className="border border-(--accent)/35 rounded-lg w-16 h-16 object-cover"
          />

          <div>
            <p className="font-semibold text-(--accent) text-sm uppercase tracking-[0.18em]">
              {t.wizard.setupTag}
            </p>
            <h1 className="mt-1 font-black text-3xl sm:text-5xl">
              {t.wizard.setupTitle}
            </h1>
          </div>
        </header>

        <div className="gap-4 grid lg:grid-cols-[0.85fr_1.15fr]">
          {/* LEFT */}
          <section className="bg-[#14222b]/90 p-4 border border-(--accent)/20 rounded-lg">
            {/* PLAYER COUNT */}
            <label className="font-bold text-[#f7e7ad] text-sm">
              {t.common.playerCount}
            </label>

            <div className="gap-2 grid grid-cols-4 mt-3">
              {[3, 4, 5, 6].map((count) => (
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
                      ? "bg-(--accent) text-(--on-accent)"
                      : "bg-[#18262f] text-[#d8d3bd]"
                  }`}
                  type="button"
                >
                  {count}
                </button>
              ))}
            </div>

            {/* ROUNDS */}
            <div className="bg-[#18262f] mt-5 p-4 rounded-lg">
              <p className="text-[#9fc9d5] text-sm">{t.common.rounds}</p>
              <p className="mt-1 font-black text-4xl">{rounds}</p>
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

            {deviceMode === "multi" ? (
              <div className="mt-5">
                <label className="font-bold text-[#f7e7ad] text-sm">
                  {t.common.lobbyName}
                </label>
                <input
                  className="bg-[#101820] mt-2 px-3 py-3 border border-[#f7e7ad]/10 focus:border-(--accent) rounded-md outline-none w-full"
                  value={lobbyName}
                  onChange={(event) => setLobbyName(event.target.value)}
                  placeholder={t.common.lobbyNamePlaceholder}
                  maxLength={40}
                />
              </div>
            ) : null}
          </section>

          {/* RIGHT */}
          <section className="bg-[#14222b]/90 p-4 border border-(--accent)/20 rounded-lg">
            <div className="flex justify-between mb-4">
              <h2 className="font-black text-xl">{t.common.players}</h2>
              <span className="text-[#9fc9d5] text-sm">
                {t.common.nameAndColor}
              </span>
            </div>

            <PlayerEditor players={players} onUpdate={updatePlayer} />

            {/* START */}
            <button
              onClick={startGame}
              disabled={loading}
              className="bg-(--accent) mt-5 px-5 py-4 rounded-lg w-full font-black text-(--on-accent)"
            >
              {loading ? t.common.creatingGame : t.common.startGame}
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}
