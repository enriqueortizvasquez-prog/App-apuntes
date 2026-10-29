# Tareas Android 1.4 · Beta instalable

Esta versión añade un **APK real para Android 8 o posterior**, con el diseño Grafito y la app incluida dentro del instalador. No es un enlace a una página remota: crear cursos/deberes, editar, completar, calendario y respaldos funcionan sin red desde el primer inicio.

## Descargar e instalar

1. En el celular Android, abre https://github.com/enriqueortizvasquez-prog/App-apuntes/releases/tag/v1.4.0-beta
2. En **Assets / Recursos**, descarga **tareas-android-v1.4.0-beta.apk**.
3. Abre el archivo descargado. Si Android lo solicita, permite temporalmente «Instalar apps desconocidas» **solo para el navegador o gestor de archivos que estás usando**. Después puedes volver a desactivar ese permiso.
4. Confirma «Instalar» y abre **Tareas** desde su icono.

No desactives Play Protect ni otras protecciones del dispositivo. Si Android muestra un bloqueo de seguridad distinto del permiso de instalación, no lo fuerces: revisa el mensaje antes de continuar. No es una publicación en Google Play ni una aplicación para iPhone.

## Qué funciona dentro del APK

- Datos locales persistentes, con la app gráfica empaquetada (WebView de Android). Se recomienda tener Android System WebView actualizado.
- Cursos, deberes, edición/reprogramación, notas/enlaces, progreso, calendario y recordatorios internos con la app abierta.
- Exportar respaldos mediante el selector de archivos **nativo de Android**; importar un JSON mediante el selector del sistema.
- Atrás cierra los diálogos antes de salir de la app.
- Copias por enlaces `apuntes://open#apuntes=…`, que abre la app instalada. El receptor necesita este APK. Algunos mensajeros muestran enlaces de este tipo como texto, no como enlaces pulsables. Los enlaces de archivos internos `appassets.androidplatform.net` nunca se comparten.
- Enlaces externos (por ejemplo, una referencia o WhatsApp) se abren fuera de la vista que tiene acceso al respaldo nativo.

El almacenamiento del APK es distinto del de Chrome: para trasladar tus deberes de la web al APK, exporta un JSON en Chrome e impórtalo en Apuntes. Desinstalar elimina los datos del APK: respalda antes.

## Colaboración y acceso Google

El APK 1.4 incluye el proyecto público Supabase del propietario, cuya base/RLS ya se instaló y comprobó. El propietario ya configuró Google y confirmó el primer acceso físico desde 1.3. La colaboración con dos cuentas sigue pendiente; consulta [GOOGLE.md](GOOGLE.md).

- En Cuenta y colaboración: **Entrar con Google** abre el navegador externo y regresa a `apuntes://open`.
- PKCE S256: solo se acepta un código asociado a un acceso iniciado en este dispositivo y servicio, durante 10 minutos. No se aceptan tokens en enlaces.
- No hace falta configurar Brevo/SMTP para ese método. No se pide la contraseña Google dentro de la app ni permisos de Gmail/Drive/Calendar.
- El cliente secreto OAuth se configura directamente en Supabase, no se publica. La URL y la clave publishable del APK son públicas y dependen de RLS para su seguridad.
- Los demás participantes usan el mismo proyecto. Aún hay que probar consentimiento real, regreso al APK y colaboración entre dos cuentas.
- La configuración pública manual sigue disponible para otro proyecto y tiene prioridad sobre el valor incluido.

## Firma y actualizaciones: beta de prueba

Este APK beta se firma con una **clave de prueba generada en el compilador de GitHub Actions**, no con una clave de producción conservada por el propietario. No se publica ninguna clave privada. Los certificados y SHA256 de la descarga se adjuntan en la release.

Una nueva compilación puede usar otra firma y Android no permitiría actualizar sobre la anterior. **Descarga un respaldo antes de desinstalar/cambiar de APK.** Antes de distribuir versiones de producción actualizables, el propietario debe configurar una clave de firma permanente en los secretos del repositorio. La conexión actual del agente no tiene permiso para administrar esos secretos.

