"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import type { BaseGameState, GameRecord } from "@/app/types/gameTypes";

export default function JoinPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const joinGame = async () => {
    const normalizedCode = code.trim().toUpperCase();

    if (!normalizedCode) {
      setError(t.join.missingCode);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/games/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: normalizedCode }),
      });

      const data = (await response.json()) as {
        game?: GameRecord<BaseGameState>;
      };

      if (!response.ok || !data.game) {
        setError(response.status === 404 ? t.join.notFound : t.join.failed);
        return;
      }

      const gameType = data.game.state.gameType ?? "wizard";
      router.push(`/${gameType}/${data.game.id}`);
    } catch {
      setError(t.join.connectionFailed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="place-items-center grid bg-[#101820] px-4 py-5 min-h-screen text-[#fff4c7]">
      <div className="w-full max-w-md">
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

        <div className="bg-[#14222b]/90 p-5 border border-[#f59e22]/20 rounded-lg">
          <div className="flex items-center gap-4 mb-5">
            <Image
              src="/Logo.png"
              alt="ScoreForge Logo"
              width={64}
              height={64}
              className="border border-[#f59e22]/35 rounded-lg w-14 h-14 object-cover"
            />
            <div>
              <p className="font-semibold text-[#f59e22] text-sm uppercase tracking-[0.18em]">
                ScoreForge
              </p>
              <h1 className="mt-1 font-black text-2xl">{t.join.title}</h1>
            </div>
          </div>

          <p className="text-[#d8d3bd] text-sm">{t.join.prompt}</p>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              joinGame();
            }}
          >
            <input
              className="bg-[#101820] mt-4 px-3 py-4 border border-[#f7e7ad]/10 focus:border-[#f59e22] rounded-md outline-none w-full font-black text-2xl text-center uppercase tracking-[0.4em]"
              value={code}
              onChange={(event) => {
                setCode(event.target.value.toUpperCase());
                setError(null);
              }}
              placeholder="ABCDE"
              maxLength={5}
              autoFocus
              autoComplete="off"
              spellCheck={false}
            />

            {error ? (
              <p className="mt-3 text-[#ef5b2a] text-sm">{error}</p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="bg-[#f59e22] disabled:opacity-50 mt-4 px-5 py-4 rounded-lg w-full font-black text-[#101820]"
            >
              {loading ? t.join.searching : t.join.joinButton}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
