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
      topHeadline: 'Severe thunderstorm',
      sources: { ...TODO_OK, NWS: salud('down') },
    });
    expect(r.state).toBe('red');
    expect(r.label).toContain('Severe thunderstorm');
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
      alertsKnown: true,
      sources: TODO_OK,
    });
    expect(r.state).toBe('green');
    expect(r.unverified).toEqual([]);
  });

  it('ámbar si las alertas aún no se comprobaron (alertsKnown ausente)', () => {
    const r = computeOrbState({
      reachable: true,
      alertsCount: 0,
      sources: TODO_OK,
    });
    expect(r.state).toBe('amber');
    expect(r.label).toContain('incomplete');
  });

  it('ámbar si la salud de fuentes aún no se consultó', () => {
    const r = computeOrbState({
      reachable: true,
      alertsCount: 0,
      alertsKnown: true,
      sources: null,
    });
    expect(r.state).toBe('amber');
  });

  it('las fuentes nuevas cuentan: USGS Water caída → ámbar; AirNow en trámite no bloquea', () => {
    const down = computeOrbState({
      reachable: true,
      alertsCount: 0,
      alertsKnown: true,
      sources: {
        ...TODO_OK,
        'USGS Water': salud('down'),
        AirNow: salud('not_configured'),
      },
    });
    expect(down.state).toBe('amber');
    expect(down.unverified).toEqual(['USGS Water']);
    const verified = computeOrbState({
      reachable: true,
      alertsCount: 0,
      alertsKnown: true,
      sources: {
        ...TODO_OK,
        'USGS Water': salud('ok'),
        AirNow: salud('not_configured'),
      },
    });
    expect(verified.state).toBe('green');
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
    expect(rows[3].label).toBe('Not connected');
  });

  it('sin datos devuelve vacío', () => {
    expect(sourceRows(null)).toEqual([]);
  });

  it('la lectura verificada acompaña a la edad del dato', () => {
    const rows = sourceRows(
      {
        'USGS Water': {
          ...salud('ok'),
          summary: 'Schuylkill 3.2 ft (flood 15.5 ft)',
        },
      },
      new Date('2026-10-29T13:05:00.000Z'),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].detail).toContain('5 min ago');
    expect(rows[0].detail).toContain('Schuylkill 3.2 ft');
  });
});