## Compilar y verificar

GitHub Actions usa JDK 17, Gradle 8.11.1, Android SDK 35 y ejecuta pruebas instrumentadas en un emulador Android 35 con wifi/datos apagados. La publicación del APK se hace solo si pasan esas pruebas.

```sh
npm ci
npm test
npm run build
npm run android:assets
gradle -p android :app:assembleDebug :app:connectedDebugAndroidTest
```

Usa el repositorio completo o el archivo **Source code (zip)** de GitHub para compilar Android; el ZIP de la app web es una distribución separada.

Para repetirlo localmente hace falta JDK 17, Android SDK 35, Gradle 8.11.1 y un emulador/dispositivo. No se incluyen SDK, APK, claves privadas ni archivos generados en el código Git.

Las pruebas del emulador no sustituyen probarlo en tu modelo de celular. Los avisos con la app cerrada no se ofrecen. La base de datos remota/RLS sí se comprobó; el inicio Google y la colaboración con dos cuentas reales siguen pendientes.

## Verificación de esta descarga

La publicación 1.2 solo se realiza después de las pruebas web, PKCE e instrumentación Android y de verificar la firma con `apksigner`. No reemplaza ni modifica la descarga 1.1 ya publicada. Consultar la ejecución de Actions asociada a la release para su resultado real.

### Resultado comprobado de 1.2

