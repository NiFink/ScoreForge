import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getAuthedUser } from "@/lib/supabase/server";
import { GAME_CLIENT_COLUMNS, isStateWithinLimit } from "@/lib/games/records";
import { hashHostSecret } from "@/lib/games/hostAuth";
import type { BaseGameState } from "@/types/gameTypes";

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 5;
const MAX_CODE_ATTEMPTS = 5;

function generateCode() {
  return Array.from(
    { length: CODE_LENGTH },
    () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)],
  ).join("");
}

// Öffentliche Lobby-Übersicht. Bewusst OHNE `code` und ohne "isMine": der PIN
// wird nicht mehr über die Liste herausgegeben (sonst könnte man ihn für jede
// gelistete Lobby abgreifen). Ob eine Lobby dem Betrachter gehört und wie ihr
// Code lautet, weiß der Client selbst aus seinem lokalen Host-Store
// (lib/games/hostSession) - siehe join/page.tsx.
export async function GET() {
  const { data, error } = await getSupabaseAdmin()
    .from("games")
    // kein `code`: die Liste ist öffentlich, der PIN darf hier nicht auftauchen
    .select("id, created_at, state")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const lobbies = (data ?? [])
    .map((row) => ({ ...row, state: row.state as BaseGameState }))
    .filter((row) => row.state?.deviceMode === "multi")
    .map((row) => ({
      id: row.id,
      name: row.state.lobbyName?.trim() || null,
      gameType: row.state.gameType ?? "wizard",
      phase: row.state.phase ?? "playing",
      playerCount: row.state.playerCount ?? row.state.players?.length ?? 0,
      claimedCount: (row.state.players ?? []).filter((p) => p?.claimedBy).length,
      createdAt: row.created_at,
    }));

  return NextResponse.json({ lobbies });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const { state, hostSecret } = body as {
    state?: unknown;
    hostSecret?: string;
  };

  if (!state || typeof state !== "object") {
    return NextResponse.json({ error: "Missing state." }, { status: 400 });
  }

  // Größenlimit (Service-Role umgeht RLS, siehe records.ts).
  if (!isStateWithinLimit(state)) {
    return NextResponse.json({ error: "State too large." }, { status: 413 });
  }

  const supabase = getSupabaseAdmin();
  // Eingeloggten Nutzer serverseitig aus den Request-Cookies ermitteln (nie
  // einer vom Client mitgeschickten ID vertrauen).
  const user = await getAuthedUser();

  // Nur den Hash des Host-Geheimnisses speichern (siehe hostAuth) - das
  // Rohgeheimnis behält allein der Ersteller lokal.
  const hostSecretHash =
    typeof hostSecret === "string" && hostSecret
      ? await hashHostSecret(hostSecret)
      : null;

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const { data, error } = await supabase
      .from("games")
      .insert({
        code: generateCode(),
        state,
        user_id: user?.id ?? null,
        host_secret_hash: hostSecretHash,
      })
      // Kein user_id/host_secret_hash im Response (GAME_CLIENT_COLUMNS).
      .select(GAME_CLIENT_COLUMNS)
      .single();

    if (!error) {
      return NextResponse.json({ game: data }, { status: 201 });
    }

    // 23505 = unique_violation: der Code existiert schon, neuen Code versuchen
    if (error.code !== "23505") {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json(
    { error: "Could not generate a unique game code." },
    { status: 500 },
  );
}
