import { PrayTimes } from './praytimes.js';

/**
 * Generate a shareable image (SVG) for a specific day's prayer times
 */

function getTimezoneOffset(timezoneName, date) {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezoneName,
      timeZoneName: 'shortOffset'
    });
    const parts = formatter.formatToParts(date);
    const tzPart = parts.find(p => p.type === 'timeZoneName');
    if (tzPart) {
      const match = tzPart.value.match(/GMT([+-]?)(\d+)(?::(\d+))?/);
      if (match) {
        const sign = match[1] === '-' ? -1 : 1;
        const hours = parseInt(match[2], 10);
        const minutes = match[3] ? parseInt(match[3], 10) : 0;
        return sign * (hours + minutes / 60);
      }
    }
    return 0;
  } catch (e) {
    return 0;
  }
}

function formatDate(date) {
  const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

function getRamadanDay(date) {
  const RAMADAN_START = new Date(2026, 1, 18); // Feb 18 - first full day of fasting
  const diffTime = date.getTime() - RAMADAN_START.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1;
}

export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);

  const lat = parseFloat(url.searchParams.get('lat')) || 40.7128;
  const lng = parseFloat(url.searchParams.get('lng')) || -74.0060;
  const dateParam = url.searchParams.get('date');
  const timezone = url.searchParams.get('timezone') || 'America/New_York';
  const location = url.searchParams.get('location') || 'New York';

  let date;
  if (dateParam) {
    // Support both YYYY-MM-DD and legacy timestamp formats
    if (dateParam.includes('-')) {
      const [y, m, d] = dateParam.split('-').map(Number);
      date = new Date(y, m - 1, d);
    } else {
      date = new Date(parseInt(dateParam, 10) * 1000);
    }
  } else {
    date = new Date();
  }

  const tzOffset = getTimezoneOffset(timezone, date);
  const pt = new PrayTimes('ISNA');
  const dateArray = [date.getFullYear(), date.getMonth() + 1, date.getDate()];
  const times = pt.getTimes(dateArray, [lat, lng], tzOffset, 0, '12h');

  const dateStr = formatDate(date);
  const ramadanDay = getRamadanDay(date);

  // Generate SVG
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1a2e"/>
      <stop offset="100%" style="stop-color:#0f0f1a"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Crescent Moon -->
  <path d="M1050 80c-44.18 0-80 35.82-80 80s35.82 80 80 80c11.05 0 21.58-2.24 31.16-6.29-21.55-11.71-36.16-34.68-36.16-61.21 0-38.66 31.34-70 70-70 4.22 0 8.36.39 12.36 1.14C1113.38 85.22 1083.49 80 1050 80z" fill="#fbbf24" opacity="0.3"/>

  <!-- Header -->
  <text x="80" y="100" font-family="system-ui, -apple-system, sans-serif" font-size="42" font-weight="700" fill="#ffffff">
    Ramadan رَمَضَان
  </text>
  <rect x="400" y="70" width="80" height="40" rx="20" fill="#fbbf24"/>
  <text x="440" y="98" font-family="system-ui, sans-serif" font-size="20" font-weight="600" fill="#0f0f0f" text-anchor="middle">2026</text>

  <!-- Date -->
  <text x="80" y="170" font-family="system-ui, sans-serif" font-size="32" fill="#9ca3af">${dateStr}</text>
  <text x="80" y="210" font-family="system-ui, sans-serif" font-size="24" fill="#6b7280">Day ${ramadanDay} of 31 • ${location}</text>

  <!-- Time Cards -->
  <rect x="80" y="260" width="320" height="160" rx="20" fill="#262626"/>
  <text x="240" y="310" font-family="system-ui, sans-serif" font-size="18" fill="#9ca3af" text-anchor="middle">☽ SEHRI</text>
  <text x="240" y="380" font-family="system-ui, sans-serif" font-size="56" font-weight="700" fill="#ffffff" text-anchor="middle">${times.fajr}</text>

  <rect x="440" y="260" width="320" height="160" rx="20" fill="#262626"/>
  <text x="600" y="310" font-family="system-ui, sans-serif" font-size="18" fill="#9ca3af" text-anchor="middle">☀ SUNRISE</text>
  <text x="600" y="380" font-family="system-ui, sans-serif" font-size="56" font-weight="700" fill="#ffffff" text-anchor="middle">${times.sunrise}</text>

  <rect x="800" y="260" width="320" height="160" rx="20" fill="#262626"/>
  <text x="960" y="310" font-family="system-ui, sans-serif" font-size="18" fill="#9ca3af" text-anchor="middle">🌅 IFTAAR</text>
  <text x="960" y="380" font-family="system-ui, sans-serif" font-size="56" font-weight="700" fill="#ffffff" text-anchor="middle">${times.maghrib}</text>

  <!-- Prayer Times Row -->
  <text x="80" y="490" font-family="system-ui, sans-serif" font-size="20" fill="#6b7280">
    Fajr ${times.fajr} • Dhuhr ${times.dhuhr} • Asr ${times.asr} • Maghrib ${times.maghrib} • Isha ${times.isha}
  </text>

  <!-- Footer -->
  <text x="80" y="580" font-family="system-ui, sans-serif" font-size="20" fill="#4b5563">ramadan-clock.pages.dev</text>
  <text x="1120" y="580" font-family="system-ui, sans-serif" font-size="16" fill="#4b5563" text-anchor="end">Built with 🥯, ☕, and ❤️</text>
</svg>`;

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
