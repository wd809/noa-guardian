import type { FetchFn } from './feeds-fetch.js';
import {
  AIRNOW_NOT_CONFIGURED,
  AirNowFeedsProvider,
} from './airnow-feeds.provider.js';

// Forma DOCUMENTADA de la API (docs.airnowapi.org): arreglo de registros
// con AQI numérico y Category {Number, Name}; pronóstico con DateForecast.
const OBS_GOOD = [
  {
    DateObserved: '2026-11-01',
    HourObserved: 8,
    LocalTimeZone: 'EST',
    ReportingArea: 'Reading',
    StateCode: 'PA',
    Latitude: 40.33,
    Longitude: -75.92,
    ParameterName: 'PM2.5',
    AQI: 45,
    Category: { Number: 1, Name: 'Good' },
  },
];

const OBS_USG = [
  {
    ...OBS_GOOD[0],
    ParameterName: 'O3',
    AQI: 120,
    Category: { Number: 3, Name: 'Unhealthy for Sensitive Groups' },
  },
];

const FORECAST_UNHEALTHY = [
  {
    DateForecast: '2026-11-02',
    ReportingArea: 'Reading',
    StateCode: 'PA',
    ParameterName: 'PM2.5',
    AQI: 165,
    Category: { Number: 4, Name: 'Unhealthy' },
  },
];

const FORECAST_HAZARDOUS = [
  {
    DateForecast: '2026-11-02',
    ReportingArea: 'Reading',
    StateCode: 'PA',
    ParameterName: 'PM2.5',
    AQI: 320,
    Category: { Number: 6, Name: 'Hazardous' },
  },
];

function fakeFetch(obs: unknown[], forecast: unknown[]): {
  fn: FetchFn;
  calls: () => number;
  key: () => string;
} {
  let count = 0;
  let key = '';
  const fn = (async (url: string) => {
    count += 1;
    const u = String(url);
    key = new URL(u).searchParams.get('API_KEY') ?? '';
    if (u.includes('/aq/observation/')) {
      return { ok: true, json: async () => obs };
    }
    if (u.includes('/aq/forecast/')) {
      return { ok: true, json: async () => forecast };
    }
    throw new Error('unexpected url ' + u);
  }) as unknown as FetchFn;
  return { fn, calls: () => count, key: () => key };
}

describe('AirNowFeedsProvider (US EPA)', () => {
  it('sin llave: estado declarado, jamás una llamada', async () => {
    const { fn, calls } = fakeFetch([], []);
    const p = new AirNowFeedsProvider(fn, { apiKey: '' });
    expect(p.configured).toBe(false);
    await expect(p.liveEvents(40.3356, -75.9269)).rejects.toThrow(
      AIRNOW_NOT_CONFIGURED,
    );
    expect(calls()).toBe(0);
  });

  it('AQI bueno: cero alertas y resumen con la lectura', async () => {
    const { fn } = fakeFetch(OBS_GOOD, []);
    const p = new AirNowFeedsProvider(fn, { apiKey: 'k' });
    const alerts = await p.liveEvents(40.3356, -75.9269);
    expect(alerts).toHaveLength(0);
    expect(p.lastSummary()).toBe('AQI 45 (Good)');
  });

  it('AQI alto en observación y pronóstico: alerta por registro, severidad EPA', async () => {
    const { fn, key } = fakeFetch(OBS_USG, FORECAST_UNHEALTHY);
    const p = new AirNowFeedsProvider(fn, { apiKey: 'k' });
    const alerts = await p.liveEvents(40.3356, -75.9269);
    expect(alerts).toHaveLength(2);
    expect(alerts[0].source).toBe('AirNow');
    expect(alerts[0].severity).toBe('Moderate'); // USG 101-150
    expect(alerts[0].event).toContain('AQI 120');
    expect(alerts[0].area).toContain('Reading');
    expect(alerts[0].url).toBe('https://www.airnow.gov/');
    expect(alerts[1].severity).toBe('Severe'); // Unhealthy 151-200
    expect(alerts[1].headline).toContain('2026-11-02'); // pronóstico fechado
    expect(key()).toBe('k');
  });

  it('AQI Hazardous (301+): Extreme y aviso prioritario', async () => {
    const { fn } = fakeFetch([], FORECAST_HAZARDOUS);
    const p = new AirNowFeedsProvider(fn, { apiKey: 'k' });
    const alerts = await p.liveEvents(40.3356, -75.9269);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe('Extreme');
  });
});
