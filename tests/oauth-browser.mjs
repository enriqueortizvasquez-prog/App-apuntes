import assert from "node:assert/strict";
import { createHash } from "node:crypto";
// Controlled Auth fixtures: real Google consent is deliberately NOT simulated as
// an end-to-end provider test. This exercises the app UI, storage and PKCE wire.
export async function runOAuthTests(browser, root, track) {
  const context = await browser.createBrowserContext();
  try {
    const page = await context.newPage();
    track(page);
    await page.setBypassServiceWorker(true);
    let enabled = false,
      authorize,
      expectedVerifier,
      exchanges = 0;
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "apikey,content-type,authorization",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Content-Type": "application/json",
    };
    await page.setRequestInterception(true);
    const intercept = async (req) => {
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
      if (u.pathname === "/auth/v1/authorize") {
        authorize = u;
        // A stand-in browser page, not a pretend successful Google login.
        return req.respond({
          status: 200,
          contentType: "text/html",
          body: "<p>Proveedor de prueba: vuelve a la aplicación</p>",
        });
      }
      let data = [];
      if (u.pathname === "/rest/v1/rpc/preview_invite")
        data = {
          title: "Curso compartido",
          count: 1,
          role: "member",
          expires_at: "2030-01-01T00:00:00Z",
        };
      if (u.pathname === "/auth/v1/settings")
        data = { external: { google: enabled } };
      if (u.pathname === "/auth/v1/token") {
        exchanges++;
        assert.equal(u.searchParams.get("grant_type"), "pkce");
        assert.deepEqual(JSON.parse(req.postData()), {
          auth_code: "fixture-code",
          code_verifier: expectedVerifier,
        });
        data = {
          access_token: "supa-access",
          refresh_token: "supa-refresh",
          expires_at: Date.now() / 1000 + 3600,
          user: {
            id: "10000000-0000-0000-0000-000000000001",
            email: "alumno@example.com",
          },
          provider_token: "google-not-for-storage",
        };
      }
      return req.respond({ status: 200, headers, body: JSON.stringify(data) });
    };
    page.on("request", intercept);
    await page.goto(root, { waitUntil: "networkidle0" });
    await page.click("#reset-demo");
    await page.click("#open-cloud");
    await page.click("#sign-in-google");
    await page.waitForFunction(() =>
      document
        .querySelector("#cloud-message")
        .textContent.includes("Falta activar Google"),
    );
    assert.equal(
      await page.evaluate(() => localStorage.getItem("apuntes-oauth-pending")),
      null,
    );
    assert.equal(await page.$eval("#sign-in-google", (e) => e.disabled), false);
    enabled = true;
    await page.click("#sign-in-google");
    await page.waitForFunction(() => location.hostname === "test.supabase.co");
    // Storage belongs to the app origin. Read it after returning; the PKCE
    // challenge emitted before leaving must match the persisted verifier.
    const reader = await context.newPage();
    await reader.setBypassServiceWorker(true);
    await reader.setRequestInterception(true);
    reader.on("request", intercept);
    await reader.goto(root, { waitUntil: "networkidle0" });
    expectedVerifier = await reader.evaluate(
      () => JSON.parse(localStorage.getItem("apuntes-oauth-pending")).verifier,
    );
    await reader.close();
    assert.equal(
      authorize.searchParams.get("code_challenge"),
      createHash("sha256").update(expectedVerifier).digest("base64url"),
    );
    assert.equal(authorize.searchParams.get("redirect_to"), root + "/");
    await page.goto(root + "/?code=fixture-code", {
      waitUntil: "networkidle0",
    });
    await page
      .waitForFunction(() => !document.querySelector("#cloud-account").hidden)
      .catch(async (e) => {
        throw Error(
          e.message +
            " | " +
            (await page.$eval("#cloud-message", (e) => e.textContent)) +
            " | " +
            (await page.$eval("#cloud-backend", (e) => e.textContent)),
        );
      });
    assert.equal(
      await page.$eval("#cloud-user", (e) => e.textContent),
      "alumno@example.com",
    );
    assert.equal(await page.evaluate(() => location.search), "");
    assert.equal(
      await page.evaluate(() => localStorage.getItem("apuntes-oauth-pending")),
      null,
    );
    assert.ok(
      !(
        await page.evaluate(() => sessionStorage.getItem("apuntes-session"))
      ).includes("google-not-for-storage"),
    );
    await page.click("#sign-out");
    await page.goto(root + "/?code=forged", { waitUntil: "networkidle0" });
    await page.waitForFunction(() =>
      document
        .querySelector("#cloud-message")
        .textContent.includes("no se inició aquí"),
    );
    assert.equal(exchanges, 1);
    assert.equal(
      await page.evaluate(() => sessionStorage.getItem("apuntes-session")),
      null,
    );
    // Provider denial cleans both pending verifier and private error description.
    await page.click("#sign-in-google");
    await page.waitForFunction(() => location.hostname === "test.supabase.co");
    await page.goto(root + "/?error=access_denied&error_description=PRIVATE", {
      waitUntil: "networkidle0",
    });
    await page.waitForFunction(() =>
      document
        .querySelector("#cloud-message")
        .textContent.includes("cancelado"),
    );
    assert.equal(await page.evaluate(() => location.search), "");
    assert.equal(
      await page.evaluate(() => localStorage.getItem("apuntes-oauth-pending")),
      null,
    );
    // Simulate process death: a fresh native WebView has no sessionStorage but
    // can finish a pending PKCE flow stored before the browser was opened.
    expectedVerifier = "b".repeat(43);
    await page.evaluate(
      (v) =>
        localStorage.setItem(
          "apuntes-oauth-pending",
          JSON.stringify({
            verifier: v,
            createdAt: Date.now(),
            project: "https://test.supabase.co",
            redirectTo: "apuntes://open",
            returnHash: "#join=20000000-0000-0000-0000-000000000001",
          }),
        ),
      expectedVerifier,
    );
    const native = await context.newPage();
    track(native);
    await native.setBypassServiceWorker(true);
    await native.evaluateOnNewDocument(() => {
      window.APUNTES_ANDROID = true;
      window.ApuntesAndroid = { saveFile() {} };
    });
    // Apply the same fixture handler to the fresh page without sharing sessions.
    await native.setRequestInterception(true);
    native.on("request", intercept);
    await native.goto(root + "/#oauth=code=fixture-code", {
      waitUntil: "networkidle0",
    });
    await native.waitForFunction(
      () =>
        !document.querySelector("#cloud-account").hidden &&
        document.querySelector("#invite-dialog").open,
    );
    assert.equal(
      await native.$eval("#invite-title", (e) => e.textContent),
      "Curso compartido",
    );
    assert.equal(
      await native.evaluate(() => location.hash),
      "#join=20000000-0000-0000-0000-000000000001",
    );
    assert.equal(exchanges, 2);
    // Warm Android return: loadUrl with a fragment does not reload the document.
    await native.click("#invite-dialog [data-close]");
    await native.click("#sign-out");
    expectedVerifier = "c".repeat(43);
    await native.evaluate((v) => {
      localStorage.setItem(
        "apuntes-oauth-pending",
        JSON.stringify({
          verifier: v,
          createdAt: Date.now(),
          project: "https://test.supabase.co",
          redirectTo: "apuntes://open",
          returnHash: "",
        }),
      );
      location.hash = "oauth=code=fixture-code";
    }, expectedVerifier);
    await native.waitForFunction(
      () => !document.querySelector("#cloud-account").hidden,
    );
    assert.equal(await native.evaluate(() => location.hash), "");
    assert.equal(exchanges, 3);
    console.log(
      "✓ OAuth UI (fixtures): proveedor pendiente, PKCE S256, retorno/limpieza, cancelación, rechazo de enlace falso, reinicio e invitación conservada. No prueba consentimiento real Google.",
    );
  } finally {
    await context.close();
  }
}
