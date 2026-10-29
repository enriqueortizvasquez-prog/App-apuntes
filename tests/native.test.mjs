import test from "node:test";
import assert from "node:assert/strict";
import { nativeAndroid, shareBase } from "../src/native.js";
test("el adaptador requiere bandera y puente nativo; no comparte appassets", (t) => {
  const old = {
    flag: globalThis.APUNTES_ANDROID,
    bridge: globalThis.ApuntesAndroid,
    location: globalThis.location,
  };
  t.after(() => {
    globalThis.APUNTES_ANDROID = old.flag;
    globalThis.ApuntesAndroid = old.bridge;
    globalThis.location = old.location;
  });
  globalThis.location = { href: "https://example.com/App-apuntes/#x" };
  globalThis.APUNTES_ANDROID = true;
  assert.equal(nativeAndroid(), false);
  globalThis.ApuntesAndroid = { saveFile() {} };
  assert.equal(nativeAndroid(), true);
  assert.equal(shareBase(), "apuntes://open");
  globalThis.APUNTES_ANDROID = false;
  assert.equal(nativeAndroid(), false);
  assert.equal(shareBase(), "https://example.com/App-apuntes/");
});
