"use strict";
/* NOA Guardian — lógica del scaffold (demo local).
   Principios que este código respeta desde el día cero:
   - Nada se almacena: sin localStorage, sin subir fotos, sesión efímera.
   - Citizen nunca inventa leyes: responde solo desde el corpus verificado
     y lo admite cuando un tema aún no está en el corpus.
   - Guardian define el peligro por ZONA y COMPORTAMIENTO, nunca por identidad.
*/

const $ = (id) => document.getElementById(id);

const MODES = {
  guardian: {
    title: "Guardian — seguridad por zona y comportamiento",
    desc: "Alertas oficiales por ubicación y lectura de riesgo del entorno. El peligro se define por zona y por comportamiento, jamás por la identidad de una persona.",
    placeholder: "Ej.: ¿hay algo peligroso cerca de mí?",
    examples: [
      "¿Hay algo peligroso cerca de mí?",
      "¿Es seguro salir ahora?",
      "¿Qué alertas oficiales hay para mi zona?"
    ]
  },
  citizen: {
    title: "Citizen — inteligencia legal con citas",
    desc: "Respuestas desde fuentes oficiales, con cita y jurisdicción. Orientación informativa, no asesoría legal. Si el corpus no lo cubre, Guardian lo dice.",
    placeholder: "Ej.: ¿puedo grabar esta conversación en Pensilvania?",
    examples: [
      "¿Puedo grabar esta conversación en Pensilvania?",
      "Mi arrendador no me devuelve el depósito",
      "Un contratista me cobró y no terminó el trabajo"
    ]
  },
  awareness: {
    title: "Awareness — comprensión del entorno",
    desc: "Captura una foto del entorno y Guardian la describe pensando en tu seguridad. En el scaffold la lectura es básica; la visión completa llega con la Meta Model API (Día 2 del plan).",
    placeholder: "Ej.: describe riesgos en esta foto",
    examples: ["Describe riesgos en esta foto", "¿Qué salidas se ven aquí?"]
  }
};

