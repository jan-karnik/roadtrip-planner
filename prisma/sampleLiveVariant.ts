/**
 * Default live Variant seeded by `prisma/seed.ts`: a 17-night US West Coast
 * loop (SFO → coast → Sierra → LA → Route 66 → Grand Circle → US-395 →
 * Yosemite → SFO). Lodging names are fictional samples — no reservation URLs
 * or street addresses.
 */

export type SampleStop = {
  name: string;
  shortName: string | null;
  lat: number;
  lng: number;
  nights: number;
  status: "PLANNED" | "SKIPPED";
  isHotel?: boolean;
  address?: string | null;
  url?: string | null;
};

export const SAMPLE_TRIP = {
  name: "USA West Coast — sample trip",
  slug: "usa-west-coast-sample",
  description:
    "17-night demo loop (SFO-local): arrive 14 Aug 18:00, depart 31 Aug 13:00. " +
    "Seeded for open-source — not a real booking.",
  start: { y: 2026, m: 8, d: 14, h: 18 },
  end: { y: 2026, m: 8, d: 31, h: 13 },
} as const;

export const SAMPLE_LIVE_STOPS: SampleStop[] = [
  { name: "San Francisco, California, United States", shortName: "San Francisco", lat: 37.7749, lng: -122.4194, nights: 0, status: "PLANNED" },
  { name: "Gilroy Gateway Inn (sample)", shortName: "Gilroy Gateway Inn", lat: 37.0058, lng: -121.5683, nights: 1, status: "PLANNED", isHotel: true, address: "Gilroy, CA", url: null },
  { name: "Monterey, Monterey County, California, United States", shortName: "Monterey", lat: 36.6002, lng: -121.8947, nights: 0, status: "PLANNED" },
  { name: "Pfeiffer Big Sur State Park, Big Sur Village, Monterey County, California, United States", shortName: "Pfeiffer Big Sur State Park", lat: 36.2533, lng: -121.7833, nights: 0, status: "PLANNED" },
  { name: "Cambria, San Luis Obispo County, California, United States", shortName: "Cambria", lat: 35.5641, lng: -121.0807, nights: 0, status: "PLANNED" },
  { name: "Central Coast Inn Paso Robles (sample)", shortName: "Central Coast Inn", lat: 35.6266, lng: -120.691, nights: 1, status: "PLANNED", isHotel: true, address: "Paso Robles, CA", url: null },
  { name: "Ash Mountain Park Entrance, Generals Highway, Tulare County, California, United States", shortName: "Ash Mountain", lat: 36.4864, lng: -118.8253, nights: 0, status: "PLANNED" },
  { name: "General Sherman Tree, Sherman Tree Trail, Tulare County, California, United States", shortName: "General Sherman Tree", lat: 36.5819, lng: -118.7514, nights: 0, status: "PLANNED" },
  { name: "Kings Canyon Overlook, Generals Highway, Tulare County, California, United States", shortName: "Kings Canyon Overlook", lat: 36.791, lng: -118.675, nights: 0, status: "PLANNED" },
  { name: "Sierra Foothills Lodge Visalia (sample)", shortName: "Sierra Foothills Lodge", lat: 36.3302, lng: -119.2921, nights: 1, status: "PLANNED", isHotel: true, address: "Visalia, CA", url: null },
  { name: "Bakersfield, Kern County, California, United States", shortName: "Bakersfield", lat: 35.3739, lng: -119.0195, nights: 0, status: "PLANNED" },
  { name: "Santa Clarita, Los Angeles County, California, United States", shortName: "Santa Clarita", lat: 34.3917, lng: -118.5426, nights: 0, status: "PLANNED" },
  { name: "Santa Monica Pier, Downtown Santa Monica, Los Angeles, California, United States", shortName: "Santa Monica Pier", lat: 34.0086, lng: -118.4987, nights: 0, status: "PLANNED" },
  { name: "Beverly Hills, Los Angeles County, California, United States", shortName: "Beverly Hills", lat: 34.0736, lng: -118.4004, nights: 0, status: "PLANNED" },
  { name: "Walk of Fame, Hollywood Boulevard, Hollywood, Los Angeles, California, United States", shortName: "Walk of Fame", lat: 34.1016, lng: -118.3267, nights: 0, status: "PLANNED" },
  { name: "Griffith Observatory, 2800, East Observatory Road, Los Angeles, California, United States", shortName: "Griffith Observatory", lat: 34.1184, lng: -118.3004, nights: 0, status: "PLANNED" },
  { name: "Los Angeles, Los Angeles County, California, United States", shortName: "Los Angeles", lat: 34.0522, lng: -118.2437, nights: 0, status: "PLANNED" },
  { name: "Harbor View Inn Whittier (sample)", shortName: "Harbor View Inn", lat: 33.9792, lng: -118.0328, nights: 1, status: "PLANNED", isHotel: true, address: "Whittier, CA", url: null },
  { name: "Valley of Fire State Park, Moapa Valley, Clark County, Nevada, United States", shortName: "Valley of Fire State Park", lat: 36.4819, lng: -114.528, nights: 0, status: "PLANNED" },
  { name: "Oro Grande, San Bernardino County, California, United States", shortName: "Oro Grande", lat: 34.5961, lng: -117.3359, nights: 0, status: "PLANNED" },
  { name: "Desert Route Inn Barstow (sample)", shortName: "Desert Route Inn", lat: 34.8986, lng: -117.0244, nights: 1, status: "PLANNED", isHotel: true, address: "Barstow, CA", url: null },
  { name: "Oatman, Mohave County, Arizona, United States", shortName: "Oatman", lat: 35.0261, lng: -114.3833, nights: 0, status: "PLANNED" },
  { name: "Peach Springs, Mohave County, Arizona, United States", shortName: "Peach Springs", lat: 35.5278, lng: -113.426, nights: 0, status: "PLANNED" },
  { name: "New Kingman-Butler, Mohave County, Arizona, United States", shortName: "Kingman", lat: 35.1894, lng: -114.053, nights: 0, status: "PLANNED" },
  { name: "Grand Canyon Village, Coconino County, Arizona, United States", shortName: "Grand Canyon Village", lat: 36.0544, lng: -112.1401, nights: 0, status: "PLANNED" },
  { name: "South Rim Gateway Inn (sample)", shortName: "South Rim Gateway Inn", lat: 35.9728, lng: -112.126, nights: 1, status: "PLANNED", isHotel: true, address: "Tusayan, AZ", url: null },
  { name: "Desert View Watchtower, Bus Loading, Coconino County, Arizona, United States", shortName: "Desert View Watchtower", lat: 36.0464, lng: -111.8232, nights: 0, status: "PLANNED" },
  { name: "Forrest Gump Pullover & Viewpoint, San Juan County Road 432, San Juan County, Utah, United States", shortName: "Monument Valley viewpoint", lat: 37.1016, lng: -110.097, nights: 0, status: "PLANNED" },
  { name: "Monument Valley Navajo Tribal Park, Navajo County, Arizona, United States", shortName: "Monument Valley", lat: 36.985, lng: -110.095, nights: 0, status: "PLANNED" },
  { name: "Lake Powell Base Inn Page (sample)", shortName: "Lake Powell Base Inn", lat: 36.9147, lng: -111.4558, nights: 1, status: "PLANNED", isHotel: true, address: "Page, AZ", url: null },
  { name: "Horseshoe Bend, Page, Coconino County, Arizona, United States", shortName: "Horseshoe Bend", lat: 36.879, lng: -111.5103, nights: 0, status: "PLANNED" },
  { name: "Lower Antelope Canyon, Page, Coconino County, Arizona, United States", shortName: "Antelope Canyon", lat: 36.8619, lng: -111.3743, nights: 0, status: "PLANNED" },
  { name: "Toadstool Hoodoo, Toadstool Hoodoos Trail, Kane County, Utah, United States", shortName: "Toadstool Hoodoos", lat: 37.108, lng: -111.827, nights: 0, status: "PLANNED" },
  { name: "Bryce Canyon National Park, Tropic, Garfield County, Utah, United States", shortName: "Bryce Canyon National Park", lat: 37.593, lng: -112.1871, nights: 0, status: "PLANNED" },
  { name: "Bryce Canyon Village Inn (sample)", shortName: "Bryce Canyon Village Inn", lat: 37.628, lng: -112.167, nights: 1, status: "PLANNED", isHotel: true, address: "Bryce, UT", url: null },
  { name: "Zion Canyon Lodge Springdale (sample)", shortName: "Zion Canyon Lodge", lat: 37.188, lng: -112.998, nights: 2, status: "PLANNED", isHotel: true, address: "Springdale, UT", url: null },
  { name: "Strip View Hotel Las Vegas (sample)", shortName: "Strip View Hotel", lat: 36.1147, lng: -115.1728, nights: 1, status: "PLANNED", isHotel: true, address: "Las Vegas, NV", url: null },
  { name: "Eastern Sierra Motel Bishop (sample)", shortName: "Eastern Sierra Motel", lat: 37.3637, lng: -118.3952, nights: 1, status: "PLANNED", isHotel: true, address: "Bishop, CA", url: null },
  { name: "Alabama Hills National Scenic Area, Lone Pine, Inyo County, California, United States", shortName: "Alabama Hills", lat: 36.6309, lng: -118.1259, nights: 0, status: "PLANNED" },
  { name: "Manzanar National Historic Site, Inyo County, California, United States", shortName: "Manzanar", lat: 36.728, lng: -118.1547, nights: 0, status: "PLANNED" },
  { name: "Mammoth Lakes, Mono County, California, United States", shortName: "Mammoth Lakes", lat: 37.6485, lng: -118.972, nights: 0, status: "PLANNED" },
  { name: "Lee Vining, Mono County, California, United States", shortName: "Lee Vining", lat: 37.958, lng: -119.119, nights: 0, status: "PLANNED" },
  { name: "Mono Lake, Lee Vining, Mono County, California, United States", shortName: "Mono Lake", lat: 38.013, lng: -119.009, nights: 0, status: "PLANNED" },
  { name: "Yosemite Valley Lodge (sample)", shortName: "Yosemite Valley Lodge", lat: 37.739, lng: -119.588, nights: 1, status: "PLANNED", isHotel: true, address: "El Portal, CA", url: null },
  { name: "Yosemite National Park, California, United States", shortName: "Yosemite National Park", lat: 37.8651, lng: -119.5383, nights: 0, status: "PLANNED" },
  { name: "Gold Country Casino Hotel (sample)", shortName: "Gold Country Casino Hotel", lat: 37.962, lng: -120.233, nights: 1, status: "PLANNED", isHotel: true, address: "Tuolumne, CA", url: null },
  { name: "Bay Bridge Inn San Francisco (sample)", shortName: "Bay Bridge Inn", lat: 37.801, lng: -122.419, nights: 3, status: "PLANNED", isHotel: true, address: "San Francisco, CA", url: null },
  { name: "San Francisco, California, United States", shortName: "San Francisco", lat: 37.7749, lng: -122.4194, nights: 0, status: "PLANNED" },
];
