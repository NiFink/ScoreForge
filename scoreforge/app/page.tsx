"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

const games = [
  {
    title: "Wizard",
    status: "Spielbereit",
    href: "/wizard/setup",
    enabled: true,
    accent: "from-[#f59e22] to-[#f7e7ad]",
    description:
      "Vorhersagen, Stiche und Punkte fuer jede Runde schnell eintragen.",
  },
  {
    title: "Dooomlings",
    status: "Bald",
    href: "/doomlings",
    enabled: false,
    accent: "from-[#2aa6c8] to-[#f59e22]",
    description:
      "Score-Hilfe fuer Evolution, Eigenschaften und das letzte Zeitalter.",
  },
];

export default function Home() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-[#101820] text-[#fff4c7]">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f59e22]">
              ScoreForge
            </p>
            <h1 className="mt-1 text-3xl font-black sm:text-5xl">
              Spielpunkte ohne Zettelchaos.
            </h1>
          </div>
          <Image
            src="/Logo.png"
            alt="ScoreForge Logo"
            width={88}
            height={88}
            priority
            className="h-16 w-16 rounded-lg border border-[#f59e22]/40 object-cover shadow-[0_0_28px_rgba(245,158,34,0.28)] sm:h-20 sm:w-20"
          />
        </header>

        <div className="mt-7 grid gap-4 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div>
            <div className="mb-5 overflow-hidden rounded-lg border border-[#f59e22]/25 bg-[#18262f] p-2 shadow-[0_18px_50px_rgba(0,0,0,0.25)] sm:hidden">
              <Image
                src="/Logo.png"
                alt=""
                width={1024}
                height={1024}
                className="aspect-[16/10] w-full rounded-md object-cover"
              />
            </div>
            <p className="max-w-2xl text-base leading-7 text-[#d8d3bd] sm:text-lg">
              Eine mobile-freundliche Punkte-App fuer Brett- und Kartenspiele.
              Starte eine Runde, lege Spieler mit Farbe an und lass ScoreForge
              Vorhersagen, Stiche und Platzierungen sauber mitrechnen.
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-sm text-[#f7e7ad]">
              <span className="rounded-md border border-[#f59e22]/25 bg-[#f59e22]/10 px-3 py-2">
                Mobile zuerst
              </span>
              <span className="rounded-md border border-[#2aa6c8]/25 bg-[#2aa6c8]/10 px-3 py-2">
                PC-taugliche Tabellen
              </span>
              <span className="rounded-md border border-[#f7e7ad]/20 bg-[#f7e7ad]/10 px-3 py-2">
                Lokale Spielrunde
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-[#f59e22]/20 bg-[#14222b]/90 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#9fc9d5]">
              Schnelle Spieluebersicht
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {games.map((game) => (
                <button
                  key={game.title}
                  onClick={() => {
                    if (game.enabled) {
                      router.push(game.href);
                    }
                  }}
                  className={`group rounded-lg border border-[#f7e7ad]/10 bg-[#18262f] p-4 text-left transition ${
                    game.enabled
                      ? "hover:-translate-y-0.5 hover:border-[#f59e22]/45"
                      : "cursor-not-allowed opacity-75"
                  }`}
                  disabled={!game.enabled}
                  type="button"
                >
                  <div
                    className={`mb-4 h-1.5 rounded-full bg-gradient-to-r ${game.accent}`}
                  />
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-black">{game.title}</h2>
                      <p className="mt-2 text-sm leading-6 text-[#d8d3bd]">
                        {game.description}
                      </p>
                    </div>
                    <span className="rounded-md bg-[#f7e7ad] px-2 py-1 text-xs font-bold text-[#101820]">
                      {game.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-auto pt-8">
          <button
            onClick={() => router.push("/wizard/setup")}
            className="w-full rounded-lg bg-[#f59e22] px-5 py-4 text-base font-black text-[#101820] shadow-[0_0_28px_rgba(245,158,34,0.24)] transition hover:bg-[#ffb13d] sm:w-auto"
            type="button"
          >
            Wizard starten
          </button>
        </div>
      </section>
    </main>
  );
}
