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
      "Vorhersagen, Stiche und Punkte für jede Runde schnell eintragen.",
  },
  {
    title: "Dooomlings",
    status: "Bald",
    href: "/doomlings",
    enabled: false,
    accent: "from-[#2aa6c8] to-[#f59e22]",
    description:
      "Score-Hilfe für Evolution, Eigenschaften und das letzte Zeitalter.",
  },
  {
    title: "Binokel",
    status: "Bald",
    href: "/binokel",
    enabled: false,
    accent: "from-[#34d399 ] to-[#10b981]",
    description:
      "Score-Hilfe, Regeln und Meldbilder für altes schwäbisches Kartenspiel.",
  },
];

export default function Home() {
  const router = useRouter();

  return (
    <main className="bg-[#101820] min-h-screen text-[#fff4c7]">
      <section className="flex flex-col mx-auto px-4 sm:px-6 lg:px-8 py-5 w-full max-w-6xl min-h-screen">
        <header className="flex justify-between items-center gap-3">
          <div>
            <p className="font-semibold text-[#f59e22] text-xs uppercase tracking-[0.18em]">
              ScoreForge
            </p>
            <h1 className="mt-1 font-black text-3xl sm:text-5xl">
              Spielpunkte ohne Zettelchaos.
            </h1>
          </div>
          <Image
            src="/Logo.png"
            alt="ScoreForge Logo"
            width={88}
            height={88}
            priority
            loading="eager"
            className="shadow-[0_0_28px_rgba(245,158,34,0.28)] border border-[#f59e22]/40 rounded-lg w-16 sm:w-20 h-16 sm:h-20 object-cover"
          />
        </header>

        <div className="lg:items-end gap-4 grid lg:grid-cols-[1.05fr_0.95fr] mt-7">
          <div>
            <div className="sm:hidden bg-[#18262f] shadow-[0_18px_50px_rgba(0,0,0,0.25)] mb-5 p-2 border border-[#f59e22]/25 rounded-lg overflow-hidden">
              <Image
                src="/Logo.png"
                alt=""
                width={1024}
                height={1024}
                className="rounded-md w-full object-cover"
                loading="eager"
              />
            </div>
            <p className="max-w-2xl text-[#d8d3bd] text-base sm:text-lg leading-7">
              Eine mobile-freundliche Punkte-App fuer Brett- und Kartenspiele.
              Starte eine Runde, lege Spieler mit Farbe an und lass ScoreForge
              Vorhersagen, Stiche und Platzierungen sauber mitrechnen.
            </p>
            <div className="flex flex-wrap gap-2 mt-5 text-[#f7e7ad] text-sm">
              <span className="bg-[#f59e22]/10 px-3 py-2 border border-[#f59e22]/25 rounded-md">
                Mobile zuerst
              </span>
              <span className="bg-[#2aa6c8]/10 px-3 py-2 border border-[#2aa6c8]/25 rounded-md">
                PC-taugliche Tabellen
              </span>
              <span className="bg-[#f7e7ad]/10 px-3 py-2 border border-[#f7e7ad]/20 rounded-md">
                Lokale Spielrunde
              </span>
            </div>
          </div>

          <div className="bg-[#14222b]/90 shadow-[0_18px_50px_rgba(0,0,0,0.22)] p-4 border border-[#f59e22]/20 rounded-lg">
            <p className="font-semibold text-[#9fc9d5] text-sm uppercase tracking-[0.16em]">
              Schnelle Spielübersicht
            </p>
            <div className="gap-3 grid sm:grid-cols-2 lg:grid-cols-1 mt-4">
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
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <h2 className="font-black text-xl">{game.title}</h2>
                      <p className="mt-2 text-[#d8d3bd] text-sm leading-6">
                        {game.description}
                      </p>
                    </div>
                    <span className="bg-[#f7e7ad] px-2 py-1 rounded-md font-bold text-[#101820] text-xs">
                      {game.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex sm:flex-row flex-col gap-2 mt-auto pt-8">
          <button
            onClick={() => router.push("/wizard/setup")}
            className="bg-[#f59e22] hover:bg-[#ffb13d] shadow-[0_0_28px_rgba(245,158,34,0.24)] px-5 py-4 rounded-lg w-full sm:w-auto font-black text-[#101820] text-base transition"
            type="button"
          >
            Wizard starten
          </button>
          <button
            onClick={() => router.push("/wizard/join")}
            className="hover:bg-[#2aa6c8]/10 px-5 py-4 border border-[#2aa6c8]/40 rounded-lg w-full sm:w-auto font-black text-[#9fc9d5] text-base transition"
            type="button"
          >
            Lobby beitreten
          </button>
        </div>
      </section>
    </main>
  );
}
