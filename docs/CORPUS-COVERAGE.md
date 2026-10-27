# Informe de cobertura del corpus — Citizen / RAG Legal (Rol 4)

Fecha original: 2026-10-21 · **Actualizado: 2026-10-22** (oleada de normalización §3 + cierre de huecos, orden de WD de ejecutar en local) · **Segunda oleada: 2026-10-22** (C4 con estatuto + § 3354(d) íntegro + entradas KB de C5/C6/C7 y cita HICPA en C3) · **Tercera oleada: 2026-10-22** (cierre federal de C7 con verificación fina FLSA §§ 206/207 + pasada C8 completa + banco de 15 situaciones contra el Dock v1 — ver §5).
Alcance: corpus normalizado en `~/workspace/noa-guardian/corpus/` (nuevo) + binarios fuente en `~/workspace/goals/meta-ai-hackathon-2026-aplicaci-n-de-noa-guardian/files/` + KB del scaffold (`app.js`). Sin maquillar: lo que no está, se dice.

---

## 0) Resultado de la oleada 2026-10-22 (resumen ejecutivo)

| Métrica | Antes (2026-10-21) | Tras la 1ª oleada (2026-10-22) | Tras la 2ª oleada (2026-10-22) | Tras la 3ª oleada (2026-10-22) |
|---|---|---|---|---|
| Cumplimiento CONTRACTS §3 (bloque con `vigencia_verificada` dentro de la pieza) | **0 piezas** | **15/15 piezas** (8 PA + 7 federales, en `corpus/`) | **16/16 piezas** (9 PA + 7 federales; nueva: Landlord and Tenant Act) | **16/16** + línea `reverificacion:` (pasada C8) en las 16 |
| Situaciones Citizen con corpus **completo** | 2/8 (C1, C2) | 5/8 (C1, C2, C3, C5, C6) | **6/8** (C1, C2, C3, **C4**, C5, C6) | **7/8** (+ **C7** cerrada a nivel federal) |
| Situaciones Citizen **parciales** | 4/8 (C3, C4, C7, C8) | 3/8 (C4, C7, C8) | 2/8 (C7, C8) | 1/8 (solo C8, que es función de vigencia: su pasada del Día 4 quedó **ejecutada hoy**) |
| **Huecos totales** de corpus | 2/8 (C5, C6) | **0/8** | **0/8** | **0/8** |
| Situaciones Citizen **respondibles** (corpus + entrada KB) | 3/8 (C1, C2, C4) | 3/8 | **7/8** (C1–C7; solo C8 sigue en fallback por diseño) | **7/8** (idem; C8 responde desde metadatos §3 en el Dock) |
| Corpus dentro del repo | No (vivía en la carpeta del goal) | **Sí** (`corpus/pa/`, `corpus/federal/`; binarios referenciados, no copiados) | Sí | Sí |
| Banco de 15 contra el sistema real (Dock v1) | — | — | — | **Corrido hoy (§5): 8 correctas · 6 «no cubierto» declarado · 1 fallo de composición (G5) · 0 fabricaciones** |

Verificación (grep, 2026-10-22): las 16 piezas contienen `vigencia_verificada: 2026-10-22`; Cap. 5 presente completo (§§ 501–510); Wiretap con §§ 5701, 5702, 5703 y 5704; Título 75 accidentes §§ 3741–3748; § 3354(d) transcrito íntegro (sin marcador); Landlord and Tenant Act §§ 511.1–512 íntegros. Detalle en §1 y §2.

**Segunda oleada (2026-10-22) — qué hizo:** (1) pieza estatutaria del Landlord and Tenant Act (`corpus/pa/landlord-tenant-act-deposito.md`, Secciones 511.1/511.2/511.3/512 = 68 P.S. §§ 250.511a–250.512, desde palegis.us) → **C4 completa con estatuto**, la guía OAG queda como apoyo; (2) **§ 3354(d) íntegro** en `75pacs-estacionamiento-y-luces.md` (incisos (d)(1), (d)(2), (d)(2.1), (d)(3), más (d.1), (e), (e.1), (f), (g), (h) según el texto oficial vigente; se corrigieron también (a)–(c) de § 3354, cuya redacción anterior no era la vigente) — la multa de A2 ($50–$200) vive en § 3354(f) y (g), ya transcritos; (3) **entradas KB** en `app.js`: nuevas para C5 (Title 75 §§ 3743–3746), C6 (§§ 505/506, con hueco del spray declarado) y C7 (MWA § 4(c) + WPCL + FLSA), y la entrada de C3 ahora cita HICPA (§§ 7, 8(a)(2), 9(5), 9(10) y § 10 → UTPCPL § 201-2). Verificación: `node --check app.js` OK y `node tests/run-cases.mjs` PASS 15/15 (salida real en la entrega); comprobación conductual propia (harness desechable en /tmp): C3/C5/C6/C7 cumplen **todos** los fragmentos `debe_contener` y ningún `no_debe_contener`; C4 cumple todo salvo «no asesoría legal» y C1/C2 arrastran faltas previas (ver riesgos en §2 y en la entrega).

