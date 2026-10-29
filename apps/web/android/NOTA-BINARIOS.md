# Nota: binarios generados de Android

Este snapshot del repositorio no incluye 27 archivos binarios generados de la
plantilla de Capacitor, porque la vía de subida usada no transporta binarios:

- `app/src/main/res/drawable*/splash.png` (11)
- `app/src/main/res/mipmap-*/ic_launcher*.png` (15)
- `gradle/wrapper/gradle-wrapper.jar` (1)

Son activos de plantilla, no código escrito a mano: están byte-exactos en el
ZIP del proyecto entregado a WD el 2026-10-29 y se regeneran en la PC con
`npx cap sync android` (iconos/splash con `@capacitor/assets`) y el wrapper
con una instalación de Gradle (`gradle wrapper`). Todo el código fuente del
proyecto Android — Gradle scripts, manifiesto, fuentes — sí está en el repo.
