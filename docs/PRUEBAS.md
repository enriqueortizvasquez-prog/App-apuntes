# Verificación de Apuntes 1.1.0-beta

Pruebas ejecutadas localmente el 29 de octubre de 2026. Reproducibles con Node.js 22:

```sh
npm ci
npm test
npm run build
npm run test:ui
npm audit --audit-level=high
```

## Pruebas automatizadas

- Fechas reales, años permitidos, horas y protocolos de enlaces.
- Respaldos: referencias, tipos, duplicados, longitud y contenido admitido.
- Codificación/decodificación Unicode de invitaciones.
- Cliente: configuración opcional, rechazo de claves privilegiadas, identidad en RPC y propagación de errores.
- **PostgreSQL embebido real (PGlite, no cadenas SQL simuladas):** aplicación del esquema; lectura restringida por pertenencia; bloqueo de escritura directa; comprobación de administrador en RPC; progreso propio no visible a otra cuenta; conflicto de versiones; imposibilidad de retirar al propietario; revocación y retirada de miembros.
- **Chromium:** app nueva vacía; ejemplos opcionales; crear/editar/reprogramar; notas inertes (no ejecutan HTML); completar/deshacer; vista de completados; eliminación con traslado íntegro, incluyendo notas, progreso y recordatorios.
- Copia por enlace aceptada en un contexto de navegador independiente; su progreso no altera el del original.
- Respaldo importado con confirmación; calendario con reloj controlado (rojo por vencimiento a la hora exacta, verde al resolverlo, selección conserva borde, un punto por curso).
- **Recarga realmente sin red** usando el service worker; no solo lectura directa del almacenamiento.
- Navegación móvil a 390 px sin desbordamiento horizontal; escritorio; hero exclusivo de Mis deberes.
- Carga bajo `/App-apuntes/` y apertura del HTML independiente mediante `file://`, con persistencia después de recargar.
- Integración de UI colaborativa con API controlada: conversión sin duplicados, notas omitidas que quedan personales, edición de administrador, bloqueo de miembro, cambio de cuenta y purga de caché, recordatorio personal y rechazo de cambios al fallar la red.
- Cero errores JavaScript de ejecución en los escenarios cubiertos. Artefactos de pantalla se generan localmente en `.test-artifacts/` y no se suben al repositorio.

## Android: prueba instrumentada ejecutada

La compilación y prueba del APK finalizaron correctamente en [GitHub Actions, ejecución 40937551900](https://github.com/enriqueortizvasquez-prog/App-apuntes/actions/runs/40937551900), revisión `4f1eadc907416fe774cb98b264b928f0ad06b26a`.

- Emulador Android 35, wifi y datos móviles apagados.
- Crear curso/deber; editar hora, título y notas Unicode; completar/deshacer.
- Recrear la actividad y recuperar los datos persistidos.
- Exportar con el puente nativo a un URI de ContentResolver; comprobar el JSON y sus notas.
- Importar un respaldo mediante el selector nativo (respuesta controlada) y un toque real sobre su botón; restaurar los deberes sin duplicados.
- Crear copias e invocarlas mediante el enlace Android `apuntes://open`.
- Cerrar la actividad y verificar la firma del APK con `apksigner` antes de publicar.

Los selectores se probaron con respuestas controladas de Espresso Intents y un FileProvider real; no se afirma haber seleccionado manualmente una carpeta en un celular físico. El APK firmado, hash y certificado públicos están en la release 1.1.0-beta. La descarga es inmutable para no cambiar su firma en recompilaciones.

El cliente local, el adaptador y el esquema SQL acumulan **9 pruebas unitarias**, además de las suites de navegador e instrumentación Android.

## Qué NO demuestra esto

No se ha creado un proyecto Supabase real ni configurado correos, cuotas, dominio permanente o pagos de terceros. No se ha probado una cuenta real contra un servicio remoto. PGlite no sustituye verificar la configuración efectiva del proyecto Supabase y su Auth. Sigue la lista de comprobación de `COLABORACION.md` antes de activar el colaborativo para otros usuarios.

La prueba web móvil usa un viewport Chromium y el APK usa un emulador Android; no se ha probado en tu celular físico ni en un iPhone. La instalación requiere los mecanismos del navegador de cada dispositivo. Ninguna prueba garantiza recordatorios con la app cerrada: esa función no se ofrece.