**Tercera oleada (2026-10-22) — qué hizo:** (1) **verificación fina FLSA §§ 206/207 dentro del PDF oficial del Título 29** — pasajes localizados y leídos palabra por palabra (§ 206(a)(1)(C): $7.25 desde el 24-jul-2009; § 207(a)(1): 1.5× tras 40 h/semana), registrados en el propio compañero `usc-titulo-29.md` → **C7 cerrada al 100%** (corpus estatal + federal verificado + KB); (2) **pasada C8 completa** (la del Día 4, adelantada): las 16 piezas re-verificadas contra su fuente oficial viva y anotadas con línea `reverificacion:` — a nivel federal se detectaron y evaluaron las **PL 119-122, 119-123 y 119-124** (posteriores al corte; ninguna toca lo que Citizen cita, con la salvedad ERISA del T. 29 en §5) y a nivel estatal la **Ley 36 de 2026** (nueva § 3356 del Cap. 33, sin efecto sobre lo transcrito); (3) **banco de 15 situaciones corrido contra el Dock v1** (instancia local): cazó y se corrigió un **falso «no cubierto» en C1/C2** (cobertura de recuperación en `citizen.js`, ver §5) y se dio granularidad propia al § 4(c) de la MWA para que C7 cite el overtime *verbatim*. Detalle completo en §5.

**Lo que sigue pendiente** (fuera de alcance de las tres oleadas): la re-verificación C8 del **Día 9** (la del Día 4 ya se ejecutó hoy); el resto de § 3353 ((a)(3)–(d)) si alguna demo lo necesita; las costuras del Título 42.

---

## 1) Inventario del corpus (contra CONTRACTS §3)

El contrato §3 no fija carpeta; se adoptó **`corpus/` en la raíz del repo** (decisión documentada en `corpus/README.md`, para ratificación de Noa). Piezas de texto = `.md` con bloque §3 + texto transcrito de la fuente oficial. Piezas binarias (PDF/ZIP del goal) = `.md` **compañero** con bloque §3 + campo `archivo_fuente` con la ruta canónica del binario (los binarios no se copiaron: el ZIP federal pesa 191 MB).

### Pensilvania (`corpus/pa/`)

| Pieza | Fuente oficial | Estado §3 / contenido |
|---|---|---|
| `18pacs-cap57-wiretap.md` | legis.state.pa.us, 18 Pa.C.S. Cap. 57 | ✔ Bloque §3. §§ 5701, **5702 completo (definiciones — hueco cerrado)**, 5703 y 5704(4) + nota operativa heredada y verificada. Incorpora la enmienda de la Ley 53 de 2025 a «oral communication» según la anota la fuente. |
| `18pacs-cap05-justificacion.md` | legis.state.pa.us, 18 Pa.C.S. Cap. 5 | ✔ Bloque §3. **Capítulo completo §§ 501–510** (nuevo). |
| `75pacs-cap37-accidentes.md` | legis.state.pa.us, Título 75 Cap. 37 | ✔ Bloque §3. Subcap. C §§ 3741–3748 (nuevo). §§ 3749–3757 (reportes institucionales) no transcritos, con nota de alcance. |
| `75pacs-estacionamiento-y-luces.md` | legis.state.pa.us, Título 75 Caps. 33/43 | ✔ Bloque §3. §§ 3351, 3352 íntegros; **§ 3354 ÍNTEGRO desde la 2ª oleada** ((a)–(h), con (d) completo y multas en (f)/(g)); § 3353 sigue parcial con marcador; §§ 4302, 4303(c), 4305. |
| `hicpa-act132-2008.md` | palegis.us, Ley 132 de 2008 compilada | ✔ Bloque §3. **HICPA completo** con enmiendas (Ley 52/2011, Ley 160/2014) integradas; § 4 resumida con marcador (nuevo). |
| `salarios-pa-mwa-wpcl.md` | palegis.us / legis.state.pa.us, textos compilados | ✔ Bloque §3. **Minimum Wage Act de 1968 + Wage Payment and Collection Law** (nuevo). |
| `landlord-tenant-act-deposito.md` | palegis.us, Landlord and Tenant Act of 1951 (Ley 20 de 1951) compilada | ✔ Bloque §3. **Secciones 511.1, 511.2, 511.3 y 512 íntegras** (= 68 P.S. §§ 250.511a, 250.511b, 250.511c y 250.512): límites del depósito, intereses, lista escrita + devolución en **30 días**, remedio del **doble** y matiz § 512(e) (nuevo, 2ª oleada). |
| `oag-guia-inquilinos-propietarios-pa.md` | attorneygeneral.gov (OAG, Bureau of Consumer Protection) | ✔ Compañero §3 del PDF (909 KB, guía edición 2022). Apoyo C4 en lenguaje sencillo; **ya no es la base de la cita** — el estatuto vive en `landlord-tenant-act-deposito.md`. |
| `oag-utpcpl-ley-proteccion-consumidor-pa.md` | attorneygeneral.gov (OAG) | ✔ Compañero §3 del PDF (278 KB, 35 págs., 73 P.S. Cap. 4). Apoyo C3. |

