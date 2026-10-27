import type { AlertasRespuesta, OfficialAlert } from '@noa-guardian/contracts';
import {
  buildGuardianBody,
  isProactive,
  liveAlerts,
} from './guardian.service.js';

const POINT = { lat: 40.3356, lon: -75.9269, defaulted: false };

function payload(
  alerts: OfficialAlert[],
  sources: AlertasRespuesta['sources'],
): AlertasRespuesta {
  return {
    alerts,
    sources,
    point: { lat: POINT.lat, lon: POINT.lon },
    generatedAt: '2026-10-27T14:00:00.000Z',
    cache: { hit: false, ttlSeconds: 120 },
  };
}

const ALL_OK = {
  NWS: { ok: true, count: 0 },
  USGS: { ok: true, count: 0 },
  'NASA EONET': { ok: true, count: 0 },
};

describe('buildGuardianBody — honestidad de la evaluación', () => {
  it('sin alertas y con todas las fuentes ok: lo dice, sin prometer seguridad', () => {
    const body = buildGuardianBody(payload([], ALL_OK), POINT);
    expect(body.text).toContain('Sin alertas oficiales activas');
    expect(body.text).toContain('no es una garantía de seguridad');
    expect(body.guardian.total).toBe(0);
    expect(body.guardian.proactiveAlert).toBe(false);
    expect(body.source).toBe('feeds');
  });

  it('cero alertas pero una fuente caída: NO es un «todo despejado»', () => {
    const sources = { ...ALL_OK, NWS: { ok: false, count: 0, error: 'HTTP 503' } };
    const body = buildGuardianBody(payload([], sources), POINT);
    expect(body.text).toContain('no es un «todo despejado»');
    expect(body.text).toContain('NWS');
  });

  it('todas las fuentes caídas: no afirma ni seguridad ni peligro', () => {
    const sources = {
      NWS: { ok: false, count: 0, error: 'x' },
      USGS: { ok: false, count: 0, error: 'x' },
      'NASA EONET': { ok: false, count: 0, error: 'x' },
    };
    const body = buildGuardianBody(payload([], sources), POINT);
    expect(body.text).toContain('no afirmo que estés seguro ni que haya peligro');
    expect(body.citations).toEqual([]);
  });

  it('alerta Severe: aviso prioritario y cita con fuente y URL', () => {
    const alert: OfficialAlert = {
      event: 'Severe Thunderstorm Warning',
      severity: 'Severe',
      headline: 'Storm warning',
      area: 'Berks County',
      ends: '2099-01-01T00:00:00Z',
      source: 'NWS',
      url: 'https://api.weather.gov/alerts/1',
    };
    const body = buildGuardianBody(payload([alert], ALL_OK), POINT);
    expect(body.text).toContain('AVISO PRIORITARIO');
    expect(body.guardian.proactiveAlert).toBe(true);
    expect(body.citations[0]).toContain('NWS');
    expect(body.citations[0]).toContain('https://api.weather.gov/alerts/1');
  });

  it('evento de la lista cerrada con severidad menor también es proactivo', () => {
    const alert: OfficialAlert = {
      event: 'Flash Flood Warning',
      severity: 'Moderate',
      headline: 'Flash flood',
      area: 'Reading',
      source: 'NWS',
    };
    expect(isProactive(alert)).toBe(true);
  });

  it('alertas vencidas se excluyen y se cuentan aparte', () => {
    const expired: OfficialAlert = {
      event: 'Heat Advisory',
      severity: 'Moderate',
      headline: 'old',
      area: 'Berks',
      ends: '2020-01-01T00:00:00Z',
      source: 'NWS',
    };
    const body = buildGuardianBody(payload([expired], ALL_OK), POINT);
    expect(body.guardian.total).toBe(0);
    expect(body.guardian.expiredExcluded).toBe(1);
    expect(liveAlerts([expired], Date.parse('2026-10-27'))).toHaveLength(0);
  });

  it('punto por defecto: la respuesta lo declara', () => {
    const body = buildGuardianBody(payload([], ALL_OK), {
      ...POINT,
      defaulted: true,
      label: 'Reading, PA (punto por defecto)',
    });
    expect(body.text).toContain('punto por defecto');
    expect(body.guardian.point.defaulted).toBe(true);
  });
});
