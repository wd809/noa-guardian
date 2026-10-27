# Tablero del laboratorio — NOA Guardian

Lo mantiene Noa (orquestadora). Estados: ⬜ pendiente · 🔄 en curso · ✅ hecho · ⛔ bloqueado.
Contrato del equipo: laboratorio de WD, fuera del repo público desde el 26-oct · Interfaces: `docs/CONTRACTS.md` · Ruta: `docs/ROADMAP.md`.
Nota (26-oct, decisión de WD): el contrato operativo y las fichas de rol viven en su laboratorio permanente, no en este repositorio; los números de rol de este tablero se refieren a ese laboratorio. El proyecto presenta una sola agente directora: Noa.

## Fase 0 — Hecho (21-oct)
- ✅ Corpus legal PA + federal, banco de 15 situaciones, prompts v1 — Noa
- ✅ Scaffold PWA (cámara, voz, tres modos, alertas NWS) — Noa
- ✅ Equipo montado: AGENTS.md, 7 fichas de rol, contratos — Noa

## Antes de la API (22–25 oct) — HISTORIAL (trabajo contra mocks; la API real quedó verificada el Día 1, 26-oct)
| Tarea | Rol | Estado |
|---|---|---|
| `docs/DECISIONS.md` inicial: sin build, PWA, contratos v1 | 1 Arquitecto | ✅ 21-oct (12 ADR) |
| Extraer el mock de `app.js` a `askGuardian` con la forma exacta del contrato §1 | 2 Frontend + 3 Integración | ✅ 21-oct (verificado: node --check + harness) |
| Casos ejecutables del banco de 15 (entrada, esperado, pasa/falla) en `tests/` | 6 QA | ✅ 21-oct (runner PASS 15/15) |
| Informe de cobertura del corpus: qué temas responde Citizen y cuáles no | 4 Citizen | ✅ 21-oct (`docs/CORPUS-COVERAGE.md`) |
| Normalizar metadatos del corpus (bloque §3 con `vigencia_verificada` en cada pieza) antes de la ingesta | 4 Citizen | ✅ 22-oct (cumplimiento §3: 0 → **15/15 piezas** en `corpus/` del repo; huecos cerrados: 18 Pa.C.S. Cap. 5, HICPA completo, Título 75 accidentes/estacionamiento/luces, capa salarial PA MWA+WPCL, § 5702 Wiretap; Citizen: **5 completas, 3 parciales, 0 huecos** — verificado por Noa con grep y `CORPUS-COVERAGE.md`) |
| Entradas KB de la app para C5, C6 y C7 + cita HICPA en C3 (el corpus ya las sostiene; falta la capa de respuestas) | 4 Citizen + Noa | ✅ 22-oct (oleada 2: entradas nuevas C5/C6/C7 y C3 con HICPA §§ 7, 8(a)(2), 9(5), 9(10), 10; Citizen: **6/8 completas, 7/8 con entrada KB** — C7 queda parcial solo por la verificación fina FLSA §§ 206/207 en el PDF del Título 29, para el Día 4) |
| Descargar el texto estatutario del Landlord and Tenant Act (68 P.S. § 250.512) para cerrar C4 sin depender solo de la guía OAG | 4 Citizen | ✅ 22-oct (`corpus/pa/landlord-tenant-act-deposito.md`: Secciones 511.1–512 íntegras = 68 P.S. §§ 250.511a–250.512; C4 completa con estatuto; corpus §3: **16/16**) |
| Transcribir § 3354(d) íntegro (estacionamiento accesible) si la demo A2 usa ese ejemplo | 4 Citizen | ✅ 22-oct (hecho sin esperar la condición: § 3354 completo; **corregido un error del resumen previo: son 60 minutos en exceso, no 12 h**; multa (f) $50–$200) |
| Ajuste conductual de fragmentos en entradas KB viejas (C1/C2: «sin audio», «por escrito», «no asesoría legal»; C4: «no asesoría legal») | Noa | ✅ 22-oct (aplicado al integrar la oleada 2; fragmentos verificados contra `tests/cases.json`, sin frases prohibidas, QA 15/15) |
| Auditoría del scaffold: persistencia, red, service worker (con pruebas) | 5 Seguridad | ✅ 21-oct (`docs/SECURITY-AUDIT.md`) |
| Correcciones S-02/S-03: apagar la cámara al capturar y borrar la foto al detener | 2 Frontend + Noa | ✅ 21-oct (aplicadas al integrar) |
| Corrección S-01 (ALTA): aviso de que Web Speech puede procesar voz/texto con el proveedor del navegador; preferir voces locales; ASR/TTS del Dock al integrar | 5 Seguridad + 2 Frontend | ✅ 22-oct (mitigada: aviso `#voiceNote` + `pickSpanishVoice` localService + enganche `VOICE_BACKEND`; cierre total cuando el Dock dé ASR/TTS — verificado por Noa: node --check + QA 15/15) |
| Correcciones menores S-04/S-05/S-06 (revalidación de caché, microcopy de precisión de ubicación, limpieza de cachés propias) | 5 Seguridad + 2 Frontend | ✅ 22-oct (network-first en `sw.js` v2 + aviso de actualización; precisión ~11 m declarada; purga solo de cachés `noa-guardian-`) |
| Plan B de la demo: versión grabada si el vivo falla (`docs/DEMO-PLAN-B.md`) | 7 Demo + Noa | ✅ 21-oct |
| Diseño del Guardian Dock (`docs/DOCK.md`): servicios, compose, red, montaje Día 1 | 1 Arquitecto + Noa | ✅ 21-oct |
| **Dock v1 construido** (adelanto del sprint por orden de WD): gateway Node sin dependencias en `dock/` — `GET /alerts` (NWS+USGS+NASA EONET normalizadas, caché 120 s, fallo por fuente declarado), `POST /ask` citizen extractivo determinista sobre `corpus/` (solo piezas §3 con vigencia verificada; sin cobertura → «no cubierto», jamás inventa), `GET /health`, `POST /see` stub 501 (SAM 3.1 = Día 2) | 1 Arquitecto + 3 Integración (ejecuta laboratorio) | ✅ 22-oct |
| PWA conectada al Dock: `askGuardian` y alertas consumen el Dock tras los contratos §1/§2; el mock queda SOLO como respaldo cuando el Dock no responde o devuelve 501, **etiquetado en la UI** (`#answerSource`); respaldo de alertas = NWS directo etiquetado | 2 Frontend | ✅ 22-oct |
| QA del Dock: `tests/run-dock.mjs` (D1–D10: health, contrato de alertas, ask con cita § 5703 / § 250.512 / HICPA, ask no cubierto, 501s, integración PWA) | 6 QA | ✅ 22-oct (estructural 15/15 + Dock **10/10**) |
| Dock desplegado en la mini (Docker Compose en `~/noa-guardian-dock/`, puerto 8080, `restart: unless-stopped`) y verificado desde la mini en su IP LAN y Tailscale — /health y /alerts reales (Freeze Watch del NWS). Desde la VM de Noa el HTTP directo a la tailnet está bloqueado por el proxy del entorno (el puerto 8901 de la Central falla igual): limitación del entorno, no del Dock | 3 Integración | ✅ 22-oct |
| Textos de visibilidad (ficha, Discord, avances) — borradores en espera del OK de WD | 7 Demo + Noa | ✅ 21-oct |
| Crear repo público `wd809/noa-guardian` y empujar | Noa | 🔄 repo CREADO por WD el 26-oct (público, vacío, descripción oficial) · higiene pasada (IPs de la red de WD retiradas de docs, sin secretos) · README vitrina en inglés + LICENSE MIT · commit local listo en `main` (59 archivos) · **push pendiente: falta credencial de GitHub (token) por la vía segura — decisión de WD** |