### Federal (`corpus/federal/`) — release point **PL 119-121** (corte 2026-10-09), fuente uscode.house.gov

| Pieza (compañero §3) | Binario (`archivo_fuente`) | Estado |
|---|---|---|
| `usc-titulo-15.md` | `usc15@119-121.pdf` (~11.2 MB) | ✔ Título completo |
| `usc-titulo-18.md` | `usc18@119-121.pdf` (~4.4 MB) | ✔ Título completo |
| `usc-titulo-20.md` | `usc20@119-121.pdf` (~7.5 MB) | ✔ Título completo |
| `usc-titulo-29.md` | `usc29@119-121.pdf` (~4.1 MB) | ✔ Título completo; ✔ **pasajes FLSA §§ 206/207 verificados dentro del PDF (3ª oleada)**, con el texto operativo citado en el propio compañero; ⚠️ la PL 119-124 enmendó ERISA § 3(18) (§ 1002) tras el corte — fuera de la cobertura Citizen (ver §5) |
| `usc-titulo-42.md` | 6 PDFs parciales (ch. 1–6A, 7–7A, 8–39, 40–81, 82–123, 124–165) | ✔ Compañero único; ⚠️ costuras entre parciales sin verificar (riesgo §4.5) |
| `usc-titulo-52.md` | `usc52@119-121.pdf` (~0.6 MB) | ✔ Título completo |
| `usc-completo-pl119-121.md` | `pdf_uscAll@119-121.zip` (191 MB) | ✔ Respaldo íntegro sin descomprimir |

---

## 2) Mapa del banco de 15 situaciones — antes / después

Leyenda: ✔ cubierto · ◐ parcial · ✘ hueco · N/A no es pregunta de corpus legal. «KB» = entradas de respuesta del scaffold (mock etiquetado, contrato §1). En la 1ª oleada el KB no se tocó; **en la 2ª oleada sí**: entrada de C3 ajustada (cita HICPA) y entradas nuevas para C5, C6 y C7.