/* ---------- Corpus verificado (Fase 0) — extractos con cita ---------- */
const CITIZEN_KB = [
  {
    keys: ["grabar", "grabación", "grabacion", "llamada", "conversación", "conversacion", "wiretap", "parada de tráfico", "parada de trafico"],
    answer:
      "En Pensilvania NO puedes grabar una conversación privada sin el consentimiento de TODAS las partes. Pensilvania es un estado de consentimiento de dos partes: interceptar o grabar una comunicación privada sin ese consentimiento es un delito grave de tercer grado. La excepción práctica: si avisas y la otra parte sigue hablando, o si la conversación ocurre donde no hay expectativa razonable de privacidad. Regla segura: pide permiso en voz alta antes de grabar. Nota práctica: el riesgo legal está en interceptar el audio de una comunicación privada; grabar video sin audio reduce ese riesgo, aunque no lo elimina si hay conversación privada de por medio. Y documenta también los hechos por escrito (fecha, hora, lugar y nombres) mientras los recuerdas. Esto es orientación informativa, no asesoría legal.",
    citations: [
      "Pennsylvania Wiretap Act, 18 Pa.C.S. § 5703 (interceptación ilegal) y § 5704 (excepciones) — palegis.us",
      "Jurisdicción: Pensilvania, EE. UU."
    ]
  },
  {
    keys: ["depósito", "deposito", "arrendador", "inquilino", "alquiler", "renta", "landlord"],
    answer:
      "En Pensilvania, al terminar el contrato y entregar la vivienda, el arrendador tiene 30 días para devolverte el depósito de seguridad. Si retiene alguna parte por daños, dentro de ese mismo plazo debe darte una lista escrita de los daños y devolverte el resto. Si no lo hace, pierdes el derecho a retener suma alguna y el inquilino puede demandar hasta el doble de la cantidad debida más costas. Esto es orientación informativa, no asesoría legal.",
    citations: [
      "68 P.S. § 250.512 (devolución del depósito de seguridad) — estatutos de Pensilvania",
      "Guía de inquilinos y propietarios, Fiscalía General de Pensilvania (attorneygeneral.gov)",
      "Jurisdicción: Pensilvania, EE. UU."
    ]
  },
  {
    keys: ["contratista", "estafa", "cobró", "cobro", "no terminó", "no termino", "consumidor", "tienda", "reembolso", "desapareció", "desaparecio", "remodelación", "remodelacion"],
    answer:
      "Si un contratista de mejoras del hogar en Pensilvania te cobró un adelanto y desapareció, hay dos leyes estatales que te cubren. La Home Improvement Consumer Protection Act (HICPA) solo reconoce el contrato de mejoras si es por escrito y lleva el número de registro del contratista (§ 7); recibir un pago anticipado y no hacer el trabajo ni devolver el dinero en la fecha pactada puede constituir fraude de mejoras del hogar (§ 8(a)(2)), abandonar el proyecto sin justificación está prohibido (§ 9(5)) y, en contratos de más de $5,000, el anticipo no puede superar un tercio del precio total, salvo materiales de pedido especial (§ 9(10)). Violar la HICPA cuenta además como violación de la ley de Protección al Consumidor (UTPCPL, 73 P.S. § 201-2, que define las prácticas comerciales engañosas). Ruta práctica: (1) documenta todo — contrato, pagos, mensajes y fotos; (2) exige por escrito con fecha límite; (3) presenta la queja ante la Oficina de Protección al Consumidor del Fiscal General de Pensilvania. Esto es orientación informativa, no asesoría legal: para montos altos, consulta un abogado con esta documentación lista.",
    citations: [
      "Home Improvement Consumer Protection Act (HICPA), Ley 132 de 2008, §§ 7, 8(a)(2), 9(5) y 9(10) — palegis.us",
      "HICPA § 10: violarla es violar la Unfair Trade Practices and Consumer Protection Law, 73 P.S. § 201-2 — estatutos de Pensilvania",
      "Oficina de Protección al Consumidor del Fiscal General de Pensilvania",
      "Jurisdicción: Pensilvania, EE. UU."
    ]
  },
  {
    keys: ["choque", "accidente", "colisión", "colision", "me puedo ir", "chocaron", "golpeé un carro", "golpee un carro"],
    answer:
      "No te vayas: aunque el choque sea leve, en Pensilvania el Title 75 (Pennsylvania Vehicle Code) te obliga a detenerte en el lugar del accidente o lo más cerca posible y permanecer ahí hasta cumplir tus deberes: intercambiar tu nombre, dirección y número de registro del vehículo con la otra parte, y mostrar tu licencia y la información de responsabilidad financiera (seguro) si te la piden (§§ 3743 y 3744). También debes prestar ayuda razonable a cualquier persona herida, incluida la gestión de su traslado a un hospital si hace falta; si hay heridos o un vehículo quedó inhabilitado y requiere remolque, avisa de inmediato a la policía (§ 3746) — y en emergencias llama al 911. Si no hay heridos graves y tu vehículo puede moverse sin riesgo, después de detenerte puedes moverlo a un refugio seguro fuera de la vía (§ 3745.1), pero eso no te libera de intercambiar la información. Si el vehículo dañado estaba desatendido, debes localizar a su dueño o dejar una nota escrita visible con tus datos y avisar a la policía (§ 3745). Esto es orientación informativa, no asesoría legal.",
    citations: [
      "Pennsylvania Vehicle Code, Title 75 Pa.C.S. §§ 3743 y 3744 (deber de detenerse, dar información y prestar ayuda) — legis.state.pa.us",
      "Title 75 Pa.C.S. §§ 3745, 3745.1 y 3746 (vehículo desatendido, despeje de la escena y aviso inmediato a la policía)",
      "Jurisdicción: Pensilvania, EE. UU."
    ]
  },
  {
    keys: ["spray", "pimienta", "defensa propia", "defenderme", "defender a", "arma", "me ataca", "me atacan"],
    answer:
      "Lo primero no es el spray: si alguien te sigue o te amenaza, tu prioridad es alejarte hacia un lugar público e iluminado y llamar al 911; no confrontes. Sobre la defensa propia, el corpus verificado de Pensilvania (18 Pa.C.S. § 505) dice que usar fuerza contra otra persona solo se justifica cuando crees que es inmediatamente necesario para protegerte de fuerza ilegal en ese mismo momento, y la ley exige que sea fuerza razonable y proporcional a la amenaza: la fuerza mortal tiene límites mucho más estrictos (§ 505(b)(2)) y la misma regla protege a terceros (§ 506). Declaración de hueco: mi corpus no contiene una norma de Pensilvania que regule específicamente el spray de pimienta — su compra, porte o uso como producto — así que no puedo afirmar si ese objeto concreto está permitido ni en qué condiciones; para eso, consulta la fuente oficial o un abogado. Esto es orientación informativa, no asesoría legal.",
    citations: [
      "18 Pa.C.S. § 505 (uso de fuerza en defensa propia) y § 506 (protección de terceros) — legis.state.pa.us",
      "Hueco declarado: el corpus no regula específicamente el spray de pimienta (18 Pa.C.S. Cap. 5, verificado el 2026-10-22)",
      "Jurisdicción: Pensilvania, EE. UU."
    ]
  },
  {
    keys: ["horas extra", "overtime", "me debe", "no me paga", "no me pagaron", "salario", "sueldo", "nómina", "nomina"],
    answer:
      "Las horas extra no pagadas se reclaman, no se regalan: tienes protección estatal y federal. En Pensilvania, la Minimum Wage Act exige pagar el tiempo extra a no menos de vez y media (1.5×) tu tarifa regular por cada hora que exceda 40 en una semana de trabajo (§ 4(c)); a nivel federal, la regla equivalente de horas extra está en la sección 7 de la FLSA (29 U.S.C. § 207). Además, la Wage Payment and Collection Law de Pensilvania obliga a pagar todos los salarios — incluido el tiempo extra — en los días de pago regulares (§ 3) y te permite reclamar lo adeudado, con vías ante el Departamento de Trabajo e Industria de PA y en corte, incluso daños liquidados en los casos que define la ley (§§ 9.1 y 10). Ruta práctica: empieza a documentar tus horas hoy mismo — fechas, horarios, talones de pago y mensajes — y reclama por escrito a tu empleador; si no paga, la vía es el Departamento de Trabajo e Industria de Pensilvania o el Departamento de Trabajo federal (DOL). Esto es orientación informativa, no asesoría legal.",
    citations: [
      "Pennsylvania Minimum Wage Act of 1968, § 4(c) (horas extra a 1.5× tras 40 h/semana), Ley 5 de 1968 — palegis.us",
      "Wage Payment and Collection Law de PA, §§ 3, 9.1 y 10 (días de pago, reclamos y daños liquidados), Ley 329 de 1961 — palegis.us",
      "Fair Labor Standards Act (FLSA), 29 U.S.C. § 207 — Título 29 del corpus federal (release point PL 119-121)",
      "Jurisdicción: Pensilvania, EE. UU. + federal (EE. UU.)"
    ]
  }
];

