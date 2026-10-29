# Apuntes Android 1.1 · Beta instalable

Esta versión añade un **APK real para Android 8 o posterior**, con el diseño Grafito y la app incluida dentro del instalador. No es un enlace a una página remota: crear cursos/deberes, editar, completar, calendario y respaldos funcionan sin red desde el primer inicio.

## Descargar e instalar

1. En el celular Android, abre https://github.com/enriqueortizvasquez-prog/App-apuntes/releases/tag/v1.1.0-beta
2. En **Assets / Recursos**, descarga **apuntes-android-v1.1.0-beta.apk**.
3. Abre el archivo descargado. Si Android lo solicita, permite temporalmente «Instalar apps desconocidas» **solo para el navegador o gestor de archivos que estás usando**. Después puedes volver a desactivar ese permiso.
4. Confirma «Instalar» y abre **Apuntes** desde su icono.

No desactives Play Protect ni otras protecciones del dispositivo. Si Android muestra un bloqueo de seguridad distinto del permiso de instalación, no lo fuerces: revisa el mensaje antes de continuar. No es una publicación en Google Play ni una aplicación para iPhone.

## Qué funciona dentro del APK

- Datos locales persistentes, con la app gráfica empaquetada (WebView de Android). Se recomienda tener Android System WebView actualizado.
- Cursos, deberes, edición/reprogramación, notas/enlaces, progreso, calendario y recordatorios internos con la app abierta.
- Exportar respaldos mediante el selector de archivos **nativo de Android**; importar un JSON mediante el selector del sistema.
- Atrás cierra los diálogos antes de salir de la app.
- Copias por enlaces `apuntes://open#apuntes=…`, que abre la app instalada. El receptor necesita este APK. Algunos mensajeros muestran enlaces de este tipo como texto, no como enlaces pulsables. Los enlaces de archivos internos `appassets.androidplatform.net` nunca se comparten.
- Enlaces externos (por ejemplo, una referencia o WhatsApp) se abren fuera de la vista que tiene acceso al respaldo nativo.

El almacenamiento del APK es distinto del de Chrome: para trasladar tus deberes de la web al APK, exporta un JSON en Chrome e impórtalo en Apuntes. Desinstalar elimina los datos del APK: respalda antes.

## Colaboración: requiere un servicio real

**El repositorio público no crea un servidor y esta descarga no contiene uno configurado.** La sincronización no se da por activada ni probada con cuentas reales hasta completar estos pasos:

1. Crear un proyecto Supabase y ejecutar `supabase/schema.sql` en su editor SQL.
2. En Apuntes: Ajustes y respaldo → Cuenta y colaboración → **Configurar servicio de colaboración**.
3. Introducir la URL HTTPS y la clave **pública** publishable/anon. Nunca una contraseña, `service_role` o `sb_secret_`. Guardar y crear/iniciar una cuenta.
4. Conectar los demás dispositivos al mismo proyecto; crear/aceptar una invitación y comprobar con dos cuentas distintas.

La configuración se conserva solo en el dispositivo. Permite conectar el servicio después de instalar sin reconstruir el APK. También se puede incluir una configuración pública común en `config.js` antes de generar una versión. Consulta `COLABORACION.md` para los permisos y las pruebas remotas pendientes. Los planes gratuitos del proveedor tienen límites propios.

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

Las pruebas del emulador no sustituyen probarlo en tu modelo de celular. Los avisos con la app cerrada no se ofrecen. No se han dado por probadas cuentas reales ni una base de datos remota.

## Verificación de esta descarga

La ejecución [40937551900](https://github.com/enriqueortizvasquez-prog/App-apuntes/actions/runs/40937551900) finalizó con éxito, incluidas las pruebas Android y `apksigner`. El APK pesa aproximadamente 1,2 MB. La release es pública y no requiere una cuenta de GitHub para descargar.
