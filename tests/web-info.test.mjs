import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';

const root = resolve(import.meta.dirname, '../web-info');
const pages = ['index.html', 'privacidad.html', 'condiciones.html', 'contacto.html'];

test('La web informativa tiene enlaces locales válidos y no carga la app ni scripts', async () => {
  for (const name of pages) {
    const file = resolve(root, name);
    const source = await readFile(file, 'utf8');
    assert.match(source, /<html lang="es">/);
    assert.doesNotMatch(source, /<script\b|sb_publishable_|sb_secret_|client_secret|apuntes:\/\//i);
    for (const [, target] of source.matchAll(/(?:href|src)="([^"]+)"/g)) {
      if (/^https:\/\//.test(target)) continue;
      assert.ok(!target.startsWith('/') && !target.includes('..'));
      await access(resolve(dirname(file), target));
    }
  }
});

test('Inicio enlaza privacidad y descarga; privacidad explica Google y borrado real', async () => {
  const home = await readFile(resolve(root, 'index.html'), 'utf8');
  const privacy = await readFile(resolve(root, 'privacidad.html'), 'utf8');
  assert.match(home, /href="privacidad.html"/);
  assert.match(home, /tareas-android-v1\.4\.0-beta\.apk/);
  assert.match(privacy, /identificador, correo y perfil/);
  assert.match(privacy, /no tiene una pantalla para eliminar la cuenta remota/);
  assert.match(privacy, /no el mensaje completo de WhatsApp/);
});
