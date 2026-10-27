import { Injectable } from '@nestjs/common';
import { SecurityEventsService } from '../observability/security-events.service.js';

/**
 * Bucle de contención ante inyección de prompt (docs/SECURITY-HARDENING.md
 * §6, plan de WD): la muralla exterior vive en el Dock, ANTES del modelo.
 *
 *  1. Detectar: puntuación de señales sobre toda entrada no confiable.
 *     Al superar el umbral, la sesión queda marcada — en silencio
 *     (declararlo enseñaría a evadir).
 *  2. Contener: la sesión marcada solo recibe el repertorio seguro del
 *     Dock, con retardos progresivos (tarpit). Ninguna herramienta nueva
 *     se habilita, ningún proveedor cambia, ningún presupuesto se mueve.
 *  3. Cerrar: a la 3.ª marca, la sesión se bloquea y solo el propietario
 *     la reactiva desde su emparejamiento (token del Dock). Se registra un
 *     evento mínimo (hora y tipo de señal; sin contenido personal).
 *
 * Invariante: aunque la detección fallara, el modelo no posee permisos —
 * el Dock valida cada llamada contra esquema, autorización y presupuesto.
 * No hay contraataque: «fundir» = agotar el intento contra la contención.
 */

export type SignalCategory =
  | 'override'
  | 'impersonation'
  | 'extraction'
  | 'encoded'
  | 'tool-probe';

export interface Screening {
  score: number;
  categories: SignalCategory[];
}

export type ContainmentDecision =
  | { action: 'pass' }
  | { action: 'delay'; delayMs: number; marks: number }
  | { action: 'blocked'; marks: number };

interface SessionState {
  marks: number;
  blocked: boolean;
}

/* Pesos por categoría: extracción y cargas codificadas son señales fuertes
 * (2); el resto suma de a 1. Se marca con puntuación >= 2. */
const WEIGHTS: Record<SignalCategory, number> = {
  override: 1,
  impersonation: 1,
  extraction: 2,
  encoded: 2,
  'tool-probe': 1,
};

export const MARK_THRESHOLD = 2;
export const MAX_MARKS = 3;
/* Retardo progresivo por marca vigente (ms): 1.ª → 1.5 s, 2.ª → 6 s. */
export const TARPIT_MS: Record<number, number> = { 1: 1500, 2: 6000 };

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

const PATTERNS: Record<SignalCategory, RegExp[]> = {
  override: [
    /ignora\s+(tus|las|todas|mis)\s+[^.]{0,30}(reglas|instrucciones|indicaciones)/,
    /ignore\s+(your|all|the|previous)\s+[^.]{0,30}(instructions|rules|prompts)/,
    /olvida\s+(tus|las)\s+(reglas|instrucciones)/,
    /forget\s+your\s+(rules|instructions)/,
    /disregard\s+[^.]{0,30}(instructions|rules)/,
    /desactiva\s+(tus|las)\s+(reglas|restricciones)/,
    /no\s+tienes\s+(reglas|restricciones|limites)/,
    /you\s+have\s+no\s+(rules|restrictions)/,
    /sin\s+restricciones\s+ni\s+limites/,
  ],
  impersonation: [
    /^\s*\[?\s*system\s*\]?\s*[:>]/m,
    /mensaje\s+del\s+sistema/,
    /system\s+message/,
    /modo\s+desarrollador/,
    /developer\s+mode/,
    /soy\s+(el|tu)\s+(desarrollador|administrador|sistema|creador)/,
    /i\s+am\s+(the|your)\s+(developer|admin|system|creator)/,
    /actua\s+como\s+(el\s+)?sistema/,
    /nuevas\s+instrucciones\s+del\s+sistema/,
  ],
  extraction: [
    /(muestra|revela|imprime|dime|ensena|repite)\s+[^.]{0,30}(prompt|instrucciones)/,
    /(show|reveal|print|repeat|tell\s+me)\s+[^.]{0,30}(prompt|instructions)/,
    /prompt\s+(interno|del\s+sistema|de\s+sistema|oculto)/,
    /system\s+prompt/,
    /api[\s_-]?key/,
    /llave\s+(de\s+la\s+)?api/,
    /dock[\s_-]?token/,
    /(cual|cuanto)\s+es\s+tu\s+presupuesto/,
    /what\s+is\s+your\s+(budget|system\s+prompt)/,
  ],
  'tool-probe': [
    /(ejecuta|corre|lanza|run|execute)\s+[^.]{0,25}(comando|shell|terminal|script|orden)/,
    /accede\s+(a|al)\s+(la\s+)?(terminal|shell|consola\s+del\s+sistema)/,
    /borra\s+(los\s+|las\s+)?(archivos|logs|registros\s+del\s+sistema)/,
    /open\s+(a\s+)?(shell|terminal)/,
  ],
  encoded: [], // se evalúa con heurísticas, no con regex de frases
};

