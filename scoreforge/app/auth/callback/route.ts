import { NextResponse } from "next/server";

import { getSupabaseServer } from "@/lib/supabaseServer";

// Nimmt den PKCE-Code entgegen, den Supabase nach OAuth-Login (Google/Apple)
// oder einem E-Mail-Link (Bestätigung, Passwort-Reset) anhängt, tauscht ihn
// gegen eine Session und leitet weiter.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/account";

  if (code) {
    const supabase = await getSupabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
