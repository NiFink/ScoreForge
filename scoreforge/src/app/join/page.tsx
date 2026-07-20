"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useI18n } from "@/lib/i18n";
import { getHostSession } from "@/lib/games/hostSession";
import { themeForGameType } from "@/lib/gameThemes";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import type {
  BaseGameState,
  GameRecord,
  LobbySummary,
} from "@/types/gameTypes";

export default function JoinPage() {
  const router = useRouter();
  const { t } = useI18n();

  const [lobbies, setLobbies] = useState<LobbySummary[] | null>(null);
  const [selectedLobbyId, setSelectedLobbyId] = useState<string | null>(null);
  const [lastAttemptedLobbyId, setLastAttemptedLobbyId] = useState<
    string | null
  >(null);
  const [pin, setPin] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadLobbies = useCallback(async () => {
    try {
      const response = await fetch("/api/games");
      // Die API liefert bewusst keinen Code und kein "isMine" (der PIN darf
      // nicht über die öffentliche Liste leaken). Beides ergänzen wir lokal
      // aus dem Host-Store: nur das erstellende Gerät kennt Code + Geheimnis.
      const data = (await response.json()) as {
        lobbies?: Omit<LobbySummary, "isMine" | "code">[];
      };

      if (!response.ok || !data.lobbies) {
        setListError(t.join.connectionFailed);
        setLobbies([]);
        return;
      }

      setListError(null);
      setLobbies(
        data.lobbies.map((lobby) => {
          const session = getHostSession(lobby.id);

          return {
            ...lobby,
            isMine: session !== null,
            code: session?.code ?? null,
          };
        }),
      );
    } catch {
      setListError(t.join.connectionFailed);
      setLobbies([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Fetch-on-Mount: alle setState-Aufrufe passieren erst nach dem await
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadLobbies();
  }, [loadLobbies]);

  const join = async (joinCode: string, gameId?: string) => {
    const normalizedCode = joinCode.trim().toUpperCase();

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
        body: JSON.stringify({ code: normalizedCode, gameId }),
      });

      const data = (await response.json()) as {
        game?: GameRecord<BaseGameState>;
      };

      if (!response.ok || !data.game) {
        setError(
          response.status === 403
            ? t.join.wrongPin
            : response.status === 404
              ? t.join.notFound
              : t.join.failed,
        );
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

  const selectLobby = (lobbyId: string) => {
    setSelectedLobbyId((current) => (current === lobbyId ? null : lobbyId));
    setLastAttemptedLobbyId(null);
    setPin("");
    setError(null);
  };

  // Eigene Lobbies brauchen keinen PIN — der Code ist dem Ersteller bekannt.
  const openLobby = (lobby: LobbySummary) => {
    if (lobby.isMine && lobby.code) {
      setSelectedLobbyId(null);
      setLastAttemptedLobbyId(lobby.id);
      join(lobby.code, lobby.id);
      return;
    }

    selectLobby(lobby.id);
  };

  return (
    <main className="bg-(--sf-bg) px-4 py-5 min-h-screen text-(--sf-text-strong)">
      <div className="mx-auto max-w-2xl">
        <div className="flex justify-between items-center mb-5">
          <button
            onClick={() => router.push("/")}
            className="px-3 py-2 border border-(--sf-text)/15 rounded-md text-(--sf-text-muted) text-sm"
            type="button"
          >
            {t.common.back}
          </button>
          <LanguageSwitcher />
          <ThemeToggle />
        </div>

        <header className="flex items-center gap-4 mb-6">
          <Image
            src="/Logo.png"
            alt="ScoreForge Logo"
            width={64}
            height={64}
            className="border border-(--accent)/35 rounded-lg w-14 h-14 object-cover"
          />
          <div>
            <p className="font-semibold text-(--accent) text-sm uppercase tracking-[0.18em]">
              ScoreForge
            </p>
            <h1 className="mt-1 font-black text-3xl">{t.join.title}</h1>
          </div>
        </header>

        {/* OPEN LOBBIES */}
        <section className="bg-(--sf-surface-2)/90 p-5 border border-(--accent)/20 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-black text-xl">{t.join.openLobbies}</h2>
            <button
              onClick={loadLobbies}
              className="px-3 py-2 border border-(--sf-text)/15 rounded-md text-(--sf-text-muted) text-sm"
              type="button"
            >
              {t.join.refresh}
            </button>
          </div>

          {listError ? (
            <p className="mb-3 text-[#ef5b2a] text-sm">{listError}</p>
          ) : null}

          {lobbies === null ? (
            <p className="py-6 text-(--sf-text-subtle) text-sm text-center">
              {t.join.loadingLobbies}
            </p>
          ) : lobbies.length === 0 ? (
            <p className="py-6 text-(--sf-text-subtle) text-sm text-center">
              {t.join.noLobbies}
            </p>
          ) : (
            <div className="space-y-3">
              {lobbies.map((lobby) => {
                const theme = themeForGameType(lobby.gameType);
                const isSelected = selectedLobbyId === lobby.id;

                return (
                  <div
                    key={lobby.id}
                    className="bg-(--sf-surface) border border-(--sf-text)/10 rounded-lg overflow-hidden"
                    style={{ boxShadow: `inset 4px 0 0 ${theme.hex}` }}
                  >
                    <button
                      onClick={() => openLobby(lobby)}
                      disabled={lobby.isMine && loading}
                      className="flex justify-between items-center gap-3 disabled:opacity-60 p-3 w-full text-left"
                      type="button"
                    >
                      <div className="min-w-0">
                        <p className="font-bold truncate">
                          {lobby.name ?? theme.label}
                        </p>
                        <p className="mt-0.5 text-(--sf-text-subtle) text-xs">
                          <span
                            className="inline-block mr-1 rounded-full w-2 h-2 align-middle"
                            style={{ backgroundColor: theme.hex }}
                          />
                          {theme.label} · {lobby.claimedCount}/
                          {lobby.playerCount} {t.common.players}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {lobby.isMine ? (
                          <span className="bg-(--accent)/20 px-2 py-1 rounded-md font-bold text-(--accent) text-xs whitespace-nowrap">
                            {loading && lastAttemptedLobbyId === lobby.id
                              ? t.join.searching
                              : t.join.yourLobby}
                          </span>
                        ) : null}
                        <span
                          className="px-2 py-1 rounded-md font-bold text-xs whitespace-nowrap"
                          style={{
                            backgroundColor: `${theme.hex}22`,
                            color: theme.hex,
                          }}
                        >
                          {lobby.phase === "lobby"
                            ? t.join.statusLobby
                            : t.join.statusPlaying}
                        </span>
                      </div>
                    </button>

                    {lastAttemptedLobbyId === lobby.id && error ? (
                      <p className="px-3 pb-3 text-[#ef5b2a] text-sm">
                        {error}
                      </p>
                    ) : null}

                    {isSelected ? (
                      <form
                        className="p-3 pt-0"
                        onSubmit={(event) => {
                          event.preventDefault();
                          join(pin, lobby.id);
                        }}
                      >
                        <p className="mb-2 text-(--sf-text-subtle) text-xs">
                          {t.join.pinPrompt}
                        </p>
                        <div className="flex gap-2">
                          <input
                            className="bg-(--sf-bg) px-3 py-3 border border-(--sf-text)/10 focus:border-(--accent) rounded-md outline-none w-full font-black text-lg text-center uppercase tracking-[0.3em]"
                            value={pin}
                            onChange={(event) => {
                              setPin(event.target.value.toUpperCase());
                              setError(null);
                            }}
                            placeholder="ABCDE"
                            maxLength={5}
                            autoFocus
                            autoComplete="off"
                            spellCheck={false}
                          />
                          <button
                            type="submit"
                            disabled={loading}
                            className="bg-(--accent) disabled:opacity-50 px-5 rounded-md font-black text-(--on-accent) whitespace-nowrap"
                          >
                            {loading ? t.join.searching : t.join.joinButton}
                          </button>
                        </div>
                        {error && isSelected ? (
                          <p className="mt-2 text-[#ef5b2a] text-sm">{error}</p>
                        ) : null}
                      </form>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* JOIN BY CODE */}
        <section className="bg-(--sf-surface-2)/90 mt-4 p-5 border border-(--accent)/20 rounded-lg">
          <h2 className="font-black text-xl">{t.join.joinByCode}</h2>
          <p className="mt-2 text-(--sf-text-muted) text-sm">{t.join.prompt}</p>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              setSelectedLobbyId(null);
              setLastAttemptedLobbyId(null);
              join(code);
            }}
          >
            <input
              className="bg-(--sf-bg) mt-4 px-3 py-4 border border-(--sf-text)/10 focus:border-(--accent) rounded-md outline-none w-full font-black text-2xl text-center uppercase tracking-[0.4em]"
              value={code}
              onChange={(event) => {
                setCode(event.target.value.toUpperCase());
                setError(null);
              }}
              placeholder="ABCDE"
              maxLength={5}
              autoComplete="off"
              spellCheck={false}
            />

            {error && !selectedLobbyId ? (
              <p className="mt-3 text-[#ef5b2a] text-sm">{error}</p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="bg-(--accent) disabled:opacity-50 mt-4 px-5 py-4 rounded-lg w-full font-black text-(--on-accent)"
            >
              {loading ? t.join.searching : t.join.joinButton}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