const GUARDIAN_KB = [
  {
    keys: ["noche", "carro", "estacionamiento", "oscuro"],
    answer:
      "Lectura de entorno (por zona y comportamiento, no por personas): elige rutas iluminadas y transitadas aunque sean más largas; llaves en la mano antes de llegar al carro, no buscando en la puerta; revisa el asiento trasero desde fuera antes de subir; si un vehículo o persona cambia su patrón cuando tú cambias el tuyo (cruza cuando cruzas, espera cuando esperas), entra a un negocio abierto y pide ayuda o llama al 911. Comparte tu ubicación en vivo con alguien de confianza durante el trayecto."
  },
  {
    keys: ["siguiendo", "sigue", "persigue", "detrás", "detras"],
    answer:
      "Si crees que te siguen: no lo confirmes yendo a tu casa. Cambia de dirección dos veces de forma natural; si el patrón se mantiene, dirígete a un lugar público iluminado con gente — una estación de policía o de bomberos es ideal — y llama al 911 describiendo el comportamiento (qué hace, desde cuándo), no la apariencia como juicio. Mantén distancia y no confrontes."
  },
  {
    keys: ["hotel", "habitación", "habitacion", "airbnb", "viaje"],
    answer:
      "Al llegar: verifica que la puerta cierre y trabe sola, usa la cerradura adicional o una cuña portátil; corre la cortina antes de cambiarte; localiza la salida de emergencia y cuenta las puertas hasta ella (sirve en humo y oscuridad); no digas tu número de habitación en voz alta en el lobby. Riesgo por zona: revisa las alertas oficiales del área con el botón de alertas de esta pantalla."
  }
];

