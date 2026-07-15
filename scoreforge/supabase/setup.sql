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
