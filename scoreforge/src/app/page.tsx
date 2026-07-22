"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AccountButton } from "@/components/AccountButton";
import { GameTypeGrid } from "@/components/GameTypeGrid";

export default function Home() {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <main className="bg-(--sf-bg) min-h-screen text-(--sf-text-strong)">
      <section className="flex flex-col mx-auto px-4 sm:px-6 lg:px-8 py-5 w-full max-w-6xl min-h-screen">
        {/* HERO */}
        <header className="flex flex-wrap justify-between items-center gap-x-4 gap-y-3">
          <div className="flex items-center gap-3 min-w-0">
            <Image
              src="/Logo.png"
              alt="ScoreForge Logo"
              width={88}
              height={88}
              priority
              loading="eager"
              className="shadow-[0_0_28px_rgba(245,158,34,0.28)] border border-[#f59e22]/40 rounded-lg w-14 sm:w-16 h-14 sm:h-16 object-cover"
            />
            <div className="min-w-0">
              <p className="font-semibold text-[#f59e22] text-xs uppercase tracking-[0.18em]">
                {t.home.brand}
              </p>
              <h1 className="mt-1 font-black text-2xl sm:text-4xl">
                {t.home.title}
              </h1>
            </div>
          </div>
          <div className="flex flex-none items-center gap-2">
            <AccountButton />
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </header>

        <p className="mt-4 max-w-2xl text-(--sf-text-muted) text-base leading-7">
          {t.home.description}
        </p>

        {/* SCOREBOARDS */}
        <h2 className="mt-8 font-black text-(--sf-text) text-xl sm:text-2xl">
          {t.home.scoreboardsTitle}
        </h2>

        <GameTypeGrid category="scoreboard" />

        {/* SPIELE */}
        <h2 className="mt-10 font-black text-(--sf-text) text-xl sm:text-2xl">
          {t.home.partyGamesTitle}
        </h2>

        <GameTypeGrid category="party" />

        {/* JOIN */}
        <div className="bg-(--sf-surface-2)/90 mt-6 p-5 border border-[#2aa6c8]/30 rounded-xl">
          <div className="flex sm:flex-row flex-col sm:justify-between sm:items-center gap-3">
            <div>
              <h2 className="font-black text-xl">{t.home.joinTitle}</h2>
              <p className="mt-1 text-(--sf-text-muted) text-sm">{t.home.joinHint}</p>
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
      </section>
    </main>
  );
}
