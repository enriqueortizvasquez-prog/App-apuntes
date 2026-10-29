import assert from "node:assert/strict";
export async function runNativeTests(browser, root, track) {
  const context = await browser.createBrowserContext();
  try {
    const page = await context.newPage();
    track(page);
    await page.evaluateOnNewDocument(() => {
      window.APUNTES_ANDROID = true;
      window.nativeFiles = [];
      window.ApuntesAndroid = {
        saveFile: (...args) => window.nativeFiles.push(args),
      };
    });
    await page.goto(root, { waitUntil: "networkidle0" });
    assert.equal(await page.$eval("#install-app", (e) => e.disabled), true);
    assert.equal(
      await page.evaluate(
        async () => (await navigator.serviceWorker.getRegistrations()).length,
      ),
      0,
    );
    await page.click("#reset-demo");
    await page.click("#load-examples");
    await page.click("#confirm-reset");
    await page.click(".task-menu summary");
    await page.click(".share-task");
    assert.equal(
      await page.$eval("#share-link", (e) =>
        e.value.startsWith("apuntes://open#apuntes="),
      ),
      true,
    );
    await page.click("#share-dialog [data-close]");
    await page.click("#reset-demo");
    await page.click("#export-backup");
    let files = await page.evaluate(() => window.nativeFiles);
    assert.equal(files.length, 1);
    assert.equal(JSON.parse(files[0][1]).tasks.length, 6);
    await page.click("#open-cloud");
    await page.click("#configure-cloud");
    await page.$eval(
      "#config-url",
      (e) => (e.value = "https://test.supabase.co"),
    );
    await page.$eval("#config-key", (e) => (e.value = "sb_secret_no"));
    await page.click("#cloud-config-form button[type=submit]");
    assert.ok(
      await page.$eval("#config-message", (e) =>
        e.textContent.includes("pública"),
      ),
    );
    await page.$eval("#config-key", (e) => (e.value = "sb_publishable_test"));
    await page.click("#cloud-config-form button[type=submit]");
    await page.waitForFunction(
      () => !document.querySelector("#cloud-config-dialog").open,
    );
    assert.equal(await page.$eval("#auth-form", (e) => e.hidden), false);
    assert.equal(
      await page.$eval("#cloud-backend", (e) =>
        e.textContent.includes("https://test.supabase.co"),
      ),
      true,
    );
    await page.reload({ waitUntil: "networkidle0" });
    await page.click("#reset-demo");
    await page.click("#open-cloud");
    assert.equal(await page.$eval("#auth-form", (e) => e.hidden), false);
    assert.equal(
      await page.$eval("#cloud-backend", (e) =>
        e.textContent.includes("https://test.supabase.co"),
      ),
      true,
    );
    assert.equal(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("apuntes-v1")).tasks.length,
      ),
      6,
    );
    console.log(
      "✓ Adaptador Android en navegador: exportación por puente, enlaces propios y configuración pública persistente; rechaza secretos.",
    );
  } finally {
    await context.close();
  }
}
