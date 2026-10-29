import { Module } from '@nestjs/common';
import { FEEDS_FETCH } from './feeds-fetch.js';
import { OfficialFeedsProvider } from './official-feeds.provider.js';
import { PennDotFeedsProvider } from './penndot-feeds.provider.js';

// Proveedores del Dock. Etapa B: las fuentes oficiales de alertas
// (NWS/USGS/NASA EONET) que alimentan a Guardian. Etapa D: PennDOT RCRS
// (incidentes viales de PA) integrado en espera de credenciales. Los
// proveedores de IA intercambiables (local Tiiny / Meta / mock) llegan
// en la Etapa D.
@Module({
  providers: [
    OfficialFeedsProvider,
    PennDotFeedsProvider,
    { provide: FEEDS_FETCH, useValue: globalThis.fetch },
  ],
  exports: [OfficialFeedsProvider, PennDotFeedsProvider],
})
export class ProvidersModule {}
