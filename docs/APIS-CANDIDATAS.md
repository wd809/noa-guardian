# APIs candidatas — investigación (2026-11-01)

Solo investigación: ninguna de las dos está integrada. Todo lo de abajo se
verificó en vivo hoy; donde no se pudo verificar, se dice.

## Road511 (road511.com) — agregador 511 comercial

- **¿Incluye Pensilvania? Sí.** Verificado en vivo en
  `GET https://api.road511.com/api/v1/jurisdictions?scope=state` (público,
  sin llave): `code "PA"`, `name "Pennsylvania"`,
  `official_name "PA 511"`, `is_active true`, grupo `us-pa` más
  `WZDX_PA`. (La respuesta trae 101 códigos: incluye hermanos WZDx,
  federales y regionales, no solo estados.)
- **¿Son los datos del feed oficial 511? A medias, con matiz.** Detrás hay
  los 511 estatales (PA 511 = datos de 511PA/PennDOT), pero llegan
  normalizados por un tercero comercial, no desde la agencia emisora. Los
  ToS §7 lo dicen claro: las condiciones y licencias de cada fuente
  upstream siguen aplicando aguas abajo.
- **Precio (tabla de docs.html):** trial 14 días (1.000 req/día,
  2 jurisdicciones, en Free el filtro `jurisdiction` es obligatorio);
  Starter $29/mes, Pro $99/mes, Enterprise $279/mes.
- **¿Se puede usar dentro de una app? Sí, explícito.** ToS
  (2026-10-16, "Embedded and Product Use"): permite incorporar los datos
  normalizados en productos y mostrarlos a usuarios finales (incl.
  apps para conductores), cumpliendo attribution obligatoria (no quitar
  avisos) y las condiciones upstream. Prohibido: revender respuestas
  crudas, scrapear fuera del uso normal de la API, o clonar el servicio.
- **Lectura para NOA Guardian:** viable como puente temporal mientras
  PennDOT RCRS no entrega credenciales, pero es de pago y mete un
  intermediario entre el Dock y datos que son públicos y gratuitos en
  origen. Recomendación: seguir esperando RCRS (directo, $0); si urge,
  el trial de 14 días da para una prueba acotada a PA.

## CityAlert (cityalert.live) — incidentes de seguridad pública

- **¿Cubre Reading, PA? Parcial, sin foco propio.** Hay 768 regiones
  (`GET /api/regions`, público): existe la región estatal `pennsylvania`
  y ciudades PA (Pittsburgh, Harrisburg…), pero **no hay región
  "Reading"**. Prueba en vivo: bbox de Reading
  `(-76.1,40.2,-75.7,40.45)` → 0 incidentes; bbox de todo PA → 2.897
  incidentes, incluyendo `lancaster-cad` (CAD del 911 del condado vecino
  Lancaster, lo más cercano a Reading), `pittsburgh-311` y
  **`penndot-511`** (datos viales de 511pa.com redifundidos).
- **¿De qué feeds oficiales sale cada incidente? Depende del item — y no
  todo es oficial.** Cada incidente trae `source` (clave del feed) y
  `url` (enlace upstream), así que se puede filtrar. Pero el stream
  mezcla: oficiales (`usgs`, `nws`, `eonet`, `lancaster-cad`,
  `penndot-511`, `pittsburgh-311`…) + **medios** (p. ej. `gdelt`: hoy
  devolvió un "armed clash" en Nueva York sacado de una noticia de
  farándula, con `severity high` y `approximate true` — ruido puro) +
  **reportes comunitarios sin verificar**. Los globales (nws/usgs/eonet)
  el Dock ya los consume directo de la fuente.
- **¿Permiten mostrarlo en una app? Con límites importantes.** ToS
  (oct-2025): los endpoints `/api` son para "reasonable personal,
  research and light-integration use"; **el uso comercial o masivo
  requiere permiso previo por escrito**; y prohíben terminantemente
  apoyarse en el servicio para decisiones de seguridad
  ("Informational only — not for safety decisions"). Planes API: llave
  gratis 60 req/día (snapshots con ~15 min de retraso), Developer
  $99/mes (real-time, 5.000/día), Pro $499/mes.
- **Lectura para NOA Guardian:** no integrable como fuente de alertas sin
  (1) permiso escrito, (2) filtrar a solo feeds oficiales y
  (3) etiquetar procedencia item por item — y aun así choca con la regla
  de "fuentes oficiales directas". En cambio, su fuente `penndot-511`
  merece una investigación aparte: si redifunde 511pa.com con frescura
  aceptable, podría ser una vía alternativa mientras RCRS sigue en
  trámite (verificar cobertura y retraso antes de decidir).
