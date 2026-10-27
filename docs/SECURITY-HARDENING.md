# Endurecimiento de seguridad — plan aceptado (26-oct-2026)

Origen: revisión externa del README público (26-oct). Noa evaluó los cinco puntos contra `docs/CONTRACTS.md` y `docs/SECURITY-AUDIT.md`: **los cinco se aceptan**. Tres ya existían por dentro (aviso de voz del navegador S-01, abstención extractiva de Citizen, claves fuera del código); la falla era que el README prometía de más y faltaban dos piezas reales (endurecer el Dock como API y una suite adversarial). El README ya quedó corregido el 26-oct; este documento convierte el resto en tareas del sprint.

## 1. Promesa de privacidad = arquitectura híbrida, declarada
- El Dock vive en casa; lo que va a la Meta Model API **sale de la red del usuario** y el README/UI lo dicen: qué se envía (la pregunta o la imagen), a quién (Meta) y cuándo (al pedir razonamiento/segmentación).
- La voz del navegador puede procesarse con el proveedor del navegador (S-01) hasta que el Dock tenga ASR local; la UI indica la ruta activa.
- «Nada se almacena» se limita a lo comprobable en la app: sin base de datos de usuario, sin cuentas, sin rastreo. La retención del proveedor no se promete.

## 2. Agentes de construcción ≠ aplicación en uso
- Los 7 especialistas **solo construyen y prueban**; NO forman parte del producto ni toman decisiones mientras una persona usa NOA.
- En ejecución, las únicas operaciones son fijas y concretas: consultar alertas oficiales, recuperar fragmentos del corpus citado, analizar una imagen.
- Agentes del laboratorio aislados, sin credenciales de producción, y nada se publica sin revisión de WD. **Los permisos se imponen con código; `AGENTS.md` y los prompts no son barreras de seguridad.**
- **Los agentes que desarrollan NOA no pueden desactivar, modificar ni eludir los controles que supervisan su trabajo** (auditoría, límites, revisión de WD): los permisos viven fuera del modelo y se aplican con mínimo privilegio.
- En ejecución, NOA (un solo asistente) interpreta solicitudes y selecciona entre las herramientas autorizadas; **el Dock aplica los permisos y ejecuta las operaciones delimitadas**. NOA no se concede permisos ni administra infraestructura.

## 3. El Dock se trata como una API, aunque esté en casa (Día 2, con `/see`)
- Emparejamiento del teléfono + autenticación en los endpoints; sesiones revocables.
- HTTPS para acceso real desde el teléfono (la cámara/voz lo exigen de todos modos).
- Límites de solicitudes y de tamaño de imagen; lista de destinos externos permitidos.
- **Tope de gasto impuesto por el Dock** (el registro en `BUDGET-LOG.md` no basta: registrar no impide gastar).
- Claves solo en el servidor (variables de entorno/bóveda), nunca en el cliente ni en el repo. CORS no sustituye autenticación.
- Fuera de casa: solo acceso privado autenticado (red privada); **no se abren puertos** al internet.
- **Avance 26-oct (revisión externa con reproducción):** token de emparejamiento implementado en el gateway (`DOCK_TOKEN` → cabecera `X-Dock-Token`, 401 sin ella; `/health` abierto) y en la PWA (guardado por dispositivo vía `?dock_token=`). **Activación pendiente: redesplegar el Dock de la mini con `DOCK_TOKEN` definido** (Día 2). Sesiones revocables y límites de frecuencia/tamaño siguen en el plan del Día 2.

## 4. Todo lo que NOA ve o lee es dato no confiable
- Un cartel, un documento o una respuesta externa pueden traer instrucciones maliciosas: se describen, **no se obedecen**; jamás cambian permisos, revelan secretos ni activan herramientas.
- Citizen: cada afirmación debe corresponder a un fragmento recuperado; sin respaldo → **abstención**. Tener cita no prueba que la interpretación sea correcta: las respuestas se quedan cerca del texto del fragmento.

