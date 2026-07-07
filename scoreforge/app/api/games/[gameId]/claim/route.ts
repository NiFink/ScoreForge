import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { GameState } from "@/app/types/wizardTypes";

type RouteParams = { params: Promise<{ gameId: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const { gameId } = await params;
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const { playerId, clientId, name } = body as {
    playerId?: string;
    clientId?: string;
    name?: string;
  };

  if (!playerId || !clientId) {
    return NextResponse.json(
      { error: "Missing playerId or clientId." },
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

  const state = existing.state as GameState;
  const target = state.players.find((player) => player.id === playerId);

  if (!target) {
    return NextResponse.json({ error: "Unknown player slot." }, { status: 400 });
  }

  if (target.claimedBy && target.claimedBy !== clientId) {
    return NextResponse.json(
      { error: "Dieser Platz ist bereits vergeben." },
      { status: 409 },
    );
  }

  const trimmedName = name?.trim();

  const nextState: GameState = {
    ...state,
    players: state.players.map((player) => {
      if (player.id === playerId) {
        return {
          ...player,
          claimedBy: clientId,
          name: trimmedName || player.name,
        };
      }

      // Ein Gerät kann nur einen Platz halten - alten Platz freigeben
      if (player.claimedBy === clientId) {
        return { ...player, claimedBy: null };
      }

      return player;
    }),
  };

  const { data, error } = await supabase
    .from("games")
    .update({ state: nextState })
    .eq("id", gameId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ game: data });
}
