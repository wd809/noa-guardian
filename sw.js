// NOA Guardian — service worker del scaffold.
// Cachea SOLO la cáscara de la app. Nunca cachea respuestas, fotos ni audio:
// el procesamiento de Guardian es efímero por diseño.
const CACHE = "noa-guardian-v3";
const CACHE_PREFIX = "noa-guardian-";
const SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./assets/icon.svg"
];
// Lista explícita de rutas cacheables (corrección 26-oct): SOLO la cáscara
// estática, por pathname exacto y sin query string. Cualquier otra ruta del
// mismo origen —p. ej. una API servida bajo el mismo host, como /alerts con
// coordenadas en la URL— va siempre a la red y JAMÁS entra en la caché.
const SHELL_PATHS = new Set(SHELL.map((s) => new URL(s, self.location.href).pathname));

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        // S-06 (auditoría 21-oct): borrar SOLO las cachés propias (prefijo
        // noa-guardian-), nunca las de otra app servida en el mismo origen.
        keys
          .filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  // Las APIs (clima oficial, modelo) siempre van a la red, sin cache.
  if (url.origin !== self.location.origin) return;
  if (event.request.method !== "GET") return;
  // Solo la cáscara listada y sin parámetros: todo lo demás, red directa.
  if (url.search || !SHELL_PATHS.has(url.pathname)) return;
  // S-04 (auditoría 21-oct): network-first con revalidación. Con conexión,
  // la cáscara se sirve siempre de la red — las correcciones llegan sin
  // esperar a que sw.js cambie de bytes — y cada respuesta buena actualiza
  // la copia en caché. La caché queda solo como respaldo sin conexión.
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
