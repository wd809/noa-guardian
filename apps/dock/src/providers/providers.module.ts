import { Module } from '@nestjs/common';
import { AirNowFeedsProvider } from './airnow-feeds.provider.js';
import { FEEDS_FETCH } from './feeds-fetch.js';
import { OfficialFeedsProvider } from './official-feeds.provider.js';
import { OpenMeteoProvider } from './open-meteo.provider.js';
import { PennDotFeedsProvider } from './penndot-feeds.provider.js';
import { UsgsWaterProvider } from './usgs-water.provider.js';

// Proveedores del Dock. Etapa B: las fuentes oficiales de alertas
// (NWS/USGS/NASA EONET) que alimentan a Guardian. Etapa D: PennDOT RCRS
// (incidentes viales de PA) integrado en espera de credenciales, AirNow
// (US EPA, en espera de su apiKey gratuita), USGS Water (Schuylkill, sin
// llave) y Open-Meteo (contexto ambiental, sin llave, nunca alerta). Los
// proveedores de IA intercambiables (local Tiiny / Meta / mock) llegan
// en la Etapa D.
@Module({
  providers: [
    OfficialFeedsProvider,
    PennDotFeedsProvider,
    AirNowFeedsProvider,
    UsgsWaterProvider,
    OpenMeteoProvider,
    { provide: FEEDS_FETCH, useValue: globalThis.fetch },
  ],
  exports: [
    OfficialFeedsProvider,
    PennDotFeedsProvider,
    AirNowFeedsProvider,
    UsgsWaterProvider,
    OpenMeteoProvider,
  ],
})
export class ProvidersModule {}
