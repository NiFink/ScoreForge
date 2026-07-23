import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getAuthedUser } from "@/lib/supabase/server";
import { GAME_CLIENT_COLUMNS, isStateWithinLimit } from "@/lib/games/records";
import { isHostAuthorized } from "@/lib/games/hostAuth";
import { resolveGameResult } from "@/lib/stats/gameStats";
import type { BaseGameState } from "@/types/gameTypes";

type RouteParams = { params: Promise<{ gameId: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { gameId } = await params;

  // user_id zusätzlich laden, um "isOwner" zu bestimmen - wird unten aus der
  // Antwort entfernt und NIE an den Client durchgereicht (siehe records.ts).
  const { data, error } = await getSupabaseAdmin()
    .from("games")
    .select(`${GAME_CLIENT_COLUMNS}, user_id`)
    .eq("id", gameId)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Game not found." }, { status: 404 });
  }

  const { user_id, ...game } = data as typeof data & {
    user_id: string | null;
  };
  // Eingeloggtes Konto, das dieses Spiel erstellt hat -> Host-Rechte auch auf
  // einem neuen Gerät (siehe hostAuth). Der reine Boolean geht an den Client,
  // die user_id selbst nie.
  const user = await getAuthedUser();
  const isOwner = !!user && !!user_id && user.id === user_id;

  return NextResponse.json({ game, isOwner });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { gameId } = await params;
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const { state, clientId, finished, paused, hostSecret } = body as {
    state?: BaseGameState;
    clientId?: string;
    finished?: boolean;
    paused?: boolean;
    hostSecret?: string;
  };

  if (!state || typeof state !== "object" || !clientId) {
    return NextResponse.json(
      { error: "Missing state or clientId." },
      { status: 400 },
    );
  }

  // Größenlimit: der Service-Role-Client umgeht RLS, ohne Cap könnte hier
  // beliebig große Payload geschrieben werden.
  if (!isStateWithinLimit(state)) {
    return NextResponse.json({ error: "State too large." }, { status: 413 });
  }

  const supabase = getSupabaseAdmin();

  const { data: existing, error: fetchError } = await supabase
    .from("games")
    .select("state, expires_at, host_secret_hash, user_id")
    .eq("id", gameId)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Game not found." }, { status: 404 });
  }

  const currentState = existing.state as BaseGameState;
  const user = await getAuthedUser();
  const isOwner = !!user && !!existing.user_id && user.id === existing.user_id;

  // Im "host"-Modus dürfen nur Host-Aktionen den Spielstand ändern. Die
  // Berechtigung hängt am Host-Geheimnis (Hash-Abgleich) ODER am eingeloggten
  // Ersteller-Konto (geräteunabhängig) - NICHT mehr an der öffentlich lesbaren
  // hostId - siehe hostAuth. (Legacy-Fallback inklusive.)
  if (
    currentState.writeMode === "host" &&
    !(await isHostAuthorized(
      existing.host_secret_hash as string | null,
      hostSecret,
      currentState.hostId,
      clientId,
      isOwner,
    ))
  ) {
    return NextResponse.json(
      { error: "Only the host can update this game." },
      { status: 403 },
    );
  }

  const update: { state: BaseGameState; expires_at?: string } = { state };

  // Fertige Spiele bleiben nur noch 1 Stunde sichtbar
  if (finished === true) {
    const oneHour = new Date(Date.now() + 60 * 60 * 1000);
    const current = new Date(existing.expires_at as string);

    if (oneHour < current) {
      update.expires_at = oneHour.toISOString();
    }
  }

  // Pausierte Spiele bleiben 30 statt 2 Tage erhalten, damit sie später
  // einfach weitergespielt werden können, ohne zwischendurch zu verfallen.
  if (paused === true) {
    const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const current = new Date(
      update.expires_at ?? (existing.expires_at as string),
    );

    if (thirtyDays > current) {
      update.expires_at = thirtyDays.toISOString();
    }
  }

  const { data, error } = await supabase
    .from("games")
    .update(update)
    .eq("id", gameId)
    .select(GAME_CLIENT_COLUMNS)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Dauerhafte Historie NUR für Spiele eines eingeloggten Kontos (user_id
  // gesetzt). Beim ersten Mal, wenn das Spiel beendet ist, wird ein kleiner
  // Ergebnis-Eintrag abgelegt; `ignoreDuplicates` verhindert dank
  // unique(user_id, game_id) Mehrfacheinträge bei weiteren "fertig"-Patches.
  // Best-effort: ein Fehler hier darf den erfolgreichen Spielstand-Save nicht
  // umwerfen.
  if (existing.user_id) {
    try {
      const result = resolveGameResult(state.gameType, state);
      if (result.finished) {
        await supabase.from("game_results").upsert(
          {
            user_id: existing.user_id,
            game_id: gameId,
            game_type: state.gameType ?? "unknown",
            lobby_name: state.lobbyName?.trim() || null,
            winner: result.winner,
            players: result.players,
            finished_at: new Date().toISOString(),
          },
          { onConflict: "user_id,game_id", ignoreDuplicates: true },
        );
      }
    } catch (err) {
      console.error("Failed to record game result", err);
    }
  }

  return NextResponse.json({ game: data });
}

// Nur der Host darf das Spiel + die Lobby endgültig löschen (Host-Geheimnis
// oder eingeloggtes Ersteller-Konto, mit Legacy-Fallback auf clientId/hostId -
// siehe hostAuth).
export async function DELETE(request: Request, { params }: RouteParams) {
  const { gameId } = await params;
  const body = await request.json().catch(() => null);
  const { clientId, hostSecret } = (body ?? {}) as {
    clientId?: string;
    hostSecret?: string;
  };

  if (!clientId && !hostSecret) {
    return NextResponse.json(
      { error: "Missing host credentials." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();

  const { data: existing, error: fetchError } = await supabase
    .from("games")
    .select("state, host_secret_hash, user_id")
    .eq("id", gameId)
    .maybeSingle();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Game not found." }, { status: 404 });
  }

  const currentState = existing.state as BaseGameState;
  const user = await getAuthedUser();
  const isOwner = !!user && !!existing.user_id && user.id === existing.user_id;

  if (
    !(await isHostAuthorized(
      existing.host_secret_hash as string | null,
      hostSecret,
      currentState.hostId,
      clientId,
      isOwner,
    ))
  ) {
    return NextResponse.json(
      { error: "Only the host can delete this game." },
      { status: 403 },
    );
  }

  const { error } = await supabase.from("games").delete().eq("id", gameId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