/* ---------- Estado ---------- */
let currentMode = "guardian";
let stream = null;
let lastAnswer = "";

/* ---------- Modos ---------- */
function setMode(mode) {
  currentMode = mode;
  document.querySelectorAll(".mode-tab").forEach((b) =>
    b.classList.toggle("active", b.dataset.mode === mode)
  );
  $("modeTitle").textContent = MODES[mode].title;
  $("modeDesc").textContent = MODES[mode].desc;
  $("query").placeholder = MODES[mode].placeholder;
  $("guardianTools").style.display = mode === "guardian" ? "" : "none";
  const ex = $("examples");
  ex.innerHTML = "";
  MODES[mode].examples.forEach((text) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = text;
    btn.addEventListener("click", () => {
      $("query").value = text;
      ask();
    });
    ex.appendChild(btn);
  });
  $("answerBox").hidden = true;
}
document.querySelectorAll(".mode-tab").forEach((b) =>
  b.addEventListener("click", () => setMode(b.dataset.mode))
);

/* ---------- Guardian Dock (contratos §1 y §2, docs/DOCK.md) ----------
   La PWA habla primero con el Guardian Dock (gateway :8080): POST /ask y
   GET /alerts. Si el Dock no responde — o responde 501 porque ese modo
   llega durante el sprint — se usa el respaldo local (el mock de abajo
   para /ask; la consulta directa al NWS para /alerts) y el respaldo se
   ETIQUETA en la UI: honestidad de demo, nada se disfraza de real. */
const DOCK_BASE =
  window.location && location.protocol.startsWith("http")
    ? `${location.protocol}//${location.hostname}:8080`
    : "http://localhost:8080";

/* Emparejamiento con el Dock (corrección 26-oct): si el Dock exige token
 * (DOCK_TOKEN en el despliegue), la PWA lo guarda SOLO en este dispositivo
 * (localStorage) tras recibirlo una vez por la URL de emparejamiento
 * (?dock_token=…) y lo envía en la cabecera X-Dock-Token. Sin token
 * guardado, las llamadas van sin cabecera — un Dock con token responderá
 * 401 y la PWA caerá a su respaldo etiquetado, nunca a un falso éxito. */
const DockPairing = (() => {
  try {
    const fromUrl = new URLSearchParams(location.search).get("dock_token");
    if (fromUrl) {
      localStorage.setItem("dockToken", fromUrl);
      history.replaceState(null, "", location.pathname + location.hash);
    }
    return { token: localStorage.getItem("dockToken") || "" };
  } catch {
    return { token: "" };
  }
})();

