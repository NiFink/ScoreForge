import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 5;
const MAX_CODE_ATTEMPTS = 5;

function generateCode() {
  return Array.from(
    { length: CODE_LENGTH },
    () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)],
  ).join("");
}

export async function GET() {
  const { data, error } = await getSupabaseAdmin().from("games").select("*");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ games: data ?? [] });
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

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const { data, error } = await supabase
      .from("games")
      .insert({ code: generateCode(), state })
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
