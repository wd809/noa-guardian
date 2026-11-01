import {
  acceptLegal,
  hasAcceptedLegal,
  LEGAL_BANNER,
  LEGAL_SECTIONS,
} from './legal-notice';

function fakeStore(): {
  read: (k: string) => string | null;
  write: (k: string, v: string) => void;
} {
  const map = new Map<string, string>();
  return {
    read: (k) => map.get(k) ?? null,
    write: (k, v) => void map.set(k, v),
  };
}

describe('legal-notice (descarga de responsabilidad)', () => {
  it('el banner y las secciones cubren las cláusulas obligatorias', () => {
    const all = [LEGAL_BANNER, ...LEGAL_SECTIONS.map((s) => `${s.title}. ${s.body}`)].join(
      '\n',
    );
    for (const clause of [
      '911',
      'not legal advice',
      'emergency service',
      'No safety guarantee',
      'own risk',
      'Seal of Trust',
      'LEGAL-NOTICE.md',
    ]) {
      expect(all).toContain(clause);
    }
    expect(LEGAL_SECTIONS.length).toBeGreaterThanOrEqual(5);
  });

  it('la aceptación se guarda y se lee en el dispositivo', () => {
    const store = fakeStore();
    expect(hasAcceptedLegal(store.read)).toBe(false);
    acceptLegal(store.write);
    expect(hasAcceptedLegal(store.read)).toBe(true);
  });

  it('sin almacenamiento no rompe: banner visible y app funcional', () => {
    const failing = () => {
      throw new Error('sin storage');
    };
    expect(hasAcceptedLegal(failing)).toBe(false);
    expect(() => acceptLegal(failing)).not.toThrow();
  });
});