## Sprint (26 oct – 4 nov)
**Calendario de WD (blindado):** clase los martes 8:00–11:00 p. m. ET (27-oct y 3-nov: sin entregas para veredicto esas horas) · tarea con entrega los lunes (26-oct y 2-nov llegan cargados: solo lo esencial) · trabajo conjunto de noche; veredictos asíncronos por chat.
| Día | Tarea | Rol | Estado |
|---|---|---|---|
| 1 | Reclamar $150 ✅ · método de pago ✅ (26-oct) · verificar Muse Spark ✅ (chat texto e imagen reales, 200) y SAM 3.1 ✅ listado en la cuenta (la llamada de segmentación es del Día 2), «hola mundo» multimodal ✅ | 3 Integración | ✅ 26-oct (`docs/REPORTE-DIA-1.md`) |
| 1 | Reporte Día 1: disponibilidad real, latencia, costo/llamada | 3 Integración | ✅ 26-oct (`docs/REPORTE-DIA-1.md` + `docs/BUDGET-LOG.md`) |
| 2 | Awareness real: foto → descripción + riesgos (`/see` con SAM 3.1) **con el endurecimiento del Dock**: emparejamiento/auth, límites de solicitudes y de tamaño de imagen, tope de gasto impuesto, claves solo en el servidor — ver `docs/SECURITY-HARDENING.md` §3 | 3 + 2 + 5 | ⬜ |
| 2 | Primera corrida del banco (Awareness) | 6 QA | ⬜ |
| 3 | Loop de voz manos libres completo | 2 Frontend | ⬜ |
| 4 | Citizen real: RAG sobre el corpus con citas verificables — **base ya construida (22-oct)**: el Dock recupera y cita de forma extractiva; el Día 4 añade SOLO la redacción con Muse Spark SOBRE esos fragmentos. **Adelantado y cerrado el 22-oct:** verificación fina de FLSA §§ 206/207 en el PDF del Título 29 ✔ (**C7 cerrada al 100%**) + re-verificación C8 del Día 4 ✔ (16/16 piezas; PL 119-122..124 evaluadas sin efecto sobre lo citado) + banco de 15 corrido contra el Dock (Citizen 8/8; detalle en `docs/CORPUS-COVERAGE.md` §5) | 4 + 3 | 🔄 base v1 ✅ 22-oct · FLSA/C8 ✔ 22-oct |
| 4 | Verificación cita-por-cita de respuestas | 6 QA + 4 | ⬜ |
| 5 | Guardian completo: ubicación + alertas + panel | 2 + 3 | ⬜ |
| 5 | Auditoría de privacidad de hito | 5 Seguridad | ⬜ |
| 6 | Integración: cambio de modos por voz, flujo de sesión único | 2 + 1 | ⬜ |
| 7 | Endurecimiento: guardarraíles, errores, privacidad — firma de auditoría + **suite adversarial** (acceso no autorizado, instrucciones maliciosas frente a la cámara, escaneo de claves, caída del Dock, agotamiento de presupuesto) y estados visibles conectado/vencido/sin cobertura/simulación — `docs/SECURITY-HARDENING.md` §§4–5 | 5 + todos | ⬜ |
| 8 | Pruebas de campo: banco completo en el teléfono de WD | 6 QA | ⬜ |
| 9 | Video demo (3 min) + paquete de envío | 7 Demo | ⬜ |
| 10 | **Envío antes del mediodía ET** | Noa + WD | ⬜ |

