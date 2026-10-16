# Roadtrip Planner

A **map-first road-trip planner**. Drop stops on a map, decide how many nights you sleep at
each, and see real driving distance and time for every leg — coloured by how exhausting each
travel day is. Save alternatives as Variants, compare them side by side, and follow the trip
day by day on your phone.

Built for a 17-night US West Coast road trip with family and friends, now cleaned up and
shared so others can plan theirs.

## Features

- **Map planner** — drag to reorder, skip, add stops (place search or pin drop), set nights.
  Drafts stay in your browser until you save.
- **Real road routing** via Mapbox Directions, cached per leg; straight-line estimates when
  no token is configured.
- **Day-by-day schedule** — where you sleep each night, the drive that gets you there, and a
  night-fit check against your trip dates.
- **Variants** — save, rank by driving time or distance, compare side by side.
- **Trip rules** — saves are blocked when nights don't fit the dates, a booked night is
  dropped, or a day's driving exceeds a safety cap.
- **On the road (`/live`)** — phone view of tonight's stay, the drive there, navigation links
  and optional GPS distance/ETA.
- **Export** — plain-text and printable itinerary.

## Quick start

Requires Node 20+.

```bash
cp .env.example .env    # optional: add Mapbox tokens for the basemap + road routing
npm install
npm run db:reset        # SQLite + the seeded sample trip
npm run dev             # http://localhost:3000
```

In development, log in with **`demo` / `demo`**. In production you must set
`AUTH_USERNAME`, `AUTH_PASSWORD` and `AUTH_SESSION_TOKEN` — there are no defaults.
Production must be served over HTTPS (the session cookie is `Secure`). Sessions last 30
days; changing `AUTH_SESSION_TOKEN` signs everyone out. After 5 wrong passwords a client
is locked out for 15 minutes.

## Configuration

| Variable | Needed for |
|----------|------------|
| `DATABASE_URL` | SQLite file (default `file:./dev.db`) |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Basemap in the browser (`pk.` token — restrict it to your domain) |
| `MAPBOX_API_KEY` | Real driving distances/geometry (`sk.` token, server-only) |
| `NOMINATIM_USER_AGENT` | Place search — identify your app + contact per the [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/) |
| `AUTH_USERNAME`, `AUTH_PASSWORD`, `AUTH_SESSION_TOKEN` | Shared login (required in production) |

## Scripts

```bash
npm test                    # unit tests (vitest)
npm run build               # production build + type-check
npm run db:studio           # browse the SQLite DB
npm run itinerary:generate -- --file list.txt --label "My route"   # place list → Variant
```

## Self-hosting

`deploy/` has a systemd unit and a redeploy script template (back up SQLite → pull → install
→ `prisma db push` → build → restart). Put a reverse proxy (e.g. Caddy) in front of
`127.0.0.1:3000`.

## Roadmap

Phase one ends at **v1.0.0**: a hosted, multi-user version.

- English UI (Czech kept as a second locale)
- Sign in with Google / Apple; up to 2 trips per user; read-only share links
- Per-trip settings (dates, start/end, must-keep stops, drive caps) and in-app hotel editing
- Usage quotas that keep the hosted service inside free API tiers

## Tech

Next.js 15 (App Router, Server Actions) · React 19 · Prisma + SQLite · Mapbox GL JS ·
Tailwind CSS · Vitest.

## License

[MIT](./LICENSE)
