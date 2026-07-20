"use client";

import { gameThemes } from "@/lib/gameThemes";

import Image from "next/image";
import { useMemo, useState } from "react";
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
import { createScoreTable } from "@/features/wizard/utils";
import type { GameState, WizardMode } from "@/types/wizardTypes";
import type { DeviceMode, Player, WriteMode } from "@/types/gameTypes";

const roundMap: Record<number, number> = {
  3: 20,
  4: 15,
  5: 12,
  6: 10,
};

const createPlayers = (count: number): Player[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `player-${i + 1}`,
    name: "",
    color: colorOptions[i % colorOptions.length].value,
  }));

export default function WizardSetup() {
  const router = useRouter();
  const { t } = useI18n();

  const [playerCount, setPlayerCount] = useState(3);
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("single");
  const [writeMode, setWriteMode] = useState<WriteMode>("host");
  const [mode, setMode] = useState<WizardMode>("standard");
  const [specialCards, setSpecialCards] = useState<string[]>([]);
  const [players, setPlayers] = useState<Player[]>(() => createPlayers(3));
  const [lobbyName, setLobbyName] = useState("");
  const [loading, setLoading] = useState(false);

  const rounds = useMemo(() => roundMap[playerCount] || 10, [playerCount]);
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

  const toggleSpecialCard = (id: string) => {
    setSpecialCards((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
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
        mode,
        specialCards: mode === "anniversary" ? specialCards : [],
      };

      const game = await createGame(state);

      if (!game) {
        return;
      }

      router.push(`/wizard/${game.id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={gameThemes.wizard.style} className="bg-(--sf-bg) px-4 sm:px-6 py-5 min-h-screen text-(--sf-text-strong)">
      <div className="mx-auto max-w-5xl">
        {/* BACK */}
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
          <section className="bg-(--sf-surface-2)/90 p-4 border border-(--accent)/20 rounded-lg">
            {/* PLAYER COUNT */}
            <label className="font-bold text-(--sf-text) text-sm">
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
                      : "bg-(--sf-surface) text-(--sf-text-muted)"
                  }`}
                  type="button"
                >
                  {count}
                </button>
              ))}
            </div>

            {/* ROUNDS */}
            <div className="bg-(--sf-surface) mt-5 p-4 rounded-lg">
              <p className="text-(--sf-text-subtle) text-sm">{t.common.rounds}</p>
              <p className="mt-1 font-black text-4xl">{rounds}</p>
            </div>

            {/* GAME MODE */}
            <div className="mt-5">
              <label className="font-bold text-(--sf-text) text-sm">
                {t.wizard.modeLabel}
              </label>
              <div className="gap-2 grid grid-cols-2 mt-2">
                {(["standard", "anniversary"] as const).map((option) => (
                  <button
                    key={option}
                    onClick={() => {
                      setMode(option);

                      if (option === "anniversary") {
                        setSpecialCards(
                          t.wizard.specialCards.map((card) => card.id),
                        );
                      }
                    }}
                    className={`rounded-md px-3 py-3 font-black ${
                      mode === option
                        ? "bg-(--accent) text-(--on-accent)"
                        : "bg-(--sf-surface) text-(--sf-text-muted)"
                    }`}
                    type="button"
                  >
                    {option === "standard"
                      ? t.wizard.modeStandard
                      : t.wizard.modeAnniversary}
                  </button>
                ))}
              </div>

              {mode === "anniversary" ? (
                <>
                  <p className="mt-2 text-(--sf-text-subtle) text-xs">
                    {t.wizard.modeAnniversaryHint}
                  </p>
                  <p className="mt-4 font-bold text-(--sf-text) text-sm">
                    {t.wizard.specialCardsTitle}
                  </p>
                  <p className="mt-1 text-(--sf-text-subtle) text-xs">
                    {t.wizard.specialCardsHint}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {t.wizard.specialCards.map((card) => {
                      const active = specialCards.includes(card.id);

                      return (
                        <button
                          key={card.id}
                          onClick={() => toggleSpecialCard(card.id)}
                          className={`rounded-md px-3 py-2 text-sm font-bold ${
                            active
                              ? "bg-(--accent-2) text-(--on-accent)"
                              : "bg-(--sf-surface) text-(--sf-text-muted)"
                          }`}
                          type="button"
                        >
                          {card.name}
                        </button>
                      );
                    })}
                  </div>
                </>
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

            {/* START */}
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
