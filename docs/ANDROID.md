# Apuntes Android 1.2 · Beta instalable

Esta versión añade un **APK real para Android 8 o posterior**, con el diseño Grafito y la app incluida dentro del instalador. No es un enlace a una página remota: crear cursos/deberes, editar, completar, calendario y respaldos funcionan sin red desde el primer inicio.

## Descargar e instalar

1. En el celular Android, abre https://github.com/enriqueortizvasquez-prog/App-apuntes/releases/tag/v1.2.0-beta
2. En **Assets / Recursos**, descarga **apuntes-android-v1.2.0-beta.apk**.
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

## Colaboración y acceso Google

El APK 1.2 incluye el proyecto público Supabase del propietario, cuya base/RLS ya se instaló y comprobó. **El acceso Google requiere todavía configurar y activar el proveedor**, siguiendo [GOOGLE.md](GOOGLE.md). No se presenta como un servicio de autenticación ya probado con cuentas reales.

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