async function dockFetch(path, options = {}, timeoutMs = 4500) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  const headers = { ...(options.headers || {}) };
  if (DockPairing.token) headers["X-Dock-Token"] = DockPairing.token;
  try {
    return await fetch(`${DOCK_BASE}${path}`, { ...options, headers, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

/* Última posición conocida (solo en memoria): la reutiliza el modo guardian
 * al preguntar, para no evaluar siempre el punto por defecto del Dock. */
let lastPos = null; // { lat, lon, at }
function getPositionSoft(timeoutMs = 3000) {
  if (lastPos && Date.now() - lastPos.at < 10 * 60 * 1000) {
    return Promise.resolve({ lat: lastPos.lat, lon: lastPos.lon });
  }
  if (!("geolocation" in navigator)) return Promise.resolve(null);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        lastPos = { lat: pos.coords.latitude, lon: pos.coords.longitude, at: Date.now() };
        resolve({ lat: lastPos.lat, lon: lastPos.lon });
      },
      () => resolve(null),
      { timeout: timeoutMs, maximumAge: 10 * 60 * 1000 }
    );
  });
}

/* ---------- Respaldo local (mock) — contrato §1 de docs/CONTRACTS.md ----------
   Este mock SOLO responde cuando el Dock no está disponible, y la UI lo
   etiqueta como respaldo. La interfaz (askGuardian) no cambia. */
function findIn(kb, q) {
  const norm = q.toLowerCase();
  return kb.find((e) => e.keys.some((k) => norm.includes(k))) || null;
}

function mockAnswer(fields) {
  return {
    citations: [],
    source: "mock",
    usage: { model: "mock", inputTokens: 0, outputTokens: 0, costUsd: 0 },
    ...fields
  };
}

async function mockAskGuardian(input) {
  const { mode, text } = input;
  if (mode === "citizen") {
    const hit = findIn(CITIZEN_KB, text);
    if (hit) {
      return mockAnswer({
        text: hit.answer,
        citations: hit.citations,
        jurisdiction: "Pensilvania, EE. UU."
      });
    }
    return mockAnswer({
      text:
        "Ese tema todavía no está en mi corpus verificado de Pensilvania y fuentes federales, así que no voy a improvisar una respuesta legal. En el prototipo completo consulto el texto oficial vigente y respondo con la cita exacta; si el corpus no lo cubre, te lo digo y te derivo a la fuente oficial o a un abogado. Nunca invento leyes.",
      citations: ["Guardarraíl Citizen: respuestas solo desde fuentes oficiales verificadas."],
      jurisdiction: "Pensilvania, EE. UU."
    });
  }
  if (mode === "guardian") {
    const hit = findIn(GUARDIAN_KB, text);
    if (hit) return mockAnswer({ text: hit.answer });
    return mockAnswer({
      text:
        "Regla general de Guardian: evalúa la ZONA (iluminación, salidas, gente, actividad) y los COMPORTAMIENTOS (patrones que cambian contigo, acercamientos repetidos, bloqueo de tu ruta) — nunca quién es alguien. Si algo escala de incómodo a amenazante, crea distancia, entra a un lugar público y llama al 911. ¿Me describes la situación con más detalle?"
    });
  }
  // awareness: la foto llega en input.imageBase64 (solo en memoria, nunca persistida)
  return mockAnswer({
    text: input.imageBase64
      ? "Foto recibida (se procesa en esta sesión y no se guarda). La descripción visual completa llega con la visión de la Meta Model API el Día 2 del plan. Mientras tanto, la revisión manual que enseña Guardian: ¿hay una salida visible y despejada?, ¿la iluminación permite ver rostros y manos a distancia?, ¿hay puntos ciegos entre tú y la salida?, ¿alguien cambió su comportamiento cuando entraste?"
      : "Primero activa la cámara y captura el entorno con el botón «Capturar entorno». La foto se analiza en la sesión y no se almacena."
  });
}

