import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
test("Tareas cambia el nombre instalado sin cambiar identidad, almacenamiento o retorno OAuth", async () => {
  const manifest = JSON.parse(
    await readFile(new URL("../manifest.webmanifest", import.meta.url), "utf8"),
  );
  assert.equal(manifest.short_name, "Tareas");
  assert.ok(manifest.name.startsWith("Tareas"));
  assert.equal(manifest.id, "./");
  const android = await readFile(
    new URL("../android/app/src/main/AndroidManifest.xml", import.meta.url),
    "utf8",
  );
  assert.match(android, /android:label="Tareas"/);
  assert.match(android, /android:scheme="apuntes" android:host="open"/);
  const gradle = await readFile(
    new URL("../android/app/build.gradle", import.meta.url),
    "utf8",
  );
  assert.match(gradle, /applicationId 'pe.apuntes.app'/);
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  assert.match(app, /STORAGE = "apuntes-v1"/);
  const icon = await readFile(
    new URL("../icons/icon.svg", import.meta.url),
    "utf8",
  );
  assert.match(icon, /data-logo="four-point-star"/);
  assert.doesNotMatch(icon, /<text/);
});
