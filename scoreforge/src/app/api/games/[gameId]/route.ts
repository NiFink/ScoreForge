import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { GAME_CLIENT_COLUMNS, isStateWithinLimit } from "@/lib/games/records";
import { isHostAuthorized } from "@/lib/games/hostAuth";
import type { BaseGameState } from "@/types/gameTypes";

type RouteParams = { params: Promise<{ gameId: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { gameId } = await params;

  // GAME_CLIENT_COLUMNS statt "*": gibt bewusst kein user_id an den Client.
  const { data, error } = await getSupabaseAdmin()
    .from("games")
    .select(GAME_CLIENT_COLUMNS)
    .eq("id", gameId)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Game not found." }, { status: 404 });
  }

  return NextResponse.json({ game: data });
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
    .select("state, expires_at, host_secret_hash")
    .eq("id", gameId)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Game not found." }, { status: 404 });
  }

  const currentState = existing.state as BaseGameState;

  // Im "host"-Modus dürfen nur Host-Aktionen den Spielstand ändern. Die
  // Berechtigung hängt am Host-Geheimnis (Hash-Abgleich), NICHT mehr an der
  // öffentlich lesbaren hostId - siehe hostAuth. (Legacy-Fallback inklusive.)
  if (
    currentState.writeMode === "host" &&
    !(await isHostAuthorized(
      existing.host_secret_hash as string | null,
      hostSecret,
      currentState.hostId,
      clientId,
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

  return NextResponse.json({ game: data });
}

// Nur der Host darf das Spiel + die Lobby endgültig löschen (Host-Geheimnis,
// mit Legacy-Fallback auf clientId/hostId - siehe hostAuth).
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
    .select("state, host_secret_hash")
    .eq("id", gameId)
    .maybeSingle();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Game not found." }, { status: 404 });
  }

  const currentState = existing.state as BaseGameState;

  if (
    !(await isHostAuthorized(
      existing.host_secret_hash as string | null,
      hostSecret,
      currentState.hostId,
      clientId,
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
