/**
 * Punto geográfico de GET /alerts: función pura. Sin query se usa el punto
 * por defecto del Dock (Reading, PA) con defaulted=true declarado; con
 * query parcial, no numérica o fuera de rango, 400 invalid_point.
 */

export interface AlertPoint {
  lat: number;
  lon: number;
  defaulted: boolean;
}

export function parseAlertPoint(
  latQ: string | undefined,
  lonQ: string | undefined,
  fallback: { lat: number; lon: number },
): AlertPoint {
  if ((latQ === undefined) !== (lonQ === undefined)) {
    throw new Error('lat and lon travel together or not at all');
  }
  if (latQ === undefined || lonQ === undefined) {
    return { lat: fallback.lat, lon: fallback.lon, defaulted: true };
  }
  const lat = Number(latQ);
  const lon = Number(lonQ);
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    lat < -90 ||
    lat > 90 ||
    lon < -180 ||
    lon > 180
  ) {
    throw new Error('lat must be in [-90, 90] and lon in [-180, 180]');
  }
  return { lat, lon, defaulted: false };
}
