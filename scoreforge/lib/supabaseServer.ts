import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Cookie-gebundener Supabase-Client für Route Handler & Server Components.
// Immer neu erzeugen (nie global cachen) - Session hängt am Request.
export async function getSupabaseServer(): Promise<SupabaseClient> {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables.");
  }

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Wird von einer Server Component (kein Route Handler) aufgerufen,
          // dort sind Cookies nicht schreibbar - die Middleware kümmert sich
          // in dem Fall ums Auffrischen der Session.
        }
      },
    },
  });
}

// Verifizierter Nutzer (fragt den Auth-Server ab, im Gegensatz zu
// getSession()) - sicher für Autorisierungs-Entscheidungen.
export async function getAuthedUser() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}
