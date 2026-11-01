import { Inject, Injectable, Optional } from '@nestjs/common';
import type { OfficialAlert } from '@noa-guardian/contracts';
import { FEEDS_FETCH, type FetchFn } from './feeds-fetch.js';

/**
 * USGS Water Services + NWS NWPS — nivel del río Schuylkill (fuente
 * OFICIAL, sin llave). Proveedor separado del USGS de sismos: otro
 * dominio, otros endpoints, mismo rigor.
 *
 * Estaciones fijas verificadas (2026-11-01):
 *  - 01471510 Schuylkill River at Reading, PA (primaria, en el punto)
 *  - 01472000 Schuylkill River at Pottstown, PA (aguas abajo, respaldo)
 * Niveles: NWIS valores instantáneos (`parameterCd=00065`, gage height ft).
 * Umbrales: categorías oficiales de inundación del NWS por estación
 * (`api.water.noaa.gov/nwps/v1/gauges/{site}`: action/minor/moderate/major;
 * p. ej. Reading minor=15.5 ft, Pottstown minor=12.5 ft). Los umbrales
 * cambian rara vez: se cachean 24 h en memoria.
 *
 * Mapeo a OfficialAlert (decisiones documentadas):
 *  - Cobertura: las estaciones solo se evalúan si el punto consultado
 *    está a ≤ 60 km de Reading; fuera de esa zona no hay gages
 *    conocidos y se devuelve [] (sin inventar cobertura).
 *  - Si el nivel supera el umbral: action..minor → Moderate (vigilancia);
 *    minor..major → Severe (inundación en curso); ≥ major → Extreme.
 *  - Sin umbrales (NWPS caído y sin caché): el nivel se muestra pero NO
 *    genera alerta — una superación que no se puede verificar no se afirma.
 *  - Los valores instantáneos del USGS son provisionales (revisables);
 *    queda documentado aquí y el enlace lleva a la lectura oficial.
 */
const STATIONS = [
  { usgsId: '01471510', name: 'Schuylkill River at Reading' },
  { usgsId: '01472000', name: 'Schuylkill River at Pottstown' },
] as const;
const READING_POINT = { lat: 40.3353611, lon: -75.9368333 };
const COVERAGE_KM = 60;
const FETCH_TIMEOUT_MS = 6_000;
const STAGES_TTL_MS = 24 * 3600_000;
const UA =
  'NOA-Guardian-Dock/1.0 (Meta AI Hackathon 2026 prototype; contact: repo local)';

interface FloodStages {
  action: number;
  minor: number;
  moderate: number;
  major: number;
}

interface GageReading {
  station: (typeof STATIONS)[number];
  heightFt: number;
  observedAt: string | null;
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

function num(v: unknown): number | null {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
}

@Injectable()
export class UsgsWaterProvider {
  private readonly fetchFn: FetchFn;
  private readonly stagesCache = new Map<string, { at: number; stages: FloodStages }>();
  private lastSummaryValue: string | null = null;

  constructor(@Optional() @Inject(FEEDS_FETCH) fetchFn?: FetchFn) {
    this.fetchFn = fetchFn ?? globalThis.fetch;
  }

  /** Última lectura verificada en una línea, o null si aún no hay ninguna. */
  lastSummary(): string | null {
    return this.lastSummaryValue;
  }

