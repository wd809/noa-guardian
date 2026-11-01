import { AbuseTrackerService } from './abuse-tracker.service.js';

describe('AbuseTrackerService (Etapa D, D3)', () => {
  function reloj() {
    let now = 5_000_000;
    return {
      fn: () => now,
      avanzar: (ms: number) => {
        now += ms;
      },
    };
  }

  it('permite hasta el límite por clase y luego corta (429)', () => {
    const r = reloj();
    const t = new AbuseTrackerService(r.fn);
    for (let i = 0; i < 15; i++) expect(t.allow('1.2.3.4', 'ask')).toBe(true);
    expect(t.allow('1.2.3.4', 'ask')).toBe(false);
    // Otra clase de la misma IP no comparte cubeta.
    expect(t.allow('1.2.3.4', 'alerts')).toBe(true);
    // Otra IP tampoco.
    expect(t.allow('5.6.7.8', 'ask')).toBe(true);
    // La ventana de 60 s reinicia el conteo.
    r.avanzar(60_000);
    expect(t.allow('1.2.3.4', 'ask')).toBe(true);
  });

  it('5 fallos de token en 60 s bloquean la IP por 15 min', () => {
    const r = reloj();
    const t = new AbuseTrackerService(r.fn);
    for (let i = 0; i < 4; i++) t.recordAuthFailure('9.9.9.9');
    expect(t.isBlocked('9.9.9.9')).toBe(false);
    t.recordAuthFailure('9.9.9.9');
    expect(t.isBlocked('9.9.9.9')).toBe(true);
    r.avanzar(14 * 60_000);
    expect(t.isBlocked('9.9.9.9')).toBe(true);
    r.avanzar(61_000);
    expect(t.isBlocked('9.9.9.9')).toBe(false);
  });

  it('fallos repartidos fuera de la ventana no acumulan bloqueo', () => {
    const r = reloj();
    const t = new AbuseTrackerService(r.fn);
    for (let i = 0; i < 4; i++) t.recordAuthFailure('8.8.8.8');
    r.avanzar(61_000);
    t.recordAuthFailure('8.8.8.8');
    expect(t.isBlocked('8.8.8.8')).toBe(false);
  });

  it('ipHash es estable, corto y no contiene la IP', () => {
    const t = new AbuseTrackerService(() => 0);
    const h = t.ipHash('192.168.1.50');
    expect(h).toHaveLength(8);
    expect(h).not.toContain('192');
    expect(t.ipHash('192.168.1.50')).toBe(h);
  });

  it('poda las entradas vencidas en el siguiente acceso', () => {
    const r = reloj();
    const t = new AbuseTrackerService(r.fn);
    t.allow('10.0.0.1', 'ask');
    t.recordAuthFailure('10.0.0.2');
    expect(t.trackedCount()).toBe(2);
    r.avanzar(61_000);
    expect(t.allow('10.0.0.3', 'ask')).toBe(true);
    // Solo queda la cubeta nueva: lo vencido se podó.
    expect(t.trackedCount()).toBe(1);
  });

  it('el tope duro evita crecimiento sin fin rotando IPs', () => {
    const t = new AbuseTrackerService(() => 5_000_000);
    for (let i = 0; i < 5100; i++) t.allow(`10.1.${i >> 8}.${i & 255}`, 'ask');
    expect(t.trackedCount()).toBeLessThanOrEqual(5000);
  });
});
