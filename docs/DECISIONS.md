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

## ADR-019 — Oleada 3 por evidencia de demanda: crédito y deudas (2026-10-27)

**Contexto.** WD encargó fuera un estudio de demanda (Top 20 con fuentes oficiales: AOPC, CFPB, LSC, BJS) antes de decidir la siguiente oleada — la primera vez que el orden del corpus lo fija evidencia externa y no intuición. El estudio ubicó crédito y deudas en los puestos #2 y #3 (5.8 M de reclamaciones de crédito y ~387 mil de cobro ante el CFPB en 2025) y confirmó el límite de diseño de Citizen: lo práctico policial es jurisprudencia y no se disfraza de estatuto.

**Decisión.** La oleada 3 completa la pieza del Título 15 con FCRA (§§ 1681c, 1681g, 1681i, 1681m) y FDCPA (§§ 1692c, 1692d, 1692e, 1692f, 1692g), desde la biblioteca oficial de WD y con contraste al release point vigente PL 119-134 (17/17 frases). Se declara el alcance de la FDCPA (cobrador profesional, § 1692a(6)) en la propia pieza. Candidatas siguientes según el cruce estudio↔corpus (sin decidir): apelaciones de beneficios, tránsito práctico, familia.

**Consecuencia.** Citizen cubre hoy el dinero cotidiano con cita verificada: disputar el reporte, saber cuánto dura lo adverso, exigir la validación de una deuda y frenar el acoso del cobrador — batería 6/6 en vivo sin regresiones en las oleadas 1 y 2.

## ADR-020 — Etapa D, entrega parcial 1: fuentes que se declaran y puerta que se respeta (2026-10-29)

**Contexto.** WD aprobó el plan de Muse Spark 1.2 (con el anexo de correcciones de Noa) y ordenó ponerlo a trabajar. Spark intentó redactar el código de esta entrega, pero su canal (la Meta Model API vía el helper, con tope fijo de 1500 tokens por llamada) truncó los archivos: el razonamiento consumió el presupuesto y el código llegó incompleto o vacío en 3 llamadas (~$0.02). La división de trabajo quedó: Spark diseña (su plan), Noa implementa y verifica — la que WD definió desde el principio.

**Decisión.** (1) **D2:** circuit breaker por fuente oficial (3 fallos consecutivos → circuito abierto 5 min; intento de prueba al vencer) en `providers/circuit-breaker.ts`, integrado en el proveedor sin cambiar el contrato de éxito; `GET /health/sources` (público, como /health) expone estado por fuente; Guardian añade la frase explícita de degradación («Fuente NWS no disponible (hace X min): no puedo verificar el clima severo…») cuando una fuente tiene el circuito abierto. Contratos extendidos SOLO aditivamente (`FuenteEstado.circuitOpen/minutesSinceOk`, `FuenteSalud`, `FuentesSaludRespuesta`). (2) **D3:** guardia preventiva `AbusePreventionGuard` ANTES de la de token: ritmo por IP y clase de ruta (/alerts 30/min, /ask 15/min, resto 60/min) y bloqueo de 15 min tras 5 tokens fallidos en 60 s (la guardia de token alimenta el contador en cada 401); cabeceras de seguridad mínimas hechas a mano en `main.ts`, sin dependencias nuevas. No sustituye a la contención §6: es capa previa, por IP; la §6 sigue por sesión. (3) **D4:** la puerta de SAM 3.1 queda documentada en `docs/SAM-VERIFICATION-GATE.md` — existencia y costo oficiales confirmados ($2.50/1k imágenes, $0.20/1k fotogramas); el endpoint exacto aún no consta en la documentación oficial accesible, así que **no se hizo ninguna llamada** a SAM.

**Consecuencia.** El Dock pasa de 33 a **41/41 pruebas** (8 nuevas: breaker y anti-abuso) y el humo en vivo confirma: `/health/sources` responde, las cabeceras salen, y el 6.º token malo recibe 429. Pendientes de la Etapa D: D1 (piel v4 en Angular con semáforo de fuentes), D5 (contrato del puente v1), D6 (`POST /see` con Spark) y el contador transaccional.

## ADR-021 — PennDOT RCRS: la cuarta fuente oficial entra en espera declarada (2026-10-29)

