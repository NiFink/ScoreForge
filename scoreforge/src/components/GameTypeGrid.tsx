"use client";

import { useRouter } from "next/navigation";

import { useI18n } from "@/lib/i18n";
import { gameThemes } from "@/lib/gameThemes";

export function GameTypeGrid() {
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
    {
      title: "Universal",
      href: "/universal/setup",
      theme: gameThemes.universal,
      description: t.home.universalDescription,
    },
  ];

  return (
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
  );
}
