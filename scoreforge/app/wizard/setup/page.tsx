"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { getClientId } from "@/lib/clientId";
import { createScoreTable } from "../../Utils/wizardUtils";
import type {
  DeviceMode,
  GameState,
  Player,
  WriteMode,
} from "../../types/wizardTypes";

const roundMap: Record<number, number> = {
  3: 20,
  4: 15,
  5: 12,
  6: 10,
};

const colorOptions = [
  { name: "Forge Orange", value: "#f59e22" },
  { name: "Flamme", value: "#ef5b2a" },
  { name: "Runen Cyan", value: "#2aa6c8" },
  { name: "Gold", value: "#f7c65f" },
  { name: "Creme", value: "#fff4c7" },
  { name: "Stahlblau", value: "#5f7f92" },
];

const createPlayers = (count: number): Player[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `player-${i + 1}`,
    name: `Spieler ${i + 1}`,
    color: colorOptions[i % colorOptions.length].value,
  }));

export default function WizardSetup() {
  const router = useRouter();

  const [playerCount, setPlayerCount] = useState(3);
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("single");
  const [writeMode, setWriteMode] = useState<WriteMode>("host");
  const [players, setPlayers] = useState<Player[]>(() => createPlayers(3));
  const [loading, setLoading] = useState(false);

  const rounds = useMemo(() => roundMap[playerCount] || 10, [playerCount]);

  const updatePlayer = (i: number, key: keyof Player, value: string) => {
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
        name: player.name.trim() || `Spieler ${index + 1}`,
        color: player.color,
        claimedBy: null,
      }));

      const state: GameState = {
        playerCount,
        deviceMode,
        writeMode,
        rounds,
        startPlayerIndex: 0,
        startPlayerChosen: false,
        players: cleanPlayers,
        phase: deviceMode === "multi" ? "lobby" : "playing",
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
    <main className="bg-[#101820] px-4 sm:px-6 py-5 min-h-screen text-[#fff4c7]">
      <div className="mx-auto max-w-5xl">
        {/* BACK */}
        <button
          onClick={() => router.push("/")}
          className="mb-5 px-3 py-2 border border-[#f7e7ad]/15 rounded-md text-[#d8d3bd] text-sm"
          type="button"
        >
          Zurück
        </button>

        {/* HEADER */}
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
              Wizard Setup
            </p>
            <h1 className="mt-1 font-black text-3xl sm:text-5xl">
              Runde vorbereiten
            </h1>
          </div>
        </header>

        <div className="gap-4 grid lg:grid-cols-[0.85fr_1.15fr]">
          {/* LEFT */}
          <section className="bg-[#14222b]/90 p-4 border border-[#f59e22]/20 rounded-lg">
            {/* PLAYER COUNT */}
            <label className="font-bold text-[#f7e7ad] text-sm">
              Anzahl Spieler
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
                            name: `Name Spieler ${index + 1}`,
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

            {/* ROUNDS */}
            <div className="bg-[#18262f] mt-5 p-4 rounded-lg">
              <p className="text-[#9fc9d5] text-sm">Runden</p>
              <p className="mt-1 font-black text-4xl">{rounds}</p>
            </div>

            {/* MODES */}
            <div className="space-y-4 mt-5">
              <fieldset>
                <legend className="font-bold text-[#f7e7ad] text-sm">
                  Auf wie viele Geräte?
                </legend>

                <div className="gap-2 grid grid-cols-2 mt-2">
                  {[
                    ["single", "Ein Gerät"],
                    ["multi", "Mehrere"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => setDeviceMode(value as DeviceMode)}
                      className={`rounded-md px-3 py-3 text-sm font-bold ${
                        deviceMode === value
                          ? "bg-[#2aa6c8] text-[#101820]"
                          : "bg-[#18262f] text-[#d8d3bd]"
                      }`}
                      type="button"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="font-bold text-[#f7e7ad] text-sm">
                  Wer darf eintragen?
                </legend>

                <div className="gap-2 grid grid-cols-2 mt-2">
                  {[
                    ["host", "Nur Host"],
                    ["all", "Alle"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => setWriteMode(value as WriteMode)}
                      className={`rounded-md px-3 py-3 text-sm font-bold ${
                        writeMode === value
                          ? "bg-[#f7c65f] text-[#101820]"
                          : "bg-[#18262f] text-[#d8d3bd]"
                      }`}
                      type="button"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>
          </section>

          {/* RIGHT */}
          <section className="bg-[#14222b]/90 p-4 border border-[#f59e22]/20 rounded-lg">
            <div className="flex justify-between mb-4">
              <h2 className="font-black text-xl">Spieler</h2>
              <span className="text-[#9fc9d5] text-sm">Name + Farbe</span>
            </div>

            <div className="space-y-3">
              {players.map((player, index) => (
                <div
                  key={player.id}
                  className="bg-[#18262f] p-3 border border-[#f7e7ad]/10 rounded-lg"
                  style={{ boxShadow: `inset 4px 0 0 ${player.color}` }}
                >
                  <input
                    className="bg-[#101820] px-3 py-2 rounded-md w-full"
                    value={player.name}
                    onChange={(e) =>
                      updatePlayer(index, "name", e.target.value)
                    }
                  />

                  <div className="flex gap-2 mt-2">
                    {colorOptions.map((color) => {
                      const taken = players.some(
                        (p, i) => p.color === color.value && i !== index,
                      );

                      return (
                        <button
                          key={color.value}
                          disabled={taken}
                          onClick={() =>
                            updatePlayer(index, "color", color.value)
                          }
                          className={`w-8 h-8 rounded-md ${
                            taken ? "opacity-30" : ""
                          }`}
                          style={{ backgroundColor: color.value }}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* START */}
            <button
              onClick={startGame}
              disabled={loading}
              className="bg-[#f59e22] mt-5 px-5 py-4 rounded-lg w-full font-black text-[#101820]"
            >
              {loading ? "Erstelle Spiel..." : "Spiel starten"}
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}
