"use client";

import { useEffect, useState } from "react";

type GameSummary = {
  id: string;
  code: string;
};

export default function GamesList() {
  const [games, setGames] = useState<GameSummary[]>([]);

  useEffect(() => {
    async function load() {
      const response = await fetch("/api/games");
      const data = (await response.json()) as { games?: GameSummary[] };
      setGames(data.games || []);
    }

    load();
  }, []);

  return (
    <div>
      {games.map((g) => (
        <div key={g.id}>{g.code}</div>
      ))}
    </div>
  );
}
