# Endurecimiento 30-oct-2026 (local, previo a GitHub)

Pasada de seguridad y diseño sobre `noa-guardian-proyecto-20261029`, antes de
subir. Todo lo listado está implementado y cubierto por pruebas del repo.

## Dock (Nest)

- **Fail-closed en producción**: sin `DOCK_TOKEN` o sin `DOCK_CORS_ORIGINS` y
  `NODE_ENV=production`, el Dock no arranca (`config/dock-config.service.ts`).
- **CORS declarado**: `DOCK_CORS_ORIGINS` con la lista de la PWA; `*` solo en
  desarrollo y con aviso (`main.ts`). Nuevas vars en `apps/dock/.env.example`.
- **Cabeceras**: CSP `default-src 'none'`, `Permissions-Policy` sin
  cámara/mic/ubicación, `COOP same-origin`, `X-Permitted-Cross-Domain-Policies`
  y HSTS opt-in (`DOCK_HSTS=1`, solo tras HTTPS).
- **Proxy**: `DOCK_TRUST_PROXY=1` para `req.ip` real tras proxy propio.
- **Errores únicos**: `common/http-error.filter.ts` reenvía los declarados y
  convierte el resto en 500 mínimo, sin pilas.
- **Anti-abuso acotado**: poda de vencidos + tope FIFO 5000 por mapa.
- **Contención acotada**: marcas que caducan a las 24 h de la última señal;
  el bloqueo solo lo levanta el propietario; tope 2000 sesiones.
- **Presupuesto impuesto** (contrato §4): `BudgetService` en memoria por
  proceso — `POST /see` exige presupuesto antes de llamar y anota el costo
  después; sin tope, 429 `budget_exceeded`. `GET /health` expone el agregado.
- **Salud mínima**: `/health` ya no expone la ruta local del corpus (tampoco
  el gateway legado).
- **Punto validado**: `GET /alerts` con query parcial/fuera de rango → 400
  `invalid_point`; sin query, defecto declarado como antes.
- **Recarga de corpus**: `POST /corpus/reload` (con token) sin reiniciar.
- Licencia del Dock alineada a MIT.

## Web (Angular) y Android

- **Orbe honesto**: el verde exige `alertsKnown === true` y fuentes
  consultadas; si no, ámbar «comprobación incompleta» (`orb-state.ts` + specs).
- **Cliente Dock**: timeout 10 s, `DockError` con estado y código del Dock,
  `?dock=`/`?token=` se borran de la URL tras emparejar, URL base validada.
- **Sesión**: el presupuesto de `/health` alimenta la vista al probar conexión.
- **Android**: `allowBackup=false` (el token no va a la nube), permisos de
  cámara, micrófono y ubicación declarados. `usesCleartextTraffic` sigue en
  `true` porque el Dock hoy es HTTP en LAN — documentado en el manifiesto.

## Pruebas añadidas/actualizadas

Dock (vitest): `budget.service.spec` (nuevo), `point-validation.spec` (nuevo),
casos de poda/tope en `abuse-tracker.spec`, caducidad/bloqueo en
`containment.service.spec`, `/health` mínimo y 400/401/reload en
`dock.integration.spec` y `app.controller.spec`. Web: 2 casos nuevos del orbe.

## Aviso legal (30-oct, segunda pasada)

- `docs/LEGAL-NOTICE.md`: descarga de responsabilidad completa (no asesoría
  legal, no emergencias, sin garantías, uso bajo propio riesgo), marcada como
  base pendiente de revisión por abogado.
- App: vista `/aviso-legal` + pestaña + banner de primer uso con aceptación
  por dispositivo (`core/legal-notice.ts`, con spec de cláusulas).
- Guardian (Nest y legado, en paridad): el 911 aparece en los 4 desenlaces,
  no solo cuando hay alertas; Citizen ya cerraba con "no asesoría legal".

## Idioma: superficie visible en inglés (30-oct)

- Web Angular, maqueta raíz `index.html`, manifiesto PWA, aviso legal
  (`docs/LEGAL-NOTICE.md`, sustituye a `docs/AVISO-LEGAL.md`) y detalles de
  error del Dock (Nest y legado) en inglés.
- Quedan en español a propósito: voz de Guardian/Citizen y sus pruebas,
  `app.js` huérfano (sin página que lo cargue), docs internos, comentarios y
  logs de servidor.

## Residuales honestos (no incluidos)

SQLite persistente del presupuesto · `session-id` emitido por servidor ·
HTTPS/Tailscale pleno · ASR/TTS local (S-01) · endpoint SAM 3.1 · suite
adversarial e2e + Etapa E (campo, demo, envío).
