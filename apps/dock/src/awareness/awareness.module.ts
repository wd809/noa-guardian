import { Module } from '@nestjs/common';
import { AwarenessController } from './awareness.controller.js';

// Awareness: hoy solo el stub declarado de POST /see (501). La visión con
// SAM 3.1 llega en la Etapa D.
@Module({
  controllers: [AwarenessController],
})
export class AwarenessModule {}
