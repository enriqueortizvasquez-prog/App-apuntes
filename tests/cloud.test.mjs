import test from "node:test";
import assert from "node:assert/strict";
import { Cloud } from "../src/cloud.js";
const cfg = {
  supabaseUrl: "https://test.supabase.co",
  supabaseKey: "sb_publishable_test",
};
test("no se aceptan claves privilegiadas ni HTTP", () => {
  assert.equal(new Cloud().configured, false);
  assert.equal(new Cloud(cfg).configured, true);
  assert.equal(
    new Cloud({ ...cfg, supabaseKey: "sb_secret_notallowed" }).configured,
    false,
  );
  const jwt = "x." + btoa(JSON.stringify({ role: "service_role" })) + ".y";
  assert.equal(new Cloud({ ...cfg, supabaseKey: jwt }).configured, false);
  assert.equal(
    new Cloud({ ...cfg, supabaseUrl: "http://example.com" }).configured,
    false,
  );
});
test("progreso personal usa RPC autenticado y no acepta identidad de terceros", async (t) => {
  const original = globalThis.fetch;
  t.after(() => (globalThis.fetch = original));
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return new Response("null", { status: 200 });
  };
  const cloud = new Cloud(cfg);
  await assert.rejects(cloud.setDone("task", true), /Inicia sesión/);
  cloud.session = {
    user: { id: "user" },
    access_token: "token",
    refresh_token: "refresh",
    expires_at: Date.now() / 1000 + 3600,
  };
  await cloud.setDone("task", true);
  assert.ok(request.url.endsWith("/rpc/set_task_progress"));
  assert.deepEqual(JSON.parse(request.options.body), {
    p_task: "task",
    p_done: true,
  });
  assert.equal(request.options.headers.Authorization, "Bearer token");
});
test("errores remotos se propagan sin fingir una escritura local", async (t) => {
  const original = globalThis.fetch;
  t.after(() => (globalThis.fetch = original));
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ message: "No tienes permiso" }), {
      status: 403,
    });
  const c = new Cloud(cfg);
  c.session = {
    user: { id: "u" },
    access_token: "t",
    expires_at: Date.now() / 1000 + 3600,
  };
  await assert.rejects(c.deleteTask("x"), /No tienes permiso/);
});

test("solo se aceptan claves anon/publishable, no contraseñas o tokens ajenos", () => {
  for (const key of [
    "contraseña_por_error",
    "ghp_no_es_clave_publica",
    "service_role",
  ]) {
    assert.equal(new Cloud({ ...cfg, supabaseKey: key }).configured, false);
  }
});

test("eliminar espacio usa RPC autenticado, sin identidad de propietario enviada por el cliente", async (t) => {
  const original = globalThis.fetch;
  t.after(() => (globalThis.fetch = original));
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return new Response("null", { status: 200 });
  };
  const cloud = new Cloud(cfg);
  await assert.rejects(cloud.deleteSpace("space"), /Inicia sesión/);
  cloud.session = {
    user: { id: "owner" },
    access_token: "token",
    expires_at: Date.now() / 1000 + 3600,
  };
  await cloud.deleteSpace("space");
  assert.ok(request.url.endsWith("/rpc/delete_space"));
  assert.deepEqual(JSON.parse(request.options.body), { p_space: "space" });
  assert.equal(request.options.headers.Authorization, "Bearer token");
});
