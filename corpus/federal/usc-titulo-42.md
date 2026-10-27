---
titulo: United States Code, Título 42 — The Public Health and Welfare (6 PDFs parciales por capítulos)
fuente: https://uscode.house.gov (Office of the Law Revision Counsel, Cámara de Representantes de EE. UU.)
jurisdiccion: Federal, EE. UU.
vigencia_verificada: 2026-10-27
reverificacion: 2026-10-27 (oleada 1 — §§ 423, 1382 y 1395c leídos del PDF completo del Título 42 (ed. 2024) de la biblioteca de WD y contrastados contra el texto vigente en uscode.house.gov; la pasada C8 del 2026-10-22 cubrió el resto de la pieza)
nota_reverificacion: Para las secciones citadas en la oleada 1 no hay costura posible: se leyeron en continuo del PDF único y completo del título y se contrastaron frase por frase contra el HTM oficial al release point PL 119-134 (uscode.house.gov, 2026-10-27), con coincidencia palabra por palabra. La advertencia de costuras sigue vigente para el resto del título.
release_point: PL 119-121 (corte 2026-10-09); secciones de la oleada 1 verificadas al PL 119-134 (corte 2026-10-20)
archivo_fuente: ~/workspace/goals/meta-ai-hackathon-2026-aplicaci-n-de-noa-guardian/files/corpus-federal/titulos-prioritarios/ (ver lista)
---

# Compañero §3 — USC Título 42 (6 PDFs parciales)

El Título 42 no se descargó como un solo PDF; está en 6 parciales cuyos rangos de capítulos, tomados de los nombres de archivo, son:

| Archivo | Capítulos / secciones |
|---|---|
| `usc42_ch1to6A_Secs1to300mm-64@119-121.pdf` | ch. 1–6A (§§ 1–300mm-64) |
| `usc42_ch7to7A_Secs301to1400v@119-121.pdf` | ch. 7–7A (§§ 301–1400v) |
| `usc42_ch8to39_Secs1401to3259@119-121.pdf` | ch. 8–39 (§§ 1401–3259) |
| `usc42_ch40to81_Secs3271to6892@119-121.pdf` | ch. 40–81 (§§ 3271–6892) |
| `usc42_ch82to123_Secs6901to11851@119-121.pdf` | ch. 82–123 (§§ 6901–11851) |
| `usc42_ch124to165_Secs11901to19531@119-121.pdf` | ch. 124–165 (§§ 11901–19531) |

**Advertencia de costuras (heredada del informe de cobertura):** los rangos parecen contiguos (6A→7, 7A→8, 39→40, 81→82, 123→124), pero hay saltos de numeración de secciones entre parciales (p. ej. § 3259 → § 3271; § 11851 → § 11901) que pueden ser huecos reales del propio USC (secciones reservadas/derogadas) o costuras de descarga. **No declarar el título «completo» hasta verificar las costuras en la ingesta (Día 4).**

Fragmentos de la oleada 1 (2026-10-27), verificados contra el texto vigente:

## § 423(d) — Qué significa «disability» para el Seguro Social

«(d) ''Disability'' defined — (1) The term ''disability'' means— (A) inability to engage in any substantial gainful activity by reason of any medically determinable physical or mental impairment which can be expected to result in death or which has lasted or can be expected to last for a continuous period of not less than 12 months» Y la vara de medir — § 423(d)(2)(A): «An individual shall be determined to be under a disability only if his physical or mental impairment or impairments are of such severity that he is not only unable to do his previous work but cannot, considering his age, education, and work experience, engage in any other kind of substantial gainful work which exists in the national economy, regardless of whether such work exists in the immediate area in which he lives, or whether a specific job vacancy exists for him, or whether he would be hired if he applied for work.»

## § 1382(a) — Elegibilidad para SSI (Supplemental Security Income)

«(a) ''Eligible individual'' defined — (1) Each aged, blind, or disabled individual who does not have an eligible spouse and— (A) whose income, other than income excluded pursuant to section 1382a(b) of this title, is at a rate of not more than [el límite del estatuto] […] and (B) whose resources, other than resources excluded pursuant to section 1382b(a) of this title, are not more than [el límite aplicable], shall be an eligible individual for purposes of this subchapter.» En palabras llanas verificadas por el texto: SSI es para personas **mayores (aged), ciegas (blind) o con discapacidad (disabled)** cuyos ingresos y recursos quedan bajo los límites del estatuto; los montos exactos vigentes se ajustan por la § 1382f, así que Citizen cita la regla y refiere el monto actual a la fuente oficial (ssa.gov), nunca de memoria.

## § 1395c — Medicare: a quién protege el programa

«The insurance program for which entitlement is established by sections 426 and 426–1 of this title provides basic protection against the costs of hospital, related post-hospital, home health services, and hospice care in accordance with this part for (1) individuals who are age 65 or over and are eligible for retirement benefits under subchapter II of this chapter […] or under the railroad retirement system, (2) individuals under age 65 who have been entitled for not less than 24 months to benefits under subchapter II of this chapter» — es la Parte A de Medicare: hospital, cuidado post-hospitalario, salud en el hogar y hospicio.
