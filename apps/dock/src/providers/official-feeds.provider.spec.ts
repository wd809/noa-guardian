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
    expect(calls()).toBe(3); // una sola ronda de red
  });
});
