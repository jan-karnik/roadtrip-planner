// UI display language is Czech (cs). Development language stays English:
// all keys, identifiers, and comments are English; only the *values* are Czech.
// Single locale for now, structured as a dictionary so a language switch can be
// added later. Every user-facing string in the app must come from here — do not
// hardcode display copy in components.

/** Czech plural selection: 1 → one, 2–4 → few, else → many. */
export function plural(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n);
  if (abs === 1) return one;
  if (abs >= 2 && abs <= 4) return few;
  return many;
}

export const t = {
  app: {
    name: "Roadtrip Planner",
  },
  nav: {
    map: "Mapa",
    options: "Varianty",
    create: "Vytvořit",
    live: "Na cestě",
    export: "Export",
  },
  home: {
    liveCta: "Na cestě",
    liveCtaHint: "Dnešní nocleh, hotel, navigace a přejezd",
    liveCtaAction: "Otevřít",
    plannerCta: "Plánovací mapa",
    plannerCtaHint: "Celá trasa, úseky a časy jízdy",
    optionsCta: "Varianty",
    optionsCtaHint: "Uložené trasy",
    createCta: "Vytvořit",
    createCtaHint: "Nová trasa od nuly",
    exportCta: "Export",
    exportCtaHint: "Kopírovatelný text s daty",
    tripWindow: (range: string, year: number) => `${range} ${year}`,
    beforeTrip: (n: number) =>
      n === 0
        ? "Cesta začíná dnes!"
        : `Cesta začíná za ${n} ${plural(n, "den", "dny", "dní")}`,
    duringTrip: (day: number, total: number) => `${day}. den z ${total}`,
    afterTrip: "Cesta skončila",
    backToHome: "Domů",
  },
  time: {
    localAtStop: (formatted: string) => `Místní: ${formatted}`,
    localAtStopHint:
      "Místní čas u zastávky (Arizona bez letního času, Utah horský, Page/Navajo výjimka).",
  },
  prefs: {
    distance: "Vzdálenost",
    timezone: "Časové pásmo",
    mapTheme: "Mapa",
    mapThemeNight: "Noc",
    mapThemeDay: "Den",
  },
  itinerary: {
    arrive: "Přílet",
    depart: "Odlet",
    noTrip: "Žádný itinerář nenalezen. Spusťte ",
    noTripAfter: " pro načtení ukázkových dat.",
  },
  exportPage: {
    title: "Export trasy",
    hint: "Prostý text se zastávkami, denními přejezdy a hotely — vhodné pro offline tisk nebo vložení do chatu s AI.",
    copy: "Kopírovat",
    copied: "Zkopírováno",
    print: "Tisk / PDF",
  },
  stop: {
    moveUp: "Posunout nahoru",
    moveDown: "Posunout dolů",
    markVisited: "Označit jako navštívené",
    skip: "Vynechat zastávku",
    restore: "Obnovit na plánované",
    remove: "Odebrat zastávku",
    nights: "Počet nocí",
    addNight: "Přidat noc",
    removeNight: "Ubrat noc",
    bookedNights: (n: number) =>
      `${n} ${plural(n, "noc rezervována", "noci rezervovány", "nocí rezervováno")} — nelze snížit`,
  },
  addStop: {
    heading: "Přidat zastávku",
    searchPlaceholder: "Hledat místo (z projektu nebo online)…",
    searchOnline: "Hledat online",
    searching: "Hledám…",
    inAppMatches: "Místa v projektu",
    onlineResults: "Výsledky online",
    add: "Přidat do trasy",
    alreadyAdded: "Již v trase",
    noMatches: (q: string) =>
      `V projektu nic neodpovídá „${q}". Zkuste hledat online.`,
    noResults: (q: string) => `Pro „${q}" nebylo nalezeno žádné místo.`,
    searchError: "Vyhledávání se nezdařilo. Zkuste to znovu.",
    insertHere: "Vložit zastávku sem",
    insertingAfter: (name: string) => `Vkládám za: ${name}`,
    insertingAtStart: "Vkládám na začátek trasy",
    cancelInsert: "Zrušit vkládání",
  },
  status: {
    PLANNED: "Plánováno",
    VISITED: "Navštíveno",
    SKIPPED: "Vynecháno",
  },
  map: {
    title: "Mapa a glóbus",
    placeholder: (n: number) =>
      `${n} ${plural(n, "zastávka připravena", "zastávky připraveny", "zastávek připraveno")} k vykreslení. ` +
      "Otevřete plnou mapu pro interaktivní trasu.",
    openFull: "Otevřít plnou mapu",
    subtitle:
      "Koncept itineráře — úpravy zde se neukládají do hlavního seznamu.",
    resetDraft: "Obnovit dle itineráře",
    draftRestored: "Obnoven neuložený koncept z prohlížeče",
    draftBadge: "Koncept",
    draftHeading: "Zastávky konceptu",
    draftNamePlaceholder: "Název konceptu…",
    legsHeading: "Úseky cesty",
    tabs: {
      route: "Trasa",
      days: "Dny",
    },
    passthrough: "Průjezd",
    togglePanel: "Zobrazit panel",
    pinDrop: "Přidat bod na mapě",
    pinDropHint: "Klepnutím na mapu přidáte bod",
    pinDropDone: "Hotovo",
    locate: "Moje poloha",
    locateOn: "Sledování zapnuto",
    locateDenied: "Poloha nepovolena — odhad podle času",
    locateEstimated: "Odhad podle času, ne GPS",
    customPointName: (lat: number, lng: number) =>
      `Bod ${lat.toFixed(2)}, ${lng.toFixed(2)}`,
    leg: (from: string, to: string) => `${from} → ${to}`,
    noLegs: "Přidejte alespoň dvě aktivní zastávky pro vykreslení trasy.",
    loadingRoutes: "Načítám trasy…",
    approx: "přibližně (silniční trasa nedostupná)",
    openInGoogleMaps: "Ověřit v Google Maps",
    exertion: {
      easy: "Pohodový",
      moderate: "Náročnější",
      hard: "Vyčerpávající",
    },
    // Colour grading is per travel day (nocleh → nocleh), not per hop.
    segmentTotal: "Celý úsek mezi noclehy",
    // Day badge drawn along each travel-day segment.
    today: "Dnes",
    tomorrow: "Zítra",
    segmentShort: (value: string) => `úsek ${value}`,
    tokenMissing:
      "Chybí přístupový token Mapboxu. Nastavte NEXT_PUBLIC_MAPBOX_TOKEN (veřejný pk. token) v souboru .env.",
    loadError: "Mapu se nepodařilo načíst.",
    totals: {
      distance: "Délka konceptu",
      time: "Čas jízdy",
      deltaVsItinerary: "Rozdíl oproti itineráři",
    },
  },
  options: {
    heading: "Varianty itineráře",
    subtitle:
      "Uložené návrhy tras seřazené podle času a vzdálenosti. Nový vytvoříte úpravou na mapě.",
    empty:
      "Zatím nejsou uložené žádné varianty. Sestavte trasu na mapě a uložte ji jako novou variantu.",
    rank: "Pořadí",
    sortBy: "Řadit podle",
    sortByTime: "Času jízdy",
    sortByDistance: "Vzdálenosti",
    totalDistance: "Celková vzdálenost",
    totalTime: "Celkový čas jízdy",
    stops: (n: number) =>
      `${n} ${plural(n, "zastávka", "zastávky", "zastávek")}`,
    activeStops: (n: number) =>
      `${n} ${plural(n, "aktivní zastávka", "aktivní zastávky", "aktivních zastávek")}`,
    loadOntoMap: "Načíst na mapu",
    expand: "Zobrazit zastávky",
    collapse: "Skrýt zastávky",
    viewing: (seq: number) => `Prohlížíte variantu #${seq}`,
    backToLive: "Zpět na nejkratší trasu",
    saveAsOption: "Uložit jako novou variantu",
    labelPlaceholder: "Název varianty (nepovinné)…",
    save: "Uložit",
    saveAsNew: "Uložit jako novou",
    saving: "Ukládám…",
    saved: (seq: number) => `Uloženo jako varianta #${seq}.`,
    saveError: "Variantu se nepodařilo uložit. Zkuste to znovu.",
    update: "Aktualizovat",
    updateVariant: (seq: number) => `Aktualizovat #${seq}`,
    updating: "Ukládám…",
    updated: (seq: number) => `Varianta #${seq} aktualizována.`,
    updateError: "Variantu se nepodařilo aktualizovat. Zkuste to znovu.",
    defaultLabel: (seq: number) => `Varianta #${seq}`,
    delete: "Smazat",
    confirmDelete: "Opravdu smazat tuto variantu?",
    compareLink: "Porovnat varianty",
    compare: {
      title: "Porovnání variant",
      subtitle:
        "Vyberte dvě uložené trasy — uvidíte rozdíl v km, čase jízdě, nocích a které zastávky jsou navíc.",
      variantA: "Varianta A",
      variantB: "Varianta B",
      choose: "— vyberte —",
      pickTwo: "Vyberte dvě různé varianty k porovnání.",
      sameVariant: "Zvolte dvě různé varianty.",
      summary: (a: string, b: string) => `${a} vs ${b}`,
      vsB: "B oproti A",
      nightsDelta: "Rozdíl nocí (B − A)",
      onlyInA: "Jen v A",
      onlyInB: "Jen v B",
      none: "Žádné",
      loadA: "Načíst A na mapu",
      loadB: "Načíst B na mapu",
    },
  },
  schedule: {
    heading: "Plán po dnech",
    expand: "Zobrazit plán po dnech",
    collapse: "Skrýt plán po dnech",
    driveFrom: (name: string) => `Jízda z: ${name}`,
    driveLeg: (from: string, to: string) => `${from} → ${to}`,
    restDay: "Odpočinek / prohlídka",
    nightsOf: (total: number, trip: number) =>
      `${total} / ${trip} ${plural(trip, "noc", "noci", "nocí")}`,
    fitExact: "Přesně vychází",
    fitOver: (n: number) =>
      `o ${n} ${plural(n, "noc", "noci", "nocí")} více`,
    fitUnder: (n: number) =>
      `chybí ${n} ${plural(n, "noc", "noci", "nocí")}`,
    noWindow: "Období cesty není nastaveno – plán po dnech nelze sestavit.",
    navigateDrive: "Navigovat přejezd",
    openInGoogleMaps: "Google Maps",
    openInAppleMaps: "Apple Maps",
  },
  live: {
    heading: "Na cestě",
    tonight: "Dnes v noci",
    tonightAt: "Dnes spíme",
    firstNight: "První noc",
    lastNight: "Poslední noc",
    nextUp: "Následuje",
    stayLabel: "Ubytování",
    noBooking: "Ubytování zatím nezadáno",
    openInMaps: "Otevřít v Google Maps",
    callHotel: "Zavolat",
    openBooking: "Rezervace",
    todayDrive: "Dnešní přejezd",
    noDrive: "Bez přejezdu — zůstáváme na místě",
    navigateTodayDrive: "Navigovat dnešní trasu",
    openInAppleMaps: "Apple Maps",
    booked: "Rezervováno",
    previous: "Předchozí noci",
    upcoming: "Další noci",
    showAll: "Zobrazit vše",
    showLess: "Zobrazit méně",
    startsIn: (n: number) =>
      n === 0
        ? "Cesta začíná dnes!"
        : `Cesta začíná za ${n} ${plural(n, "den", "dny", "dní")}`,
    tripOver: "Cesta skončila. Šťastný návrat!",
    noNights: "Itinerář zatím neobsahuje žádné noci.",
    nightOf: (n: number, total: number) => `${n}. noc z ${total}`,
    gps: {
      locate: "Zjistit moji polohu",
      locating: "Zjišťuji polohu…",
      refresh: "Aktualizovat polohu",
      toDestination: (name: string) => `Odsud do: ${name}`,
      directLine: "vzdušnou čarou",
      driving: "autem",
      arrivalAt: "Příjezd",
      denied:
        "Přístup k poloze byl zamítnut. Povolte ho v nastavení prohlížeče.",
      unavailable: "Poloha není v tomto prohlížeči dostupná.",
      failed: "Polohu se nepodařilo zjistit.",
      routeFailed: "Trasu z vaší polohy se nepodařilo spočítat.",
    },
  },
  units: {
    nights: (n: number) => `${n} ${plural(n, "noc", "noci", "nocí")}`,
    duration: (hours: number) => {
      const total = Math.max(0, Math.round(hours * 60));
      const h = Math.floor(total / 60);
      const m = total % 60;
      if (h === 0) return `${m} min`;
      if (m === 0) return `${h} h`;
      return `${h} h ${m} min`;
    },
  },
  onboarding: {
    title: "Roadtrip Planner 🛰️",
    intro: "Plánovač cesty autem po zastávkách a nocích. Co tu najdeš:",
    featureMap: "celá trasa, délky úseků a časy jízdy.",
    featureMapEmoji: "🗺️",
    featureMapLabel: "Mapa",
    featureDraft: "přetahuj zastávky, přidávej noci a zkoušej varianty — nic se neukládá bez potvrzení.",
    featureDraftEmoji: "✏️",
    featureDraftLabel: "Koncept",
    featureDays: "plán den po dni podle toho, kde přespíš.",
    featureDaysEmoji: "📅",
    featureDaysLabel: "Dny",
    dismiss: "Rozumím",
    helpButton: "Nápověda",
  },
  auth: {
    heading: "Přihlásit se",
    subtitle: "Ukázková aplikace — přihlaste se pro přístup",
    username: "Uživatelské jméno",
    password: "Heslo",
    submit: "Přihlásit",
    submitting: "Přihlašuji…",
    logout: "Odhlásit",
    error: "Nesprávné jméno nebo heslo.",
    notConfigured: "Přihlášení není na serveru nastaveno (AUTH_USERNAME / AUTH_PASSWORD / AUTH_SESSION_TOKEN).",
  },
  errors: {
    minChars: "Zadejte alespoň 2 znaky.",
    geocodeUnavailable: "Služba geokódování není dostupná. Zkuste to znovu.",
    searchUnavailable: "Vyhledávání není dostupné. Zkuste to znovu.",
    notFound: (q: string) => `Pro „${q}" nebylo nalezeno žádné místo.`,
    invalidStop: "Neplatná zastávka.",
    invalidStatus: "Neplatný stav.",
    invalidReorder: "Neplatné přeřazení.",
    stopNotFound: "Zastávka nenalezena.",
    alreadyInTrip: (name: string) => `„${name}" je již v itineráři.`,
    similarAlreadyInTrip: (existing: string, incoming: string) =>
      `„${incoming}" je příliš podobné existující zastávce „${existing}".`,
    tripNotFound: "Itinerář nenalezen.",
    invalidOption: "Neplatná varianta.",
    tooFewStops: "Pro uložení varianty jsou potřeba alespoň dvě aktivní zastávky.",
    nightFitOff: (have: number, need: number) =>
      `Počet nocí (${have}) neodpovídá oknu cesty (${need}). Upravte noci u zastávek nebo zkontrolujte záložku Dny.`,
    arrivalDriveTooLong: (hours: number, cap: number) =>
      `Příjezdový den je moc dlouhý na cestě (${hours.toFixed(1)} h, max ${cap} h). Zkrátěte první úsek nebo přesuňte první noc blíž k letišti.`,
    dailyDriveTooLong: (hours: number, cap: number) =>
      `Jeden den na trase přesahuje bezpečný limit jízdy (${hours.toFixed(1)} h, max ${cap} h). Rozdělte přejezd nebo přidejte mezizastávku.`,
    bookedNightsBelow: (name: string, booked: number) =>
      `U „${name}" jsou rezervované ${booked} ${plural(booked, "noc", "noci", "nocí")} — nelze snížit počet nocí pod rezervaci.`,
    bookedStopSkipped: (name: string) =>
      `„${name}" má rezervované ubytování — nelze zastávku přeskočit.`,
    softDailyDrive: (hours: number, target: number) =>
      `Náročný den na trase: ${hours.toFixed(1)} h jízdy (doporučený cíl pod ${target} h).`,
  },
} as const;
