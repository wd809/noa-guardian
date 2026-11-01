import { Controller, HttpCode, Post } from '@nestjs/common';
import { CorpusService } from './corpus.service.js';

/**
 * Administración del corpus (solo propietario: la guardia global de token
 * protege estas rutas). POST /corpus/reload recarga las piezas §3 desde
 * disco sin reiniciar el Dock.
 */
@Controller('corpus')
export class CitizenController {
  constructor(private readonly corpus: CorpusService) {}

  @Post('reload')
  @HttpCode(200)
  reload() {
    return { ok: true, corpus: this.corpus.reload() };
  }
}
