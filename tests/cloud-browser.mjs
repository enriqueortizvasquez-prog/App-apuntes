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
