import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { browser } from "../scripts/browser-util.mjs";
import { runCloudTests } from "./cloud-browser.mjs";
const server = spawn(process.execPath, ["scripts/server.mjs"], {
  env: { ...process.env, SERVE_DIR: "dist", PORT: "4173" },
  stdio: ["ignore", "pipe", "pipe"],
});
const b = await browser();
const errors = [];
await mkdir(".test-artifacts", { recursive: true });
const track = (page) => page.on("pageerror", (e) => errors.push(e.message));
const root = "http://localhost:4173";
const store = (page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("apuntes-v1")));
async function fill(page, selector, value) {
  await page.$eval(selector, (e, v) => (e.value = v), value);
  await page.$eval(selector, (e) =>
    e.dispatchEvent(new Event("input", { bubbles: true })),
  );
}
async function close(page, id) {
  await page.click(`#${id} [data-close]`);
}
try {
  await new Promise((resolve, reject) => {
    server.stdout.once("data", resolve);
    server.once("error", reject);
    setTimeout(
      () => reject(Error("Servidor de pruebas no arrancó")),
      10000,
    ).unref();
  });
  const page = await b.newPage();
  track(page);
  await page.setViewport({ width: 1440, height: 1000 });
  await page.emulateTimezone("America/Lima");
  await page.goto(root, { waitUntil: "networkidle0" });
  assert.equal(await page.$eval("#new-task", (e) => e.disabled), true);
  assert.equal(await page.$eval("#courses-count", (e) => e.textContent), "0");
  assert.equal(await page.$eval(".welcome", (e) => e.hidden), false);
  // Start empty, optional examples, completion separated + undo.
  await page.click("#reset-demo");
  await page.click("#load-examples");
  await page.click("#confirm-reset");
  assert.equal((await store(page)).tasks.length, 6);
  assert.equal(await page.$$eval("#task-list .task", (es) => es.length), 4);
  await page.click("#task-list .task-check");
  assert.equal(await page.$$eval("#task-list .task", (es) => es.length), 3);
  await page.click("#undo-button");
  assert.equal(await page.$$eval("#task-list .task", (es) => es.length), 4);
  await page.click('[data-view="completed"]');
  assert.equal(await page.$$eval("#task-list .task", (es) => es.length), 2);
  assert.equal(await page.$eval(".welcome", (e) => e.hidden), true);
  // Edit time, rich personal details and reschedule persist after reload.
  await page.click('[data-view="pending"]');
  await page.click('[data-task-id="demo-1"] .task-title-button');
  await fill(page, "#task-title", "Examen de límites 🎓");
  await fill(page, "#task-notes", "Notas <script>window.hacked=true</script>");
  await fill(page, "#task-link", "https://example.com/referencia");
  await page.select("#task-reminder", "60");
  await fill(page, "#task-time", "18:30");
  await page.click("#save-task");
  assert.equal((await store(page)).tasks[0].time, "18:30");
  assert.equal(await page.evaluate(() => window.hacked), undefined);
  await page.reload({ waitUntil: "networkidle0" });
  assert.equal((await store(page)).tasks[0].title, "Examen de límites 🎓");
  assert.equal(
    await page.$eval(".priority", (e) => getComputedStyle(e).fontWeight),
    "400",
  );
  // Course deletion transfers everything, including completed tasks, losslessly.
  await page.click('[data-view="courses"]');
  assert.equal(await page.$eval(".welcome", (e) => e.hidden), true);
  const before = (await store(page)).tasks.filter((t) => t.course === "math");
  await page.click('[data-course-card="math"] .delete-course-button');
  assert.equal(
    await page.$eval("#confirm-delete-course", (e) => e.disabled),
    true,
  );
  await page.select("#move-course", "lit");
  await page.click("#confirm-delete-course");
  let data = await store(page);
  assert.equal(data.courses.length, 3);
  for (const t of before)
    assert.deepEqual(
      data.tasks.find((x) => x.id === t.id),
      { ...t, course: "lit" },
    );
  // Add a real course and task (no sample dependency).
  await page.click("#add-course");
  await fill(page, "#course-name", "Física II");
  await page.click('#course-form button[type="submit"]');
  data = await store(page);
  const newId = data.courses.find((c) => c.name === "Física II").id;
  await page.click(`[data-course-card="${newId}"] .open-course`);
  assert.equal(await page.$eval(".welcome", (e) => e.hidden), true);
  await page.click("#new-task");
  await fill(page, "#task-title", "Práctica nueva");
  await fill(page, "#task-due", "2030-01-01");
  await page.click("#save-task");
  assert.equal((await store(page)).tasks.length, 7);
  // Copy links: no progress, reminders, private notes or unwanted optional data.
  await page.click('[data-view="pending"]');
  await page.click('[data-task-id="demo-1"] summary');
  await page.click('[data-task-id="demo-1"] .share-task');
  const link = await page.$eval("#share-link", (e) => e.value);
  const payload = JSON.parse(
    Buffer.from(link.split("#apuntes=")[1], "base64url").toString(),
  );
  assert.equal(payload.tasks[0].notes, "");
  assert.equal(payload.tasks[0].done, undefined);
  assert.equal(payload.tasks[0].reminder, undefined);
  await page.click('[name="share-mode"][value="shared"]');
  assert.equal(
    await page.$eval("#create-shared-link", (e) => e.disabled),
    true,
  );
  assert.equal(await page.$eval("#share-link", (e) => e.value), "");
  await close(page, "share-dialog");
  const context = await b.createBrowserContext();
  const recipient = await context.newPage();
  track(recipient);
  await recipient.goto(link, { waitUntil: "networkidle0" });
  await recipient.click("#accept-invite");
  assert.equal((await store(recipient)).tasks.length, 1);
  await recipient.click(".task-check");
  assert.equal((await store(recipient)).tasks[0].done, true);
  assert.equal(
    (await store(page)).tasks.find((t) => t.id === "demo-1").done,
    false,
  );
  await context.close();
  // Backup import strips remote fields, replaces only after confirmation.
  const fixture = {
    courses: [
      { id: "a", name: "A", color: "#a9c2e8" },
      { id: "b", name: "B", color: "#c4afe3" },
    ],
    tasks: [
      {
        id: "late",
        title: "Vencida",
        course: "a",
        due: "2030-01-10",
        time: "09:00",
        priority: "high",
        done: false,
      },
      {
        id: "future",
        title: "Más tarde",
        course: "a",
        due: "2030-01-10",
        time: "21:00",
        priority: "normal",
        done: false,
      },
      {
        id: "other",
        title: "Otro curso",
        course: "b",
        due: "2030-01-10",
        time: "23:59",
        priority: "normal",
        done: false,
      },
      {
        id: "done",
        title: "Terminada",
        course: "b",
        due: "2030-01-10",
        time: "08:00",
        priority: "normal",
        done: true,
      },
    ],
  };
  await writeFile(".test-artifacts/backup.json", JSON.stringify(fixture));
  page.on("dialog", (d) => d.accept());
  await page.click("#reset-demo");
  const input = await page.$("#import-backup");
  await input.uploadFile(path.resolve(".test-artifacts/backup.json"));
  await page.waitForFunction(
    () => document.querySelector("#courses-count").textContent === "2",
  );
  // Freeze time to validate exact-hour red/green, selected borders and one dot/course.
  await page.evaluateOnNewDocument(() => {
    const Native = Date;
    globalThis.Date = class extends Native {
      constructor(...args) {
        super(...(args.length ? args : ["2030-01-10T12:00:00-05:00"]));
      }
      static now() {
        return new Native("2030-01-10T12:00:00-05:00").getTime();
      }
    };
  });
  await page.reload({ waitUntil: "networkidle0" });
  await page.click('[data-view="calendar"]');
  assert.equal(
    await page.$eval('[data-date="2030-01-10"]', (e) =>
      e.classList.contains("overdue"),
    ),
    true,
  );
  assert.equal(
    await page.$$eval(
      '[data-date="2030-01-10"] .calendar-course-dot',
      (es) => es.length,
    ),
    2,
  );
  assert.equal(
    await page.$eval('[data-date="2030-01-10"]', (e) => e.textContent.trim()),
    "10",
  );
  await page.click('[data-date="2030-01-10"]');
  assert.equal(
    await page.$eval(
      '[data-date="2030-01-10"]',
      (e) => getComputedStyle(e).borderTopColor,
    ),
    "rgb(223, 133, 133)",
  );
  await page.click('[data-task-id="late"] .task-check');
  assert.equal(
    await page.$eval('[data-date="2030-01-10"]', (e) =>
      e.classList.contains("overdue"),
    ),
    false,
  );
  assert.equal(
    await page.$eval(
      '[data-date="2030-01-10"]',
      (e) => getComputedStyle(e).borderTopColor,
    ),
    "rgb(121, 188, 145)",
  );
  // Actual offline reload through service worker, not just localStorage.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await page.setOfflineMode(true);
  await page.reload({ waitUntil: "networkidle0" });
  assert.equal(await page.$eval("#courses-count", (e) => e.textContent), "2");
  await page.click('[data-view="courses"]');
  assert.equal(await page.$$eval(".course-card", (es) => es.length), 2);
  await page.setOfflineMode(false);
  // Mobile does not overflow, hero remains exclusive to pending and menu works.
  await page.setViewport({
    width: 390,
    height: 844,
    isMobile: true,
    hasTouch: true,
  });
  await page.waitForFunction(
    () =>
      !!document.querySelector("#open-menu") &&
      document.querySelector("#breadcrumb-title").textContent,
  );
  await page.click("#open-menu");
  await page.waitForFunction(
    () => document.querySelector("#sidebar").getBoundingClientRect().x >= 0,
  );
  await page.click('[data-view="pending"]');
  assert.equal(await page.$eval(".welcome", (e) => e.hidden), false);
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.waitForFunction(
    () => document.querySelector("#sidebar").getBoundingClientRect().right <= 0,
  );
  await page.screenshot({ path: ".test-artifacts/mobile.png", fullPage: true });
  await page.setViewport({ width: 1440, height: 1000 });
  await page.screenshot({
    path: ".test-artifacts/desktop.png",
    fullPage: true,
  });
  // Relative paths under a subfolder (Pages) and standalone file:// both execute.
  const sub = await b.newPage();
  track(sub);
  await sub.goto(root + "/App-apuntes/", { waitUntil: "networkidle0" });
  assert.ok(await sub.$("#new-task"));
  assert.equal(await sub.$eval("#courses-count", (e) => e.textContent), "2");
  const portable = await b.newPage();
  track(portable);
  await portable.goto(
    pathToFileURL(path.resolve("dist/descargas/apuntes-portable.html")).href,
    { waitUntil: "networkidle0" },
  );
  assert.equal(await portable.$eval("#new-task", (e) => e.disabled), true);
  await portable.click("#reset-demo");
  await portable.click("#load-examples");
  await portable.click("#confirm-reset");
  assert.equal(await portable.$$eval("#task-list .task", (es) => es.length), 4);
  await portable.reload({ waitUntil: "networkidle0" });
  assert.equal(await portable.$$eval("#task-list .task", (es) => es.length), 4);
  await runCloudTests(b, root, track);
  assert.deepEqual(errors, []);
  console.log(
    "✓ Navegador: creación, edición, completados/deshacer, traslado sin pérdidas, copias independientes, respaldo, calendario, PWA offline, móvil, subruta y HTML file://. Sin errores de ejecución.",
  );
} finally {
  await b.close();
  server.kill();
}
