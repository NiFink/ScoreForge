"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { useI18n } from "@/lib/i18n";
import { supabase } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { t } = useI18n();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Diese Seite wird nur über den Link aus der Reset-Mail erreicht - die
  // Recovery-Session ist zu dem Zeitpunkt bereits über /auth/callback gesetzt.
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError(t.auth.passwordTooShort);
      return;
    }

    if (password !== confirmPassword) {
      setError(t.auth.passwordsDontMatch);
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(t.auth.genericError);
        return;
      }

      setDone(true);
    } catch {
      setError(t.auth.genericError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="bg-(--sf-bg) px-4 py-5 min-h-screen text-(--sf-text-strong)">
      <div className="mx-auto max-w-md">
        <header className="flex items-center gap-4 mb-6">
          <Image
            src="/Logo.png"
            alt="ScoreForge Logo"
            width={64}
            height={64}
            className="border border-[#f59e22]/35 rounded-lg w-14 h-14 object-cover"
          />
          <h1 className="font-black text-3xl">
            {t.auth.resetPasswordTitle}
          </h1>
        </header>

        <section className="bg-(--sf-surface-2)/90 p-5 border border-[#f59e22]/20 rounded-lg">
          {done ? (
            <>
              <p className="text-[#2aa6c8] text-sm">
                {t.auth.resetPasswordSuccess}
              </p>
              <button
                onClick={() => router.push("/login")}
                className="bg-[#f59e22] mt-4 px-5 py-4 rounded-lg w-full font-black text-[#101820]"
                type="button"
              >
                {t.auth.backToLogin}
              </button>
            </>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="font-bold text-(--sf-text) text-sm">
                  {t.auth.newPassword}
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="bg-(--sf-bg) mt-2 px-3 py-3 border border-(--sf-text)/10 focus:border-[#f59e22] rounded-md outline-none w-full"
                />
              </div>

              <div>
                <label className="font-bold text-(--sf-text) text-sm">
                  {t.auth.confirmPassword}
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="bg-(--sf-bg) mt-2 px-3 py-3 border border-(--sf-text)/10 focus:border-[#f59e22] rounded-md outline-none w-full"
                />
              </div>

              {error ? <p className="text-[#ef5b2a] text-sm">{error}</p> : null}

              <button
                type="submit"
                disabled={loading}
                className="bg-[#f59e22] disabled:opacity-50 mt-2 px-5 py-4 rounded-lg w-full font-black text-[#101820]"
              >
                {loading ? t.auth.savingPassword : t.auth.resetPasswordButton}
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
