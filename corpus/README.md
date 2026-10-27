# Corpus legal — NOA Guardian (Citizen / Rol 4)

Corpus normalizado según `docs/CONTRACTS.md` §3. Cada pieza lleva al inicio su bloque de metadatos (`titulo / fuente / jurisdiccion / vigencia_verificada / release_point`). **Sin `vigencia_verificada` reciente, la pieza no se usa para responder** (regla del contrato).

## Decisión de estructura (2026-10-22, Rol 4)

El contrato §3 fija el formato de metadatos pero **no fija carpeta**; se adopta `corpus/` en la raíz del repo, con dos subcarpetas por jurisdicción (`pa/`, `federal/`). La decisión se documenta aquí, como pidió la tarea, y queda para ratificación de Noa.

Reglas aplicadas:

1. **Piezas de texto** (estatutos transcritos de la fuente oficial HTML): archivo `.md` con el bloque §3 y el texto estatutario a continuación, transcrito de la fuente oficial indicada en `fuente`. Las notas de enmienda e historial que publica la propia fuente se conservan.
2. **Piezas binarias** (PDF/ZIP que ya viven en la carpeta del goal): archivo `.md` **compañero** con el bloque §3 completo y el campo adicional `archivo_fuente` que apunta a la ruta canónica del binario. El bloque §3 exige metadatos «al inicio del archivo», cosa imposible dentro de un PDF/ZIP sin alterarlo; el compañero es la vía que el propio informe de cobertura propuso (prioridad 6). Los binarios **no se copiaron al repo** (el ZIP federal pesa 191 MB).
3. **Nada se responde desde conocimiento del modelo:** cada pieza cita su URL oficial. Fuentes usadas: Asamblea General de PA (`legis.state.pa.us` / `palegis.us`, compilaciones del Legislative Reference Bureau) y `uscode.house.gov`. Cero fuentes comerciales.

## Índice

### Pensilvania (`pa/`)
| Archivo | Pieza | Situaciones |
|---|---|---|
| `18pacs-cap57-wiretap.md` | Wiretap Act, 18 Pa.C.S. Cap. 57: §§ 5702, 5703 y 5704(4) | C1, C2, A2 |
| `18pacs-cap05-justificacion.md` | 18 Pa.C.S. Cap. 5 completo (§§ 501–510) | C6 |
| `75pacs-cap37-accidentes.md` | Título 75, Cap. 37 Subcap. C (§§ 3741–3748) | C5, G5 |
| `75pacs-estacionamiento-y-luces.md` | Título 75: §§ 3351–3354 (Cap. 33 Subcap. E; § 3354 íntegro desde 2026-10-22) y §§ 4302, 4303(c), 4305 (Cap. 43) | G5, A2 |
| `landlord-tenant-act-deposito.md` | Landlord and Tenant Act of 1951: Secciones 511.1–512 (= 68 P.S. §§ 250.511a–250.512), depósito de garantía | C4 |
| `hicpa-act132-2008.md` | HICPA completo (Ley 132 de 2008, texto compilado con enmiendas) | C3 |
| `salarios-pa-mwa-wpcl.md` | Minimum Wage Act de 1968 + Wage Payment and Collection Law (textos compilados con enmiendas) | C7 |
| `oag-guia-inquilinos-propietarios-pa.md` | Compañero §3 de la guía OAG de inquilinos (PDF) | C4 (apoyo) |
| `oag-utpcpl-ley-proteccion-consumidor-pa.md` | Compañero §3 del texto UTPCPL de la OAG (PDF) | C3 (apoyo) |

### Federal (`federal/`)
Compañeros §3 de los PDFs de `uscode.house.gov` al release point **PL 119-121** (corte 2026-10-09): títulos 15, 18, 20, 29, 42 (6 PDF parciales) y 52, más el ZIP con el USC completo.

## Vigencia

- Estatal: textos consultados y verificados contra la fuente oficial el **2026-10-22**; **re-verificados (pasada C8) el 2026-10-22** contra la fuente oficial viva — las 16 piezas llevan la línea `reverificacion:` en su bloque §3.
- Federal: release point PL 119-121 (incluye la propia PL 119-121, verificado en el PDF del T. 15). **Pasada C8 (2026-10-22):** ya existen PL 119-122 (T. 25), PL 119-123 (T. 16) y PL 119-124 (ERISA § 3(18) = 29 U.S.C. § 1002(18)) posteriores al corte; ninguna enmienda las secciones que Citizen cita del corpus (detalle por pieza en `docs/CORPUS-COVERAGE.md` §5). Próxima re-verificación programada: Día 9 del sprint (la del Día 4 se adelantó a esta pasada).
