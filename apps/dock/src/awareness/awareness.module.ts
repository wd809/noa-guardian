import { Module } from '@nestjs/common';
import { AwarenessController } from './awareness.controller.js';
import { MetaVisionProvider } from './meta-vision.provider.js';

// Awareness (Etapa D, D6): POST /see con Muse Spark (Meta Model API).
// El proveedor se construye sin argumentos: lee META_MODEL_API_KEY del
// entorno; sin llave, el endpoint declara 501 not_configured.
@Module({
  controllers: [AwarenessController],
  providers: [{ provide: MetaVisionProvider, useFactory: () => new MetaVisionProvider() }],
})
export class AwarenessModule {}
