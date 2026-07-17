"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { format, useI18n } from "@/lib/i18n";
import { supabase } from "@/lib/supabase/client";
import { themeForGameType } from "@/lib/gameThemes";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { GameTypeGrid } from "@/components/GameTypeGrid";
import type { AccountGameSummary } from "@/types/gameTypes";

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

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <main className="bg-[#101820] px-4 py-5 min-h-screen text-[#fff4c7]">
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
            className="border border-[#f59e22]/35 rounded-lg w-16 h-16 object-cover"
          />
          <h1 className="font-black text-3xl sm:text-5xl">{t.account.title}</h1>
        </header>

        {email === undefined ? (
          <p className="py-10 text-[#9fc9d5] text-sm text-center">
            {t.common.loading}
          </p>
        ) : !email ? (
          <section className="bg-[#14222b]/90 p-6 border border-[#f59e22]/20 rounded-lg text-center">
            <h2 className="font-black text-xl">{t.account.notLoggedInTitle}</h2>
            <p className="mt-2 text-[#d8d3bd] text-sm">
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
            <section className="flex sm:flex-row flex-col sm:justify-between sm:items-center gap-3 bg-[#14222b]/90 p-5 border border-[#f59e22]/20 rounded-lg">
              <p className="font-bold">{format(t.account.loggedInAs, { email })}</p>
              <button
                onClick={signOut}
                className="px-4 py-3 border border-[#f7e7ad]/15 rounded-md font-bold text-[#d8d3bd] text-sm"
                type="button"
              >
                {t.account.signOut}
              </button>
            </section>

            <section className="bg-[#14222b]/90 mt-4 p-5 border border-[#f59e22]/20 rounded-lg">
              <h2 className="font-black text-xl">{t.account.yourGames}</h2>

              {games === null ? (
                <p className="py-6 text-[#9fc9d5] text-sm text-center">
                  {t.account.loadingGames}
                </p>
              ) : games.length === 0 ? (
                <p className="py-6 text-[#9fc9d5] text-sm text-center">
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
                        className="flex justify-between items-center gap-3 bg-[#18262f] p-3 border border-[#f7e7ad]/10 rounded-lg w-full text-left"
                        style={{ boxShadow: `inset 4px 0 0 ${theme.hex}` }}
                        type="button"
                      >
                        <div className="min-w-0">
                          <p className="font-bold truncate">
                            {game.lobbyName ?? theme.label}
                          </p>
                          <p className="mt-0.5 text-[#9fc9d5] text-xs">
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

            <h2 className="mt-8 font-black text-[#f7e7ad] text-xl sm:text-2xl">
              {t.account.createNew}
            </h2>
            <GameTypeGrid />
          </>
        )}
      </div>
    </main>
  );
}
