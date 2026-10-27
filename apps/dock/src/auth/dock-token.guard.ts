import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { timingSafeEqual } from 'node:crypto';
import { DockConfigService } from '../config/dock-config.service.js';
import { IS_PUBLIC_KEY } from './public.decorator.js';

/**
 * Autenticación de aplicación del Dock (porte del tokenOk del gateway
 * legado): si el despliegue define DOCK_TOKEN, todo endpoint excepto los
 * marcados @Public() exige la cabecera `X-Dock-Token` con ese valor,
 * comparada en tiempo constante. Tailscale/LAN son transporte privado,
 * NO autenticación — por eso el token vive en la aplicación.
 */
@Injectable()
export class DockTokenGuard implements CanActivate {
  constructor(
    private readonly config: DockConfigService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    if (!this.config.tokenEnabled) return true;

    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
    }>();
    const given = String(req.headers['x-dock-token'] ?? '');
    const a = Buffer.from(given);
    const b = Buffer.from(this.config.dockToken);
    const ok = a.length === b.length && timingSafeEqual(a, b);
    if (!ok) {
      throw new HttpException(
        {
          error: 'unauthorized',
          detail:
            'Este Dock exige la cabecera X-Dock-Token (emparejamiento). ' +
            'Configura el token en la PWA o revisa el DOCK_TOKEN del despliegue.',
        },
        401,
      );
    }
    return true;
  }
}
