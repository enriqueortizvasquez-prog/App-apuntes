# Activación del proyecto real de Apuntes

Estado comprobado el 29 de octubre de 2026, mediante la conexión autorizada del propietario a Supabase.

## Ya ejecutado

- Proyecto `nvuzpgnszuajdzyayslz`, saludable en `us-east-1`.
- Se comprobó que el esquema `public` estaba vacío antes de instalarlo.
- Migración `apuntes_colaboracion_v1`: las cinco tablas de `supabase/schema.sql`, funciones RPC y RLS activada en todas.
- Solo se creó una clave **publishable** del cliente. No se recuperaron ni publicaron claves administrativas/service_role.
- Redirección de Auth a `apuntes://open`, compatible con la app Android. No se desactivó la confirmación del correo.
- `tests/live-rls.sql` se ejecutó en la base real, con tres identidades temporales y roles `anon`/`authenticated`: lectura por pertenencia, prohibición de escritura directa, progreso individual, cambios compartidos, conflicto de versiones, protección del propietario, revocación/caducidad y retirada de miembros.
- Los usuarios y datos de prueba se revirtieron por subtransacción. La comprobación posterior encontró 0 usuarios, espacios, deberes e invitaciones. No se enviaron correos ni se crearon sesiones de usuario de prueba.
- Anon puede obtener únicamente la vista previa de invitación; no puede crear espacios. Authenticated no tiene UPDATE directo sobre tareas.

Estas pruebas ejercitan el servidor y sus políticas reales, **pero no prueban el registro por correo ni el inicio de sesión desde el APK**. Esos pasos siguen pendientes.

## Conectar el APK existente sin reinstalar

La descarga 1.1.0-beta conserva su firma y sus archivos originales; no se reemplazó el APK ni se borraron datos del dispositivo. Para conectar cada instalación:

Ajustes y respaldo → Cuenta y colaboración → Configurar servicio de colaboración.

URL del proyecto (pública):

```text
https://nvuzpgnszuajdzyayslz.supabase.co
```

Clave pública publishable, creada para Apuntes:

```text
sb_publishable_BJ9UfC0Gls3V7NpZk3SqdA_FExQCHse
```

Es intencionadamente pública y no concede derechos administrativos. La protección de los datos reside en Auth, RLS y las RPC comprobadas, no en ocultar esta clave. Nunca sustituirla por una clave service_role, sb_secret_, una contraseña ni un token de GitHub.

Todos los participantes necesitan conectar el mismo proyecto. La cuenta del panel de Supabase **no** equivale automáticamente a una cuenta de usuario dentro de Apuntes.

## Decisión vigente: acceso con Google

El propietario eligió mantener identidad verificada, y después aprobó **Entrar con Google** para no necesitar SMTP ni introducir una dirección postal en Brevo. No se debe continuar ese alta ni desactivar la confirmación del correo (`mailer_autoconfirm=false`). El método Google autentica la identidad a través de Google/Supabase; no necesita mandar un correo de confirmación desde Apuntes.

La versión 1.2 incorpora el flujo PKCE y la configuración pública del proyecto. La configuración guardada manualmente por el usuario tiene prioridad. **El proveedor Google debe activarse todavía con un cliente OAuth propio**: seguir `docs/GOOGLE.md`. La integración actual no puede introducir esos campos del proveedor; el propietario debe hacerlo directamente en los paneles, sin compartir secretos en el chat.

Pendiente: consentimiento e inicio de sesión Google reales y dos cuentas editando un espacio desde dispositivos/perfiles distintos. No se presenta todavía la colaboración como completada de extremo a extremo.
