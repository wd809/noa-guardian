import { CircuitBreakerRegistry } from './circuit-breaker.js';

describe('CircuitBreakerRegistry (Etapa D, D2)', () => {
  function reloj() {
    let now = 1_000_000;
    return {
      fn: () => now,
      avanzar: (ms: number) => {
        now += ms;
      },
    };
  }

  it('arranca en ok y un éxito lo mantiene en ok con lastOkAt', () => {
    const r = reloj();
    const cb = new CircuitBreakerRegistry(r.fn);
    cb.recordSuccess('NWS');
    const s = cb.snapshot()['NWS'];
    expect(s.state).toBe('ok');
    expect(s.consecutiveFailures).toBe(0);
    expect(s.lastOkAt).not.toBeNull();
    expect(cb.minutesSinceLastOk('NWS')).toBe(0);
  });

  it('1-2 fallos = degraded; el 3.º abre el circuito (down) por 5 min', () => {
    const r = reloj();
    const cb = new CircuitBreakerRegistry(r.fn);
    cb.recordFailure('USGS', 'timeout');
    expect(cb.snapshot()['USGS'].state).toBe('degraded');
    cb.recordFailure('USGS', 'timeout');
    expect(cb.snapshot()['USGS'].state).toBe('degraded');
    cb.recordFailure('USGS', 'timeout');
    expect(cb.isOpen('USGS')).toBe(true);
    const s = cb.snapshot()['USGS'];
    expect(s.state).toBe('down');
    expect(s.circuitOpenUntil).not.toBeNull();
    r.avanzar(4 * 60_000);
    expect(cb.isOpen('USGS')).toBe(true);
    r.avanzar(61_000);
    expect(cb.isOpen('USGS')).toBe(false); // venció: toca intento de prueba
  });

  it('tras vencer, un fallo reabre y un éxito limpia todo', () => {
    const r = reloj();
    const cb = new CircuitBreakerRegistry(r.fn);
    for (let i = 0; i < 3; i++) cb.recordFailure('NASA EONET', 'HTTP 500');
    r.avanzar(5 * 60_000 + 1);
    cb.recordFailure('NASA EONET', 'HTTP 500');
    expect(cb.isOpen('NASA EONET')).toBe(true); // reabrió al primer fallo
    r.avanzar(5 * 60_000 + 1);
    cb.recordSuccess('NASA EONET');
    const s = cb.snapshot()['NASA EONET'];
    expect(s.state).toBe('ok');
    expect(s.consecutiveFailures).toBe(0);
    expect(s.lastError).toBeNull();
  });

  it('minutesSinceLastOk es null sin éxito previo y crece con el reloj', () => {
    const r = reloj();
    const cb = new CircuitBreakerRegistry(r.fn);
    expect(cb.minutesSinceLastOk('NWS')).toBeNull();
    cb.recordSuccess('NWS');
    r.avanzar(7 * 60_000);
    expect(cb.minutesSinceLastOk('NWS')).toBe(7);
  });
});
