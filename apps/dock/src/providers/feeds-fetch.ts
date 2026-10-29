/**
 * Token de inyección compartido de la función fetch de los proveedores
 * de fuentes (vive aparte para que official-feeds y penndot-feeds lo
 * usen sin importarse entre sí).
 */
export const FEEDS_FETCH = Symbol('FEEDS_FETCH');
export type FetchFn = typeof fetch;
