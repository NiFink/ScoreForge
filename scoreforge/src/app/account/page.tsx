"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { format, useI18n } from "@/lib/i18n";
import { supabase } from "@/lib/supabase/client";
import { themeForGameType } from "@/lib/gameThemes";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { GameTypeGrid } from "@/components/GameTypeGrid";
import type { AccountGameSummary, GameType } from "@/types/gameTypes";

type GameTypeStats = {
  gameType: GameType;
  count: number;
  avgScore: number;
  bestScore: number;
};

export default function AccountPage() {
  const router = useRouter();
  const { t } = useI18n();

  // undefined = noch am Laden, null = ausgeloggt, string = E-Mail
  const [email, setEmail] = useState<string | null | undefined>(undefined);
  const [games, setGames] = useState<AccountGameSummary[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) {
        setEmail(data.user?.email ?? null);
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setEmail(session?.user?.email ?? null);
      },
    );

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!email) {
      return;
    }

    let cancelled = false;

    fetch("/api/account/games")
      .then((response) => response.json())
      .then((data: { games?: AccountGameSummary[] }) => {
        if (!cancelled) {
          setGames(data.games ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setGames([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [email]);

  const gameTypeStats = useMemo<GameTypeStats[]>(() => {
    const byType = new Map<GameType, number[]>();

    for (const game of games ?? []) {
      if (!game.finished || game.topScore === null) {
        continue;
      }

      const scores = byType.get(game.gameType) ?? [];
      scores.push(game.topScore);
      byType.set(game.gameType, scores);
    }

    return Array.from(byType.entries())
      .map(([gameType, scores]) => ({
        gameType,
        count: scores.length,
        avgScore: Math.round(
          scores.reduce((sum, score) => sum + score, 0) / scores.length,
        ),
        bestScore: Math.max(...scores),
      }))
      .sort((a, b) => b.count - a.count);
  }, [games]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <main className="bg-(--sf-bg) px-4 py-5 min-h-screen text-(--sf-text-strong)">
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
            className="border border-[#f59e22]/35 rounded-lg w-16 h-16 object-cover"
          />
          <h1 className="font-black text-3xl sm:text-5xl">{t.account.title}</h1>
        </header>

        {email === undefined ? (
          <p className="py-10 text-(--sf-text-subtle) text-sm text-center">
            {t.common.loading}
          </p>
        ) : !email ? (
          <section className="bg-(--sf-surface-2)/90 p-6 border border-[#f59e22]/20 rounded-lg text-center">
            <h2 className="font-black text-xl">{t.account.notLoggedInTitle}</h2>
            <p className="mt-2 text-(--sf-text-muted) text-sm">
              {t.account.notLoggedInHint}
            </p>
            <button
              onClick={() => router.push("/login")}
              className="bg-[#f59e22] mt-5 px-5 py-4 rounded-lg font-black text-[#101820]"
              type="button"
            >
              {t.account.loginCta}
            </button>
          </section>
        ) : (
          <>
            <section className="flex sm:flex-row flex-col sm:justify-between sm:items-center gap-3 bg-(--sf-surface-2)/90 p-5 border border-[#f59e22]/20 rounded-lg">
              <p className="font-bold">{format(t.account.loggedInAs, { email })}</p>
              <button
                onClick={signOut}
                className="px-4 py-3 border border-(--sf-text)/15 rounded-md font-bold text-(--sf-text-muted) text-sm"
                type="button"
              >
                {t.account.signOut}
              </button>
            </section>

            <section className="bg-(--sf-surface-2)/90 mt-4 p-5 border border-[#f59e22]/20 rounded-lg">
              <h2 className="font-black text-xl">{t.account.yourGames}</h2>

              {games === null ? (
                <p className="py-6 text-(--sf-text-subtle) text-sm text-center">
                  {t.account.loadingGames}
                </p>
              ) : games.length === 0 ? (
                <p className="py-6 text-(--sf-text-subtle) text-sm text-center">
                  {t.account.noGames}
                </p>
              ) : (
                <div className="space-y-3 mt-4">
                  {games.map((game) => {
                    const theme = themeForGameType(game.gameType);

                    return (
                      <button
                        key={game.id}
                        onClick={() =>
                          router.push(`/${game.gameType}/${game.id}`)
                        }
                        className="flex justify-between items-center gap-3 bg-(--sf-surface) p-3 border border-(--sf-text)/10 rounded-lg w-full text-left"
                        style={{ boxShadow: `inset 4px 0 0 ${theme.hex}` }}
                        type="button"
                      >
                        <div className="min-w-0">
                          <p className="font-bold truncate">
                            {game.lobbyName ?? theme.label}
                          </p>
                          <p className="mt-0.5 text-(--sf-text-subtle) text-xs">
                            <span
                              className="inline-block mr-1 rounded-full w-2 h-2 align-middle"
                              style={{ backgroundColor: theme.hex }}
                            />
                            {theme.label} · {game.playerCount} {t.common.players}
                          </p>
                        </div>
                        <span
                          className="px-2 py-1 rounded-md font-bold text-xs whitespace-nowrap"
                          style={{
                            backgroundColor: `${theme.hex}22`,
                            color: theme.hex,
                          }}
                        >
                          {game.phase}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="bg-(--sf-surface-2)/90 mt-4 p-5 border border-[#f59e22]/20 rounded-lg">
              <h2 className="font-black text-xl">{t.account.statsTitle}</h2>

              {games === null ? (
                <p className="py-6 text-(--sf-text-subtle) text-sm text-center">
                  {t.account.loadingGames}
                </p>
              ) : gameTypeStats.length === 0 ? (
                <p className="py-6 text-(--sf-text-subtle) text-sm text-center">
                  {t.account.statsNone}
                </p>
              ) : (
                <div className="gap-3 grid sm:grid-cols-2 mt-4">
                  {gameTypeStats.map((stat) => {
                    const theme = themeForGameType(stat.gameType);

                    return (
                      <div
                        key={stat.gameType}
                        className="bg-(--sf-surface) p-3 border border-(--sf-text)/10 rounded-lg"
                        style={{ boxShadow: `inset 4px 0 0 ${theme.hex}` }}
                      >
                        <p className="font-bold truncate">
                          <span
                            className="inline-block mr-1 rounded-full w-2 h-2 align-middle"
                            style={{ backgroundColor: theme.hex }}
                          />
                          {theme.label}
                        </p>
                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 mt-1.5 text-(--sf-text-subtle) text-xs">
                          <span>
                            {format(t.account.statsGamesPlayed, {
                              n: String(stat.count),
                            })}
                          </span>
                          <span>
                            {format(t.account.statsAvgScore, {
                              score: String(stat.avgScore),
                            })}
                          </span>
                          <span>
                            {format(t.account.statsBestScore, {
                              score: String(stat.bestScore),
                            })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <h2 className="mt-8 font-black text-(--sf-text) text-xl sm:text-2xl">
              {t.account.createNew}
            </h2>
            <GameTypeGrid />
          </>
        )}
      </div>
    </main>
  );
}