**Contexto.** WD trajo dos enlaces la misma mañana: Broadcastify (verificado: sus Términos §9 prohíben acceso programático y cualquier uso con IA sin licencia comercial — fuera del sprint; su Calls API queda como ruta comercial futura) y la documentación para desarrolladores de **PennDOT**. El servicio **RCRS Event Data** (los datos de 511PA) es gratuito, sin límites de peticiones, y su documentación da el contrato completo: `GET https://eventsdata.dot.pa.gov/liveEvents` con Basic Auth (credenciales PDAuth que PennDOT emite tras un formulario de solicitud) y respuesta `{Values: [...]}` con coordenadas exactas, tipo, banderas de fatalidad/hazmat y hora de verificación.

**Decisión.** Integrar PennDOT como cuarta fuente oficial del Dock **ahora**, en modo «esperando credenciales»: proveedor propio (`providers/penndot-feeds.provider.ts`) con el mapeo documentado en su cabecera (radio 50 km, reabiertos excluidos, severidad por banderas), estado `notConfigured` aditivo en los contratos (la fuente en trámite NO es una fuente caída: Guardian la anota como trámite y no la cuenta en los fallos ni en el «no despejado»), y credenciales solo por entorno. WD envía el formulario de solicitud (texto de uso redactado en registro humano, por su regla del 2026-10-29); cuando PennDOT responda, la fuente se enciende sin tocar código.

**Consecuencia.** El Dock sube a **46/46 pruebas** (5 nuevas) y el humo en vivo muestra el estado declarado en /health, /health/sources y /alerts. Guardian cubre hoy clima, sismos, eventos naturales y — en cuanto lleguen las credenciales — los incidentes viales oficiales de Pensilvania, la capa de «qué está pasando cerca de ti» que WD buscaba en CrimeRadar, construida solo con fuentes que nos lo permiten.

## ADR-022 — D1: la piel v4 vive en Angular con el orbe de estados de Spark (2026-10-29)

**Contexto.** La Etapa D pedía portar la piel v4 aprobada (orbe de voz + mapa real) a `apps/web` con un orbe de estados y un semáforo de fuentes alimentado por `GET /health/sources`. WD ordenó el 2026-10-29 ejecutar las tareas restantes **con el modelo** («usa el modelo para que haga las tareas restantes; para eso nos dieron los $150»): el diseño lo firmó **Muse Spark 1.3** en dos llamadas de la Meta Model API (≈ $0.014 en total; una tercera llamada fue filtrada por política de contenido con un falso positivo y se reformuló), y Noa lo integró y verificó.

**Decisión.** (1) El orbe tiene exactamente 4 estados con precedencia **gris > rojo > ámbar > verde**: gris = Dock inalcanzable (jamás se pinta un dato viejo como vivo); rojo = alerta oficial activa (cualquier severidad; la severidad solo modula texto y pulso); ámbar = algo sin verificar (fuente configurada degradada/caída **o** alertas no consultadas por falta de emparejamiento); verde = calma **verificada** (sin alertas y toda fuente configurada en `ok`). Las fuentes `not_configured` no cuentan ni a favor ni en contra. (2) El semáforo ordena caída → degradada → en vivo → no conectada, siempre con etiqueta textual además del color, y la edad del dato visible; el error crudo nunca es titular. (3) Sondeo: fuentes cada 30 s, alertas cada 120 s, pausado con la pestaña oculta. (4) La lógica vive en una función pura (`apps/web/src/app/core/orb-state.ts`) con su batería; la vista Guardian lleva la piel oscura v4 como fondo propio. El emparejamiento puede llegar por enlace (`?dock=` / `?token=`), patrón que D5 reutiliza.

**Consecuencia.** Verificado: build web en verde, **web 10/10 pruebas** (8 nuevas del orbe, incluido el ámbar con fuente caída forzada y la precedencia rojo-sobre-ámbar), y humo en vivo contra el Dock real con capturas de escritorio/móvil y del estado sin conexión (orbe gris + aviso declarado) en `~/workspace/noa-guardian-assets/d1-captures/`. Quedan de la Etapa D: D5 (contrato del puente) y D6 (`POST /see`), también con diseño de Spark por orden de WD.

## ADR-023 — D5: el puente teléfono ↔ Dock con el sobre v1 de Spark (2026-10-29)

