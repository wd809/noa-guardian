import { Injectable } from '@nestjs/common';
import type {
  FuentesSaludRespuesta,
  HealthResponse,
} from '@noa-guardian/contracts';
import { BudgetService, type BudgetStatus } from './budget/budget.service.js';
import { CorpusService } from './citizen/corpus.service.js';
import {
  DEFAULT_POINT,
  OfficialFeedsProvider,
} from './providers/official-feeds.provider.js';
import { OpenMeteoProvider } from './providers/open-meteo.provider.js';

export interface DockHealth extends HealthResponse {
  corpus: {
    documents: number;
    chunks: number;
    loadedAt: string | null;
    error?: string;
  };
  feeds: {
    configured: string[];
    cacheEntries: number;
    cacheTtlSeconds: number;
    penndot: string;
    airnow: string;
  };
  /** Gasto agregado (sin contenido): el propietario ve el tope en /health. */
  budget: BudgetStatus;
  endpoints: Record<string, string>;
}

@Injectable()
export class AppService {
  constructor(
    private readonly feeds: OfficialFeedsProvider,
    private readonly corpus: CorpusService,
    private readonly budget: BudgetService,
    private readonly meteo: OpenMeteoProvider,
  ) {}

  getHello(): string {
    return 'Guardian Dock (NestJS) — NOA Guardian. Ver GET /health.';
  }

  async getSourcesHealth(): Promise<FuentesSaludRespuesta> {
    // El contexto ambiental es para el punto del Dock (Reading): sin
    // llave, con caché, y su fallo se declara dentro del propio bloque.
    const openMeteo = await this.meteo.current(
      DEFAULT_POINT.lat,
      DEFAULT_POINT.lon,
    );
    return {
      sources: this.feeds.sourcesHealth(),
      generatedAt: new Date().toISOString(),
      context: { openMeteo },
    };
  }

  getHealth(): DockHealth {
    // /health es público: sale el conteo del corpus, jamás su ruta local.
    const { documents, chunks, loadedAt, error } = this.corpus.status();
    return {
      status: 'ok',
      project: 'noa-guardian-dock',
      version: '1.0.0',
      time: new Date().toISOString(),
      corpus: {
        documents,
        chunks,
        loadedAt,
        ...(error ? { error } : {}),
      },
      feeds: this.feeds.feedsStatus(),
      budget: this.budget.status(),
      endpoints: {
        'GET /health/sources':
          'ok (salud por fuente + circuit breaker, Etapa D)',
        'GET /alerts':
          'ok (NWS · USGS · NASA EONET · USGS Water · AirNow · PennDOT RCRS en trámite)',
        'POST /ask':
          'guardian ok · citizen ok (corpus verificado) · awareness 501 (Etapa D)',
        'POST /see': '501 stub (SAM 3.1, Etapa D — puerta de verificación)',
        'POST /containment/reactivate': 'ok (solo propietario, con token)',
        'POST /corpus/reload': 'ok (solo propietario, con token)',
      },
    };
  }
}
