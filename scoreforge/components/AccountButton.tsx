"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useI18n } from "@/lib/i18n";
import { supabase } from "@/lib/supabaseClient";

export function AccountButton() {
  const { t } = useI18n();
  // undefined = noch am Laden, null = ausgeloggt, string = E-Mail
  const [email, setEmail] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) {
        setEmail(data.user?.email ?? null);
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setEmail(session?.user?.email ?? null);
      },
    );

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  if (email === undefined) {
    return <div className="w-9 h-9" />;
  }

  if (!email) {
    return (
      <Link
        href="/login"
        className="px-3 py-2 border border-[#f7e7ad]/15 rounded-md text-[#d8d3bd] text-sm"
      >
        {t.auth.login}
      </Link>
    );
  }

  return (
    <Link
      href="/account"
      title={email}
      className="flex justify-center items-center bg-[#f59e22] rounded-full w-9 h-9 font-black text-[#101820] text-sm"
    >
      {email.charAt(0).toUpperCase()}
    </Link>
  );
}
