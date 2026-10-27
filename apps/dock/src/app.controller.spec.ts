import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { CorpusService } from './citizen/corpus.service.js';
import { OfficialFeedsProvider } from './providers/official-feeds.provider.js';

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

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: OfficialFeedsProvider, useValue: feedsStub },
        { provide: CorpusService, useValue: corpusStub },
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
  });
});
