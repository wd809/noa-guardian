import { OfficialFeedsProvider, type FetchFn } from './official-feeds.provider.js';

const NWS_OK = {
  features: [
    {
      id: 'https://api.weather.gov/alerts/urn:oid:test1',
      properties: {
        event: 'Heat Advisory',
        severity: 'Moderate',
        headline: 'Heat Advisory in effect',
        areaDesc: 'Berks County',
        onset: '2026-10-27T12:00:00Z',
        ends: '2099-01-01T00:00:00Z',
      },
    },
  ],
};
const USGS_OK = {
  features: [
    {
      properties: {
        mag: 3.8,
        title: 'M 3.8 - 10km NE of Reading, PA',
        place: '10km NE of Reading, PA',
        time: 1790000000000,
        url: 'https://earthquake.usgs.gov/earthquakes/eventpage/test',
      },
    },
  ],
};
const EONET_FAR = {
  events: [
    {
      id: 'EONET_1',
      title: 'Wildfire - Australia',
      categories: [{ title: 'Wildfires' }],
      geometry: [{ date: '2026-10-20T00:00:00Z', coordinates: [134, -25] }],
      link: 'https://eonet.gsfc.nasa.gov/api/v3/events/EONET_1',
    },
  ],
};
// USGS Water: niveles bajos (Schuylkill en Reading 3.2 ft, muy por debajo
// del action 14.5 ft) → la fuente responde ok con 0 alertas.
const WATER_IV_LOW = {
  value: {
    timeSeries: [
      {
        sourceInfo: { siteCode: [{ value: '01471510' }] },
        variable: { variableCode: [{ value: '00065' }] },
        values: [
          {
            value: [{ value: '3.20', dateTime: '2026-11-01T08:15:00.000-05:00' }],
          },
        ],
      },
      {
        sourceInfo: { siteCode: [{ value: '01472000' }] },
        variable: { variableCode: [{ value: '00065' }] },
        values: [
          {
            value: [{ value: '1.77', dateTime: '2026-11-01T08:15:00.000-05:00' }],
          },
        ],
      },
    ],
  },
};
const NWPS_STAGES = {
  flood: {
    categories: {
      action: { stage: 14.5 },
      minor: { stage: 15.5 },
      moderate: { stage: 18 },
      major: { stage: 22 },
    },
  },
};

function fakeFetch(failNws = false): { fn: FetchFn; calls: () => number } {
  let count = 0;
  const fn = (async (url: string) => {
    count += 1;
    const u = String(url);
    if (u.includes('api.weather.gov')) {
      if (failNws) throw new Error('network down');
      return { ok: true, json: async () => NWS_OK };
    }
    if (u.includes('earthquake.usgs.gov')) {
      return { ok: true, json: async () => USGS_OK };
    }
    if (u.includes('eonet.gsfc.nasa.gov')) {
      return { ok: true, json: async () => EONET_FAR };
    }
    if (u.includes('waterservices.usgs.gov/nwis/iv')) {
      return { ok: true, json: async () => WATER_IV_LOW };
    }
    if (u.includes('api.water.noaa.gov/nwps/v1/gauges/')) {
      return { ok: true, json: async () => NWPS_STAGES };
    }
    // AirNow sin llave no debe llamar (falla el test si lo intenta).
    throw new Error('unexpected url ' + u);
  }) as unknown as FetchFn;
  return { fn, calls: () => count };
}

describe('OfficialFeedsProvider', () => {
  it('agrega las tres fuentes y normaliza las alertas', async () => {
    const { fn } = fakeFetch();
    const provider = new OfficialFeedsProvider(fn);
    const payload = await provider.getAlerts(40.3356, -75.9269);
    expect(payload.alerts).toHaveLength(2); // NWS 1 + USGS 1; EONET lejos = 0
    expect(payload.sources['NWS']).toEqual({ ok: true, count: 1 });
    expect(payload.sources['USGS']).toEqual({ ok: true, count: 1 });
    expect(payload.sources['NASA EONET']).toEqual({ ok: true, count: 0 });
    const nws = payload.alerts.find((a) => a.source === 'NWS');
    expect(nws?.url).toContain('api.weather.gov');
    const usgs = payload.alerts.find((a) => a.source === 'USGS');
    expect(usgs?.severity).toBe('Moderate'); // M3.8
    expect(payload.cache.hit).toBe(false);
  });

  it('declara la fuente caída y responde con las demás (nunca rellena)', async () => {
    const { fn } = fakeFetch(true);
    const provider = new OfficialFeedsProvider(fn);
    const payload = await provider.getAlerts(40.3356, -75.9269);
    expect(payload.sources['NWS'].ok).toBe(false);
    expect(payload.sources['NWS'].error).toContain('network down');
    expect(payload.sources['USGS'].ok).toBe(true);
    expect(payload.alerts).toHaveLength(1);
  });

  it('sirve la segunda llamada desde la caché de 120 s', async () => {
    const { fn, calls } = fakeFetch();
    const provider = new OfficialFeedsProvider(fn);
    await provider.getAlerts(40.3356, -75.9269);
    const second = await provider.getAlerts(40.3356, -75.9269);
    expect(second.cache.hit).toBe(true);
    // Una sola ronda: NWS + USGS sismos + EONET + IV + 2×NWPS
    // (PennDOT y AirNow, sin credenciales, no llaman).
    expect(calls()).toBe(6);
  });

  it('AirNow sin llave queda not_configured; USGS Water aporta su nivel', async () => {
    const { fn } = fakeFetch();
    const provider = new OfficialFeedsProvider(fn);
    const payload = await provider.getAlerts(40.3356, -75.9269);
    expect(payload.sources['AirNow']).toEqual({
      ok: false,
      count: 0,
      error: expect.stringContaining('AIRNOW_API_KEY'),
      notConfigured: true,
    });
    expect(payload.sources['USGS Water']).toEqual({ ok: true, count: 0 });
    const health = provider.sourcesHealth();
    expect(health['AirNow'].state).toBe('not_configured');
    expect(health['USGS Water'].state).toBe('ok');
    expect(health['USGS Water'].summary).toContain('Schuylkill 3.2 ft');
  });
});
