import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
const root = path.resolve(process.env.SERVE_DIR || "."),
  port = Number(process.env.PORT || 3000);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".md": "text/plain; charset=utf-8",
  ".zip": "application/zip",
};
http
  .createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(
        new URL(req.url, "http://local").pathname,
      );
      if (
        pathname
          .split("/")
          .some((s) => s.startsWith(".") || s === "node_modules") ||
        pathname.includes("\\")
      ) {
        res.writeHead(404).end();
        return;
      }
      let relative = pathname;
      // Test both / and the project Pages-style /App-apuntes/ base path.
      if (relative.startsWith("/App-apuntes/"))
        relative = relative.slice("/App-apuntes".length);
      let file = path.resolve(root, "." + relative);
      if (file !== root && !file.startsWith(root + path.sep)) {
        res.writeHead(403).end();
        return;
      }
      if ((await stat(file)).isDirectory())
        file = path.join(file, "index.html");
      const data = await readFile(file);
      res.writeHead(200, {
        "Content-Type": types[path.extname(file)] || "application/octet-stream",
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff",
      });
      if (req.method !== "HEAD") res.end(data);
      else res.end();
    } catch {
      res
        .writeHead(404, { "Content-Type": "text/plain; charset=utf-8" })
        .end("No se encontró el archivo. Vuelve al inicio de Apuntes.");
    }
  })
  .listen(port, "0.0.0.0", () =>
    console.log(`Apuntes en 0.0.0.0:${port} (${root})`),
  );
