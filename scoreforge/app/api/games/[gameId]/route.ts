import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { BaseGameState } from "@/app/types/gameTypes";

type RouteParams = { params: Promise<{ gameId: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { gameId } = await params;

  const { data, error } = await getSupabaseAdmin()
    .from("games")
    .select("*")
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

  const { state, clientId, finished } = body as {
    state?: BaseGameState;
    clientId?: string;
    finished?: boolean;
  };

  if (!state || typeof state !== "object" || !clientId) {
    return NextResponse.json(
      { error: "Missing state or clientId." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();

  const { data: existing, error: fetchError } = await supabase
    .from("games")
    .select("state, expires_at")
    .eq("id", gameId)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Game not found." }, { status: 404 });
  }

  const currentState = existing.state as BaseGameState;

  if (currentState.writeMode === "host" && clientId !== currentState.hostId) {
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

  const { data, error } = await supabase
    .from("games")
    .update(update)
    .eq("id", gameId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ game: data });
}

// Nur der Host darf das Spiel + die Lobby endgültig löschen.
export async function DELETE(request: Request, { params }: RouteParams) {
  const { gameId } = await params;
  const body = await request.json().catch(() => null);
  const { clientId } = (body ?? {}) as { clientId?: string };

  if (!clientId) {
    return NextResponse.json({ error: "Missing clientId." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data: existing, error: fetchError } = await supabase
    .from("games")
    .select("state")
    .eq("id", gameId)
    .maybeSingle();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Game not found." }, { status: 404 });
  }

  const currentState = existing.state as BaseGameState;

  if (clientId !== currentState.hostId) {
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
