# Roadtrip Planner

> AI-agent context. Read this before changing code so you don't undo load-bearing decisions.

## What it is

A **map-first road-trip planner**: draft a route of stops on a Mapbox map, set how many nights
you sleep at each, see real driving distance/time per leg, compare saved Variants, and follow
the trip day by day on a phone (`/live`). One Next.js app + Prisma/SQLite. The seeded demo is a
17-night US West Coast loop (`prisma/sampleLiveVariant.ts`).

Today it is **single-trip, single shared login** (v0.x). The phase-one roadmap (multi-user,
OAuth, per-user trips, quotas) is in `README.md`.

## Routes

- `/` — phone home (`MobileHome`) or the map planner (`md`+, `?planner=1`, `?option=<id>`).
- `/create` — blank planner; draft from scratch and save as a Variant.
- `/options` — ranked saved Variants; `/options/compare` side-by-side.
- `/live` — phone-first, read-only "tonight" view of the pinned live Variant.
- `/export` — plain-text / printable itinerary.
- `/login` — shared-login form. Everything else is gated by `middleware.ts`.

## How to run it

```bash
npm install              # also runs prisma generate (postinstall)
npm run db:reset         # DESTRUCTIVE: recreate SQLite + seed the sample trip
npm run dev              # http://localhost:3000 (dev login: demo / demo)
npm test                 # vitest
npm run build            # production build = full type-check
npm run itinerary:generate -- --file list.txt --label "…"   # place list → saved Variant
```

The DB is a local SQLite file (`prisma/dev.db`, gitignored). No migration history: schema
changes land via `prisma db push`, which refuses data-dropping changes — never add
`--accept-data-loss` against a DB you care about.

## Key files

| File | What it does |
|------|--------------|
| `prisma/schema.prisma` | `Trip`, `Place`, `ItineraryStop` (legacy seed fallback), `Leg` (Directions cache), **`ItineraryOption` + `OptionStop`** (saved Variants = denormalized draft snapshots; a stop with `isHotel` **is** the accommodation and carries `address`/`url`/`phone`). |
| `prisma/seed.ts`, `prisma/sampleLiveVariant.ts` | Destructive seed: one sample trip + its live Variant. |
| `middleware.ts`, `app/actions/auth.ts` | Shared-login gate. Cookie name + token must match in both. Dev-only `demo`/`demo` fallback; in production unset `AUTH_*` means nobody can log in. |
| `lib/i18n.ts` | UI dictionary `t` + `plural()`. **All user-facing strings live here.** |
| `lib/timezones.ts` | `ZONES`, `zonedWallClockToUtc`, `civilDateInZone`, formatters. **All time logic lives here.** |
| `lib/schedule.ts` | **Pure** day-by-day schedule (`buildSchedule`): per-night calendar, `perStop` ranges, night-fit check. |
| `lib/live.ts`, `lib/liveItinerary.ts` | **Pure** "where are we tonight" (`resolveLiveState`) + loading the pinned live Variant (`LIVE_OPTION_SEQ`). |
| `lib/legs.ts` | Per-leg model: `assembleLegs`, exertion colours, `nightSegments`/`withSegmentExertion`, mock fallback. |
| `lib/routing.core.ts`, `lib/routing.ts` | Mapbox Directions (server-only secret token) + `Leg`-table cache (`resolveRoutes`). |
| `lib/geocode.ts` | Nominatim search. **Single source of truth for normalized place titles.** |
| `lib/itineraryConstraints.ts`, `lib/itineraryViolations.ts`, `lib/constraintMessages.ts` | Save-time hard checks (night fit, booked nights, arrival-day + daily drive caps) and their UI copy. |
| `lib/draftStorage.ts` | localStorage persistence of the unsaved map draft. |
| `app/actions/options.ts` | **The only Variant writer**: `saveOption` / `updateOption` / `deleteOption` (Zod-validated, re-routed, re-totalled). |
| `app/actions/routes.ts`, `app/actions/live.ts` | `getRoutes` (cached) and `getLiveRoute` (GPS → stop, deliberately uncached). |
| `components/map/MapPlanner.tsx` | Owns the client-only draft snapshot, routing fetches, schedule, summary bar. |
| `components/map/MapView.tsx` | Mapbox GL JS map (browser-only, `next/dynamic` `ssr:false`). |
| `components/live/*` | `/live` screen: `OnTheGoView`, `StayCard`, `LiveDistance`. |
| `scripts/generate-itinerary.ts` | CLI: place list → geocode → real totals → saved Variant. |

