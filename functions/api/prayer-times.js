import { PrayTimes } from './praytimes.js';

/**
 * Get timezone offset in hours for a given timezone name and date
 */
function getTimezoneOffset(timezoneName, date) {
  try {
    // Create a date formatter for the target timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezoneName,
      timeZoneName: 'shortOffset'
    });

    const parts = formatter.formatToParts(date);
    const tzPart = parts.find(p => p.type === 'timeZoneName');

    if (tzPart) {
      // Parse offset like "GMT-5" or "GMT+5:30"
      const match = tzPart.value.match(/GMT([+-]?)(\d+)(?::(\d+))?/);
      if (match) {
        const sign = match[1] === '-' ? -1 : 1;
        const hours = parseInt(match[2], 10);
        const minutes = match[3] ? parseInt(match[3], 10) : 0;
        return sign * (hours + minutes / 60);
      }
    }

    // Fallback: calculate offset by comparing UTC and local time
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const localDate = new Date(date.toLocaleString('en-US', { timeZone: timezoneName }));
    return (localDate - utcDate) / (1000 * 60 * 60);
  } catch (e) {
    console.error('Timezone error:', e);
    return 0; // Default to UTC if timezone parsing fails
  }
}

export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);

  // Get query parameters
  const lat = parseFloat(url.searchParams.get('lat'));
  const lng = parseFloat(url.searchParams.get('lng'));
  const dateParam = url.searchParams.get('date'); // YYYY-MM-DD or Unix timestamp
  const timezone = url.searchParams.get('timezone') || 'America/New_York';
  const calcMethod = url.searchParams.get('method') || 'ISNA';
  const timeFormat = url.searchParams.get('format') || '12h';

  // Validate required parameters
  if (isNaN(lat) || isNaN(lng)) {
    return new Response(JSON.stringify({
      error: 'Missing or invalid lat/lng parameters'
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  // Parse date (supports both YYYY-MM-DD and legacy timestamp formats)
  let date;
  if (dateParam) {
    if (dateParam.includes('-')) {
      // YYYY-MM-DD format
      const [y, m, d] = dateParam.split('-').map(Number);
      date = new Date(y, m - 1, d);
    } else {
      // Legacy timestamp format
      date = new Date(parseInt(dateParam, 10) * 1000);
    }
  } else {
    date = new Date();
  }

  // Get timezone offset
  const tzOffset = getTimezoneOffset(timezone, date);

  // Calculate prayer times
  const pt = new PrayTimes(calcMethod);
  const dateArray = [date.getFullYear(), date.getMonth() + 1, date.getDate()];
  const coords = [lat, lng];

  const times = pt.getTimes(dateArray, coords, tzOffset, 0, timeFormat);

  // Return response
  return new Response(JSON.stringify({
    date: date.toISOString().split('T')[0],
    coordinates: { lat, lng },
    timezone: timezone,
    timezoneOffset: tzOffset,
    method: calcMethod,
    times: {
      imsak: times.imsak,
      fajr: times.fajr,
      sunrise: times.sunrise,
      dhuhr: times.dhuhr,
      asr: times.asr,
      sunset: times.sunset,
      maghrib: times.maghrib,
      isha: times.isha,
      midnight: times.midnight
    }
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=86400' // Cache for 24 hours
    }
  });
}

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
