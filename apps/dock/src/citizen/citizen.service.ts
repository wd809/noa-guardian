import { Injectable } from '@nestjs/common';
import type { GuardianAnswer } from '@noa-guardian/contracts';
import {
  cleanExcerpt,
  Corpus,
  CorpusChunk,
  CorpusService,
  normalizeText,
} from './corpus.service.js';

/**
 * Motor Citizen (porte fiel de dock/gateway/src/citizen.js): recuperación +
 * composición EXTRACTIVA determinista sobre el corpus verificado (§3).
 * Sin LLM: cuando Muse Spark redacte (Etapa D), lo hará SOLO sobre los
 * fragmentos que este motor recupere — el contrato no cambia.
 *
 * Reglas duras:
 *  - Solo se responde desde piezas con `vigencia_verificada`.
 *  - Sin respaldo, «no cubierto» declarado — jamás se inventa una ley.
 *  - Toda respuesta lleva citas (documento + sección + fuente oficial).
 *  - Puerta de jurisdicción: otro estado nombrado → nunca ley de PA como si
 *    aplicara allí; solo federal etiquetado, o abstención explicada.
 */

const STOPWORDS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'en',
  'a', 'al', 'con', 'por', 'para', 'que', 'qué', 'es', 'se', 'si', 'sí',
  'no', 'mi', 'me', 'su', 'sus', 'lo', 'le', 'les', 'ya', 'o', 'y', 'e',
  'u', 'puedo', 'puede', 'pueden', 'quiero', 'tengo', 'tiene', 'hacer',
  'hace', 'esta', 'este', 'esto', 'estan', 'como', 'cómo', 'cuando',
  'cuándo', 'donde', 'dónde', 'cual', 'cuál', 'hay', 'ser', 'son', 'fue',
  'han', 'he', 'ha', 'sobre', 'entre', 'hasta', 'desde', 'mas', 'más',
  'muy', 'sin', 'ley', 'legal', 'pregunta',
  'the', 'of', 'and', 'or', 'to', 'in', 'an', 'is', 'are', 'shall',
  'be', 'by', 'for', 'with', 'on', 'at', 'as', 'it', 'its', 'this', 'that',
]);

/* Sinónimos ES→EN: el corpus estatutario está en inglés y las preguntas
 * llegan en español. Tabla explícita y auditable: solo ayuda a ENCONTRAR
 * el fragmento; la respuesta se compone con el fragmento mismo.
 * (Base del legado + ampliación de la oleada 1: T. 8, T. 18, T. 42.) */
