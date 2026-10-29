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

### Resultado de publicación Tareas 1.3

[40951528171](https://github.com/enriqueortizvasquez-prog/App-apuntes/actions/runs/40951528171): **SUCCESS**, fuente `03fb4751da78d6088ff13ae628329ba61a7dba8b`. Las cuatro pruebas Android y la verificación de firma pasaron, además de las 16 pruebas unitarias/PGlite y las suites web. APK `tareas-android-v1.3.0-beta.apk` publicado, 1.251.754 bytes. No se cambió la configuración del servidor ni se da por activado el proveedor Google.

## Primer acceso Google real en celular confirmado

El 29 de octubre de 2026 el propietario confirmó, mediante una captura del APK instalado, el regreso desde Google y la pantalla de cuenta con «Sesión iniciada». Se hizo una consulta agregada de solo lectura: `google_verified_accounts=1`, `shared_spaces=0`, `shared_tasks=0`. Esto verifica la identidad real en el servidor sin recuperar secretos OAuth, contraseñas ni tokens, y sin modificar datos.

La instalación física y el primer acceso ya no son pendientes. La colaboración entre dos cuentas sí sigue pendiente: aún no se ha creado/aceptado una invitación ni comprobado propagación y progreso individual desde dos cuentas reales. Las pruebas de SQL/RLS y las automatizadas anteriores siguen siendo evidencia separada, no sustitutos de ese flujo.

## Tareas 1.4: invitación como texto e icono estrella

- 20 pruebas unitarias/PGlite: extracción de enlace/mensaje/fragmento/código, distinción copia/colaborativo, rechazo de ambigüedad, tamaño, esquemas ejecutables y retornos OAuth.
- Suite web con API controlada: mensaje completo pegado; vista previa sin autoaceptar; exige cuenta para unirse; aceptación solo tras confirmar; invitación revocada/caducada; cancelación con respuesta tardía sin reabrir diálogos; copia local sin crear membresía; instrucciones en borrador WhatsApp.
- No se navega ni consulta el dominio del texto pegado. Solo se usa el token en el backend ya configurado. No se persiste el mensaje ni se lee el portapapeles automáticamente.
- Icono de estrella de cuatro puntas en SVG/PNG/Android y la marca de la app. Paleta de 20 colores, datos y URI antigua se conservan.
- Instrumentación añadida: pegar mensaje colaborativo con API controlada en Android sin red; exige login sin aceptar automáticamente. La prueba CRUD pega un mensaje de copia, revisa antes de aceptar y restaura su respaldo.

La publicación 1.4 depende del resultado de sus pruebas Android. No se da por hecha una prueba manual de pegar desde WhatsApp ni colaboración de dos personas en celulares reales.

### Resultado final 1.4

La ejecución [40962689887](https://github.com/enriqueortizvasquez-prog/App-apuntes/actions/runs/40962689887) de `1413fe925b8a06ab8fb3cb97a7dfa06406ab6102` finalizó correctamente: **20 unitarias/PGlite + suites web + 5 pruebas instrumentadas Android**, firma y publicación del APK. La ejecución inicial 40961756205 no publicó APK porque el analizador no reconoció el esquema propio en Android; se eliminó la dependencia de URL para ese protocolo y se añadió una regresión. El flujo corregido de copia y colaboración pegadas pasó en Android.

APK publicado `tareas-android-v1.4.0-beta.apk`, 1.263.258 bytes, SHA256 `e6f5e168fab87d9f4d7e0167f4c42f08c23ec31664ffbc0d7d944ea41b111e4b`. Permanece pendiente confirmar la interacción manual desde WhatsApp y dos cuentas en celulares reales; no se modificó el backend ni se recuperaron secretos OAuth.

### Confirmación manual del propietario — dos cuentas reales (29 de octubre de 2026)

El propietario informó que, en dos dispositivos con cuentas Google distintas:

- Añadir un deber colaborativo hace que aparezca en el segundo dispositivo.
- Editar un deber existente también se refleja en el segundo dispositivo.
- Completarlo cambia únicamente el progreso de la persona que lo marca, como está previsto.

Esta es evidencia manual comunicada por el propietario, no una nueva ejecución automatizada ni una inspección de sus cuentas. Actualiza las menciones anteriores a sincronización y progreso entre dos cuentas como pendientes. No demuestra por separado el pegado del mensaje desde WhatsApp, todos los roles/permisos, la revocación de invitaciones ni los conflictos simultáneos; no se modificó código ni se publicó otro APK por esta confirmación.

## Corrección 1.5 — propietario elimina el espacio

- 23 pruebas unitarias/PGlite: RPC autenticado sin identidad suplantable, solo propietario puede eliminar; miembro, administrador no propietario, extraño y anónimo rechazados; tabla no escribible directamente; eliminación completa de las dependencias e invitación invalidada; otro curso conservado.
- Prueba de interfaz con dos sesiones/API controlada: etiquetas por propietario, confirmación explícita, cancelación sin petición, error sin borrar caché, doble clic bloqueado, eliminación reflejada en el segundo usuario al sincronizar y datos locales conservados.
- `tests/live-delete-space.sql`: **PASS en el proyecto real**, con usuarios/espacios/deberes de prueba dentro de subtransacción revertida. No se eliminó ningún curso real del propietario.
- Nueva prueba Android de propietario, cancelación/confirmación y retirada de la instantánea. La compilación/publicación 1.5 está condicionada a CI; se registrará el resultado por separado.
- El propietario confirmó también una cuenta nueva fuera de la lista de prueba después de publicar Google en producción. No es evidencia de marca verificada ni sustituye probar manualmente el nuevo borrado en su celular.
