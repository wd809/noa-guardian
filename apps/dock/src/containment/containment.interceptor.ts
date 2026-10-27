import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { ContainmentService } from './containment.service.js';
import { sessionKeyFromRequest } from './session-key.js';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Aplica el bucle de contención (§6) ANTES del controlador: examina las
 * cadenas no confiables del cuerpo, marca en silencio, retarda (tarpit) y
 * bloquea a la 3.ª marca. La respuesta de bloqueo es mínima a propósito:
 * ningún oráculo de error útil para quien intenta evadir.
 */
@Injectable()
export class ContainmentInterceptor implements NestInterceptor {
  constructor(private readonly containment: ContainmentService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      ip?: string;
      socket?: { remoteAddress?: string };
      body?: Record<string, unknown>;
    }>();
    const body = req.body ?? {};
    const texts = Object.values(body).filter(
      (v): v is string => typeof v === 'string',
    );
    const decision = this.containment.evaluate(
      sessionKeyFromRequest(req),
      texts,
    );
    if (decision.action === 'blocked') {
      throw new HttpException(
        {
          error: 'session_blocked',
          detail:
            'Sesión bloqueada por seguridad. El propietario puede reactivarla desde su emparejamiento.',
        },
        403,
      );
    }
    if (decision.action === 'delay') {
      await sleep(decision.delayMs);
    }
    return next.handle();
  }
}
