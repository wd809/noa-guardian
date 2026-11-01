import { tokenFingerprint } from './token-fingerprint.js';

describe('tokenFingerprint (huella de emparejamiento)', () => {
  it('vector compartido con la web: mismo algoritmo, mismo valor', () => {
    // Idéntico en apps/web dock-client.service.spec.ts: si un lado
    // deriva, su suite rompe y el desfase no llega al teléfono.
    expect(tokenFingerprint('WD-pairing-vector-7')).toBe('0756984d');
  });

  it('8 hex, estable y sensible al valor', () => {
    const fp = tokenFingerprint('secreto');
    expect(fp).toMatch(/^[0-9a-f]{8}$/);
    expect(tokenFingerprint('secreto')).toBe(fp);
    expect(tokenFingerprint('secreto ')).not.toBe(fp);
    expect(tokenFingerprint('')).toMatch(/^[0-9a-f]{8}$/);
  });
});