## Tareas sueltas del sprint
| Tarea | Quién | Estado |
|---|---|---|
| Dejar «bien chulo» el perfil de GitHub de WD (foto, bio, vitrina) — «como hicimos con el otro» | WD + Noa | ✅ 26-oct (verificado por API: foto, nombre, Seal of Trust Services LLC, Reading PA, sealoftrustservices.com) · bio ajustada a 160 caracteres y verificada completa el mismo día · **firma pública = «WD»** (decisión de WD el 26-oct: su nombre legal NO va en el repo público; retirado de LICENSE, README y AGENTS.md) |
| Aceptar las Official Rules en Cerebral Valley | **WD** | ⬜ sin confirmar — publicado el 25-oct en la página del evento |
| Créditos de socios: Baseten $100 (formulario en #baseten) · Modal y Fireworks sin formulario visible aún | **WD** llena · Noa vigila | ⬜ |
| Centinela cibernético (cuarto modo): ¿stretch o Fase 2? | **WD** decide | ⬜ sin prisa |
| Documento maestro del proyecto integrado (`docs/PROJECT-MASTER.md` v0.1, de WD vía ChatGPT) — firma ajustada a «WD» según su regla | Noa | ✅ 26-oct |
| Origen de incidentes de despacho (CrimeRadar / Broadcastify / puente Android): comparación formal por acceso, costo, cobertura y plazo — **en evaluación**; no es capacidad actual ni se anuncia como tal (los reportes de despacho se distinguen siempre de las alertas oficiales) | Noa | ⬜ |
| Alineación README ↔ contrato de roles (revisión externa 26-oct): una sola NOA que interpreta y el Dock que aplica permisos · capacidades marcadas por evidencia · «full QA» sustituido por las suites enumeradas · Tailscale explícito · «constitución» → contrato operativo versionado · protección de controles en el contrato del laboratorio | Noa | ✅ 26-oct |
| **Separación laboratorio ↔ hackathon (decisión de WD)**: contrato operativo y fichas de rol fuera del repo público (viven en su laboratorio permanente, `~/workspace/laboratorio-noa/`, con el historial git completo respaldado en dos copias); el repo presenta una sola agente directora (Noa) y arranca con historial limpio de un commit; documento maestro actualizado a v0.2 | Noa | ✅ 26-oct |
| **Cinco correcciones de la revisión externa con reproducción (26-oct)**: ① token de emparejamiento en el Dock (`DOCK_TOKEN`/`X-Dock-Token`; activación al redesplegar la mini, Día 2) ② service worker cachea SOLO la cáscara listada ③ Guardian declara fuentes caídas con cero eventos y excluye alertas vencidas ④ Citizen con puerta de jurisdicción (otro estado nombrado → no responde con ley de PA) ⑤ `/ask` guardian lleva la ubicación del usuario | Noa | ✅ 26-oct — regresiones G9/G10/G11 + D11/D12/D13; suites 15/15 · 11/11 · 13/13 |
| **Bucle de contención anti-inyección (plan de WD, 27-oct)**: detección de señales en el Dock → sesión contenida en el repertorio seguro con retardos progresivos (tarpit) → bloqueo tras 3 marcas; sin contraataque; el modelo nunca tiene permisos (invariante) — diseño en `docs/SECURITY-HARDENING.md` §6 | Noa + WD | ✅ Diseñado 27-oct e **implementado en la Etapa B** (gateway Nest, módulo `containment/`); la parte de salidas del modelo llega en la Etapa D; regresión en la suite del Dock (26/26) |
| Revisión externa del README (26-oct): 5 puntos de endurecimiento aceptados y README corregido (privacidad híbrida declarada, localhost corregido, regla Citizen verificable, agentes build-only) | Noa | ✅ 26-oct — plan en `docs/SECURITY-HARDENING.md`; decisión de WD confirmada el 26-oct (ADR-013): los agentes solo construyen/prueban; en uso, NOA ejecuta solo operaciones fijas |

**Lo que queda para el sprint (tras el adelanto del Dock v1, 22-oct):** integración Meta Model API el Día 1 (verificar Muse Spark y SAM 3.1, «hola mundo» multimodal, registro en BUDGET-LOG) · `/see` real con SAM 3.1 el Día 2 (sustituye el stub 501) · modos guardian/awareness en `/ask` vía servicio `brain` (sustituyen el 501; el banco cazó ahí el fallo de composición de G5: el modo guardian debe componer también la parte legal del corpus) · Citizen con redacción Muse Spark sobre los fragmentos del Dock (Día 4; la verificación FLSA §§ 206/207 y la pasada C8 del Día 4 ya quedaron **cerradas el 22-oct**, ver `docs/CORPUS-COVERAGE.md` §5) · re-verificación C8 del **Día 9** (la del Día 4 ya se ejecutó) · ASR/TTS locales del Dock (cierre total de S-01).

## Migración Angular + NestJS — Etapas A–E (prompt de arquitectura v1.1 de WD, 27-oct)
| Etapa | Alcance | Estado |
|---|---|---|
| A — Base y compatibilidad | Andamiajes oficiales Angular 22 + NestJS 12, módulos-shell (config, sesión/auth, guardian, citizen, awareness, proveedores, presupuesto, observabilidad), `GET /health`, `packages/contracts` (solo tipos), `.env.example`, raíz npm workspaces sin CLIs, placeholders web honestos con rutas diferidas | ✅ **Verificada 27-oct-2026** por Noa: instalación limpia (npm 11, sin `--legacy-peer-deps`), contracts `tsc` estricto ✔, builds web + dock ✔, Dock arranca y `/health` responde el contrato, unitarios web 2/2 · dock 1/1, legado intacto y suites **15/15 · 11/11 · 13/13** |
| B — Dock protegido y Guardian: guardia de token global (solo /health público), config por entorno, fuentes oficiales (NWS/USGS/EONET) con caché de 120 s y fallos declarados, `GET /alerts` y `POST /ask` guardian portados del legado, citizen 501 (Etapa C) y awareness/`/see` 501 (Etapa D); **bucle de contención §6 implementado** (detección por puntuación, tarpit 1.5 s/6 s, bloqueo a la 3.ª marca, reactivación del propietario con token, eventos mínimos sin contenido) | Noa | ✅ 27-oct — verificado: Dock 26/26 pruebas, build raíz en verde, humo en vivo con las 3 fuentes reales, legado intacto 15/15 · 11/11 · 13/13 |
| C — Citizen en Nest + oleada 1 del corpus | Porte fiel del motor Citizen al gateway Nest (`citizen/`: corpus §3 en memoria, recuperación extractiva, cobertura sobre conceptos atestiguados, puerta de jurisdicción, caso C8, abstención declarada) conectado en `POST /ask`; `/health` reporta el corpus. **Oleada 1 desde la biblioteca oficial de WD (Drive):** pieza nueva del Título 8 (INA §§ 1182, 1227, 1304, 1324a, 1423, 1427) y secciones nuevas en los Títulos 18 (§§ 242, 1001, 922(g), 3501) y 42 (§§ 423(d), 1382(a), 1395c), verificadas frase por frase contra el HTM oficial al RP PL 119-134 (20/20 idénticas) | Noa | ✅ 27-oct — verificado: Dock 33/33 pruebas (7 nuevas de Citizen), batería conductual de 9 preguntas reales 9/9 en la sección correcta, build raíz en verde, legado intacto 15/15 · 11/11 · 13/13 |
| C-bis (oleada 2) — Los derechos del ciudadano ante la policía | Pieza de la Constitución (Enm. I, II, IV, V, VI, XIV) + § 1983 verificados; brújula de WD para Citizen; ajustes de recuperación: preámbulo sin voto de encabezado, desempate por cobertura, sinónimos del encuentro | ✅ 27-oct — batería 6/6 oleada + 9/9 regresión en vivo; corpus 18 piezas/115 fragmentos; Dock 33/33, legado 15/15 · 11/11 · 13/13 |
| C-ter (oleada 3) — Crédito y deudas | Pieza del Título 15 completada: FCRA (§§ 1681c/g/i/m) + FDCPA (§§ 1692c/d/e/f/g) verificados al RP PL 119-134 (17/17); decisión de WD tras su estudio de demanda | ✅ 27-oct — batería 6/6 oleada + 5/5 regresión cruzada en vivo; corpus 18 piezas/124 fragmentos; Dock 33/33, legado 15/15 · 11/11 · 13/13 |
| D — Proveedores, presupuesto y Awareness | Proveedores local/Meta/mock, contador transaccional SQLite con reservas, voz (ASR) y SAM 3.1 tras confirmar endpoint/formato/costo, salidas del modelo como dato no confiable | ⬜ |
| E — Recorrido completo | Playwright, teléfono real de WD, auditoría independiente final con Muse Spark 1.3 (tope fijado; hallazgos no se aplican sin verificar) | ⬜ |

## Decisiones abiertas para WD (sin prisa)
- Marca del repo/README: ¿solo NOA o también Seal of Trust?
- Escenarios reales de su negocio para las pruebas de campo (más auténticos en video).