| # | Situación | Corpus ANTES | Corpus DESPUÉS | KB hoy | Nota |
|---|---|---|---|---|---|
| C1 | Grabar parada de tráfico (PA) | ✔ §§ 5703/5704(4), sin § 5702 | ✔ **+ § 5702 completo** | ✔ entrada 1 | Cobertura reforzada: la definición de «oral communication» ya es citable palabra por palabra. |
| C2 | Grabar llamada con contratista | ✔ (misma regla) | ✔ (idem) | ✔ entrada 1 | Sin cambio sustantivo. |
| C3 | Contratista cobró y desapareció | ◐ UTPCPL sí; **HICPA no descargada** | ✔ **HICPA completo en corpus** (§§ 7 contrato válido, 7(b) rescisión 3 días, 8 fraude, 9(9)–(10) pagos/anticipos, 10 = violación UTPCPL) + compañero UTPCPL | ✔ entrada 3 **con cita HICPA** (§§ 7, 8(a)(2), 9(5), 9(10), § 10 → 73 P.S. § 201-2) desde la 2ª oleada | **Cerrada completa** (corpus + KB). La entrada pasa la comprobación de fragmentos del caso (ver §0). |
| C4 | Depósito de inquilino (70 días) | ◐ solo guía OAG 2022 | ✔ **estatuto descargado** (2ª oleada): Secciones 511.1–512 de la ley = 68 P.S. §§ 250.511a–250.512, íntegras en `landlord-tenant-act-deposito.md`; la guía OAG queda como apoyo | ✔ entrada 2 (cita § 250.512; le falta solo el fragmento «no asesoría legal» para la capa conductual — ver riesgo en §2) | **Completa.** El remedio del doble descansa ahora en § 512(c) transcrito, con el matiz § 512(e) (dirección nueva por escrito) registrado en la pieza. |
| C5 | Choque leve: ¿me puedo ir? | ✘ **hueco total** (Título 75 no descargado) | ✔ **Título 75 en corpus**: deberes §§ 3742/3743/3744, mover el vehículo § 3745.1, aviso § 3746, estacionamiento §§ 3351–3352 | ✔ **entrada nueva** (2ª oleada: §§ 3743, 3744, 3745, 3745.1, 3746) | **Cerrada completa** (corpus + KB; fragmentos del caso: todos ✔). |
| C6 | Defensa propia / spray de pimienta | ✘ **hueco total** (Cap. 5 no descargado) | ✔ **18 Pa.C.S. Cap. 5 completo (§§ 501–510)**; §§ 505/506 operativos | ✔ **entrada nueva** (2ª oleada: 911 + alejarse primero; § 505 fuerza razonable; **hueco del spray declarado en la propia respuesta**) | **Cerrada completa.** Ojo honesto que la entrada respeta: el capítulo no regula el spray de pimienta como tal y la respuesta lo declara en vez de rellenar. |
| C7 | Horas extra no pagadas | ◐ federal ✔ (FLSA en T. 29); **sin capa PA**; sin entrada KB | ✔ corpus: **capa PA descargada** (MWA § 4: tarifa y (a.1) vínculo FLSA; § 4(c) overtime 1.5× >40 h; WPCL §§ 3, 5, 9.1, 10) + compañero T. 29 **con §§ 206/207 verificados en el PDF (3ª oleada)** | ✔ **entrada nueva** (2ª oleada: MWA § 4(c) + WPCL §§ 3/9.1/10 + FLSA § 207) | **CERRADA al 100% (3ª oleada).** El cabo federal quedó verificado palabra por palabra contra el PDF oficial al RP 119-121 y contra las leyes posteriores al corte (ninguna toca el Cap. 8 FLSA). Derivación tarifa PA $7.25 = MWA § 4(a.1) + FLSA § 206(a)(1)(C), marcada como derivación en la pieza. En el banco contra el Dock, C7 cita el § 4(c) de la MWA *verbatim* (ver §5). |
| C8 | «La ley cambió» (vigencia) | ◐ función sin procedimiento | ◐ función; **pasada del Día 4 EJECUTADA el 2026-10-22 (3ª oleada)** | ✘ en la app (fallback); ✔ en el Dock (responde desde metadatos §3) | La pasada re-verificó las 16 piezas (fuentes vivas + leyes PL 119-122..124 + Ley 36 de 2026 de PA) y dejó la fecha en cada bloque §3 (`reverificacion:`). Queda la pasada del **Día 9**. En el banco, C8 respondió correcto desde los metadatos (ver §5). |
| G1 | Calle de noche, zona desconocida | N/A | N/A | ◐ entrada «noche» | Sin cambio (producto, no corpus). |
| G2 | Seguimiento prolongado | N/A | N/A | ✔ entrada «siguiendo» | Sin cambio. |
| G3 | Acercamiento rápido por la espalda | N/A | N/A | ✘ fallback | Sin cambio (capacidad post-Día 2). |
| G4 | Alerta meteorológica severa | N/A | N/A | ✔ NWS real integrado | Sin cambio. |
| G5 | Carro varado de noche | ◐ **bloqueado por el hueco del Título 75** | ✔ **parte legal cubierta**: §§ 3351/3352 (dónde parar/retirada), § 3745.1 (mover el vehículo), Cap. 43 (luces: § 4302 — incl. limpiaparabrisas en uso — y § 4305) | ◐ entrada «carro/noche» (seguridad sí; ahora la ley ya tiene de dónde citar) | Desbloqueado a nivel corpus. |
| A1 | «¿Qué estoy mirando?» | N/A | N/A | ◐ placeholder honesto | Sin cambio. |
| A2 | Auto-cumplimiento en vivo | ◐ grabar ✔ / estacionar ✘ (Título 75) | ✔ grabar ✔ (§ 5702 incluido); estacionar tras choque ✔ (§§ 3351–3354, 3745.1); espacios para personas con discapacidad: **§ 3354(d) ÍNTEGRO desde la 2ª oleada**, con la multa citable en § 3354(f) ($50–$200) y (g) (multa especial $50) | ◐ solo vía entrada «grabar» (la respuesta A2 es de modo awareness, sin KB legal propio) | La función estrella tiene corpus completo para ambos ejemplos del banco; la capa que responda A2 con cita deberá apoyarse en § 3354(d)+(f). |

**Resumen Citizen (corpus):** ANTES — 2 completas (C1, C2), 4 parciales (C3, C4, C7, C8), 2 huecos (C5, C6). Tras la 1ª oleada — 5 completas (C1, C2, C3, C5, C6), 3 parciales (C4, C7, C8), 0 huecos. Tras la 2ª oleada — 6 completas (C1, C2, C3, C4, C5, C6), 2 parciales (C7, C8), 0 huecos. **Tras la 3ª oleada — 7 completas (C1–C7), 1 función (C8, con su pasada del Día 4 ya ejecutada), 0 huecos, 0 cabos de verificación fina.**
A nivel **situación respondible** (corpus + KB): **7/8** — C1–C7 tienen entrada; C8 queda en fallback en la app por diseño (es una función de vigencia, no una respuesta fija), y en el Dock responde desde los metadatos §3. El corpus ya no es el cuello de botella en ninguna de las 8; lo que queda es procedimiento (pasada C8 del Día 9) y capas de redacción/composición del sprint.

---

## 3) Huecos restantes, priorizados