/* ---------- askGuardian: Dock primero; respaldo mock SOLO si no responde --- */
async function askGuardian(input) {
  try {
    const res = await dockFetch("/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input)
    });
    if (res.ok) {
      const ans = await res.json();
      if (ans && typeof ans.text === "string" && Array.isArray(ans.citations)) {
        return { ...ans, origin: "dock" };
      }
    }
    // 501 (modo que llega en el sprint) u otra respuesta no válida → respaldo.
  } catch (err) {
    // Dock sin respuesta (red o timeout) → respaldo local etiquetado.
  }
  const ans = await mockAskGuardian(input);
  return { ...ans, origin: "mock-fallback" };
}

async function ask() {
  const q = $("query").value.trim();
  if (!q) return;
  const input = { mode: currentMode, text: q };
  if (currentMode === "guardian") {
    // La pregunta lleva la ubicación si el usuario la comparte (corrección
    // 26-oct): sin esto, el Dock evaluaba siempre su punto por defecto
    // (Reading) aunque la persona estuviera en otro lugar. Si no hay
    // posición, el Dock lo declara en su respuesta — nunca lo disimula.
    const pos = await getPositionSoft();
    if (pos) input.location = pos;
  }
  if (currentMode === "awareness" && !$("snapshotImg").hidden) {
    // La foto vive solo en memoria de la página: viaja en la llamada, no se guarda.
    input.imageBase64 = $("snapshotImg").src.replace(/^data:image\/\w+;base64,/, "");
  }
  const ans = await askGuardian(input);
  const { text, citations } = ans;
  lastAnswer = text;
  $("answerText").textContent = text;
  const SOURCE_LABELS = {
    corpus: "corpus oficial verificado",
    feeds: "alertas oficiales (NWS · USGS · NASA EONET)",
    model: "modelo (Meta Model API)"
  };
  $("answerSource").textContent =
    ans.origin === "dock"
      ? `Fuente: Guardian Dock — ${SOURCE_LABELS[ans.source] || ans.source}.`
      : "Respaldo local (mock): el Guardian Dock no respondió; esta respuesta es del scaffold y se etiqueta como mock.";
  const list = $("citationList");
  list.innerHTML = "";
  citations.forEach((c) => {
    const li = document.createElement("li");
    li.textContent = c;
    list.appendChild(li);
  });
  $("answerBox").hidden = false;
}
$("btnAsk").addEventListener("click", ask);
$("query").addEventListener("keydown", (e) => {
  if (e.key === "Enter") ask();
});

/* ---------- Voz (Web Speech API, $0) ----------
   S-01 (auditoría 21-oct): Web Speech NO siempre procesa en el dispositivo:
   el navegador puede enviar el audio de la pregunta (ASR) y el texto de la
   respuesta (TTS) a su proveedor. Por eso:
   (1) la UI muestra el aviso en #voiceNote (index.html) ANTES del primer
       uso de voz, y aquí se avisa además si la voz TTS elegida no es local;
   (2) el TTS prefiere voces con localService === true;
   (3) ENGANCHE DOCK: cuando el Guardian Dock ofrezca ASR/TTS locales,
       speakAnswer() y listenByVoice() son el único punto a sustituir
       (cambiar VOICE_BACKEND a "dock" e implementar la rama del Dock).
       Los handlers y askGuardian (contrato §1) no se tocan: la entrada
       sigue entregando solo texto y la salida sigue leyendo lastAnswer.
       Mientras VOICE_BACKEND sea "web-speech", no se afirma que la voz
       se procese 100% localmente. */
const VOICE_BACKEND = "web-speech"; // futuro: "dock" (ASR/TTS locales)

function pickSpanishVoice() {
  const spanish = speechSynthesis
    .getVoices()
    .filter((v) => v.lang && v.lang.toLowerCase().startsWith("es"));
  // S-01: primero una voz local (se procesa en el dispositivo).
  return spanish.find((v) => v.localService) || spanish[0] || null;
}

