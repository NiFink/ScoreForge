import { NextResponse } from "next/server";

import { getSupabaseServer } from "@/lib/supabase/server";

// Nimmt den PKCE-Code entgegen, den Supabase nach OAuth-Login (Google/Apple)
// oder einem E-Mail-Link (Bestätigung, Passwort-Reset) anhängt, tauscht ihn
// gegen eine Session und leitet weiter.
// Nur interne Pfade als Redirect-Ziel zulassen. Verhindert Open-Redirect
// über ?next=//evil.com oder ?next=/\evil.com (protokoll-relative URLs).
function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return "/account";
  }
  return next;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await getSupabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
