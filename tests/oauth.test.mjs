import test from "node:test";
import assert from "node:assert/strict";
import { createHash, webcrypto } from "node:crypto";
import { Cloud } from "../src/cloud.js";
import {
  beginGoogleSignIn,
  finishGoogleSignIn,
  oauthRedirect,
  oauthCallback,
  cancelGoogleSignIn,
} from "../src/oauth.js";
const cfg = {
  supabaseUrl: "https://test.supabase.co",
  supabaseKey: "sb_publishable_test",
};
const key = "apuntes-oauth-pending";
const memory = () => {
  const m = new Map();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
};
function environment(t) {
  for (const [name, value] of Object.entries({
    localStorage: memory(),
    sessionStorage: memory(),
    crypto: webcrypto,
  })) {
    const old = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { value, configurable: true });
    t.after(() =>
      old
        ? Object.defineProperty(globalThis, name, old)
        : delete globalThis[name],
    );
  }
}
const session = {
  access_token: "supabase-only",
  refresh_token: "refresh",
  expires_at: Date.now() / 1000 + 3600,
  user: { id: "person", email: "a@example.com" },
  provider_token: "never-store-this",
  provider_refresh_token: "nor-this",
};
const callback = (code = "one-time-code") =>
  oauthCallback(
    "https://appassets.androidplatform.net/assets/site/index.html#oauth=code=" +
      code,
    true,
  );

test("Google PKCE S256: entropía, destino exacto e identidad mínima sin secretos", async (t) => {
  environment(t);
  const c = new Cloud(cfg);
  c.request = async (path) => {
    assert.equal(path, "/auth/v1/settings");
    return { external: { google: true } };
  };
  const invite = "#join=10000000-0000-0000-0000-000000000001";
  const u = new URL(await beginGoogleSignIn(c, "apuntes://open", invite));
  const p = JSON.parse(localStorage.getItem(key));
  assert.match(p.verifier, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(
    u.searchParams.get("code_challenge"),
    createHash("sha256").update(p.verifier).digest("base64url"),
  );
  assert.equal(u.searchParams.get("code_challenge_method"), "s256");
  assert.equal(u.searchParams.get("redirect_to"), "apuntes://open");
  assert.equal(u.searchParams.get("provider"), "google");
  assert.equal(u.searchParams.get("scopes"), "openid email profile");
  assert.ok(!u.href.includes(p.verifier));
  assert.ok(!u.href.includes(cfg.supabaseKey));
  assert.equal(p.returnHash, invite);
  const old = p.verifier;
  await beginGoogleSignIn(c, "apuntes://open", "#apuntes=private-notes");
  assert.notEqual(JSON.parse(localStorage.getItem(key)).verifier, old);
  assert.equal(JSON.parse(localStorage.getItem(key)).returnHash, "");
});

test("Google sin proveedor activo no finge acceso ni crea un flujo", async (t) => {
  environment(t);
  const c = new Cloud(cfg);
  c.request = async () => ({ external: { google: false } });
  await assert.rejects(
    beginGoogleSignIn(c, "apuntes://open"),
    /Falta activar Google/,
  );
  assert.equal(localStorage.getItem(key), null);
});

test("Retorno PKCE de un solo uso; no se guardan tokens Google", async (t) => {
  environment(t);
  const c = new Cloud(cfg);
  c.request = async () => ({ external: { google: true } });
  await beginGoogleSignIn(c, "apuntes://open");
  const verifier = JSON.parse(localStorage.getItem(key)).verifier;
  let calls = 0;
  c.request = async (path, o) => {
    calls++;
    assert.equal(localStorage.getItem(key), null);
    assert.equal(path, "/auth/v1/token?grant_type=pkce");
    assert.equal(o.auth, false);
    assert.deepEqual(o.body, {
      auth_code: "one-time-code",
      code_verifier: verifier,
    });
    return session;
  };
  const result = await finishGoogleSignIn(c, callback());
  c.store(result.session);
  assert.equal(c.session.user.id, "person");
  assert.ok(!sessionStorage.getItem("apuntes-session").includes("never-store"));
  assert.ok(!sessionStorage.getItem("apuntes-session").includes("provider_"));
  await assert.rejects(finishGoogleSignIn(c, callback()), /no se inició aquí/);
  assert.equal(calls, 1);
});

test("Caducidad, otro proyecto/retorno, cancelación y códigos manipulados se rechazan antes de Auth", async (t) => {
  environment(t);
  const c = new Cloud(cfg);
  const good = {
    verifier: "a".repeat(43),
    createdAt: Date.now(),
    project: c.url,
    redirectTo: "apuntes://open",
  };
  let calls = 0;
  c.request = async () => {
    calls++;
    throw Error("No debe llamar Auth");
  };
  for (const patch of [
    { createdAt: Date.now() - 601000 },
    { createdAt: Date.now() + 60000 },
    { project: "https://evil.example" },
    { redirectTo: "https://evil.example" },
    { verifier: "short" },
  ]) {
    localStorage.setItem(key, JSON.stringify({ ...good, ...patch }));
    await assert.rejects(finishGoogleSignIn(c, callback()), /caducó/);
    assert.equal(localStorage.getItem(key), null);
  }
  localStorage.setItem(key, JSON.stringify(good));
  await assert.rejects(
    finishGoogleSignIn(c, { ...callback(), error: true }),
    /cancelado/,
  );
  localStorage.setItem(key, JSON.stringify(good));
  await assert.rejects(
    finishGoogleSignIn(c, callback("%3Cscript%3E")),
    /no es válida/,
  );
  assert.equal(calls, 0);
  cancelGoogleSignIn();
});

test("Callbacks limpian historial, no aceptan tokens implícitos y HTML no simula OAuth", () => {
  assert.equal(oauthRedirect(true, "file:///x"), "apuntes://open");
  assert.throws(() => oauthRedirect(false, "file:///x"), /APK/);
  assert.throws(
    () => oauthRedirect(false, "http://insecure.example/x"),
    /HTTPS/,
  );
  assert.equal(
    oauthRedirect(false, "https://example.com/app/index.html?foo#join=123"),
    "https://example.com/app/index.html",
  );
  assert.equal(
    oauthCallback(
      "https://example.com/#access_token=fake&refresh_token=fake",
      false,
    ),
    null,
  );
  const cb = oauthCallback(
    "https://example.com/app/?code=one-use&foo=bar",
    false,
  );
  assert.equal(cb.cleanUrl, "/app/?foo=bar");
  assert.equal(cb.code, "one-use");
  assert.equal(
    oauthCallback(
      "https://example.com/?error=denied&error_description=private",
      false,
    ).cleanUrl,
    "/",
  );
  assert.equal(callback().cleanUrl, "/assets/site/index.html");
});

test("Un token fallido/incompleto no inicia sesión ni permite repetir el intercambio", async (t) => {
  environment(t);
  const c = new Cloud(cfg);
  for (const response of [
    null,
    {},
    { access_token: "x", refresh_token: "y", user: { id: "x" } },
  ]) {
    localStorage.setItem(
      key,
      JSON.stringify({
        verifier: "a".repeat(43),
        createdAt: Date.now(),
        project: c.url,
        redirectTo: "apuntes://open",
      }),
    );
    c.request = async () => response;
    await assert.rejects(finishGoogleSignIn(c, callback()), /sesión válida/);
    assert.equal(c.session, null);
    assert.equal(localStorage.getItem(key), null);
  }
});
