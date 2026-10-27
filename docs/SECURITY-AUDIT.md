# Auditoría de seguridad y privacidad — Scaffold NOA Guardian
**Rol:** 5 · Seguridad y Privacidad · **Fecha:** 2026-10-21 · **Tipo:** auditoría de hito previa a la API (estática, basada en evidencia reproducible)
**Alcance:** `index.html`, `app.js`, `sw.js`, `styles.css`, `manifest.webmanifest`, `assets/icon.svg`.
**Foto de la versión auditada** (otro rol editó `app.js` durante la auditoría; esta es la versión final verificada): `app.js` 330 líneas, md5 `3877c01107322a37c9aef15b339b781e` · `sw.js` 35 líneas, md5 `ef7f6191a9ce7950a5e9c0caa539911e` · `index.html` 82 líneas, md5 `ba207e822904a8faf3c610d34f5633eb`. Si `app.js` vuelve a cambiar, las referencias de línea y esta auditoría deben refrescarse.
**Método:** lectura completa de los 6 archivos + baterías `grep` reproducibles (sección 8) + validación de sintaxis (`node --check`) y de manifiesto (JSON). No se cambió código ni se hizo commit en esta pasada.

## Veredicto ejecutivo
La afirmación del scaffold «nada se almacena» es **cierta para datos del usuario y falsa si se lee literal**: el código no escribe preguntas, fotos, audio ni ubicación en ningún almacenamiento persistente (sin localStorage, sessionStorage, IndexedDB ni cookies), pero el service worker sí persiste la **cáscara estática** de la app en Cache Storage entre sesiones. La red del código tiene **un solo destino externo**: `api.weather.gov`. No hay secretos, rastreadores ni reconocimiento facial. Hay **1 hallazgo alto** (la voz puede salir del dispositivo por los servicios del navegador), **3 medios** (cámara viva tras capturar, foto retenida en el DOM, cáscara cache-first sin revalidación) y **3 bajos/informativos**.

## 1. Persistencia — qué se guarda y qué no
Evidencia (`grep -RInE 'localStorage|sessionStorage|indexedDB|openDatabase|document\.cookie|caches\.|serviceWorker\.register'`): los únicos resultados son el comentario de `app.js:4`, el registro del SW en `app.js:329` y las operaciones de caché de `sw.js:15,21,22,33`. **No existe** ninguna llamada a `localStorage`, `sessionStorage`, `indexedDB` ni `document.cookie` en todo el scaffold.
- **Preguntas del usuario:** viven solo en el `<input>` y en variables de página (`app.js:177-195`); el campo lleva `autocomplete="off"` (`index.html:57`). Sin registro en consola: `grep console\.` = 0 resultados; sin telemetría (ver §3).
- **Foto:** se dibuja en un `<canvas>` y pasa a un data URL JPEG en el atributo `src` de un `<img>` del DOM (`app.js:268`), y en modo Awareness se copia como `imageBase64` al objeto de entrada **en memoria** de `askGuardian` (`app.js:181-183`), que hoy es un mock local que no la transmite. No hay subida: `grep 'FormData|method:|body:'` = 0 resultados. Matiz de retención en §6, hallazgo S-03.
- **Ubicación:** no se guarda; se usa dentro del callback de `getCurrentPosition` para construir la consulta a NWS (`app.js:284-292`) y no se asigna a ninguna variable persistente ni almacenamiento.
- **Audio:** el código no graba ni guarda audio; la cámara se pide con `audio: false` (`app.js:234-237`). El reconocimiento de voz es el caveat de S-01.
- **Lo único persistente entre sesiones:** Cache Storage con la cáscara (§2) y el propio registro del service worker. Ningún dato del usuario entra ahí (no existe `cache.put` en el código; solo `addAll(SHELL)` al instalar).

