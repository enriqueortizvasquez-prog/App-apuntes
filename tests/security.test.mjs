import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("PostgreSQL: RLS, roles, progreso independiente, conflictos, revocación y retirada", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to public;grant execute on function auth.uid() to public;grant usage on schema public to anon,authenticated;`,
    );
    await db.exec(await readFile("supabase/schema.sql", "utf8"));
    const A = "10000000-0000-0000-0000-000000000001",
      B = "10000000-0000-0000-0000-000000000002",
      C = "10000000-0000-0000-0000-000000000003";
    await db.query("insert into auth.users values ($1),($2),($3)", [A, B, C]);
    async function user(id) {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        id,
      ]);
      await db.exec("set role authenticated");
    }
    await user(A);
    const payload = {
      title: "Límites",
      course_name: "Matemática",
      color: "#a9c2e8",
      due: "2030-01-01",
      time: "18:00",
      priority: "normal",
      notes: "Notas",
      link: "",
      client_ref: "local-one",
    };
    const space = (
      await db.query("select public.create_space($1,$2,$3::jsonb) as id", [
        "Matemática",
        "course",
        JSON.stringify([payload]),
      ])
    ).rows[0].id;
    const task = (await db.query("select * from shared_tasks")).rows[0];
    assert.equal(task.client_ref, "local-one");
    const invite = (
      await db.query("select public.create_invite($1,'member') as invite", [
        space,
      ])
    ).rows[0].invite;
    await user(B);
    assert.equal((await db.query("select * from shared_tasks")).rows.length, 0);
    await assert.rejects(
      db.query("select public.set_task_progress($1,true)", [task.id]),
      /acceso/,
    );
    await db.exec("reset role;set role anon");
    assert.equal(
      (
        await db.query("select public.preview_invite($1) as info", [
          invite.token,
        ])
      ).rows[0].info.title,
      "Matemática",
    );
    await assert.rejects(
      db.query("select public.accept_invite($1)", [invite.token]),
      /permission denied/i,
    );
    await user(B);
    await db.query("select public.accept_invite($1)", [invite.token]);
    assert.equal((await db.query("select * from shared_tasks")).rows.length, 1);
    await assert.rejects(
      db.query("update shared_tasks set title='hack'"),
      /permission denied/i,
    );
    await assert.rejects(
      db.query("select public.update_shared_task($1,1,$2::jsonb)", [
        task.id,
        JSON.stringify({ ...payload, title: "hack" }),
      ]),
      /permiso/,
    );
    await db.query("select public.set_task_progress($1,true)", [task.id]);
    assert.equal(
      (await db.query("select * from task_progress")).rows[0].done,
      true,
    );
    await user(A);
    assert.equal(
      (await db.query("select * from task_progress")).rows.length,
      0,
    );
    await db.query("select public.change_member($1,$2,$3)", [
      space,
      B,
      "admin",
    ]);
    await db.query("select public.update_shared_task($1,1,$2::jsonb)", [
      task.id,
      JSON.stringify({ ...payload, title: "Actualizado" }),
    ]);
    await user(B);
    await assert.rejects(
      db.query("select public.update_shared_task($1,1,$2::jsonb)", [
        task.id,
        JSON.stringify(payload),
      ]),
      /cambi[oó]/i,
    );
    await assert.rejects(
      db.query("select public.change_member($1,$2,$3)", [space, A, "remove"]),
      /propietario/,
    );
    await user(A);
    await db.query("select public.revoke_invites($1)", [space]);
    await user(C);
    await assert.rejects(
      db.query("select public.accept_invite($1)", [invite.token]),
      /caduc[oó]/i,
    );
    await user(A);
    await db.query("select public.change_member($1,$2,$3)", [
      space,
      B,
      "remove",
    ]);
    await user(B);
    assert.equal((await db.query("select * from shared_tasks")).rows.length, 0);
    assert.equal(
      (await db.query("select * from task_progress")).rows.length,
      0,
    );
  } finally {
    await db.close();
  }
});
