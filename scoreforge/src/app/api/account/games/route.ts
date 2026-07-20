import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getAuthedUser } from "@/lib/supabase/server";
import { computeGameStats } from "@/lib/stats/gameStats";
import type { AccountGameSummary, BaseGameState } from "@/types/gameTypes";

// Liste der Spiele des eingeloggten Nutzers (geräteübergreifend, per
// user_id) - für den Konto-Bereich. user_id ist über die public-read-Policy
// bewusst NICHT für anon/authenticated lesbar (siehe supabase/setup.sql,
// Abschnitt 6) - sonst könnte jeder mit dem öffentlichen anon-Key die Spiele
// eines Kontos korrelieren. Deshalb hier der Admin-Client (Service-Role);
// die Autorisierung passiert weiterhin über den verifizierten Nutzer aus
// den Request-Cookies, nicht über RLS.
export async function GET() {
  const user = await getAuthedUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("games")
    .select("id, created_at, state")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const games: AccountGameSummary[] = (data ?? []).map((row) => {
    const state = row.state as BaseGameState;
    // Defensiv: ältere/unvollständige Spielstände sollen die ganze Liste
    // nicht zum Absturz bringen, wenn die Stats-Berechnung damit stolpert.
    let stats: { finished: boolean; topScore: number | null };

    try {
      stats = computeGameStats(state.gameType, state);
    } catch {
      stats = { finished: false, topScore: null };
    }

    return {
      id: row.id as string,
      gameType: state.gameType ?? "wizard",
      phase: state.phase ?? "playing",
      lobbyName: state.lobbyName?.trim() || null,
      playerCount: state.playerCount ?? state.players?.length ?? 0,
      createdAt: row.created_at as string,
      finished: stats.finished,
      topScore: stats.topScore,
    };
  });

  return NextResponse.json({ games });
}
