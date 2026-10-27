import {
  Body,
  Controller,
  HttpCode,
  HttpException,
  Post,
} from '@nestjs/common';
import { ContainmentService } from './containment.service.js';
import { isValidSessionId, sessionKeyFromId } from './session-key.js';

/**
 * Reactivación de sesión: SOLO el propietario, desde su emparejamiento —
 * esta ruta va protegida por el DockTokenGuard global (el token ES la
 * credencial del propietario). §6 paso 3.
 */
@Controller('containment')
export class ContainmentController {
  constructor(private readonly containment: ContainmentService) {}

  @Post('reactivate')
  @HttpCode(200)
  reactivate(@Body() body: { sessionId?: unknown }) {
    if (!isValidSessionId(body?.sessionId)) {
      throw new HttpException(
        { error: 'invalid_session', detail: 'Se requiere { sessionId } válido.' },
        400,
      );
    }
    const cleared = this.containment.reactivate(sessionKeyFromId(body.sessionId));
    return { ok: true, sessionId: body.sessionId, cleared };
  }
}
