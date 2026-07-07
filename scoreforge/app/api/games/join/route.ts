import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const { code, gameId } = body as { code?: string; gameId?: string };
  const normalizedCode = code?.trim().toUpperCase();

  if (!normalizedCode) {
    return NextResponse.json({ error: "Missing code." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const nowIso = new Date().toISOString();

  // Aus der Lobby-Liste gewählt: der PIN muss zur gewählten Lobby passen
  if (gameId) {
    const { data, error } = await supabase
      .from("games")
      .select("*")
      .eq("id", gameId)
      .gt("expires_at", nowIso)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: "Game not found." }, { status: 404 });
    }

    if ((data.code as string)?.toUpperCase() !== normalizedCode) {
      return NextResponse.json({ error: "Wrong PIN." }, { status: 403 });
    }

    return NextResponse.json({ game: data });
  }

  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("code", normalizedCode)
    .gt("expires_at", nowIso)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Game not found." }, { status: 404 });
  }

  return NextResponse.json({ game: data });
}