## 2. Service worker (`sw.js`) — qué cachea y cómo se actualiza
- **Contenido exacto de la caché** (`sw.js:4-12`, caché `noa-guardian-v1`): `./`, `./index.html`, `./styles.css`, `./app.js`, `./manifest.webmanifest`, `./assets/icon.svg`. Solo recursos estáticos propios; se precargan con `cache.addAll(SHELL)` en `install` (`sw.js:15`). **Ninguna respuesta de API, foto ni audio puede entrar**: el manejador `fetch` devuelve sin interceptar todo origen distinto (`sw.js:31`: `if (url.origin !== self.location.origin) return;`) y para el mismo origen **nunca escribe** en caché — solo `caches.match(...) || fetch(...)` (`sw.js:33`).
- **Estrategia:** cache-first para el mismo origen; red directa para lo demás. `activate` borra toda caché cuyo nombre ≠ `noa-guardian-v1` (`sw.js:19-24`) y toma control con `skipWaiting()` + `clients.claim()` (`sw.js:16,25`).
- **Debilidades:** la frescura depende de que cambie el byte de `sw.js` y de subir a mano la constante `CACHE`; no hay revalidación de `index.html`/`app.js` ni aviso de actualización al usuario, y el error de registro se traga en silencio (`app.js:329`, `.catch(() => {})`). Ver S-04 y S-06.

## 3. Red — inventario completo de destinos
Evidencia (`grep -RInE 'fetch\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|https?://'` + revisión de `src=`/`href=`/`url(`):
| Destino | Origen en el código | Qué viaja |
|---|---|---|
| Mismo origen (hosting propio): `index.html`, `styles.css`, `app.js`, `manifest.webmanifest`, `assets/icon.svg`, `sw.js` | `index.html:9-11,16,80`; `sw.js:5-12` | Solo la cáscara estática. Sin fuentes, scripts ni imágenes externas (`styles.css` no contiene ningún `url(`). |
| **`https://api.weather.gov`** — único destino externo | `app.js:289-290`: `GET /alerts/active?point=<lat>,<lon>` con `Accept: application/geo+json` | Latitud/longitud redondeadas a 4 decimales. Es la fuente oficial NWS del contrato §2. |
| Servicios de voz del **navegador** (no es un endpoint del código) | `app.js:203-229` (Web Speech: reconocimiento y síntesis) | El navegador puede procesar el audio de la pregunta —y el texto de la respuesta— con su proveedor. No controlable desde el código: hallazgo S-01. |

Sin `XMLHttpRequest`, `WebSocket`, `EventSource` ni `sendBeacon`. Sin rastreadores: `grep -i 'analytics|gtag|segment|mixpanel|sentry|hotjar|pixel|beacon'` = **0 resultados**. El `xmlns="http://www.w3.org/2000/svg"` de `assets/icon.svg:1` es un identificador de espacio de nombres XML, **no** una petición de red. El texto del usuario y las alertas se insertan con `textContent`; los tres únicos `innerHTML` del código (`app.js:108,189,296`) solo vacían contenedores (`= ""`), así que no hay inyección HTML desde datos de la API ni del usuario en este scaffold.

## 4. Secretos
Evidencia (`grep -RInEi 'api[_-]?key|access[_-]?token|bearer |password|private[_-]?key|client[_-]?secret|sk-|ghp_|github_pat_|AKIA…'`) = **0 resultados**. No hay claves, tokens ni credenciales embebidos en ningún archivo auditado; el scaffold no usa ninguna API con clave (NWS es abierta). Cumple la regla dura 4 en el estado actual; la re-auditoría es obligatoria el Día 1, cuando entre la Meta Model API.

