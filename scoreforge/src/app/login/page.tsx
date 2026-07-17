"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { useI18n } from "@/lib/i18n";
import { supabase } from "@/lib/supabase/client";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

type Mode = "login" | "signup" | "forgot";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submitLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(t.auth.invalidCredentials);
        return;
      }

      router.push("/account");
    } catch {
      setError(t.auth.genericError);
    } finally {
      setLoading(false);
    }
  };

  const submitSignup = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setInfo(null);

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
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signUpError) {
        setError(
          signUpError.message.toLowerCase().includes("already")
            ? t.auth.userAlreadyExists
            : t.auth.genericError,
        );
        return;
      }

      // Bestätigungsmail nötig, falls Supabase Email-Confirmation verlangt
      // (dann existiert noch keine Session).
      if (data.session) {
        router.push("/account");
        return;
      }

      setInfo(t.auth.signupSuccess);
    } catch {
      setError(t.auth.genericError);
    } finally {
      setLoading(false);
    }
  };

  const submitForgot = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Kein next-Parameter mehr nötig: der Callback erkennt type=recovery
      // aus dem E-Mail-Link selbst und leitet auf /auth/reset-password.
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: `${window.location.origin}/auth/callback` },
      );

      // Absichtlich nicht verraten, ob die E-Mail überhaupt existiert - aber
      // echte Fehler (z. B. Rate-Limit) müssen sichtbar bleiben, sonst denkt
      // der Nutzer, eine Mail sei unterwegs, obwohl der Versand fehlgeschlagen ist.
      if (resetError && resetError.code !== "user_not_found") {
        setError(t.auth.genericError);
        return;
      }

      setInfo(t.auth.resetLinkSent);
    } catch {
      setError(t.auth.genericError);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setInfo(null);
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <main className="bg-[#101820] px-4 py-5 min-h-screen text-[#fff4c7]">
      <div className="mx-auto max-w-md">
        <div className="flex justify-between items-center mb-5">
          <button
            onClick={() => router.push("/")}
            className="px-3 py-2 border border-[#f7e7ad]/15 rounded-md text-[#d8d3bd] text-sm"
            type="button"
          >
            {t.common.back}
          </button>
          <LanguageSwitcher />
        </div>

        <header className="flex items-center gap-4 mb-6">
          <Image
            src="/Logo.png"
            alt="ScoreForge Logo"
            width={64}
            height={64}
            className="border border-[#f59e22]/35 rounded-lg w-14 h-14 object-cover"
          />
          <h1 className="font-black text-3xl">
            {mode === "signup" ? t.auth.signupTitle : t.auth.loginTitle}
          </h1>
        </header>

        <section className="bg-[#14222b]/90 p-5 border border-[#f59e22]/20 rounded-lg">
          {mode !== "forgot" ? (
            <>
              <form
                onSubmit={mode === "signup" ? submitSignup : submitLogin}
                className="space-y-3"
              >
                <div>
                  <label className="font-bold text-[#f7e7ad] text-sm">
                    {t.auth.email}
                  </label>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="bg-[#101820] mt-2 px-3 py-3 border border-[#f7e7ad]/10 focus:border-[#f59e22] rounded-md outline-none w-full"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#f7e7ad] text-sm">
                    {t.auth.password}
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    autoComplete={
                      mode === "signup" ? "new-password" : "current-password"
                    }
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="bg-[#101820] mt-2 px-3 py-3 border border-[#f7e7ad]/10 focus:border-[#f59e22] rounded-md outline-none w-full"
                  />
                </div>

                {mode === "signup" ? (
                  <div>
                    <label className="font-bold text-[#f7e7ad] text-sm">
                      {t.auth.confirmPassword}
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
                      className="bg-[#101820] mt-2 px-3 py-3 border border-[#f7e7ad]/10 focus:border-[#f59e22] rounded-md outline-none w-full"
                    />
                  </div>
                ) : null}

                {mode === "login" ? (
                  <button
                    onClick={() => switchMode("forgot")}
                    className="text-[#9fc9d5] text-sm underline"
                    type="button"
                  >
                    {t.auth.forgotPassword}
                  </button>
                ) : null}

                {error ? (
                  <p className="text-[#ef5b2a] text-sm">{error}</p>
                ) : null}
                {info ? (
                  <p className="text-[#2aa6c8] text-sm">{info}</p>
                ) : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="bg-[#f59e22] disabled:opacity-50 mt-2 px-5 py-4 rounded-lg w-full font-black text-[#101820]"
                >
                  {loading
                    ? t.auth.submitting
                    : mode === "signup"
                      ? t.auth.signupButton
                      : t.auth.loginButton}
                </button>
              </form>

              <button
                onClick={() => switchMode(mode === "signup" ? "login" : "signup")}
                className="mt-4 w-full text-[#9fc9d5] text-sm text-center underline"
                type="button"
              >
                {mode === "signup"
                  ? t.auth.switchToLogin
                  : t.auth.switchToSignup}
              </button>
            </>
          ) : (
            <form onSubmit={submitForgot} className="space-y-3">
              <h2 className="font-black text-xl">
                {t.auth.forgotPasswordTitle}
              </h2>
              <p className="text-[#d8d3bd] text-sm">
                {t.auth.forgotPasswordPrompt}
              </p>

              <div>
                <label className="font-bold text-[#f7e7ad] text-sm">
                  {t.auth.email}
                </label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="bg-[#101820] mt-2 px-3 py-3 border border-[#f7e7ad]/10 focus:border-[#f59e22] rounded-md outline-none w-full"
                />
              </div>

              {error ? <p className="text-[#ef5b2a] text-sm">{error}</p> : null}
              {info ? <p className="text-[#2aa6c8] text-sm">{info}</p> : null}

              <button
                type="submit"
                disabled={loading}
                className="bg-[#f59e22] disabled:opacity-50 mt-2 px-5 py-4 rounded-lg w-full font-black text-[#101820]"
              >
                {loading ? t.auth.submitting : t.auth.sendResetLink}
              </button>

              <button
                onClick={() => switchMode("login")}
                className="w-full text-[#9fc9d5] text-sm text-center underline"
                type="button"
              >
                {t.auth.backToLogin}
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
