# Propuesta — Centinela cibernético (extensión de Guardian Mode)

Estado: **PROPUESTA de WD (2026-10-22), pendiente de veredicto de alcance.** No entra al plan del sprint hasta que WD decida: stretch tras el núcleo o Fase 2. Guardian sigue independiente de todo proyecto anterior; esto es una función nueva de Guardian, no una importación.

## La idea (de WD)
Guardian no solo cuida a la persona en la calle: también vigila su entorno digital. Un agente centinela que avisa por voz en los lentes cuando detecta señales de ataque — una IP comprometida, un dispositivo extraño emitiendo cerca, una vulnerabilidad crítica recién publicada que afecta a tus sistemas — con la noticia de ciberseguridad siempre actualizada desde fuentes oficiales.

## Cómo encaja en la arquitectura (sin cambiarla)
- **Un servicio más del Dock:** `sentinel`, hermano de `feeds` y `dispatch`. Los lentes no cargan nada nuevo: consultan igual.
- **El bot administrador que describió WD:** un agente con un modelo ligero y local (los hay que pesan poco y responden rápido) hace de comunicador: recibe los eventos de todos los servicios, decide qué merece interrumpir y lo dice por voz — «llegó tal alerta» — mientras los demás agentes trabajan en lo suyo. Es el rol de `gateway`/`brain` del Dock con un modelo pequeño para la mensajería y Muse Spark para el análisis serio.
- **Todo con la misma regla de honestidad:** cada alerta lleva fuente y nivel de confianza; lo no verificado se etiqueta «reportado, no verificado». Nada de «te están hackeando» sin evidencia: se reportan señales, no pánico.

## Fuentes (oficiales y verificables)
- **CISA KEV** — vulnerabilidades explotadas activamente (catálogo oficial, actualizado).
- **NVD / CVE** — vulnerabilidades nuevas con severidad.
- **Avisos oficiales** de fabricantes y de las plataformas que el usuario usa.
- Nada de rumores de redes sociales como fuente de alerta.

## Detección local (lo que sí se puede en el prototipo)
1. **Inventario de la red de casa (vía Dock):** dispositivos conocidos vs. desconocidos; un dispositivo nuevo que se une a la LAN genera alerta («dispositivo no reconocido en tu red»).
2. **Señales cercanas (vía teléfono/lentes):** balizas BLE y redes Wi-Fi nuevas o inusuales alrededor — detección de **presencia y comportamiento**, jamás identidad, con la misma regla dura del proyecto.
3. **Fase posterior (hardware de WD):** su ESP32 Marauder como sensor RF dedicado ampliaría el oído del centinela. Fuera del sprint; es su laboratorio, no una dependencia.

## Límites honestos (declarados desde el día uno)
- Un sniffer **pasivo** no emite: nadie puede detectarlo por radio. El centinela detecta emisores activos y anomalías, no fantasmas.
- «IP comprometida» se afirma solo con fuente (listas oficiales/reputadas); si no, es señal a revisar.
- El centinela **avisa y explica**; no bloquea ni contraataca nada. Cero acciones ofensivas.

## Alcance si WD lo aprueba como stretch del sprint
Vigilancia de CISA KEV + titulares oficiales filtrados por relevancia → alertas por voz vía el bot administrador; detector de dispositivo nuevo en la LAN del Dock. Criterio de aceptación: una alerta real de KEV y una de dispositivo nuevo, ambas con fuente, demostradas en el teléfono.
