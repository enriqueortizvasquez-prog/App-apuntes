# Privacidad de Apuntes

La app no incorpora anuncios, analítica, seguimiento ni scripts de terceros. No requiere cuenta para usar datos locales. Sus archivos, iconos y tipografías del sistema no dependen de un CDN.

## En tu dispositivo

Cursos, deberes, fechas, notas, enlaces, progreso y recordatorios se guardan en el almacenamiento local del navegador. Los respaldos son archivos descargados a tu dispositivo. Los datos pueden perderse al borrar el almacenamiento o desinstalar: descarga respaldos. No se encriptan con una contraseña de la app; evita usar dispositivos compartidos para datos sensibles.

La caché de la PWA contiene solo archivos estáticos, nunca respuestas de autenticación, tokens, invitaciones consultadas por API ni datos de usuarios. Las sesiones de colaboración se guardan en `sessionStorage` (solo esa pestaña/sesión), no en los respaldos. La contraseña se envía únicamente al servicio configurado al solicitar acceso y no se persiste en la app.

## Al compartir

- Una copia incluye los títulos, cursos, fechas y los datos opcionales elegidos. Su contenido viaja en el fragmento del enlace; quien tenga el enlace puede leerlo. No es revocable ni sincroniza cambios.
- WhatsApp solo se abre por una acción tuya con un borrador. No se envía automáticamente; se aplican las políticas de WhatsApp cuando uses ese canal.
- La colaboración está desactivada sin configuración. Si el propietario activa un servicio Supabase, se envían el correo/credenciales de acceso, pertenencia y roles, contenido común de deberes, invitaciones y progreso individual a ese servicio. Cada persona solo accede a sus progresos y al contenido de sus espacios conforme a las políticas de servidor. Las notas personales y los recordatorios siguen siendo locales.
- El proveedor de alojamiento puede registrar accesos e IPs. El propietario debe revisar términos, cuotas, retención y ubicación de datos de sus proveedores antes de abrir la app a otras personas.

## Permisos

Las notificaciones se piden solo al pulsar el botón correspondiente. No se solicita acceso a contactos, ubicación, cámara ni archivos salvo el respaldo que tú selecciones. Los avisos solo se comprueban con la app abierta y en ejecución. Google Calendar no está conectado automáticamente.

## Borrar o exportar

Exporta desde Ajustes. Puedes eliminar deberes/cursos mediante la interfaz. Para borrar todos los datos locales, usa los ajustes de almacenamiento del navegador después de respaldar. Los datos compartidos se gestionan con sus permisos; cerrar sesión elimina su caché local, no borra el contenido del servidor ni los datos de otros miembros. Para eliminación completa de una cuenta y sus datos remotos, contacta al propietario del servicio; no hay pantalla de borrado de cuenta en esta versión.