const SYNONYMS = new Map<string, string[]>(
  Object.entries({
    grabar: ['intercept', 'interception', 'record', 'recording', 'wiretap'],
    grabacion: ['interception', 'recording'],
    interceptar: ['intercept', 'interception'],
    conversacion: ['oral', 'communication', 'communications'],
    llamada: ['wire', 'communication', 'oral'],
    telefono: ['wire', 'electronic', 'communication'],
    consentimiento: ['consent'],
    permiso: ['consent', 'permission'],
    deposito: ['escrow', 'deposit', 'security'],
    arrendador: ['landlord'],
    casero: ['landlord'],
    inquilino: ['tenant'],
    alquiler: ['tenant', 'lease', 'escrow'],
    renta: ['tenant', 'escrow'],
    devuelve: ['recovery', 'return', 'refund'],
    devolver: ['recovery', 'return', 'refund'],
    contratista: ['contractor', 'contractors', 'home improvement'],
    remodelacion: ['home improvement'],
    adelanto: ['payment', 'advance'],
    anticipo: ['payment', 'advance'],
    desaparecio: ['fraud', 'abandon'],
    estafa: ['fraud', 'unfair', 'deceptive'],
    fraude: ['fraud'],
    consumidor: ['consumer', 'protection'],
    queja: ['complaint', 'attorney general'],
    horas: ['hours', 'overtime'],
    extra: ['overtime'],
    overtime: ['overtime'],
    salario: ['wage', 'wages'],
    salarios: ['wage', 'wages'],
    sueldo: ['wage', 'wages'],
    paga: ['wage', 'payment'],
    pagar: ['pay', 'payment', 'wages'],
    empleador: ['employer'],
    jefe: ['employer'],
    empleado: ['employe', 'employee'],
    trabajo: ['work', 'workweek', 'employment'],
    choque: ['accident', 'accidents'],
    accidente: ['accident', 'accidents'],
    colision: ['accident', 'accidents'],
    detenerte: ['stop', 'duty'],
    detenerse: ['stop', 'duty'],
    informacion: ['information', 'render aid'],
    ayuda: ['aid', 'render aid'],
    policia: ['police', 'officer'],
    estacionar: ['parking', 'stopping', 'standing'],
    estacionamiento: ['parking'],
    discapacitados: ['disability', 'disabled'],
    discapacidad: ['disability', 'disabled'],
    incapacidad: ['disability'],
    multa: ['fine', 'penalty', 'penalties'],
    defensa: ['self-protection', 'justification', 'force'],
    defenderme: ['self-protection', 'force'],
    fuerza: ['force'],
    spray: ['force'],
    pimienta: ['force'],
    arma: ['force', 'deadly force', 'firearm'],
    armas: ['firearm', 'firearms'],
    pistola: ['firearm'],
    contrato: ['contract', 'contracts'],
    escrito: ['writing', 'written'],
    plazo: ['days', 'within'],
    dias: ['days'],
    doble: ['double', 'twice'],
    danos: ['damages', 'damage'],
    vehiculo: ['vehicle'],
    carro: ['vehicle', 'motor vehicle'],
    luces: ['lamps', 'lighted', 'lighting'],
    emergencia: ['emergency'],
    vigencia: ['release point', 'vigencia'],
    vigente: ['release point'],
    // --- Oleada 1 (2026-10-27): inmigración, derechos federales, beneficios ---
    inmigracion: ['alien', 'immigration', 'nationality'],
    inmigrante: ['alien'],
    deportacion: ['removal', 'deportable', 'deportation'],
    deportado: ['removal', 'deportable'],
    deporten: ['removal', 'deportable'],
    expulsion: ['removal'],
    visa: ['visa'],
    ciudadania: ['citizenship', 'naturalization', 'citizen'],
    ciudadano: ['citizen', 'citizenship'],
    naturalizacion: ['naturalization'],
    residencia: ['residence', 'resided', 'lawfully admitted'],
    residente: ['resident', 'residence'],
    indocumentado: ['inadmissible', 'without admission or parole'],
    indocumentada: ['inadmissible', 'without admission or parole'],
    registro: ['registration', 'register'],
    papeles: ['registration', 'evidence of registration'],
    arresto: ['arrest', 'custody'],
    detenido: ['arrest', 'custody'],
    derechos: ['rights', 'right'],
    mentir: ['false statement', 'false statements', 'materially false', 'false, fictitious, or fraudulent'],
    mentira: ['false statement'],
    declaracion: ['statement', 'statements'],
    condenado: ['convicted', 'conviction'],
    condena: ['conviction'],
    felonia: ['felony', 'felon'],
    delito: ['offense', 'crime', 'felony'],
    beneficios: ['benefits', 'benefit'],
    beneficio: ['benefits', 'benefit'],
    jubilacion: ['old-age', 'retirement'],
    retiro: ['old-age', 'retirement'],
    pension: ['benefits', 'old-age'],
    medicare: ['medicare', 'hospital insurance'],
    medicaid: ['medical assistance', 'medicaid'],
    ssi: ['supplemental security income'],
    ingresos: ['income'],
    familia: ['family', 'spouse', 'child'],
    // --- Ajuste conductual oleada 1 (2026-10-27): formas verbales y temas nuevos ---
    anos: ['years'],
    vivir: ['resided', 'residence', 'living'],
    estados: ['states'],
    unidos: ['united'],
    cargar: ['carry', 'possession'],
    tarjeta: ['card', 'certificate'],
    siempre: ['at all times'],
    deportar: ['deportable', 'removed'],
    vencio: ['failed to maintain', 'revoked'],
    vencida: ['failed to maintain', 'revoked'],
    turista: ['nonimmigrant', 'visitor'],
    mentirle: ['false statement', 'false statements', 'materially false', 'false, fictitious, or fraudulent'],
    agente: ['officer', 'official', 'agent'],
    poseer: ['possess', 'possession'],

    esposo: ['spouse'],
    esposa: ['spouse'],
    hijos: ['child', 'children'],
  }),
);

