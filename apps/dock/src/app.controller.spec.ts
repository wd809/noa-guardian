import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { BudgetService } from './budget/budget.service.js';
import { CorpusService } from './citizen/corpus.service.js';
import { OfficialFeedsProvider } from './providers/official-feeds.provider.js';
import { OpenMeteoProvider } from './providers/open-meteo.provider.js';

const corpusStub = {
  status: () => ({ documents: 16, chunks: 93, loadedAt: null, dir: 'corpus' }),
};

const feedsStub = {
  feedsStatus: () => ({
    configured: ['NWS', 'USGS', 'NASA EONET'],
    cacheEntries: 0,
    cacheTtlSeconds: 120,
  }),
};

const budgetStub = {
  status: () => ({ limitUsd: 179.99, spentUsd: 0, remainingUsd: 179.99 }),
};

const meteoStub = {
  current: async () => ({
    ok: true,
    temperatureC: 7.4,
    precipitationProbabilityMax: 10,
    summary: '7.4°C · rain ≤10% next 6h',
    observedAt: '2026-11-01T09:00',
  }),
};

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: OfficialFeedsProvider, useValue: feedsStub },
        { provide: CorpusService, useValue: corpusStub },
        { provide: BudgetService, useValue: budgetStub },
        { provide: OpenMeteoProvider, useValue: meteoStub },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should describe the Dock', () => {
      expect(appController.getHello()).toContain('Guardian Dock');
    });
  });

  describe('health', () => {
    it('should return the contract shape plus feeds and endpoints', () => {
      const health = appController.getHealth();
      expect(health.status).toBe('ok');
      expect(health.project).toBe('noa-guardian-dock');
      expect(health.feeds.configured).toEqual(['NWS', 'USGS', 'NASA EONET']);
      expect(health.corpus.documents).toBe(16);
      expect(health.endpoints['GET /alerts']).toContain('ok');
    });

    it('expone el presupuesto agregado pero jamás la ruta local del corpus', () => {
      const health = appController.getHealth();
      expect(health.budget).toEqual({
        limitUsd: 179.99,
        spentUsd: 0,
        remainingUsd: 179.99,
      });
      expect('dir' in health.corpus).toBe(false);
    });
  });
});
