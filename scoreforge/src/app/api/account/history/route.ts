import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getAuthedUser } from "@/lib/supabase/server";
import type { GameHistoryEntry, GameType } from "@/types/gameTypes";

// Dauerhafte Spiel-Historie des eingeloggten Nutzers (game_results-Tabelle).
// Nur für Konten: ohne verifizierten Nutzer gibt es hier nichts. Die Tabelle
// ist per RLS für den öffentlichen Client gesperrt; gelesen wird ausschließlich
// über den Service-Role-Client, streng nach user_id gefiltert.
export async function GET() {
  const user = await getAuthedUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("game_results")
    .select("id, game_type, lobby_name, winner, players, finished_at")
    .eq("user_id", user.id)
    .order("finished_at", { ascending: false })
    .limit(30);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const history: GameHistoryEntry[] = (data ?? []).map((row) => ({
    id: row.id as string,
    gameType: row.game_type as GameType,
    lobbyName: (row.lobby_name as string | null) ?? null,
    winner: (row.winner as string | null) ?? null,
    players: Array.isArray(row.players) ? (row.players as string[]) : [],
    finishedAt: row.finished_at as string,
  }));

  return NextResponse.json(
    { history },
    { headers: { "Cache-Control": "no-store" } },
  );
}
