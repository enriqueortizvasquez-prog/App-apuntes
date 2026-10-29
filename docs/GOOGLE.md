# Activar «Entrar con Google»

Decisión del propietario: usar Google en lugar de contratar SMTP o publicar una dirección postal. No hay que continuar el registro en Brevo. **El proveedor Google aún requiere configuración del propietario; incluir el botón no lo activa.**

## Qué solicita Apuntes

Solo `openid`, correo y perfil básico. No solicita Gmail, Drive, Calendar, contactos ni acceso offline a servicios Google. La contraseña se introduce únicamente en Google, desde el navegador del sistema, no dentro de la app. Supabase administra las identidades y las sesiones sujetas a las RLS instaladas.

El APK 1.2 incluye la URL/clave pública del proyecto real. No incluye ni necesita una contraseña Google ni el secreto OAuth del cliente. El APK 1.1 no tiene esta función: necesita una nueva instalación (primero exporta respaldo).

## Configuración manual segura (una sola vez)

La integración del agente con Supabase permite administrar las opciones básicas de Auth, pero no introducir credenciales del proveedor Google. No existe una conexión de Google Cloud disponible en esta conversación. **El propietario debe configurar las credenciales directamente en los paneles, no enviarlas al chat.**

1. Abre https://console.cloud.google.com/ y selecciona/crea un proyecto para **Apuntes**. Este acceso usa Google Auth Platform/OAuth, no Gmail API, Drive ni Calendar. No habilites servicios de pago ni facturación para estos pasos. Si el panel exige contratar algo, detente.
2. En **Google Auth Platform → Branding**, configura el nombre **Apuntes**, un correo de asistencia y un correo de contacto que controles. No inventes una empresa ni una dirección postal. Si no tienes web, no inventes una URL. El dominio de retorno se describe en la documentación oficial de Supabase enlazada abajo.
3. En **Audience**, elige **External** si tus compañeros no pertenecen a una organización Workspace. Mientras esté en **Testing**, agrega explícitamente los correos de prueba; las demás personas no podrán entrar. Para distribuir libremente hay que pasar a **In production** y cumplir los requisitos que Google muestre. No confundas probar con dos usuarios autorizados con acceso público ya habilitado. La verificación de marca es distinta de la de scopes sensibles; no solicites scopes adicionales.
4. En **Data Access**, limita los permisos a `openid`, `.../auth/userinfo.email` y `.../auth/userinfo.profile`.
5. En **Clients**, crea un cliente OAuth de tipo **Web application** (el retorno de Google es al servidor Supabase, no directamente a Android). En **Authorized redirect URIs** introduce exactamente:

   ```text
   https://nvuzpgnszuajdzyayslz.supabase.co/auth/v1/callback
   ```

   No uses `apuntes://open` en el campo de retorno de Google ni agregues `appassets.androidplatform.net` como web propia. No necesitas crear un cliente Android ni registrar la firma debug para este flujo de navegador.
6. Abre https://supabase.com/dashboard/project/nvuzpgnszuajdzyayslz/auth/providers → **Google**. Activa el proveedor y pega allí el **Client ID** y **Client Secret** obtenidos en Google. Mantén **Skip nonce checks** y **Allow users without an email** desactivados. Guarda. El secreto queda solo en Supabase, nunca en el APK, Git o chat.
7. En **URL Configuration** conserva el retorno autorizado **`apuntes://open`**, ya configurado. No añadas comodines. Google redirige a Supabase; Supabase redirige a la app.

La documentación oficial es la referencia si cambian las etiquetas o Google pide requisitos adicionales: https://supabase.com/docs/guides/auth/social-login/auth-google y https://developers.google.com/identity/protocols/oauth2/production-readiness/policy-compliance.

## Probar en Android

1. Exporta respaldo JSON de la versión anterior. Las betas usan firma de prueba y Android puede exigir desinstalar la anterior: desinstalar borra los datos. Importa el respaldo en la nueva versión.
2. **Ajustes y respaldo → Cuenta y colaboración → Entrar con Google**. Sin proveedor activo, la app explica que falta configurar Google; no simula un acceso.
3. Elige la cuenta en el navegador y permite regresar a Apuntes. La app intercambia un código de un solo uso usando **PKCE S256**. El verificador temporal tiene validez máxima de 10 minutos y se elimina al consumir el retorno, cancelar o cambiar de servicio. Si se cierra el navegador sin regresar, queda inválido al caducar y se sustituye al volver a intentar. No acepta tokens puestos en enlaces.
4. Si cancelas en el navegador, vuelve a Apuntes y pulsa el botón otra vez. Si aparece un error de redirect, verifica ambas URL de los pasos 5 y 7; no desactives controles de seguridad.
5. Comprueba tu correo en la pantalla de cuenta y crea una invitación a un deber/curso. Abre el enlace con otra cuenta autorizada en otro dispositivo/perfil y verifica edición común y progreso independiente. No se considera completada la colaboración hasta hacer esta prueba real.

Solo se conserva la sesión Supabase durante la sesión de la app; no se guardan tokens Google ni la contraseña en el dispositivo. Una nueva sesión de la app puede pedir elegir tu cuenta otra vez. Los deberes locales continúan disponibles sin conexión.

## Alcance de las pruebas automatizadas

Pruebas de PKCE, expiración, proyecto/retorno incorrecto, cancelación, repetición, rechazo de tokens implícitos, limpieza del historial y conservación de invitaciones. Browser/Auth fixtures e instrumentación Android no equivalen a completar el consentimiento en una cuenta real de Google. Las RLS se probaron por separado en el servidor real (`docs/SUPABASE-ACTIVACION.md`).
