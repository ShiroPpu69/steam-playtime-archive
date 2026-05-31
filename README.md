# PLAYTIME ARCHIVE

> A private index of games, hours, and history.

PLAYTIME ARCHIVE turns a public Steam library into a cinematic local-first archive: every title becomes a catalogue record, every sync becomes a chronology entry, and every profile becomes a dossier.

It is not a leaderboard, tracker network, or esports dashboard. It is a restrained personal archive for Steam playtime, built with warm paper textures, brass labels, film-contact-sheet layouts, SQLite/D1 persistence, and exportable records.

## Highlights

- Parse Steam profile URLs from vanity paths and SteamID64 profiles.
- Use the official Steam Web API as the primary data source.
- Keep `STEAM_API_KEY` on the backend only.
- Render a searchable, sortable, filterable catalogue of owned games.
- Show total playtime, recent two-week playtime, played/unopened counts, Top 10 share, and primary record.
- Include Table, Card, and Archive Wall views.
- Render dashboard charts with a restrained archive-report aesthetic.
- Save profiles, games, snapshots, sync runs, and cache records in SQLite.
- Track chronology across repeated syncs.
- Export CSV, JSON, and Markdown records.
- Lazy-load achievements and Steam Store metadata.
- Run with mock data when no Steam API key is available.
- Deploy locally, with Docker, or on Cloudflare Workers + D1.

## Visual Direction

PLAYTIME ARCHIVE is designed as a black film archive and warm dossier interface:

- matte near-black background
- manila folder surfaces
- subtle paper grain
- brass labels
- catalogue index tables
- restrained hover motion
- film contact sheet archive wall
- case-file detail drawer

No neon. No esports gradients. No glassmorphism. No social feed.

## Stack

| Layer | Technology |
|---|---|
| Client | React, Vite, TypeScript |
| Server | Node.js, Express, TypeScript |
| Local database | Node `node:sqlite` |
| Charts | Recharts |
| Styling | CSS variables and handcrafted archive theme |
| Cloudflare | Workers Assets, Workers API, D1 |

## Core Flow

```text
Steam profile URL
  -> parse vanity URL or SteamID64
  -> call Steam Web API
  -> normalize playtime records
  -> cache response
  -> write SQLite / D1 snapshots
  -> render archive UI
  -> export records
```

## Screens

- **Profile source**: open a Steam archive from a profile URL.
- **Archive shelf**: reopen locally indexed profiles.
- **Archive summary**: total titles, hours, recent activity, Top 10 share.
- **Dossier report**: visual playtime analysis.
- **Archive wall**: film-contact-sheet view weighted by playtime.
- **Catalogue index**: precise table view for searching and filtering.
- **Chronology**: sync history and playtime deltas.
- **Case file**: per-game detail drawer with achievements and metadata.
- **Export records**: CSV, JSON, and Markdown.

## Install

Use Node.js 22 or newer.

```bash
npm install
```

Create your environment file:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

## Steam Web API Key

Apply for a key:

https://steamcommunity.com/dev/apikey

Then set:

```env
STEAM_API_KEY=your_steam_web_api_key_here
PORT=3001
CLIENT_ORIGIN=http://localhost:5173
CACHE_TTL_SECONDS=3600
DATABASE_PATH=./data/archive.sqlite
```

Never put the Steam API key in frontend code. Anything shipped to the browser can be inspected.

## Development

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

The backend runs at:

```text
http://localhost:3001
```

## Local Production

```bash
npm run build
npm run server
```

Open:

```text
http://localhost:3001
```

## Mock Mode

Use **Load sample archive** in the UI, or call:

```text
/api/mock/games
```

Mock mode renders the full interface without a Steam API key.

## Supported Steam URLs

```text
https://steamcommunity.com/id/<vanityName>/
http://steamcommunity.com/id/<vanityName>/
steamcommunity.com/id/<vanityName>
https://steamcommunity.com/profiles/<steamid64>/
steamcommunity.com/profiles/<steamid64>
```

