# DECISIONS.md — Registro de decisiones de arquitectura (ADR)
NOA Guardian · Rol responsable: Arquitecto de Sistema · Toda decisión lleva fecha 2026-10-21 salvo que se indique otra. Cambiar una decisión = nueva entrada que la supersede, nunca editar la historia. Cambiar un contrato asociado requiere aprobación del Arquitecto (ver `docs/CONTRACTS.md`).

---

## ADR-001 — Sin paso de build: PWA vanilla sin dependencias
- **Decisión:** El cliente es una PWA en HTML/CSS/JS vanilla (`index.html`, `styles.css`, `app.js`, `sw.js`), sin framework, sin bundler y sin dependencias externas.
- **Contexto:** Sprint de 10 días, un solo desarrollador con equipo de agentes, y la exigencia de propiedad/portabilidad de WD (AGENTS.md, regla dura 6). Cada dependencia es costo de mantenimiento y un posible punto de quiebre el día de la demo.
- **Consecuencia:** Se corre con un servidor estático cualquiera (`python3 -m http.server`); cero toolchain que romper. El costo aceptado: sin tipado ni componentes — se compensa con contratos estrictos (`docs/CONTRACTS.md`) y revisión de QA.

## ADR-002 — Contratos v1 como interfaz única entre roles
- **Decisión:** `docs/CONTRACTS.md` es la única interfaz entre componentes y roles (`askGuardian`, `getOfficialAlerts`, formato de corpus, registro de presupuesto, formato de entrega). Hasta el Día 1 (26-oct) todo rol programa contra **mocks que devuelven exactamente esas formas**.
- **Contexto:** Siete roles trabajando en paralelo sin la API real disponible hasta el kickoff; sin contratos, cada integración sería una renegociación.
- **Consecuencia:** El Día 1 se sustituye el mock por la integración real sin cambiar interfaces. Todo cambio de contrato pasa por el Arquitecto y se avisa a los roles consumidores.

## ADR-003 — Arquitectura Guardian Dock: el cerebro vive en Docker, en casa de WD
- **Decisión:** Los lentes (simulados con el teléfono) quedan livianos — ojos, oídos, voz — y el procesamiento pesado corre en el **Guardian Dock**: servicios Docker en la red de WD, diseño en `docs/DOCK.md`. La **Meta Model API es la protagonista de la demo** (Muse Spark: razonamiento/multimodal; SAM 3.1: segmentación); el LLM local (Ollama) es solo respaldo y modo privado.
- **Contexto:** El criterio «Uso de herramientas Meta AI» vale 25% de la puntuación, y a la vez la privacidad y la propiedad total son diferenciadores del proyecto. Meta no ofrece runtime Docker en los lentes; la app vive en el teléfono y el procesamiento puede ser local o en servicios conectados.
- **Consecuencia:** Una sola puerta (`gateway`) hacia el teléfono; en casa por Wi-Fi/LAN, fuera por Tailscale, con modo «calle» reducido sin Dock. Latencia de red y dependencia del túnel son riesgos aceptados y medidos desde el Día 1.

## ADR-004 — Fuentes oficiales únicamente
- **Decisión:** Alertas solo de fuentes oficiales — **NWS** (api.weather.gov), **USGS** (sismos) y **NASA EONET** (eventos naturales) — y Citizen responde solo desde corpus legal oficial con `vigencia_verificada` (federal: U.S. Code, release point PL 119-121; Pensilvania: textos oficiales estatales), según el formato de `docs/CONTRACTS.md` §3.
- **Contexto:** La credibilidad es el producto: una alerta o una ley inventada destruyen el proyecto y pueden dañar a un usuario. El criterio de Impacto (30%) se sostiene en datos verificables.
- **Consecuencia:** Cobertura limitada a lo que las fuentes oficiales publican — se acepta. Sin vigencia verificada reciente, un documento del corpus no se usa para responder; si el corpus no cubre la pregunta, el sistema lo declara (regla dura 3).

## ADR-005 — Infraestructura de despacho propia: nada de Broadcastify programático
- **Decisión:** El motor de despacho (Guardian Mode) es infraestructura propia: ingesta → transcripción → extracción → incidente. **No se accede a Broadcastify por vía programática ni se usa su audio para IA**: sus términos exigen licencia comercial para eso y no licencian nuevas apps de escáner. El prototipo trabaja con **audio de despacho archivado bajo licencia Creative Commons**; la vía de independencia futura es un receptor SDR propio.
- **Contexto:** Clonar las *funciones* de las apps de alertas existentes es legítimo; clonar su fuente de datos sin permiso violaría los términos del proveedor y pondría el proyecto sobre un permiso inexistente (además: trabajo original y propio, regla del hackathon).
- **Consecuencia:** El prototipo no depende de ningún feed en vivo de terceros; el alcance de la demo se limita a incidentes reproducibles desde archivo, con procedencia y nivel de confianza declarados.

