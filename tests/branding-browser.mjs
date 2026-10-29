import assert from "node:assert/strict";
export async function runBrandingTests(browser, root, track) {
  const context = await browser.createBrowserContext();
  try {
    const page = await context.newPage();
    track(page);
    await page.setViewport({ width: 1440, height: 1000 });
    await page.goto(root, { waitUntil: "networkidle0" });
    assert.equal(await page.title(), "Tareas · Tu universidad, en orden");
    assert.equal(await page.$eval(".brand", (e) => e.textContent), "ttareas.");
    const palette = await page.$$eval("#course-color option", (es) =>
      es.map((e) => ({ value: e.value, name: e.textContent })),
    );
    assert.equal(palette.length, 20);
    assert.equal(new Set(palette.map((c) => c.value)).size, 20);
    for (const c of palette) assert.match(c.value, /^#[0-9a-f]{6}$/);
    await page.click('[data-view="courses"]');
    for (const color of palette) {
      await page.click("#add-course");
      await page.$eval(
        "#course-name",
        (e, v) => (e.value = v),
        "Curso " + color.name,
      );
      await page.select("#course-color", color.value);
      await page.click('#course-form button[type="submit"]');
    }
    const saved = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("apuntes-v1")),
    );
    assert.deepEqual(
      saved.courses.map((c) => c.color),
      palette.map((c) => c.value),
    );
    await page.reload({ waitUntil: "networkidle0" });
    await page.click('[data-view="courses"]');
    assert.deepEqual(
      await page.$$eval(".course-card", (es) =>
        es.map((e) => e.style.getPropertyValue("--course")),
      ),
      palette.map((c) => c.value),
    );
    // New portable download has the same branding/palette and preserves data.
    await page.goto(root + "/descargas/tareas-portable.html", {
      waitUntil: "networkidle0",
    });
    assert.equal(await page.title(), "Tareas · Tu universidad, en orden");
    assert.equal(
      await page.$eval("#courses-count", (e) => e.textContent),
      "20",
    );
    await page.setViewport({ width: 390, height: 844 });
    await page.click("#open-menu");
    await page.click('[data-view="courses"]');
    await page.click("#add-course");
    assert.equal(
      await page.$eval("#course-color", (e) => e.options.length),
      20,
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    console.log(
      "✓ Tareas: nombre visible, 20 colores únicos elegibles/persistentes sin alterar colores existentes; tarjetas y descarga portable/móvil.",
    );
  } finally {
    await context.close();
  }
}