/** Heurísticas de carga codificada: base64 largo, hex largo, secuencias
 * numéricas de códigos de carácter y leetspeak denso en tokens largos. */
function hasEncodedPayload(raw: string): boolean {
  // base64: corrida de >= 40 caracteres del alfabeto con relleno opcional.
  if (/[A-Za-z0-9+/]{40,}={0,2}/.test(raw)) return true;
  // hex: >= 20 bytes codificados (con o sin separadores).
  if (/(?:\b[0-9a-fA-F]{2}[\s:]*){20,}/.test(raw)) return true;
  // códigos numéricos: >= 12 números de 2-3 dígitos en secuencia.
  if (/(?:\b\d{2,3}\b[\s,;]*){12,}/.test(raw)) return true;
  // leetspeak: algún token >= 8 con >= 35% de dígitos entre letras.
  for (const token of raw.split(/\s+/)) {
    if (token.length < 8) continue;
    const letters = (token.match(/[a-zA-Z]/g) || []).length;
    const digits = (token.match(/\d/g) || []).length;
    if (letters >= 4 && digits >= 3 && digits / (letters + digits) >= 0.35) {
      return true;
    }
  }
  return false;
}

@Injectable()
export class ContainmentService {
  private readonly sessions = new Map<string, SessionState>();

  constructor(private readonly events: SecurityEventsService) {}

  /** Detección pura: no altera estado. */
  screen(text: string): Screening {
    const normalized = normalize(text || '');
    const categories: SignalCategory[] = [];
    for (const cat of Object.keys(PATTERNS) as SignalCategory[]) {
      if (cat === 'encoded') continue;
      if (PATTERNS[cat].some((re) => re.test(normalized))) categories.push(cat);
    }
    if (hasEncodedPayload(text || '')) categories.push('encoded');
    const score = categories.reduce((acc, c) => acc + WEIGHTS[c], 0);
    return { score, categories };
  }

  /**
   * Evalúa una petición de una sesión: aplica el bucle completo.
   * `texts` = todas las cadenas no confiables de la petición.
   */
  evaluate(sessionKey: string, texts: string[]): ContainmentDecision {
    let state = this.sessions.get(sessionKey);
    if (state?.blocked) return { action: 'blocked', marks: state.marks };

    const joined = texts.filter(Boolean).join('\n');
    const { score, categories } = this.screen(joined);

    if (score >= MARK_THRESHOLD) {
      state = state ?? { marks: 0, blocked: false };
      state.marks += 1;
      this.events.record(`containment_mark:${categories.join('+')}`);
      if (state.marks >= MAX_MARKS) {
        state.blocked = true;
        this.sessions.set(sessionKey, state);
        this.events.record('session_blocked');
        return { action: 'blocked', marks: state.marks };
      }
      this.sessions.set(sessionKey, state);
    }

    if (state && state.marks > 0) {
      return {
        action: 'delay',
        delayMs: TARPIT_MS[state.marks] ?? 6000,
        marks: state.marks,
      };
    }
    return { action: 'pass' };
  }

  /** Reactivación del propietario (desde su emparejamiento). */
  reactivate(sessionKey: string): boolean {
    return this.sessions.delete(sessionKey);
  }

  /** Solo para pruebas y diagnóstico interno. */
  marksOf(sessionKey: string): number {
    return this.sessions.get(sessionKey)?.marks ?? 0;
  }

  isBlocked(sessionKey: string): boolean {
    return this.sessions.get(sessionKey)?.blocked ?? false;
  }
}