function speakAnswer() {
  if (!lastAnswer || !("speechSynthesis" in window)) return;
  // ENGANCHE DOCK (TTS local): cuando VOICE_BACKEND === "dock", la llamada
  // al Dock va aquí y, si responde, se retorna sin pasar por Web Speech.
  const u = new SpeechSynthesisUtterance(lastAnswer);
  u.lang = "es-US";
  const voice = pickSpanishVoice();
  if (voice) u.voice = voice;
  $("voiceStatus").textContent =
    voice && voice.localService
      ? ""
      : "Aviso: este navegador no ofrece una voz local en español; la lectura en voz alta puede procesarla el proveedor del navegador.";
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}
$("btnSpeak").addEventListener("click", speakAnswer);

function listenByVoice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    $("query").placeholder = "Este navegador no soporta reconocimiento de voz; escribe tu pregunta.";
    return;
  }
  // ENGANCHE DOCK (ASR local): misma sustitución que en speakAnswer().
  const rec = new SR();
  rec.lang = "es-US";
  rec.interimResults = false;
  rec.addEventListener("result", (e) => {
    $("query").value = e.results[0][0].transcript;
    ask();
  });
  rec.start();
}
$("btnVoice").addEventListener("click", listenByVoice);

/* ---------- Cámara (simula los lentes) ---------- */
$("btnCamera").addEventListener("click", async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false
    });
    $("camera").srcObject = stream;
    $("cameraPlaceholder").style.display = "none";
    $("snapshotImg").hidden = true;
    $("snapshotImg").removeAttribute("src");
    $("camera").hidden = false;
    $("btnCapture").disabled = false;
    $("btnStopCamera").disabled = false;
    $("btnCamera").disabled = true;
  } catch (err) {
    $("cameraPlaceholder").textContent =
      "No se pudo abrir la cámara (permiso denegado o no disponible en este dispositivo).";
    $("cameraPlaceholder").style.display = "";
  }
});

function stopCamera() {
  if (stream) stream.getTracks().forEach((t) => t.stop());
  stream = null;
  // S-03 (auditoría 21-oct): la foto capturada se borra del DOM al detener.
  $("snapshotImg").removeAttribute("src");
  $("snapshotImg").hidden = true;
  const c = $("snapshot");
  c.width = c.width;
  $("btnCapture").disabled = true;
  $("btnStopCamera").disabled = true;
  $("btnCamera").disabled = false;
}
$("btnStopCamera").addEventListener("click", stopCamera);

$("btnCapture").addEventListener("click", () => {
  const video = $("camera");
  const canvas = $("snapshot");
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
  // La foto vive solo en esta página, en memoria. No se sube ni se guarda.
  $("snapshotImg").src = canvas.toDataURL("image/jpeg", 0.85);
  $("snapshotImg").hidden = false;
  video.hidden = true;
  // S-02 (auditoría 21-oct): capturada la foto, la cámara se apaga.
  if (stream) stream.getTracks().forEach((t) => t.stop());
  stream = null;
  $("btnCapture").disabled = true;
  $("btnStopCamera").disabled = true;
  $("btnCamera").disabled = false;
  if (currentMode !== "awareness") setMode("awareness");
  $("query").value = "Describe riesgos en esta foto";
  ask();
});

/* ---------- Alertas oficiales (Guardian Mode) ----------
   Primero el Guardian Dock: GET /alerts agrega NWS + USGS + NASA EONET ya
   normalizadas. Si el Dock no responde, respaldo DIRECTO al NWS (fuente
   oficial), etiquetado como respaldo. Sin ubicación, no se inventa nada. */
function alertCard({ title, body, url }) {
  const card = document.createElement("div");
  card.className = "alert-card";
  const strong = document.createElement("strong");
  strong.textContent = title;
  const span = document.createElement("span");
  span.textContent = body;
  card.append(strong, span);
  if (url) {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = "Fuente oficial";
    card.appendChild(a);
  }
  return card;
}

