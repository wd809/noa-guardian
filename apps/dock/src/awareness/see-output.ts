import type { SeeRespuesta } from '@noa-guardian/contracts';

/**
 * La salida del modelo de visión es DATO NO CONFIABLE (reglas de Spark 1.3):
 * 1) se valida contra el esquema estricto y se rechaza entera si no cumple;
 * 2) todo texto se sanea (sin marcas ni caracteres de control) y se trunca;
 * 3) si falla, el Dock responde con un error declarado y SIN contenido del
 *    modelo — jamás se habla texto crudo del modelo.
 */

export class SeeOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SeeOutputError';
  }
}

const MAX_DESCRIPTION = 500;
const MAX_LIST_ITEMS = 10;
const MAX_LIST_ITEM = 120;

function sanitize(text: string, max: number): string {
  return text
    // Caracteres de control y marcas HTML básicas fuera antes de TTS/display.
    .replace(/[<>{}[\]\\]/g, ' ')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringList(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) {
    throw new SeeOutputError(`${field} must be an array`);
  }
  return value
    .slice(0, MAX_LIST_ITEMS)
    .map((item) => {
      if (typeof item !== 'string') {
        throw new SeeOutputError(`${field} items must be strings`);
      }
      return sanitize(item, MAX_LIST_ITEM);
    })
    .filter((item) => item.length > 0);
}

/** Extrae y valida el JSON del modelo. Lanza SeeOutputError si no cumple. */
export function parseSeeOutput(raw: string): Omit<SeeRespuesta, 'source' | 'usage'> {
  let parsed: unknown;
  try {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start < 0 || end <= start) throw new Error('no JSON object');
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch {
    throw new SeeOutputError('model output is not valid JSON');
  }
  if (!isRecord(parsed)) {
    throw new SeeOutputError('model output is not an object');
  }
  const { description, peoplePresent, peopleCount, hazards, readableText, confidence } =
    parsed;
  if (typeof description !== 'string' || description.trim().length === 0) {
    throw new SeeOutputError('description must be a non-empty string');
  }
  if (typeof peoplePresent !== 'boolean') {
    throw new SeeOutputError('peoplePresent must be a boolean');
  }
  if (
    peopleCount !== null &&
    (typeof peopleCount !== 'number' ||
      !Number.isInteger(peopleCount) ||
      peopleCount < 0)
  ) {
    throw new SeeOutputError('peopleCount must be an integer or null');
  }
  if (confidence !== 'low' && confidence !== 'medium' && confidence !== 'high') {
    throw new SeeOutputError('confidence must be low | medium | high');
  }
  return {
    description: sanitize(description, MAX_DESCRIPTION),
    peoplePresent,
    peopleCount,
    hazards: stringList(hazards, 'hazards'),
    readableText: stringList(readableText, 'readableText'),
    confidence,
  };
}