| Prioridad | Hueco | Situaciones | Fuente / acción |
|---|---|---|---|
| 1 | **Procedimiento de vigencia C8** — pasada del Día 9 | C8 | La pasada del Día 4 se ejecutó el 2026-10-22 (3ª oleada, §5). Queda repetirla el Día 9 y registrar fecha por respuesta. |
| 2 | Costuras del Título 42 (6 parciales) | (federal general) | Verificar continuidad de capítulos/secciones en la ingesta antes de declarar el título «completo» (ver §4.5). |
| 3 | Fragmentos conductuales pendientes en entradas viejas del KB | C1, C2, C4 | La capa conductual (Días 2/4) busca fragmentos literales: a la entrada 1 le faltan «sin audio» y «no asesoría legal» (afecta C1 y C2; a C2 también «por escrito») y a la entrada 2 (C4) le falta «no asesoría legal». Son ajustes de redacción de una línea por entrada — decisión de Noa/Rol 2, fuera del alcance de estas oleadas. Las entradas nuevas (C3 ajustada, C5, C6, C7) cumplen todos sus fragmentos. (En el Dock, C1 ya devuelve esos fragmentos vía la nota operativa del corpus — ver §5.) |
| 4 | Resto de § 3353 ((a)(3)–(d), prohibiciones de estacionamiento) | (apoyo G5/A2) | Solo si alguna demo lo necesita; mismo URL oficial del Cap. 33. Hoy va parcial con marcador explícito. |
| 5 | **Composición entre modos (banco, G5)** | G5 | El modo guardian v1 no compone la parte legal que sí vive en el corpus Citizen (estacionar/luces). Corrección = capa `brain` del sprint, no corpus (ver §5). |

Cerrados en la 3ª oleada (era la prioridad 1 y la mitad de la 2): **verificación de pasajes FLSA §§ 206/207 dentro del PDF del Título 29 ✔ · pasada C8 del Día 4 ✔ (16/16 piezas re-verificadas y anotadas)**.

Cerrados en la 1ª oleada (eran prioridades 1, 2, 3, 5 y 6 del informe 2026-10-21): Título 75 ✔ · 18 Pa.C.S. Cap. 5 ✔ · HICPA ✔ · capa salarial PA ✔ · normalización §3 completa + § 5702 ✔.
Cerrados en la 2ª oleada (eran prioridades 1, 2 y 5 de la lista anterior): **entradas KB de C5/C6/C7 + cita HICPA en C3 ✔ · texto estatutario del Landlord and Tenant Act ✔ · § 3354(d) íntegro ✔**.

---

## 4) Riesgos de vigencia (actualizados)

1. **Release point federal PL 119-121** = corte **2026-10-09**. El riesgo dejó de ser hipotético: **ya existen PL 119-122 (15-oct-2026), PL 119-123 (15-oct-2026) y PL 119-124 (15-oct-2026)**. La pasada C8 del 2026-10-22 las evaluó una a una (texto completo en govinfo): ninguna enmienda las secciones que Citizen cita del corpus; la única que toca un título del corpus es la **PL 119-124 → ERISA § 3(18) (29 U.S.C. § 1002(18))**, tema fuera de la cobertura Citizen, anotado en el compañero del T. 29 para que nadie declare ese PDF «texto más reciente del título» sin la salvedad. Mitigación intacta: re-verificar el Día 9 y declarar el release point en cada respuesta afectada. Las piezas federales llevan el release point **dentro** de su bloque §3, no solo en el nombre del archivo.
2. **Capa estatal verificada el 2026-10-22** contra legis.state.pa.us/palegis.us. Dato vivo detectado en la 2ª oleada: el Cap. 57 lista una **enmienda de 2025 (Ley 53, 24-nov-2025)** a la definición de «oral communication» — el texto transcrito ya la incorpora, pero muestra que la capa estatal también se mueve; la re-verificación del Día 9 debe incluir los textos de PA, no solo el release point federal. Dato de la 3ª oleada: la **Ley 36 de 2026 (20-jul-2026)** añadió la nueva § 3356 al Cap. 33 del Título 75 (vigencia diferida ≈ abr-2028); no afecta a los §§ 3351–3354 transcritos y quedó anotada en la pieza.
3. **Guía OAG edición 2022:** sigue siendo apoyo, no estatuto (C4) — pero desde la 2ª oleada la cita de los 30 días y del doble descansa en el **estatuto transcrito** (`landlord-tenant-act-deposito.md`, § 512(a)/(c)); la guía queda solo como lenguaje sencillo de respaldo.
4. **Cumplimiento §3:** resuelto para las 15 piezas del inventario conocido. Riesgo residual: piezas **nuevas** que entren sin bloque §3 romperían el invariante — el `corpus/README.md` deja la regla escrita («sin `vigencia_verificada` reciente, la pieza no se usa para responder»).
5. **Título 42 en 6 parciales:** las costuras siguen sin verificar; el compañero `usc-titulo-42.md` lo advierte explícitamente para que nadie lo declare «completo» por error.
6. **Transcripciones con marcadores:** quedan porciones resumidas con marcador explícito en § 3353 ((a)(3)–(d)) del Título 75, § 4 de HICPA, §§ 5(b)-(c)/6/7/9 de la MWA, § 4.1/§ 8 de la WPCL y § 4303(b)–(j). **§ 3354 ya no está en esta lista** (íntegro desde la 2ª oleada). Citizen no debe citar palabra por palabra desde un resumen: debe ir a la fuente oficial indicada en el bloque §3.


