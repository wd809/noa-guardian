/* citizen.js — Motor Citizen del Guardian Dock v1.
 *
 * Recuperación + composición EXTRACTIVA determinista sobre el corpus local
 * verificado (docs/CONTRACTS.md §3). Sin LLM: la integración con Muse Spark
 * (Meta Model API) llega en el sprint (Día 4) SIN cambiar este contrato; el
 * LLM solo podrá redactar SOBRE los fragmentos que este motor recupere.
 *
 * Reglas duras que este módulo hace cumplir:
 *  - Solo se responde desde piezas del corpus con `vigencia_verificada`
 *    (contrato §3: sin ese metadato, la pieza no se usa para responder).
 *  - Si el corpus no cubre la pregunta, se declara «no cubierto» y NO se
 *    inventa nada (docs/CONTRACTS.md: Citizen nunca inventa respaldo).
 *  - Toda respuesta lleva citas (documento + sección + fuente oficial).
 *  - Nada se persiste: el índice vive en memoria y las preguntas no se guardan.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/* ---------- Normalización de texto ---------- */
export function normalize(s) {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const STOPWORDS = new Set([
  // español
  "el", "la", "los", "las", "un", "una", "unos", "unas", "de", "del", "en",
  "a", "al", "con", "por", "para", "que", "qué", "es", "se", "si", "sí",
  "no", "mi", "me", "su", "sus", "lo", "le", "les", "ya", "o", "y", "e",
  "u", "puedo", "puede", "pueden", "quiero", "tengo", "tiene", "hacer",
  "hace", "esta", "este", "esto", "estan", "como", "cómo", "cuando",
  "cuándo", "donde", "dónde", "cual", "cuál", "hay", "ser", "son", "fue",
  "han", "he", "ha", "sobre", "entre", "hasta", "desde", "mas", "más",
  "muy", "sin", "ley", "legal", "pregunta",
  // inglés básico (el corpus estatutario está en inglés)
  "the", "of", "and", "or", "to", "in", "a", "an", "is", "are", "shall",
  "be", "by", "for", "with", "on", "at", "as", "it", "its", "this", "that",
]);

/* Sinónimos ES→EN: el corpus estatutario está en inglés y las preguntas
 * llegan en español. Tabla pequeña, explícita y auditable: cada concepto en
 * español mapea a las variantes inglesas que lo sostienen en el texto oficial.
 * NO genera afirmaciones: solo ayuda a ENCONTRAR el fragmento; la respuesta
 * se compone con el fragmento mismo. */
const SYNONYMS = new Map(Object.entries({
  grabar: ["intercept", "interception", "record", "recording", "wiretap"],
  grabacion: ["interception", "recording"],
  interceptar: ["intercept", "interception"],
  conversacion: ["oral", "communication", "communications"],
  llamada: ["wire", "communication", "oral"],
  telefono: ["wire", "electronic", "communication"],
  consentimiento: ["consent"],
  permiso: ["consent", "permission"],
  deposito: ["escrow", "deposit", "security"],
  arrendador: ["landlord"],
  casero: ["landlord"],
  inquilino: ["tenant"],
  alquiler: ["tenant", "lease", "escrow"],
  renta: ["tenant", "escrow"],
  devuelve: ["recovery", "return", "refund"],
  devolver: ["recovery", "return", "refund"],
  contratista: ["contractor", "contractors", "home improvement"],
  remodelacion: ["home improvement"],
  adelanto: ["payment", "advance"],
  anticipo: ["payment", "advance"],
  desaparecio: ["fraud", "abandon"],
  estafa: ["fraud", "unfair", "deceptive"],
  fraude: ["fraud"],
  consumidor: ["consumer", "protection"],
  queja: ["complaint", "attorney general"],
  horas: ["hours", "overtime"],
  extra: ["overtime"],
  overtime: ["overtime"],
  salario: ["wage", "wages"],
  salarios: ["wage", "wages"],
  sueldo: ["wage", "wages"],
  paga: ["wage", "payment"],
  pagar: ["pay", "payment", "wages"],
  empleador: ["employer"],
  jefe: ["employer"],
  empleado: ["employe", "employee"],
  trabajo: ["work", "workweek", "employment"],
  choque: ["accident", "accidents"],
  accidente: ["accident", "accidents"],
  colision: ["accident", "accidents"],
  detenerte: ["stop", "duty"],
  detenerse: ["stop", "duty"],
  informacion: ["information", "render aid"],
  ayuda: ["aid", "render aid"],
  policia: ["police", "officer"],
  estacionar: ["parking", "stopping", "standing"],
  estacionamiento: ["parking"],
  discapacitados: ["disability", "disabled"],
  discapacidad: ["disability", "disabled"],
  multa: ["fine", "penalty", "penalties"],
  defensa: ["self-protection", "justification", "force"],
  defenderme: ["self-protection", "force"],
  fuerza: ["force"],
  spray: ["force"],
  pimienta: ["force"],
  arma: ["force", "deadly force", "firearm"],
  contrato: ["contract", "contracts"],
  escrito: ["writing", "written"],
  plazo: ["days", "within"],
  dias: ["days"],
  doble: ["double", "twice"],
  danos: ["damages", "damage"],
  vehiculo: ["vehicle"],
  carro: ["vehicle", "motor vehicle"],
  luces: ["lamps", "lighted", "lighting"],
  emergencia: ["emergency"],
  vigencia: ["release point", "vigencia"],
  vigente: ["release point"],
  anos: ["years"],
  vivir: ["resided", "residence", "living"],
  estados: ["states"],
  unidos: ["united"],
  cargar: ["carry", "possession"],
  tarjeta: ["card", "certificate"],
  siempre: ["at all times"],
  deportar: ["deportable", "removed"],
  vencio: ["failed to maintain", "revoked"],
  vencida: ["failed to maintain", "revoked"],
  turista: ["nonimmigrant", "visitor"],
  mentirle: ["false statement", "false statements", "materially false", "false, fictitious, or fraudulent"],
  agente: ["officer", "official", "agent"],
  poseer: ["possess", "possession"],
  // Oleada 1 (2026-10-27), espejo de la tabla del Dock Nest:
  inmigracion: ["alien", "immigration", "nationality"],
  inmigrante: ["alien"],
  deportacion: ["removal", "deportable", "deportation"],
  deportado: ["removal", "deportable"],
  deporten: ["removal", "deportable"],
  expulsion: ["removal"],
  visa: ["visa"],
  ciudadania: ["citizenship", "naturalization", "citizen"],
  ciudadano: ["citizen", "citizenship"],
  naturalizacion: ["naturalization"],
  residencia: ["residence", "resided", "lawfully admitted"],
  residente: ["resident", "residence"],
  indocumentado: ["inadmissible", "without admission or parole"],
  indocumentada: ["inadmissible", "without admission or parole"],
  registro: ["registration", "register"],
  papeles: ["registration", "evidence of registration"],
  arresto: ["arrest", "custody"],
  detenido: ["arrest", "custody"],
  derechos: ["rights", "right"],
  mentir: ["false statement", "false statements", "materially false", "false, fictitious, or fraudulent"],
  mentira: ["false statement"],
  declaracion: ["statement", "statements"],
  condenado: ["convicted", "conviction"],
  condena: ["conviction"],
  felonia: ["felony", "felon"],
  delito: ["offense", "crime", "felony"],
  beneficios: ["benefits", "benefit"],
  beneficio: ["benefits", "benefit"],
  jubilacion: ["old-age", "retirement"],
  retiro: ["old-age", "retirement"],
  pension: ["benefits", "old-age"],
  medicare: ["medicare", "hospital insurance"],
  medicaid: ["medical assistance", "medicaid"],
  ssi: ["supplemental security income"],
  ingresos: ["income"],
  familia: ["family", "spouse", "child"],
  esposo: ["spouse"],
  esposa: ["spouse"],
  hijos: ["child", "children"],
  incapacidad: ["disability"],
  armas: ["firearm", "firearms"],
  pistola: ["firearm"],
}));

/* ---------- Carga e indexación del corpus ---------- */
function parseFrontMatter(raw) {
  if (!raw.startsWith("---")) return { meta: {}, body: raw };
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { meta: {}, body: raw };
  const meta = {};
  for (const line of raw.slice(3, end).split("\n")) {
    const m = line.match(/^([a-z_]+):\s*(.+)$/i);
    if (m) meta[m[1].trim().toLowerCase()] = m[2].trim();
  }
  return { meta, body: raw.slice(end + 4) };
}

function walkMd(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walkMd(p));
    else if (name.endsWith(".md")) out.push(p);
  }
  return out;
}