## ADR-006 — Honestidad de demo y efimeridad radical
- **Decisión:** Todo dato simulado se etiqueta en origen: las respuestas mock llevan `source: "mock"` (contrato §1) y la UI/el video lo declaran. **Nada se almacena del usuario**: fotos, audio y ubicación viven solo en la sesión y se borran; sin cuentas, sin rastreo, sin bases de datos de usuarios en el prototipo; el service worker nunca cachea datos del usuario.
- **Contexto:** Reglas duras 2 y 7 de AGENTS.md. La privacidad efímera es el diferenciador frente a las apps de alertas que retienen geolocalización precisa y comparten datos con terceros.
- **Consecuencia:** No hay historial ni personalización persistente en el prototipo — se acepta; la memoria asistida del «círculo íntimo» (por contexto y confirmación del usuario, sin biometría) queda como diseño futuro, fuera del sprint.

## ADR-007 — El teléfono simula los lentes *(fuente: `README.md`)*
- **Decisión:** La experiencia de los lentes se simula con el teléfono: cámara en primera persona y voz de entrada/salida, de modo que el loop completo sea demostrable de punta a punta sin hardware de lentes.
- **Contexto:** WD no dispone de lentes Meta para el sprint; el prototipo no puede depender de hardware que no existe en el laboratorio.
- **Consecuencia:** La demo se graba en POV de teléfono; las decisiones de UI deben mantenerse compatibles con una futura superficie de lentes (voz primero, pantalla mínima).

## ADR-008 — El peligro se define por zona y comportamiento, nunca por identidad *(fuente: `README.md`)*
- **Decisión:** Guardian evalúa riesgo por zona, contexto y comportamiento. Rostros de terceros: solo detección para difuminar; jamás identificación (regla dura 1).
- **Contexto:** Identificar personas por la cara viola leyes de biometría en varias jurisdicciones y las reglas de la plataforma; además es innecesario para el valor del producto.
- **Consecuencia:** Ningún componente puede introducir reconocimiento facial ni bases de datos de personas; los incidentes se ubican de forma aproximada (cuadra/intersección), con categorías sensibles suprimidas o reducidas a zona.

## ADR-009 — Plan B de visión: si SAM 3.1 no está disponible, solo Muse Spark *(fuente: `README.md`, sección Arquitectura; `docs/ROADMAP.md`, Día 1)*
- **Decisión:** Awareness se verifica el Día 1 contra SAM 3.1 vía Meta Model API; si el acceso no está disponible, la descripción de escena y riesgos la hace únicamente la visión de Muse Spark, sin cambiar el contrato `askGuardian`.
- **Contexto:** El acceso real a cada modelo solo se confirma en el kickoff con los créditos del evento; el sprint no puede bloquearse en una sola capacidad.
- **Consecuencia:** La segmentación por objetos puede degradar a descripción multimodal; la demo sigue siendo válida y el cambio es interno al rol 3.

## ADR-010 — Citizen es orientación informativa, no asesoría legal *(fuente: `README.md`)*
- **Decisión:** Citizen explica leyes, derechos y responsabilidades con citas y jurisdicción, e incluye auto-cumplimiento (avisar al usuario qué puede estar incumpliendo él), pero se presenta siempre como orientación informativa — nunca como asesoría legal ni sustituto de un abogado.
- **Contexto:** Frontera legal y de confianza del producto; la ruta comercial hacia abogados (profesional legal) depende de mantener esta línea limpia desde el prototipo.
- **Consecuencia:** Toda respuesta del modo Citizen lleva cita verificable y, cuando aplica, la derivación a la fuente oficial o a un profesional.

## ADR-011 — Presupuesto de créditos: iterar barato, reservar el modelo mayor *(fuente: `docs/ROADMAP.md`, «Presupuesto de créditos»; `docs/CONTRACTS.md` §4)*
- **Decisión:** De los $150 de créditos del evento, la iteración diaria usa el modelo rápido/barato y el modelo mayor se reserva para pruebas finales y demo. Meta del sprint: prototipo completo por debajo de **$60**, con cada llamada registrada en `docs/BUDGET-LOG.md`.
- **Contexto:** Los créditos son finitos y el gasto es decisión de WD (regla dura 5); sin disciplina, la exploración consume el presupuesto antes de la demo.
- **Consecuencia:** Si el gasto proyectado supera $60 antes del Día 8, Integración lo escala a Noa el mismo día.

