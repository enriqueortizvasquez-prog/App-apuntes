import test from "node:test";
import assert from "node:assert/strict";
import {
  validDate,
  validCourses,
  validBackup,
  safeLink,
  normalize,
  encodeInvitation,
  decodeInvitation,
} from "../src/domain.js";
const course = { id: "math", name: "Matemática", color: "#a9c2e8" };
const task = {
  id: "1",
  title: "Resolver límites",
  course: "math",
  due: "2026-10-29",
  time: "18:00",
  done: false,
  priority: "high",
};
test("fechas reales y enlaces seguros", () => {
  assert.equal(validDate("2026-02-29"), false);
  assert.equal(validDate("2028-02-29"), true);
  assert.equal(validDate("2026-13-01"), false);
  for (const value of [
    "javascript:alert(1)",
    "data:text/html,X",
    "file:///etc/passwd",
    "no url",
  ])
    assert.equal(safeLink(value), "");
  assert.equal(safeLink("https://example.com/a"), "https://example.com/a");
});
test("cursos y respaldos validan referencias, tamaños y duplicados", () => {
  assert.equal(validCourses([course]), true);
  assert.equal(validCourses([course, course]), false);
  assert.equal(validCourses([{ ...course, color: "red;display:none" }]), false);
  assert.equal(validBackup({ courses: [course], tasks: [task] }), true);
  assert.equal(validBackup({ courses: [], tasks: [] }), true);
  for (const patch of [
    { course: "missing" },
    { id: "" },
    { title: " " },
    { time: "25:00" },
    { due: "2026-02-30" },
    { link: "javascript:alert(1)" },
    { notes: "a".repeat(2001) },
    { reminder: "invalid" },
  ])
    assert.equal(
      validBackup({ courses: [course], tasks: [{ ...task, ...patch }] }),
      false,
    );
  assert.equal(validBackup({ courses: [course], tasks: [task, task] }), false);
});
test("normalización y copias Unicode sin HTML ejecutable", () => {
  const t = normalize({
    ...task,
    notes: "á 🎓 <script>x</script>",
    link: "javascript:alert(1)",
  });
  assert.equal(t.link, "");
  assert.equal(t.reminder, "none");
  const data = { title: "Física II · ñ 🎓", tasks: [t] };
  assert.deepEqual(decodeInvitation(encodeInvitation(data)), data);
  assert.throws(() => decodeInvitation("a".repeat(30001)));
  assert.throws(() => decodeInvitation("@@@"));
});