**Contexto.** La Etapa D pedía el contrato del puente entre el teléfono (sustituto de los lentes) y el Dock: payloads v1 validados y latido con confirmación. Por orden de WD, el diseño lo firmó **Muse Spark 1.3** en tres llamadas de la Meta Model API (≈ $0.017): sobre común `{v, msgId, type, deviceId, ts, payload}`, tipos `heartbeat` / `ask` / `alerts_poll` con respuestas `heartbeat_ack` / `answer` / `alerts_data`, validación con error declarado `400 {code: INVALID_MESSAGE, details[]}`, latido de 30 s con `stale` a los 90 s y `gone` a los 300 s, y versionado estrictamente aditivo dentro de la v1.

**Decisión.** Implementado en `apps/dock/src/bridge/` con tres adaptaciones documentadas: (1) la ruta es `POST /bridge/messages` tras la guardia global de token existente — no se crea un segundo esquema de autenticación Bearer; (2) no hay registro previo de dispositivos: el token de emparejamiento es la puerta y un `deviceId` con forma válida queda registrado en su primer latido (el Dock es de un solo hogar); (3) `ask` y `alerts_poll` se resuelven con el mismo cerebro que las rutas directas (GuardianService y el proveedor oficial) — el puente es transporte, no un segundo cerebro. La idempotencia se cumple con un conjunto acotado de msgId por dispositivo (duplicado → `409 DUPLICATE_MESSAGE`). `GET /bridge/devices` expone el registro con su estado calculado.

**Consecuencia.** Verificado: build en verde, **Dock 61/61 pruebas** (15 nuevas del puente) y humo en vivo completo — sin token 401, latido con ack `active`, duplicado 409, payload inválido 400 con detalle por campo, `alerts_poll` con datos reales y el dispositivo visible como activo. Queda de la Etapa D solo D6 (`POST /see`).

## ADR-024 — D6: POST /see con la visión de Spark y su salida como dato no confiable (2026-10-29)

**Contexto.** Awareness necesitaba ojos: `POST /see` llevaba desde la Etapa B como stub declarado 501. El plan oficial (Spark 1.2 + correcciones de Noa) fijó D6 como visión con Spark, con la fuente «modelo» declarada y sin identidades. Por orden de WD, el diseño de D6 también es de **Muse Spark 1.3** (2 llamadas, ≈ $0.011): escribió el prompt del sistema (109 palabras: ambientación en una frase, peligros primero con distancias estimadas, textos legibles verbatim, personas SOLO como presencia/conteo/posición — jamás identificar ni adivinar identidad, relación, edad, género o emoción —, nada de documentos ni pantallas privadas en detalle, incertidumbre declarada, cero órdenes de navegación) y el esquema JSON exacto de salida, más las 3 reglas de tratamiento de la salida como dato no confiable.

**Decisión.** `POST /see` implementado en `apps/dock/src/awareness/`: valida la imagen (data URI jpeg/png/webp ≤ 5 MB), llama a la Meta Model API (`muse-spark-1.3`, llave solo por entorno `META_MODEL_API_KEY`) y somete la salida a `parseSeeOutput`: esquema estricto (se descarta entera si no cumple), saneado de marcas/controles y truncado antes de cualquier TTS. Estados declarados: sin llave → **501 `not_configured`**; API caída → **502 `vision_unavailable`**; salida inválida → **502 `vision_output_invalid`** sin filtrar contenido del modelo. La imagen no se almacena: vive solo en la petición. La respuesta lleva `source: 'model'` y el uso con costo a tarifas Standard publicadas.

**Consecuencia.** Verificado: build en verde, **Dock 72/72 pruebas** (11 nuevas de D6 + la de integración actualizada al nuevo contrato) y humo en vivo (401 sin token, 501 declarado sin llave, 400 con imagen inválida). La llamada real al modelo desde el Dock queda pendiente de que WD ponga su llave en el entorno del Dock en su red — el mismo modelo y formato ya están probados en vivo vía el conector (2026-10-26 y hoy). **Con D6, las seis piezas numeradas de la Etapa D del plan aprobado quedan cerradas.** Residuales de la fila D fuera de las piezas numeradas: el contador transaccional SQLite y el ASR de voz.
