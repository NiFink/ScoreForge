"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type DeviceMode = "single" | "multi";
type WriteMode = "host" | "all";

type Player = {
  id: string;
  name: string;
  color: string;
};

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
  const [startPlayerIndex, setStartPlayerIndex] = useState(0);

  const rounds = useMemo(() => roundMap[playerCount] || 10, [playerCount]);

  const updatePlayer = (i: number, key: keyof Player, value: string) => {
    setPlayers((current) =>
      current.map((player, index) =>
        index === i ? { ...player, [key]: value } : player,
      ),
    );
  };

  const startGame = () => {
    const cleanPlayers = players.map((player, index) => ({
      ...player,
      name: player.name.trim() || `Spieler ${index + 1}`,
    }));

    localStorage.setItem(
      "scoreforge:wizard:setup",
      JSON.stringify({
        playerCount,
        deviceMode,
        writeMode,
        rounds,
        startPlayerIndex,
        players: cleanPlayers,
      }),
    );

    router.push("/wizard/game");
  };

  return (
    <main className="bg-[#101820] px-4 sm:px-6 py-5 min-h-screen text-[#fff4c7]">
      <div className="mx-auto max-w-5xl">
        <button
          onClick={() => router.push("/")}
          className="mb-5 px-3 py-2 border border-[#f7e7ad]/15 rounded-md text-[#d8d3bd] text-sm"
          type="button"
        >
          Zurueck
        </button>

        <header className="flex items-center gap-4 mb-6">
          <Image
            src="/Logo.png"
            alt="ScoreForge Logo"
            width={80}
            height={80}
            className="shadow-[0_0_24px_rgba(245,158,34,0.2)] border border-[#f59e22]/35 rounded-lg w-16 h-16 object-cover"
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
          <section className="bg-[#14222b]/90 p-4 border border-[#f59e22]/20 rounded-lg">
            <label className="font-bold text-[#f7e7ad] text-sm">
              Anzahl Spieler
            </label>
            <div className="gap-2 grid grid-cols-4 mt-3">
              {[3, 4, 5, 6].map((count) => (
                <button
                  key={count}
                  onClick={() => {
                    setPlayerCount(count);
                    setStartPlayerIndex((current) =>
                      Math.min(current, count - 1),
                    );
                    setPlayers((current) =>
                      Array.from({ length: count }, (_, index) => {
                        return (
                          current[index] ?? {
                            id: `player-${index + 1}`,
                            name: `Spieler ${index + 1}`,
                            color:
                              colorOptions[index % colorOptions.length].value,
                          }
                        );
                      }),
                    );
                  }}
                  className={`rounded-md px-3 py-3 font-black transition ${
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

            <div className="bg-[#18262f] mt-5 p-4 rounded-lg">
              <p className="text-[#9fc9d5] text-sm">Runden</p>
              <p className="mt-1 font-black text-4xl">{rounds}</p>
            </div>

            <div className="bg-[#18262f] mt-5 p-4 rounded-lg">
              <label className="font-bold text-[#f7e7ad] text-sm">
                Wer fängt an?
              </label>
              <select
                className="bg-[#101820] mt-2 px-3 py-3 border border-[#f7e7ad]/10 focus:border-[#f59e22] rounded-md outline-none w-full font-bold text-[#fff4c7]"
                value={startPlayerIndex}
                onChange={(event) =>
                  setStartPlayerIndex(Number(event.target.value))
                }
              >
                {players.map((player, index) => (
                  <option key={player.id} value={index}>
                    {player.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-4 mt-5">
              <fieldset>
                <legend className="font-bold text-[#f7e7ad] text-sm">
                  Geräte
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
                  Eintragen
                </legend>
                <div className="gap-2 grid grid-cols-2 mt-2">
                  {[
                    ["host", "Nur einer"],
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

          <section className="bg-[#14222b]/90 p-4 border border-[#f59e22]/20 rounded-lg">
            <div className="flex justify-between items-center gap-3 mb-4">
              <h2 className="font-black text-xl">Spieler erstellen</h2>
              <span className="text-[#9fc9d5] text-sm">Name und Farbe</span>
            </div>

            <div className="space-y-3">
              {players.map((player, index) => (
                <div
                  key={player.id}
                  className="gap-3 grid sm:grid-cols-[1fr_auto] bg-[#18262f] p-3 border border-[#f7e7ad]/10 rounded-lg"
                  style={{
                    boxShadow: `inset 4px 0 0 ${player.color}`,
                  }}
                >
                  <label className="block">
                    <span className="font-bold text-[#9fc9d5] text-xs uppercase tracking-[0.12em]">
                      Spieler {index + 1}
                    </span>
                    <input
                      className="bg-[#101820] mt-1 px-3 py-3 border border-[#f7e7ad]/10 focus:border-[#f59e22] rounded-md outline-none w-full text-base"
                      value={player.name}
                      onChange={(e) =>
                        updatePlayer(index, "name", e.target.value)
                      }
                    />
                  </label>

                  <div>
                    <span className="font-bold text-[#9fc9d5] text-xs uppercase tracking-[0.12em]">
                      Farbe
                    </span>
                    <div className="flex gap-2 mt-2">
                      {colorOptions.map((color) =>
                        (() => {
                          const colorOwnerIndex = players.findIndex(
                            (item) => item.color === color.value,
                          );
                          const isTaken =
                            colorOwnerIndex !== -1 && colorOwnerIndex !== index;

                          return (
                            <button
                              key={color.value}
                              aria-label={
                                isTaken
                                  ? `${color.name} ist vergeben`
                                  : color.name
                              }
                              disabled={isTaken}
                              onClick={() =>
                                updatePlayer(index, "color", color.value)
                              }
                              className={`h-10 w-10 rounded-md border-2 transition ${
                                player.color === color.value
                                  ? "border-white"
                                  : "border-transparent"
                              } ${isTaken ? "cursor-not-allowed opacity-25" : ""}`}
                              style={{ backgroundColor: color.value }}
                              title={isTaken ? "Schon vergeben" : color.name}
                              type="button"
                            />
                          );
                        })(),
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={startGame}
              className="bg-[#f59e22] hover:bg-[#ffb13d] shadow-[0_0_28px_rgba(245,158,34,0.24)] mt-5 px-5 py-4 rounded-lg w-full font-black text-[#101820] text-base transition"
              type="button"
            >
              Spiel starten
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}
