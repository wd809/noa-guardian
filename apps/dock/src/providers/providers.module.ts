import { Module } from '@nestjs/common';
import {
  FEEDS_FETCH,
  OfficialFeedsProvider,
} from './official-feeds.provider.js';

// Proveedores del Dock. Etapa B: las fuentes oficiales de alertas
// (NWS/USGS/NASA EONET) que alimentan a Guardian. Los proveedores de IA
// intercambiables (local Tiiny / Meta / mock) llegan en la Etapa D.
@Module({
  providers: [
    OfficialFeedsProvider,
    { provide: FEEDS_FETCH, useValue: globalThis.fetch },
  ],
  exports: [OfficialFeedsProvider],
})
export class ProvidersModule {}