## 5. Fallar de forma visible, y demostrarlo con pruebas
- Estados visibles en la UI: **conectado · datos vencidos · sin cobertura · simulación**. Sin conexión jamás se presenta como «todo está seguro».
- Cada alerta conserva fuente, fecha, caducidad y zona.
- Suite adversarial (Día 7): acceso no autorizado al Dock, instrucciones maliciosas en texto frente a la cámara, escaneo de filtración de claves en el repo, caída del Dock a mitad de sesión, agotamiento del presupuesto de API.
- Los resultados actuales (15/15 estructural, 11/11 Guardian, 13/13 Dock — reverificados el 27-oct-2026 sobre la base migrada, Etapa A) son QA funcional, **no** prueba de seguridad integral — y así se describen.

## Error concreto corregido en las instrucciones
- `localhost:8000` en el teléfono apunta al propio teléfono. El README ahora distingue: computadora (localhost) vs. teléfono (dirección LAN de la PC + HTTPS para cámara/micrófono; en HTTP local, modo solo texto, declarado).

## 6. Bucle de contención ante inyección de prompt (plan de WD, 27-oct-2026)
Quien hable con el modelo intentará desviarlo: instrucciones de anulación («ignora tus reglas»), suplantación de sistema o de desarrollador, cargas codificadas (base64, secuencias numéricas, leetspeak masivo), texto en imágenes/OCR que ordena acciones, o intentos de extraer el prompt interno, las llaves o el presupuesto. La respuesta del sistema NO es cumplir ni discutir: es **contener hasta fundir el intento**.

1. **Detectar (en el Dock, antes del modelo):** puntuación de señales de inyección sobre TODA entrada no confiable — texto del usuario, OCR, transcripciones y salidas de fuentes externas. Al superar el umbral, la sesión queda marcada, sin avisar al atacante (declararlo enseña a evadir).
2. **Contener (el bucle):** la sesión marcada recibe solo el repertorio fijo y seguro de NOA (los tres modos y sus operaciones delimitadas), con **retardos progresivos** (tarpit). Ninguna herramienta nueva se habilita, ningún proveedor cambia, ningún presupuesto se mueve. El atacante puede hablar indefinidamente contra una superficie que no puede cumplir lo que pide: su esfuerzo se funde, el sistema no cede ni filtra un oráculo de error útil.
3. **Cerrar:** tras 3 marcas en una sesión, esta se **bloquea** y solo el propietario la reactiva desde su emparejamiento. Queda registrado un evento mínimo de seguridad (hora y tipo de señal; sin contenido personal), dentro de lo permitido en §7 del prompt de migración.
- **Invariante interior:** el bucle es la muralla exterior. Aunque la detección fallara, el modelo no posee permisos: el Dock valida cada llamada contra esquema, autorización y presupuesto. Nada que inyectar puede conceder lo que la arquitectura no tiene.
- **Límite declarado:** no hay contraataque ni represalias fuera del sistema; «fundir» significa agotar el intento contra la contención, nada más.
- **Implementación:** Etapa B (gateway: screening, tarpit, bloqueo de sesión) y Etapa D (salidas del modelo como dato no confiable).
- **Estado (27-oct-2026):** la parte de gateway quedó **implementada y probada** en la Etapa B (`apps/dock/src/containment/`, ADR-016): puntuación de señales ES/EN + heurísticas de codificación, marca silenciosa, tarpit 1.5 s/6 s, bloqueo a la 3.ª marca, reactivación del propietario con el token del Dock y eventos mínimos sin contenido. Pendiente: la extensión a las salidas del modelo (Etapa D). **Pruebas:** la suite adversarial (§5) añade inyección en texto, imagen y respuesta externa contra el bucle, con criterio: cero herramientas no autorizadas ejecutadas y cero secretos revelados.
