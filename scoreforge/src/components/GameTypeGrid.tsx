"use client";

import { useRouter } from "next/navigation";

import { useI18n } from "@/lib/i18n";
import { gameThemes } from "@/lib/gameThemes";

// "scoreboard" = Spiele mit Punkte-/Wertungsboard, "party" = gesellige
// Partyspiele ohne mitlaufende Punktetabelle.
export type GameCategory = "scoreboard" | "party";

export function GameTypeGrid({ category }: { category?: GameCategory } = {}) {
  const router = useRouter();
  const { t } = useI18n();

  const games = [
    {
      title: "Wizard",
      href: "/wizard/setup",
      theme: gameThemes.wizard,
      description: t.home.wizardDescription,
      category: "scoreboard" as GameCategory,
    },
    {
      title: "Doomlings",
      href: "/doomlings/setup",
      theme: gameThemes.doomlings,
      description: t.home.doomlingsDescription,
      category: "scoreboard" as GameCategory,
    },
    {
      title: "Binokel",
      href: "/binokel/setup",
      theme: gameThemes.binokel,
      description: t.home.binokelDescription,
      category: "scoreboard" as GameCategory,
    },
    {
      title: "Universal",
      href: "/universal/setup",
      theme: gameThemes.universal,
      description: t.home.universalDescription,
      category: "scoreboard" as GameCategory,
    },
    {
      title: "Kniffel",
      href: "/kniffel/setup",
      theme: gameThemes.kniffel,
      description: t.home.kniffelDescription,
      category: "scoreboard" as GameCategory,
    },
    {
      title: "Mäxle",
      href: "/maexle/setup",
      theme: gameThemes.maexle,
      description: t.home.maexleDescription,
      category: "scoreboard" as GameCategory,
    },
    {
      title: "Imposter",
      href: "/imposter/setup",
      theme: gameThemes.imposter,
      description: t.home.imposterDescription,
      category: "party" as GameCategory,
    },
    {
      title: t.whoAmI.tag,
      href: "/whoAmI/setup",
      theme: gameThemes.whoAmI,
      description: t.home.whoAmIDescription,
      category: "party" as GameCategory,
    },
  ];

  const shownGames = category
    ? games.filter((game) => game.category === category)
    : games;

  return (
    <div className="gap-4 grid md:grid-cols-3 mt-4">
      {shownGames.map((game) => (
        <button
          key={game.title}
          onClick={() => router.push(game.href)}
          style={game.theme.style}
          className="group flex flex-col bg-(--sf-surface-2)/90 hover:shadow-[0_18px_50px_rgba(0,0,0,0.35)] p-5 border border-(--accent)/25 hover:border-(--accent)/60 rounded-xl text-left transition hover:-translate-y-1"
          type="button"
        >
          <div className={`h-2 rounded-full ${game.theme.gradient}`} />
          <h3 className="mt-4 font-black text-(--accent) text-2xl">
            {game.title}
          </h3>
          <p className="mt-2 text-(--sf-text-muted) text-sm leading-6">
            {game.description}
          </p>
          <span className="inline-block bg-(--accent) group-hover:brightness-110 mt-5 px-4 py-3 rounded-lg font-black text-(--on-accent) text-sm text-center">
            {t.home.playNow}
          </span>
        </button>
      ))}
    </div>
  );
}