## 5. Permisos — cuándo se piden
Todos los sensores se activan **solo tras un gesto del usuario** (evidencia: cada API vive dentro de un manejador `click`):
| Sensor/servicio | Disparador | Evidencia | Notas |
|---|---|---|---|
| Cámara | Botón «Activar cámara» | `app.js:232-237` (`getUserMedia({video:{facingMode:"environment"}, audio:false})`) | Sin micrófono en esta petición. El atributo `autoplay` del `<video>` (`index.html:28`) no enciende nada: no hay stream hasta el clic. |
| Micrófono (voz) | Botón 🎙️ | `app.js:215-228` (`rec.start()` dentro del `click`) | El permiso lo media el navegador. Caveat de procesamiento externo: S-01. |
| Geolocalización | Botón «Consultar alertas oficiales (NWS)» | `app.js:277-284` (`getCurrentPosition` dentro del `click`) | Una sola lectura, sin `watchPosition`; opciones solo `{timeout: 10000}` (sin `enableHighAccuracy`, precisión por defecto). |
| Síntesis de voz | Botón «Escuchar respuesta» | `app.js:203-212` | No es un permiso, pero comparte el caveat S-01. |
| — | Al cargar la página | `app.js:327-330` | Solo se pinta la UI (`setMode`) y se registra el service worker: **ningún sensor se toca sin gesto**. |

## 6. Hallazgos (severidad y corrección concreta)
**S-01 · ALTA — bloqueante para la afirmación pública de privacidad.** La entrada por voz usa `SpeechRecognition`/`webkitSpeechRecognition` (`app.js:216,228`) y la salida usa `speechSynthesis` eligiendo la primera voz en español disponible (`app.js:207-210`, sin filtrar por `localService`). En navegadores cuyo reconocimiento/síntesis es un servicio de red, **el audio de preguntas potencialmente sensibles (legales, de seguridad) y el texto de las respuestas pueden salir del dispositivo hacia el proveedor del navegador**, fuera del inventario de red del código y sin aviso al usuario. *Corrección:* (1) microcopy explícito antes del primer uso de voz («el reconocimiento lo procesa tu navegador y puede enviar el audio a su proveedor»); (2) en TTS, preferir voces con `localService === true` y avisar si no hay ninguna; (3) al conectar el Dock, sustituir por ASR/TTS locales (Whisper) y dejar Web Speech solo como respaldo declarado. Mientras tanto, no afirmar «todo se procesa localmente».

**S-02 · MEDIA — la cámara sigue viva después de capturar.** El clic en «Capturar entorno» oculta el `<video>` (`app.js:270`) pero **no detiene los tracks**: el stream sigue activo hasta que el usuario pulsa «Detener» (`stopCamera`, `app.js:252-258`) o cierra la página. El usuario puede creer que la cámara se apagó al ver la foto. *Corrección:* detener los tracks al capturar (la foto ya quedó en el canvas) o mantener un indicador visible de «cámara activa»; añadir limpieza en `pagehide`.

**S-03 · MEDIA — la foto capturada no se borra al detener ni al cambiar de modo.** `stopCamera` y `setMode` no limpian `snapshotImg.src` (data URL JPEG completo) ni el canvas: la imagen queda en el DOM, oculta o visible, durante el resto de la sesión de página (`app.js:252-258` frente a `268`). Es memoria volátil, no disco, pero contradice el «se borra al instante» del pie de página. *Corrección:* en `stopCamera`, en `setMode` y al activar de nuevo la cámara: quitar el `src`, ocultar la imagen y limpiar el canvas (`canvas.width = 0`); ofrecer un botón «Borrar foto».

**S-04 · MEDIA — cáscara cache-first sin revalidación: las correcciones pueden no llegar.** Con `caches.match || fetch` (`sw.js:33`) y sin control de versiones automático, un `app.js` vulnerable o corregido puede seguir sirviéndose desde Cache Storage hasta que `sw.js` cambie de bytes y alguien suba `CACHE` a mano; no hay `updatefound` ni aviso, y el fallo de registro es silencioso (`app.js:329`). *Corrección:* atar `CACHE` al hash/versión de build en el proceso de publicación, usar network-first o stale-while-revalidate para `index.html`/`app.js`, y notificar «hay una versión nueva» al usuario.

**S-05 · BAJA — la ubicación sale con precisión de ~11 m como query GET.** Redondear a 4 decimales (`app.js:290`) aún equivale a ~11 m en latitud; la URL puede quedar en registros del proveedor (NWS) y del navegador. Es un envío iniciado por el usuario y necesario para alertas por punto, pero no está declarado en la UI. *Corrección:* evaluar redondeo a 3 decimales (~111 m) si la precisión de alertas lo tolera, y microcopy junto al botón: «tu ubicación se envía al NWS (fuente oficial) para consultar alertas».

