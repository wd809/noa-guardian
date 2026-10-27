/* feeds.js — Alertas oficiales del Guardian Dock v1 (contrato §2 ampliado).
 *
 * Agrega tres fuentes oficiales y gratuitas:
 *   - NWS   (api.weather.gov)      — alertas meteorológicas activas por punto.
 *   - USGS  (earthquake.usgs.gov)  — sismos recientes cerca del punto.
 *   - NASA EONET (eonet.gsfc.nasa.gov) — eventos naturales abiertos cerca.
 *
 * Reglas: cada alerta lleva su fuente y su enlace oficial; si una fuente
 * cae, las demás responden y el fallo se DECLARA en `sources` (jamás se
 * inventa una alerta — contrato §2). Caché corta en memoria (120 s por
 * punto redondeado). No se persiste nada.
 */

const UA = "NOA-Guardian-Dock/1.0 (Meta AI Hackathon 2026 prototype; contact: repo local)";
const CACHE_TTL_MS = 120_000;
const FETCH_TIMEOUT_MS = 6_000;
const cache = new Map(); // clave "lat,lon" (2 decimales) → { at, payload }

export const DEFAULT_POINT = { lat: 40.3356, lon: -75.9269, label: "Reading, PA (punto por defecto)" };

async function fetchJson(url, headers = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, ...headers }, signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

async function fromNWS(lat, lon) {
  const data = await fetchJson(
    `https://api.weather.gov/alerts/active?point=${lat.toFixed(4)},${lon.toFixed(4)}`,
    { Accept: "application/geo+json" }
  );
  return (data.features || []).map((f) => {
    const p = f.properties || {};
    return {
      event: p.event || "Alerta meteorológica",
      severity: p.severity || "Unknown",
      headline: p.headline || p.description?.slice(0, 200) || "",
      area: p.areaDesc || "",
      starts: p.onset || p.effective || null,
      ends: p.ends || p.expires || null,
      source: "NWS",
      // En el GeoJSON de NWS, `id` ya es la URL canónica de la alerta.
      url: typeof f.id === "string" && f.id.startsWith("http")
        ? f.id
        : "https://www.weather.gov/",
    };
  });
}

async function fromUSGS(lat, lon) {
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const data = await fetchJson(
    "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&orderby=time&limit=10" +
      `&starttime=${since}&latitude=${lat}&longitude=${lon}&maxradiuskm=300&minmagnitude=2.0`
  );
  return (data.features || []).map((f) => {
    const p = f.properties || {};
    return {
      event: `Sismo M${p.mag ?? "?"}`,
      severity: p.mag >= 4.5 ? "Severe" : p.mag >= 3.5 ? "Moderate" : "Minor",
      headline: p.title || "",
      area: p.place || "",
      starts: p.time ? new Date(p.time).toISOString() : null,
      ends: null,
      source: "USGS",
      url: p.url || "https://earthquake.usgs.gov/earthquakes/map/",
    };
  });
}

async function fromEONET(lat, lon) {
  const data = await fetchJson(
    "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=30&limit=50"
  );
  const near = (data.events || []).filter((e) => {
    const g = (e.geometry || [])[0];
    if (!g || !Array.isArray(g.coordinates)) return false;
    const [elon, elat] = g.coordinates;
    return Math.abs(elat - lat) <= 6 && Math.abs(elon - lon) <= 6;
  });
  return near.map((e) => {
    const g = (e.geometry || [])[0] || {};
    const cat = (e.categories || [])[0]?.title || "Evento natural";
    return {
      event: e.title || cat,
      severity: "Unknown",
      headline: `${cat} — evento abierto reportado por NASA EONET (reportado, no verificado en campo).`,
      area: Array.isArray(g.coordinates) ? `lon ${g.coordinates[0]}, lat ${g.coordinates[1]}` : "",
      starts: g.date || null,
      ends: null,
      source: "NASA EONET",
      url: e.link || `https://eonet.gsfc.nasa.gov/api/v3/events/${e.id}`,
    };
  });
}

const SOURCES = [
  ["NWS", fromNWS],
  ["USGS", fromUSGS],
  ["NASA EONET", fromEONET],
];

export async function getAlerts(lat, lon) {
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return { ...hit.payload, cache: { hit: true, ttlSeconds: CACHE_TTL_MS / 1000 } };
  }
  const settled = await Promise.allSettled(SOURCES.map(([, fn]) => fn(lat, lon)));
  const alerts = [];
  const sources = {};
  settled.forEach((r, i) => {
    const name = SOURCES[i][0];
    if (r.status === "fulfilled") {
      sources[name] = { ok: true, count: r.value.length };
      alerts.push(...r.value);
    } else {
      // Fallo declarado, nunca rellenado (contrato §2).
      sources[name] = { ok: false, count: 0, error: String(r.reason?.message || r.reason) };
    }
  });
  const payload = {
    alerts,
    sources,
    point: { lat, lon },
    generatedAt: new Date().toISOString(),
    cache: { hit: false, ttlSeconds: CACHE_TTL_MS / 1000 },
  };
  cache.set(key, { at: Date.now(), payload });
  return payload;
}

export function feedsStatus() {
  return {
    configured: SOURCES.map(([name]) => name),
    cacheEntries: cache.size,
    cacheTtlSeconds: CACHE_TTL_MS / 1000,
  };
}
