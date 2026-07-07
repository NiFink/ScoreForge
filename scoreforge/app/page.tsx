"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

import { useI18n } from "@/lib/i18n";
import { gameThemes } from "@/lib/gameThemes";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function Home() {
  const router = useRouter();
  const { t } = useI18n();

  const games = [
    {
      title: "Wizard",
      href: "/wizard/setup",
      theme: gameThemes.wizard,
      description: t.home.wizardDescription,
    },
    {
      title: "Doomlings",
      href: "/doomlings/setup",
      theme: gameThemes.doomlings,
      description: t.home.doomlingsDescription,
    },
    {
      title: "Binokel",
      href: "/binokel/setup",
      theme: gameThemes.binokel,
      description: t.home.binokelDescription,
    },
  ];

  return (
    <main className="bg-[#101820] min-h-screen text-[#fff4c7]">
      <section className="flex flex-col mx-auto px-4 sm:px-6 lg:px-8 py-5 w-full max-w-6xl min-h-screen">
        {/* HERO */}
        <header className="flex justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <Image
              src="/Logo.png"
              alt="ScoreForge Logo"
              width={88}
              height={88}
              priority
              loading="eager"
              className="shadow-[0_0_28px_rgba(245,158,34,0.28)] border border-[#f59e22]/40 rounded-lg w-14 sm:w-16 h-14 sm:h-16 object-cover"
            />
            <div>
              <p className="font-semibold text-[#f59e22] text-xs uppercase tracking-[0.18em]">
                {t.home.brand}
              </p>
              <h1 className="mt-1 font-black text-2xl sm:text-4xl">
                {t.home.title}
              </h1>
            </div>
          </div>
          <LanguageSwitcher />
        </header>

        <p className="mt-4 max-w-2xl text-[#d8d3bd] text-base leading-7">
          {t.home.description}
        </p>

        {/* GAMES */}
        <h2 className="mt-8 font-black text-[#f7e7ad] text-xl sm:text-2xl">
          {t.home.gamesTitle}
        </h2>

        <div className="gap-4 grid md:grid-cols-3 mt-4">
          {games.map((game) => (
            <button
              key={game.title}
              onClick={() => router.push(game.href)}
              style={game.theme.style}
              className="group flex flex-col bg-[#14222b]/90 hover:shadow-[0_18px_50px_rgba(0,0,0,0.35)] p-5 border border-(--accent)/25 hover:border-(--accent)/60 rounded-xl text-left transition hover:-translate-y-1"
              type="button"
            >
              <div className={`h-2 rounded-full ${game.theme.gradient}`} />
              <h3 className="mt-4 font-black text-(--accent) text-2xl">
                {game.title}
              </h3>
              <p className="mt-2 text-[#d8d3bd] text-sm leading-6">
                {game.description}
              </p>
              <span className="inline-block bg-(--accent) group-hover:brightness-110 mt-5 px-4 py-3 rounded-lg font-black text-(--on-accent) text-sm text-center">
                {t.home.playNow}
              </span>
            </button>
          ))}
        </div>

        {/* JOIN */}
        <div className="bg-[#14222b]/90 mt-6 p-5 border border-[#2aa6c8]/30 rounded-xl">
          <div className="flex sm:flex-row flex-col sm:justify-between sm:items-center gap-3">
            <div>
              <h2 className="font-black text-xl">{t.home.joinTitle}</h2>
              <p className="mt-1 text-[#d8d3bd] text-sm">{t.home.joinHint}</p>
            </div>
            <button
              onClick={() => router.push("/join")}
              className="bg-[#2aa6c8] hover:bg-[#3db8da] px-5 py-4 rounded-lg font-black text-[#101820] whitespace-nowrap transition"
              type="button"
            >
              {t.home.joinLobby}
            </button>
          </div>
        </div>

        {/* BADGES */}
        <div className="flex flex-wrap gap-2 mt-auto pt-8 text-[#f7e7ad] text-sm">
          <span className="bg-[#f59e22]/10 px-3 py-2 border border-[#f59e22]/25 rounded-md">
            {t.home.badgeMobile}
          </span>
          <span className="bg-[#2aa6c8]/10 px-3 py-2 border border-[#2aa6c8]/25 rounded-md">
            {t.home.badgeTables}
          </span>
          <span className="bg-[#f7e7ad]/10 px-3 py-2 border border-[#f7e7ad]/20 rounded-md">
            {t.home.badgeLive}
          </span>
        </div>
      </section>
    </main>
  );
}
