// NOA Guardian — contratos compartidos entre la web (Angular) y el Dock (NestJS).
// SOLO definiciones de tipos: cero lógica, cero dependencias, cero valores.
// La fuente de verdad narrativa es docs/CONTRACTS.md; este paquete la formaliza.

// --- Consulta al cerebro (docs/CONTRACTS.md §1) ---

export type ModoOperacion = 'guardian' | 'citizen' | 'awareness';

export interface Ubicacion {
  lat: number;
  lon: number;
}

export interface GuardianAskInput {
  mode: ModoOperacion;
  /** Pregunta del usuario (la voz ya viene transcrita). */
  text: string;
  /** SOLO en memoria, nunca persistida. */
  imageBase64?: string;
  /** Solo si el usuario lo autorizó en la sesión. */
  location?: Ubicacion;
}

/** 'feeds' = compuesto determinista desde las fuentes oficiales (modo
 * guardian, docs/GUARDIAN-MODE-V1.md); 'mock' se etiqueta siempre. */
export type FuenteRespuesta = 'model' | 'corpus' | 'feeds' | 'mock';

export interface UsoModelo {
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export interface GuardianAnswer {
  /** Respuesta lista para mostrar y para TTS. */
  text: string;
  /** Obligatorio en modo citizen; [] en los demás modos. */
  citations: string[];
  /** P. ej. "Pensilvania, EE. UU." */
  jurisdiction?: string;
  /** Honestidad de demo: el mock se etiqueta. */
  source: FuenteRespuesta;
  usage: UsoModelo;
}

// --- Alertas oficiales (docs/CONTRACTS.md §2) ---

export type FuenteAlerta = 'NWS' | 'USGS' | 'NASA EONET';

export interface OfficialAlert {
  event: string;
  severity: string;
  headline: string;
  area: string;
  /** Inicio de vigencia (ISO) cuando la fuente lo publica. */
  starts?: string | null;
  /** Fin de vigencia (ISO); null = la fuente no lo define. */
  ends?: string | null;
  /** Solo fuentes oficiales. */
  source: FuenteAlerta;
  /** Enlace oficial de la alerta. */
  url?: string;
}

/** Estado declarado de una fuente: si cae, se dice — jamás se rellena. */
export interface FuenteEstado {
  ok: boolean;
  count: number;
  error?: string;
  /** Etapa D (aditivo): el circuit breaker de la fuente está abierto. */
  circuitOpen?: boolean;
  /** Etapa D (aditivo): minutos desde el último dato válido de la fuente. */
  minutesSinceOk?: number | null;
}

/** Salud de una fuente oficial (GET /health/sources, Etapa D). */
export interface FuenteSalud {
  state: 'ok' | 'degraded' | 'down';
  consecutiveFailures: number;
  lastOkAt: string | null;
  lastError: string | null;
  circuitOpenUntil: string | null;
}

/** Respuesta de GET /health/sources. */
export interface FuentesSaludRespuesta {
  sources: Record<string, FuenteSalud>;
  generatedAt: string;
}

/** Respuesta de GET /alerts (contrato §2 ampliado). */
export interface AlertasRespuesta {
  alerts: OfficialAlert[];
  sources: Record<string, FuenteEstado>;
  point: Ubicacion & { defaulted?: boolean; label?: string };
  generatedAt: string;
  cache: { hit: boolean; ttlSeconds: number };
  fuente?: string;
}

/** Bloque `guardian` que acompaña la respuesta de /ask en modo guardian. */
export interface GuardianMeta {
  point: Ubicacion & { defaulted: boolean };
  total: number;
  /** Alertas descartadas por vencidas (corrección 26-oct: no cuentan). */
  expiredExcluded: number;
  bySeverity: Record<string, number>;
  proactiveAlert: boolean;
  proactiveRule: string;
  alerts: Array<{
    event: string;
    severity: string;
    headline: string;
    area: string;
    ends: string | null;
    source: FuenteAlerta;
    url?: string;
  }>;
  sources: Record<string, FuenteEstado>;
  generatedAt: string;
}

/** Respuesta de POST /ask en modo guardian (contrato §1 + extensión §2). */
export interface GuardianAskResponse extends GuardianAnswer {
  guardian?: GuardianMeta;
}

/** Evento mínimo de seguridad (SECURITY-HARDENING §6): hora y tipo de
 * señal. SIN contenido personal, sin texto del usuario, sin ubicación. */
export interface EventoSeguridad {
  time: string;
  type: string;
}

// --- Corpus legal (docs/CONTRACTS.md §3) ---

export interface CorpusDocMeta {
  titulo: string;
  fuente: string;
  jurisdiccion: string;
  /** Fecha ISO de la última verificación de vigencia. Sin ella, el documento no se usa. */
  vigencia_verificada: string;
  release_point: string;
}

// --- Salud del Dock (migración, Etapa A) ---

export interface HealthResponse {
  status: 'ok';
  project: string;
  version: string;
  /** Hora del servidor en ISO 8601. */
  time: string;
}

// --- Estado de conexión visible en la UI (docs/SECURITY-HARDENING.md §5) ---

export type EstadoConexion =
  | 'conectado'
  | 'datos-vencidos'
  | 'sin-cobertura'
  | 'simulacion';

// --- Presupuesto (política de WD, 27-oct-2026; contador real en la Etapa D) ---

export interface PresupuestoEstado {
  limiteUsd: number;
  consumidoUsd: number;
  restanteUsd: number;
  /** ISO de la última conciliación; null = aún sin datos del contador. */
  actualizadoEn: string | null;
}

// --- Proveedores de IA intercambiables (Etapa D) ---

export type ProveedorId = 'local' | 'meta' | 'mock';

export interface ResultadoProveedor<T> {
  ok: boolean;
  data?: T;
  error?: string;
  usage?: UsoModelo;
}
