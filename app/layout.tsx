import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { PreferencesProvider } from "@/components/prefs/PreferencesProvider";
import { PreferencesBar } from "@/components/prefs/PreferencesBar";
import { OnboardingOverlay } from "@/components/onboarding/OnboardingOverlay";
import { HelpButton } from "@/components/onboarding/HelpButton";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { t } from "@/lib/i18n";

export const metadata: Metadata = {
  title: t.app.name,
  description: "Collaborative travel itinerary planner",
};

// Phone-first: fill the notch area and keep pinch-zoom available (never disable
// user scaling — the on-the-go view is read in a moving car).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b0f17", // base-900
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="cs">
      <body className="min-h-screen">
        <PreferencesProvider>
          <header className="h-14 border-b border-base-700 bg-base-800/80 backdrop-blur">
            <div className="mx-auto flex h-full max-w-7xl items-center gap-2 px-3 sm:gap-3 sm:px-6">
              {/* The full title is a luxury a phone header can't afford. The
                  logo doubles as the way back to the home screen. */}
              <Link
                href="/"
                className="flex h-10 shrink-0 items-center rounded-md pr-1 text-lg font-semibold tracking-tight"
                aria-label={t.home.backToHome}
              >
                🛰️<span className="hidden sm:inline"> {t.app.name}</span>
              </Link>
              <nav className="flex items-center gap-1 text-sm sm:ml-4">
                {/* /live is the accent link and the only one a phone keeps in
                    the header — it's the screen that gets opened on the road,
                    and it needs a thumb-sized target. The planning routes are
                    reachable from the phone home screen instead. */}
                <Link
                  href="/live"
                  className="flex h-10 items-center whitespace-nowrap rounded-lg bg-accent/15 px-3 font-medium text-accent ring-1 ring-inset ring-accent/30 transition hover:bg-accent/25 active:bg-accent/30"
                >
                  {t.nav.live}
                </Link>
                {/* On a phone "/" is the home screen, so the planner link is
                    explicit about wanting the map. */}
                <Link
                  href="/?planner=1"
                  className="hidden h-10 items-center rounded-lg px-3 text-slate-300 transition hover:bg-base-700 hover:text-slate-100 sm:flex"
                >
                  {t.nav.map}
                </Link>
                <Link
                  href="/options"
                  className="hidden h-10 items-center rounded-lg px-3 text-slate-300 transition hover:bg-base-700 hover:text-slate-100 sm:flex"
                >
                  {t.nav.options}
                </Link>
                <Link
                  href="/create"
                  className="hidden h-10 items-center rounded-lg px-3 text-slate-300 transition hover:bg-base-700 hover:text-slate-100 sm:flex"
                >
                  {t.nav.create}
                </Link>
                <Link
                  href="/export"
                  className="hidden h-10 items-center rounded-lg px-3 text-slate-300 transition hover:bg-base-700 hover:text-slate-100 sm:flex"
                >
                  {t.nav.export}
                </Link>
              </nav>
              <div className="ml-auto flex items-center gap-1">
                <HelpButton />
                <PreferencesBar />
                <LogoutButton />
              </div>
            </div>
          </header>
          <main>{children}</main>
          <OnboardingOverlay />
        </PreferencesProvider>
      </body>
    </html>
  );
}
