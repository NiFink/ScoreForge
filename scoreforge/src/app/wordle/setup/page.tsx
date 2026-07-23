"use client";

import { gameThemes } from "@/lib/gameThemes";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { getClientId } from "@/lib/clientId";
import { createGame } from "@/lib/games/createGame";
import { colorOptions } from "@/lib/colors";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  buildSymbolMap,
  pickSolution,
  WORDLE_MAX_GUESSES,
  WORDLE_WORD_LENGTH,
} from "@/features/wordle/utils";
import type {
  Player,
  WordleLanguage,
  WordleState,
  WordleVariant,
} from "@/types/gameTypes";

export default function WordleSetup() {
  const router = useRouter();
  const { t } = useI18n();

  const [language, setLanguage] = useState<WordleLanguage>("de");
  const [variant, setVariant] = useState<WordleVariant>("classic");
  const [loading, setLoading] = useState(false);

  const variantHint =
    variant === "classic"
      ? t.wordle.variantClassicHint
      : variant === "symbols"
        ? t.wordle.variantSymbolsHint
        : t.wordle.variantCrypticHint;

  const startGame = async () => {
    setLoading(true);

    try {
      // Wördle ist ein Einzelgerät-Rätselbrett ohne Lobby/Spielerverwaltung.
      // Für die BaseGameState-Struktur legen wir einen einzelnen Platzhalter-
      // "Spieler" an.
      const player: Player = {
        id: "team",
        name: t.wordle.tag,
        color: colorOptions[0].value,
        claimedBy: null,
      };

      const state: WordleState = {
        gameType: "wordle",
        playerCount: 1,
        deviceMode: "single",
        writeMode: "host",
        players: [player],
        phase: "playing",
        hostId: getClientId(),
        language,
        variant,
        wordLength: WORDLE_WORD_LENGTH,
        maxGuesses: WORDLE_MAX_GUESSES,
        solution: pickSolution(language),
        guesses: [],
        symbolMap: buildSymbolMap(variant),
        solvedCount: 0,
        lostCount: 0,
      };

      const game = await createGame(state);

      if (!game) {
        return;
      }

      router.push(`/wordle/${game.id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={gameThemes.wordle.style}
      className="bg-(--sf-bg) px-4 sm:px-6 py-5 min-h-screen text-(--sf-text-strong)"
    >
      <div className="mx-auto max-w-2xl">
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
              {t.wordle.setupTag}
            </p>
            <h1 className="mt-1 font-black text-3xl sm:text-5xl">
              {t.common.prepareGame}
            </h1>
          </div>
        </header>

        <section className="bg-(--sf-surface-2)/90 p-4 border border-(--accent)/20 rounded-lg">
          {/* SPRACHE */}
          <label className="font-bold text-(--sf-text) text-sm">
            {t.wordle.languageLabel}
          </label>
          <div className="gap-2 grid grid-cols-2 mt-2">
            {(
              [
                ["de", t.wordle.languageDe],
                ["en", t.wordle.languageEn],
              ] as [WordleLanguage, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setLanguage(value)}
                className={`rounded-md px-3 py-3 text-sm font-bold ${
                  language === value
                    ? "bg-(--accent) text-(--on-accent)"
                    : "bg-(--sf-surface) text-(--sf-text-muted)"
                }`}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>

          {/* WÖRDLE-ART */}
          <label className="block mt-5 font-bold text-(--sf-text) text-sm">
            {t.wordle.variantLabel}
          </label>
          <div className="gap-2 grid grid-cols-3 mt-2">
            {(
              [
                ["classic", t.wordle.variantClassic],
                ["symbols", t.wordle.variantSymbols],
                ["cryptic", t.wordle.variantCryptic],
              ] as [WordleVariant, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setVariant(value)}
                className={`rounded-md px-3 py-3 text-sm font-bold ${
                  variant === value
                    ? "bg-(--accent) text-(--on-accent)"
                    : "bg-(--sf-surface) text-(--sf-text-muted)"
                }`}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-(--sf-text-subtle) text-xs">{variantHint}</p>

          <button
            onClick={startGame}
            disabled={loading}
            className="bg-(--accent) disabled:opacity-50 mt-6 px-5 py-4 rounded-lg w-full font-black text-(--on-accent) disabled:cursor-not-allowed"
          >
            {loading ? t.common.creatingGame : t.common.startGame}
          </button>
        </section>
      </div>
    </main>
  );
}
