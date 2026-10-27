import { Module } from '@nestjs/common';
import { CitizenService } from './citizen.service.js';
import { CorpusService } from './corpus.service.js';

// Citizen: motor extractivo sobre el corpus verificado (§3) + puerta de
// jurisdicción. Implementado en la Etapa C (porte del gateway legado).
@Module({
  providers: [CorpusService, CitizenService],
  exports: [CorpusService, CitizenService],
})
export class CitizenModule {}
