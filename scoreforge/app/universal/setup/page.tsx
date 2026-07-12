"use client";

import { gameThemes } from "@/lib/gameThemes";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { getClientId } from "@/lib/clientId";
import { colorOptions } from "@/lib/colors";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { PlayerEditor } from "@/components/PlayerEditor";
import { SetupModes } from "@/components/SetupModes";
import type {
  DeviceMode,
  Player,
  UniversalEndCondition,
  UniversalState,
  WriteMode,
} from "../../types/gameTypes";

const createPlayers = (count: number): Player[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `player-${i + 1}`,
    name: "",
    color: colorOptions[i % colorOptions.length].value,
  }));

export default function UniversalSetup() {
  const router = useRouter();
  const { t } = useI18n();

  const [playerCount, setPlayerCount] = useState(4);
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("single");
  const [writeMode, setWriteMode] = useState<WriteMode>("host");
  const [endCondition, setEndCondition] =
    useState<UniversalEndCondition>("target");
  const [targetScore, setTargetScore] = useState(100);
  const [maxRounds, setMaxRounds] = useState(10);
  const [players, setPlayers] = useState<Player[]>(() => createPlayers(4));
  const [lobbyName, setLobbyName] = useState("");
  const [loading, setLoading] = useState(false);

  const allNamesFilled = players.every((player) => player.name.trim());

  const endOptions: {
    value: UniversalEndCondition;
    label: string;
    hint: string;
  }[] = [
    {
      value: "target",
      label: t.universal.endTarget,
      hint: t.universal.endTargetHint,
    },
    {
      value: "rounds",
      label: t.universal.endRounds,
      hint: t.universal.endRoundsHint,
    },
    {
      value: "none",
      label: t.universal.endNone,
      hint: t.universal.endNoneHint,
    },
  ];

  const updatePlayer = (i: number, key: "name" | "color", value: string) => {
    setPlayers((current) =>
      current.map((player, index) =>
        index === i ? { ...player, [key]: value } : player,
      ),
    );
  };

  const startGame = async () => {
    if (!allNamesFilled) {
      return;
    }

    setLoading(true);

    try {
      const cleanPlayers: Player[] = players.map((player) => ({
        id: player.id,
        name: player.name.trim(),
        color: player.color,
        claimedBy: null,
      }));

      const state: UniversalState = {
        gameType: "universal",
        playerCount,
        deviceMode,
        writeMode,
        endCondition,
        targetScore: endCondition === "target" ? targetScore : undefined,
        maxRounds: endCondition === "rounds" ? maxRounds : undefined,
        players: cleanPlayers,
        phase: deviceMode === "multi" ? "lobby" : "playing",
        lobbyName: lobbyName.trim() || undefined,
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
      router.push(`/universal/${game.id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={gameThemes.universal.style}
      className="bg-[#101820] px-4 sm:px-6 py-5 min-h-screen text-[#fff4c7]"
    >
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
            className="border border-(--accent)/35 rounded-lg w-16 h-16 object-cover"
          />

          <div>
            <p className="font-semibold text-(--accent) text-sm uppercase tracking-[0.18em]">
              {t.universal.setupTag}
            </p>
            <h1 className="mt-1 font-black text-3xl sm:text-5xl">
              {t.common.prepareGame}
            </h1>
          </div>
        </header>

        <div className="gap-4 grid lg:grid-cols-[0.85fr_1.15fr]">
          {/* LEFT */}
          <section className="bg-[#14222b]/90 p-4 border border-(--accent)/20 rounded-lg">
            <label className="font-bold text-[#f7e7ad] text-sm">
              {t.common.playerCount}
            </label>

            <div className="gap-2 grid grid-cols-4 mt-3">
              {[2, 3, 4, 5, 6, 7, 8].map((count) => (
                <button
                  key={count}
                  onClick={() => {
                    setPlayerCount(count);
                    setPlayers((current) =>
                      Array.from({ length: count }, (_, index) => {
                        return (
                          current[index] ?? {
                            id: `player-${index + 1}`,
                            name: "",
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

            {/* END CONDITION */}
            <div className="mt-5">
              <label className="font-bold text-[#f7e7ad] text-sm">
                {t.universal.endConditionLabel}
              </label>
              <div className="space-y-2 mt-2">
                {endOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setEndCondition(option.value)}
                    className={`w-full rounded-lg border px-4 py-3 text-left ${
                      endCondition === option.value
                        ? "border-(--accent) bg-(--accent)/15"
                        : "border-[#f7e7ad]/10 bg-[#18262f]"
                    }`}
                    type="button"
                  >
                    <span className="block font-bold">{option.label}</span>
                    <span className="block mt-0.5 text-[#9fc9d5] text-xs">
                      {option.hint}
                    </span>
                  </button>
                ))}
              </div>

              {endCondition === "target" ? (
                <div className="mt-3">
                  <label className="font-bold text-[#f7e7ad] text-sm">
                    {t.universal.targetScore}
                  </label>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() =>
                        setTargetScore((current) => Math.max(1, current - 10))
                      }
                      className="bg-[#18262f] px-4 py-3 rounded-md font-black text-[#d8d3bd]"
                      type="button"
                    >
                      -10
                    </button>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      value={targetScore}
                      onChange={(event) => {
                        const next = Number(event.target.value);
                        setTargetScore(
                          Number.isFinite(next) ? Math.max(1, next) : 100,
                        );
                      }}
                      className="bg-[#101820] px-3 py-3 border border-[#f7e7ad]/10 focus:border-(--accent) rounded-md outline-none w-full font-black text-lg text-center"
                    />
                    <button
                      onClick={() => setTargetScore((current) => current + 10)}
                      className="bg-[#18262f] px-4 py-3 rounded-md font-black text-[#d8d3bd]"
                      type="button"
                    >
                      +10
                    </button>
                  </div>
                </div>
              ) : null}

              {endCondition === "rounds" ? (
                <div className="mt-3">
                  <label className="font-bold text-[#f7e7ad] text-sm">
                    {t.universal.roundCount}
                  </label>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() =>
                        setMaxRounds((current) => Math.max(1, current - 1))
                      }
                      className="bg-[#18262f] px-4 py-3 rounded-md font-black text-[#d8d3bd]"
                      type="button"
                    >
                      -1
                    </button>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      value={maxRounds}
                      onChange={(event) => {
                        const next = Number(event.target.value);
                        setMaxRounds(
                          Number.isFinite(next) ? Math.max(1, next) : 10,
                        );
                      }}
                      className="bg-[#101820] px-3 py-3 border border-[#f7e7ad]/10 focus:border-(--accent) rounded-md outline-none w-full font-black text-lg text-center"
                    />
                    <button
                      onClick={() => setMaxRounds((current) => current + 1)}
                      className="bg-[#18262f] px-4 py-3 rounded-md font-black text-[#d8d3bd]"
                      type="button"
                    >
                      +1
                    </button>
                  </div>
                </div>
              ) : null}
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

            <button
              onClick={startGame}
              disabled={loading || !allNamesFilled}
              className="bg-(--accent) disabled:opacity-50 mt-5 px-5 py-4 rounded-lg w-full font-black text-(--on-accent) disabled:cursor-not-allowed"
            >
              {loading ? t.common.creatingGame : t.common.startGame}
            </button>
            {!allNamesFilled ? (
              <p className="mt-2 text-[#9fc9d5] text-xs text-center">
                {t.common.fillAllNames}
              </p>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}
