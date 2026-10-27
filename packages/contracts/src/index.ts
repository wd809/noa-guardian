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

export type FuenteRespuesta = 'model' | 'corpus' | 'mock';

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
  ends?: string;
  /** Solo fuentes oficiales. */
  source: FuenteAlerta;
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
