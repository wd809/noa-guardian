# Guardian Dock v1 — construido el 2026-10-22 (adelanto del sprint)

Implementación v1 del diseño de `docs/DOCK.md`. **Un solo servicio**
(`gateway`, Node 22 sin dependencias) que cumple tres roles del diseño:
gateway + feeds + citizen. Los servicios `brain` (Muse Spark, Meta Model
API) y `vision` (SAM 3.1) se añaden en el sprint **sin cambiar los
contratos** (`docs/CONTRACTS.md`).

## Endpoints

| Ruta | Estado v1 | Qué hace |
|---|---|---|
| `GET /health` | ✅ | Estado del Dock, del corpus (piezas/fragmentos) y de las fuentes. |
| `GET /alerts?lat&lon` | ✅ | Alertas oficiales normalizadas: **NWS** (punto), **USGS** (sismos ≤300 km, 7 días), **NASA EONET** (eventos abiertos cerca). Cada alerta lleva `source` y `url` oficial. Caché en memoria de 120 s por punto. Si una fuente cae, las demás responden y el fallo se declara en `sources.<fuente>.error`. Sin `lat/lon` usa Reading, PA y lo declara (`point.defaulted: true`). |
| `POST /ask` `{mode:"citizen", text}` | ✅ | Citizen **extractivo determinista** sobre `corpus/`: recupera los fragmentos estatutarios relevantes y compone la respuesta SOLO con ellos, con citas (documento, sección, fuente oficial, vigencia verificada). Sin cobertura → declara «no está en el corpus» y no inventa (regla dura 3). |
| `POST /ask` `{mode:"guardian"}` | ✅ | **Guardian REAL** sobre las mismas alertas oficiales de `/alerts`: resumen por severidad para el punto (del usuario o el por defecto, declarado), cada alerta con su fuente y URL oficial, y **regla de aviso proactivo** (severidad ≥ Severe o evento de la lista cerrada de peligro inmediato). Sin alertas lo declara; si una fuente cae, lo declara. Detalle: `docs/GUARDIAN-MODE-V1.md`. |
| `POST /ask` `{mode:"awareness"}` | 501 declarado | Llega con `vision` (SAM 3.1) en el sprint; la PWA cae a su respaldo mock etiquetado. |
| `POST /see` | 501 stub declarado | SAM 3.1 entra el Día 2 del sprint. El Dock v1 no procesa ni almacena imágenes. |

## Decisiones v1 (honestidad técnica)

- **Sin LLM todavía.** El motor Citizen es recuperación (sinónimos ES→EN
  auditables en `gateway/src/citizen.js`) + composición extractiva. Cuando
  Muse Spark se integre (Día 4), redactará SOBRE estos fragmentos; el
  guardarraíl «sin cita no hay respuesta» no cambia.
- **Solo piezas con `vigencia_verificada`** (§3): el motor ignora cualquier
  `.md` del corpus sin ese metadato. Las piezas «compañero» (metadatos de
  PDF) puntúan con penalización: apoyan, no sustituyen al texto estatutario.
- **Nada se persiste:** sin base de datos, sin logs de preguntas; la caché
  de alertas vive en memoria y expira en 120 s.
- CORS abierto (`*`) porque la PWA se sirve desde otro origen en LAN; el
  Dock solo escucha en la red de WD / Tailscale.

## Cómo correr

```bash
# En el repo (el corpus se monta desde ../corpus):
cd dock && docker compose up -d --build
curl localhost:8080/health

# Despliegue tipo «la mini» (corpus junto al compose):
#   copiar dock/* y corpus/ a la misma carpeta y crear .env con:
#   CORPUS_PATH=./corpus
# Sin Docker (desarrollo):  PORT=8080 node gateway/src/server.js
```

## Despliegue actual

- **La mini de WD** (`~/noa-guardian-dock/` en WSL, Docker Compose):
  contenedor `guardian-dock`, `restart: unless-stopped`, puerto 8080.
  Verificado el 2026-10-22 desde la propia máquina contra su IP LAN
  y su IP de red privada (puerto 8080 en ambas).
- La PWA busca el Dock en el mismo host desde el que se sirve, puerto
  8080 (`DOCK_BASE` en `app.js`), con respaldo etiquetado si no responde.
