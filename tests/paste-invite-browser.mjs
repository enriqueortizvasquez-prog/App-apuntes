import assert from "node:assert/strict";
export async function runPasteInviteTests(browser, root, track) {
  const context = await browser.createBrowserContext();
  try {
    const page = await context.newPage();
    track(page);
    await page.setBypassServiceWorker(true);
    await page.evaluateOnNewDocument(() => {
      window.APUNTES_ANDROID = true;
      window.ApuntesAndroid = { saveFile() {} };
    });
    const token = "10000000-0000-0000-0000-000000000001";
    let expired = false,
      accepts = 0,
      previews = 0,
      joined = false,
      delay = false;
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "apikey,content-type,authorization",
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
      const u = new URL(req.url());
      let data = [],
        status = 200;
      if (u.pathname.endsWith("/preview_invite")) {
        previews++;
        assert.deepEqual(JSON.parse(req.postData()), { p_token: token });
        assert.equal(req.headers().authorization, undefined);
        if (delay) await new Promise((resolve) => setTimeout(resolve, 500));
        if (expired) {
          status = 410;
          data = { message: "Invitación revocada o caducada" };
        } else
          data = {
            title: "Curso recibido",
            role: "member",
            count: 1,
            expires_at: "2030-01-01T00:00:00Z",
          };
      } else if (u.pathname.endsWith("/accept_invite")) {
        accepts++;
        joined = true;
        assert.equal(req.headers().authorization, "Bearer fixture-token");
        data = "20000000-0000-0000-0000-000000000001";
      } else if (joined && u.pathname === "/rest/v1/shared_spaces")
        data = [
          {
            id: "20000000-0000-0000-0000-000000000001",
            title: "Curso recibido",
            kind: "course",
            owner_id: "other",
          },
        ];
      return req.respond({ status, headers, body: JSON.stringify(data) });
    });
    const open = async (text) => {
      await page.click("#reset-demo");
      await page.click("#open-invitation");
      await page.$eval("#paste-invite-text", (e, v) => (e.value = v), text);
      await page.click("#open-pasted-invite");
    };
    await page.goto(root, { waitUntil: "networkidle0" });
    await open("No es una invitación");
    await page.waitForFunction(() =>
      document
        .querySelector("#paste-invite-message")
        .textContent.includes("No se encontró"),
    );
    assert.equal(previews, 0);
    assert.equal(await page.evaluate(() => location.hash), "");
    await page.click("#paste-invite-dialog [data-close]");
    await page.click("#settings-dialog [data-close]");
    const text =
      "Te invito a Física\napuntes://open#join=" +
      token +
      "\nSi aparece como texto, abre Tareas.";
    await open(text);
    await page.waitForFunction(
      () => document.querySelector("#invite-dialog").open,
    );
    assert.equal(
      await page.$eval("#invite-title", (e) => e.textContent),
      "Curso recibido",
    );
    assert.equal(accepts, 0);
    assert.equal(await page.evaluate(() => location.hash), "#join=" + token);
    assert.equal(await page.$eval("#paste-invite-text", (e) => e.value), "");
    await page.click("#accept-invite");
    assert.equal(accepts, 0); // Must sign in before joining; no client-side bypass.
    await page.waitForFunction(
      () => document.querySelector("#cloud-dialog").open,
    );
    await page.click("#cloud-dialog [data-close]");
    await page.click("#invite-dialog [data-close]");
    // A revoked invite remains editable, doesn't navigate, and doesn't change data.
    expired = true;
    await page.evaluate(() =>
      history.replaceState(null, "", location.pathname),
    );
    await open(text);
    await page.waitForFunction(() =>
      document
        .querySelector("#paste-invite-message")
        .textContent.includes("caducada"),
    );
    assert.equal(await page.evaluate(() => location.hash), "");
    assert.equal(
      await page.$eval("#open-pasted-invite", (e) => e.disabled),
      false,
    );
    await page.click("#paste-invite-dialog [data-close]");
    await page.click("#settings-dialog [data-close]");
    // Cancel a pending preview: a late server response must not open a dialog.
    expired = false;
    delay = true;
    await open(text);
    await page.click("#paste-invite-dialog [data-close]");
    await page.waitForNetworkIdle({ idleTime: 600 });
    assert.equal(await page.$eval("#invite-dialog", (e) => e.open), false);
    await page.click("#settings-dialog [data-close]");
    delay = false;
    // Explicitly join with an authenticated controlled session (not a real Google login).
    await page.evaluate(() =>
      sessionStorage.setItem(
        "apuntes-session",
        JSON.stringify({
          access_token: "fixture-token",
          refresh_token: "fixture-refresh",
          expires_at: Date.now() / 1000 + 3600,
          user: {
            id: "30000000-0000-0000-0000-000000000001",
            email: "fixture@example.com",
          },
        }),
      ),
    );
    await page.reload({ waitUntil: "networkidle0" });
    await open(text);
    await page.waitForFunction(
      () => document.querySelector("#invite-dialog").open,
    );
    assert.equal(accepts, 0);
    await page.click("#accept-invite");
    await page.waitForFunction(
      () => !document.querySelector("#invite-dialog").open,
    );
    assert.equal(accepts, 1);
    // Reset only this isolated fixture before testing offline local copies.
    joined = false;
    await page.evaluate(() => {
      localStorage.removeItem("apuntes-v1");
      sessionStorage.removeItem("apuntes-session");
    });
    await page.reload({ waitUntil: "networkidle0" });
    // Local copies can also be pasted and previewed without navigating/reloading.
    await page.click("#reset-demo");
    await page.click("#load-examples");
    await page.click("#confirm-reset");
    await page.click(".task-menu summary");
    await page.click(".share-task");
    const copy = await page.$eval("#share-link", (e) => e.value);
    const whatsapp = new URL(
      await page.$eval("#whatsapp-share", (e) => e.href),
    ).searchParams.get("text");
    assert.ok(whatsapp.includes("Abrir invitación"));
    await page.click("#share-dialog [data-close]");
    await open("Te comparto una copia:\n" + copy);
    await page.waitForFunction(
      () => document.querySelector("#invite-dialog").open,
    );
    assert.equal(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("apuntes-v1")).tasks.length,
      ),
      6,
    );
    await page.click("#accept-invite");
    assert.equal(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("apuntes-v1")).tasks.length,
      ),
      7,
    );
    assert.equal(accepts, 1); // Copy must not create remote membership.
    console.log(
      "✓ Invitación pegada (API controlada): mensaje completo, vista previa, autenticación/confirmación obligatorias, revocación, cancelación y copia local; no navegación externa ni lectura automática de portapapeles.",
    );
  } finally {
    await context.close();
  }
}
