import { describe, expect, it } from 'vitest';
import { validateBridgeMessage } from './bridge-validation.js';

const NOW = Date.parse('2026-10-29T13:00:00.000Z');
const UUID = '550e8400-e29b-41d4-a716-446655440000';

function heartbeat(overrides: Record<string, unknown> = {}): unknown {
  return {
    v: '1.0',
    msgId: UUID,
    type: 'heartbeat',
    deviceId: 'phone-a34f',
    ts: new Date(NOW).toISOString(),
    payload: { batteryPct: 82, net: 'wifi', glassesConnected: true },
    ...overrides,
  };
}

describe('validateBridgeMessage (puente v1, diseño Spark 1.3)', () => {
  it('acepta un latido válido', () => {
    expect(validateBridgeMessage(heartbeat(), NOW)).toEqual([]);
  });

  it('acepta campos extra en el payload (versionado aditivo)', () => {
    const msg = heartbeat({
      payload: {
        batteryPct: 82,
        net: 'wifi',
        glassesConnected: true,
        futureField: 'x',
      },
    });
    expect(validateBridgeMessage(msg, NOW)).toEqual([]);
  });

  it('rechaza un cuerpo que no es objeto', () => {
    expect(validateBridgeMessage('hola', NOW)[0].field).toBe('body');
    expect(validateBridgeMessage(null, NOW)[0].field).toBe('body');
  });

  it('rechaza una versión fuera de la v1', () => {
    const issues = validateBridgeMessage(heartbeat({ v: '2.0' }), NOW);
    expect(issues.map((i) => i.field)).toContain('v');
  });

  it('rechaza msgId que no es UUID v4 y deviceId con forma mala', () => {
    const issues = validateBridgeMessage(
      heartbeat({ msgId: 'abc', deviceId: 'Phone A!' }),
      NOW,
    );
    expect(issues.map((i) => i.field)).toEqual(
      expect.arrayContaining(['msgId', 'deviceId']),
    );
  });

  it('rechaza ts con desfase mayor de 300 s', () => {
    const issues = validateBridgeMessage(
      heartbeat({ ts: new Date(NOW - 301_000).toISOString() }),
      NOW,
    );
    expect(issues).toContainEqual({ field: 'ts', issue: 'skew >300s' });
  });

  it('rechaza tipos de respuesta como entrada (answer no entra)', () => {
    const issues = validateBridgeMessage(heartbeat({ type: 'answer' }), NOW);
    expect(issues.map((i) => i.field)).toContain('type');
  });

  it('valida los campos del latido: batería, red y gafas', () => {
    const issues = validateBridgeMessage(
      heartbeat({
        payload: { batteryPct: 140, net: '5g', glassesConnected: 'sí' },
      }),
      NOW,
    );
    expect(issues.map((i) => i.field)).toEqual(
      expect.arrayContaining([
        'payload.batteryPct',
        'payload.net',
        'payload.glassesConnected',
      ]),
    );
  });

  it('ask: exige utterance de 1-500 caracteres no vacía', () => {
    const base = heartbeat({ type: 'ask' });
    const blank = validateBridgeMessage(
      { ...(base as object), payload: { utterance: '   ' } },
      NOW,
    );
    expect(blank.map((i) => i.field)).toContain('payload.utterance');
    const ok = validateBridgeMessage(
      { ...(base as object), payload: { utterance: '¿qué hora es?' } },
      NOW,
    );
    expect(ok).toEqual([]);
  });

  it('alerts_poll: lat/lon fuera de rango se declaran', () => {
    const issues = validateBridgeMessage(
      heartbeat({ type: 'alerts_poll', payload: { lat: 140, lon: 0 } }),
      NOW,
    );
    expect(issues.map((i) => i.field)).toContain('payload.lat');
  });
});