**S-06 · BAJA — `activate` borra cachés ajenas del mismo origen.** El filtro `k !== CACHE` (`sw.js:22`) eliminaría también las cachés de otra app servida en el mismo origen. *Corrección:* borrar solo las del prefijo propio: `k.startsWith("noa-guardian-") && k !== CACHE`.

**S-07 · INFORMATIVA — sin política de seguridad de contenido en el repo.** No hay CSP ni cabeceras (dependen del hosting, fuera de este alcance). El riesgo hoy es bajo (cero scripts externos; inserción por `textContent`), pero la cabecera es defensa en profundidad barata. *Corrección al desplegar:* CSP restrictiva (`default-src 'self'; connect-src 'self' https://api.weather.gov; img-src 'self' data:; script-src 'self'; style-src 'self'; worker-src 'self'`) y `X-Content-Type-Options: nosniff`; verificar en la auditoría del Día 5 contra el hosting real.

## 7. Reglas duras y contratos tocados
- **Regla 1 (cero reconocimiento facial): CUMPLE.** No existe código de detección/reconocimiento facial ni biométrico: la búsqueda de términos (`face|facial|biometric|faceapi|identif`) solo devuelve el texto de la nota de privacidad y `SpeechRecognition` (voz).
- **Regla 2 (nada se almacena del usuario): CUMPLE con matices.** Sin persistencia de datos del usuario (§1); los matices son la cáscara en Cache Storage (§2) y la retención en memoria de la foto (S-03). La frase pública debería ser «no se almacenan tus datos», no «nada se almacena» a secas.
- **Regla 4 (claves fuera del código): CUMPLE** (§4).
- **Contrato §1:** `imageBase64` y `location` viajan solo en memoria hacia `askGuardian`; el mock no los persiste ni los transmite — conforme. **Contrato §2:** la única fuente de alertas es NWS y el error de red se reporta sin inventar alertas (`app.js:313-316`) — conforme.

## 8. Comandos reproducibles (extracto)
```bash
cd ~/workspace/noa-guardian
FILES='index.html app.js sw.js styles.css manifest.webmanifest assets/icon.svg'
grep -RInE 'localStorage|sessionStorage|indexedDB|openDatabase|document\.cookie|caches\.|serviceWorker\.register' $FILES
grep -RInE 'fetch\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|https?://' $FILES
grep -RInEi 'api[_-]?key|access[_-]?token|bearer |password|private[_-]?key|client[_-]?secret|sk-|ghp_|AKIA' $FILES   # → sin resultados
grep -RInEi 'analytics|gtag|segment|mixpanel|sentry|hotjar|pixel|beacon' $FILES                                   # → sin resultados
grep -nE 'getUserMedia|getCurrentPosition|SpeechRecognition|speechSynthesis|rec\.start' index.html app.js
grep -nE 'imageBase64|toDataURL|snapshotImg|stopCamera|video\.hidden' app.js
node --check app.js && node --check sw.js && python3 -m json.tool manifest.webmanifest >/dev/null   # → OK
```

## 9. Riesgos abiertos y fuera de alcance
- **El Día 1 cambia el inventario de red** (Meta Model API ± Dock): esta auditoría caduca para esa integración y debe repetirse antes del hito del Día 5, incluyendo a dónde viajan `imageBase64` y las preguntas cuando `askGuardian` sea real.
- **Cabeceras del hosting** (CSP, HSTS) no verificables desde el repo (S-07).
- **Comportamiento de voz dependiente del navegador/dispositivo**: S-01 debe validarse en el teléfono real de WD (qué proveedor procesa y qué voces son locales).
- Trabajo concurrente en el repo: `app.js` cambió una vez durante esta auditoría (refactor a `askGuardian` del rol 2/3); la foto de hashes de la cabecera fija la versión auditada.
