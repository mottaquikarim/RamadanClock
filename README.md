# Ramadan Clock

A progressive web app for viewing Sehri (pre-dawn meal) and Iftaar (sunset meal) times during Ramadan — designed to work offline, underground, and anywhere you need it.

![Ramadan Clock Icon](out/icons/icon-192.svg)

## The Story

This app was originally built in 2017/2018 for my mother, who needed to check Iftaar times while commuting on the NYC subway. Underground with no cell service, she couldn't look up when to break her fast. The solution? A simple, offline-capable web app that caches prayer times so they're always available — even in the tunnels beneath Manhattan.

What started as a quick utility for one person has grown into a full-featured Ramadan companion app.

## Features

### Core Functionality
- **Accurate Prayer Times** — Calculates all five daily prayer times plus Sehri and Iftaar using the PrayTimes algorithm
- **7 Calculation Methods** — ISNA, Muslim World League, Egypt, Makkah, Karachi, Tehran, and Jafari
- **Location-Aware** — Automatically detects your location or allows manual coordinates entry
- **Timezone Support** — Automatically adjusts to your local timezone

### Offline Support
- **Works Underground** — Service worker caches prayer times for offline access
- **PWA Installable** — Add to your home screen for a native app experience
- **Smart Caching** — 24-hour cache for prayer times, intelligent fallbacks when offline

### Navigation & Calendar
- **Day-by-Day Navigation** — Browse through each day of Ramadan
- **Quick Day Strip** — Fast access to upcoming days
- **Full Month View** — See the entire Ramadan calendar at a glance
- **Calendar Integration** — Export times to your phone's calendar (single day or all prayers)

### Sharing
- **Daily Share Cards** — Generate beautiful images of daily prayer times
- **Monthly Calendar Images** — Create shareable calendar grids for the full month
- **Social Media Ready** — Optimized images with Open Graph tags

### Customization
- **Light & Dark Mode** — Toggle between themes, preference saved locally
- **Adjustable Start Date** — Accommodate community differences in moon sighting
- **12/24 Hour Format** — Display times in your preferred format

## Screenshots

### Main View (Dark Mode)
The app displays three prominent cards for Sehri, Sunrise, and Iftaar times, with full prayer times listed below.

```
┌─────────────────────────────────┐
│  🌙 Ramadan Clock         2026  │
├─────────────────────────────────┤
│  📍 New York, NY                │
│                                 │
│  ◄  Saturday, Feb 21  ►         │
│      Ramadan Day 4              │
│                                 │
│  ┌─────────┐ ┌─────────┐        │
│  │  Sehri  │ │ Sunrise │        │
│  │  5:47am │ │  6:58am │        │
│  └─────────┘ └─────────┘        │
│       ┌───────────┐             │
│       │  Iftaar   │             │
│       │  5:42pm   │             │
│       └───────────┘             │
│                                 │
│  [Share]  [Add to Calendar]     │
│                                 │
│  Prayer Times                   │
│  Fajr ............... 5:47am   │
│  Dhuhr .............. 12:14pm  │
│  Asr ................ 3:28pm   │
│  Maghrib ............ 5:42pm   │
│  Isha ............... 7:02pm   │
└─────────────────────────────────┘
```

### Share Card
Generated SVG images feature a dark gradient background with gold accents, displaying times prominently for easy sharing.

### Month View
A calendar grid showing all 31 days of Ramadan with Iftaar times for each day.

## Tech Stack

- **Frontend:** Vanilla HTML, CSS, JavaScript (no frameworks)
- **Styling:** Tailwind CSS
- **Backend:** Cloudflare Functions (serverless)
- **Hosting:** Cloudflare Pages
- **Prayer Calculation:** PrayTimes.js library
- **Image Generation:** html-to-image library

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/RamadanClock.git
cd RamadanClock

# Install dependencies
npm install
```

### Development

```bash
# Start local development server
npm run dev
```

This starts the Wrangler dev server at `http://localhost:8788` with the API endpoints available.

### Deployment

```bash
# Deploy to Cloudflare Pages
npm run deploy
```

## API Endpoints

### `GET /api/prayer-times`
Returns prayer times for a specific date and location.

| Parameter | Type | Description |
|-----------|------|-------------|
| `lat` | number | Latitude (required) |
| `lng` | number | Longitude (required) |
| `date` | string | Date in YYYY-MM-DD format (optional) |
| `timezone` | string | IANA timezone (default: America/New_York) |
| `method` | string | Calculation method (default: ISNA) |
| `format` | string | '12h' or '24h' (default: '12h') |

### `GET /api/location`
Returns geolocation data based on the request's IP address.

### `GET /api/share-image`
Generates a shareable SVG image of prayer times.

## Calculation Methods

| Method | Organization |
|--------|--------------|
| ISNA | Islamic Society of North America |
| MWL | Muslim World League |
| Egypt | Egyptian General Authority of Survey |
| Makkah | Umm Al-Qura University, Makkah |
| Karachi | University of Islamic Sciences, Karachi |
| Tehran | Institute of Geophysics, Tehran |
| Jafari | Shia Ithna-Ashari |

## Project Structure

```
RamadanClock/
├── out/                    # Static site output
│   ├── index.html          # Main application
│   ├── manifest.json       # PWA manifest
│   ├── sw.js               # Service worker
│   └── icons/              # App icons
├── functions/api/          # Cloudflare Functions
│   ├── prayer-times.js     # Prayer times endpoint
│   ├── praytimes.js        # PrayTimes algorithm
│   ├── location.js         # Geolocation endpoint
│   └── share-image.js      # Image generation
├── package.json
└── wrangler.toml           # Cloudflare config
```

## About PrayTimes.js

This app uses a modified version of the [PrayTimes](http://praytimes.org/) library for calculating Islamic prayer times based on astronomical formulas.

### History

The original PrayTimes library was written in Python by Saleem Shafi and Hamid Zarrabi-Zadeh at praytimes.org. It was later ported to JavaScript by Hamid Zarrabi-Zadeh. The upstream project appears to be largely abandoned at this point.

### Modifications

The version used in this project includes several fixes and modifications:

1. **Python Scope Bug Fix** — The original Python library had a scope issue that caused incorrect calculations in certain edge cases. This fix was applied in an earlier project ([PrayerApp](https://github.com/mottaquikarim/PrayerApp)) before being ported to JavaScript.

2. **Cloudflare Functions Port** — The library was adapted to work as an ES module for use with Cloudflare Functions, converting the original browser-based global namespace pattern to modern JavaScript exports.

3. **Edge Case Handling** — Added try/catch blocks for edge cases in sun angle calculations that could produce NaN values at extreme latitudes.

The library supports multiple calculation methods used by Islamic organizations worldwide, each with slightly different parameters for Fajr and Isha angles based on regional scholarly consensus.

## Credits

Built with love by Taq and Julianna.

Prayer times calculated using a modified version of [PrayTimes.js](http://praytimes.org/) (originally by Hamid Zarrabi-Zadeh).

## License

MIT License — feel free to use this for your own Ramadan apps!

---

*Ramadan Mubarak!* 🌙
