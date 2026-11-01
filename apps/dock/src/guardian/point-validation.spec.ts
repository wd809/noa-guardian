import { parseAlertPoint } from './point-validation.js';

const FALLBACK = { lat: 40.3356, lon: -75.9269 };

describe('parseAlertPoint (GET /alerts)', () => {
  it('sin query usa el punto por defecto declarado', () => {
    expect(parseAlertPoint(undefined, undefined, FALLBACK)).toEqual({
      ...FALLBACK,
      defaulted: true,
    });
  });

  it('acepta un punto válido en rango', () => {
    expect(parseAlertPoint('40.1', '-75.9', FALLBACK)).toEqual({
      lat: 40.1,
      lon: -75.9,
      defaulted: false,
    });
  });

  it('rechaza query parcial', () => {
    expect(() => parseAlertPoint('40.1', undefined, FALLBACK)).toThrow();
    expect(() => parseAlertPoint(undefined, '-75.9', FALLBACK)).toThrow();
  });

  it('rechaza lo no numérico y lo fuera de rango', () => {
    expect(() => parseAlertPoint('norte', '-75.9', FALLBACK)).toThrow();
    expect(() => parseAlertPoint('91', '0', FALLBACK)).toThrow();
    expect(() => parseAlertPoint('0', '181', FALLBACK)).toThrow();
    expect(() => parseAlertPoint('NaN', 'NaN', FALLBACK)).toThrow();
  });
});
