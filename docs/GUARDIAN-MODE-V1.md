# Modo Guardian v1 — REAL sobre alertas oficiales (2026-10-22)

Adelanto del sprint por orden de WD («sigamos, ¿qué más se puede hacer?»).
Hasta hoy, `POST /ask` en modo `guardian` devolvía 501 y la PWA caía a su
respaldo mock. Desde esta entrega, el modo Guardian del Dock es **real**:
evalúa las alertas oficiales vigentes y responde con fuentes. No se tocó el
modo Citizen ni el corpus (otro frente trabaja ahí en paralelo).

## Qué se construyó

| Pieza | Archivo | Qué hace |
|---|---|---|
| Motor Guardian | `dock/gateway/src/guardian.js` (nuevo) | Composición determinista (sin LLM) sobre las alertas ya normalizadas por `feeds.js`: resumen por severidad, aviso proactivo, texto listo para UI/TTS y bloque estructurado `guardian` para la PWA. |
| Ruta | `dock/gateway/src/server.js` | `POST /ask {mode:"guardian"}` pasa de 501 a `answerGuardian()`; `awareness` sigue 501 declarado. `/health` reporta `guardian ok (alertas oficiales)`. |
| PWA | `app.js` | El modo Guardian ya consume la respuesta real del Dock (vía `askGuardian`, que siempre intentó el Dock primero); la etiqueta de fuente muestra «alertas oficiales (NWS · USGS · NASA EONET)» para `source: "feeds"`. Ejemplos y placeholder del modo alineados con preguntas de zona («¿hay algo peligroso cerca?»). El respaldo mock etiquetado se mantiene SOLO si el Dock no responde. Voz, cámara, Citizen y alertas intactos. |
| QA | `tests/run-guardian.mjs` (nuevo) | 8 verificaciones: fixtures deterministas + contrato HTTP real. `tests/run-dock.mjs` D7 actualizado (awareness 501; guardian salió del 501). |

## La regla de severidad (aviso proactivo)

Una alerta dispara **aviso prioritario** si cumple CUALQUIERA de:

1. **Severidad normalizada ≥ Severe** — rangos: Extreme 4 · Severe 3 ·
   Moderate 2 · Minor 1 · Unknown 0 (las severidades llegan ya normalizadas
   por `feeds.js`: NWS usa su escala; USGS mapea magnitud → severidad;
   EONET llega como Unknown).
2. **Su evento está en la LISTA CERRADA** `PROACTIVE_EVENTS` de
   `guardian.js` (avisos de peligro inmediato aunque la fuente los etiquete
   por debajo de Severe): *Tornado Warning, Flash Flood Warning, Extreme
   Wind Warning, Hurricane Warning, Tsunami Warning, Avalanche Warning,
   Blizzard Warning, Evacuation*.

La lista es cerrada a propósito: ampliarla exige editar `guardian.js` y
esta doc — nunca un ajuste silencioso en caliente. La regla viaja en cada
respuesta (`guardian.proactiveRule`) para que la UI y la demo la puedan
mostrar tal cual.

## Forma de la respuesta (contrato §1 + bloque Guardian)

```jsonc
{
  "text": "…resumen por severidad, cada alerta con fuente y URL…",
  "citations": ["NWS — Freeze Watch (Severe) · https://api.weather.gov/alerts/…"],
  "source": "feeds",
  "usage": { "model": "dock-guardian-feeds-v1", "inputTokens": 0, "outputTokens": 0, "costUsd": 0 },
  "guardian": {
    "point": { "lat": 40.3356, "lon": -75.9269, "defaulted": true },
    "total": 1,
    "bySeverity": { "Extreme": 0, "Severe": 1, "Moderate": 0, "Minor": 0, "Unknown": 0 },
    "proactiveAlert": true,
    "proactiveRule": "severity ≥ Severe (rango ≥ 3) o evento en la lista cerrada PROACTIVE_EVENTS de guardian.js",
    "alerts": [ /* alertas ordenadas por severidad, con source y url */ ],
    "sources": { "NWS": { "ok": true, "count": 1 }, "…": {} },
    "generatedAt": "…"
  }
}
```

**Extensión documentada del §1:** el contrato decía `citations: []` en modos
distintos de citizen — eso era del scaffold sin Dock, cuando no había
fuentes que citar. En modo guardian, `citations` lleva la fuente oficial de
cada alerta citada (la regla de este modo es «cada afirmación con su
fuente»). `source: "feeds"` es un valor nuevo junto a `model|corpus|mock`:
la respuesta no viene de un modelo ni del corpus legal, sino de los feeds
oficiales en vivo.

## Garantías (reglas duras)

- **Solo fuentes oficiales vigentes** (NWS, USGS, NASA EONET vía `feeds.js`).
  Nada de rumores ni de incidentes reportados sin confirmar.
- **Sin alertas → se dice**: «Sin alertas oficiales activas para tu zona»,
  con la salvedad de que eso no es una garantía de seguridad.
- **Fuente caída → se declara**: si una fuente no respondió, la respuesta
  lo anota y la evaluación la excluye; si caen TODAS, el Dock dice que no
  puede evaluar — **jamás afirma «es seguro» desde un hueco de datos**.
- **Ubicación**: se usa `input.location` solo si el cliente la envía (la PWA
  la pide con consentimiento en el botón de alertas); sin ubicación se usa
  Reading, PA y el texto lo **declara** («punto por defecto»).
- **Nada se almacena**: ni la pregunta ni la ubicación se persisten; la
  caché de alertas vive en memoria (120 s, la de `feeds.js`).
- El peligro se define por **zona** (alertas del área), nunca por identidad.

## Cómo probarlo

```bash
# QA determinista + contrato (fixtures sin depender del clima real):
node tests/run-guardian.mjs     # 8/8
node tests/run-dock.mjs         # 10/10 (regresión completa del Dock)
node tests/run-cases.mjs        # 15/15 (banco estructural)

# En vivo, contra el Dock desplegado (sustituir <dock-ip> por la IP local del Dock):
curl -s http://<dock-ip>:8080/health
curl -s -X POST http://<dock-ip>:8080/ask \
  -H 'Content-Type: application/json' \
  -d '{"mode":"guardian","text":"¿Hay algo peligroso cerca de mí?"}'
```

**Evidencia del despliegue (2026-10-22, desde la propia mini):** `/health`
→ `status: ok`, endpoints «citizen ok · guardian ok (alertas oficiales) ·
awareness 501»; la pregunta real respondió con el **Freeze Watch del NWS
(Severe, vigente hasta el 2026-10-24, área incl. Berks)** con
`proactiveAlert: true` y su cita con la URL oficial de api.weather.gov.

## Qué queda para el sprint

- **`brain` (Muse Spark, Meta Model API)**: redactar lenguaje natural
  completo SOBRE esta evaluación (matices, recomendaciones por
  comportamiento) sin cambiar la forma ni las fuentes; el motor
  determinista queda como guardarraíl y respaldo.
- **Ubicación de sesión**: que la PWA pase `location` a `/ask` cuando el
  usuario ya la autorizó en la sesión (hoy el modo usa el punto declarado;
  el botón de alertas sí usa la ubicación real).
- **Modo awareness sigue 501** hasta que `vision` (SAM 3.1) entre el Día 2
  del sprint; `/see` igual.
- Aviso proactivo **fuera de consulta** (push cuando una alerta nueva cumple
  la regla) requiere el servicio `state`/polling del diseño: no está en v1
  y no se simula.
