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
import { ThemeToggle } from "@/components/ThemeToggle";
import { PlayerEditor } from "@/components/PlayerEditor";
import { SetupModes } from "@/components/SetupModes";
import { CATEGORY_KEYS, pickRandomWords } from "@/features/partyWords/utils";
import type {
  DeviceMode,
  PartyCategorySelection,
  Player,
  WhoAmIState,
  WhoAmIWordMode,
  WriteMode,
} from "@/types/gameTypes";

const PLAYER_COUNT_OPTIONS = [2, 3, 4, 5, 6, 7, 8, 9, 10];

const createPlayers = (count: number): Player[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `player-${i + 1}`,
    name: "",
    color: colorOptions[i % colorOptions.length].value,
  }));

export default function WhoAmISetup() {
  const router = useRouter();
  const { t } = useI18n();

  const [playerCount, setPlayerCount] = useState(4);
  const [wordMode, setWordMode] = useState<WhoAmIWordMode>("category");
  const [categoryKey, setCategoryKey] =
    useState<PartyCategorySelection>("random");
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("single");
  const [writeMode, setWriteMode] = useState<WriteMode>("host");
  const [everyoneActsAsHost, setEveryoneActsAsHost] = useState(false);
  const [players, setPlayers] = useState<Player[]>(() => createPlayers(4));
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

  const updatePlayerCount = (count: number) => {
    setPlayerCount(count);
    setPlayers((current) =>
      Array.from({ length: count }, (_, index) => {
        return (
          current[index] ?? {
            id: `player-${index + 1}`,
            name: "",
            color: colorOptions[index % colorOptions.length].value,
          }
        );
      }),
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

      // Mehrere Geräte + private Pro-Spieler-Infos: jeder verwaltet sein
      // eigenes Gerät selbst, die Host/Alle-Frage ergibt hier keinen Sinn.
      const effectiveWriteMode: WriteMode =
        deviceMode === "multi" ? "all" : writeMode;

      const words =
        wordMode === "category"
          ? pickRandomWords(t.partyWords.categories, categoryKey, cleanPlayers.length)
          : [];

      const state: WhoAmIState = {
        gameType: "whoAmI",
        playerCount,
        deviceMode,
        writeMode: effectiveWriteMode,
        players: cleanPlayers,
        phase:
          deviceMode === "multi"
            ? "lobby"
            : wordMode === "custom"
              ? "authoring"
              : "playing",
        lobbyName: lobbyName.trim() || undefined,
        hostId: getClientId(),
        categoryKey,
        wordMode,
        round: 1,
        words:
          wordMode === "category"
            ? Object.fromEntries(
                cleanPlayers.map((player, index) => [player.id, words[index]]),
              )
            : {},
        authoredIds: wordMode === "custom" ? [] : undefined,
        everyoneActsAsHost,
        revealedIds: [],
        guessedOrder: [],
      };

      const game = await createGame(state);

      if (!game) {
        return;
      }

      router.push(`/whoAmI/${game.id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={gameThemes.whoAmI.style}
      className="bg-(--sf-bg) px-4 sm:px-6 py-5 min-h-screen text-(--sf-text-strong)"
    >
      <div className="mx-auto max-w-5xl">
        <div className="flex justify-between items-center mb-5">
          <button
            onClick={() => router.push("/")}
            className="px-3 py-2 border border-(--sf-text)/15 rounded-md text-(--sf-text-muted) text-sm"
            type="button"
          >
            {t.common.back}
          </button>
          <LanguageSwitcher />
          <ThemeToggle />
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
              {t.whoAmI.setupTag}
            </p>
            <h1 className="mt-1 font-black text-3xl sm:text-5xl">
              {t.common.prepareGame}
            </h1>
          </div>
        </header>

        <div className="gap-4 grid lg:grid-cols-[0.85fr_1.15fr]">
          {/* LEFT */}
          <section className="bg-(--sf-surface-2)/90 p-4 border border-(--accent)/20 rounded-lg">
            <label className="font-bold text-(--sf-text) text-sm">
              {t.common.playerCount}
            </label>
            <div className="gap-2 grid grid-cols-4 mt-3">
              {PLAYER_COUNT_OPTIONS.map((count) => (
                <button
                  key={count}
                  onClick={() => updatePlayerCount(count)}
                  className={`rounded-md px-3 py-3 font-black ${
                    playerCount === count
                      ? "bg-(--accent) text-(--on-accent)"
                      : "bg-(--sf-surface) text-(--sf-text-muted)"
                  }`}
                  type="button"
                >
                  {count}
                </button>
              ))}
            </div>

            <label className="block mt-5 font-bold text-(--sf-text) text-sm">
              {t.whoAmI.wordModeLabel}
            </label>
            <div className="gap-2 grid grid-cols-2 mt-2">
              {(
                [
                  ["category", t.whoAmI.wordModeCategory],
                  ["custom", t.whoAmI.wordModeCustom],
                ] as [WhoAmIWordMode, string][]
              ).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setWordMode(value)}
                  className={`rounded-md px-3 py-2.5 text-sm font-bold ${
                    wordMode === value
                      ? "bg-(--accent) text-(--on-accent)"
                      : "bg-(--sf-surface) text-(--sf-text-muted)"
                  }`}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>

            {wordMode === "custom" ? (
              <p className="mt-1.5 text-(--sf-text-subtle) text-xs">
                {t.whoAmI.wordModeCustomHint}
              </p>
            ) : (
              <>
                <label className="block mt-4 font-bold text-(--sf-text) text-sm">
                  {t.whoAmI.categoryLabel}
                </label>
                <div className="gap-2 grid grid-cols-2 mt-2">
                  {(
                    [
                      ...CATEGORY_KEYS.map(
                        (key) =>
                          [key, t.partyWords.categories[key].label] as const,
                      ),
                      ["random", t.partyWords.categoryRandomLabel] as const,
                    ] as [PartyCategorySelection, string][]
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => setCategoryKey(value)}
                      className={`rounded-md px-3 py-2.5 text-sm font-bold ${
                        categoryKey === value
                          ? "bg-(--accent) text-(--on-accent)"
                          : "bg-(--sf-surface) text-(--sf-text-muted)"
                      }`}
                      type="button"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* MODES */}
            <div className="mt-5">
              <SetupModes
                deviceMode={deviceMode}
                writeMode={writeMode}
                onDeviceModeChange={setDeviceMode}
                onWriteModeChange={setWriteMode}
                hideWriteMode
              />
            </div>

            {deviceMode === "multi" ? (
              <div className="mt-4">
                <label className="flex items-start gap-2.5 bg-(--sf-surface) p-3 rounded-md cursor-pointer">
                  <input
                    type="checkbox"
                    checked={everyoneActsAsHost}
                    onChange={(event) =>
                      setEveryoneActsAsHost(event.target.checked)
                    }
                    className="mt-0.5 accent-(--accent)"
                  />
                  <span>
                    <span className="block font-bold text-sm">
                      {t.whoAmI.everyoneActsAsHostLabel}
                    </span>
                    <span className="block mt-0.5 text-(--sf-text-subtle) text-xs">
                      {t.whoAmI.everyoneActsAsHostHint}
                    </span>
                  </span>
                </label>
              </div>
            ) : null}

            {deviceMode === "multi" ? (
              <div className="mt-5">
                <label className="font-bold text-(--sf-text) text-sm">
                  {t.common.lobbyName}
                </label>
                <input
                  className="bg-(--sf-bg) mt-2 px-3 py-3 border border-(--sf-text)/10 focus:border-(--accent) rounded-md outline-none w-full"
                  value={lobbyName}
                  onChange={(event) => setLobbyName(event.target.value)}
                  placeholder={t.common.lobbyNamePlaceholder}
                  maxLength={40}
                />
              </div>
            ) : null}
          </section>

          {/* RIGHT */}
          <section className="bg-(--sf-surface-2)/90 p-4 border border-(--accent)/20 rounded-lg">
            <div className="flex justify-between mb-4">
              <h2 className="font-black text-xl">{t.common.players}</h2>
              <span className="text-(--sf-text-subtle) text-sm">
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
              <p className="mt-2 text-(--sf-text-subtle) text-xs text-center">
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
