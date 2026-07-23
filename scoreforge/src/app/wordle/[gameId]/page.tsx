"use client";

import { gameThemes } from "@/lib/gameThemes";

import Image from "next/image";
import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useGame } from "@/lib/useGame";
import { format, useI18n } from "@/lib/i18n";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { DeleteGameButton } from "@/components/DeleteGameButton";
import {
  buildSymbolMap,
  evaluateGuess,
  isAllowedGuess,
  keyboardRows,
  letterMarks,
  pickSolution,
} from "@/features/wordle/utils";
import type { WordleMark, WordleState } from "@/types/gameTypes";

// Kachelfarben der klassischen Variante.
const CLASSIC_COLORS: Record<WordleMark, string> = {
  correct: "#6aaa64",
  present: "#c9b458",
  absent: "#787c7e",
};

export default function WordleGame({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = use(params);
  const router = useRouter();
  const { t } = useI18n();

  const { game, state, notFound, isHost, canWrite, mutateState, deleteGame } =
    useGame<WordleState>(gameId);

  const [input, setInput] = useState("");
  const [message, setMessage] = useState("");

  // Meldungen (z.B. "zu wenige Buchstaben") nach kurzer Zeit ausblenden.
  useEffect(() => {
    if (!message) {
      return;
    }
    const timer = setTimeout(() => setMessage(""), 1800);
    return () => clearTimeout(timer);
  }, [message]);

  const isFinished = state?.phase === "finished";

  const submitGuess = () => {
    if (!state || !canWrite || isFinished) {
      return;
    }

    const guess = input;

    if (!isAllowedGuess(guess, state.wordLength)) {
      setMessage(
        guess.length < state.wordLength
          ? t.wordle.tooShort
          : t.wordle.notAllowed,
      );
      return;
    }

    if (state.guesses.includes(guess)) {
      setMessage(t.wordle.alreadyGuessed);
      return;
    }

    const nextGuesses = [...state.guesses, guess];
    const won = guess === state.solution;
    const lost = !won && nextGuesses.length >= state.maxGuesses;

    setInput("");
    mutateState(
      (current) => ({
        ...current,
        guesses: nextGuesses,
        phase: won || lost ? "finished" : "playing",
        won: won ? true : lost ? false : undefined,
        solvedCount: current.solvedCount + (won ? 1 : 0),
        lostCount: current.lostCount + (lost ? 1 : 0),
      }),
      (next) => next.phase === "finished",
    );
  };

  const newWord = () => {
    if (!state || !canWrite) {
      return;
    }

    setInput("");
    setMessage("");
    mutateState((current) => ({
      ...current,
      solution: pickSolution(current.language, current.solution),
      guesses: [],
      phase: "playing",
      won: undefined,
      // Bei "cryptic" neu mischen, damit die Symbol-Bedeutung jedes Wort
      // erneut geknackt werden muss.
      symbolMap: buildSymbolMap(current.variant),
    }));
  };

  // Zentrale Tasten-Verarbeitung, geteilt von Bildschirm- und echter Tastatur.
  const handleKey = (key: string) => {
    if (!state || !canWrite || isFinished) {
      return;
    }
    if (key === "ENTER") {
      submitGuess();
    } else if (key === "DEL") {
      setInput((current) => current.slice(0, -1));
      setMessage("");
    } else if (/^[A-Z]$/.test(key)) {
      setInput((current) =>
        current.length < state.wordLength ? current + key : current,
      );
      setMessage("");
    }
  };

  // Über einen Ref, damit der Listener nur einmal registriert wird, aber immer
  // die aktuellen Werte sieht.
  const handleKeyRef = useRef(handleKey);
  useEffect(() => {
    handleKeyRef.current = handleKey;
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }
      if (event.key === "Enter") {
        handleKeyRef.current("ENTER");
      } else if (event.key === "Backspace") {
        handleKeyRef.current("DEL");
      } else if (/^[a-zA-Z]$/.test(event.key)) {
        handleKeyRef.current(event.key.toUpperCase());
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (notFound) {
    return (
      <main
        style={gameThemes.wordle.style}
        className="place-items-center grid bg-(--sf-bg) px-4 min-h-screen text-(--sf-text-strong)"
      >
        <div className="text-center">
          <Image
            src="/Logo.png"
            alt="ScoreForge Logo"
            width={96}
            height={96}
            loading="eager"
            className="mx-auto mb-4 rounded-lg w-20 h-20 object-cover"
          />
          <h1 className="font-black text-2xl">{t.common.gameNotFound}</h1>
          <p className="mt-2 text-(--sf-text-muted)">{t.common.invalidLink}</p>
          <button
            onClick={() => router.push("/")}
            className="bg-(--accent) mt-5 px-5 py-3 rounded-lg font-black text-(--on-accent)"
            type="button"
          >
            {t.common.toHome}
          </button>
        </div>
      </main>
    );
  }

  if (!state || !game) {
    return (
      <main
        style={gameThemes.wordle.style}
        className="place-items-center grid bg-(--sf-bg) px-4 min-h-screen text-(--sf-text-strong)"
      >
        <p className="text-(--sf-text-muted)">{t.wordle.loadingGame}</p>
      </main>
    );
  }

  const { solution, guesses, wordLength, maxGuesses, variant, symbolMap } =
    state;
  const useSymbols = variant === "symbols" || variant === "cryptic";
  const keyMarks = letterMarks(guesses, solution);
  const rows = keyboardRows(state.language);
  // Legende: bei "symbols" immer, bei "cryptic" erst am Ende (löst das Rätsel
  // auf), bei "classic" gar nicht.
  const showLegend =
    variant === "symbols" || (variant === "cryptic" && isFinished);

  // Baut die Kacheln einer Zeile: bewerteter Versuch, aktuelle Eingabe oder leer.
  const renderRow = (rowIndex: number) => {
    const submitted = guesses[rowIndex];
    const isCurrent = !isFinished && rowIndex === guesses.length;
    const evaluation = submitted
      ? evaluateGuess(submitted, solution)
      : null;

    return (
      <div
        key={rowIndex}
        className="gap-1.5 grid"
        style={{ gridTemplateColumns: `repeat(${wordLength}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: wordLength }, (_, col) => {
          const letter = submitted
            ? submitted[col]
            : isCurrent
              ? input[col] ?? ""
              : "";
          const mark = evaluation ? evaluation[col] : null;

          const classicStyle =
            mark && variant === "classic"
              ? { backgroundColor: CLASSIC_COLORS[mark], color: "#ffffff" }
              : undefined;

          return (
            <div
              key={col}
              className={`relative grid place-items-center aspect-square rounded-md text-2xl sm:text-3xl font-black uppercase border ${
                mark
                  ? "border-transparent"
                  : letter
                    ? "border-(--accent)/60"
                    : "border-(--sf-text)/15"
              } ${
                mark && variant !== "classic"
                  ? "bg-(--sf-surface-2) text-(--sf-text-strong)"
                  : !mark
                    ? "bg-(--sf-surface)/40 text-(--sf-text-strong)"
                    : ""
              }`}
              style={classicStyle}
            >
              {letter}
              {mark && useSymbols ? (
                <span className="top-0.5 right-1 absolute font-black text-(--accent) text-xs sm:text-sm leading-none">
                  {symbolMap[mark]}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <main
      style={gameThemes.wordle.style}
      className="bg-(--sf-bg) px-4 py-5 min-h-screen text-(--sf-text-strong)"
    >
      <div className="mx-auto max-w-md">
        {/* HEADER */}
        <div className="flex justify-between items-center gap-2 mb-4">
          <button
            onClick={() => router.push("/")}
            className="px-3 py-2 border border-(--sf-text)/15 rounded-md text-(--sf-text-muted) text-sm"
            type="button"
          >
            {t.common.back}
          </button>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>

        <div className="flex justify-between items-center mb-3">
          <div>
            <p className="font-semibold text-(--accent) text-xs uppercase tracking-[0.18em]">
              {t.wordle.tag}
            </p>
            <p className="text-(--sf-text-subtle) text-sm">
              {format(t.wordle.statsLine, {
                solved: state.solvedCount,
                lost: state.lostCount,
              })}
            </p>
          </div>
          {isHost ? <DeleteGameButton onDelete={deleteGame} /> : null}
        </div>

        {variant === "cryptic" && !isFinished ? (
          <p className="bg-(--accent)/10 mb-3 px-3 py-2 border border-(--accent)/30 rounded-md text-(--sf-text-muted) text-xs">
            {t.wordle.crypticBanner}
          </p>
        ) : null}

        {/* GRID */}
        <div className="space-y-1.5">
          {Array.from({ length: maxGuesses }, (_, rowIndex) =>
            renderRow(rowIndex),
          )}
        </div>

        {/* MELDUNG / ERGEBNIS */}
        <div className="mt-4 min-h-10 text-center">
          {isFinished ? (
            <div className="space-y-2">
              <p className="font-black text-lg">
                {state.won ? t.wordle.wonBanner : t.wordle.lostBanner}
              </p>
              <p className="text-(--sf-text-muted) text-sm">
                {format(t.wordle.solutionWas, { word: solution })}
              </p>
              {canWrite ? (
                <button
                  onClick={newWord}
                  className="bg-(--accent) mt-1 px-5 py-3 rounded-lg font-black text-(--on-accent)"
                  type="button"
                >
                  {t.wordle.newWordButton}
                </button>
              ) : null}
            </div>
          ) : message ? (
            <p className="font-bold text-[#ef5b2a] text-sm">{message}</p>
          ) : (
            <p className="text-(--sf-text-subtle) text-xs">
              {format(t.wordle.instructions, {
                length: wordLength,
                guesses: maxGuesses,
              })}
            </p>
          )}
        </div>

        {/* LEGENDE */}
        {showLegend ? (
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-1 text-(--sf-text-muted) text-xs">
            <span className="font-bold text-(--sf-text-subtle)">
              {t.wordle.legendTitle}:
            </span>
            {(
              [
                ["correct", t.wordle.legendCorrect],
                ["present", t.wordle.legendPresent],
                ["absent", t.wordle.legendAbsent],
              ] as [WordleMark, string][]
            ).map(([mark, label]) => (
              <span key={mark} className="flex items-center gap-1">
                <span className="font-black text-(--accent)">
                  {symbolMap[mark]}
                </span>
                {label}
              </span>
            ))}
          </div>
        ) : null}

        {/* TASTATUR */}
        <div className="space-y-1.5 mt-5">
          {rows.map((row, rowIndex) => (
            <div key={rowIndex} className="flex justify-center gap-1.5">
              {rowIndex === rows.length - 1 ? (
                <button
                  onClick={() => handleKey("ENTER")}
                  disabled={!canWrite || isFinished}
                  className="flex-[1.5] bg-(--sf-surface-2) disabled:opacity-40 py-3.5 rounded-md font-black text-[11px] uppercase"
                  type="button"
                >
                  {t.wordle.keyEnter}
                </button>
              ) : null}

              {row.map((key) => {
                const mark = keyMarks[key];
                const classicKeyStyle =
                  mark && variant === "classic"
                    ? { backgroundColor: CLASSIC_COLORS[mark], color: "#ffffff" }
                    : undefined;

                return (
                  <button
                    key={key}
                    onClick={() => handleKey(key)}
                    disabled={!canWrite || isFinished}
                    className={`relative flex-1 rounded-md py-3.5 font-black uppercase disabled:opacity-40 ${
                      mark && variant === "classic"
                        ? ""
                        : "bg-(--sf-surface-2) text-(--sf-text-strong)"
                    }`}
                    style={classicKeyStyle}
                    type="button"
                  >
                    {key}
                    {mark && useSymbols ? (
                      <span className="top-0.5 right-0.5 absolute text-(--accent) text-[9px] leading-none">
                        {symbolMap[mark]}
                      </span>
                    ) : null}
                  </button>
                );
              })}

              {rowIndex === rows.length - 1 ? (
                <button
                  onClick={() => handleKey("DEL")}
                  disabled={!canWrite || isFinished}
                  className="flex-[1.5] bg-(--sf-surface-2) disabled:opacity-40 py-3.5 rounded-md font-black text-lg"
                  type="button"
                >
                  {"⌫"}
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