## API

| Route | Purpose |
|---|---|
| `GET /api/steam/resolve?profileUrl=` | Resolve Steam profile URL |
| `GET /api/steam/games?profileUrl=&refresh=false` | Fetch archive records |
| `GET /api/steam/recent?steamid64=` | Fetch recent activity |
| `GET /api/steam/achievements?steamid64=&appid=` | Lazy-load achievements |
| `GET /api/steam/appdetails?appid=` | Lazy-load Store metadata |
| `GET /api/history?steamid64=` | Sync chronology |
| `GET /api/history/game?steamid64=&appid=` | Per-game playtime trace |
| `GET /api/profiles` | Local archive shelf |
| `DELETE /api/profiles/:steamid64` | Delete local profile archive |
| `GET /api/export/csv?steamid64=` | Export CSV |
| `GET /api/export/json?steamid64=` | Export JSON |
| `GET /api/export/markdown?steamid64=` | Export Markdown |
| `GET /api/mock/games` | Mock archive |

Errors use a consistent shape:

```json
{
  "error": {
    "code": "STEAM_PROFILE_PRIVATE",
    "message": "Unable to read the game library. Confirm Steam Game Details are public or accessible.",
    "details": "..."
  }
}
```

## SQLite Schema

The local database stores:

- `profiles`
- `games`
- `profile_games`
- `playtime_snapshots`
- `sync_runs`
- `api_cache`

Every successful live query writes a profile, games, current playtime state, snapshots, and a sync run.

## Long-Term Sync

Manual sync:

```bash
npm run sync -- steamcommunity.com/id/<vanityName>/
```

This bypasses cache and writes a fresh archive snapshot. It is suitable for cron, Windows Task Scheduler, or future background sync.

## Docker

```bash
docker compose up --build -d
```

The SQLite database is stored in the `archive-data` volume.

## Cloudflare Workers + D1

Cloudflare cannot run the local Express + `node:sqlite` backend directly. The repository includes a Worker adapter in `cloudflare/worker.ts`.

1. Build the app:

```bash
npm run build
```

2. Log in:

```bash
npx wrangler login
```

3. Create D1:

```bash
npx wrangler d1 create steam-playtime-archive-db
```

4. Put the returned `database_id` into `wrangler.toml`.

5. Add the Steam key as a secret:

```bash
npx wrangler secret put STEAM_API_KEY
```

6. Initialize D1:

```bash
npx wrangler d1 execute steam-playtime-archive-db --remote --file=cloudflare/schema.sql
```

7. Deploy:

```bash
npx wrangler deploy
```

## Privacy Notes

- `.env` is ignored.
- SQLite database files are ignored.
- Steam API key is backend-only.
- Cloudflare deployments should use Worker secrets.
- No user system account or local database is required in the repository.

## FAQ

### Why can the app fail to read a profile?

Steam requires **Game Details** visibility to be public or otherwise accessible. Profile visibility alone is not enough.

### Why does the game count differ from the Steam website?

Steam Web API results can differ from the public web UI. Free titles, delisted apps, family-shared entries, profile visibility, and Steam API behavior can all affect the count.

### Why are some free games missing?

The app requests `include_played_free_games=1`, but Steam may still omit some apps depending on account state and API behavior.

### Why can achievements fail?

Achievements are loaded lazily per game. The endpoint can fail if the game has no public stats, user stats are private, or Steam is temporarily unavailable.

### Why not build this as a frontend-only app?

The Steam API key must never be shipped to the browser. A backend, Worker, or serverless API is required.

## Roadmap

- Scheduled sync jobs
- More detailed per-game timeline charts
- Stronger wrapped-style archive reports
- HowLongToBeat metadata integration
- Electron desktop archive edition
- Screenshot export for archive cards
- Optional Steam OpenID flow

## License

MIT
