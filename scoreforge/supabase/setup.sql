-- Im Supabase SQL Editor ausführen (kann gefahrlos wiederholt werden).

-- 1. RLS aktivieren: Schreiben geht nur noch über die API-Routes (Service-Role-Key),
--    der Browser-Client (Publishable Key) darf nur lesen.
alter table public.games enable row level security;

drop policy if exists "games_public_read" on public.games;

create policy "games_public_read"
  on public.games
  for select
  to anon, authenticated
  using (true);

-- 2. Realtime für die games-Tabelle einschalten (nur falls noch nicht geschehen),
--    damit alle Geräte Updates live erhalten.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'games'
  ) then
    alter publication supabase_realtime add table public.games;
  end if;
end $$;

-- 3. Ablaufdatum: Lobbys leben 2 Tage; nach Spielende setzt die API auf +1 Stunde.
alter table public.games
  add column if not exists expires_at timestamptz not null
  default (now() + interval '2 days');

create index if not exists games_expires_at_idx on public.games (expires_at);

-- 4. Automatisches Aufräumen abgelaufener Spiele (stündlich).
--    Voraussetzung: Extension "pg_cron" aktivieren unter
--    Dashboard -> Database -> Extensions -> pg_cron
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'cleanup-expired-games',
      '17 * * * *',
      $job$ delete from public.games where expires_at < now() $job$
    );
  else
    raise notice 'pg_cron ist nicht aktiviert - abgelaufene Spiele werden nur ausgeblendet, nicht geloescht.';
  end if;
end $$;

-- 5. Spiele optional mit einem Nutzerkonto verknüpfen (Supabase Auth),
--    damit eingeloggte Nutzer ihre Spiele geräteübergreifend wiederfinden.
--    Nullable: anonym erstellte Spiele funktionieren unverändert weiter.
alter table public.games
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists games_user_id_idx on public.games (user_id);

-- 6. user_id ist eine echte Konto-Kennung - im Gegensatz zu den übrigen,
--    bewusst öffentlichen Spalten (Lobby-Browsing) darf sie NICHT über die
--    public-read-Policy für anon/authenticated lesbar sein, sonst könnte
--    jeder mit dem öffentlichen anon-Key direkt per REST alle Spiele eines
--    Kontos korrelieren. Nur der Service-Role-Key (API-Routes) darf sie lesen.
revoke select (user_id) on public.games from anon, authenticated;

-- 7. Host-Berechtigung über ein Geheimnis statt über die (öffentlich lesbare)
--    hostId in `state`. In der DB liegt nur der SHA-256-Hash; das Rohgeheimnis
--    kennt allein das erstellende Gerät (localStorage). So kann niemand durch
--    Auslesen öffentlicher Daten Host-Rechte übernehmen oder ein Spiel löschen.
--    Nullable: vor der Migration erstellte Spiele nutzen weiter den alten
--    clientId/hostId-Abgleich (Legacy-Fallback in der API).
alter table public.games
  add column if not exists host_secret_hash text;

-- Wie user_id NICHT über die public-read-Policy lesbar machen. Defense-in-depth:
-- der gespeicherte Wert ist ohnehin nur ein Hash.
revoke select (host_secret_hash) on public.games from anon, authenticated;

-- 8. Beitritts-Code (PIN) vor direktem Auslesen schützen: sonst könnte jeder
--    mit dem öffentlichen anon-Key per REST oder Realtime ALLE PINs auf einmal
--    abgreifen und jeder Lobby beitreten. Der Code wird nur noch über die API
--    an Berechtigte herausgegeben (der Ersteller kennt ihn lokal, Beitretende
--    liefern ihn beim Join selbst). Der eingeloggte Browser-Client nutzt die
--    games-Tabelle nur für Realtime-Updates des Spielstands - er braucht dort
--    keinen Code (useGame hält den bekannten Code über Updates hinweg stabil).
revoke select (code) on public.games from anon, authenticated;

-- 9. Dauerhafte Spiel-Historie NUR für eingeloggte Konten. Anders als `games`
--    (vergänglich, 2-Tage-Ablauf + stündliches Löschen) überlebt hier ein
--    kleiner Ergebnis-Eintrag pro beendetem Spiel. Wird ausschließlich über die
--    API (Service-Role) geschrieben/gelesen, immer nach verifiziertem Nutzer
--    gefiltert. `unique (user_id, game_id)` verhindert Doppeleinträge, wenn ein
--    Spiel mehrfach als "fertig" gemeldet wird.
create table if not exists public.game_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id text not null,
  game_type text not null,
  lobby_name text,
  winner text,
  players jsonb not null default '[]'::jsonb,
  finished_at timestamptz not null default now(),
  unique (user_id, game_id)
);

create index if not exists game_results_user_idx
  on public.game_results (user_id, finished_at desc);

-- RLS an, aber BEWUSST keine Policies für anon/authenticated: der öffentliche
-- Browser-Client darf gar nicht direkt zugreifen. Nur der Service-Role-Key der
-- API-Routes umgeht RLS und liest/schreibt streng nach verifiziertem Nutzer.
alter table public.game_results enable row level security;
