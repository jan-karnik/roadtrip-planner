"use client";

import { useEffect, useState } from "react";

// Renders `children` only when a media query matches — a *mounting* gate, not a
// CSS one. `hidden md:block` would still mount the map planner on a phone and
// pull down mapbox-gl plus tiles over mobile data, which is exactly what the
// on-the-go screen must not do. The match is resolved after mount (matchMedia
// doesn't exist during SSR), so `fallback` covers the first frame.
export function ViewportGate({
  query,
  children,
  fallback = null,
}: {
  query: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const [matches, setMatches] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia(query);
    const sync = () => setMatches(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [query]);

  if (matches === null) return <>{fallback}</>;
  return matches ? <>{children}</> : null;
}
