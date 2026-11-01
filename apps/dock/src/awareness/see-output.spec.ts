import { describe, expect, it } from 'vitest';
import { parseSeeOutput, SeeOutputError } from './see-output.js';

const VALIDO = JSON.stringify({
  description: 'A kitchen. A wet floor sign is 2 meters ahead.',
  peoplePresent: true,
  peopleCount: 1,
  hazards: ['wet floor ahead'],
  readableText: ['EXIT'],
  confidence: 'high',
});

describe('parseSeeOutput (la salida del modelo es dato no confiable)', () => {
  it('acepta el JSON válido del esquema', () => {
    const scene = parseSeeOutput(VALIDO);
    expect(scene.peopleCount).toBe(1);
    expect(scene.hazards).toEqual(['wet floor ahead']);
    expect(scene.confidence).toBe('high');
  });

  it('acepta JSON envuelto en cercas de markdown', () => {
    const scene = parseSeeOutput('```json\n' + VALIDO + '\n```');
    expect(scene.description).toContain('kitchen');
  });

  it('rechaza texto que no es JSON', () => {
    expect(() => parseSeeOutput('There is a dog in the photo.')).toThrow(
      SeeOutputError,
    );
  });

  it('rechaza tipos incorrectos (peoplePresent no booleano)', () => {
    const bad = JSON.stringify({
      description: 'x',
      peoplePresent: 'yes',
      peopleCount: null,
      hazards: [],
      readableText: [],
      confidence: 'low',
    });
    expect(() => parseSeeOutput(bad)).toThrow(SeeOutputError);
  });

  it('rechaza confidence fuera del enum y descripción vacía', () => {
    const bad = JSON.stringify({
      description: '  ',
      peoplePresent: false,
      peopleCount: null,
      hazards: [],
      readableText: [],
      confidence: 'certain',
    });
    expect(() => parseSeeOutput(bad)).toThrow(SeeOutputError);
  });

  it('sanea marcas y controles, y trunca la descripción a 500', () => {
    const raw = JSON.stringify({
      description: '<script>alert(1)</script> ' + 'palabra '.repeat(100),
      peoplePresent: false,
      peopleCount: null,
      hazards: [],
      readableText: [],
      confidence: 'medium',
    });
    const scene = parseSeeOutput(raw);
    expect(scene.description).not.toContain('<');
    expect(scene.description.length).toBeLessThanOrEqual(500);
  });

  it('limita las listas a 10 elementos saneados', () => {
    const raw = JSON.stringify({
      description: 'ok',
      peoplePresent: false,
      peopleCount: null,
      hazards: Array.from({ length: 30 }, (_, i) => `hazard ${i}`),
      readableText: [],
      confidence: 'low',
    });
    expect(parseSeeOutput(raw).hazards).toHaveLength(10);
  });
});