---

## 5) Tercera oleada (2026-10-22): cierre federal de C7, pasada C8 y banco de 15 contra el Dock

### 5.1 Cierre de C7 — verificación fina FLSA §§ 206/207

- **Método:** extracción del texto completo del PDF oficial `usc29@119-121.pdf` (uscode.house.gov, RP 119-121) y lectura directa de los pasajes en el Cap. 8 (Fair Labor Standards).
- **§ 206(a)(1)(C)** verificado palabra por palabra: «$7.25 an hour, beginning 24 months after that 60th day» (el «60th day after May 25, 2007» → la tarifa rige desde el **24-jul-2009**). La afirmación del compañero era exacta.
- **§ 207(a)(1)** verificado palabra por palabra: trabajo «for a workweek longer than forty hours» exige compensación «at a rate not less than **one and one-half times the regular rate**». La afirmación del compañero era exacta.
- **Vigencia contrastada:** ninguna ley posterior al corte toca el Cap. 8 (ver 5.2). El texto operativo quedó citado dentro del propio compañero `corpus/federal/usc-titulo-29.md`. **C7 cerrada al 100%**: capa PA (MWA § 4(c) + WPCL) + federal verificado + entrada KB.

### 5.2 Pasada C8 — re-verificación de vigencia de las 16 piezas (2026-10-22)

**Federal (7 piezas).** Los 11 PDFs federales llevan impreso «[Release Point 119-121]» (verificado en cada uno). El propio RP incluye la PL 119-121 (la enmienda de *music tourism* a 15 U.S.C. § 9803 está dentro del PDF del T. 15). Leyes promulgadas tras el corte y hasta hoy, leídas en texto completo en su fuente oficial (govinfo/GPO):

| Ley | Fecha | Qué hace | Efecto sobre el corpus |
|---|---|---|---|
| PL 119-122 | 15-oct-2026 | Enmienda la Crow Tribe Water Rights Settlement Act de 2010 (T. 25) | **Ninguno** (título fuera del corpus; 0 referencias a FLSA/T. 29) |
| PL 119-123 | 15-oct-2026 | Metodología de origen de pescados/mariscos (nota a 16 U.S.C. § 1885) | **Ninguno** (título fuera del corpus; 0 referencias a FLSA/T. 29) |
| PL 119-124 | 15-oct-2026 | «Retire through Ownership Act»: redefine «adequate consideration» en ERISA § 3(18) = **29 U.S.C. § 1002(18)** | Toca el **Título 29 como pieza**, pero **no** el Cap. 8 (FLSA) ni los §§ 206/207 (0 menciones a la FLSA en el texto completo). Anotado en el compañero del T. 29. Ninguna respuesta Citizen depende de § 1002 |

No existe PL 119-125 a la fecha (govinfo devuelve error de paquete). Salvedad de método: el sitio uscode.house.gov opera en formato temporal y su banner declara el código en línea «current through Public Law 119-120 (Oct 7, 2026)»; por eso el barrido de leyes posteriores se hizo contra govinfo (GPO), que es la fuente oficial de las leyes promulgadas.

**Pensilvania (9 piezas).** Fuentes oficiales vivas consultadas el 2026-10-22: Caps. 57 y 5 del T. 18 y Caps. 37, 33 y 43 del T. 75 en legis.state.pa.us (sin enmiendas de 2026 en Caps. 57, 5, 37 y 43; § 5703/§ 5702, § 505 y §§ 4302/4305 cotejados en el texto vivo) y los 4 PDF de leyes no consolidadas en palegis.us (HICPA, Landlord and Tenant Act, MWA y WPCL — descargados y cotejados: rescisión de 3 días hábiles y vínculo UTPCPL en HICPA; 30 días y doble en la § 512 del LTA; $7.15 § 4(a)(8) y overtime § 4(c) en la MWA; 25% de daños liquidados y prescripción de 3 años en la WPCL). Único movimiento detectado: **Cap. 33 — la Ley 36 de 2026 añadió la nueva § 3356** (vigencia diferida de 21 meses); no enmienda nada de lo transcrito y quedó anotado en la pieza. Los dos compañeros OAG son material divulgativo (no base de cita): su binario consta en la carpeta del goal y su vigencia se apoya en los estatutos que resumen — no se les atribuye verificación de contenido más allá de eso.

**Anotación:** las 16 piezas llevan desde hoy la línea `reverificacion: 2026-10-22 (pasada C8 …)` en su bloque §3. Ninguna pieza quedó sin confirmar; ninguna necesitó la marca de «no confirmada». Próxima pasada: Día 9.

### 5.3 Correcciones aplicadas durante el banco

