-- Einmalig im Supabase SQL Editor ausführen (kann gefahrlos wiederholt werden).

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
