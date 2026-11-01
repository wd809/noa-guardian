# Compilar el APK de NOA Guardian en tu PC (Windows)

La app Android es la misma app web (Angular + Capacitor). Esto se hace **una
vez**; para recompilar tras cambios basta repetir los pasos 4 y 5.

## 1. Requisitos (una sola vez)

- **Node.js 20 o más nuevo** — comprueba con `node -v`.
- **JDK 17** — comprueba con `java -version`. Si no está, instala Temurin 17
  desde <https://adoptium.net> (instalador MSI, opción «Set JAVA_HOME»).
- **Android SDK** — con el Android CLI oficial que instalaste
  (`android --help` debe responder), o con las «Command-line tools» de
  <https://developer.android.com/studio>. Necesitas la plataforma Android 34
  o 35 y las build-tools.

## 2. Descomprime el proyecto

Descomprime el ZIP en una carpeta corta, p. ej. `E:\NOA-GUARDIAN\`.

## 3. Instala dependencias y sincroniza (PowerShell, dentro de la carpeta)

```powershell
cd E:\NOA-GUARDIAN\apps\web
npm install
npx cap sync android
```

## 4. Compila el APK de depuración

```powershell
cd android
.\gradlew.bat assembleDebug
```

La primera vez Gradle descarga sus componentes (tarda varios minutos).
El APK queda en:

```text
apps\web\android\app\build\outputs\apk\debug\app-debug.apk
```

## 5. Pásalo al teléfono e instálalo

- Copia `app-debug.apk` al teléfono (cable USB, Drive o WhatsApp a ti mismo).
- Ábrelo en el teléfono y acepta «Instalar» (Android pedirá permitir
  instalaciones de esa fuente solo esa vez). Es un APK de depuración firmado
  con la llave de desarrollo: válido para nuestras pruebas, no para la tienda.

## 6. Empareja la app con tu Dock

1. Arranca el Dock en tu red (PC o mini) con su `DOCK_TOKEN`.
2. Abre la app en el teléfono → pestaña **Sesión** → «Emparejar con tu Dock»:
   escribe la dirección (`http://<IP-de-tu-PC-o-mini>:3000`) y el token →
   **Guardar y probar**. Debe decir «conectado».
3. Pestaña **Guardian**: orbe y semáforo ya leen de tu Dock.

> Sin Play Store de por medio: la cuenta vieja se cerró el 25-oct-2026;
> publicar será otro proyecto, con cuenta nueva, después del hackathon.
