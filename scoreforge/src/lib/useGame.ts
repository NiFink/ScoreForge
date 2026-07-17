"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { supabase } from "@/lib/supabase/client";
import { getClientId } from "@/lib/clientId";
import { forgetHostGame, getHostSession } from "@/lib/games/hostSession";
import type { BaseGameState, GameRecord } from "@/types/gameTypes";

const subscribeToNothing = () => () => {};
const getServerClientId = () => "";

export function useGame<S extends BaseGameState>(gameId: string) {
  const [game, setGame] = useState<GameRecord<S> | null>(null);
  const [notFound, setNotFound] = useState(false);
  const gameRef = useRef<GameRecord<S> | null>(null);

  // Auf dem Server "" liefern, im Browser die stabile Geräte-ID
  const clientId = useSyncExternalStore(
    subscribeToNothing,
    getClientId,
    getServerClientId,
  );

  // Host ist, wer für dieses Spiel lokal ein Host-Geheimnis hat (nur auf dem
  // erstellenden Gerät). Rein clientseitiger UI-Hinweis - die eigentliche
  // Durchsetzung passiert serverseitig über den Hash-Abgleich (hostAuth).
  // Wie clientId SSR-sicher über useSyncExternalStore (Server: kein Host).
  const hasHostSecret = useSyncExternalStore(
    subscribeToNothing,
    () => getHostSession(gameId) !== null,
    () => false,
  );

  // Spielstand initial laden
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`/api/games/${gameId}`);

        if (!response.ok) {
          if (!cancelled) {
            setNotFound(true);
          }
          return;
        }

        const data = (await response.json()) as { game: GameRecord<S> };

        if (!cancelled) {
          gameRef.current = data.game;
          setGame(data.game);
        }
      } catch {
        if (!cancelled) {
          setNotFound(true);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [gameId]);

  // Realtime: Änderungen anderer Geräte übernehmen
  useEffect(() => {
    const channel = supabase
      .channel(`game-${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "games",
          filter: `id=eq.${gameId}`,
        },
        (payload) => {
          const incoming = payload.new as Partial<GameRecord<S>>;
          const previous = gameRef.current;

          // Nur den Spielstand (state) und expires_at aktualisieren. code/id
          // sind unveränderlich und kommen nach dem code-REVOKE (siehe
          // setup.sql) evtl. nicht mehr in der Realtime-Payload mit - deshalb
          // den bereits bekannten Wert beibehalten.
          const next = {
            ...(previous ?? {}),
            ...incoming,
            id: previous?.id ?? (incoming.id as string),
            code: previous?.code ?? (incoming.code as string) ?? "",
          } as GameRecord<S>;

          gameRef.current = next;
          setGame(next);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [gameId]);

  const state = game?.state ?? null;
  // Legacy-Brücke: Spiele, die vor der host_secret-Migration erstellt wurden,
  // haben keinen lokalen Host-Store-Eintrag. Damit ihre Hosts nicht die
  // Host-UI (und im "host"-Modus das Schreiben) verlieren, hier zusätzlich der
  // alte clientId/hostId-Abgleich. Rein UI - der Server autorisiert weiterhin
  // pro Spiel korrekt (neue Spiele verlangen das Geheimnis, siehe hostAuth).
  const isHost =
    hasHostSecret || (!!clientId && !!state && state.hostId === clientId);
  const canWrite = isHost || state?.writeMode === "all";

  // Lokale Änderung sofort anzeigen und an den Server schicken;
  // Realtime bestätigt sie danach auf allen Geräten (last-write-wins).
  // isFinished meldet dem Server, dass das Spiel vorbei ist (Lobby läuft
  // dann nur noch 1 Stunde weiter). isPaused verlängert die Lobby stattdessen
  // auf 30 Tage, damit pausierte Spiele nicht zwischendurch verschwinden.
  const mutateState = (
    updater: (current: S) => S,
    isFinished?: (next: S) => boolean,
    isPaused?: (next: S) => boolean,
  ) => {
    const current = gameRef.current;

    if (!current || !clientId) {
      return;
    }

    const nextState = updater(current.state);
    const next = { ...current, state: nextState };

    gameRef.current = next;
    setGame(next);

    void fetch(`/api/games/${current.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        state: nextState,
        clientId,
        // Host-Geheimnis beweist die Berechtigung im "host"-Modus (null bei
        // Nicht-Hosts, die nur im "all"-Modus schreiben dürfen).
        hostSecret: getHostSession(current.id)?.secret ?? null,
        finished: isFinished ? isFinished(nextState) : false,
        paused: isPaused ? isPaused(nextState) : false,
      }),
    });
  };

  // Rückgabe: HTTP-Status bei Fehler (409 = Platz vergeben), null bei Erfolg
  const claimSlot = async (
    playerId: string,
    name?: string,
  ): Promise<number | null> => {
    try {
      const response = await fetch(`/api/games/${gameId}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, clientId, name }),
      });

      const data = (await response.json()) as { game?: GameRecord<S> };

      if (!response.ok || !data.game) {
        return response.status || 0;
      }

      gameRef.current = data.game;
      setGame(data.game);
      return null;
    } catch {
      return 0;
    }
  };

  // Löscht das Spiel unwiderruflich (nur der Host darf das serverseitig).
  const deleteGame = async (): Promise<boolean> => {
    const current = gameRef.current;

    if (!current || !clientId) {
      return false;
    }

    try {
      const response = await fetch(`/api/games/${current.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          hostSecret: getHostSession(current.id)?.secret ?? null,
        }),
      });

      if (response.ok) {
        // Lokalen Host-Nachweis aufräumen - das Spiel gibt es nicht mehr.
        forgetHostGame(current.id);
      }

      return response.ok;
    } catch {
      return false;
    }
  };

  return {
    game,
    state,
    notFound,
    clientId,
    isHost,
    canWrite,
    mutateState,
    claimSlot,
    deleteGame,
  };
}
