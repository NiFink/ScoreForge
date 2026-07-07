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

  const { code } = body as { code?: string };
  const normalizedCode = code?.trim().toUpperCase();

  if (!normalizedCode) {
    return NextResponse.json({ error: "Missing code." }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("games")
    .select("*")
    .eq("code", normalizedCode)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json(
      { error: "Kein Spiel mit diesem Code gefunden." },
      { status: 404 },
    );
  }

  return NextResponse.json({ game: data });
}
