import { CitizenService, namedForeignState } from './citizen.service.js';
import {
  Corpus,
  CorpusService,
  normalizeText,
} from './corpus.service.js';

function chunk(
  titulo: string,
  jurisdiccion: string,
  heading: string,
  text: string,
  companion = false,
) {
  return {
    doc: {
      file: 'x.md',
      titulo,
      fuente: 'https://example.gov',
      jurisdiccion,
      vigencia: '2026-10-27',
      releasePoint: 'PL 119-121',
      companion,
    },
    heading,
    seccion: null,
    text,
    normHeading: normalizeText(heading),
    normText: normalizeText(text),
  };
}

const fakeCorpus: Corpus = {
  docs: [
    {
      file: 'pa/wiretap.md',
      titulo: 'Wiretap Act de Pensilvania',
      fuente: 'https://www.legis.state.pa.us',
      jurisdiccion: 'Pensilvania, EE. UU.',
      vigencia: '2026-10-27',
      releasePoint: '',
      companion: false,
    },
  ],
  chunks: [
    chunk(
      'Wiretap Act de Pensilvania',
      'Pensilvania, EE. UU.',
      '## § 5703 — Interception',
      'It is unlawful to intentionally intercept any wire or oral communication. ' +
        'Interception of a communication requires the consent of all parties in Pennsylvania.',
    ),
  ],
  textIndex: '',
  loadedAt: null,
  dir: 'fake',
};
fakeCorpus.textIndex = fakeCorpus.chunks
  .map((c) => `${c.normHeading} ${c.normText}`)
  .join('\n');

function makeService() {
  const stub = { get: () => fakeCorpus } as unknown as CorpusService;
  return new CitizenService(stub);
}

describe('CitizenService', () => {
  it('responde desde el corpus con citas cuando hay respaldo', () => {
    const { status, body } = makeService().answer({
      text: '¿Puedo grabar esta conversación sin consentimiento?',
    }) as { status: number; body: { text: string; citations: string[]; source: string } };
    expect(status).toBe(200);
    expect(body.source).toBe('corpus');
    expect(body.citations.length).toBeGreaterThan(0);
    expect(body.text).toContain('no asesoría legal');
  });

  it('se abstiene sin respaldo: no inventa leyes', () => {
    const { body } = makeService().answer({
      text: '¿Cuál es la ley de divorcio y custodia compartida?',
    }) as { body: { text: string; citations: string[] } };
    expect(body.text).toContain('no está en el corpus verificado');
    expect(body.citations).toEqual([]);
  });

  it('puerta de jurisdicción: otro estado + tema de ley estatal de PA → no la entrega', () => {
    const { body } = makeService().answer({
      text: '¿Puedo grabar esta conversación en California sin consentimiento?',
    }) as { body: { text: string; citations: string[] } };
    expect(body.text).toContain('California');
    expect(body.text).toContain('no aplica en California');
    expect(body.citations).toEqual([]);
  });

  it('vigencia (C8): responde desde los metadatos del corpus', () => {
    const { body } = makeService().answer({
      text: '¿La ley sigue vigente o cambió?',
    }) as { body: { text: string } };
    expect(body.text).toContain('release point');
    expect(body.text).toContain('2026-10-27');
  });

  it('sin texto → 400 missing_text', () => {
    const { status, body } = makeService().answer({ text: '  ' }) as {
      status: number;
      body: { error: string };
    };
    expect(status).toBe(400);
    expect(body.error).toBe('missing_text');
  });
});

describe('namedForeignState', () => {
  it('detecta estados con puntuación alrededor', () => {
    expect(namedForeignState('¿y en california?')).toBe('California');
    expect(namedForeignState('vivo en Nueva York')).toBe('Nueva York');
  });
  it('no confunde Pensilvania con un estado ajeno', () => {
    expect(namedForeignState('¿puedo grabar en Pensilvania?')).toBeNull();
  });
});
