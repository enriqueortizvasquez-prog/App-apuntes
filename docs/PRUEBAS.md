# Verificación de Apuntes 1.2.0-beta

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

## Android 1.1: prueba instrumentada ejecutada

La compilación y prueba del APK finalizaron correctamente en [GitHub Actions, ejecución 40937551900](https://github.com/enriqueortizvasquez-prog/App-apuntes/actions/runs/40937551900), revisión `4f1eadc907416fe774cb98b264b928f0ad06b26a`.

- Emulador Android 35, wifi y datos móviles apagados.
- Crear curso/deber; editar hora, título y notas Unicode; completar/deshacer.
- Recrear la actividad y recuperar los datos persistidos.
- Exportar con el puente nativo a un URI de ContentResolver; comprobar el JSON y sus notas.
- Importar un respaldo mediante el selector nativo (respuesta controlada) y un toque real sobre su botón; restaurar los deberes sin duplicados.
- Crear copias e invocarlas mediante el enlace Android `apuntes://open`.
- Cerrar la actividad y verificar la firma del APK con `apksigner` antes de publicar.

Los selectores se probaron con respuestas controladas de Espresso Intents y un FileProvider real; no se afirma haber seleccionado manualmente una carpeta en un celular físico. El APK firmado, hash y certificado públicos están en la release 1.1.0-beta. La descarga es inmutable para no cambiar su firma en recompilaciones.

El cliente local, el adaptador y el esquema SQL acumulan **15 pruebas unitarias**, además de las suites de navegador e instrumentación Android.

## Qué NO demuestra esto

El propietario creó un proyecto Supabase y autorizó la conexión. Ya se instaló el esquema y se ejecutó `tests/live-rls.sql` en su base real: sus comprobaciones pasaron y los fixtures se revirtieron. No se ha probado el registro por correo ni el acceso desde el APK con cuentas reales. No se han configurado SMTP propio, dominio permanente ni pagos de terceros. Consulta `SUPABASE-ACTIVACION.md`. PGlite no sustituye verificar la configuración efectiva del proyecto Supabase y su Auth. Sigue la lista de comprobación de `COLABORACION.md` antes de activar el colaborativo para otros usuarios.

La prueba web móvil usa un viewport Chromium y el APK usa un emulador Android; no se ha probado en tu celular físico ni en un iPhone. La instalación requiere los mecanismos del navegador de cada dispositivo. Ninguna prueba garantiza recordatorios con la app cerrada: esa función no se ofrece.

## Versión 1.2: acceso Google

Se añadieron pruebas unitarias de PKCE S256, identidad mínima, exclusión de tokens Google, expiración, cancelación, proyecto/retorno equivocado, un solo uso y respuesta inválida. La suite de navegador usa fixtures controlados para comprobar intercambio, limpieza del historial, retorno tras reinicio e invitación conservada. **No es consentimiento real de Google**. La instrumentación Android comprueba el intent de navegador externo, rechazo de enlaces OAuth falsos, retorno frío/caliente y no repetición al recrear, además de CRUD/respaldo/importación offline. La publicación del APK 1.2 está condicionada al resultado real de su ejecución de Actions.

El 29 de octubre se consultó Auth real: `external_google_enabled=false`, Client ID y secreto Google todavía sin configurar; retorno `apuntes://open` ya permitido y verificación de correo intacta. Hay que completar `GOOGLE.md` y probar dos identidades reales antes de declarar terminada la colaboración.

### Resultado Android 1.2 confirmado

[40944333232](https://github.com/enriqueortizvasquez-prog/App-apuntes/actions/runs/40944333232), revisión `55aa71757823fa294b4507173e44c9709c37c789`: **SUCCESS**. Compilación, suites web y cuatro pruebas instrumentadas, firma y publicación de la nueva beta 1.2 completadas. La primera ejecución 40943396262 detectó un retorno cálido que solo cambiaba el fragmento, sin recargar el WebView; se corrigió el manejo de hashchange y se añadió una regresión de navegador. La descarga no se publicó hasta pasar la ejecución corregida.

El APK real pesa 1.251.238 bytes; su SHA256 es `b78dd8c8f350aab07f8c7dbef37372fe2403061cb01b295b643c8280a6ddf0cc`. Las dos ejecuciones generales de CI del mismo commit (40944333780 y 40944342815) también finalizaron correctamente. `npm audit` completo: 0 vulnerabilidades.

## Tareas 1.3: nombre y paleta

La versión 1.3 conserva la identidad técnica y los datos de Apuntes, pero cambia el nombre visible a **Tareas**, los iconos a la letra t y amplía la paleta de 6 a **20 colores**. Una prueba adicional comprueba manifest/etiqueta Android e identidad antigua; la suite web crea 20 cursos con todos los colores, verifica sus valores tras recargar y en las tarjetas, y comprueba el nombre y la paleta de la descarga portable y del diálogo móvil. La prueba Android verifica la etiqueta instalada, las 20 opciones y el nuevo color turquesa en el respaldo JSON.

Resultado local: **16 pruebas unitarias/PGlite y suite web completas**, sin errores JavaScript. La publicación del APK 1.3 depende de su propia ejecución Android; no sustituye las descargas 1.1/1.2. OAuth Google real sigue pendiente de activar en el proyecto Google existente **tareas**; no hay que crear otro proyecto ni contratar facturación.
