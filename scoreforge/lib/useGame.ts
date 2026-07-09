"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { supabase } from "@/lib/supabaseClient";
import { getClientId } from "@/lib/clientId";
import type { BaseGameState, GameRecord } from "@/app/types/gameTypes";

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
          const next = payload.new as GameRecord<S>;
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
  const isHost = !!state && !!clientId && state.hostId === clientId;
  const canWrite = isHost || state?.writeMode === "all";

  // Lokale Änderung sofort anzeigen und an den Server schicken;
  // Realtime bestätigt sie danach auf allen Geräten (last-write-wins).
  // isFinished meldet dem Server, dass das Spiel vorbei ist (Lobby läuft
  // dann nur noch 1 Stunde weiter).
  const mutateState = (
    updater: (current: S) => S,
    isFinished?: (next: S) => boolean,
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
        finished: isFinished ? isFinished(nextState) : false,
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
        body: JSON.stringify({ clientId }),
      });

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
