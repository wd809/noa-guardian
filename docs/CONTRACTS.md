# Contratos entre agentes — NOA Guardian

Los contratos son la interfaz entre roles. Mientras no exista la API real (hasta el 26-oct), cada rol programa contra estos contratos usando mocks que devuelven exactamente estas formas. Cambiar un contrato requiere aprobación del Arquitecto y aviso a todos los roles que lo consumen.

## 1. Consulta al cerebro (lo implementa: Integración Meta API · lo consume: Frontend, Citizen)

`askGuardian(input) → Promise<GuardianAnswer>`

```ts
input = {
  mode: "guardian" | "citizen" | "awareness",
  text: string,                 // pregunta del usuario (voz ya transcrita)
  imageBase64?: string,         // SOLO en memoria, nunca persistida
  location?: { lat: number, lon: number }  // solo si el usuario lo autorizó en la sesión
}

GuardianAnswer = {
  text: string,                 // respuesta lista para mostrar y para TTS
  citations: string[],          // obligatorio en modo citizen; [] en otros modos
  jurisdiction?: string,        // p. ej. "Pensilvania, EE. UU."
  source: "model" | "corpus" | "mock",   // honestidad de demo: el mock se etiqueta
  usage: { model: string, inputTokens: number, outputTokens: number, costUsd: number }
}
```

Reglas: en modo `citizen`, si no hay cita verificable, `text` debe decir que el corpus no lo cubre (nunca rellenar). `usage.costUsd` se calcula siempre, también en mock (0).

## 2. Alertas oficiales (lo implementa: Frontend hoy vía NWS · futuro: Integración)

`getOfficialAlerts(lat, lon) → Promise<OfficialAlert[]>`

```ts
OfficialAlert = {
  event: string, severity: string, headline: string,
  area: string, ends?: string, source: "NWS"   // solo fuentes oficiales
}
```

Sin alertas = arreglo vacío. Error de red = excepción: la UI lo reporta como «sin datos», jamás inventa una alerta.

## 3. Corpus legal (lo mantiene: Citizen/RAG · lo consume: Integración)

Cada documento del corpus es un archivo con metadatos al inicio:

```
---
titulo: Pennsylvania Wiretap Act — secciones clave
fuente: https://www.palegis.us/ (texto oficial)
jurisdiccion: Pensilvania, EE. UU.
vigencia_verificada: 2026-10-21
release_point: estatal vigente / federal PL 119-121
---
```

Sin `vigencia_verificada` reciente, el documento no se usa para responder.

## 4. Registro de presupuesto (lo mantiene: Integración Meta API)

La fuente operativa es el **contador transaccional** (SQLite, con reservas) que entra en la Etapa D; `docs/BUDGET-LOG.md` queda como resumen exportado, una línea por llamada real a la API:

```
2026-10-26T21:02Z | muse-spark-1.3 | verificacion-dia-1 | in 28 / out 352 | $0.0015 | saldo est. $149.99
```

Política vigente (prompt de arquitectura v1.0 de WD, 27-oct-2026 — sustituye el tope anterior de $60): primero se gastan los créditos gratuitos (**$149.99 restantes** al 27-oct según el panel de WD); agotados, el gasto pagado máximo autorizado es **$30.00** (techo nominal total $179.99). Prohibidas las recargas automáticas. Si el gasto proyectado supera el techo, Integración lo escala a Noa el mismo día.

## 5. Entrega de un especialista (lo evalúa: Noa)

Toda entrega incluye, en este orden:
1. Qué se hizo (archivos creados/cambiados).
2. Cómo se verificó (comando, prueba o captura — no «debería funcionar»).
3. Qué reglas duras o contratos toca.
4. Riesgos o bloqueos abiertos.

Sin verificación, la entrega se devuelve.
