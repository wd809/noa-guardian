/**
 * Huella de emparejamiento: 8 hex de un hash NO criptográfico (cyrb53) del
 * token. Solo sirve para comparar a ojo "¿este teléfono y este Dock hablan
 * del mismo token?" — se muestra en el log de arranque del Dock y en la
 * vista Session, NUNCA viaja por red ni sustituye al token.
 *
 * El MISMO algoritmo vive en apps/web (dock-client.service): cualquier
 * cambio aquí debe replicarse allí, y el vector de prueba es idéntico en
 * ambas suites para que un desfase rompa los tests.
 */
export function tokenFingerprint(token: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < token.length; i++) {
    const ch = token.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0))
    .toString(16)
    .padStart(14, '0')
    .slice(0, 8);
}
