import { Injectable } from '@nestjs/common';
import type {
  FuentesSaludRespuesta,
  HealthResponse,
} from '@noa-guardian/contracts';
import { CorpusService } from './citizen/corpus.service.js';
import { OfficialFeedsProvider } from './providers/official-feeds.provider.js';

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
  };
  endpoints: Record<string, string>;
}

@Injectable()
export class AppService {
  constructor(
    private readonly feeds: OfficialFeedsProvider,
    private readonly corpus: CorpusService,
  ) {}

  getHello(): string {
    return 'Guardian Dock (NestJS) — NOA Guardian. Ver GET /health.';
  }

  getSourcesHealth(): FuentesSaludRespuesta {
    return {
      sources: this.feeds.sourcesHealth(),
      generatedAt: new Date().toISOString(),
    };
  }

  getHealth(): DockHealth {
    return {
      status: 'ok',
      project: 'noa-guardian-dock',
      version: '1.0.0',
      time: new Date().toISOString(),
      corpus: this.corpus.status(),
      feeds: this.feeds.feedsStatus(),
      endpoints: {
        'GET /health/sources':
          'ok (salud por fuente + circuit breaker, Etapa D)',
        'GET /alerts':
          'ok (NWS · USGS · NASA EONET · PennDOT RCRS en trámite de credenciales)',
        'POST /ask':
          'guardian ok · citizen ok (corpus verificado) · awareness 501 (Etapa D)',
        'POST /see': '501 stub (SAM 3.1, Etapa D — puerta de verificación)',
        'POST /containment/reactivate': 'ok (solo propietario, con token)',
      },
    };
  }
}
