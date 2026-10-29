# Apuntes

Una app gratuita para organizar los deberes de la universidad. Diseño **Grafito**, sin anuncios y sin suscripción propia. Instalable como PWA en Android, iPhone/iPad y escritorio desde un sitio HTTPS. También se entrega un **HTML independiente** que se puede descargar y abrir sin instalar nada.

> Este repositorio se mantiene **privado por decisión de su propietario**. Las releases y los artefactos de GitHub solo están disponibles para usuarios con acceso. No se ha publicado el código ni un sitio público. Una URL de vista previa temporal no sustituye un alojamiento permanente.

## Funciones

- Crear, editar y reprogramar deberes con fecha y hora, prioridad, notas y enlace de referencia.
- Mis deberes incluye todos los no completados (también vencidos). Completar mueve el deber a Completados; se puede deshacer.
- Cursos al mismo nivel que las demás vistas; añadir y eliminar con confirmación. Un curso con deberes exige trasladarlos para no perderlos.
- Calendario: borde verde para entregas por vencer y rojo si alguna ya venció. Un punto por curso, sin texto ni contadores en la casilla. La hora también determina el vencimiento.
- Color suave de cada curso en su tarjeta y **solo en su nombre** en las filas de deberes. «Importante» sin negrita.
- Buscar y ordenar; adaptación a móvil y navegación por teclado.
- Notas, enlace HTTP/HTTPS y recordatorios personales. **Los avisos solo se comprueban con la app abierta/en ejecución; no se prometen avisos con la app cerrada.**
- Copias de un deber o curso por enlace o WhatsApp, sin cuenta. No incluyen progreso, recordatorios ni notas personales; incluir notas compartidas y enlace es opcional.
- Respaldo JSON exportable/importable y recuperación de datos en bruto.
- Instalación PWA, caché sin conexión y HTML portable sin dependencias de red.
- **Colaboración real opcional**: cuentas, cursos/deberes sincronizados, permisos verificados en servidor, invitaciones de 7 días revocables, gestión de miembros, progreso independiente y control de conflictos al editar. Requiere configurar un proyecto Supabase. **No está activa hasta que el propietario configure ese servicio.** No hay cuentas ficticias ni sincronización simulada.

No se han añadido subtareas, comentarios ni recurrencias: quedaron fuera del alcance acordado.

## Usar o descargar gratis

1. Descarga `apuntes-portable.html` desde la release (con acceso a este repositorio) o desde el archivo entregado en la conversación.
2. Ábrelo en un navegador moderno: todos los datos locales se quedan en ese navegador. El archivo portable no se instala como PWA y sus enlaces `file://` no son accesibles por otras personas.
3. Para instalar como app, usa la publicación HTTPS de `dist/`. Ver [instalación](docs/INSTALAR.md).
4. Para preparar la colaboración real, consulta [configuración](docs/COLABORACION.md) y [privacidad](PRIVACY.md).

**No es un APK ni una aplicación de App Store.** Es una web instalable y un HTML descargable. No se cobran pagos por la app; el proveedor de alojamiento/datos puede tener cuotas propias.

## Desarrollo y pruebas

Requisitos: Node.js 22 y npm. No hay dependencias de producción ni CDN.

```sh
npm ci
npm test
npm run build
npm run test:ui
npm run dev       # 0.0.0.0:3000
```

`npm run build` produce:

- `dist/`: sitio estático listo para HTTPS, incluyendo rutas relativas compatibles con `/App-apuntes/`.
- `dist/descargas/apuntes-portable.html`: una sola página con JS/CSS incrustados.
- `dist/descargas/apuntes-v1.0.0.zip`: sitio, HTML portable, instrucciones y SQL opcional.

Para servir el resultado de producción: `SERVE_DIR=dist npm run dev`. No publiques `node_modules` ni archivos de pruebas/credenciales.

Los ejemplos no se cargan automáticamente en una app nueva. Están en Ajustes y solo pueden añadirse a una app vacía. Si se detectan datos del prototipo anterior en el mismo origen, se migran sin borrar la copia anterior.

## GitHub

- `Pruebas y descarga` ejecuta pruebas y genera un artefacto descargable para personas con acceso al repositorio.
- `Publicar sitio (opcional)` es **manual**; no modifica la privacidad ni activa Pages automáticamente. GitHub Pages desde un repositorio privado puede requerir un plan compatible. Alternativamente, publica `dist/` en un alojamiento estático HTTPS de tu elección sin hacer público el repositorio. Antes de publicar, revisa la visibilidad del sitio: un repositorio privado no implica que el sitio sea privado.
- Configura los valores públicos de colaboración en `config.js`. **Nunca añadas `service_role`, claves secretas, contraseñas ni tokens de GitHub.**

## Límites importantes

Sin servicio configurado: funciona todo lo local y el envío de copias; no funciona el colaborativo. Con servicio: las operaciones de colaboración necesitan internet; los cambios se consultan cada 20 segundos con la app abierta. No se encolan modificaciones remotas sin conexión. Cada usuario elige sus recordatorios, que siguen siendo locales a su dispositivo.

Borrar datos del navegador/desinstalar puede eliminar lo local. Descarga respaldos periódicamente. Un enlace de copia contiene los datos elegidos: quien lo reciba puede leerlos y no puede revocarse. Un enlace colaborativo es un token de acceso: compártelo con personas de confianza y revócalo si es necesario.

El acceso al repositorio no concede automáticamente permiso para redistribuir su código. No se ha añadido una licencia pública sin autorización del propietario.
