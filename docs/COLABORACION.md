# Activar colaboración real (opcional)

La descarga funciona sin este paso. La app no crea una base de datos automáticamente. El APK 1.2 ya incluye los valores públicos del proyecto del propietario; no sube los deberes locales automáticamente. El SQL y el cliente están incluidos. El 29 de octubre de 2026 se instaló y verificó el esquema en el proyecto real del propietario; consulta `SUPABASE-ACTIVACION.md` para el estado y los valores públicos de conexión. El registro de usuarios y la prueba con dos cuentas reales todavía están pendientes. Las instrucciones siguientes sirven también para instalar otro proyecto vacío.

1. El propietario crea un proyecto Supabase y revisa sus cuotas/costos. La app no cobra una suscripción propia.
2. En el editor SQL de un proyecto **vacío**, ejecuta `supabase/schema.sql` una vez. Es una transacción: si falla, se revierte. Si ya instalaste otra versión del esquema, no lo ejecutes encima sin una migración revisada.
3. Configura **Google** siguiendo `GOOGLE.md`, con retorno Android `apuntes://open` autorizado. No necesitas SMTP para este método. El acceso por correo/contraseña queda como método alternativo avanzado para otros proyectos con correo configurado; no desactives la verificación.
4. Desde Ajustes → Cuenta y colaboración → Configurar servicio, puedes guardar los valores públicos en cada dispositivo sin reconstruir el APK. Para incluir una configuración común en las descargas, en `config.js` rellena `supabaseUrl` (HTTPS) y `supabaseKey` (clave **publishable** o JWT de rol **anon**). Son valores públicos. **Nunca uses service_role ni sb_secret_**; el cliente rechaza esas claves. No incluyas contraseñas de usuarios ni de base de datos en Git.
5. Ejecuta pruebas y build; vuelve a publicar `dist/`. El HTML portable también contendrá la configuración pública. Mantén RLS y los permisos del SQL habilitados.
6. Prueba con **dos cuentas distintas** en navegadores/perfiles distintos antes de ofrecerlo a compañeros.

## Flujo

- En un deber o curso, Compartir → Colaborativo → iniciar sesión → crear invitación.
- Si es nuevo, se crea un espacio con los deberes sin completar seleccionados. Se convierten en compartidos del propietario; las notas omitidas se conservan en sus notas personales locales.
- Las notas/enlaces que se incluyan en el espacio común son visibles a sus miembros. Los recordatorios, progreso y notas personales no se incluyen en invitaciones ni se suben como contenido común.
- El enlace lleva un UUID de invitación, no las notas. Caduca en 7 días. Antes de aceptar, se consulta título, cantidad, permiso y caducidad; las tareas requieren pertenecer al espacio.
- Miembro: consulta la información y marca su propio progreso. Administrador: crea/edita/elimina deberes e invita; también puede cambiar/retirar miembros, salvo al propietario o a sí mismo desde esa pantalla.
- Un curso compartido incluye sus nuevas entregas. Una copia portable de curso es una instantánea y no incluye futuras entregas.
- Cuenta y colaboración permite revocar los enlaces de un espacio. Revocar no expulsa a miembros ya aceptados; para eso se retira el acceso del miembro.
- Al abandonar, no se borran los datos de los demás. El propietario debe permanecer como administrador: esta versión no implementa transferencia de propiedad ni borrado completo del espacio desde la interfaz. Puede eliminar deberes individuales con confirmación.
- Las actualizaciones se consultan cada 20 segundos con la app abierta. Las escrituras fallan claramente sin conexión. Los conflictos de edición se detectan por versión: sincroniza y vuelve a editar.
- Al cerrar sesión se quitan de la caché local los deberes remotos; las copias locales permanecen. Los recordatorios/notas personales de esos compartidos son locales: respáldalos antes de cerrar sesión si los necesitas.

## Modelo y seguridad

`shared_spaces`, `space_members`, `shared_tasks`, `task_progress`, `space_invites`. RLS limita lectura a miembros, progreso solo al propio usuario. Las tablas no conceden escritura directa al cliente; las mutaciones se hacen mediante RPC que verifica `auth.uid()`, pertenencia y rol. Todas las funciones con `security definer` fijan `search_path`, revocan EXECUTE de PUBLIC/anon y otorgan lo necesario; solo la vista previa de invitación admite anon.

Los permisos se comprueban en el servidor, no solo ocultando botones. Las claves públicas no son una medida de autorización. El token de invitación es un secreto temporal de acceso: evita publicarlo en redes abiertas. Activa límites y protección antiabuso adecuados en el proveedor antes de abrir registros masivos.

## Comprobaciones antes de producción

1. A crea un curso y añade un deber; B no puede leerlo sin invitación.
2. B acepta como miembro; no puede editar ni eliminar información compartida, ni progresos de A.
3. B completa: A sigue viendo su propio deber sin completar.
4. A cambia la fecha: B la recibe al sincronizar, conservando su recordatorio local.
5. Dos administradores editan la misma versión: la segunda escritura se rechaza, no pierde datos silenciosamente.
6. Revoca/caduca una invitación: un tercero no puede aceptarla; un miembro retirado ya no puede leer/escribir.
7. Prueba el consentimiento Google, cancelación, regreso al APK, acceso, cierre/renovación de sesión y errores de red. Si habilitas el método de correo, comprueba además su confirmación/recuperación y SMTP.

Las pruebas automáticas verifican el cliente con respuestas controladas y ejecutan el esquema SQL y sus permisos en PostgreSQL embebido (PGlite); no sustituyen estas pruebas contra el servicio real configurado por el propietario.
