# Diseño aprobado — NOA Guardian v4

**`NOA-Guardian-v4.html`** es la referencia de diseño aprobada por WD el 2026-10-28.
Un solo archivo, sin dependencias de servidor: se abre en cualquier navegador.

## Qué contiene

- **La piel interactiva** (voz primero): Inicio con la orbe y «¿Qué necesitas saber?»,
  modos Guardian / Citizen / Awareness, «Hablar con NOA» con dictado del navegador
  (con su aviso de privacidad) y navegación Inicio / Mapa / Alertas / Lugares /
  Configuración.
- **El mapa real de Reading, PA, embebido**: mosaicos de OpenStreetMap dentro del
  propio archivo (sin CDN y sin API keys), con arrastre, dos niveles de zoom,
  punto del usuario, pines y ruta calculada sobre las calles verdaderas.
  © OpenStreetMap contributors (ODbL) — atribución visible en el mapa.

## Honestidad de datos

- Los **eventos callejeros son simulados y están etiquetados** («DEMO · Datos
  simulados», «Ejemplo simulado») en cada tarjeta y en el mapa.
- Esta referencia **aún no está conectada** al Guardian Dock ni a las fuentes
  oficiales en vivo (NWS · USGS · NASA EONET): es la cara aprobada que se porta
  a la app (`apps/web`) en la Etapa D, donde el mapa se alimentará del Dock.
- Única petición externa al abrirla: la tipografía Inter desde Google Fonts.

## Seguridad (revisado antes de publicar)

Sin credenciales ni claves, sin datos personales, sin llamadas de red del
código (cero `fetch`/XHR/WebSocket), y el texto del usuario se renderiza
siempre escapado (`escapeHtml`).
