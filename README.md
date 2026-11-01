# NOA Guardian

Asistente de seguridad personal e inteligencia cívica. El proyecto actual usa **Angular** en `apps/web`, **NestJS** para el Dock en `apps/dock` y contratos TypeScript compartidos en `packages/contracts`.

- **Guardian:** alertas de fuentes oficiales NWS, USGS y NASA EONET; lecturas de USGS Water. AirNow y PennDOT declaran su estado y el acceso pendiente cuando no están configurados. El orbe solo anuncia «All clear — verified» cuando las alertas fueron consultadas y todas las fuentes configuradas están verificadas. El mapa Leaflet usa teselas oscuras de CARTO, atribución visible y el mismo punto de consulta de alertas; no inventa incidentes ni coordenadas. La verificación visual del mapa en el servidor de desarrollo sigue pendiente.
- **Citizen:** respuestas extractivas desde el corpus de fuentes oficiales, con citas verificadas y jurisdicción. Se abstiene si los fragmentos recuperados no respaldan una respuesta.
- **Awareness:** análisis de imágenes mediante `/see`, con presencia de personas, objetos y riesgos; sin identificar personas. Las salidas del modelo se validan antes de mostrarlas. SAM 3.1 sigue pendiente de integración.
- **Fail-closed:** autenticación del Dock, límites de uso, validación de entradas y estados explícitos ante fallos. Una fuente caída o una consulta sin verificar no se presenta como calma confirmada. El emparejamiento muestra una huella del token para comparar dispositivos.

## Desarrollo

Requiere Node.js 24.15 o posterior y npm 10.9 o posterior. Desde la raíz:

```sh
npm ci
npm run build:web
npm run build:dock
```

Configura localmente `apps/dock/.env` a partir de `apps/dock/.env.example`. Las claves permanecen en el Dock: `.env`, dependencias y artefactos generados están excluidos de Git.

Para iniciar una instalación nueva, ejecuta en terminales separadas:

```sh
npm run start --workspace=apps/dock
npm run start --workspace=apps/web -- --host 0.0.0.0
```

El Dock usa el puerto 3000 y Angular el 4200. En el teléfono, configura en Session la dirección accesible del Dock y el token local. El proyecto Android Capacitor está en `apps/web/android`; consulta [COMPILAR-APK.md](COMPILAR-APK.md).

## Verificación y alcance

Referencia del entorno del autor: **104 pruebas Dock y 40 pruebas web**. La incorporación del mapa añade cinco pruebas web, para un total de **45**. Estos recuentos no son una certificación de seguridad ni sustituyen la verificación en dispositivos reales.

```sh
npm run test --workspace=apps/dock
npm run test --workspace=apps/web -- --watch=false
```

Los archivos del prototipo anterior en la raíz y en `dock/` se conservan como material histórico. La aplicación actual se desarrolla en `apps/`. Consulta [docs/CONTRACTS.md](docs/CONTRACTS.md), [docs/SECURITY-HARDENING.md](docs/SECURITY-HARDENING.md) y [docs/LEGAL-NOTICE.md](docs/LEGAL-NOTICE.md).

Prototipo informativo: no es asesoramiento legal ni un servicio de emergencias. Licencia MIT; véase [LICENSE](LICENSE).

**Equipo: WD**
