import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { getSupabaseServer } from "@/lib/supabase/server";

// Nur interne Pfade als Redirect-Ziel zulassen. Verhindert Open-Redirect
// über ?next=//evil.com oder ?next=/\evil.com (protokoll-relative URLs).
function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return "/account";
  }
  return next;
}

// Nimmt den Bestätigungs-Link entgegen (Signup, Passwort-Reset, künftig OAuth)
// und tauscht ihn gegen eine Session.
//
// Zwei Verfahren, je nachdem was Supabase im Link mitschickt:
//  - token_hash + type (E-Mail-Links): über verifyOtp geprüft. WICHTIG: das
//    ist der richtige Weg für Signup-Bestätigung/Passwort-Reset, weil diese
//    Links so gut wie nie im selben Browser geöffnet werden, der die Anfrage
//    gestellt hat (z. B. Mail-App auf dem Handy statt Desktop-Browser).
//    verifyOtp braucht keinen lokal gespeicherten Zustand.
//  - code (PKCE, z. B. künftiger OAuth-Login): über exchangeCodeForSession
//    geprüft. Das setzt voraus, dass derselbe Browser die Anfrage gestellt
//    hat, der auch den Link öffnet (dort liegt der PKCE-Code-Verifier-Cookie) -
//    für einen In-Browser-Redirect wie OAuth passt das, für E-Mail-Links NICHT.
//
// Für token_hash+type muss das jeweilige Supabase-Dashboard-E-Mail-Template
// den Link entsprechend bauen (siehe supabase/setup.sql, Abschnitt "E-Mail-
// Templates" unten im Kommentarblock).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  const supabase = await getSupabaseServer();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (!error) {
      // Passwort-Reset landet immer auf der "neues Passwort setzen"-Seite,
      // unabhängig vom next-Parameter - der Nutzer kam über den Reset-Link.
      const destination = type === "recovery" ? "/auth/reset-password" : next;
      return NextResponse.redirect(`${origin}${destination}`);
    }
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
