# Puerta de verificación de SAM 3.1 (Etapa D, pieza D4)

**Regla de la puerta (plan aprobado 2026-10-28):** documentar endpoint,
formato y costo desde la fuente oficial de Meta ANTES de gastar un solo
crédito llamando. Nada de adivinar endpoints con los créditos de WD.

## Verificado el 2026-10-29 (fuentes oficiales de Meta)

- **SAM 3.1 SÍ se sirve en la Meta Model API** — página oficial del modelo
  (developer.meta.com/ai/models/sam-3-1): «Detect, segment and track objects
  in images and video on Meta Model API, with nothing to host or tune.»
  Comparte llave, documentación y facturación con el resto de modelos Meta.
- **Capacidad:** detección + segmentación a nivel de píxel + seguimiento en
  video con identidad, en una sola llamada; prompt de texto (una frase corta
  nominal) → devuelve caja y máscara por cada coincidencia. Zero-shot.
- **Costo oficial:** imagen **$2.50 / 1.000 imágenes**; video **$0.20 /
  1.000 fotogramas**. (20 imágenes sintéticas de prueba ≈ $0.05.)
- **Modelo en la cuenta:** `sam-3.1` aparece en el catálogo de la Meta Model
  API (verificado con el conector el 2026-10-28).

## Pendiente (la puerta NO está cruzada todavía)

- **Endpoint exacto y esquema petición/respuesta:** la página oficial enlaza
  la documentación y los cookbooks («Quickstart», «SAM Overview»,
  «Segmenting»), pero la ruta concreta de la API no quedó establecida desde
  el texto oficial accesible en esta revisión (2026-10-29). Sin endpoint
  documentado **no se hace la llamada de prueba**.
- Cuando el endpoint conste en la documentación oficial: prueba de 20 casos
  con imágenes SINTÉTICAS (regla de los créditos: nada personal), prompt
  fijo «person», y aceptación = devuelve cajas/máscaras utilizables para el
  difuminado de Awareness en la mayoría de los casos.
- **Si la puerta no se cruza antes del 2-nov:** Awareness sigue con la ruta
  D6 (visión con Spark para describir la escena) y el difuminado queda como
  trabajo futuro declarado — jamás se anuncia segmentación sin tenerla.
  La alternativa local (YOLOv8n-seg, solo clase persona) queda registrada
  como ruta de respaldo post-hackathon, no del sprint.

## Por qué importa

SAM 3.1 es la pieza que convierte «uso de herramientas Meta AI» (25 % de
la rúbrica) en algo demostrable en el modo Awareness: segmentar personas
para difuminarlas en lo grabado/compartido, sin identificar a nadie.
La puerta existe para no quemar créditos ni credibilidad adivinando.