## ADR-012 — Ruta comercial por niveles, fuera del alcance del sprint *(fuente: `docs/ROADMAP.md`, «Ruta comercial»)*
- **Decisión:** El orden comercial post-hackathon es: (1) ciudadano — «El ciudadano ejemplar», marca y volumen; (2) profesional legal para abogados, por suscripción, con confidencialidad por diseño; (3) institucional, ciclo largo y regulado. La línea de no identificar personas por la cara se mantiene en los tres niveles.
- **Contexto:** El hackathon premia impacto y un camino creíble a producto real; el prototipo debe nacer compatible con esa ruta sin construirla todavía.
- **Consecuencia:** Ningún nivel comercial entra en el alcance del sprint de 10 días; cualquier decisión del prototipo que cierre una de estas rutas (p. ej. almacenar datos de usuarios «para monetizar») queda rechazada por defecto.
## ADR-013 — Los agentes solo construyen y prueban; en uso, NOA no tiene agentes *(decisión de WD, 26-oct-2026)*
- **Decisión:** Los 7 especialistas del laboratorio existen solo para construir y probar Guardian. Cuando una persona usa NOA, ningún agente ejecuta comandos, modifica archivos, administra equipos ni toma decisiones: el runtime es la PWA + el Dock con tres operaciones fijas (consultar alertas oficiales, recuperar fragmentos citados del corpus, analizar una imagen).
- **Contexto:** Una revisión externa del README público (26-oct) preguntó si los agentes también estarían activos durante el uso; WD confirmó la separación el mismo día. Un agente con permisos en tiempo de uso ampliaría la superficie de ataque sin aportar valor al producto.
- **Consecuencia:** Los permisos en ejecución se imponen por código (operaciones concretas y limitadas), no por prompts ni por `AGENTS.md`. Los agentes del laboratorio trabajan aislados, sin credenciales de producción, y todo lo que publican pasa por revisión de WD. Plan asociado: `docs/SECURITY-HARDENING.md` §2.
- **Aclaración (26-oct, revisión de alineación README ↔ contratos):** «sin agentes en uso» se refiere a los especialistas del laboratorio. El asistente NOA en ejecución sí interpreta solicitudes y selecciona entre las herramientas autorizadas; quien aplica los permisos y ejecuta las operaciones delimitadas es el Dock. La decisión no cambia: cambia su redacción para que README, contratos y este registro digan lo mismo.

## ADR-014 — Migración a Angular 22 + NestJS (monolito modular, por etapas) *(decisión de WD, 27-oct-2026)*
- **Decisión:** La PWA vanilla y el Dock Node migran a **Angular 22** (web) y **NestJS 12** (Dock) como monolito modular, con proveedores de IA intercambiables (local Tiiny / Meta / mock) y contador de presupuesto transaccional. La migración es gradual, por **Etapas A–E** del prompt de arquitectura v1.1 de WD; el legado permanece intacto y operativo hasta que cada etapa lo sustituya con regresiones en verde.
- **Contexto:** La base sin build sirvió para la Fase 0 y el Día 1, pero el producto que evalúa un ingeniero (y el jurado) necesita estructura estándar, tipos compartidos y un Dock con módulos claros (sesión, guardian, citizen, awareness, proveedores, presupuesto, observabilidad).
- **Consecuencia:** La Etapa A quedó **verificada el 27-oct-2026** por Noa sobre la base construida en la computadora de WD: instalación limpia, builds estrictos en verde, `GET /health` respondiendo el contrato, `packages/contracts` con solo tipos, legado byte a byte intacto y suites 15/15 · 11/11 · 13/13.

## ADR-015 — npm workspaces como orquestación raíz, sin CLIs en la raíz *(27-oct-2026)*
- **Decisión:** La raíz del monorepo usa **npm workspaces** (`apps/web`, `apps/dock`, `packages/contracts`) solo para orquestar scripts e instalación. Los CLI (`@angular/cli`, `@nestjs/cli`, schematics) y TypeScript viven **dentro de cada app**, con sus versiones propias; la cadena de herramientas del proyecto es **npm 11**.
- **Contexto:** Con los CLI como devDependencies de la raíz, `npm install` fallaba con ERESOLVE y solo pasaba con `--legacy-peer-deps` (la base construida en el Tiiny requirió esa bandera). Sin ellos en la raíz, la instalación es limpia y sin banderas.
- **Consecuencia:** `npm install` en la raíz instala todo el monorepo sin banderas especiales — verificado el 27-oct-2026 (537 paquetes, npm 11).


