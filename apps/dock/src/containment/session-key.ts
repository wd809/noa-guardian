/**
 * Clave de sesión para la contención: la cabecera `X-Session-Id` de la PWA
 * si es válida; si no, la IP de origen con prefijo. La clave vive solo en
 * memoria — jamás se registra con contenido (SECURITY-HARDENING §6).
 */
const SESSION_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

export function sessionKeyFromRequest(req: {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
  socket?: { remoteAddress?: string };
}): string {
  const header = req.headers['x-session-id'];
  const candidate = Array.isArray(header) ? header[0] : header;
  if (candidate && SESSION_ID_RE.test(candidate)) return `ses:${candidate}`;
  const ip = req.ip || req.socket?.remoteAddress || 'desconocida';
  return `ip:${ip}`;
}

export function isValidSessionId(value: unknown): value is string {
  return typeof value === 'string' && SESSION_ID_RE.test(value);
}

/** Clave interna a partir del id que envía el cliente (para reactivar). */
export function sessionKeyFromId(sessionId: string): string {
  return `ses:${sessionId}`;
}