interface Concept {
  term: string;
  variants: string[];
}

function questionConcepts(text: string): Concept[] {
  const norm = normalizeText(text);
  const words = norm.split(/[^a-z0-9.]+/).filter(Boolean);
  const concepts: Concept[] = [];
  if (/\bhoras?\s+extra/.test(norm) || /\bovertime\b/.test(norm)) {
    concepts.push({ term: 'horas extra', variants: ['overtime', 'one and one-half'] });
  }
  if (/\bfeloni|delito grave|condena/.test(norm)) {
    concepts.push({ term: 'felonía', variants: ['convicted', 'conviction', 'crime punishable', 'felony'] });
  }
  if (/\bseguro\s+social\b/.test(norm)) {
    concepts.push({ term: 'seguro social', variants: ['social security'] });
  }
  for (const w of words) {
    if (STOPWORDS.has(w) || w.length < 3) continue;
    if (/^\d+$/.test(w)) continue;
    const variants = new Set<string>([w]);
    for (const v of SYNONYMS.get(w) || []) variants.add(v);
    concepts.push({ term: w, variants: [...variants] });
  }
  const seen = new Set<string>();
  return concepts.filter((c) =>
    seen.has(c.term) ? false : (seen.add(c.term), true),
  );
}

function sectionNumbersIn(text: string): string[] {
  const nums = new Set<string>();
  for (const m of normalizeText(text).matchAll(/[0-9]{3,4}(?:\.[0-9]{1,3})?/g)) {
    nums.add(m[0]);
  }
  for (const m of text.matchAll(/§\s*([0-9][0-9.]*)/g)) nums.add(m[1]);
  return [...nums];
}

function scoreChunk(
  chunk: CorpusChunk,
  concepts: Concept[],
  numbers: string[],
): { score: number; conceptsFound: number } {
  let score = 0;
  let conceptsFound = 0;
  for (const c of concepts) {
    const inText = c.variants.some((v) => chunk.normText.includes(v));
    const inHeading = c.variants.some((v) => chunk.normHeading.includes(v));
    if (inText || inHeading) {
      conceptsFound += 1;
      score += inText ? 1 : 0;
      score += inHeading ? 2 : 0;
    }
  }
  for (const n of numbers) {
    if (chunk.normHeading.includes(n) || chunk.normText.includes(n)) score += 5;
  }
  if (chunk.doc.companion) score *= 0.6;
  return { score, conceptsFound };
}

function citationOf(chunk: CorpusChunk): string {
  const sec = chunk.seccion ? `${chunk.seccion} — ` : '';
  return (
    `${sec}${chunk.doc.titulo} · fuente oficial: ${chunk.doc.fuente} ` +
    `· ${chunk.doc.jurisdiccion} · vigencia verificada: ${chunk.doc.vigencia}`
  );
}

export const NO_CUBIERTO =
  'Ese tema no está en el corpus verificado de Guardian (Pensilvania y fuentes ' +
  'federales al release point vigente), así que no voy a improvisar una respuesta ' +
  'legal. Consulta el texto oficial vigente o a un abogado. Nunca invento leyes.';

/* Puerta de jurisdicción (corrección 26-oct): el corpus cubre Pensilvania y
 * derecho federal. Si la pregunta nombra otro estado, su ley estatal NO
 * está cubierta. */
