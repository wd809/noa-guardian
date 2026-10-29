import type { FuenteSalud } from '@noa-guardian/contracts';
import { computeOrbState, sourceRows } from './orb-state';

function salud(state: FuenteSalud['state']): FuenteSalud {
  return {
    state,
    consecutiveFailures: state === 'down' ? 3 : 0,
    lastOkAt: '2026-10-29T13:00:00.000Z',
    lastError: state === 'ok' ? null : 'fallo simulado',
    circuitOpenUntil: null,
  };
}

const TODO_OK = {
  NWS: salud('ok'),
  USGS: salud('ok'),
  EONET: salud('ok'),
  PennDOT: salud('not_configured'),
};

describe('computeOrbState (diseño Spark 1.3, Etapa D1)', () => {
  it('gris cuando el Dock no responde, aunque hubiera datos en caché', () => {
    const r = computeOrbState({
      reachable: false,
      alertsCount: 2,
      sources: TODO_OK,
      lastCheckAt: '2026-10-29T13:00:00.000Z',
    });
    expect(r.state).toBe('gray');
  });

  it('rojo con alerta oficial activa, y gana al ámbar', () => {
    const r = computeOrbState({
      reachable: true,
      alertsCount: 1,
      topHeadline: 'Tormenta severa',
      sources: { ...TODO_OK, NWS: salud('down') },
    });
    expect(r.state).toBe('red');
    expect(r.label).toContain('Tormenta severa');
    expect(r.unverified).toEqual(['NWS']);
  });

  it('ámbar cuando una fuente configurada está degradada', () => {
    const r = computeOrbState({
      reachable: true,
      alertsCount: 0,
      sources: { ...TODO_OK, USGS: salud('degraded') },
    });
    expect(r.state).toBe('amber');
    expect(r.unverified).toEqual(['USGS']);
  });

  it('ámbar cuando una fuente configurada está caída (fallo forzado)', () => {
    const r = computeOrbState({
      reachable: true,
      alertsCount: 0,
      sources: { ...TODO_OK, NWS: salud('down') },
    });
    expect(r.state).toBe('amber');
  });

  it('ámbar si las alertas no pudieron consultarse (sin emparejar)', () => {
    const r = computeOrbState({
      reachable: true,
      alertsCount: 0,
      alertsKnown: false,
      sources: TODO_OK,
    });
    expect(r.state).toBe('amber');
  });

  it('verde solo con todo verificado; PennDOT en trámite no bloquea', () => {
    const r = computeOrbState({
      reachable: true,
      alertsCount: 0,
      sources: TODO_OK,
    });
    expect(r.state).toBe('green');
    expect(r.unverified).toEqual([]);
  });
});

describe('sourceRows (semáforo)', () => {
  it('ordena: caída, degradada, en vivo, no conectada', () => {
    const rows = sourceRows(
      {
        NWS: salud('ok'),
        USGS: salud('down'),
        EONET: salud('degraded'),
        PennDOT: salud('not_configured'),
      },
      new Date('2026-10-29T13:05:00.000Z'),
    );
    expect(rows.map((r) => r.name)).toEqual(['USGS', 'EONET', 'NWS', 'PennDOT']);
    expect(rows.map((r) => r.color)).toEqual(['red', 'amber', 'green', 'gray']);
    expect(rows[3].label).toBe('No conectada');
  });

  it('sin datos devuelve vacío', () => {
    expect(sourceRows(null)).toEqual([]);
  });
});
