import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { GameState } from "@/app/types/wizardTypes";

type RouteParams = { params: Promise<{ gameId: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { gameId } = await params;

  const { data, error } = await getSupabaseAdmin()
    .from("games")
    .select("*")
    .eq("id", gameId)
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

  const { state, clientId } = body as {
    state?: GameState;
    clientId?: string;
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
    .select("state")
    .eq("id", gameId)
    .maybeSingle();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Game not found." }, { status: 404 });
  }

  const currentState = existing.state as GameState;

  if (
    currentState.writeMode === "host" &&
    clientId !== currentState.hostId
  ) {
    return NextResponse.json(
      { error: "Only the host can update this game." },
      { status: 403 },
    );
  }

  const { data, error } = await supabase
    .from("games")
    .update({ state })
    .eq("id", gameId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ game: data });
}
