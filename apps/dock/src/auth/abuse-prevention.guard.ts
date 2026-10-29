import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
} from '@nestjs/common';
import { AbuseTrackerService, type RouteClass } from './abuse-tracker.service.js';

/**
 * Guardia preventiva anti-abuso (Etapa D, pieza D3). Corre ANTES de la
 * guardia de token en la cadena global: si una IP está bloqueada por
 * fuerza bruta (5 tokens fallidos en 60 s → 15 min) o supera el ritmo
 * por clase de ruta, responde 429 sin gastar trabajo en lo demás.
 * No sustituye al bucle de contención §6 (que puntúa por sesión): esto
 * es la puerta de la calle; la contención es la del pasillo.
 */
@Injectable()
export class AbusePreventionGuard implements CanActivate {
  constructor(private readonly tracker: AbuseTrackerService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{
      ip?: string;
      url?: string;
      method?: string;
    }>();
    if (req.method === 'OPTIONS') return true; // preflight CORS no cuenta
    const ip = req.ip ?? 'unknown';
    if (this.tracker.isBlocked(ip)) {
      throw new HttpException(
        {
          error: 'too_many_auth_failures',
          detail:
            'Demasiados intentos de autenticación fallidos desde esta red. ' +
            'Espera unos minutos y revisa el token de emparejamiento.',
        },
        429,
      );
    }
    const path = (req.url ?? '').split('?')[0];
    const routeClass: RouteClass = path.startsWith('/alerts')
      ? 'alerts'
      : path.startsWith('/ask')
        ? 'ask'
        : 'general';
    if (!this.tracker.allow(ip, routeClass)) {
      throw new HttpException(
        {
          error: 'rate_limited',
          detail:
            'Ritmo de peticiones superado para esta ruta. Espera un minuto.',
        },
        429,
      );
    }
    return true;
  }
}
