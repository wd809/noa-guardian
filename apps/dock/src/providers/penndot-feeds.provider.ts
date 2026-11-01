import { Inject, Injectable, Optional } from '@nestjs/common';
import type { OfficialAlert } from '@noa-guardian/contracts';
import { FEEDS_FETCH, type FetchFn } from './feeds-fetch.js';

/**
 * PennDOT RCRS — incidentes viales oficiales de Pensilvania (los datos
 * detrás de 511PA). Hallazgo de WD (2026-10-29) verificado en la fuente:
 * datos gratuitos para público, vendedores e investigadores; sin límites
 * de peticiones; el acceso es por solicitud (Data Feed Request Form) y
 * PennDOT emite las credenciales a mano.
 *
 * Contrato verificado en la documentación oficial de PennDOT:
 *   GET https://eventsdata.dot.pa.gov/liveEvents
 *   Authorization: Basic base64(usuario:clave)   [credenciales PDAuth]
 *   Respuesta: { "Values": [ {evento}, ... ] } a nivel estatal.
 *
 * Estado hasta que lleguen las credenciales: la fuente vive en modo
 * «no configurada» — un estado DECLARADO (notConfigured), jamás un fallo
 * disfrazado ni un dato inventado. Las credenciales solo viven en el
 * entorno (PENNDOT_USER / PENNDOT_PASS); nunca en el repo.
 *
 * Mapeo a OfficialAlert (decisiones documentadas):
 *  - Radio: 50 km del punto consultado (coordenadas del incidente;
 *    si faltan, las del inicio del tramo).
 *  - Eventos ya reabiertos (ActualDateTimeOpened) se excluyen.
 *  - Severidad: fatalidad, material peligroso o primer respondedor
 *    herido/fallecido → Severe; vía cerrada (LaneStatus) → Moderate;
 *    el resto → Minor.
 *  - `url` pública de la fuente: 511pa.com.
 */
export const PENNDOT_NOT_CONFIGURED = '__penndot_not_configured__';
const LIVE_EVENTS_URL = 'https://eventsdata.dot.pa.gov/liveEvents';
const FETCH_TIMEOUT_MS = 6_000;
const RADIUS_KM = 50;
const UA =
  'NOA-Guardian-Dock/1.0 (Meta AI Hackathon 2026 prototype; contact: repo local)';

interface RcrsEvent {
  [k: string]: unknown;
}

export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function parseLatLong(v: unknown): { lat: number; lon: number } | null {
  if (typeof v !== 'string') return null;
  const [a, b] = v.split(',').map((s) => Number(s.trim()));
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return { lat: a, lon: b };
}

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function parseFeedTime(v: unknown): string | null {
  // El feed usa "YYYY-MM-DD HH:MM[:SS]" (hora local de PA, sin zona).
  if (typeof v !== 'string' || !v.trim()) return null;
  const t = Date.parse(v.replace(' ', 'T'));
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

@Injectable()
export class PennDotFeedsProvider {
  private readonly fetchFn: FetchFn;
  private readonly user: string;
  private readonly pass: string;

  constructor(
    @Optional() @Inject(FEEDS_FETCH) fetchFn?: FetchFn,
    @Optional()
    @Inject('PENNDOT_CREDS')
    creds?: { user: string; pass: string },
  ) {
    this.fetchFn = fetchFn ?? globalThis.fetch;
    this.user = creds?.user ?? process.env.PENNDOT_USER ?? '';
    this.pass = creds?.pass ?? process.env.PENNDOT_PASS ?? '';
  }

  get configured(): boolean {
    return this.user.length > 0 && this.pass.length > 0;
  }

  async liveEvents(lat: number, lon: number): Promise<OfficialAlert[]> {
    if (!this.configured) throw new Error(PENNDOT_NOT_CONFIGURED);
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    try {
      const basic = Buffer.from(`${this.user}:${this.pass}`).toString(
        'base64',
      );
      const res = await this.fetchFn(LIVE_EVENTS_URL, {
        headers: { 'User-Agent': UA, Authorization: `Basic ${basic}` },
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { Values?: RcrsEvent[] };
      const events = Array.isArray(data.Values) ? data.Values : [];
      const out: OfficialAlert[] = [];
      for (const e of events) {
        if (str(e.ActualDateTimeOpened).trim()) continue; // ya reabierto
        const coords =
          parseLatLong(e.IncidentLocLatLong) ??
          parseLatLong(e.FromLocLatLong);
        if (!coords) continue;
        if (haversineKm(lat, lon, coords.lat, coords.lon) > RADIUS_KM) {
          continue;
        }
        const severe =
          e.IsFatality === 'T' ||
          e.IsHazmat === 'T' ||
          e.IsFirstResponderWithMajorInjuryOrFatality === 'T';
        const lane = str(e.LaneStatus).toLowerCase();
        const severity = severe
          ? 'Severe'
          : lane.includes('closed')
            ? 'Moderate'
            : 'Minor';
        const type = str(e.EventType, 'Evento vial');
        const facility = str(e.Facility);
        const hazmat =
          e.IsHazmat === 'T' && str(e.HazmatMaterialName)
            ? ` Material peligroso: ${str(e.HazmatMaterialName)}.`
            : '';
        out.push({
          event: facility ? `${type} — ${facility}` : type,
          severity,
          headline: `${str(e.Description)}${hazmat}`.trim(),
          area:
            `${str(e.IncidentLoc) || str(e.FromLoc)} (${str(e.CountyName)})`
              .trim(),
          starts:
            parseFeedTime(e.DateTimeEventOccurs) ??
            parseFeedTime(e.CreateTime),
          ends: null,
          source: 'PennDOT',
          url: 'https://www.511pa.com/',
        });
      }
      return out;
    } finally {
      clearTimeout(t);
    }
  }
}
