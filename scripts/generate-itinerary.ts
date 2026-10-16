/**
 * Generate an itinerary from a brainstormed list of place names — the same way
 * the app builds one (Nominatim-normalized titles + coords, real road totals).
 *
 * It is meant to bridge a "brainstorming" session (where you jot down candidate
 * places) and this app: feed the list in, get a real, comparable itinerary out.
 *
 * Two output modes:
 *   --option   (default)  Create a saved ItineraryOption on the trip, with totals
 *                         computed from real Mapbox Directions routing (Leg-cached,
 *                         falling back to straight-line + mock time when routing is
 *                         unavailable). Shows up ranked at /options for comparison.
 *   --master              Write the places into the master itinerary (Trip +
 *                         ItineraryStop). Appends by default; --replace wipes the
 *                         trip's existing stops first.
 *
 * Input (one place per line; from --file, stdin, or positional args):
 *   - blank lines and lines starting with `#` are ignored (comments)
 *   - a line starting with `-` marks that stop SKIPPED (kept, excluded from route)
 *   - a trailing `| N` sets the number of nights slept at that stop (default 0),
 *     e.g. `San Francisco | 2`, `Bishop, California | 1`. Nights drive the
 *     day-by-day schedule (lib/schedule.ts); they never affect routing.
 *
 * Usage:
 *   npm run itinerary:generate -- --file list.txt --label "Coastal route"
 *   npm run itinerary:generate -- --master --replace --file list.txt
 *   npm run itinerary:generate -- --file list.txt --replace-seq 1 --label "…"
 *   echo "San Francisco\nYosemite\n- Zion\nLas Vegas" | npm run itinerary:generate
 *   npm run itinerary:generate -- --dry-run "Big Sur" "Death Valley"
 *
 * This script reuses lib/geocode.ts (the single source of truth for normalized
 * titles), lib/legs.ts (route totals) and lib/routing.core.ts (Directions calls
 * + Leg cache — the `server-only`-free half of lib/routing.ts, made for exactly
 * this kind of offline script).
 */

