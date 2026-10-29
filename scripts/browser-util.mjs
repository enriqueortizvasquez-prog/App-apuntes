import chromium, { inflate } from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { createRequire } from "node:module";
import path from "node:path";
export async function browser() {
  const require = createRequire(import.meta.url),
    base = path.dirname(require.resolve("@sparticuz/chromium"));
  await inflate(path.resolve(base, "../bin/al2023.tar.br"));
  const executablePath = await chromium.executablePath();
  return puppeteer.launch({
    args: chromium.args.filter((arg) => arg !== "--single-process"),
    executablePath,
    headless: true,
    env: {
      ...process.env,
      LD_LIBRARY_PATH: `/tmp/al2023/lib:/tmp:${process.env.LD_LIBRARY_PATH || ""}`,
    },
  });
}