La ejecución [40944333232](https://github.com/enriqueortizvasquez-prog/App-apuntes/actions/runs/40944333232) terminó correctamente el 29 de octubre de 2026 (4 min 32 s), revisión `55aa71757823fa294b4507173e44c9709c37c789`. Pasaron las suites web/PKCE y las **cuatro pruebas Android**, incluyendo navegador externo, callbacks frío/caliente y CRUD/importación/respaldo sin red. Se verificó la firma con apksigner antes de publicar.

[Descargar APK 1.2](https://github.com/enriqueortizvasquez-prog/App-apuntes/releases/download/v1.2.0-beta/apuntes-android-v1.2.0-beta.apk): 1.251.238 bytes. SHA256 informado por GitHub para el archivo publicado: `b78dd8c8f350aab07f8c7dbef37372fe2403061cb01b295b643c8280a6ddf0cc`. Release pública no borrador, beta e inmutable. No se modificó la descarga anterior.

**Esto no prueba el consentimiento de una cuenta Google real.** El proveedor sigue pendiente de configurar por el propietario; el APK comprueba ese estado y no simula un acceso. No publiques el secreto OAuth ni desactives la verificación de identidad.

## Cambio de nombre: Tareas 1.3

Nombre visible, iconos web/Android, notificaciones y descargas actualizados a **Tareas**. Los cursos ahora ofrecen 20 colores pastel, manteniendo los 6 originales y sus valores. Los colores elegidos se conservan en respaldos, copias y sincronización. El diseño Grafito y los indicadores de vencimiento no cambian.

Se conservan el identificador Android `pe.apuntes.app`, las claves de almacenamiento y `apuntes://open` para no romper datos ni invitaciones ni el retorno autorizado en Supabase. El proyecto Google existente se llama **tareas**; el nombre no significa que OAuth ya esté activado. Exporta respaldo antes de cambiar de APK beta por la posible diferencia de firma.

La publicación 1.3 superó sus propias pruebas; la descarga 1.2 no se modifica.

Resultado: [Actions 40951528171](https://github.com/enriqueortizvasquez-prog/App-apuntes/actions/runs/40951528171), revisión `03fb4751da78d6088ff13ae628329ba61a7dba8b`, **SUCCESS**, 4 min 43 s. Pasaron las 16 pruebas unitarias/PGlite, la suite web con los 20 colores y las cuatro pruebas Android (incluidas etiqueta Tareas, selección del color nuevo, respaldo, importación y retorno OAuth). Firma verificada antes de publicar.

[Descargar Tareas 1.3 APK](https://github.com/enriqueortizvasquez-prog/App-apuntes/releases/download/v1.3.0-beta/tareas-android-v1.3.0-beta.apk), 1.251.754 bytes, SHA256 de GitHub `11ed80036ebffa63494006bcc0e3521b8124d76039a566ad42a87d24dd60a30d`. Release pública y no borrador. El proveedor Google real sigue pendiente de configurar.

## Actualización: primer acceso físico confirmado

El 29 de octubre de 2026 el propietario confirmó en Tareas 1.3 instalada en su celular el retorno de Google y «Sesión iniciada». Se comprobó por consulta agregada en el servidor **1 identidad Google con correo confirmado**, sin leer secretos ni tokens. Los comentarios anteriores sobre proveedor pendiente describen el estado al construir/publicar las betas. Actualmente falta probar invitación, sincronización y progreso con dos cuentas reales; el primer acceso ya no está pendiente. No se necesita reconstruir ni sustituir el APK por activar el proveedor.

## Tareas 1.4: estrella e invitaciones pegadas

El icono Android/web ahora es una estrella de cuatro puntas tipo rombo, de contorno claro sobre Grafito, sin la letra t.

Si WhatsApp deja el enlace como texto:

1. Copia el enlace o el mensaje completo.
2. Abre **Tareas 1.4 → Ajustes y respaldo → Abrir invitación** (también aparece en Cuenta y colaboración).
3. Pega manualmente el texto y pulsa **Ver invitación**.
4. Revisa la vista previa y confirma **Unirme al espacio**. Si no has iniciado sesión, entra con Google primero. Para una copia, confirma **Añadir copia a mis deberes**; no se convierte en colaboración.

El receptor debe tener 1.4 para esta opción; las invitaciones de 1.3 siguen siendo válidas mientras no caduquen/se revoquen. No se cambiaron los permisos ni el servidor. No se asegura que WhatsApp convierta enlaces `apuntes://` en clicables: la solución no depende de ello. Los mensajes nuevos incluyen instrucciones. El texto completo se borra del campo al mostrar una vista previa válida y no se persiste ni envía al servidor; solo se consulta el token de una invitación colaborativa. No hay lectura automática del portapapeles.

Antes de cambiar de APK beta, exporta respaldo; una firma diferente puede obligar a desinstalar la anterior. La publicación 1.4 requiere su propia prueba Android; no reemplaza la descarga 1.3. El primer inicio Google en celular ya está confirmado, pero la aceptación y sincronización entre dos cuentas reales sigue pendiente.

### Publicación 1.4 verificada

[Actions 40962689887](https://github.com/enriqueortizvasquez-prog/App-apuntes/actions/runs/40962689887), fuente `1413fe925b8a06ab8fb3cb97a7dfa06406ab6102`, terminó **SUCCESS** (6 min 42 s): **20 pruebas unitarias/PGlite**, suites web e **instrumentación Android de cinco pruebas**. Se probaron en Android el mensaje colaborativo pegado con API controlada, la copia pegada con confirmación, importación/respaldo offline y los regresos OAuth. La primera ejecución detectó una incompatibilidad al interpretar el esquema propio; el analizador ahora valida `apuntes://open` directamente, sin depender de URL para protocolos no estándar, y la regresión está cubierta.

[Descargar APK Tareas 1.4](https://github.com/enriqueortizvasquez-prog/App-apuntes/releases/download/v1.4.0-beta/tareas-android-v1.4.0-beta.apk): **1.263.258 bytes**, SHA256 de GitHub `e6f5e168fab87d9f4d7e0167f4c42f08c23ec31664ffbc0d7d944ea41b111e4b`. Firma verificada con apksigner antes de publicar. Release pública, beta y no borrador; no se reemplazaron las descargas anteriores.

La prueba entre dos cuentas reales y pegar manualmente desde WhatsApp en el celular siguen pendientes de confirmar con el propietario/receptor. Las pruebas no convierten los enlaces en pulsables en WhatsApp; permiten abrirlos pegándolos en Tareas. No hace falta volver a configurar Google.