async function alertsViaDock(latitude, longitude, box) {
  const res = await dockFetch(
    `/alerts?lat=${latitude.toFixed(4)}&lon=${longitude.toFixed(4)}`,
    {},
    8000
  );
  if (!res.ok) throw new Error("Dock " + res.status);
  const data = await res.json();
  box.innerHTML = "";
  const failed = Object.entries(data.sources || {})
    .filter(([, s]) => !s.ok)
    .map(([n]) => n);
  const head = document.createElement("p");
  head.className = "status-note";
  head.textContent =
    "Vía Guardian Dock (NWS · USGS · NASA EONET)." +
    (failed.length ? ` Fuentes sin respuesta ahora (declarado): ${failed.join(", ")}.` : "");
  box.appendChild(head);
  const alerts = data.alerts || [];
  if (!alerts.length) {
    const p = document.createElement("p");
    p.textContent = "Sin alertas oficiales activas para tu ubicación ahora mismo.";
    box.appendChild(p);
    return;
  }
  alerts.slice(0, 8).forEach((a) => {
    box.appendChild(
      alertCard({
        title: `${a.event} — ${a.severity || ""} [${a.source}]`,
        body: a.headline || a.area || "",
        url: a.url
      })
    );
  });
}

/* Respaldo: el NWS directo del scaffold, etiquetado como respaldo. */
async function alertsFallbackNWS(latitude, longitude, box) {
  box.textContent = "Consultando el Servicio Meteorológico Nacional (NWS) directo — respaldo, el Dock no respondió…";
  try {
    const res = await fetch(
      `https://api.weather.gov/alerts/active?point=${latitude.toFixed(4)},${longitude.toFixed(4)}`,
      { headers: { Accept: "application/geo+json" } }
    );
    if (!res.ok) throw new Error("NWS " + res.status);
    const data = await res.json();
    const feats = data.features || [];
    box.innerHTML = "";
    const head = document.createElement("p");
    head.className = "status-note";
    head.textContent = "Respaldo: consulta directa al NWS (el Guardian Dock no respondió).";
    box.appendChild(head);
    if (!feats.length) {
      const p = document.createElement("p");
      p.textContent =
        "Sin alertas oficiales activas para tu ubicación ahora mismo (fuente: api.weather.gov).";
      box.appendChild(p);
      return;
    }
    feats.slice(0, 5).forEach((f) => {
      box.appendChild(
        alertCard({
          title: (f.properties.event || "Alerta") + " — " + (f.properties.severity || ""),
          body: f.properties.headline || f.properties.areaDesc || ""
        })
      );
    });
  } catch (err) {
    box.textContent =
      "No se pudo consultar NWS en este momento. Guardian solo reporta alertas de fuentes oficiales verificadas; no rellena con rumores.";
  }
}

$("btnAlerts").addEventListener("click", () => {
  const box = $("alertsBox");
  box.textContent = "Pidiendo tu ubicación…";
  if (!("geolocation" in navigator)) {
    box.textContent = "Este dispositivo no ofrece geolocalización.";
    return;
  }
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude, longitude } = pos.coords;
      lastPos = { lat: latitude, lon: longitude, at: Date.now() };
      box.textContent = "Consultando alertas oficiales vía Guardian Dock…";
      try {
        await alertsViaDock(latitude, longitude, box);
      } catch (err) {
        await alertsFallbackNWS(latitude, longitude, box);
      }
    },
    () => {
      box.textContent =
        "Ubicación no disponible. Sin ubicación, Guardian no inventa alertas: actívala y vuelve a intentar.";
    },
    { timeout: 10000 }
  );
});

/* ---------- Arranque ---------- */
setMode("guardian");
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("sw.js")
    .then((reg) => {
      // S-04 (auditoría 21-oct): si llega una versión nueva de la cáscara,
      // se avisa al usuario en vez de servir la anterior en silencio.
      reg.addEventListener("updatefound", () => {
        const installing = reg.installing;
        if (!installing) return;
        installing.addEventListener("statechange", () => {
          if (installing.state === "installed" && navigator.serviceWorker.controller) {
            $("swUpdateNote").hidden = false;
          }
        });
      });
    })
    .catch(() => {});
}
