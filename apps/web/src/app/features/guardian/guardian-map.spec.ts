import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import type { OfficialAlert } from '@noa-guardian/contracts';
import { GuardianMap, alertPoint } from './guardian-map';

const mocks = vi.hoisted(() => {
  const handlers: Record<string, Array<() => void>> = {};
  const map = {
    setView: vi.fn().mockReturnThis(),
    attributionControl: { setPrefix: vi.fn() },
    invalidateSize: vi.fn(),
    remove: vi.fn(),
  };
  const layer = { clearLayers: vi.fn(), addTo: vi.fn().mockReturnThis() };
  const tiles = {
    on: vi.fn((event: string, handler: () => void) => {
      (handlers[event] ??= []).push(handler);
      return tiles;
    }),
    addTo: vi.fn().mockReturnThis(),
  };
  const circle = {
    setLatLng: vi.fn(),
    bindTooltip: vi.fn().mockReturnThis(),
    addTo: vi.fn().mockReturnThis(),
  };
  return {
    handlers,
    map,
    layer,
    tiles,
    circle,
    circleMarker: vi.fn(() => circle),
    createMap: vi.fn(() => map),
  };
});
vi.mock('leaflet', () => ({
  map: mocks.createMap,
  tileLayer: vi.fn(() => mocks.tiles),
  circleMarker: mocks.circleMarker,
  layerGroup: vi.fn(() => mocks.layer),
}));

const alert: OfficialAlert = {
  source: 'NWS',
  severity: 'Severe',
  event: 'Warning',
  headline: '<b>Official headline</b>',
  area: 'Reading',
};
const located = { ...alert, point: { lat: 40.34, lon: -75.92 } };

async function setup(alerts: OfficialAlert[] = [], known = true) {
  TestBed.configureTestingModule({ imports: [GuardianMap] });
  const fixture = TestBed.createComponent(GuardianMap);
  fixture.componentRef.setInput('center', { lat: 40.3356, lon: -75.9269 });
  fixture.componentRef.setInput('alerts', alerts);
  fixture.componentRef.setInput('alertsKnown', known);
  fixture.detectChanges();
  await vi.dynamicImportSettled();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

describe('Guardian map presentation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(mocks.handlers)) delete mocks.handlers[key];
  });

  it('uses the query center and draws zero alert markers when the real list is empty', async () => {
    const fixture = await setup();
    expect(mocks.map.setView).toHaveBeenCalledWith([40.3356, -75.9269], 13);
    expect(mocks.circleMarker).toHaveBeenCalledTimes(1); // Query position only.
    expect(fixture.nativeElement.textContent).toContain('No active official alerts in your area');
    expect(fixture.nativeElement.textContent).toContain('© OpenStreetMap contributors');
    fixture.destroy();
    expect(mocks.map.remove).toHaveBeenCalled();
  });

  it('never infers coordinates from an area or coerces null/invalid coordinates', () => {
    expect(alertPoint(alert)).toBeNull();
    expect(
      alertPoint({ ...alert, point: { lat: null, lon: 0 } } as unknown as OfficialAlert),
    ).toBeNull();
    const invalid = { ...alert, point: { lat: 91, lon: 0 } };
    expect(alertPoint(invalid)).toBeNull();
    expect(alertPoint(located)).toEqual(located.point);
  });

  it('renders only supplied valid points, escapes headlines and clears markers when verification is lost', async () => {
    const fixture = await setup([alert, located]);
    expect(mocks.circleMarker).toHaveBeenCalledTimes(2);
    const tooltip = mocks.circle.bindTooltip.mock.calls.at(-1)?.[0] as HTMLElement;
    expect(tooltip.textContent).toContain('<b>Official headline</b>');
    expect(tooltip.querySelector('b')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('1 without coordinates');
    mocks.layer.clearLayers.mockClear();
    mocks.circleMarker.mockClear();
    fixture.componentRef.setInput('alertsKnown', false);
    fixture.detectChanges();
    expect(mocks.layer.clearLayers).toHaveBeenCalled();
    expect(mocks.circleMarker).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Active alerts not verified');
    fixture.destroy();
  });

  it('declares tile errors locally and recovers after a successful tile batch', async () => {
    const fixture = await setup();
    for (const handler of mocks.handlers['tileerror']) handler();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Map unavailable offline');
    expect(fixture.nativeElement.textContent).toContain('No active official alerts in your area');
    for (const event of ['loading', 'tileload', 'load']) {
      for (const handler of mocks.handlers[event]) handler();
    }
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Map unavailable offline');
    fixture.destroy();
  });

  it('catches initialization failure so Guardian can still render', async () => {
    mocks.createMap.mockImplementationOnce(() => {
      throw new Error('map failed');
    });
    const fixture = await setup();
    expect(fixture.nativeElement.textContent).toContain('Map unavailable offline');
    expect(fixture.nativeElement.textContent).toContain('No active official alerts in your area');
    fixture.destroy();
  });
});
