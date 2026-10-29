export function localDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function offset(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return localDate(d);
}

export function uid() {
  return (
    globalThis.crypto?.randomUUID?.() ||
    `local-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

export function safeLink(v) {
  try {
    const u = new URL(v);
    return ["http:", "https:"].includes(u.protocol) ? u.href : "";
  } catch {
    return "";
  }
}

export function validDate(v) {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  if (Number(v.slice(0, 4)) < 1900) return false;
  const d = new Date(`${v}T12:00:00`);
  return !Number.isNaN(d.getTime()) && localDate(d) === v;
}

export function validCourses(list) {
  return (
    Array.isArray(list) &&
    list.length <= 100 &&
    new Set(list.map((c) => c?.id)).size === list.length &&
    list.every(
      (c) =>
        c &&
        typeof c.id === "string" &&
        c.id.length > 0 &&
        c.id.length < 150 &&
        typeof c.name === "string" &&
        c.name.trim().length > 0 &&
        c.name.length <= 60 &&
        /^#[0-9a-fA-F]{6}$/.test(c.color),
    )
  );
}

export function normalize(t) {
  return {
    ...t,
    time: /^([01]\d|2[0-3]):[0-5]\d$/.test(t.time) ? t.time : "23:59",
    notes: typeof t.notes === "string" ? t.notes.slice(0, 2000) : "",
    link: safeLink(t.link || ""),
    reminder: ["none", "0", "15", "60", "1440"].includes(String(t.reminder))
      ? String(t.reminder)
      : "none",
    shareMode: t.shareMode === "shared" ? "shared" : "copy",
    shareRole: t.shareRole === "member" ? "member" : "admin",
  };
}

export function nameKey(name) {
  return name.trim().normalize("NFC").toLocaleLowerCase("es");
}

export function validBackup(s) {
  return (
    s &&
    validCourses(s.courses) &&
    Array.isArray(s.tasks) &&
    s.tasks.length <= 10000 &&
    new Set(s.tasks.map((t) => t?.id)).size === s.tasks.length &&
    s.tasks.every(
      (t) =>
        t &&
        typeof t.id === "string" &&
        t.id.length > 0 &&
        t.id.length < 150 &&
        typeof t.title === "string" &&
        t.title.trim().length > 0 &&
        t.title.length <= 120 &&
        s.courses.some((c) => c.id === t.course) &&
        validDate(t.due) &&
        /^([01]\d|2[0-3]):[0-5]\d$/.test(t.time || "23:59") &&
        typeof t.done === "boolean" &&
        ["normal", "high"].includes(t.priority) &&
        (t.notes === undefined ||
          (typeof t.notes === "string" && t.notes.length <= 2000)) &&
        (t.personalNotes === undefined ||
          (typeof t.personalNotes === "string" &&
            t.personalNotes.length <= 2000)) &&
        (t.link === undefined ||
          (typeof t.link === "string" &&
            t.link.length <= 2000 &&
            (!t.link || !!safeLink(t.link)))) &&
        (t.reminder === undefined ||
          ["none", "0", "15", "60", "1440"].includes(String(t.reminder))),
    )
  );
}
export function encodeInvitation(payload) {
  let binary = "";
  new TextEncoder()
    .encode(JSON.stringify(payload))
    .forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
export function decodeInvitation(encoded) {
  if (encoded.length > 30000) throw Error("Enlace demasiado largo");
  return JSON.parse(
    new TextDecoder("utf-8", { fatal: true }).decode(
      Uint8Array.from(
        atob(encoded.replace(/-/g, "+").replace(/_/g, "/")),
        (c) => c.charCodeAt(0),
      ),
    ),
  );
}
