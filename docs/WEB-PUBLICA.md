# Web informativa pública de Tareas

`web-info/` contiene una web estática independiente del APK: inicio, privacidad, condiciones y contacto. No incluye autenticación, configuración Supabase, base de datos, scripts ni formularios. No altera la colaboración ni requiere otro APK. Reutiliza el icono de cuatro puntas.

## Publicar en Cloudflare Pages

1. Workers & Pages → crear aplicación → Continue to Pages → Drag and drop your files → Get started.
2. Elige un nombre disponible (por ejemplo `tareas-universidad`); no es una URL ya reservada.
3. Sube un ZIP con **el contenido de `web-info/` en la raíz**, no el repositorio ni el APK. `index.html` debe estar en la raíz del ZIP.
4. Publica y copia la URL HTTPS real asignada por Cloudflare. No deduzcas el nombre a partir del ejemplo.
5. Comprueba inicio, `/privacidad.html`, `/condiciones.html` y `/contacto.html` sin iniciar sesión. Revisa también los textos antes de solicitar aprobación.

Para crear el ZIP desde la raíz del repositorio con Python:

```sh
python3 -c 'from pathlib import Path; from zipfile import ZipFile, ZIP_DEFLATED; p=Path("web-info"); z=ZipFile("/home/user/tareas-web-cloudflare.zip", "w", ZIP_DEFLATED); [z.write(f, f.name) for f in sorted(p.iterdir()) if f.is_file()]; z.close()'
```

## Google: todavía requiere comprobaciones

Tras publicar, utiliza la URL real como página principal y las rutas de privacidad/condiciones del mismo sitio. No borres el dominio Supabase utilizado por el acceso existente ni cambies el secreto o el callback OAuth.

Comprueba la verificación de propiedad en Google Search Console. Para una dirección `pages.dev`, intenta una propiedad de **prefijo de URL** con la URL HTTPS exacta. Usa el archivo HTML o la etiqueta que Google proporcione y vuelve a desplegarlo en esta misma web. No inventes el token de verificación ni confíes en que publicar la web garantiza que Google acepte el dominio: si Google rechaza el subdominio o exige otra configuración, revisa el aviso antes de seguir.

La configuración de marca, publicación del público y aprobación por Google son pasos diferentes de publicar estos archivos. No se da por aprobado ni por abierto a cualquier cuenta hasta comprobar el estado en Google y un acceso real de una cuenta no incluida como usuario de prueba.

El contacto público es el repositorio, sin publicar el correo personal del propietario. Las incidencias son públicas: se indica no publicar datos personales y usar un canal privado para solicitudes de cuenta. Antes de un lanzamiento amplio, el propietario debe comprobar que puede atender ese canal. No hay borrado automático de cuenta en esta versión; la política no lo promete.

Validación local: `node --test tests/web-info.test.mjs` comprueba enlaces locales, descarga, ausencia de scripts/configuración de autenticación y avisos esenciales de privacidad. Una prueba local no confirma el despliegue remoto ni la aprobación de Google.

## Descarga fuera del visor del chat

El workflow `publicar-web-info.yml` valida esta web, crea el ZIP con los siete archivos permitidos y lo añade a la release existente sin reemplazar el APK ni usar `--clobber`. La descarga estará disponible tras finalizar correctamente:

`https://github.com/enriqueortizvasquez-prog/App-apuntes/releases/download/v1.4.0-beta/tareas-web-cloudflare.zip`

No se considera publicado por el mero hecho de guardar el workflow: comprueba el resultado y el asset en GitHub. Un nuevo contenido debe publicarse con otro nombre/versionado explícito; el workflow falla si se intenta reemplazar un ZIP existente.