import { readFileSync, existsSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { geocodePlace, type GeocodeResult } from "../lib/geocode";
import {
  assembleLegs,
  activeLegPoints,
  pairsFrom,
  type RouteResult,
} from "../lib/legs";
import { resolveRoutes } from "../lib/routing.core";

// --- .env loading (PrismaClient needs DATABASE_URL before construction; the
// Prisma CLI loads .env for `db seed`, but a bare `tsx` run does not). ---------
function loadEnv(path = ".env") {
  if (!existsSync(path)) return;
  for (const raw of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}
loadEnv();

const db = new PrismaClient();
const MAPBOX = process.env.MAPBOX_API_KEY ?? "";
const NOMINATIM_DELAY_MS = 1100; // be a good citizen: ~1 req/s

// --- CLI parsing --------------------------------------------------------------
type Mode = "option" | "master";
type Args = {
  mode: Mode;
  file?: string;
  label?: string;
  trip?: string;
  replace: boolean;
  replaceSeq?: number;
  dryRun: boolean;
  names: string[];
};

function parseArgs(argv: string[]): Args {
  const args: Args = { mode: "option", replace: false, dryRun: false, names: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case "--master":
        args.mode = "master";
        break;
      case "--option":
        args.mode = "option";
        break;
      case "--replace":
        args.replace = true;
        break;
      case "--replace-seq": {
        const n = Number(argv[++i]);
        if (!Number.isInteger(n) || n < 1) {
          console.error("--replace-seq expects a positive integer seq.");
          process.exit(1);
        }
        args.replaceSeq = n;
        break;
      }
      case "--dry-run":
        args.dryRun = true;
        break;
      case "--file":
        args.file = argv[++i];
        break;
      case "--label":
        args.label = argv[++i];
        break;
      case "--trip":
        args.trip = argv[++i];
        break;
      default:
        if (a.startsWith("--")) {
          console.error(`Unknown flag: ${a}`);
          process.exit(1);
        }
        args.names.push(a);
    }
  }
  return args;
}

type ParsedStop = {
  query: string;
  status: "PLANNED" | "SKIPPED";
  nights: number;
};

/**
 * Parse a single input token into a stop: `-` prefix marks SKIPPED, a trailing
 * `| N` sets nights (default 0). Returns null for empty/comment lines.
 */
function parseStopLine(raw: string): ParsedStop | null {
  let line = raw.trim();
  if (!line || line.startsWith("#")) return null;

  let nights = 0;
  const bar = line.lastIndexOf("|");
  if (bar !== -1) {
    const n = Number(line.slice(bar + 1).trim());
    if (Number.isInteger(n) && n >= 0) {
      nights = n;
      line = line.slice(0, bar).trim();
    }
  }

  const status = line.startsWith("-") ? "SKIPPED" : "PLANNED";
  const query = (status === "SKIPPED" ? line.slice(1) : line).trim();
  if (!query) return null;
  return { query, status, nights };
}

function parseList(text: string): ParsedStop[] {
  return text
    .split(/\r?\n/)
    .map(parseStopLine)
    .filter((s): s is ParsedStop => s !== null);
}

function readStdin(): string {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

async function gatherStops(args: Args): Promise<ParsedStop[]> {
  if (args.file) return parseList(readFileSync(args.file, "utf8"));
  if (args.names.length > 0)
    return args.names
      .map(parseStopLine)
      .filter((s): s is ParsedStop => s !== null);
  if (!process.stdin.isTTY) {
    const piped = readStdin();
    if (piped.trim()) return parseList(piped);
  }
  return [];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// --- Main ---------------------------------------------------------------------
type ResolvedStop = GeocodeResult & {
  status: "PLANNED" | "SKIPPED";
  nights: number;
};

async function geocodeAll(stops: ParsedStop[]): Promise<ResolvedStop[]> {
  const resolved: ResolvedStop[] = [];
  for (let i = 0; i < stops.length; i++) {
    const { query, status, nights } = stops[i];
    process.stdout.write(`  geocoding "${query}" … `);
    let geo: GeocodeResult | null = null;
    try {
      geo = await geocodePlace(query);
    } catch (e) {
      console.log(`error (${(e as Error).message})`);
    }
    if (geo) {
      const nightsNote = status === "SKIPPED" ? "  [skip]" : `  (${nights}n)`;
      console.log(`→ ${geo.shortName}${nightsNote}`);
      resolved.push({ ...geo, status, nights });
    } else if (geo === null) {
      console.log("no match — skipping");
    }
    if (i < stops.length - 1) await sleep(NOMINATIM_DELAY_MS); // Nominatim courtesy
  }
  return resolved;
}

async function findTrip(trip?: string) {
  if (trip) {
    return db.trip.findFirst({ where: { OR: [{ id: trip }, { slug: trip }] } });
  }
  return db.trip.findFirst({ orderBy: { createdAt: "asc" } });
}

async function computeTotals(stops: ResolvedStop[]) {
  const points = activeLegPoints(stops);
  const pairs = pairsFrom(points);
  const routes: RouteResult[] = await resolveRoutes(db, pairs);
  const legs = assembleLegs(points, routes);
  return {
    totalDistanceM: legs.reduce((a, l) => a + l.km * 1000, 0),
    totalDurationS: legs.reduce((a, l) => a + l.hours * 3600, 0),
    anyFallback: legs.some((l) => l.fallback),
    legCount: legs.length,
  };
}

const fmtKm = (m: number) => `${Math.round(m / 1000)} km`;
const fmtH = (s: number) => {
  const total = Math.round(s / 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
};

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const parsed = await gatherStops(args);

  if (parsed.length === 0) {
    console.error(
      "No places given. Provide --file <path>, pipe a list via stdin, or pass names as arguments.",
    );
    process.exit(1);
  }

  console.log(`\nResolving ${parsed.length} place(s) via Nominatim:`);
  const resolved = await geocodeAll(parsed);

  if (resolved.length === 0) {
    console.error("\nNothing geocoded — aborting.");
    process.exit(1);
  }

  const totals = await computeTotals(resolved);
  const activeCount = resolved.filter((s) => s.status !== "SKIPPED").length;
  const totalNights = resolved
    .filter((s) => s.status !== "SKIPPED")
    .reduce((a, s) => a + s.nights, 0);

  console.log(
    `\nRoute: ${activeCount} active stop(s), ${totals.legCount} leg(s), ` +
      `${fmtKm(totals.totalDistanceM)} · ${fmtH(totals.totalDurationS)} · ${totalNights} night(s)` +
      (totals.anyFallback ? "  (some legs straight-line/mock — no road route)" : "") +
      (!MAPBOX ? "  [MAPBOX_API_KEY not set → all legs mock]" : ""),
  );

  if (args.dryRun) {
    console.log("\n--dry-run: no changes written.");
    return;
  }

  const trip = await findTrip(args.trip);
  if (!trip) {
    console.error(
      "\nNo trip found. Run `npm run db:seed` first (or pass --trip <slug>).",
    );
    process.exit(1);
  }

  if (args.mode === "option") {
    let seq: number;
    let replaced = false;
    if (args.replaceSeq !== undefined) {
      // Overwrite the option with this seq in place (keeps its #N); cascade
      // deletes its OptionStops. Falls through to a normal create with the
      // same seq if no such option exists yet.
      const existing = await db.itineraryOption.findUnique({
        where: { tripId_seq: { tripId: trip.id, seq: args.replaceSeq } },
      });
      if (existing) {
        await db.itineraryOption.delete({ where: { id: existing.id } });
        replaced = true;
      }
      seq = args.replaceSeq;
    } else {
      const last = await db.itineraryOption.findFirst({
        where: { tripId: trip.id },
        orderBy: { seq: "desc" },
      });
      seq = (last?.seq ?? 0) + 1;
    }
    await db.itineraryOption.create({
      data: {
        tripId: trip.id,
        seq,
        label: args.label?.trim() || null,
        totalDistanceM: totals.totalDistanceM,
        totalDurationS: totals.totalDurationS,
        stops: {
          create: resolved.map((s, i) => ({
            order: i,
            name: s.name,
            shortName: s.shortName,
            lat: s.lat,
            lng: s.lng,
            nights: s.nights,
            status: s.status,
          })),
        },
      },
    });
    console.log(
      `\n✓ ${replaced ? "Replaced" : "Saved"} option #${seq}${args.label ? ` "${args.label}"` : ""} on "${trip.name}". Compare it at /options.`,
    );
    return;
  }

  // --master
  if (args.replace) {
    await db.itineraryStop.deleteMany({ where: { tripId: trip.id } });
    console.log(`\nCleared existing stops on "${trip.name}".`);
  }
  const existing = await db.itineraryStop.findFirst({
    where: { tripId: trip.id },
    orderBy: { order: "desc" },
  });
  let order = (existing?.order ?? -1) + 1;
  for (const s of resolved) {
    const place = await db.place.upsert({
      where: { osmId: s.osmId },
      update: {},
      create: {
        rawName: s.shortName,
        name: s.name,
        shortName: s.shortName,
        country: s.country,
        region: s.region,
        category: s.category,
        lat: s.lat,
        lng: s.lng,
        osmId: s.osmId,
      },
    });
    try {
      await db.itineraryStop.create({
        data: {
          tripId: trip.id,
          placeId: place.id,
          order: order++,
          nights: s.nights,
          status: s.status,
        },
      });
    } catch {
      console.log(`  (skipped duplicate: ${s.shortName})`);
    }
  }
  console.log(
    `\n✓ Wrote ${resolved.length} stop(s) into the master itinerary of "${trip.name}". See / and /itinerary.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
