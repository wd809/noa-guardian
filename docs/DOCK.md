# Guardian Dock — diseño (listo para montar el Día 1)
Arquitectura fijada por WD el 2026-10-21. Este documento es el diseño; el montaje ocurre dentro de la ventana del hackathon. Los lentes quedan livianos (ojos, oídos, voz): el cerebro vive en Docker, en la red de WD.

> **Estado real (2026-10-22): Dock v1 CONSTRUIDO y DESPLEGADO en la mini** por orden de WD de adelantar el sprint. v1 = un servicio `gateway` (Node sin dependencias) con `/alerts` (NWS+USGS+EONET), `/ask` citizen extractivo sobre el corpus, `/health` y stub 501 de `/see`; la PWA ya lo consume con respaldo mock etiquetado. Detalle y operación: `dock/README.md`. Los servicios `brain`/`vision`/`asr`/`state` de este diseño siguen siendo trabajo del sprint.

## Principios
1. **Una sola puerta:** el teléfono habla únicamente con `gateway`. Ningún servicio interno se expone.
2. **Meta primero en la demo:** el razonamiento puntuado lo hace Muse Spark y la segmentación SAM 3.1 (Meta Model API). El LLM local (Ollama) es respaldo y modo privado, nunca el protagonista del video.
3. **Nada se guarda por defecto:** contexto en memoria con TTL corto; audio crudo se procesa y se descarta. Lo único persistente: corpus legal, configuración e incidentes ya anonimizados.
4. **Secretos fuera del repo:** `.env` local (nunca en git). Presupuesto de API registrado en `docs/BUDGET-LOG.md`.

## Servicios (docker-compose, esbozo de diseño)
| Servicio | Rol | Puerto interno | Notas |
|---|---|---|---|
| `gateway` | API única hacia el teléfono/PWA; autenticación por token de sesión; límite de tasa | 8080 (solo LAN) | Reverse proxy + validación de contratos |
| `brain` | Orquestación de modos; cliente de Meta Model API (Muse Spark); respaldo Ollama local | 8001 | Decide qué servicio responde; aplica guardarraíles |
| `vision` | SAM 3.1 (segmentación) + descripción de escena vía `brain` | 8002 | Awareness Mode |
| `asr` | Transcripción (Whisper) de voz del usuario y de audio de despacho | 8003 | Español + inglés; marcas de tiempo |
| `citizen` | RAG legal sobre corpus federal + PA; respuestas SOLO con cita verificable | 8004 | Si el corpus no cubre, lo declara |
| `dispatch` | Motor de despacho: ingesta → extracción → incidente (contrato en `docs/CONTRACTS.md`) | 8005 | Fuentes: archivos CC en el prototipo; SDR propio post-hackathon |
| `feeds` | Pollers oficiales: NWS (alertas), USGS (sismos), NASA EONET (eventos) | 8006 | Normaliza al esquema de alerta de Guardian |
| `state` | Estado efímero de sesión (Redis, TTL minutos) | 6379 | Sin datos personales persistentes |

```yaml
# Esbozo — el compose real se escribe el Día 1 contra este diseño
services:
  gateway:  { build: ./gateway,  ports: ["8080:8080"], depends_on: [brain] }
  brain:    { build: ./brain,    env_file: .env }        # Meta Model API + Ollama
  vision:   { build: ./vision,   env_file: .env }        # SAM 3.1
  asr:      { build: ./asr }                             # Whisper
  citizen:  { build: ./citizen,  volumes: ["./corpus:/corpus:ro"] }
  dispatch: { build: ./dispatch, volumes: ["./audio-in:/in:ro"] }
  feeds:    { build: ./feeds }
  state:    { image: redis:alpine }
```

## Contratos (resumen; el detalle vive en `docs/CONTRACTS.md`)
- `POST /ask` — misma forma que `askGuardian` (modo, entrada, contexto de ubicación/jurisdicción) → respuesta con citas y nivel de confianza.
- `GET /alerts?lat&lon` — alertas oficiales vigentes (NWS/USGS/EONET) normalizadas: tipo, severidad, fuente, vigencia.
- `POST /see` — imagen → objetos segmentados + riesgos (Awareness).
- Toda respuesta lleva `fuente` y, cuando aplica, `verificado: false` (reportado ≠ confirmado).

## Red y acceso
- **En casa:** teléfono ↔ Dock por Wi-Fi (LAN). Latencia objetivo < 1.5 s por respuesta de voz.
- **Fuera de casa:** túnel Tailscale al Dock; si no hay túnel, modo «calle» reducido (la PWA consulta NWS directo y degrada con elegancia, sin Dock).
- **Hardware:** PC de WD (RTX 3060 12 GB) como host principal; un equipo siempre encendido puede tomar el relevo post-hackathon.

## Montaje Día 1 (26-oct, tras reclamar los $150)
1. `docker compose up` con servicios mínimos: `gateway`, `brain`, `state`.
2. «Hola mundo» Muse Spark (texto) y SAM 3.1 (una imagen) desde `brain`/`vision`; registrar costo/latencia en `docs/BUDGET-LOG.md`.
3. Conectar la PWA al `gateway` en LAN y probar el loop de voz.
4. Servicios restantes por día según `docs/TASKS.md` (feeds Día 5 con Guardian, citizen Día 4, dispatch según plan).