  private async fetchJson(url: string): Promise<unknown> {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await this.fetchFn(url, {
        headers: { 'User-Agent': UA },
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as unknown;
    } finally {
      clearTimeout(t);
    }
  }

  private parseIv(data: unknown): GageReading[] {
    const series = (data as { value?: { timeSeries?: unknown[] } })?.value
      ?.timeSeries;
    if (!Array.isArray(series)) return [];
    const out: GageReading[] = [];
    for (const s of series) {
      const ts = s as {
        sourceInfo?: { siteCode?: Array<{ value?: unknown }> };
        variable?: { variableCode?: Array<{ value?: unknown }> };
        values?: Array<{ value?: Array<{ value?: unknown; dateTime?: unknown }> }>;
      };
      const site = String(ts.sourceInfo?.siteCode?.[0]?.value ?? '');
      const param = String(ts.variable?.variableCode?.[0]?.value ?? '');
      if (param !== '00065') continue; // solo altura de gage (ft)
      const station = STATIONS.find((x) => x.usgsId === site);
      if (!station) continue;
      const latest = ts.values?.[0]?.value?.[0];
      const heightFt = num(latest?.value);
      if (heightFt === null) continue;
      out.push({
        station,
        heightFt,
        observedAt:
          typeof latest?.dateTime === 'string' ? latest.dateTime : null,
      });
    }
    return out;
  }

  private async stagesFor(usgsId: string): Promise<FloodStages | null> {
    const hit = this.stagesCache.get(usgsId);
    if (hit && Date.now() - hit.at < STAGES_TTL_MS) return hit.stages;
    try {
      const data = await this.fetchJson(
        `https://api.water.noaa.gov/nwps/v1/gauges/${usgsId}`,
      );
      const cats = (data as { flood?: { categories?: Record<string, { stage?: unknown }> } })
        ?.flood?.categories;
      const action = num(cats?.action?.stage);
      const minor = num(cats?.minor?.stage);
      const moderate = num(cats?.moderate?.stage);
      const major = num(cats?.major?.stage);
      if (action === null || minor === null || moderate === null || major === null) {
        return hit?.stages ?? null;
      }
      const stages = { action, minor, moderate, major };
      this.stagesCache.set(usgsId, { at: Date.now(), stages });
      return stages;
    } catch {
      return hit?.stages ?? null;
    }
  }

  async liveEvents(lat: number, lon: number): Promise<OfficialAlert[]> {
    if (
      haversineKm(lat, lon, READING_POINT.lat, READING_POINT.lon) > COVERAGE_KM
    ) {
      return [];
    }
    const ids = STATIONS.map((s) => s.usgsId).join(',');
    const data = await this.fetchJson(
      `https://waterservices.usgs.gov/nwis/iv/?format=json&sites=${ids}&parameterCd=00065&siteStatus=all`,
    );
    const readings = this.parseIv(data);
    const stages = new Map<string, FloodStages | null>();
    await Promise.all(
      readings.map(async (r) => {
        stages.set(r.station.usgsId, await this.stagesFor(r.station.usgsId));
      }),
    );
    const out: OfficialAlert[] = [];
    for (const r of readings) {
      const st = stages.get(r.station.usgsId) ?? null;
      if (!st) continue; // nivel sin umbrales: se muestra, no se alerta
      const h = r.heightFt;
      const level =
        h >= st.major
          ? ({ severity: 'Extreme', label: 'major flooding' } as const)
          : h >= st.moderate
            ? ({ severity: 'Severe', label: 'moderate flooding' } as const)
            : h >= st.minor
              ? ({ severity: 'Severe', label: 'minor flooding' } as const)
              : h >= st.action
                ? ({ severity: 'Moderate', label: 'near flood stage' } as const)
                : null;
      if (!level) continue;
      out.push({
        event: `Schuylkill River ${level.label} — ${r.station.name}`,
        severity: level.severity,
        headline:
          `${r.station.name} at ${h} ft (flood stage ${st.minor} ft, ` +
          `action ${st.action} ft per NWS): ${level.label}.`,
        area: r.station.name,
        starts: r.observedAt,
        ends: null,
        source: 'USGS Water',
        url: `https://waterdata.usgs.gov/monitoring-location/${r.station.usgsId}/`,
      });
    }
    const primary =
      readings.find((r) => r.station.usgsId === STATIONS[0].usgsId) ??
      readings[0] ??
      null;
    this.lastSummaryValue = primary
      ? `Schuylkill ${primary.heightFt} ft` +
        (() => {
          const st = stages.get(primary.station.usgsId) ?? null;
          return st ? ` (flood ${st.minor} ft)` : ' (flood stage unknown)';
        })()
      : null;
    return out;
  }
}
