/**
 * Returns geolocation data from Cloudflare's request headers
 * This gives us city/region/country based on IP address
 */

export async function onRequestGet(context) {
  const { request } = context;

  // CF provides geolocation data on the request object
  const cf = request.cf || {};

  const locationData = {
    city: cf.city || null,
    region: cf.region || null,
    regionCode: cf.regionCode || null,
    country: cf.country || null,
    continent: cf.continent || null,
    latitude: cf.latitude || null,
    longitude: cf.longitude || null,
    timezone: cf.timezone || null,
    postalCode: cf.postalCode || null,
  };

  // Build a display string
  let displayName = null;
  if (locationData.city && locationData.regionCode) {
    displayName = `${locationData.city}, ${locationData.regionCode}`;
  } else if (locationData.city && locationData.country) {
    displayName = `${locationData.city}, ${locationData.country}`;
  } else if (locationData.region && locationData.country) {
    displayName = `${locationData.region}, ${locationData.country}`;
  } else if (locationData.country) {
    displayName = locationData.country;
  }

  return new Response(JSON.stringify({
    ...locationData,
    displayName
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
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
