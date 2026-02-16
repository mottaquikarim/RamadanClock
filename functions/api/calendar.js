import { PrayTimes } from './praytimes.js';

const DEFAULT_RAMADAN_START = '2026-02-18';
const RAMADAN_DAYS = 31;

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
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const localDate = new Date(date.toLocaleString('en-US', { timeZone: timezoneName }));
    return (localDate - utcDate) / (1000 * 60 * 60);
  } catch (e) {
    return 0;
  }
}

/**
 * Parse a 12h time string like "5:23am" or "6:45pm" into { hours, minutes }
 */
function parseTime12h(timeStr) {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})(am|pm)$/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toLowerCase();
  if (period === 'am' && hours === 12) hours = 0;
  if (period === 'pm' && hours !== 12) hours += 12;
  return { hours, minutes };
}

/**
 * Format a Date as an iCal DTSTART/DTEND value in local time: YYYYMMDDTHHMMSS
 */
function icalDateTime(year, month, day, hours, minutes) {
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  const hh = String(hours).padStart(2, '0');
  const mi = String(minutes).padStart(2, '0');
  return `${year}${mm}${dd}T${hh}${mi}00`;
}

/**
 * Format a Date as iCal date-only value: YYYYMMDD
 */
function icalDate(year, month, day) {
  return `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`;
}

function escapeIcal(str) {
  return str.replace(/[\\;,]/g, c => '\\' + c);
}

function generateUID(prefix, dateStr) {
  return `${prefix}-${dateStr}@ramadan-clock`;
}

function foldLine(line) {
  const lines = [];
  while (line.length > 75) {
    lines.push(line.substring(0, 75));
    line = ' ' + line.substring(75);
  }
  lines.push(line);
  return lines.join('\r\n');
}

export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);

  const lat = parseFloat(url.searchParams.get('lat'));
  const lng = parseFloat(url.searchParams.get('lng'));
  const timezone = url.searchParams.get('tz') || 'America/New_York';
  const calcMethod = url.searchParams.get('method') || 'ISNA';
  const startParam = url.searchParams.get('start') || DEFAULT_RAMADAN_START;

  if (isNaN(lat) || isNaN(lng)) {
    return new Response('Missing or invalid lat/lng parameters', { status: 400 });
  }

  const [startY, startM, startD] = startParam.split('-').map(Number);
  const ramadanStart = new Date(startY, startM - 1, startD);
  const pt = new PrayTimes(calcMethod);
  const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');

  const events = [];

  for (let i = 0; i < RAMADAN_DAYS; i++) {
    const day = new Date(ramadanStart);
    day.setDate(day.getDate() + i);
    const y = day.getFullYear();
    const m = day.getMonth() + 1;
    const d = day.getDate();
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayNum = i + 1;

    const tzOffset = getTimezoneOffset(timezone, day);
    const times = pt.getTimes([y, m, d], [lat, lng], tzOffset, 0, '12h');

    const fajr = parseTime12h(times.fajr);
    const maghrib = parseTime12h(times.maghrib);

    if (fajr) {
      // Sehri alarm: 30 min before Fajr
      let alarmH = fajr.hours;
      let alarmM = fajr.minutes - 30;
      if (alarmM < 0) { alarmM += 60; alarmH -= 1; }

      events.push([
        'BEGIN:VEVENT',
        `UID:${generateUID('sehri', dateStr)}`,
        `DTSTAMP:${now}`,
        `DTSTART;TZID=${timezone}:${icalDateTime(y, m, d, alarmH, alarmM)}`,
        `DTEND;TZID=${timezone}:${icalDateTime(y, m, d, fajr.hours, fajr.minutes)}`,
        `SUMMARY:Sehri - Day ${dayNum}`,
        `DESCRIPTION:Fajr at ${times.fajr}. Stop eating by Fajr.`,
        'BEGIN:VALARM',
        'TRIGGER:-PT10M',
        'ACTION:DISPLAY',
        'DESCRIPTION:Sehri ending soon',
        'END:VALARM',
        'END:VEVENT'
      ].join('\r\n'));
    }

    if (maghrib) {
      events.push([
        'BEGIN:VEVENT',
        `UID:${generateUID('iftaar', dateStr)}`,
        `DTSTAMP:${now}`,
        `DTSTART;TZID=${timezone}:${icalDateTime(y, m, d, maghrib.hours, maghrib.minutes)}`,
        `DTEND;TZID=${timezone}:${icalDateTime(y, m, d, maghrib.hours, maghrib.minutes + 30)}`,
        `SUMMARY:Iftaar - Day ${dayNum}`,
        `DESCRIPTION:Maghrib at ${times.maghrib}. Break your fast!`,
        'BEGIN:VALARM',
        'TRIGGER:PT0M',
        'ACTION:DISPLAY',
        'DESCRIPTION:Time to break your fast!',
        'END:VALARM',
        'END:VEVENT'
      ].join('\r\n'));
    }
  }

  const ical = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//RamadanClock//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Ramadan 2026',
    'X-WR-TIMEZONE:' + timezone,
    ...events,
    'END:VCALENDAR'
  ].join('\r\n');

  return new Response(ical, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="ramadan-2026.ics"',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=86400'
    }
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