const FOREIGN_STATES = new Map<string, string>(
  Object.entries({
    alabama: 'Alabama', alaska: 'Alaska', arizona: 'Arizona', arkansas: 'Arkansas',
    california: 'California', 'carolina del norte': 'Carolina del Norte',
    'north carolina': 'Carolina del Norte', 'carolina del sur': 'Carolina del Sur',
    'south carolina': 'Carolina del Sur', colorado: 'Colorado', connecticut: 'Connecticut',
    'dakota del norte': 'Dakota del Norte', 'north dakota': 'Dakota del Norte',
    'dakota del sur': 'Dakota del Sur', 'south dakota': 'Dakota del Sur',
    delaware: 'Delaware', florida: 'Florida', georgia: 'Georgia', hawai: 'Hawái',
    hawaii: 'Hawái', idaho: 'Idaho', illinois: 'Illinois', indiana: 'Indiana',
    iowa: 'Iowa', kansas: 'Kansas', kentucky: 'Kentucky', luisiana: 'Luisiana',
    louisiana: 'Luisiana', maine: 'Maine', maryland: 'Maryland',
    massachusetts: 'Massachusetts', michigan: 'Míchigan', minnesota: 'Minnesota',
    misisipi: 'Misisipi', mississippi: 'Misisipi', misuri: 'Misuri', missouri: 'Misuri',
    montana: 'Montana', nebraska: 'Nebraska', nevada: 'Nevada',
    'nuevo hampshire': 'Nuevo Hampshire', 'new hampshire': 'Nuevo Hampshire',
    'nueva jersey': 'Nueva Jersey', 'new jersey': 'Nueva Jersey',
    'nuevo mexico': 'Nuevo México', 'new mexico': 'Nuevo México',
    'nueva york': 'Nueva York', 'new york': 'Nueva York', ohio: 'Ohio',
    oklahoma: 'Oklahoma', oregon: 'Oregón', 'rhode island': 'Rhode Island',
    tennessee: 'Tennessee', texas: 'Texas', utah: 'Utah', vermont: 'Vermont',
    virginia: 'Virginia', 'virginia occidental': 'Virginia Occidental',
    'west virginia': 'Virginia Occidental', washington: 'Washington',
    wisconsin: 'Wisconsin', wyoming: 'Wyoming',
    'distrito de columbia': 'el Distrito de Columbia',
    'washington dc': 'el Distrito de Columbia',
  }),
);

export function namedForeignState(text: string): string | null {
  const tokens = normalizeText(text).split(/[^a-z0-9]+/).filter(Boolean);
  const joined = ` ${tokens.join(' ')} `;
  const keys = [...FOREIGN_STATES.keys()].sort((a, b) => b.length - a.length);
  for (const k of keys) {
    if (joined.includes(` ${k} `)) return FOREIGN_STATES.get(k) ?? null;
  }
  return null;
}

@Injectable()
export class CitizenService {
  constructor(private readonly corpusService: CorpusService) {}

