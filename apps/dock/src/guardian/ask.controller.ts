import {
  Body,
  Controller,
  HttpException,
  Post,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { ContainmentInterceptor } from '../containment/containment.interceptor.js';
import { CitizenService } from '../citizen/citizen.service.js';
import { GuardianService } from './guardian.service.js';

/**
 * POST /ask — contrato §1. Toda entrada pasa primero por el bucle de
 * contención (§6). Estado por etapa, declarado sin disfraz:
 *  - guardian: REAL (alertas oficiales), porte del gateway legado.
 *  - citizen: REAL (corpus verificado + puerta de jurisdicción, Etapa C).
 *  - awareness: 501 — llega en la Etapa D (visión SAM 3.1).
 */
@Controller()
@UseInterceptors(ContainmentInterceptor)
export class AskController {
  constructor(
    private readonly guardian: GuardianService,
    private readonly citizen: CitizenService,
  ) {}

  @Post('ask')
  async ask(
    @Body()
    body: {
      mode?: string;
      text?: unknown;
      location?: { lat?: unknown; lon?: unknown } | null;
    },
    @Res() res: Response,
  ): Promise<void> {
    const mode = body?.mode || 'citizen';
    if (mode === 'guardian') {
      const { status, body: out } = await this.guardian.answer(body ?? {});
      res.status(status).json(out);
      return;
    }
    if (mode === 'citizen') {
      const { status, body: out } = this.citizen.answer(body ?? {});
      res.status(status).json(out);
      return;
    }
    if (mode === 'awareness') {
      throw new HttpException(
        {
          error: 'not_implemented',
          mode,
          detail:
            'El modo awareness llega en la Etapa D (visión SAM 3.1). Mientras tanto la PWA usa su respaldo local etiquetado como mock.',
          source: 'dock',
        },
        501,
      );
    }
    throw new HttpException(
      { error: 'invalid_mode', detail: `Modo desconocido: ${mode}` },
      400,
    );
  }
}