1. **`dock/gateway/src/citizen.js` — falso «no cubierto» en C1/C2 (falla de recuperación, no de corpus).** La cobertura se calculaba sobre *todos* los conceptos de la pregunta, incluidos tokens que no existen en ninguna parte del corpus («voy», «baño», «medias», «lentes»): castigaban a todos los fragmentos por igual y C1/C2 caían bajo el umbral (0.22 y 0.29 < 0.34) pese a que el mejor fragmento era exactamente § 5703/§ 5704. Corrección: la cobertura ahora se calcula sobre **conceptos atestiguados** (alguna variante presente en el índice del corpus, `textIndex` que expone `loadCorpus`); el umbral (0.34) y el mínimo de conceptos encontrados (2) no cambian. Si ningún concepto está atestiguado, la respuesta sigue siendo «no cubierto».
2. **`corpus/pa/salarios-pa-mwa-wpcl.md` — granularidad del § 4(c) de la MWA.** El § 4 entero era un solo fragmento y el extracto de C7 mostraba la lista histórica de tarifas en vez de la regla de overtime. Se añadieron dos encabezados (`## Section 4(c). Overtime.` y `## Section 4 (continuación). Incisos (d) y (e).`) sin tocar una palabra del texto: ahora C7 cita el § 4(c) *verbatim* («one and one-half times… in excess of forty hours in a workweek»).

### 5.4 Banco de 15 situaciones contra el Dock v1 (instancia local, puerto de prueba; NO el Dock desplegado en la mini)

Entradas = `tests/cases.json` (las mismas del banco de Fase 0); juicio semántico de Rol 4 sobre la respuesta real, con los fragmentos `debe_contener` como criterios mínimos. **Contenido prohibido: 0/15. Fabricaciones: 0/15.**

| # | Modo | Veredicto | Detalle |
|---|---|---|---|
| C1 | citizen | ✅ Correcta, cita válida | Tras la corrección 5.3.1: § 5704(4) + nota operativa del corpus (dos partes, § 5703, alternativa «sin audio», «no asesoría legal» — todos los fragmentos del banco presentes) |
| C2 | citizen | ✅ Correcta, cita válida | § 5703 íntegro + § 5704(4): la regla de dos partes con la cita canónica. La guía «documentar por escrito» es capa KB/redacción, ausente del extracto |
| C3 | citizen | ✅ Correcta, cita válida | HICPA § 7 + § 8 (fraude de mejoras al hogar): el estatuto correcto para el contratista que desaparece. La vía UTPCPL § 201-2 entra por HICPA § 10, no citado en esta corrida |
| C4 | citizen | ✅ Correcta, cita válida | § 512(a) con los **30 días** en el extracto. El remedio del doble (§ 512(c)) está en la misma sección citada, fuera de la ventana del extracto |
| C5 | citizen | ✅ Correcta, cita válida | Cap. 37 (§ 3745.1 + pieza de accidentes). El extracto lidera con mover el vehículo, no con el deber de detenerse (§ 3743): precisión mejorable en la capa de redacción |
| C6 | citizen | ✅ Correcta, cita válida | §§ 505/506 (fuerza justificada y sus límites). Sin la guía conductual 911/alejarse en el extracto (capa de redacción); el hueco del spray lo declara la entrada KB de la app |
| C7 | citizen | ✅ Correcta, cita válida | Tras la corrección 5.3.2: MWA § 4(c) *verbatim*. Cita única estatal; la FLSA verificada hoy (5.1) sostiene la derivación pero no se co-cita en el extractivo v1 |
| C8 | citizen | ✅ Correcta | Responde desde los metadatos §3 (RP PL 119-121 + vigencias por pieza) sin afirmar ni negar el rumor, como manda el criterio |
| G1 | guardian | ◐ No cubierto declarado | El modo guardian v1 solo evalúa alertas oficiales de zona y lo declara; no existe fuente de incidentes/registros del área integrada (la capacidad del banco no está construida). No inventó nivel de peligro |
| G2 | guardian | ◐ No cubierto declarado | Declaró su alcance («evalúo solo alertas oficiales») y derivó al 911; no afirmó detectar seguimiento (capacidad de sensores/visión, no de corpus) |
| G3 | guardian | ◐ No cubierto declarado | Ídem G2; sin visión no hay detección de acercamiento (el 501 de `/see` lo confirma por el otro canal) |
| G4 | guardian | ✅ Correcta, cita válida | Alerta real del NWS (Freeze Watch, Severe) con vigencia y URL oficial, servida en vivo |
| G5 | guardian | ❌ **FALLO de composición entre modos** | La parte legal (estacionar en el arcén y luces, §§ 3351/4305) **sí está en el corpus Citizen**, pero el modo guardian v1 respondió solo alertas. Sin fabricación; la corrección es la capa `brain` del sprint, no el corpus |
| A1 | awareness | ◐ No cubierto declarado correctamente | 501 explícito del Dock (awareness llega con SAM 3.1 el Día 2); no describió una escena que no ve |
| A2 | awareness | ◐ No cubierto declarado correctamente | 501 explícito; el núcleo legal (§ 3354 íntegro) sí está en el corpus y responde vía modo citizen — la función estrella queda para la composición del sprint |