  /** Respuesta Citizen (contrato §1). */
  answer(input: { text?: unknown }): { status: number; body: unknown } {
    const corpus: Corpus = this.corpusService.get();
    const text = String(input?.text ?? '').trim();
    const base: GuardianAnswer = {
      text: '',
      citations: [],
      jurisdiction: 'Pensilvania, EE. UU.',
      source: 'corpus',
      usage: {
        model: 'dock-citizen-extractivo-v1',
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
      },
    };
    if (!text) {
      return {
        status: 400,
        body: {
          error: 'missing_text',
          detail: 'POST /ask requiere { mode, text }.',
        },
      };
    }

    // Caso C8: la vigencia vive en los metadatos §3, no en un fragmento.
    const normQ = normalizeText(text);
    if (/\bvigenc|\bvigente|release point|ley cambi|norma cambi/.test(normQ)) {
      const federal = corpus.docs.filter((d) => /federal/i.test(d.jurisdiccion));
      const rp = [...new Set(federal.map((d) => d.releasePoint).filter(Boolean))];
      const fechas = [...new Set(corpus.docs.map((d) => d.vigencia))].sort();
      return {
        status: 200,
        body: {
          ...base,
          text:
            `Trabajo solo con texto verificado contra su fuente oficial. El corpus federal está al ` +
            `release point ${rp.join('; ') || 'PL 119-121'} y cada pieza lleva su vigencia verificada ` +
            `(${fechas.join(', ')}). Si escuchaste que una norma cambió, no puedo confirmarlo ni negarlo ` +
            `sin re-verificar el texto oficial vigente: la re-verificación del corpus está programada y, ` +
            `mientras tanto, la fuente que manda es el texto oficial (uscode.house.gov / legis.state.pa.us). ` +
            `Esto es orientación informativa, no asesoría legal.`,
          citations: corpus.docs
            .slice(0, 4)
            .map(
              (d) =>
                `${d.titulo} · fuente oficial: ${d.fuente} · vigencia verificada: ${d.vigencia}`,
            ),
        },
      };
    }

    const concepts = questionConcepts(text);
    const numbers = sectionNumbersIn(text);
    const ranked = corpus.chunks
      .map((chunk) => ({ chunk, ...scoreChunk(chunk, concepts, numbers) }))
      .filter((r) => r.conceptsFound > 0)
      .sort((a, b) => b.score - a.score);

    const best = ranked[0];
    // Cobertura sobre conceptos ATESTIGUADOS en el corpus (corrección del
    // falso «no cubierto» de C1/C2, 2026-10-22): el ruido de la pregunta no
    // puede castigar a los fragmentos que sí sostienen el tema.
    const attested = corpus.textIndex
      ? concepts.filter((c) =>
          c.variants.some((v) => corpus.textIndex.includes(v)),
        )
      : concepts;
    const coverage = attested.length
      ? (best?.conceptsFound ?? 0) / attested.length
      : 0;
    const foreignState = namedForeignState(text);

    if (!best || best.conceptsFound < 2 || coverage < 0.34) {
      if (foreignState) {
        return {
          status: 200,
          body: {
            ...base,
            text:
              `Preguntas por ${foreignState}: el corpus verificado de Guardian cubre Pensilvania y ` +
              `fuentes federales, no la ley de ${foreignState}, y tampoco encontré respaldo federal ` +
              `suficiente para este tema. No voy a improvisar: consulta la fuente oficial de ` +
              `${foreignState} o a un abogado.`,
          },
        };
      }
      return { status: 200, body: { ...base, text: NO_CUBIERTO } };
    }

    const picks = [best];
    const second = ranked.find(
      (r) =>
        r.chunk !== best.chunk &&
        r.chunk.heading !== best.chunk.heading &&
        r.score >= best.score * 0.7,
    );
    if (second) picks.push(second);

    if (foreignState) {
      const hasPA = picks.some(({ chunk }) =>
        /pensilvania/i.test(chunk.doc.jurisdiccion),
      );
      if (hasPA) {
        return {
          status: 200,
          body: {
            ...base,
            text:
              `Preguntas por ${foreignState}, y lo que el corpus verificado sostiene sobre este tema es ` +
              `ley de Pensilvania — que no aplica en ${foreignState}. El corpus cubre Pensilvania y ` +
              `fuentes federales; la ley de ${foreignState} no está cubierta y no voy a presentarte la ` +
              `de otro estado como si fuera la tuya. Consulta la fuente oficial de ${foreignState} o a un abogado.`,
          },
        };
      }
      const fedParts = picks.map(({ chunk }) => {
        const sec = chunk.seccion ? ` (${chunk.seccion})` : '';
        return `Según «${chunk.doc.titulo}»${sec}: «${cleanExcerpt(chunk.text)}»`;
      });
      return {
        status: 200,
        body: {
          ...base,
          text:
            `Ojo de jurisdicción: preguntas por ${foreignState}. Esto que sigue es derecho FEDERAL ` +
            `(aplica en todo EE. UU.); la ley estatal de ${foreignState} no está en el corpus verificado.\n` +
            fedParts.join('\n') +
            '\nEsto es orientación informativa, no asesoría legal.',
          citations: picks.map(({ chunk }) => citationOf(chunk)),
          jurisdiction: 'Federal, EE. UU.',
        },
      };
    }

    const parts = picks.map(({ chunk }) => {
      const sec = chunk.seccion ? ` (${chunk.seccion})` : '';
      return `Según «${chunk.doc.titulo}»${sec}: «${cleanExcerpt(chunk.text)}»`;
    });
    return {
      status: 200,
      body: {
        ...base,
        text:
          parts.join('\n') +
          '\nEsto es orientación informativa, no asesoría legal: la respuesta se compone solo con fragmentos del corpus verificado y sus citas.',
        citations: picks.map(({ chunk }) => citationOf(chunk)),
        jurisdiction: best.chunk.doc.jurisdiccion || base.jurisdiction,
      },
    };
  }
}
