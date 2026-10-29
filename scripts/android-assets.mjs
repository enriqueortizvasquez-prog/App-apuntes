import { cp, readFile, writeFile, mkdir, rm } from "node:fs/promises";
const base = "android/app/src/main/assets/site";
await rm("android/app/src/main/assets", { recursive: true, force: true });
await mkdir(base, { recursive: true });
for (const file of [
  "index.html",
  "styles.css",
  "app.js",
  "config.js",
  "src",
  "icons",
  "docs",
  "PRIVACY.md",
])
  await cp("dist/" + file, base + "/" + file, { recursive: true });
let html = await readFile(base + "/index.html", "utf8");
html = html.replace(
  '<script src="config.js"></script>',
  '<script>window.APUNTES_ANDROID=true;</script><script src="config.js"></script>',
);
if (!html.includes("window.APUNTES_ANDROID=true"))
  throw Error("No se preparó la entrada Android");
await writeFile(base + "/index.html", html);
console.log(
  "Assets de Android incluidos: no dependen de una página web remota.",
);
