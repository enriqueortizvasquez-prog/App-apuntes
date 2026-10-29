# Tareas 1.5 beta — eliminar cursos compartidos

Corrige el error «El propietario no puede abandonar el espacio» al intentar eliminar un curso compartido.

## Cómo eliminarlo

1. Exporta un respaldo antes de cambiar de APK y antes de eliminar datos que quieras conservar.
2. Instala Tareas 1.5. Si Android rechaza la actualización por una firma beta diferente, necesitarás desinstalar y restaurar tu respaldo; no desinstales sin guardarlo.
3. En Cursos, pulsa **Eliminar para todos** en el curso del que eres propietario y lee la confirmación. También está en Cuenta y colaboración.
4. Al confirmar se borran definitivamente el espacio, sus deberes compartidos, progresos e invitaciones. Tus compañeros lo dejarán de ver al sincronizar. **No hay deshacer.**

Solo el propietario puede eliminarlo, verificado por el servidor. Administradores no propietarios y miembros conservan Abandonar sin borrar el espacio para los demás. Los datos locales independientes y otros cursos se conservan; no se eliminan copias independientes ni respaldos existentes.

El backend ya está actualizado. No se eliminó ningún curso real al preparar esta versión. No hace falta volver a configurar Google ni cambiar credenciales. La identidad Android sigue siendo `pe.apuntes.app`.

Esta descarga solo se publica después de superar pruebas unitarias/PGlite, suites de interfaz y seis pruebas instrumentadas en Android 35. Además, se comprobó el permiso y borrado en el servicio real con fixtures revertidas, sin modificar datos del usuario. La prueba de interfaz usa API controlada; el nuevo borrado manual en el celular del propietario todavía requiere confirmación.

Se mantienen la estrella de cuatro puntas, 20 colores, invitaciones pegadas y sincronización con progreso individual. Las versiones anteriores no se reemplazan.
