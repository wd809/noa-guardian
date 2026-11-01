import { Module } from '@nestjs/common';
import { CitizenController } from './citizen.controller.js';
import { CitizenService } from './citizen.service.js';
import { CorpusService } from './corpus.service.js';

// Citizen: motor extractivo sobre el corpus verificado (§3) + puerta de
// jurisdicción. Implementado en la Etapa C (porte del gateway legado).
@Module({
  controllers: [CitizenController],
  providers: [CorpusService, CitizenService],
  exports: [CorpusService, CitizenService],
})
export class CitizenModule {}
