import assert from "node:assert/strict";
// UI integration with a controlled Auth/PostgREST fixture. Actual SQL permissions
// execute independently in security.test.mjs against embedded PostgreSQL.
export async function runCloudTests(browser, root, track) {
  const context = await browser.createBrowserContext();
  try {
    const page = await context.newPage();
    track(page);
    const A = "10000000-0000-0000-0000-000000000001",
      B = "10000000-0000-0000-0000-000000000002";
    let user = A,
      fail = false,
      updates = 0;
    const session = (id) => ({
      user: { id, email: `${id === A ? "a" : "b"}@example.com` },
      access_token: "token-" + id,
      refresh_token: "refresh-" + id,
      expires_at: Date.now() / 1000 + 3600,
    });
    const space = {
      id: "20000000-0000-0000-0000-000000000001",
      owner_id: A,
      title: "Física",
      kind: "course",
    };
    let task = {
      id: "30000000-0000-0000-0000-000000000001",
      space_id: space.id,
      client_ref: "source",
      title: "Entrega compartida",
      course_name: "Física",
      color: "#a9c2e8",
      due: "2030-01-01",
      due_time: "18:00:00",
      priority: "normal",
      notes: "",
      link: "",
      version: 1,
    };
    const progress = new Map();
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization,apikey,content-type",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Content-Type": "application/json",
    };
    await page.setRequestInterception(true);
    page.on("request", async (req) => {
      if (req.url() === root + "/config.js")
        return req.respond({
          status: 200,
          contentType: "text/javascript",
          body: 'window.APUNTES_CONFIG={supabaseUrl:"https://test.supabase.co",supabaseKey:"sb_publishable_test"}',
        });
      if (!req.url().startsWith("https://test.supabase.co"))
        return req.continue();
      if (req.method() === "OPTIONS")
        return req.respond({ status: 204, headers });
      const url = new URL(req.url()),
        body = JSON.parse(req.postData() || "{}");
      let data = null,
        status = 200;
      switch (url.pathname) {
        case "/rest/v1/shared_spaces":
          data = [space];
          break;
        case "/rest/v1/shared_tasks":
          data = [task];
          break;
        case "/rest/v1/space_members":
          data = [
            {
              space_id: space.id,
              user_id: user,
              role: user === A ? "admin" : "member",
            },
          ];
          break;
        case "/rest/v1/task_progress":
          data = progress.has(user)
            ? [{ task_id: task.id, done: progress.get(user) }]
            : [];
          break;
        case "/rest/v1/rpc/update_shared_task":
          updates++;
          task = {
            ...task,
            title: body.p_data.title,
            version: task.version + 1,
          };
          data = task;
          break;
        case "/rest/v1/rpc/set_task_progress":
          if (fail) {
            status = 503;
            data = { message: "Sin conexión al servicio" };
          } else progress.set(user, body.p_done);
          break;
        case "/auth/v1/token":
          user = B;
          data = session(B);
          break;
        case "/auth/v1/logout":
          break;
        default:
          status = 404;
          data = { message: "Ruta de prueba desconocida" };
      }
      return req.respond({ status, headers, body: JSON.stringify(data) });
    });
    await page.evaluateOnNewDocument((s) => {
      sessionStorage.setItem("apuntes-session", JSON.stringify(s));
      localStorage.setItem(
        "apuntes-v1",
        JSON.stringify({
          courses: [{ id: "physics", name: "Física", color: "#a9c2e8" }],
          tasks: [
            {
              id: "source",
              title: "Entrega compartida",
              course: "physics",
              due: "2030-01-01",
              time: "18:00",
              done: false,
              priority: "normal",
              notes: "Solo para mí",
              reminder: "60",
            },
          ],
        }),
      );
    }, session(A));
    await page.goto(root, { waitUntil: "networkidle0" });
    await page.waitForFunction(() => document.querySelector(".shared-badge"));
    const stored = () =>
      page.evaluate(() => JSON.parse(localStorage.getItem("apuntes-v1")));
    let data = await stored();
    assert.equal(data.tasks.length, 1);
    assert.equal(data.courses.length, 1);
    assert.equal(data.tasks[0].personalNotes, "Solo para mí");
    assert.equal(data.tasks[0].reminder, "60");
    await page.click(".task-title-button");
    assert.equal(await page.$eval("#task-title", (e) => e.disabled), false);
    await page.$eval(
      "#task-title",
      (e) => (e.value = "Editado por administrador"),
    );
    await page.click("#save-task");
    await page.waitForFunction(
      () => !document.querySelector("#task-dialog").open,
    );
    assert.equal(updates, 1);
    await page.click("#reset-demo");
    await page.click("#open-cloud");
    await page.click("#sign-out");
    await page.waitForFunction(
      () => !document.querySelector("#auth-form").hidden,
    );
    assert.equal((await stored()).tasks.length, 0);
    await page.click("#email-access summary");
    await page.type("#auth-email", "b@example.com");
    await page.type("#auth-password", "testpassword");
    await page.click('#auth-form button[type="submit"]');
    await page.waitForFunction(
      () => !document.querySelector("#cloud-account").hidden,
    );
    await page.click("#cloud-dialog [data-close]");
    await page.click("#settings-dialog [data-close]");
    await page.click(".task-title-button");
    assert.equal(await page.$eval("#task-title", (e) => e.disabled), true);
    await page.select("#task-reminder", "15");
    await page.$eval("#personal-notes", (e) => (e.value = "Mi propia nota"));
    await page.click("#save-task");
    assert.equal(updates, 1);
    data = await stored();
    assert.equal(data.tasks[0].personalNotes, "Mi propia nota");
    assert.equal(data.tasks[0].reminder, "15");
    fail = true;
    await page.click(".task-check");
    await page.waitForFunction(
      () => !document.querySelector(".task-check").disabled,
    );
    assert.equal((await stored()).tasks[0].done, false);
    assert.equal(await page.$eval(".task-check", (e) => e.checked), false);
    fail = false;
    await page.click(".task-check");
    await page.waitForFunction(
      () => document.querySelector("#completed-count").textContent === "1",
    );
    assert.equal(progress.get(B), true);
    assert.equal(progress.get(A), undefined);
    assert.equal((await stored()).tasks[0].done, true);
    console.log(
      "✓ Colaboración UI: conversión sin duplicados, notas privadas, administrador/miembro, cambio de cuenta, progreso y rechazo sin conexión (API controlada).",
    );
  } finally {
    await context.close();
  }
}

