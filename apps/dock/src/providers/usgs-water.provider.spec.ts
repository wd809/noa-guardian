import type { FetchFn } from './feeds-fetch.js';
import { UsgsWaterProvider, haversineKm } from './usgs-water.provider.js';

// Forma REAL verificada en vivo (2026-11-01): NWIS WaterML-JSON para IV
// y NWS NWPS `flood.categories` para los umbrales oficiales.
function ivJson(readings: Array<{ site: string; height: string }>): unknown {
  return {
    value: {
      timeSeries: readings.map((r) => ({
        sourceInfo: { siteCode: [{ value: r.site }] },
        variable: { variableCode: [{ value: '00065' }] },
        values: [
          { value: [{ value: r.height, dateTime: '2026-11-01T08:15:00.000-05:00' }] },
        ],
      })),
    },
  };
}

// Umbrales REALES verificados: Reading minor=15.5/action=14.5,
// Pottstown minor=12.5/action=11 (NWPS, ft).
function nwpsJson(stages: {
  action: number;
  minor: number;
  moderate: number;
  major: number;
}): unknown {
  return {
    flood: {
      categories: {
        action: { stage: stages.action },
        minor: { stage: stages.minor },
        moderate: { stage: stages.moderate },
        major: { stage: stages.major },
      },
    },
  };
}

const READING_STAGES = { action: 14.5, minor: 15.5, moderate: 18, major: 22 };
const POTTSTOWN_STAGES = { action: 11, minor: 12.5, moderate: 18, major: 22 };

function fakeFetch(opts: {
  heights: Array<{ site: string; height: string }>;
  nwpsDown?: boolean;
}): { fn: FetchFn; calls: () => number } {
  let count = 0;
  const fn = (async (url: string) => {
    count += 1;
    const u = String(url);
    if (u.includes('waterservices.usgs.gov/nwis/iv')) {
      return { ok: true, json: async () => ivJson(opts.heights) };
    }
    if (u.includes('api.water.noaa.gov/nwps/v1/gauges/01471510')) {
      if (opts.nwpsDown) throw new Error('network down');
      return { ok: true, json: async () => nwpsJson(READING_STAGES) };
    }
    if (u.includes('api.water.noaa.gov/nwps/v1/gauges/01472000')) {
      if (opts.nwpsDown) throw new Error('network down');
      return { ok: true, json: async () => nwpsJson(POTTSTOWN_STAGES) };
    }
    throw new Error('unexpected url ' + u);
  }) as unknown as FetchFn;
  return { fn, calls: () => count };
}

const READING = { lat: 40.3356, lon: -75.9269 };

describe('UsgsWaterProvider (Schuylkill)', () => {
  it('nivel bajo: cero alertas y resumen con nivel y flood stage', async () => {
    const { fn } = fakeFetch({
      heights: [
        { site: '01471510', height: '3.20' },
        { site: '01472000', height: '1.77' },
      ],
    });
    const p = new UsgsWaterProvider(fn);
    const alerts = await p.liveEvents(READING.lat, READING.lon);
    expect(alerts).toHaveLength(0);
    expect(p.lastSummary()).toBe('Schuylkill 3.2 ft (flood 15.5 ft)');
  });

  it('nivel sobre flood stage: alerta Severe con enlace oficial', async () => {
    const { fn } = fakeFetch({
      heights: [{ site: '01471510', height: '16.20' }],
    });
    const p = new UsgsWaterProvider(fn);
    const alerts = await p.liveEvents(READING.lat, READING.lon);
    expect(alerts).toHaveLength(1);
    const a = alerts[0];
    expect(a.source).toBe('USGS Water');
    expect(a.severity).toBe('Severe'); // minor flooding 15.5-18
    expect(a.headline).toContain('16.2 ft');
    expect(a.headline).toContain('15.5 ft');
    expect(a.area).toContain('Reading');
    expect(a.url).toContain('01471510');
  });

  it('nivel sobre major: Extreme; en action: Moderate', async () => {
    const { fn } = fakeFetch({
      heights: [
        { site: '01471510', height: '23.00' },
        { site: '01472000', height: '11.50' },
      ],
    });
    const p = new UsgsWaterProvider(fn);
    const alerts = await p.liveEvents(READING.lat, READING.lon);
    expect(alerts.map((x) => x.severity).sort()).toEqual([
      'Extreme', // Reading ≥ 22
      'Moderate', // Pottstown en action 11-12.5
    ]);
  });

  it('NWPS caído y sin caché: el nivel se muestra pero NO genera alerta', async () => {
    const { fn } = fakeFetch({
      heights: [{ site: '01471510', height: '16.20' }],
      nwpsDown: true,
    });
    const p = new UsgsWaterProvider(fn);
    const alerts = await p.liveEvents(READING.lat, READING.lon);
    // Sin umbrales no se puede verificar la superación: no se afirma.
    expect(alerts).toHaveLength(0);
    expect(p.lastSummary()).toContain('flood stage unknown');
  });

  it('punto lejano: fuera de cobertura, sin llamadas', async () => {
    const { fn, calls } = fakeFetch({ heights: [] });
    const p = new UsgsWaterProvider(fn);
    const alerts = await p.liveEvents(41.8781, -87.6298); // Chicago
    expect(alerts).toHaveLength(0);
    expect(calls()).toBe(0);
    expect(p.lastSummary()).toBeNull();
  });

  it('haversine: Reading↔Pottstown ≈ 26 km (misma cuenca)', () => {
    const d = haversineKm(40.3356, -75.9269, 40.2418, -75.6516);
    expect(d).toBeGreaterThan(15);
    expect(d).toBeLessThan(35);
  });
});
