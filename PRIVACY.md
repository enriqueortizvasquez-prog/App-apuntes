# Privacidad de Tareas

La app no incorpora anuncios, analítica, seguimiento ni scripts de terceros. No requiere cuenta para usar datos locales. Sus archivos, iconos y tipografías del sistema no dependen de un CDN.

## En tu dispositivo

Cursos, deberes, fechas, notas, enlaces, progreso y recordatorios se guardan en el almacenamiento local del navegador. Los respaldos son archivos descargados a tu dispositivo. Los datos pueden perderse al borrar el almacenamiento o desinstalar: descarga respaldos. No se encriptan con una contraseña de la app; evita usar dispositivos compartidos para datos sensibles.

La caché de la PWA contiene solo archivos estáticos, nunca respuestas de autenticación, tokens, invitaciones consultadas por API ni datos de usuarios. Las sesiones de colaboración se guardan en `sessionStorage` (solo esa pestaña/sesión), no en los respaldos. La contraseña se envía únicamente al servicio configurado al solicitar acceso y no se persiste en la app.

## Al compartir

- Una copia incluye los títulos, cursos, fechas y los datos opcionales elegidos. Su contenido viaja en el fragmento del enlace; quien tenga el enlace puede leerlo. No es revocable ni sincroniza cambios.
- WhatsApp solo se abre por una acción tuya con un borrador. No se envía automáticamente; se aplican las políticas de WhatsApp cuando uses ese canal.
- El APK 1.3 contiene la conexión pública al proyecto Supabase del propietario. No sube tus deberes locales por abrir la app. Al entrar o colaborar, se envían el correo/credenciales de acceso, pertenencia y roles, contenido común de deberes, invitaciones y progreso individual a ese servicio. Cada persona solo accede a sus progresos y al contenido de sus espacios conforme a las políticas de servidor. Las notas personales y los recordatorios siguen siendo locales.
- El proveedor de alojamiento puede registrar accesos e IPs. El propietario debe revisar términos, cuotas, retención y ubicación de datos de sus proveedores antes de abrir la app a otras personas.

## Permisos

Las notificaciones se piden solo al pulsar el botón correspondiente. No se solicita acceso a contactos, ubicación, cámara ni archivos salvo el respaldo que tú selecciones. Los avisos solo se comprueban con la app abierta y en ejecución. Google Calendar no está conectado automáticamente.

## Pegar una invitación

El texto se introduce manualmente en «Abrir invitación»; no hay lectura automática del portapapeles. Se extrae una invitación reconocida sin abrir el dominio del enlace. La vista previa colaborativa envía solo el token al proyecto configurado; no el resto del mensaje de WhatsApp. Las copias se decodifican localmente. El campo se vacía después de una vista previa válida; no se persiste el mensaje completo ni se acepta la invitación sin confirmación. El token validado puede quedar temporalmente en el fragmento de la página para continuar tras iniciar sesión y se elimina al aceptar. Compártelo solo con personas autorizadas.

## Acceso con Google

Es opcional para usar datos locales. Se abre el navegador del sistema y Google comparte con Supabase la identidad básica (identificador, correo y perfil) para autenticar tu cuenta. Tareas solo utiliza ID/correo de la sesión Supabase; no pide leer Gmail, Drive, Calendar ni contactos. Las políticas de Google y Supabase se aplican a ese proceso. Nunca introduzcas la contraseña Google dentro de Tareas.

El verificador PKCE y el identificador de una invitación pendiente se guardan temporalmente en almacenamiento local. Solo son válidos durante 10 minutos para el mismo servicio y retorno, y se consumen antes del intercambio del código. Si abandonas el navegador sin volver, el dato caducado puede permanecer hasta el siguiente intento; no permite iniciar sesión una vez caducado. La app no conserva tokens de acceso de Google ni su secreto OAuth. El código de retorno se borra del historial de la vista local; los tokens Supabase quedan solo en sessionStorage, no en respaldos. El proveedor puede mantener su propia sesión en el navegador; cerrar sesión en Tareas no cierra tu cuenta de Google en otras aplicaciones.

## Borrar o exportar

Exporta desde Ajustes. Puedes eliminar deberes/cursos mediante la interfaz. Para borrar todos los datos locales, usa los ajustes de almacenamiento del navegador después de respaldar. Los datos compartidos se gestionan con sus permisos; cerrar sesión elimina su caché local, no borra el contenido del servidor ni los datos de otros miembros. Para eliminación completa de una cuenta y sus datos remotos, contacta al propietario del servicio; no hay pantalla de borrado de cuenta en esta versión.

## APK Android

La app se empaqueta con los mismos archivos gráficos y no carga una web remota al iniciar. La caché/almacenamiento del APK está separada de Chrome. El APK no activa copias automáticas de Android; tú eliges dónde exportar tu JSON con el selector del sistema. Importar solo permite leer el archivo que selecciones. No pide acceso general al almacenamiento, contactos, ubicación, cámara ni micrófono. Las referencias externas se abren fuera de la vista local con acceso al guardado nativo. La configuración pública del servicio se guarda localmente en este dispositivo y no se incluye en los respaldos.
