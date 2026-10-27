# Plan B de la demo — versión grabada (si el vivo falla)

La submission es un video: la demo «en vivo» solo importa si hay presentación en directo (finales, 9-nov). Este plan garantiza que, pase lo que pase, exista siempre un video completo, honesto y subible.

## Principio
Nada del Plan B finge ser en vivo. Cada segmento grabado es una corrida real del sistema el día que se grabó; si un segmento usa el mock, la etiqueta `source: "mock"` se queda visible, como manda la regla 7.

## Activos que se graban POR ADELANTADO (Día 7, no el Día 9)
1. **Segmentos por modo** (guion en `propuesta-submission-pack.md`): cada uno grabado dos veces — una corrida limpia para el corte principal y una de respaldo.
2. **Captura del simulador** de lentes (Web App Simulator) de cada flujo: alertas NWS reales, pregunta Citizen con cita, foto Awareness.
3. **Captura del Dock respondiendo**: terminal con los servicios arriba y una respuesta real de Muse Spark vía gateway (con su línea en `BUDGET-LOG.md`).
4. **Plano de contingencia de red**: la PWA completa corriendo en local con el mock etiquetado — demuestra que la interfaz y los contratos no dependen de la red.

## Tabla de fallos y respuesta
| Falla | Respuesta inmediata |
|---|---|
| Meta Model API caída o sin saldo | Cortar a los segmentos grabados del Día 7; en vivo solo NWS (fuente oficial, sin API de pago) |
| Dock inaccesible (red/Tailscale) | La PWA en el teléfono sigue con el mock etiquetado; el video usa las capturas del Dock del Día 7 |
| NWS sin respuesta | Contrato §2: la UI dice «sin datos», jamás inventa — eso también es demo de honestidad; se usa la captura con alertas reales |
| Fallo total en la grabación final | Se sube el corte del Día 7 (por eso se graba completo ese día, no el 9) |

## Regla de oro del calendario
El **Día 7 queda un video completo y subible**. Los Días 8–9 solo lo mejoran. Si algo se rompe el Día 9, se sube el del Día 7 y nadie improvisa.
