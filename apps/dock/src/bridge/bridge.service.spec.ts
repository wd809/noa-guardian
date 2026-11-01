import { describe, expect, it } from 'vitest';
import { BridgeService } from './bridge.service.js';

const T0 = Date.parse('2026-10-29T13:00:00.000Z');

function serviceConReloj() {
  let now = T0;
  return {
    service: new BridgeService(() => now),
    avanzar: (ms: number) => {
      now += ms;
    },
  };
}

const LATIDO = { batteryPct: 82, net: 'wifi' as const, glassesConnected: true };

describe('BridgeService (latido y estados, diseño Spark 1.3)', () => {
  it('un latido registra el dispositivo como activo', () => {
    const { service } = serviceConReloj();
    const view = service.recordHeartbeat('phone-a34f', 'm1', LATIDO);
    expect(view.state).toBe('active');
    expect(view.batteryPct).toBe(82);
    expect(view.lastNet).toBe('wifi');
  });

  it('stale tras 90 s de silencio y gone tras 300 s', () => {
    const { service, avanzar } = serviceConReloj();
    service.recordHeartbeat('phone-a34f', 'm1', LATIDO);
    avanzar(89_000);
    expect(service.devicesView()[0].state).toBe('active');
    avanzar(2_000);
    expect(service.devicesView()[0].state).toBe('stale');
    avanzar(209_000);
    expect(service.devicesView()[0].state).toBe('gone');
  });

  it('un latido nuevo revive un dispositivo gone', () => {
    const { service, avanzar } = serviceConReloj();
    service.recordHeartbeat('phone-a34f', 'm1', LATIDO);
    avanzar(400_000);
    expect(service.devicesView()[0].state).toBe('gone');
    service.recordHeartbeat('phone-a34f', 'm2', LATIDO);
    expect(service.devicesView()[0].state).toBe('active');
  });

  it('detecta msgId duplicados por dispositivo, no entre dispositivos', () => {
    const { service } = serviceConReloj();
    service.recordHeartbeat('phone-a34f', 'm1', LATIDO);
    expect(service.isDuplicate('phone-a34f', 'm1')).toBe(true);
    expect(service.isDuplicate('phone-a34f', 'm2')).toBe(false);
    expect(service.isDuplicate('glasses-b91c', 'm1')).toBe(false);
  });

  it('ask y alerts_poll también cuentan como presencia', () => {
    const { service, avanzar } = serviceConReloj();
    service.recordHeartbeat('phone-a34f', 'm1', LATIDO);
    avanzar(200_000);
    service.recordActivity('phone-a34f', 'm2');
    expect(service.devicesView()[0].state).toBe('active');
  });
});