function sectionLabel(heading) {
  const m = heading.match(/(§\s*[0-9][0-9A-Za-z.\-]*|Section\s+[0-9][0-9A-Za-z.\-]*)/i);
  return m ? m[1].replace(/\s+/g, " ").replace(/\.+$/, "").trim() : null;
}

function cleanExcerpt(text, max = 640) {
  const clean = text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`#>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastDot = cut.lastIndexOf(". ");
  return (lastDot > max * 0.5 ? cut.slice(0, lastDot + 1) : cut) + " […]";
}

export function loadCorpus(corpusDir) {
  const docs = [];
  const chunks = [];
  for (const file of walkMd(corpusDir)) {
    const raw = readFileSync(file, "utf8");
    const { meta, body } = parseFrontMatter(raw);
    // Contrato §3: sin vigencia verificada, la pieza NO se usa para responder.
    if (!meta.vigencia_verificada || !meta.titulo) continue;
    const doc = {
      file: relative(corpusDir, file),
      titulo: meta.titulo,
      fuente: meta.fuente || "",
      jurisdiccion: meta.jurisdiccion || "",
      vigencia: meta.vigencia_verificada,
      releasePoint: meta.release_point || "",
      companion: /compañero/i.test(body.slice(0, 200)) || Boolean(meta.archivo_fuente),
    };
    docs.push(doc);
    // Fragmentos por sección (## …); el preámbulo cuelga del título (# …).
    let heading = meta.titulo;
    let buf = [];
    const flush = () => {
      const text = buf.join("\n").trim();
      if (text.length < 40) return;
      chunks.push({
        doc,
        heading,
        seccion: sectionLabel(heading),
        text,
        normHeading: normalize(heading),
        normText: normalize(text),
      });
    };
    for (const line of body.split("\n")) {
      const h = line.match(/^#{1,2}\s+(.+)$/);
      if (h) { flush(); heading = h[1].trim(); buf = []; }
      else buf.push(line);
    }
    flush();
  }
  // Índice de atestación: texto normalizado de todos los fragmentos. Sirve
  // para saber qué conceptos de una pregunta EXISTEN en el corpus (ver el
  // cálculo de cobertura en answerCitizen).
  const textIndex = chunks.map((c) => `${c.normHeading} ${c.normText}`).join("\n");
  return { docs, chunks, textIndex, loadedAt: new Date().toISOString() };
}

/* ---------- Recuperación ---------- */
function questionConcepts(text) {
  const norm = normalize(text);
  const words = norm.split(/[^a-z0-9.]+/).filter(Boolean);
  const concepts = [];
  if (/\bfeloni|delito grave|condena/.test(norm)) {
    concepts.push({ term: "felonía", variants: ["convicted", "conviction", "crime punishable", "felony"] });
  }
  if (/\bseguro\s+social\b/.test(norm)) {
    concepts.push({ term: "seguro social", variants: ["social security"] });
  }
  // Frase «horas extra» como concepto único.
  if (/\bhoras?\s+extra/.test(norm) || /\bovertime\b/.test(norm)) {
    concepts.push({ term: "horas extra", variants: ["overtime", "one and one-half"] });
  }
  for (const w of words) {
    if (STOPWORDS.has(w) || w.length < 3) continue;
    if (/^\d+$/.test(w)) continue; // los números van por la vía de boost
    const variants = new Set([w]);
    for (const v of SYNONYMS.get(w) || []) variants.add(v);
    concepts.push({ term: w, variants: [...variants] });
  }
  // Deduplicar por término.
  const seen = new Set();
  return concepts.filter((c) => (seen.has(c.term) ? false : (seen.add(c.term), true)));
}

function sectionNumbersIn(text) {
  const nums = new Set();
  for (const m of normalize(text).matchAll(/[0-9]{3,4}(?:\.[0-9]{1,3})?/g)) nums.add(m[0]);
  for (const m of text.matchAll(/§\s*([0-9][0-9.]*)/g)) nums.add(m[1]);
  return [...nums];
}

function scoreChunk(chunk, concepts, numbers) {
  let score = 0;
  let conceptsFound = 0;
  for (const c of concepts) {
    const inText = c.variants.some((v) => chunk.normText.includes(v));
    const inHeading = c.variants.some((v) => chunk.normHeading.includes(v));
    if (inText || inHeading) {
      conceptsFound += 1;
      score += inText ? 1 : 0;
      score += inHeading ? 2 : 0; // el título de la sección pesa más
    }
  }
  for (const n of numbers) {
    if (chunk.normHeading.includes(n) || chunk.normText.includes(n)) score += 5;
  }
  // Las piezas «compañero» son metadatos de un PDF, no texto estatutario:
  // pueden apoyar, pero no deben ganarle a la norma transcrita.
  if (chunk.doc.companion) score *= 0.6;
  return { score, conceptsFound };
}

function citationOf(chunk) {
  const sec = chunk.seccion ? `${chunk.seccion} — ` : "";
  return (
    `${sec}${chunk.doc.titulo} · fuente oficial: ${chunk.doc.fuente} ` +
    `· ${chunk.doc.jurisdiccion} · vigencia verificada: ${chunk.doc.vigencia}`
  );
}

const NO_CUBIERTO =
  "Ese tema no está en el corpus verificado de Guardian (Pensilvania y fuentes " +
  "federales al release point vigente), así que no voy a improvisar una respuesta " +
  "legal. Consulta el texto oficial vigente o a un abogado. Nunca invento leyes.";

/* ---------- Puerta de jurisdicción (corrección 26-oct) ----------
 * El corpus cubre Pensilvania y derecho federal. Si la pregunta nombra otro
 * estado, su ley estatal NO está cubierta: devolver fragmentos de
 * Pensilvania como si aplicaran allí sería presentar una ley fuera de su
 * jurisdicción. Se detecta el estado nombrado (ES/EN, texto normalizado) y
 * answerCitizen decide: abstención si lo recuperado es estatal de PA, o
 * respuesta SOLO federal, etiquetada, si lo recuperado es federal. */
const FOREIGN_STATES = new Map(Object.entries({
  alabama: "Alabama", alaska: "Alaska", arizona: "Arizona", arkansas: "Arkansas",
  california: "California", "carolina del norte": "Carolina del Norte",
  "north carolina": "Carolina del Norte", "carolina del sur": "Carolina del Sur",
  "south carolina": "Carolina del Sur", colorado: "Colorado", connecticut: "Connecticut",
  "dakota del norte": "Dakota del Norte", "north dakota": "Dakota del Norte",
  "dakota del sur": "Dakota del Sur", "south dakota": "Dakota del Sur",
  delaware: "Delaware", florida: "Florida", georgia: "Georgia", hawai: "Hawái",
  hawaii: "Hawái", idaho: "Idaho", illinois: "Illinois", indiana: "Indiana",
  iowa: "Iowa", kansas: "Kansas", kentucky: "Kentucky", luisiana: "Luisiana",
  louisiana: "Luisiana", maine: "Maine", maryland: "Maryland",
  massachusetts: "Massachusetts", michigan: "Míchigan", minnesota: "Minnesota",
  misisipi: "Misisipi", mississippi: "Misisipi", misuri: "Misuri", missouri: "Misuri",
  montana: "Montana", nebraska: "Nebraska", nevada: "Nevada",
  "nuevo hampshire": "Nuevo Hampshire", "new hampshire": "Nuevo Hampshire",
  "nueva jersey": "Nueva Jersey", "new jersey": "Nueva Jersey",
  "nuevo mexico": "Nuevo México", "new mexico": "Nuevo México",
  "nueva york": "Nueva York", "new york": "Nueva York", ohio: "Ohio",
  oklahoma: "Oklahoma", oregon: "Oregón", "rhode island": "Rhode Island",
  tennessee: "Tennessee", texas: "Texas", utah: "Utah", vermont: "Vermont",
  virginia: "Virginia", "virginia occidental": "Virginia Occidental",
  "west virginia": "Virginia Occidental", washington: "Washington",
  wisconsin: "Wisconsin", wyoming: "Wyoming",
  "distrito de columbia": "el Distrito de Columbia", "washington dc": "el Distrito de Columbia",
}));

export function namedForeignState(text) {
  // Tokenizar primero (la puntuación —«¿…california?»— no debe romper la
  // coincidencia) y buscar por palabras completas, compuestos primero.
  const tokens = normalize(text).split(/[^a-z0-9]+/).filter(Boolean);
  const joined = ` ${tokens.join(" ")} `;
  const keys = [...FOREIGN_STATES.keys()].sort((a, b) => b.length - a.length);
  for (const k of keys) {
    if (joined.includes(` ${k} `)) return FOREIGN_STATES.get(k);
  }
  return null;
}

/* ---------- Respuesta Citizen (contrato §1) ---------- */
export function answerCitizen(corpus, input) {
  const text = String(input?.text || "").trim();
  const base = {
    citations: [],
    jurisdiction: "Pensilvania, EE. UU.",
    source: "corpus",
    usage: { model: "dock-citizen-extractivo-v1", inputTokens: 0, outputTokens: 0, costUsd: 0 },
  };
  if (!text) return { status: 400, body: { error: "missing_text", detail: "POST /ask requiere { mode, text }." } };

  // Caso especial C8: «¿la norma sigue vigente?» — la respuesta vive en los
  // METADATOS §3 del corpus (vigencia verificada + release point), no en un
  // fragmento estatutario. Se responde desde esos metadatos, sin afirmar ni
  // negar rumores sobre normas concretas no verificadas.
  const normQ = normalize(text);
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
          `release point ${rp.join("; ") || "PL 119-121"} y cada pieza lleva su vigencia verificada ` +
          `(${fechas.join(", ")}). Si escuchaste que una norma cambió, no puedo confirmarlo ni negarlo ` +
          `sin re-verificar el texto oficial vigente: la re-verificación del corpus está programada y, ` +
          `mientras tanto, la fuente que manda es el texto oficial (uscode.house.gov / legis.state.pa.us). ` +
          `Esto es orientación informativa, no asesoría legal.`,
        citations: corpus.docs.slice(0, 4).map(
          (d) => `${d.titulo} · fuente oficial: ${d.fuente} · vigencia verificada: ${d.vigencia}`
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
  // Cobertura sobre conceptos ATESTIGUADOS: un concepto solo cuenta en el
  // denominador si alguna de sus variantes aparece en el corpus. Contar
  // también el ruido de la pregunta natural («voy», «baño», «medias»…)
  // castigaba a TODOS los fragmentos por igual y declaraba «no cubierto»
  // temas que el corpus sí sostiene (falso negativo cazado en el banco de
  // situaciones, C1/C2, 2026-10-22). Un concepto no atestiguado no puede
  // encontrarse en ningún fragmento: no aporta señal de cobertura.
  const attested = corpus.textIndex
    ? concepts.filter((c) => c.variants.some((v) => corpus.textIndex.includes(v)))
    : concepts;
  const coverage = attested.length ? (best?.conceptsFound ?? 0) / attested.length : 0;
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

  // Segundo fragmento solo si es de OTRA sección y casi tan fuerte.
  const picks = [best];
  const second = ranked.find(
    (r) => r.chunk !== best.chunk && r.chunk.heading !== best.chunk.heading && r.score >= best.score * 0.7
  );
  if (second) picks.push(second);

  /* Puerta de jurisdicción: con un estado ajeno nombrado, jamás se entrega
   * ley de Pensilvania como si aplicara allí. Si TODO lo recuperado es
   * federal, se entrega etiquetado como federal; si hay estatal de PA, se
   * abstiene explicando el límite. */
  if (foreignState) {
    const hasPA = picks.some(({ chunk }) => /pensilvania/i.test(chunk.doc.jurisdiccion));
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
      const sec = chunk.seccion ? ` (${chunk.seccion})` : "";
      return `Según «${chunk.doc.titulo}»${sec}: «${cleanExcerpt(chunk.text)}»`;
    });
    return {
      status: 200,
      body: {
        ...base,
        text:
          `Ojo de jurisdicción: preguntas por ${foreignState}. Esto que sigue es derecho FEDERAL ` +
          `(aplica en todo EE. UU.); la ley estatal de ${foreignState} no está en el corpus verificado.\n` +
          fedParts.join("\n") +
          "\nEsto es orientación informativa, no asesoría legal.",
        citations: picks.map(({ chunk }) => citationOf(chunk)),
        jurisdiction: "Federal, EE. UU.",
      },
    };
  }

  const parts = picks.map(({ chunk }) => {
    const sec = chunk.seccion ? ` (${chunk.seccion})` : "";
    return `Según «${chunk.doc.titulo}»${sec}: «${cleanExcerpt(chunk.text)}»`;
  });
  return {
    status: 200,
    body: {
      ...base,
      text:
        parts.join("\n") +
        "\nEsto es orientación informativa, no asesoría legal: la respuesta se compone solo con fragmentos del corpus verificado y sus citas.",
      citations: picks.map(({ chunk }) => citationOf(chunk)),
      jurisdiction: best.chunk.doc.jurisdiccion || base.jurisdiction,
    },
  };
}
