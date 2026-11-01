import type { FetchFn } from './feeds-fetch.js';
import {
  PENNDOT_NOT_CONFIGURED,
  PennDotFeedsProvider,
  haversineKm,
} from './penndot-feeds.provider.js';

// Forma REAL del feed (ejemplo de la documentación oficial de PennDOT):
// booleans como "T"/"F", coordenadas como texto "lat,lon", sobre {Values}.
const PITTSBURGH_ROADWORK = {
  EventType: 'roadwork',
  Facility: 'HITE RD / TAWNEY RUN RD',
  Description:
    'Roadwork on HITE RD / TAWNEY RUN RD eastbound. There is a lane restriction.',
  CountyName: 'ALLEGHENY',
  FromLoc: 'Intersection of PITTSBURGH MILLS BL in FRAZER [2TWP]',
  FromLocLatLong: '40.5662781980593,-79.7956370235785',
  IncidentLoc: '',
  IncidentLocLatLong: '',
  LaneStatus: 'lane restriction',
  IsFatality: 'F',
  IsHazmat: 'F',
  HazmatMaterialName: '',
  IsFirstResponderWithMajorInjuryOrFatality: 'F',
  ActualDateTimeOpened: '',
  DateTimeEventOccurs: '2019-08-27 14:30',
  CreateTime: '2019-08-27 14:31:55',
};

const READING_CRASH = {
  EventType: 'crash',
  Facility: 'US 422',
  Description: 'Crash on US 422 westbound near Reading. Road closed.',
  CountyName: 'BERKS',
  FromLoc: 'Exit: US 222',
  FromLocLatLong: '40.3400,-75.9300',
  IncidentLoc: 'US 422 at Lancaster Ave',
  IncidentLocLatLong: '40.3380,-75.9280',
  LaneStatus: 'closed',
  IsFatality: 'T',
  IsHazmat: 'F',
  HazmatMaterialName: '',
  IsFirstResponderWithMajorInjuryOrFatality: 'F',
  ActualDateTimeOpened: '',
  DateTimeEventOccurs: '2026-10-29 06:00',
  CreateTime: '2026-10-29 06:01:00',
};

const READING_REOPENED = {
  ...READING_CRASH,
  EventType: 'debris',
  Facility: 'PA 61',
  ActualDateTimeOpened: '2026-10-29 06:30:00',
};

function fakeFetch(values: unknown[]): { fn: FetchFn; auth: () => string } {
  let auth = '';
  const fn = (async (_url: string, init?: { headers?: Record<string, string> }) => {
    auth = init?.headers?.Authorization ?? '';
    return { ok: true, json: async () => ({ Values: values }) };
  }) as unknown as FetchFn;
  return { fn, auth: () => auth };
}

describe('PennDotFeedsProvider (RCRS)', () => {
  it('sin credenciales: estado declarado, jamás una llamada', async () => {
    const { fn } = fakeFetch([]);
    const p = new PennDotFeedsProvider(fn, { user: '', pass: '' });
    expect(p.configured).toBe(false);
    await expect(p.liveEvents(40.3356, -75.9269)).rejects.toThrow(
      PENNDOT_NOT_CONFIGURED,
    );
  });

  it('mapea el evento cercano, filtra el lejano y el ya reabierto', async () => {
    const { fn, auth } = fakeFetch([
      PITTSBURGH_ROADWORK,
      READING_CRASH,
      READING_REOPENED,
    ]);
    const p = new PennDotFeedsProvider(fn, { user: 'wd', pass: 'secreto' });
    const alerts = await p.liveEvents(40.3356, -75.9269);
    expect(alerts).toHaveLength(1);
    const a = alerts[0];
    expect(a.source).toBe('PennDOT');
    expect(a.event).toContain('US 422');
    expect(a.severity).toBe('Severe'); // IsFatality = T
    expect(a.area).toContain('BERKS');
    expect(a.url).toBe('https://www.511pa.com/');
    // La autenticación viaja como Basic base64, nunca en la URL.
    expect(auth()).toBe(
      'Basic ' + Buffer.from('wd:secreto').toString('base64'),
    );
  });

  it('un cierre sin fatalidad es Moderate; un aviso menor es Minor', async () => {
    const cierre = { ...READING_CRASH, IsFatality: 'F' };
    const menor = {
      ...READING_CRASH,
      IsFatality: 'F',
      Facility: 'PA 183',
      LaneStatus: 'lane restriction',
    };
    const { fn } = fakeFetch([cierre, menor]);
    const p = new PennDotFeedsProvider(fn, { user: 'u', pass: 'p' });
    const alerts = await p.liveEvents(40.3356, -75.9269);
    expect(alerts.map((x) => x.severity)).toEqual(['Moderate', 'Minor']);
  });

  it('haversine: Reading↔Pittsburgh ≈ 300 km; Reading↔Lancaster ≈ 45 km', () => {
    expect(
      haversineKm(40.3356, -75.9269, 40.4406, -79.9959),
    ).toBeGreaterThan(280);
    expect(
      haversineKm(40.3356, -75.9269, 40.0379, -76.3055),
    ).toBeLessThan(50);
  });
});
