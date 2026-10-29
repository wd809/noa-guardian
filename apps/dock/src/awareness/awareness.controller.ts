import { Body, Controller, HttpException, Post } from '@nestjs/common';
import type { SeeRespuesta, SeeSolicitud } from '@noa-guardian/contracts';
import {
  MetaVisionProvider,
  VisionNotConfiguredError,
  VisionUnavailableError,
} from './meta-vision.provider.js';
import { SeeOutputError } from './see-output.js';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const DEFAULT_QUESTION = 'Describe what is in front of me.';

/**
 * POST /see — Awareness por visión (Etapa D, D6).
 * Una foto → Muse Spark (Meta Model API) con el prompt de Spark 1.3 →
 * salida validada como dato no confiable antes de hablarse. El Dock no
 * almacena la imagen: vive solo en esta petición.
 * Estados declarados: sin llave → 501 not_configured; API caída → 502
 * vision_unavailable; salida del modelo inválida → 502 vision_output_invalid
 * (sin filtrar contenido del modelo). La protege la guardia global de token.
 */
@Controller()
export class AwarenessController {
  constructor(private readonly vision: MetaVisionProvider) {}

  @Post('see')
  async see(@Body() body: SeeSolicitud): Promise<SeeRespuesta> {
    const imageDataUri = normalizeImage(body?.image);
    if (!imageDataUri) {
      throw new HttpException(
        {
          error: 'invalid_image',
          endpoint: 'POST /see',
          detail:
            'Se requiere `image` como data URI (jpeg, png o webp) de hasta 5 MB.',
          source: 'dock',
        },
        400,
      );
    }
    const question =
      typeof body?.question === 'string' && body.question.trim().length > 0
        ? body.question.trim().slice(0, 200)
        : DEFAULT_QUESTION;
    try {
      const { scene, usage } = await this.vision.see(imageDataUri, question);
      return { ...scene, source: 'model', usage };
    } catch (err) {
      if (err instanceof VisionNotConfiguredError) {
        throw new HttpException(
          {
            error: 'not_configured',
            endpoint: 'POST /see',
            detail:
              'Awareness está construido pero inactivo: falta META_MODEL_API_KEY en el entorno del Dock.',
            source: 'dock',
          },
          501,
        );
      }
      if (err instanceof VisionUnavailableError) {
        throw new HttpException(
          {
            error: 'vision_unavailable',
            endpoint: 'POST /see',
            detail: 'La API de visión no respondió; no se inventa una descripción.',
            source: 'dock',
          },
          502,
        );
      }
      if (err instanceof SeeOutputError) {
        throw new HttpException(
          {
            error: 'vision_output_invalid',
            endpoint: 'POST /see',
            detail:
              'La salida del modelo no cumplió el esquema y se descartó entera.',
            source: 'dock',
          },
          502,
        );
      }
      throw err;
    }
  }
}

/** Acepta data URI con mime válido o base64 crudo (se asume jpeg). */
function normalizeImage(image: unknown): string | null {
  if (typeof image !== 'string' || image.length === 0) return null;
  const dataUri = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/.exec(
    image,
  );
  if (dataUri) {
    return approxBytes(dataUri[2]) <= MAX_IMAGE_BYTES ? image : null;
  }
  if (/^[A-Za-z0-9+/=\s]+$/.test(image) && image.length > 100) {
    return approxBytes(image) <= MAX_IMAGE_BYTES
      ? `data:image/jpeg;base64,${image.replace(/\s/g, '')}`
      : null;
  }
  return null;
}

function approxBytes(base64: string): number {
  return Math.floor((base64.replace(/\s/g, '').length * 3) / 4);
}
