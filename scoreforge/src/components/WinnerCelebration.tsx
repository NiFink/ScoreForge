"use client";

import { useMemo, useState } from "react";

import { format, useI18n } from "@/lib/i18n";
import { themeForGameType } from "@/lib/gameThemes";
import { computeRanks } from "@/lib/ranking";
import type { GameType } from "@/types/gameTypes";
import {
  renderShareCard,
  shareOrDownloadImage,
  type ShareStanding,
} from "@/lib/shareImage";

export type CelebrationStanding = {
  id: string;
  name: string;
  color: string;
  score: number;
  detail?: string;
};

type WinnerCelebrationProps = {
  gameType: GameType;
  gameLabel: string;
  standings: CelebrationStanding[];
  code: string;
  lobbyName?: string;
  scoreUnit: string;
  onClose: () => void;
};

const CONFETTI_COUNT = 46;

const medals = ["\u{1F947}", "\u{1F948}", "\u{1F949}"];

export function WinnerCelebration({
  gameType,
  gameLabel,
  standings,
  code,
  lobbyName,
  scoreUnit,
  onClose,
}: WinnerCelebrationProps) {
  const { t } = useI18n();
  const theme = themeForGameType(gameType);
  const [busy, setBusy] = useState(false);

  const winner = standings[0] ?? null;
  const isTie =
    standings.length > 1 && standings[0].score === standings[1].score;
  // Punktgleiche Spieler teilen sich den Platz (1224-Ranking).
  const ranks = computeRanks(standings.map((entry) => entry.score));

  const title = isTie
    ? t.celebration.tieTitle
    : winner
      ? format(t.celebration.winsTitle, { name: winner.name })
      : t.celebration.victory;

  const confetti = useMemo(() => {
    const palette = [
      theme.hex,
      theme.hex2,
      "#f7e7ad",
      "#ffffff",
      winner?.color ?? theme.hex,
    ];

    // Deterministische Pseudo-Zufallswerte (rein) für stabile Renders.
    const rand = (n: number) => {
      const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
      return x - Math.floor(x);
    };

    return Array.from({ length: CONFETTI_COUNT }, (_, index) => ({
      left: rand(index + 1) * 100,
      delay: rand(index + 11) * 2.4,
      duration: 2.6 + rand(index + 23) * 2.4,
      size: 7 + rand(index + 37) * 9,
      color: palette[index % palette.length],
      rounded: index % 3 === 0,
    }));
  }, [theme.hex, theme.hex2, winner?.color]);

  const handleShare = async () => {
    if (busy) {
      return;
    }

    setBusy(true);
    try {
      const shareStandings: ShareStanding[] = standings
        .slice(0, 6)
        .map((entry, index) => ({
          rank: ranks[index],
          name: entry.name,
          color: entry.color,
          score: String(entry.score),
          detail: entry.detail,
        }));

      const gameUrl =
        typeof window !== "undefined" ? window.location.href : undefined;

      const blob = await renderShareCard({
        gameLabel,
        title,
        accentColor: theme.hex,
        accent2Color: theme.hex2,
        standings: shareStandings,
        footer: lobbyName
          ? `${lobbyName} · ${t.common.code} ${code}`
          : `ScoreForge · ${t.common.code} ${code}`,
        isTie,
        url: gameUrl,
      });

      const shareText = isTie
        ? format(t.celebration.shareTie, { game: gameLabel })
        : format(t.celebration.shareText, {
            name: winner?.name ?? "",
            game: gameLabel,
          });
      // Link zusätzlich im Text — viele Apps übernehmen beim Teilen einer
      // Bilddatei das separate url-Feld nicht.
      const shareTextWithLink = gameUrl
        ? `${shareText}\n${gameUrl}`
        : shareText;

      await shareOrDownloadImage(
        blob,
        `scoreforge-${gameType}-${code}.png`,
        title,
        shareTextWithLink,
        gameUrl,
      );
    } catch (error) {
      console.error("Share failed", error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={theme.style}
      className="z-50 fixed inset-0 flex justify-center items-end sm:items-center bg-black/80 backdrop-blur-sm p-3 overflow-hidden"
    >
      {/* Konfetti */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {confetti.map((piece, index) => (
          <span
            key={index}
            className="sf-confetti"
            style={{
              left: `${piece.left}%`,
              width: `${piece.size}px`,
              height: `${piece.size * 1.6}px`,
              backgroundColor: piece.color,
              borderRadius: piece.rounded ? "9999px" : "2px",
              animationDelay: `${piece.delay}s`,
              animationDuration: `${piece.duration}s`,
            }}
          />
        ))}
      </div>

      <div className="relative bg-[#101820]/95 shadow-2xl p-6 border border-(--accent)/30 rounded-2xl w-full max-w-md max-h-[92vh] overflow-y-auto text-[#fff4c7] text-center">
        <p className="font-black text-(--accent) text-sm uppercase tracking-[0.3em]">
          {t.celebration.victory}
        </p>

        <div className="mt-3 text-6xl sf-trophy" aria-hidden>
          {isTie ? "\u{1F91D}" : "\u{1F3C6}"}
        </div>

        <h2 className="mt-3 font-black text-3xl leading-tight">{title}</h2>

        {winner && !isTie ? (
          <p className="mt-1 font-bold text-(--accent-2) text-lg">
            {winner.score} {scoreUnit}
          </p>
        ) : null}

        {/* Endstand */}
        <div className="space-y-2 mt-6 text-left">
          <p className="font-semibold text-[#9fc9d5] text-xs uppercase tracking-[0.18em]">
            {t.celebration.finalStandings}
          </p>
          {standings.slice(0, 8).map((entry, index) => (
            <div
              key={entry.id}
              className="flex items-center gap-3 bg-[#14222b]/90 px-3 py-2.5 border border-[#f7e7ad]/10 rounded-lg"
              style={{ boxShadow: `inset 4px 0 0 ${entry.color}` }}
            >
              <span className="w-7 font-black text-lg text-center">
                {ranks[index] <= 3 ? medals[ranks[index] - 1] : `${ranks[index]}.`}
              </span>
              <span className="flex-1 min-w-0 font-bold truncate">
                {entry.name}
                {entry.detail ? (
                  <span className="block font-normal text-[#9fc9d5] text-xs truncate">
                    {entry.detail}
                  </span>
                ) : null}
              </span>
              <span className="font-black text-xl">{entry.score}</span>
            </div>
          ))}
        </div>

        <div className="gap-2 grid grid-cols-1 mt-6">
          <button
            onClick={handleShare}
            disabled={busy}
            className="flex justify-center items-center gap-2 bg-(--accent) disabled:opacity-60 px-4 py-3.5 rounded-lg font-black text-(--on-accent) disabled:cursor-wait"
            type="button"
          >
            {busy ? t.celebration.preparing : `\u{1F4E4} ${t.celebration.shareImage}`}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-3 border border-[#f7e7ad]/15 rounded-lg font-bold text-[#d8d3bd]"
            type="button"
          >
            {t.celebration.close}
          </button>
        </div>
      </div>
    </div>
  );
}