export async function runDeleteSpaceTests(browser, root, track) {
  const contexts = [];
  const A = "10000000-0000-0000-0000-000000000001";
  const B = "10000000-0000-0000-0000-000000000002";
  const S = "20000000-0000-0000-0000-000000000001";
  let deleted = false,
    failDelete = false,
    deleteCalls = 0,
    leaveCalls = 0,
    releaseDelete;
  const shared = {
    id: S,
    owner_id: A,
    title: "Curso compartido",
    kind: "course",
  };
  const remote = {
    id: "30000000-0000-0000-0000-000000000001",
    space_id: S,
    client_ref: "not-local",
    title: "Deber común",
    course_name: "Curso compartido",
    color: "#a9c2e8",
    due: "2030-01-01",
    due_time: "18:00:00",
    priority: "normal",
    notes: "",
    link: "",
    version: 1,
  };
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization,apikey,content-type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Content-Type": "application/json",
  };
  async function makePage(user) {
    const context = await browser.createBrowserContext();
    contexts.push(context);
    const page = await context.newPage();
    track(page);
    await page.setBypassServiceWorker(true);
    await page.setRequestInterception(true);
    page.on("request", async (req) => {
      if (req.url() === root + "/config.js")
        return req.respond({
          status: 200,
          contentType: "text/javascript",
          body: 'window.APUNTES_CONFIG={supabaseUrl:"https://test.supabase.co",supabaseKey:"sb_publishable_test"}',
        });
      if (!req.url().startsWith("https://test.supabase.co"))
        return req.continue();
      if (req.method() === "OPTIONS")
        return req.respond({ status: 204, headers });
      const path = new URL(req.url()).pathname;
      let data = [],
        status = 200;
      if (path.endsWith("/shared_spaces")) data = deleted ? [] : [shared];
      else if (path.endsWith("/shared_tasks")) data = deleted ? [] : [remote];
      else if (path.endsWith("/space_members"))
        data = deleted
          ? []
          : [
              {
                space_id: S,
                user_id: user,
                role: user === A ? "admin" : "member",
              },
            ];
      else if (path.endsWith("/task_progress")) data = [];
      else if (path.endsWith("/rpc/delete_space")) {
        deleteCalls++;
        assert.deepEqual(JSON.parse(req.postData()), { p_space: S });
        if (failDelete || user !== A) {
          status = 403;
          data = {
            message: "Solo el propietario puede eliminar este espacio.",
          };
        } else {
          await new Promise((resolve) => {
            releaseDelete = resolve;
          });
          deleted = true;
          data = null;
        }
      } else if (path.endsWith("/rpc/leave_space")) {
        leaveCalls++;
        data = null;
      } else {
        status = 404;
        data = { message: "Ruta inesperada" };
      }
      await req.respond({ status, headers, body: JSON.stringify(data) });
    });
    await page.evaluateOnNewDocument((user) => {
      sessionStorage.setItem(
        "apuntes-session",
        JSON.stringify({
          user: { id: user, email: "fixture@example.com" },
          access_token: "fixture",
          refresh_token: "fixture-refresh",
          expires_at: Date.now() / 1000 + 3600,
        }),
      );
      localStorage.setItem(
        "apuntes-v1",
        JSON.stringify({
          courses: [{ id: "private", name: "Privado", color: "#a9c2e8" }],
          tasks: [
            {
              id: "local",
              title: "Conservar local",
              course: "private",
              due: "2030-01-01",
              time: "18:00",
              priority: "normal",
              done: false,
            },
          ],
        }),
      );
    }, user);
    await page.goto(root, { waitUntil: "networkidle0" });
    await page.waitForFunction(() =>
      JSON.parse(localStorage.getItem("apuntes-v1")).tasks.some(
        (t) => t.remoteId,
      ),
    );
    return page;
  }
  const stored = (page) =>
    page.evaluate(() => JSON.parse(localStorage.getItem("apuntes-v1")));
  try {
    const a = await makePage(A),
      b = await makePage(B);
    await a.click('[data-view="courses"]');
    const id = (await stored(a)).courses.find((c) => c.remoteSpace).id;
    const remove = `[data-course-card="${id}"] .delete-course-button`;
    assert.equal(
      await a.$eval(remove, (e) => e.textContent),
      "Eliminar para todos",
    );
    await a.evaluate(() => {
      window.confirm = (text) => {
        window.confirmText = text;
        return false;
      };
    });
    await a.click(remove);
    assert.equal(deleteCalls, 0);
    assert.equal((await stored(a)).tasks.length, 2);
    assert.match(
      await a.evaluate(() => window.confirmText),
      /para todos.*progresos de todos.*no se puede deshacer/s,
    );
    failDelete = true;
    await a.evaluate(() => {
      window.confirm = () => true;
    });
    await a.click(remove);
    await a.waitForFunction(() =>
      document
        .querySelector("#toast-text")
        .textContent.includes("Solo el propietario"),
    );
    assert.equal((await stored(a)).tasks.length, 2);
    assert.equal(deleted, false);
    await b.click('[data-view="courses"]');
    assert.equal(
      await b.$$eval(
        ".delete-course-button",
        (els) =>
          els.filter((e) => e.textContent === "Eliminar para todos").length,
      ),
      0,
    );
    await b.click("#reset-demo");
    await b.click("#open-cloud");
    assert.equal(await b.$$(".delete-space").then((x) => x.length), 0);
    assert.equal(await b.$$(".leave-space").then((x) => x.length), 1);
    failDelete = false;
    await a.evaluate((selector) => {
      const button = document.querySelector(selector);
      button.click();
      button.click();
    }, remove);
    await a.waitForFunction(
      (selector) => document.querySelector(selector).disabled,
      {},
      remove,
    );
    // Interception reaches the controlled server asynchronously.
    await new Promise((resolve) => {
      const check = () => (releaseDelete ? resolve() : setTimeout(check, 10));
      check();
    });
    assert.equal(deleteCalls, 2); // one denied attempt, one confirmed successful attempt
    releaseDelete();
    await a.waitForFunction(
      () =>
        !JSON.parse(localStorage.getItem("apuntes-v1")).courses.some(
          (c) => c.remoteSpace,
        ),
    );
    assert.deepEqual(
      (await stored(a)).tasks.map((t) => t.id),
      ["local"],
    );
    assert.equal((await stored(a)).courses[0].name, "Privado");
    assert.equal(leaveCalls, 0);
    await b.click("#sync-cloud");
    await b.waitForFunction(
      () =>
        !JSON.parse(localStorage.getItem("apuntes-v1")).tasks.some(
          (t) => t.remoteId,
        ),
    );
    assert.deepEqual(
      (await stored(b)).tasks.map((t) => t.id),
      ["local"],
    );
    assert.equal(await b.$$(".space-row").then((x) => x.length), 0);
    console.log(
      "✓ Eliminar espacio UI: propietario, cancelación, permiso rechazado sin borrar caché, doble clic bloqueado, dos sesiones y conservación de cursos/deberes locales (API controlada).",
    );
  } finally {
    if (releaseDelete) releaseDelete();
    for (const context of contexts) await context.close();
  }
}
