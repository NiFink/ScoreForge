# ScoreForge

Punkte-Tracker für Kartenspiele (Wizard, Binokel, Doomlings, Universal) mit
geteilten Multi-Device-Lobbys in Echtzeit. Next.js (App Router) + Supabase.

## Getting Started

```bash
npm install
npm run dev
```

Öffne [http://localhost:3000](http://localhost:3000). Einstiegspunkt ist
`src/app/page.tsx`.

### Environment (`.env.local`)

| Variable | Zweck |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase-Projekt-URL (Client + Server) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Öffentlicher Anon/Publishable-Key (nur Lesen via RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Nur serverseitig.** Umgeht RLS – niemals ins Client-Bundle |

Datenbank-Setup: `supabase/setup.sql` im Supabase-SQL-Editor ausführen
(idempotent, kann wiederholt werden).

## Projektstruktur

Der gesamte Anwendungscode liegt unter `src/`; Konfigurationsdateien bleiben
im Projekt-Root. Der Import-Alias `@/*` zeigt auf `src/*`.

```
src/
  app/              # NUR Routing: Pages, Layouts, Route Handler (API)
    api/            #   Server-Endpunkte (Autorisierung + Service-Role-Zugriff)
    <spiel>/        #   Route + kolokierte, route-spezifische UI-Komponenten
  components/        # Global geteilte UI-Komponenten
  features/          # Domänenlogik je Spiel (Scoring), framework-unabhängig
    wizard/ binokel/ doomlings/
  lib/
    supabase/        # admin (Service-Role) / server (Cookie-Session) / client (Browser)
    games/           # Datenzugriff-Helfer (öffentliche Spalten, Limits)
    i18n/            # Übersetzungen
    *.ts             # ranking, colors, gameThemes, useGame, playerValidation …
  types/             # Geteilte Domänen-Typen
  proxy.ts           # Middleware (in Next 16 „Proxy"): frischt Auth-Cookies auf
```

Route-spezifische Komponenten liegen bewusst kolokiert bei ihrer Route
(App-Router-Idiom); nur wiederverwendbare bzw. spielübergreifende Logik wandert
nach `features/`, `lib/` oder `components/`.

## Sicherheitsmodell (Kurzfassung)

- **RLS an, Schreiben nur über API.** Der Browser (Anon-Key) darf nur lesen;
  alle Mutationen laufen über Route Handler mit dem Service-Role-Key.
- **`user_id` bleibt privat.** In der DB per `REVOKE` vor Anon/Authenticated
  verborgen. Da die API den Service-Role-Key nutzt (umgeht Grants), geben die
  Routes **nie** `select("*")` zurück, sondern nur `GAME_CLIENT_COLUMNS`
  (siehe `src/lib/games/records.ts`).
- **Größen-/Längenlimits** auf `state` und Spielernamen, da der Service-Role-
  Client RLS umgeht.
- **Verifizierte Sessions** via `supabase.auth.getUser()` (nicht `getSession()`)
  für Autorisierungsentscheidungen; Auth-Redirects sind auf interne Pfade
  beschränkt (kein Open-Redirect).

> Bekannte Restrisiken sind im Code an den betroffenen Stellen kommentiert
> (z. B. dass `hostId`/`code` in der öffentlich lesbaren `state`-Spalte liegen).

## Scripts

| Script | Wirkung |
| --- | --- |
| `npm run dev` | Dev-Server |
| `npm run build` | Produktions-Build (inkl. TypeScript-Check) |
| `npm run lint` | ESLint |
