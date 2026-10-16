---
name: generate-itinerary
description: Turn a brainstormed list of place names into a real itinerary in the roadtrip-planner app — geocoded (Nominatim) with road distance/time totals (Mapbox). Use when the user pastes/describes a candidate route (e.g. "SFO → Yosemite → Vegas → LA") and wants it saved as a comparable option (default) or written into the master itinerary.
---

# generate-itinerary skill

Bridges a brainstorming session and the app: the user gives a list of places (in any
form — bullet list, arrow chain, prose), and you turn it into an itinerary built exactly
the way the app builds one — Nominatim-normalized titles + coordinates (`lib/geocode.ts`)
and real road totals (`lib/legs.ts` + Mapbox Directions). The work is done by
`scripts/generate-itinerary.ts`, run via `npm run itinerary:generate`.

## When to invoke

The user:
- pastes or describes a candidate route ("SFO - Sequoia - LA - Joshua - Grand Canyon …"),
- says "make this an itinerary / option", "add this route", "compare this option",
- types `/generate-itinerary`.

## What to do

### 1. Normalize the route into a clean place list
Convert the user's input into **one geocodable place per line, in travel order**:
- Split combined stops ("Zion+Bryce" → two lines: `Zion National Park`, `Bryce Canyon National Park`).
- Resolve loose names to searchable ones ("Joshua" → `Joshua Tree National Park`, "Tahoe" → `Lake Tahoe`, "SFO" → `San Francisco`). Keep them specific enough that Nominatim's top hit is right (it's biased to CA/NV/UT/AZ but not bounded).
- Drop travel-mode noise that isn't a stop ("via route 50", "the final Big Sur drive") — but **keep real waypoints** it implies (e.g. "south through Yosemite to Cambria" → `Yosemite National Park`, then `Cambria, California`, then `Big Sur`).
- If the route returns to the start, repeat the start as the last line (a loop).
- Prefix a line with `-` to mark it **SKIPPED** (kept in the snapshot, excluded from the route — mirrors the app's skip).
- Add a trailing `| N` to set **nights** slept at that stop (default 0), e.g.
  `San Francisco | 2`, `Bishop, California | 1`. Nights drive the day-by-day schedule
  (`lib/schedule.ts`, the `/options` night-fit badge and the map "Dny" tab); they never affect
  routing. For a fixed-window trip, the sum of nights should equal the trip's night budget.
- Lines starting with `#` and blank lines are ignored (comments).

Write the list to a temp file (e.g. `/tmp/route.txt`) — easiest for multi-line input.

### 2. Show the user the normalized list and confirm
Briefly echo how you mapped their input to place names (especially any splits/guesses), so they can correct a wrong guess before you geocode.

### 3. Run the generator
Default = save as a comparable **option** (shows up ranked at `/options`):

```bash
npm run itinerary:generate -- --file /tmp/route.txt --label "Short descriptive name"
```

Useful flags (pass after `--`):
- `--dry-run` — geocode + compute totals and print, but write nothing. Good for a first pass.
- `--label "…"` — name the option (else it's just `#N`).
- `--replace-seq <n>` — overwrite the existing option with seq `#n` **in place** (keeps its
  number; cascade-replaces its stops). Use this to update a saved variant rather than piling up a
  new `#N`. Without it, option mode always appends a fresh `seq`.
- `--master` — write into the **master** itinerary (`Trip` + `ItineraryStop`) instead of an option. Appends by default; add `--replace` to wipe the trip's existing stops first. **`--replace` is destructive — confirm with the user.**
- `--trip <slug|id>` — target a specific trip (default: the first/only trip).
- You can also pass names directly: `npm run itinerary:generate -- "Big Sur" "Death Valley"`.

### Expanding a route with overnight-rest stops
A common follow-up: a route lists only the marquee sights, but some legs are too long to drive in
a day. Insert realistic stopover towns (slightly off the touristy hub, cheaper lodging) on any leg
over ~5–6 h / ~500 km, give each `| 1` night, and **rebalance** so the night total still matches
the trip window (steal a night from a multi-night sight on the same corridor). Then re-save the
variant in place with `--replace-seq <n>`.

The script is polite to Nominatim (~1 request/second), so a long list takes a few seconds.

> **Verify the night total after every save.** Transient Nominatim misses can silently drop a
> stop (a `no match — skipping` line), which lowers the saved option's nights. After saving,
> re-query the option and confirm Σ nights equals the trip's night budget; if a stop dropped, re-run with `--replace-seq`.

### 4. Report back
Tell the user what was created: the option `#N` (+ label), active stop count, total
distance + driving time, and that they can compare it at `/options` (or load it onto the
map there). Flag any place that didn't geocode (it's skipped) and any leg that fell back to
a straight-line/mock estimate (no road route, or `MAPBOX_API_KEY` unset).

## Notes / gotchas
- Prefer `--dry-run` first when the list is ambiguous — cheaper than creating then deleting an option.
- Options are **frozen snapshots** (denormalized) — re-running creates a new `#N`; it never edits the live itinerary. Delete unwanted options from `/options`.
- Totals are computed server-side-style from the same routing the app uses and are `Leg`-cached, so options created here render instantly on the map.
- The script loads `.env` itself (needs `DATABASE_URL`, `NOMINATIM_USER_AGENT`, `MAPBOX_API_KEY`).

## Key files
| File | Purpose |
|------|---------|
| `scripts/generate-itinerary.ts` | The generator (geocode → totals → DB). |
| `lib/geocode.ts` | Nominatim normalization (reused). |
| `lib/legs.ts` | `assembleLegs`/`activeLegPoints`/`pairsFrom` for totals (reused). |
| `app/actions/options.ts` | The app's equivalent `saveOption` (same shape). |
| `prisma/schema.prisma` | `ItineraryOption` / `OptionStop` models. |
