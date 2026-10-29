import { readFile, writeFile, mkdir, cp, rm } from "node:fs/promises";
import { zipSync, strToU8 } from "fflate";
const files = [
  "index.html",
  "styles.css",
  "app.js",
  "config.js",
  "manifest.webmanifest",
  "sw.js",
  "src/domain.js",
  "src/cloud.js",
  "src/oauth.js",
  "src/install.js",
  "src/native.js",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/maskable-512.png",
  "icons/icon.svg",
  "README.md",
  "PRIVACY.md",
  "docs/INSTALAR.md",
  "docs/COLABORACION.md",
  "docs/GOOGLE.md",
  "docs/PRUEBAS.md",
  "docs/ANDROID.md",
  "supabase/schema.sql",
  "supabase/migrations/20261029_delete_space.sql",
];
await rm("dist", { recursive: true, force: true });
await mkdir("dist/descargas", { recursive: true });
for (const file of files) {
  await mkdir("dist/" + file.split("/").slice(0, -1).join("/"), {
    recursive: true,
  });
  await cp(file, "dist/" + file);
}
let html = await readFile("index.html", "utf8");
html = html.replace(
  /<link[^>]*href="(?:\.\/)?(?:manifest\.webmanifest|icons\/[^\"]*)"[^>]*>/g,
  "",
);
html = html.replace(
  '<link rel="stylesheet" href="styles.css" />',
  "<style>" + (await readFile("styles.css", "utf8")) + "</style>",
);
html = html.replace(
  /<script src="config.js"><\/script>/,
  "<script>" + (await readFile("config.js", "utf8")) + "</script>",
);
const modules = [
  "src/domain.js",
  "src/cloud.js",
  "src/oauth.js",
  "src/native.js",
  "src/install.js",
  "app.js",
];
let code = "";
for (const file of modules) {
  let text = await readFile(file, "utf8");
  text = text
    .replace(/^import[\s\S]*?from\s*["'][^"']+["'];?\s*/gm, "")
    .replace(/^export /gm, "");
  code += "\n" + text;
}
html = html.replace(
  /<script type="module" src="app.js"><\/script>/,
  '<script>"use strict";(()=>{\n' +
    code.replace(/<\/script/gi, "<\\/script") +
    "\n})();</script>",
);
if (/script[^>]*src=|link[^>]*rel="stylesheet"/.test(html))
  throw Error("El HTML portable aún depende de archivos externos.");
await writeFile("dist/descargas/tareas-portable.html", html);
// Keep previously distributed web download URLs working after the rename.
await writeFile("dist/descargas/apuntes-portable.html", html);
const archive = {};
for (const file of files)
  archive["Tareas/" + file] = new Uint8Array(await readFile(file));
for (const file of [
  "package.json",
  "package-lock.json",
  ".gitignore",
  "scripts/server.mjs",
  "scripts/build.mjs",
  "scripts/browser-util.mjs",
  "scripts/icons.mjs",
  "tests/domain.test.mjs",
  "tests/paste-invite.test.mjs",
  "tests/paste-invite-browser.mjs",
  "tests/branding-browser.mjs",
  "tests/cloud.test.mjs",
  "tests/oauth.test.mjs",
  "tests/oauth-browser.mjs",
  "tests/security.test.mjs",
  "tests/browser.mjs",
  "tests/cloud-browser.mjs",
  "tests/native.test.mjs",
  "tests/native-browser.mjs",
]) {
  archive["Tareas/" + file] = new Uint8Array(await readFile(file));
}
archive["Tareas/LEEME.txt"] = strToU8(
  "TAREAS 1.5.0-beta — GRATIS\n\nSin instalar: abre descargas/tareas-portable.html.\nPWA: publica los archivos del sitio en un alojamiento HTTPS.\nDesarrollo: instala Node.js 22 y ejecuta npm ci, npm test, npm run build y npm run dev.\nGuarda tus datos: Ajustes y respaldo > Descargar respaldo JSON.\nEl servicio público de colaboración está incluido. El acceso Google requiere activar el proveedor; consulta docs/GOOGLE.md.\nEl repositorio es público por autorización del propietario.\n",
);
archive["Tareas/descargas/tareas-portable.html"] = strToU8(html);
await writeFile(
  "dist/descargas/tareas-v1.5.0-beta.zip",
  zipSync(archive, { level: 9 }),
);
console.log("Build listo: dist/ · HTML independiente · ZIP descargable");
