import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getAuthedUser } from "@/lib/supabaseServer";
import type { BaseGameState } from "@/app/types/gameTypes";

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 5;
const MAX_CODE_ATTEMPTS = 5;

function generateCode() {
  return Array.from(
    { length: CODE_LENGTH },
    () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)],
  ).join("");
}

// Öffentliche Lobby-Übersicht - der Code (= PIN) wird nur an den Ersteller
// selbst herausgegeben (per clientId-Abgleich mit dem gespeicherten hostId).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId")?.trim() || null;

  const { data, error } = await getSupabaseAdmin()
    .from("games")
    .select("id, code, created_at, expires_at, state")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const lobbies = (data ?? [])
    .map((row) => ({ ...row, state: row.state as BaseGameState }))
    .filter((row) => row.state?.deviceMode === "multi")
    .map((row) => {
      const isMine = !!clientId && row.state.hostId === clientId;

      return {
        id: row.id,
        name: row.state.lobbyName?.trim() || null,
        gameType: row.state.gameType ?? "wizard",
        phase: row.state.phase ?? "playing",
        playerCount: row.state.playerCount ?? row.state.players?.length ?? 0,
        claimedCount: (row.state.players ?? []).filter((p) => p?.claimedBy)
          .length,
        createdAt: row.created_at,
        isMine,
        code: isMine ? (row.code as string) : null,
      };
    })
    // Eigene Lobbies zuerst, sonst bleibt die Reihenfolge nach Erstellzeit.
    .sort((left, right) => Number(right.isMine) - Number(left.isMine));

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

  const { state } = body as { state?: unknown };

  if (!state || typeof state !== "object") {
    return NextResponse.json({ error: "Missing state." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  // Eingeloggten Nutzer serverseitig aus den Request-Cookies ermitteln (nie
  // einer vom Client mitgeschickten ID vertrauen) - rein additiv, das
  // bestehende clientId/hostId-Schreibrechte-Modell bleibt unverändert.
  const user = await getAuthedUser();

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const { data, error } = await supabase
      .from("games")
      .insert({ code: generateCode(), state, user_id: user?.id ?? null })
      .select()
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