## Architecture rules (load-bearing)

- **One Next.js app, no separate backend.** Reads = Server Components querying Prisma. Writes =
  Server Actions in `app/actions/*`. Don't add a REST/tRPC layer or client `fetch` for data.
- **The map draft is client-only.** `MapPlanner` edits a `SnapshotStop[]` in React state; it
  reaches the DB only through an explicit save (`saveOption`/`updateOption`). Don't add Server
  Action calls to per-edit handlers.
- **A hotel IS a stop** (`OptionStop.isHotel`), never a separate date-keyed record — otherwise
  the schedule measures drives to the wrong place. `saveOption`/`updateOption` delete and
  recreate stops, so any new per-stop field must be added to `stopSchema` and both mappings or
  it is destroyed on the next save.
- **Time:** the DB stores true UTC instants. Never format a time ad hoc — use
  `components/time/TimeStamp.tsx` (UI) or `lib/timezones.ts` (logic). Offsets are DST-aware via
  `Intl`; never hardcode ±hours. "Now" is resolved **after mount** in the trip's zone (never
  during SSR — hydration mismatch) and re-ticked every 60 s.
- **Nights/schedule are derived, pure and shared** (`lib/schedule.ts`) — the Dny tab, map date
  labels, moon markers and `/live` all read from it. Don't recompute night dates elsewhere.
- **Leg metrics come from `lib/legs.ts`.** Exertion colour grades the whole overnight→overnight
  travel *day* (`withSegmentExertion`), not the individual hop — use `leg.color` /
  `leg.segmentHours` in new UI.
- **Routing is fetched client-side via `getRoutes`** with a request-id guard; results are
  DB-cached per rounded coordinate pair (`legCacheKey`). Straight line + `mockHours` is the
  fallback when a route can't be fetched (flagged `leg.fallback`).
- **Mapbox is split by token type**: browser map uses public `NEXT_PUBLIC_MAPBOX_TOKEN` (`pk.`);
  Directions uses secret `MAPBOX_API_KEY` (`sk.`) server-side only. Never expose `sk.`.
- **Map labels are plate-backed badges drawn last** with `allow-overlap`, compact/full variants as
  two zoom-ranged layers, and no `text-variable-anchor` — each rule fixes a real bug against
  `outdoors-v12`. Classic styles only (Standard colour-grades custom layers).
- **Display prefs are client-only** (`PreferencesProvider`, localStorage, loaded after mount).
  Render distances through `DistanceDisplay` (km first, miles on hover).
- **i18n:** development language is English (code, identifiers, comments, dictionary keys);
  UI values are currently Czech. Never hardcode display copy in components, including Server
  Action error messages.
- **`status` is a plain string** (`PLANNED|VISITED|SKIPPED`) validated via `lib/types.ts`.
- **`ItineraryStop.order` is `@@unique([tripId, order])`** — reorders park a row at `-1` inside a
  transaction; don't replace with a naive swap.

## External API notes

- **Nominatim** (`lib/geocode.ts`): needs a descriptive `User-Agent` (`NOMINATIM_USER_AGENT`),
  ~1 req/s, no autocomplete. Don't batch-hammer the public server.
- **Mapbox GL JS**: `style.load` fires on initial load and after every `setStyle()`, so all
  sources/layers are re-added there from refs; the theme effect must skip its first run.
- **`Intl.DateTimeFormat`**: always pass an explicit `timeZone`; use `hourCycle: "h23"`.

## Working notes

- Project skills live in `.claude/skills/`.
- Keep secrets out of the repo: `.env` is gitignored; `.env.example` holds placeholders only.