**Totales:** 8 correctas · 6 «no cubierto» declarado · 1 fallo (G5, de composición, no de corpus ni de honestidad). Citizen: **8/8 sin fallos** tras las correcciones de 5.3.

## Oleada 1 (2026-10-27) — la biblioteca de WD entra al corpus

WD aportó su carpeta de Drive con los PDF oficiales del U.S. Code completo (Títulos 1–54, ed. 2024) y ordenó que Citizen «abarque todo». La oleada 1 extrajo de esa biblioteca los fragmentos de los temas que la gente pregunta en la calle, con el estándar §3 de siempre:

- **Pieza nueva:** `corpus/federal/usc-titulo-08.md` — Título 8 (INA): § 1182(a)(6)(A)(i) (presencia sin admisión), § 1227(a)(1) (deportabilidad), § 1304(e) (portar el registro), § 1324a(a)(1) (empleo/I-9), § 1423 (inglés y cívica, con excepciones 50/20 y 55/15), § 1427(a) (residencia de 5 años para naturalización).
- **Título 18, secciones nuevas:** § 242 (derechos bajo color de ley), § 1001(a) (declaraciones falsas), § 922(g) (prohibidos de poseer armas, con la cláusula operativa final), § 3501(a)–(b) (confesiones y factores Miranda).
- **Título 42, secciones nuevas:** § 423(d) (definición de discapacidad), § 1382(a) (elegibilidad SSI; los montos vigentes se refieren a la fuente oficial por su ajuste anual), § 1395c (Medicare Parte A).

**Verificación:** cada pasaje se contrastó frase por frase contra el HTM oficial de uscode.house.gov al release point vigente **PL 119-134** (corte 2026-10-20), descargado el 2026-10-27: **20/20 frases operativas idénticas** al texto de los PDF. El corpus queda en **17 piezas y 107 fragmentos**. Regresión: batería conductual de 9 preguntas reales (9/9 en la sección correcta con cita, incluida la abstención donde no hay respaldo) y suites legadas 15/15 · 11/11 · 13/13. Las 16 piezas previas conservan su verificación al corte PL 119-121; su pasada C8 al RP 119-134 queda programada.

## Oleada 2 (2026-10-27) — «los derechos del ciudadano» ante la policía (dirección de WD)

WD ordenó el énfasis: más que migración, Citizen debe defender al ciudadano en el encuentro cotidiano con la autoridad — el policía que se quiere pasar de la raya. La oleada entra con esa brújula:

- **Pieza NUEVA `corpus/federal/constitucion-eeuu.md`** (pieza de transcripción, no compañera): Enmiendas **I** (expresión; con nota etiquetada como jurisprudencia sobre grabar a funcionarios en público), **II** (armas), **IV** (registros y cateos: causa probable y orden), **V** (silencio y debido proceso), **VI** (juicio justo y abogado) y **XIV § 1** (debido proceso e igual protección frente a los estados). Fuente: `constitution.pdf` (impresión GPO) de la biblioteca de WD, contrastada con el texto constitucional oficial del Senado (6/6 pasajes; la Enmienda I difiere solo en puntuación entre impresiones oficiales — las palabras son las mismas).
- **§ 1983 en la pieza del Título 42**: la acción civil contra quien, bajo color de ley, priva a una persona de un derecho constitucional — la vía civil que acompaña al delito federal de § 242 (T. 18). Texto del HTM oficial al **release point PL 119-134**; su apertura coincide palabra por palabra con el PDF de la biblioteca.
- **Corpus tras la oleada 2: 18 piezas, 115 fragmentos** (conteo del arranque del Dock).

Tres ajustes de motor nacidos de esta oleada, con batería conductual como evidencia (aplicados en paridad al puerto Nest y al legado):

1. **El preámbulo no puntúa por su encabezado**: lo que cuelga del título de una pieza es contexto/procedencia, no norma; un título largo se volvía un imán de conceptos y le ganaba a los fragmentos operativos.
2. **Desempate por cobertura**: a igual puntuación gana el fragmento que cubre más conceptos de la pregunta (antes decidía el orden alfabético del archivo).
3. Sinónimos del encuentro policial (registrar/cateo, silencio/callado, orden judicial, abogado, demandar, constitución/enmienda, entrar sin papeles) y ruido eliminado (`pasa`/`pasan` a stopwords; fuera las variantes genéricas `estados`/`unidos` → `states`/`united`).

**Batería oleada 2 (6/6) + regresión oleada 1 y banco (9/9)**, en vivo contra el Dock compilado: silencio→Enmienda V · registrar el carro→Enmienda IV · grabar al policía→Enmienda I · demandar al funcionario→§ 1983 · abogado→Enmienda VI · igual protección→Enmienda XIV § 1 · naturalización→§ 1427 · sin papeles→§ 1182 · tarjeta de residencia→§ 1304 · felonía y armas→§ 922(g) · discapacidad→§ 423 · deportación→§ 1227 · grabar en PA→Wiretap § 5703 · salario→MWA Section 4 · divorcio→abstención NO_CUBIERTO.
