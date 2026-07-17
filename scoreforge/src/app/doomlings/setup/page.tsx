"use client";

import { gameThemes } from "@/lib/gameThemes";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { getClientId } from "@/lib/clientId";
import { createGame } from "@/lib/games/createGame";
import { colorOptions } from "@/lib/colors";
import { useI18n } from "@/lib/i18n";
import { hasDuplicateNames } from "@/lib/playerValidation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { PlayerEditor } from "@/components/PlayerEditor";
import { SetupModes } from "@/components/SetupModes";
import type {
  DeviceMode,
  DoomlingsScores,
  DoomlingsState,
  Player,
  WriteMode,
} from "@/types/gameTypes";

const availableAddons = ["The Meaning of Life"];

const emptyScores = (): DoomlingsScores => ({
  numbers: 0,
  cross: 0,
  sickle: 0,
  worldsEnd: 0,
});

const createPlayers = (count: number): Player[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `player-${i + 1}`,
    name: "",
    color: colorOptions[i % colorOptions.length].value,
  }));

export default function DoomlingsSetup() {
  const router = useRouter();
  const { t } = useI18n();

  const [playerCount, setPlayerCount] = useState(3);
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("single");
  const [writeMode, setWriteMode] = useState<WriteMode>("host");
  const [addons, setAddons] = useState<string[]>([]);
  const [players, setPlayers] = useState<Player[]>(() => createPlayers(3));
  const [lobbyName, setLobbyName] = useState("");
  const [loading, setLoading] = useState(false);

  const allNamesFilled = players.every((player) => player.name.trim());
  const duplicateNames = hasDuplicateNames(players);
  const canStart = allNamesFilled && !duplicateNames;

  const updatePlayer = (i: number, key: "name" | "color", value: string) => {
    setPlayers((current) =>
      current.map((player, index) =>
        index === i ? { ...player, [key]: value } : player,
      ),
    );
  };

  const toggleAddon = (addon: string) => {
    setAddons((current) =>
      current.includes(addon)
        ? current.filter((item) => item !== addon)
        : [...current, addon],
    );
  };

  const startGame = async () => {
    if (!canStart) {
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

      const state: DoomlingsState = {
        gameType: "doomlings",
        playerCount,
        deviceMode,
        writeMode,
        addons,
        players: cleanPlayers,
        phase: deviceMode === "multi" ? "lobby" : "playing",
        lobbyName: lobbyName.trim() || undefined,
        hostId: getClientId(),
        scoringStep: 0,
        scoringStartPlayerIndex: 0,
        scoringStartPlayerChosen: false,
        readyPlayers: {},
        revealIndex: 0,
        scores: Object.fromEntries(
          cleanPlayers.map((player) => [player.id, emptyScores()]),
        ),
      };

      const game = await createGame(state);

      if (!game) {
        return;
      }

      router.push(`/doomlings/${game.id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={gameThemes.doomlings.style}
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
              {t.doomlings.setupTag}
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

            <div className="gap-2 grid grid-cols-5 mt-3">
              {[2, 3, 4, 5, 6].map((count) => (
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

            {/* ADD-ONS */}
            <div className="mt-5">
              <p className="font-bold text-[#f7e7ad] text-sm">
                {t.doomlings.addons}
              </p>
              <p className="mt-1 text-[#9fc9d5] text-xs">
                {t.doomlings.addonsHint}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {availableAddons.map((addon) => {
                  const active = addons.includes(addon);

                  return (
                    <button
                      key={addon}
                      onClick={() => toggleAddon(addon)}
                      className={`rounded-md px-3 py-2 text-sm font-bold ${
                        active
                          ? "bg-(--accent-2) text-(--on-accent)"
                          : "bg-[#18262f] text-[#d8d3bd]"
                      }`}
                      type="button"
                    >
                      {addon}
                    </button>
                  );
                })}
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
              disabled={loading || !canStart}
              className="bg-(--accent) disabled:opacity-50 mt-5 px-5 py-4 rounded-lg w-full font-black text-(--on-accent) disabled:cursor-not-allowed"
            >
              {loading ? t.common.creatingGame : t.common.startGame}
            </button>
            {!allNamesFilled ? (
              <p className="mt-2 text-[#9fc9d5] text-xs text-center">
                {t.common.fillAllNames}
              </p>
            ) : duplicateNames ? (
              <p className="mt-2 text-[#ef5b2a] text-xs text-center">
                {t.common.duplicateNames}
              </p>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}
