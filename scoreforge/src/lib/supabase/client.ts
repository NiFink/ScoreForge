import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables.");
}

// Cookie-basierte Session (statt localStorage), damit Route Handler den
// eingeloggten Nutzer serverseitig aus den Request-Cookies lesen können.
export const supabase = createBrowserClient(supabaseUrl, supabaseKey);
