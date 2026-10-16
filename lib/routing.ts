import "server-only";

// Mapbox Directions wrapper for app code. SERVER-ONLY — uses the SECRET token
// (`sk.`), which must never reach the browser.
//
// The implementation lives in `./routing.core`, which carries no `server-only`
// guard so offline tsx scripts can reuse it. This module is the boundary: keep
// importing THIS one from anything under app/ or components/.

export {
  fetchDirections,
  legCacheKey,
  resolveRoutes,
} from "./routing.core";
