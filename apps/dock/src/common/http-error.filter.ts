import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

/**
 * Forma única de error del Dock: las HttpException declaradas por los
 * controladores se reenvían tal cual; cualquier otra excepción se registra
 * y sale como 500 mínimo, sin pila ni detalle interno.
 */
@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpErrorFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      res
        .status(status)
        .json(
          typeof body === 'string'
            ? { error: 'http_error', detail: body, source: 'dock' }
            : body,
        );
      return;
    }
    this.logger.error(
      `excepción no declarada: ${
        exception instanceof Error ? exception.message : String(exception)
      }`,
    );
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: 'internal',
      detail: 'Internal Dock error.',
      source: 'dock',
    });
  }
}
