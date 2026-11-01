import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Marca una ruta como pública (hoy: solo GET /health, como en el legado). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
