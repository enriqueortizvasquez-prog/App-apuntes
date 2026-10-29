import { browser } from "./browser-util.mjs";
import { readFile } from "node:fs/promises";
const b = await browser();
try {
  const page = await b.newPage();
  const svg = await readFile("icons/icon.svg", "utf8");
  for (const size of [192, 512]) {
    await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
    await page.setContent(
      `<style>*{margin:0}svg{width:100vw;height:100vh}</style>${svg}`,
    );
    await page.screenshot({ path: `icons/icon-${size}.png` });
  }
  await page.screenshot({ path: "icons/maskable-512.png" });
} finally {
  await b.close();
}