## ADR-016 — Bucle de contención implementado en el gateway Nest *(27-oct-2026)*
- **Decisión:** El bucle de contención de `docs/SECURITY-HARDENING.md` §6 vive en `apps/dock/src/containment/`: detección determinista por puntuación de señales (anulación, suplantación, extracción, cargas codificadas, sondeo de herramientas) sobre toda cadena no confiable de `POST /ask`; marca silenciosa; tarpit progresivo (1.5 s / 6 s); bloqueo a la 3.ª marca con respuesta mínima (sin oráculo de error); reactivación solo del propietario vía `POST /containment/reactivate` protegido por el token del Dock; eventos mínimos (hora y tipo de señal) en memoria, sin contenido personal.
- **Contexto:** Diseño de WD del 27-oct (plan de contención «hasta fundir el intento»). La Etapa B no llama a ningún modelo: las respuestas deterministas de Guardian SON el repertorio fijo y seguro; la contención protege ya el perímetro real del Dock.
- **Consecuencia:** Suite propia del módulo (detección, bucle, reactivación, aislamiento entre sesiones) dentro de las 26 pruebas del Dock, todas en verde el 27-oct-2026. La extensión a salidas del modelo (Etapa D) reusará este mismo servicio.

## ADR-017 — Citizen en Nest y corpus alimentado desde la biblioteca oficial de WD *(27-oct-2026)*
- **Decisión:** El motor Citizen corre en el gateway Nest (`apps/dock/src/citizen/`) como porte fiel del legado — mismo algoritmo de recuperación, misma puerta de jurisdicción, misma abstención — y el corpus crece por oleadas temáticas desde los PDF oficiales del U.S. Code que WD guarda en su Drive (su «biblioteca maestra», intacta), nunca desde texto sin fuente. Cada fragmento nuevo se contrasta frase por frase contra el HTM oficial de uscode.house.gov al release point vigente antes de marcarse verificado.
- **Contexto:** WD ordenó que Citizen «abarque todo» (abogado en el bolsillo) y aportó su carpeta con el Código completo (Títulos 1–54, ed. 2024, más la Constitución en inglés y español). La oleada 1 cubre los temas de calle: inmigración (T. 8), derechos y delitos federales (T. 18) y beneficios (T. 42). La verificación se hizo por descarga directa de los HTM oficiales al RP PL 119-134 (corte 2026-10-20): 20/20 frases operativas idénticas a los pasajes citados.
- **Consecuencia:** El corpus pasa de 16 a 17 piezas (93 → 107 fragmentos). La tabla de sinónimos ES→EN creció en AMBOS motores (legado y Nest) para mantener la paridad; la batería conductual de 9 preguntas reales y las suites legadas (15/15 · 11/11 · 13/13) son la regresión que protege el ajuste. Las piezas anteriores siguen verificadas a su corte (PL 119-121); su re-verificación al RP 119-134 queda como pasada C8 programada.

## ADR-018 — Oleada 2 del corpus: los derechos del ciudadano ante la policía (2026-10-27)

**Contexto.** WD fijó la brújula del producto: la oleada de migración está bien, pero el corazón de Citizen es defender al ciudadano en el encuentro cotidiano con la autoridad — la parada donde un policía «se quiere pasar de la raya», donde saber la Constitución desactiva el conflicto («nadie quiere entrar en conflicto»; cámara encendida y la ley dicha con calma). Sin ese frente, Citizen cubría al migrante y no al ciudadano de a pie.

**Decisión.**
1. La Constitución entra como **pieza de transcripción** (no compañera): las Enmiendas I, II, IV, V, VI y XIV § 1 verbatim desde el PDF oficial de la biblioteca de WD, contrastadas con senate.gov. Las notas de aplicación práctica se etiquetan como jurisprudencia cuando lo son (grabar a la policía), nunca como texto.
2. **§ 1983** (demanda civil por privación de derechos bajo color de ley) se suma a la pieza del Título 42 desde el HTM oficial al RP PL 119-134.
3. Ajustes de recuperación con evidencia (paridad Nest↔legado): el preámbulo de una pieza no puntúa por su encabezado; los empates se resuelven por cobertura de conceptos; la tabla de sinónimos crece con el vocabulario del encuentro policial y pierde variantes genéricas que disparaban falsos positivos (`states`/`united`).

**Consecuencia.** Citizen responde hoy, con cita verificada, las preguntas del encuentro: silencio (Enm. V), registro del carro (Enm. IV), grabar al policía (Enm. I), abogado (Enm. VI), igual protección (Enm. XIV), demandar al funcionario (§ 1983) — y la migración de la oleada 1 no regresó (batería 15/15 combinada). Lo que la Constitución y los estatutos no fijan (excepciones jurisprudenciales a la orden de registro, deber de identificarse por estado) sigue fuera: Citizen se abstiene antes que inventar.
