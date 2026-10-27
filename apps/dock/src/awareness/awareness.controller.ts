import { Controller, HttpException, Post } from '@nestjs/common';

/**
 * POST /see — stub declarado 501: Awareness por visión llega con SAM 3.1
 * (Meta Model API) en la Etapa D. Hoy el Dock NO procesa ni almacena
 * imágenes — y lo dice (mismo contrato que el gateway legado).
 */
@Controller()
export class AwarenessController {
  @Post('see')
  see(): never {
    throw new HttpException(
      {
        error: 'not_implemented',
        endpoint: 'POST /see',
        detail:
          'Awareness por visión llega con SAM 3.1 (Meta Model API) en la Etapa D. ' +
          'El Dock no procesa ni almacena imágenes.',
        source: 'dock',
      },
      501,
    );
  }
}
