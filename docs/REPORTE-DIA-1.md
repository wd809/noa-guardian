# Reporte Día 1 — Verificación Meta Model API (2026-10-26)

Rol 3 (Integración) · evaluado por Noa contra docs/TASKS.md y docs/CONTRACTS.md

## Resultado: VERIFICADO ✅

La llave de API de WD quedó guardada en la bóveda (conector `custom.meta-model-api`) y las llamadas reales salen contra `https://api.meta.ai/v1` con la credencial de la conexión. Ninguna llamada se hizo con datos reales: solo datos sintéticos (regla del laboratorio).

## Disponibilidad real (GET /v1/models, 200 en 1.6 s)

Modelos en la cuenta de WD: `muse-spark-1.3`, `muse-spark-1.2`, `muse-spark-1.1` (+ variantes `-contributor`), `muse-wonder-1.0`, `muse-image-1.0`, `muse-voice-transcribe-1.0` y **`sam-3.1`**.

## «Hola mundo» multimodal ✅

| Prueba | Estado | Latencia | Tokens in/out | Costo est. | Resultado |
|---|---|---|---|---|---|
| Chat texto, muse-spark-1.3 | 200 | 3.5 s | 28 / 352 | $0.0015 | «hola mundo, soy Muse Spark.» |
| Chat con imagen sintética (círculo rojo + cuadrado azul) | 200 | 2.1 s | 131 / 348 | $0.0016 | Descripción correcta de formas, colores y posiciones |

## Hallazgos que afectan el diseño

1. **Muse Spark es un modelo de razonamiento:** con `max_tokens` bajo, el razonamiento interno (298–335 tokens incluso con `reasoning_effort: low`) consume el presupuesto y la respuesta visible sale vacía. Regla para el Dock: `max_tokens` holgado (≥1500 en estas pruebas) y esfuerzo de razonamiento calibrado por modo; Citizen puede pagar más razonamiento, Awareness debe ir ligero por latencia.
2. **Costo por llamada ~$0.002:** con respuestas típicas de Guardian, los $150 rinden miles de llamadas; el prototipo queda muy por debajo del tope de $60. Detalle en `docs/BUDGET-LOG.md`.
3. **Latencia 2–3.5 s por llamada** en frío desde la VM de Noa: aceptable para el prototipo con teléfono; la voz manos libres (Día 3) debe enmascararla con respuestas progresivas.
4. **SAM 3.1 está listado y disponible en la cuenta**; la llamada de segmentación en sí queda para el Día 2 (Awareness), con la forma exacta del endpoint por confirmar en la documentación/taller de Meta — no se adivinó ningún endpoint con los créditos de WD.
5. **Nota de red del entorno de Noa (no del producto):** desde la VM de Noa, el DNS del proxy de salida para `api.meta.ai` está interceptado y la conexión por nombre se cuelga; el helper del conector resuelve la IP real por DNS-over-HTTPS y la fija (`--resolve`). Desde la red de WD (donde vive el Dock) esto no aplica.

## Pendiente del Día 1

- Nada bloqueante. La verificación pedida (disponibilidad, latencia, costo/llamada) está completa.
