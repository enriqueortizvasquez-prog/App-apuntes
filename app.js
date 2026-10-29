import {
  localDate,
  offset,
  uid,
  safeLink,
  validDate,
  validCourses,
  normalize,
  nameKey,
  validBackup,
  decodeInvitation,
  encodeInvitation,
} from "./src/domain.js";
import { Cloud } from "./src/cloud.js";
import {
  beginGoogleSignIn,
  finishGoogleSignIn,
  cancelGoogleSignIn,
  oauthCallback,
  oauthRedirect,
} from "./src/oauth.js";
import { setupInstall } from "./src/install.js";
import { nativeAndroid, shareBase, setupNative } from "./src/native.js";
("use strict");
const $ = (s) => document.querySelector(s),
  STORAGE = "apuntes-v1",
  defaults = [
    { id: "math", name: "Matemática", color: "#a9c2e8" },
    { id: "lit", name: "Literatura", color: "#c4afe3" },
    { id: "history", name: "Historia", color: "#e3bd99" },
    { id: "bio", name: "Biología", color: "#dcaebd" },
  ];
let cloud = new Cloud();
let cloudSpaces = [],
  cloudSyncing = false,
  lastCloudUser = cloud.session?.user?.id || null;
let courses = [],
  view = "pending",
  selectedCourse = null,
  query = "",
  sort = "date",
  editingId = null,
  deletingCourseId = null,
  toastTimer,
  undoAction = null,
  shareContext = null,
  currentPayload = null,
  invitation = null,
  acceptedInvites = [],
  firedReminders = {};
function initial() {
  return [
    {
      id: "demo-1",
      title: "Resolver ejercicios de límites",
      course: "math",
      due: offset(0),
      priority: "high",
      done: false,
    },
    {
      id: "demo-2",
      title: "Leer el capítulo 3 y tomar notas",
      course: "lit",
      due: offset(0),
      priority: "normal",
      done: false,
    },
    {
      id: "demo-3",
      title: "Preparar la exposición en equipo",
      course: "history",
      due: offset(1),
      priority: "normal",
      done: false,
    },
    {
      id: "demo-4",
      title: "Entregar el informe de laboratorio",
      course: "bio",
      due: offset(3),
      priority: "high",
      done: false,
    },
    {
      id: "demo-5",
      title: "Repasar las fórmulas de la semana",
      course: "math",
      due: offset(-1),
      priority: "normal",
      done: true,
    },
    {
      id: "demo-6",
      title: "Elegir el tema del ensayo",
      course: "lit",
      due: offset(-1),
      priority: "normal",
      done: true,
    },
  ].map(normalize);
}
let storageCorrupt = false,
  taskSaving = false;
let tasks = [],
  selectedDate = offset(0),
  calendarCursor = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
try {
  const raw =
    localStorage.getItem(STORAGE) ||
    localStorage.getItem("apuntes-design-demo-v1");
  const s = JSON.parse(raw);
  if (s) {
    const cs = s.courses ?? defaults;
    if (validBackup({ ...s, courses: cs })) {
      courses = cs;
      tasks = s.tasks.map(normalize);
      acceptedInvites = Array.isArray(s.acceptedInvites)
        ? s.acceptedInvites.filter((x) => typeof x === "string").slice(-100)
        : [];
      if (
        s.firedReminders &&
        typeof s.firedReminders === "object" &&
        !Array.isArray(s.firedReminders)
      )
        firedReminders = s.firedReminders;
    } else throw Error("Datos inválidos");
  }
} catch {
  storageCorrupt = true;
  queueMicrotask(
    () =>
      notify(
        "No se pudieron leer los datos guardados. Descarga una copia de recuperación en Ajustes antes de hacer cambios.",
      ) || save(),
  );
}
const legacyColors = {
  "#a8bc91": "#a9c2e8",
  "#b8b8b8": "#a9c2e8",
  "#c2a17e": "#c4afe3",
  "#a9a39c": "#c4afe3",
  "#aaa0c3": "#e3bd99",
  "#a3a7ae": "#e3bd99",
  "#8cb5ac": "#dcaebd",
  "#969b9e": "#dcaebd",
  "#c89b9b": "#d8cc9f",
  "#c5c5c5": "#d8cc9f",
  "#8faac5": "#a9cdd2",
  "#919191": "#a9cdd2",
};
courses = courses.map((c) => ({
  ...c,
  color: legacyColors[c.color.toLowerCase()] || c.color,
}));
function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}
function notify(message, undo) {
  clearTimeout(toastTimer);
  $("#toast-text").textContent = message;
  undoAction = undo || null;
  $("#undo-button").hidden = !undo;
  $("#toast").classList.add("visible");
  toastTimer = setTimeout(() => {
    $("#toast").classList.remove("visible");
    undoAction = null;
  }, 6500);
}
function save() {
  try {
    if (storageCorrupt) throw Error("Primero recupera los datos antiguos");
    localStorage.setItem(
      STORAGE,
      JSON.stringify({ courses, tasks, acceptedInvites, firedReminders }),
    );
    $("#storage-warning")?.remove();
    return true;
  } catch {
    if (!$("#storage-warning")) {
      const warning = el(
        "div",
        "save-status",
        storageCorrupt
          ? "Se detectaron datos dañados. No se sobrescribirán. Descarga los datos sin procesar en Ajustes e importa un respaldo válido para reanudar el guardado."
          : "No se pueden guardar cambios. Mantén la app abierta y descarga un respaldo desde Ajustes.",
      );
      warning.id = "storage-warning";
      warning.setAttribute("role", "alert");
      document.body.append(warning);
    }
    notify("Cambios temporales: tu navegador no permite guardarlos.");
    return false;
  }
}
function dueAt(t) {
  return new Date(`${t.due}T${t.time}:00`).getTime();
}
function dueText(due) {
  if (due === offset(0)) return "Hoy";
  if (due === offset(1)) return "Mañana";
  return new Date(`${due}T12:00:00`).toLocaleDateString("es-PE", {
    day: "numeric",
    month: "short",
  });
}
function groupName(due) {
  return due < offset(0)
    ? "Entregas anteriores"
    : due === offset(0)
      ? "Para hoy"
      : due === offset(1)
        ? "Mañana"
        : "Más adelante";
}
function resetSearch() {
  query = "";
  $("#search").value = "";
}
function renderTask(t) {
  const course = courses.find((c) => c.id === t.course),
    item = el("article", `task${t.done ? " completed" : ""}`);
  item.dataset.taskId = t.id;
  const check = el("input", "task-check");
  check.type = "checkbox";
  check.checked = t.done;
  check.setAttribute(
    "aria-label",
    `${t.done ? "Marcar como pendiente" : "Completar"}: ${t.title}`,
  );
  check.addEventListener("change", async () => {
    const before = t.done;
    try {
      if (t.remoteId) {
        check.disabled = true;
        await cloud.setDone(t.remoteId, check.checked);
      }
    } catch (e) {
      check.checked = before;
      check.disabled = false;
      notify(e.message);
      return;
    }
    t.done = check.checked;
    save();
    render();
    notify(
      t.done
        ? "Completado para ti. El progreso de los demás no cambia."
        : "Deber marcado como pendiente.",
      async () => {
        if (t.remoteId) await cloud.setDone(t.remoteId, before);
        t.done = before;
        save();
        render();
      },
    );
  });
  const content = el("div", "task-content"),
    heading = el("h3"),
    title = el("button", "task-title-button", t.title);
  title.title = "Ver y editar deber";
  title.addEventListener("click", () => openEditor(t));
  heading.append(title);
  content.append(heading);
  const meta = el("div", "task-meta"),
    name = el("span", "course-name", course.name);
  name.style.color = course.color;
  meta.append(name);
  if (t.priority === "high")
    meta.append(el("span", "priority", "· Importante"));
  if (t.shareMode === "shared")
    meta.append(el("span", "shared-badge", "· Compartido"));
  if (t.reminder !== "none" && !t.done)
    meta.append(el("span", "reminder-tag", "· ◷ Recordatorio"));
  content.append(meta);
  if (t.notes || t.link || t.personalNotes) {
    const extras = el("div", "task-extras");
    if (t.notes || t.personalNotes) {
      const note = el("span", "task-notes", t.notes || t.personalNotes);
      note.title = [t.notes, t.personalNotes]
        .filter(Boolean)
        .join("\nNotas personales: ");
      extras.append(note);
    }
    if (t.link) {
      const link = el("a", "task-link", "Abrir enlace ↗");
      link.href = t.link;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      extras.append(link);
    }
    content.append(extras);
  }
  const late = !t.done && dueAt(t) < Date.now(),
    due = el(
      "span",
      `due-label${late ? " overdue" : ""}`,
      `${late ? "Vencido · " : ""}${dueText(t.due)} · ${t.time}`,
    );
  due.title = new Date(dueAt(t)).toLocaleString("es-PE");
  const menu = el("details", "task-menu"),
    summary = el("summary", "", "⋯");
  summary.setAttribute("aria-label", `Opciones: ${t.title}`);
  const pop = el("div", "task-menu-popover");
  for (const [label, action, cls] of [
    ["Editar y reprogramar", () => openEditor(t), "edit-task"],
    ["Compartir", () => openShare("task", t.id), "share-task"],
    [
      "Eliminar",
      async () => {
        if (t.remoteId) {
          if (
            !confirm(
              "¿Eliminar este deber compartido para todos los miembros? Esta acción no se puede deshacer.",
            )
          )
            return;
          try {
            await cloud.deleteTask(t.remoteId);
            await syncCloud();
            notify("Deber compartido eliminado.");
          } catch (e) {
            notify(e.message);
          }
          return;
        }
        const index = tasks.indexOf(t);
        tasks = tasks.filter((x) => x.id !== t.id);
        save();
        render();
        notify("Deber eliminado.", () => {
          tasks.splice(index, 0, t);
          save();
          render();
        });
      },
      "delete-task",
    ],
  ]) {
    const b = el("button", cls, label);
    if (cls === "share-task")
      b.disabled =
        t.done || (t.shareMode === "shared" && t.shareRole === "member");
    if (cls === "delete-task" && t.remoteId && t.shareRole !== "admin")
      b.disabled = true;
    b.addEventListener("click", () => {
      menu.open = false;
      action();
    });
    pop.append(b);
  }
  menu.append(summary, pop);
  menu.addEventListener("toggle", () => {
    if (menu.open)
      document.querySelectorAll(".task-menu[open]").forEach((m) => {
        if (m !== menu) m.open = false;
      });
  });
  item.append(check, content, due, menu);
  return item;
}
function render() {
  const completed = tasks.filter((t) => t.done).length;
  $(".welcome").hidden = view !== "pending" || selectedCourse !== null;
  $("#completed-count").textContent = completed;
  $("#courses-count").textContent = courses.length;
  $("#progress-text").textContent = `${completed} de ${tasks.length}`;
  const percent = tasks.length
    ? Math.round((completed / tasks.length) * 100)
    : 0;
  $("#progress-fill").style.width = `${percent}%`;
  $("#progress").setAttribute("aria-valuenow", String(percent));
  $("#progress").setAttribute(
    "aria-valuetext",
    `${completed} de ${tasks.length} deberes completados`,
  );
  $("#reminder-count").textContent = tasks.filter(
    (t) => !t.done && t.reminder !== "none",
  ).length;
  document.querySelectorAll("[data-view]").forEach((b) => {
    const active = b.dataset.view === view;
    b.classList.toggle("active", active);
    if (active) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
  const titles = {
      pending: "Mis deberes",
      completed: "Completados",
      calendar: "Calendario",
      courses: "Cursos",
    },
    descriptions = {
      pending: "Todas tus entregas sin completar: vencidas, de hoy y próximas.",
      completed: "Aquí se guardan los deberes que ya terminaste.",
      calendar: "Tus entregas por fecha, sin salir de tu espacio.",
      courses: "Tus materias, cada una en su lugar.",
    };
  $("#section-title").textContent = selectedCourse
    ? courses.find((c) => c.id === selectedCourse).name
    : titles[view];
  $("#breadcrumb-title").textContent = $("#section-title").textContent;
  $("#section-description").textContent = selectedCourse
    ? "Deberes pendientes de este curso."
    : descriptions[view];
  const home = view === "courses" && !selectedCourse,
    cal = view === "calendar";
  $("#share-course").hidden = !selectedCourse;
  $("#back-courses").hidden = !selectedCourse;
  $("#add-course").hidden = !home;
  $("#new-task").hidden = home;
  $("#new-task").disabled =
    !courses.length ||
    !!courses.find(
      (c) =>
        c.id === selectedCourse && c.remoteSpace && c.remoteRole !== "admin",
    );
  $("#new-task").title = courses.length
    ? "Añadir deber"
    : "Crea primero un curso";
  $("#courses-panel").hidden = !home;
  $("#calendar-view").hidden = !cal;
  $("#list-toolbar").hidden = cal || home;
  $("#task-list").hidden = cal || home;
  $("#empty-state").hidden = true;
  if (home) {
    renderCourses();
    return;
  }
  if (cal) {
    renderCalendar();
    return;
  }
  const visible = tasks.filter(
      (t) =>
        (selectedCourse
          ? !t.done && t.course === selectedCourse
          : view === "completed"
            ? t.done
            : !t.done) &&
        `${t.title} ${courses.find((c) => c.id === t.course).name}`
          .toLocaleLowerCase("es")
          .includes(query.toLocaleLowerCase("es")),
    ),
    byDate = (a, b) =>
      a.due.localeCompare(b.due) ||
      a.time.localeCompare(b.time) ||
      a.title.localeCompare(b.title, "es");
  visible.sort(
    sort === "priority"
      ? (a, b) =>
          (a.priority === "high" ? 0 : 1) - (b.priority === "high" ? 0 : 1) ||
          byDate(a, b)
      : sort === "title"
        ? (a, b) => a.title.localeCompare(b.title, "es")
        : byDate,
  );
  const groups = new Map();
  for (const t of visible) {
    const key =
      sort === "priority"
        ? t.priority === "high"
          ? "Importantes"
          : "Prioridad normal"
        : sort === "title"
          ? "Por nombre"
          : groupName(t.due);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(t);
  }
  $("#task-list").replaceChildren();
  for (const [label, items] of groups) {
    const section = el("section", "task-group"),
      heading = el("h3", "group-title", label);
    heading.append(
      el("span", "group-number", String(items.length).padStart(2, "0")),
    );
    section.append(heading);
    items.forEach((t) => section.append(renderTask(t)));
    $("#task-list").append(section);
  }
  $("#empty-state").hidden = visible.length > 0;
  $("#empty-title").textContent = query
    ? "Sin coincidencias"
    : view === "completed"
      ? "Los pequeños logros empiezan aquí"
      : "Todo en calma";
  $("#empty-copy").textContent = query
    ? "Prueba con otro nombre o curso."
    : view === "completed"
      ? "Cuando completes un deber, aparecerá aquí."
      : selectedCourse
        ? "No hay deberes pendientes en este curso."
        : courses.length
          ? "No hay deberes en esta vista. Puedes añadir uno cuando lo necesites."
          : "Primero añade un curso en la sección Cursos.";
  $("#clear-search").hidden = !query;
}
function renderCalendar() {
  const y = calendarCursor.getFullYear(),
    m = calendarCursor.getMonth(),
    first = (new Date(y, m, 1).getDay() + 6) % 7,
    total = new Date(y, m + 1, 0).getDate(),
    pending = tasks.filter((t) => !t.done),
    now = Date.now();
  $("#calendar-month").textContent = calendarCursor.toLocaleDateString(
    "es-PE",
    { month: "long", year: "numeric" },
  );
  $("#calendar-grid").replaceChildren();
  for (let i = 0; i < first; i++) {
    const blank = el("div", "calendar-blank");
    blank.setAttribute("aria-hidden", "true");
    $("#calendar-grid").append(blank);
  }
  for (let day = 1; day <= total; day++) {
    const date = localDate(new Date(y, m, day)),
      items = pending.filter((t) => t.due === date),
      late = items.filter((t) => dueAt(t) < now),
      dayCourses = courses.filter((c) => items.some((t) => t.course === c.id)),
      b = el(
        "button",
        `calendar-cell${date === offset(0) ? " today" : ""}${date === selectedDate ? " selected" : ""}${items.length ? " has-deliveries" : ""}${late.length ? " overdue" : ""}`,
      );
    b.dataset.date = date;
    b.setAttribute("aria-pressed", String(date === selectedDate));
    if (date === offset(0)) b.setAttribute("aria-current", "date");
    b.setAttribute(
      "aria-label",
      `${new Date(y, m, day).toLocaleDateString("es-PE", { dateStyle: "full" })}, ${items.length} entregas pendientes${late.length ? `, ${late.length} vencidas` : ""}${dayCourses.length ? `. Cursos: ${dayCourses.map((c) => c.name).join(", ")}` : ""}`,
    );
    b.append(el("span", "day-number", String(day)));
    if (dayCourses.length) {
      const dots = el("span", "calendar-course-dots");
      dots.setAttribute("aria-hidden", "true");
      for (const c of dayCourses) {
        const dot = el("i", "calendar-course-dot");
        dot.style.setProperty("--course", c.color);
        const n = items.filter((t) => t.course === c.id).length;
        dot.title = `${c.name} · ${n} ${n === 1 ? "deber" : "deberes"}`;
        dots.append(dot);
      }
      b.append(dots);
    }
    b.addEventListener("click", () => {
      selectedDate = date;
      renderCalendar();
      $(`[data-date="${date}"]`).focus();
    });
    $("#calendar-grid").append(b);
  }
  $("#selected-day-title").textContent = new Date(
    `${selectedDate}T12:00:00`,
  ).toLocaleDateString("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const selected = pending
    .filter((t) => t.due === selectedDate)
    .sort(
      (a, b) =>
        (a.priority === "high" ? 0 : 1) - (b.priority === "high" ? 0 : 1) ||
        a.time.localeCompare(b.time),
    );
  $("#day-count").textContent =
    `${selected.length} ${selected.length === 1 ? "entrega" : "entregas"}`;
  $("#day-tasks").replaceChildren();
  selected.forEach((t) => $("#day-tasks").append(renderTask(t)));
  $("#day-empty").hidden = selected.length > 0;
}
function changeMonth(n) {
  calendarCursor = new Date(
    calendarCursor.getFullYear(),
    calendarCursor.getMonth() + n,
    1,
  );
  selectedDate = localDate(calendarCursor);
  renderCalendar();
}
function renderCourses() {
  $("#course-grid").replaceChildren();
  $("#courses-empty").hidden = !!courses.length;
  for (const c of courses) {
    const related = tasks.filter((t) => t.course === c.id),
      n = related.filter((t) => !t.done).length,
      done = related.length - n,
      card = el("article", "course-card");
    card.dataset.courseCard = c.id;
    card.style.setProperty("--course", c.color);
    const top = el("div", "course-card-top");
    top.append(
      el(
        "span",
        "course-card-icon",
        c.name.slice(0, 1).toLocaleUpperCase("es"),
      ),
      el(
        "span",
        "course-card-count",
        `${related.length} ${related.length === 1 ? "deber en total" : "deberes en total"}`,
      ),
    );
    card.append(
      top,
      el("h3", "", c.name),
      el(
        "p",
        "",
        `${n} sin completar · ${done} ${done === 1 ? "completado" : "completados"}`,
      ),
    );
    const actions = el("div", "course-card-actions"),
      open = el("button", "text open-course", "Ver deberes →"),
      remove = el("button", "text delete-course-button", "Eliminar");
    open.dataset.course = c.id;
    open.setAttribute("aria-label", `Ver deberes de ${c.name}`);
    open.addEventListener("click", () => {
      selectedCourse = c.id;
      view = "courses";
      resetSearch();
      render();
    });
    remove.setAttribute("aria-label", `Eliminar curso ${c.name}`);
    remove.addEventListener("click", () => openDeleteCourse(c));
    actions.append(open, remove);
    card.append(actions);
    $("#course-grid").append(card);
  }
}
function openCourseDialog() {
  $("#course-form").reset();
  $("#course-name").setCustomValidity("");
  $("#course-dialog").showModal();
  $("#course-name").focus();
}
function openDeleteCourse(c) {
  if (c.remoteSpace) {
    if (
      !confirm(
        "¿Abandonar este curso compartido? No se eliminarán los deberes de los demás. El propietario debe conservar su espacio.",
      )
    )
      return;
    cloud
      .leave(c.remoteSpace)
      .then(() => syncCloud())
      .then(() => notify("Has abandonado el curso."))
      .catch((e) => notify(e.message));
    return;
  }
  deletingCourseId = c.id;
  const related = tasks.filter((t) => t.course === c.id),
    others = courses.filter((x) => x.id !== c.id && !x.remoteSpace);
  $("#delete-course-description").textContent = related.length
    ? `«${c.name}» tiene ${related.length} deberes (incluidos los completados). Antes de eliminarlo, trasladaremos todos a otro curso.`
    : `Se eliminará «${c.name}». No tiene deberes.`;
  $("#move-course-field").hidden = !related.length;
  $("#move-course").replaceChildren();
  const empty = el("option", "", "Selecciona un curso de destino");
  empty.value = "";
  empty.disabled = true;
  empty.selected = true;
  $("#move-course").append(empty);
  for (const c of others) {
    const o = el("option", "", c.name);
    o.value = c.id;
    $("#move-course").append(o);
  }
  $("#confirm-delete-course").disabled = !!related.length;
  $("#delete-course-help").textContent =
    related.length && !others.length
      ? "No hay otro curso local donde trasladar los deberes. Cancela y crea uno para continuar."
      : related.length
        ? "Se conservarán notas, enlaces, fechas, recordatorios y progreso. No se borrará ningún deber."
        : "Esta eliminación solo afecta a este navegador.";
  $("#delete-course-dialog").showModal();
}
function openEditor(t) {
  if (!courses.length) {
    openCourseDialog();
    return;
  }
  editingId = t?.id || null;
  $("#task-form").reset();
  $("#task-title").setCustomValidity("");
  $("#task-link").setCustomValidity("");
  $("#task-course").replaceChildren();
  for (const c of courses) {
    const o = el("option", "", c.name);
    o.value = c.id;
    $("#task-course").append(o);
  }
  const locked = !!t?.remoteId && t?.shareRole === "member";
  for (const id of [
    "title",
    "course",
    "priority",
    "due",
    "time",
    "notes",
    "link",
  ])
    $("#task-" + id).disabled = !!locked;
  $("#editor-heading").textContent = t ? "Tu deber" : "Un nuevo deber";
  $("#save-task").textContent = t
    ? locked
      ? "Guardar mi recordatorio"
      : "Guardar cambios"
    : "+ Añadir deber";
  $("#task-title").value = t?.title || "";
  $("#task-course").value = t?.course || selectedCourse || courses[0].id;
  if (t?.remoteId) $("#task-course").disabled = true;
  $("#task-priority").value = t?.priority || "normal";
  $("#task-due").value =
    t?.due || (view === "calendar" ? selectedDate : offset(0));
  $("#task-time").value = t?.time || "23:59";
  $("#task-notes").value = t?.notes || "";
  $("#task-link").value = t?.link || "";
  $("#task-reminder").value = t?.reminder || "none";
  $("#shared-edit-notice").hidden = !t?.remoteId;
  $("#shared-edit-notice").textContent = locked
    ? "Miembro: puedes consultar el deber y configurar tus notas personales y recordatorio. El administrador gestiona la información compartida."
    : "Administrador: los cambios en la información de este deber se sincronizan para los miembros del espacio. El progreso y los recordatorios son individuales.";
  $("#personal-notes-field").hidden = !t?.remoteId;
  $("#personal-notes").value = t?.personalNotes || "";
  updateReminderPreview();
  $("#task-dialog").showModal();
  $(locked ? "#task-reminder" : "#task-title").focus();
}
function reminderAt(t) {
  return dueAt(t) - Number(t.reminder) * 60000;
}
function reminderKey(t) {
  return `${t.id}|${t.due}|${t.time}|${t.reminder}`;
}
function updateReminderPreview() {
  const v = $("#task-reminder").value,
    stamp =
      new Date(
        `${$("#task-due").value}T${$("#task-time").value || "23:59"}:00`,
      ).getTime() -
      Number(v) * 60000;
  $("#reminder-preview").textContent =
    (v !== "none" && Number.isFinite(stamp)
      ? `Aviso: ${new Date(stamp).toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" })}. ${stamp < Date.now() ? "La hora ya pasó; si la entrega no venció, se avisará al guardar. " : ""}`
      : "") +
    "Solo con la app abierta y en ejecución. Zona horaria de tu dispositivo. Los avisos son personales.";
}
function canNotify() {
  return "Notification" in window && window.isSecureContext;
}
function deliverReminder(message) {
  notify(message);
  if (canNotify() && Notification.permission === "granted")
    try {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistration().then((reg) => {
          if (reg)
            reg
              .showNotification("Apuntes · Tus entregas", {
                body: message,
                tag: "apuntes-reminder",
              })
              .catch(() => {});
        });
      }
      new Notification("Apuntes · Tus entregas", {
        body: message,
        tag: "apuntes-local-reminder",
      });
    } catch {}
}
function checkReminders() {
  const now = Date.now(),
    due = tasks.filter(
      (t) =>
        !t.done &&
        t.reminder !== "none" &&
        reminderAt(t) <= now &&
        dueAt(t) >= now &&
        !firedReminders[reminderKey(t)],
    );
  if (!due.length) return;
  due.forEach((t) => (firedReminders[reminderKey(t)] = true));
  save();
  deliverReminder(
    due.length === 1
      ? `Recordatorio: ${due[0].title}. Entrega ${dueText(due[0].due)}, ${due[0].time}.`
      : `Tienes ${due.length} entregas con aviso pendiente.`,
  );
  if ($("#reminders-dialog").open) renderReminders();
}
function renderReminders() {
  $("#reminder-list").replaceChildren();
  const scheduled = tasks
    .filter((t) => !t.done && t.reminder !== "none")
    .sort((a, b) => reminderAt(a) - reminderAt(b));
  if (!scheduled.length)
    $("#reminder-list").append(
      el(
        "p",
        "hint",
        "No tienes recordatorios. Abre un deber para configurar el suyo.",
      ),
    );
  for (const t of scheduled) {
    const row = el("div", "reminder-item"),
      body = el("div"),
      date = new Date(reminderAt(t)).toLocaleString("es-PE", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
      status =
        dueAt(t) < Date.now()
          ? "Entrega vencida · sin aviso pendiente"
          : firedReminders[reminderKey(t)]
            ? "Aviso ya mostrado en este navegador"
            : "Programado mientras la página esté abierta";
    body.append(el("strong", "", t.title), el("p", "", `${date} · ${status}`));
    const edit = el("button", "text", "Cambiar");
    edit.addEventListener("click", () => {
      $("#reminders-dialog").close();
      openEditor(t);
    });
    row.append(body, edit);
    $("#reminder-list").append(row);
  }
  $("#notification-status").textContent = !canNotify()
    ? "Esta vista no admite notificaciones del sistema. Puedes probar los avisos dentro de la página."
    : Notification.permission === "granted"
      ? "Permiso concedido. Solo se intentan avisos con la página en ejecución."
      : Notification.permission === "denied"
        ? "Permiso bloqueado. Puedes cambiarlo en tu navegador; los avisos internos siguen disponibles."
        : "Puedes permitir avisos del navegador; es opcional.";
  $("#enable-notifications").disabled =
    !canNotify() || Notification.permission !== "default";
}
function sharedTasks() {
  return shareContext.kind === "course"
    ? tasks.filter((t) => !t.done && t.course === shareContext.id)
    : tasks.filter((t) => !t.done && t.id === shareContext.id);
}
function openShare(kind, id) {
  shareContext = { kind, id, token: uid() };
  const items = sharedTasks();
  if (!items.length) {
    notify("Solo puedes compartir deberes sin completar.");
    return;
  }
  $("#share-title").textContent =
    kind === "course" ? "Compartir curso" : "Compartir deber";
  $("#share-subject").textContent =
    kind === "course"
      ? `${courses.find((c) => c.id === id).name} · ${items.length} deberes`
      : items[0].title;
  document.querySelector('[name="share-mode"][value="copy"]').checked = true;
  $("#include-notes").checked = false;
  $("#share-role").value = "member";
  updateShare();
  $("#share-dialog").showModal();
}
function setShareLink(link, label) {
  $("#share-link").value = link;
  $("#copy-share").disabled = !link;
  $("#preview-invite").disabled = !link || !currentPayload;
  $("#whatsapp-share").setAttribute("aria-disabled", String(!link));
  if (link)
    $("#whatsapp-share").href =
      "https://wa.me/?text=" + encodeURIComponent(label + "\n" + link);
  else $("#whatsapp-share").removeAttribute("href");
}
function updateShare() {
  if (!shareContext) return;
  const mode = document.querySelector('[name="share-mode"]:checked').value,
    include = $("#include-notes").checked,
    items = sharedTasks();
  $("#share-permissions").hidden = mode !== "shared";
  $("#create-shared-link").hidden = mode !== "shared";
  $("#connect-share").hidden = mode !== "shared" || !!cloud.session;
  if (mode === "shared") {
    currentPayload = null;
    setShareLink("", "");
    $("#create-shared-link").disabled = !cloud.configured || !cloud.session;
    $("#share-explanation").textContent = cloud.configured
      ? "Crea una invitación real. La información se sincroniza y cada miembro completa su propia entrega. Si es un curso compartido existente, la invitación da acceso a todos sus deberes y a los nuevos que se añadan."
      : "La colaboración necesita un servicio de datos. Esta publicación aún no lo ha configurado. Puedes enviar copias sin cuenta; consulta Ajustes → Cuenta y colaboración.";
    $("#share-error").textContent =
      "Los enlaces colaborativos caducan en 7 días. Un administrador puede revocarlos desde Cuenta y colaboración.";
    return;
  }
  $("#share-explanation").textContent =
    "El receptor recibirá una copia independiente de los deberes actuales. Los cambios futuros no se sincronizan.";
  currentPayload = {
    v: 1,
    id: shareContext.token,
    kind: shareContext.kind,
    mode: "copy",
    role: "admin",
    title:
      shareContext.kind === "course"
        ? courses.find((c) => c.id === shareContext.id).name
        : items[0].title,
    courses: courses
      .filter((c) => items.some((t) => t.course === c.id))
      .map(({ id, name, color }) => ({ id, name, color })),
    tasks: items.map((t) => ({
      title: t.title,
      course: t.course,
      due: t.due,
      time: t.time,
      priority: t.priority,
      notes: include ? t.notes : "",
      link: include ? t.link : "",
    })),
  };
  const link = shareBase() + "#apuntes=" + encodeInvitation(currentPayload);
  if (link.length > 16000) {
    setShareLink("", "");
    $("#share-error").textContent =
      "El enlace sería demasiado largo. No incluyas notas o comparte los deberes por separado.";
    return;
  }
  setShareLink(link, "Te comparto una copia: " + currentPayload.title);
  $("#share-error").textContent = nativeAndroid()
    ? "El receptor necesita Apuntes para Android instalada. El enlace apuntes:// se abre con la app; WhatsApp puede mostrarlo solo como texto."
    : location.protocol === "file:"
      ? "El enlace de un archivo local no puede abrirse en otro dispositivo. Comparte desde una dirección HTTPS."
      : "Solo se comparten los datos elegidos. No se comparte tu progreso, recordatorios ni notas personales.";
}
function invitationCourses(p) {
  return p.courses === undefined ? defaults : p.courses;
}
function validInvitation(p) {
  return (
    p &&
    p.v === 1 &&
    ["task", "course"].includes(p.kind) &&
    ["copy", "shared"].includes(p.mode) &&
    ["member", "admin"].includes(p.role) &&
    typeof p.id === "string" &&
    p.id.length > 0 &&
    p.id.length < 150 &&
    typeof p.title === "string" &&
    p.title.length <= 120 &&
    validCourses(invitationCourses(p)) &&
    Array.isArray(p.tasks) &&
    p.tasks.length > 0 &&
    p.tasks.length <= 100 &&
    p.tasks.every(
      (t) =>
        t &&
        typeof t.title === "string" &&
        t.title.trim().length > 0 &&
        t.title.length <= 120 &&
        invitationCourses(p).some((c) => c.id === t.course) &&
        validDate(t.due) &&
        /^([01]\d|2[0-3]):[0-5]\d$/.test(t.time) &&
        ["normal", "high"].includes(t.priority) &&
        typeof t.notes === "string" &&
        t.notes.length <= 2000 &&
        typeof t.link === "string" &&
        t.link.length <= 2000 &&
        (!t.link || !!safeLink(t.link)),
    )
  );
}
function showInvitation(p, preview = false) {
  if (!validInvitation(p)) {
    notify("El enlace no es válido o contiene datos no admitidos.");
    return;
  }
  invitation = { payload: p, preview };
  $("#invite-title").textContent =
    p.kind === "course" ? `Curso: ${p.title}` : p.title;
  $("#invite-notice").textContent =
    p.mode === "shared"
      ? "Este es un enlace antiguo del prototipo: solo permite recibir una copia local, sin sincronización."
      : `Recibirás una copia independiente de ${p.tasks.length} deberes. Puedes editarla sin modificar el original.`;
  $("#invite-meta").textContent =
    p.mode === "shared"
      ? "Este enlace no otorga permisos remotos. Se importa únicamente como copia independiente."
      : "No se comparte el progreso ni los recordatorios de nadie.";
  $("#invite-tasks").replaceChildren();
  for (const t of p.tasks) {
    const row = el("article", "invite-item");
    row.append(
      el("strong", "", t.title),
      el(
        "p",
        "",
        `${invitationCourses(p).find((c) => c.id === t.course).name} · ${dueText(t.due)}, ${t.time}`,
      ),
    );
    if (t.notes) row.append(el("p", "", t.notes));
    if (t.link) {
      const a = el("a", "task-link", "Abrir referencia ↗");
      a.href = safeLink(t.link);
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      row.append(a);
    }
    $("#invite-tasks").append(row);
  }
  const exists = !preview && acceptedInvites.includes(p.id);
  $("#accept-invite").disabled = exists;
  $("#accept-invite").textContent = exists
    ? "Ya añadido en este navegador"
    : "Añadir copia a mis deberes";
  $("#invite-dialog").showModal();
}
function loadInvitation() {
  if (location.hash.startsWith("#join=")) {
    openCloudInvite(location.hash.slice(6));
    return;
  }
  if (!location.hash.startsWith("#apuntes=")) return;
  try {
    showInvitation(decodeInvitation(location.hash.slice(9)));
  } catch {
    notify("No se pudo abrir el enlace. Comprueba que esté completo.");
  }
}
function setMenu(open) {
  $("#sidebar").classList.toggle("open", open);
  $("#open-menu").setAttribute("aria-expanded", String(open));
  if (open) $("#close-menu").focus();
}
document.querySelectorAll("[data-view]").forEach((b) =>
  b.addEventListener("click", () => {
    view = b.dataset.view;
    selectedCourse = null;
    resetSearch();
    render();
    setMenu(false);
  }),
);
$("#search").addEventListener("input", (e) => {
  query = e.target.value.trim();
  render();
});
$("#sort").addEventListener("change", (e) => {
  sort = e.target.value;
  render();
});
$("#clear-search").addEventListener("click", () => {
  resetSearch();
  render();
  $("#search").focus();
});
$("#back-courses").addEventListener("click", () => {
  view = "courses";
  selectedCourse = null;
  resetSearch();
  render();
});
$("#previous-month").addEventListener("click", () => changeMonth(-1));
$("#next-month").addEventListener("click", () => changeMonth(1));
$("#calendar-today").addEventListener("click", () => {
  selectedDate = offset(0);
  calendarCursor = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  renderCalendar();
});
$("#add-course").addEventListener("click", openCourseDialog);
$("#course-name").addEventListener("input", () =>
  $("#course-name").setCustomValidity(""),
);
$("#course-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("#course-name").value.trim();
  if (!name || courses.some((c) => nameKey(c.name) === nameKey(name))) {
    $("#course-name").setCustomValidity(
      name
        ? "Ya existe un curso con este nombre."
        : "Escribe el nombre del curso.",
    );
    $("#course-name").reportValidity();
    return;
  }
  if (courses.length >= 100) {
    notify("Esta app admite hasta 100 cursos.");
    return;
  }
  courses.push({ id: uid(), name, color: $("#course-color").value });
  view = "courses";
  selectedCourse = null;
  save();
  render();
  $("#course-dialog").close();
  notify(`Curso «${name}» añadido.`);
});
$("#move-course").addEventListener(
  "change",
  () => ($("#confirm-delete-course").disabled = !$("#move-course").value),
);
$("#confirm-delete-course").addEventListener("click", () => {
  const c = courses.find((x) => x.id === deletingCourseId);
  if (!c) return;
  const related = tasks.filter((t) => t.course === c.id),
    dest = courses.find(
      (x) =>
        x.id === $("#move-course").value && x.id !== c.id && !x.remoteSpace,
    );
  if (related.length && !dest) return;
  related.forEach((t) => (t.course = dest.id));
  courses = courses.filter((x) => x.id !== c.id);
  selectedCourse = null;
  view = "courses";
  save();
  render();
  $("#delete-course-dialog").close();
  notify(
    related.length
      ? `Curso eliminado. ${related.length} deberes trasladados a ${dest.name}.`
      : "Curso eliminado. No se borró ningún deber.",
  );
  deletingCourseId = null;
});
$("#new-task").addEventListener("click", () => openEditor());
for (const id of ["task-title", "task-link"])
  $("#" + id).addEventListener("input", () =>
    $("#" + id).setCustomValidity(""),
  );
for (const id of ["task-due", "task-time", "task-reminder"])
  $("#" + id).addEventListener("change", updateReminderPreview);
$("#task-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (taskSaving) return;
  const data = new FormData(e.target),
    existing = editingId ? tasks.find((t) => t.id === editingId) : null;
  if (editingId && !existing) {
    notify("Este deber ya no existe.");
    return;
  }
  if (existing?.remoteId && existing?.shareRole === "member")
    for (const field of [
      "title",
      "course",
      "priority",
      "due",
      "time",
      "notes",
      "link",
    ])
      data.set(field, existing[field] || "");
  if (existing?.remoteId) data.set("course", existing.course);
  const title = String(data.get("title")).trim(),
    raw = String(data.get("link")).trim(),
    link = safeLink(raw);
  if (!title) {
    $("#task-title").setCustomValidity("Escribe el nombre del deber.");
    $("#task-title").reportValidity();
    return;
  }
  if (raw && !link) {
    $("#task-link").setCustomValidity(
      "Usa un enlace que empiece por https:// o http://.",
    );
    $("#task-link").reportValidity();
    return;
  }
  if (
    !courses.some((c) => c.id === data.get("course")) ||
    !validDate(data.get("due"))
  )
    return;
  const task = normalize({
    ...existing,
    id: existing?.id || uid(),
    title,
    course: String(data.get("course")),
    due: String(data.get("due")),
    time: String(data.get("time")),
    priority: String(data.get("priority")),
    notes: String(data.get("notes")).trim(),
    link,
    reminder: String(data.get("reminder")),
    done: existing?.done || false,
    personalNotes: existing?.remoteId ? $("#personal-notes").value.trim() : "",
  });
  const sharedCourse = courses.find(
    (c) => c.id === task.course && c.remoteSpace,
  );
  taskSaving = true;
  $("#save-task").disabled = true;
  $("#task-dialog [data-close]").disabled = true;
  try {
    if (existing?.remoteId && existing.shareRole === "admin") {
      const updated = await cloud.update(
        existing.remoteId,
        existing.remoteVersion,
        cloudTaskData(task),
      );
      task.remoteVersion = updated.version;
    } else if (!existing && sharedCourse) {
      const added = await cloud.addTask(
        sharedCourse.remoteSpace,
        cloudTaskData(task),
      );
      Object.assign(task, {
        remoteId: added.id,
        remoteSpace: sharedCourse.remoteSpace,
        remoteVersion: added.version,
        shareMode: "shared",
        shareRole: "admin",
        cloudUser: cloud.session.user.id,
      });
    }
  } catch (e) {
    notify(e.message);
    return;
  } finally {
    taskSaving = false;
    $("#save-task").disabled = false;
    $("#task-dialog [data-close]").disabled = false;
  }
  if (existing) tasks[tasks.indexOf(existing)] = task;
  else tasks.push(task);
  if (selectedCourse) selectedCourse = task.course;
  else if (view === "completed" && !task.done) view = "pending";
  if (view === "calendar") {
    selectedDate = task.due;
    const d = new Date(`${task.due}T12:00:00`);
    calendarCursor = new Date(d.getFullYear(), d.getMonth(), 1);
  }
  resetSearch();
  save();
  render();
  $("#task-dialog").close();
  notify(
    existing
      ? "Cambios guardados. Fecha y recordatorio actualizados."
      : "Deber añadido.",
  );
  checkReminders();
});
$("#share-course").addEventListener("click", () => {
  if (selectedCourse) openShare("course", selectedCourse);
});
document
  .querySelectorAll('[name="share-mode"]')
  .forEach((n) => n.addEventListener("change", updateShare));
$("#share-role").addEventListener("change", updateShare);
$("#include-notes").addEventListener("change", updateShare);
$("#copy-share").addEventListener("click", async () => {
  try {
    if (!navigator.clipboard?.writeText) throw Error();
    await navigator.clipboard.writeText($("#share-link").value);
    notify("Enlace copiado. Contiene solo los datos elegidos.");
  } catch {
    $("#share-link").focus();
    $("#share-link").select();
    notify(
      "Copia automática no disponible. El enlace está seleccionado para copiarlo manualmente.",
    );
  }
});
$("#whatsapp-share").addEventListener("click", (e) => {
  if (e.currentTarget.getAttribute("aria-disabled") === "true")
    e.preventDefault();
});
$("#preview-invite").addEventListener("click", () => {
  if (currentPayload) showInvitation(currentPayload, true);
});
$("#accept-invite").addEventListener("click", () => {
  if (!invitation) return;
  if (invitation.remoteToken) {
    acceptRemoteInvite(invitation.remoteToken);
    return;
  }
  const { payload: p, preview } = invitation;
  if (!preview && acceptedInvites.includes(p.id)) return;
  const sources = invitationCourses(p).filter((c) =>
      p.tasks.some((t) => t.course === c.id),
    ),
    known = new Set(courses.map((c) => nameKey(c.name))),
    missing = new Set(
      sources
        .filter((c) => !known.has(nameKey(c.name)))
        .map((c) => nameKey(c.name)),
    );
  if (courses.length + missing.size > 100) {
    notify("La importación superaría los 100 cursos de esta app.");
    return;
  }
  const map = new Map();
  for (const src of sources) {
    let local = courses.find((c) => nameKey(c.name) === nameKey(src.name));
    if (!local) {
      local = { id: uid(), name: src.name, color: src.color };
      courses.push(local);
    }
    map.set(src.id, local.id);
  }
  p.tasks.forEach((t) =>
    tasks.push(
      normalize({
        ...t,
        id: uid(),
        course: map.get(t.course),
        done: false,
        reminder: "none",
        shareMode: "copy",
        shareRole: "admin",
      }),
    ),
  );
  if (!preview) acceptedInvites.push(p.id);
  acceptedInvites = acceptedInvites.slice(-100);
  view = "pending";
  selectedCourse = null;
  resetSearch();
  const saved = save();
  render();
  $("#invite-dialog").close();
  $("#share-dialog").close();
  if (!preview)
    try {
      history.replaceState(null, "", location.pathname + location.search);
    } catch {}
  notify(
    saved
      ? `${p.tasks.length} deberes añadidos solo a este navegador.`
      : "Añadido temporalmente: tu navegador no permite guardar los cambios.",
  );
  invitation = null;
});
window.addEventListener("hashchange", loadInvitation);
$("#open-reminders").addEventListener("click", () => {
  renderReminders();
  $("#reminders-dialog").showModal();
});
$("#enable-notifications").addEventListener("click", async () => {
  if (!canNotify()) return;
  try {
    await Notification.requestPermission();
  } catch {
    notify("No se pudo solicitar permiso. Puedes usar los avisos internos.");
  }
  renderReminders();
});
$("#test-reminder").addEventListener("click", () =>
  deliverReminder(
    "Aviso de prueba: así se verá tu recordatorio. Ninguna entrega ha cambiado.",
  ),
);
$("#undo-button").addEventListener("click", async () => {
  if (undoAction) {
    const action = undoAction;
    undoAction = null;
    try {
      await action();
      notify("Cambio deshecho.");
    } catch (e) {
      notify(e.message);
    }
  }
});
$("#reset-demo").addEventListener("click", () =>
  $("#settings-dialog").showModal(),
);
$("#confirm-reset").addEventListener("click", () => {
  if (tasks.length || courses.length) {
    notify(
      "Los ejemplos solo se pueden cargar en una app vacía. Tus datos se conservan.",
    );
    return;
  }
  courses = defaults.map((c) => ({ ...c }));
  tasks = initial();
  acceptedInvites = [];
  firedReminders = {};
  view = "pending";
  selectedCourse = null;
  sort = "date";
  $("#sort").value = "date";
  selectedDate = offset(0);
  calendarCursor = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  resetSearch();
  save();
  render();
  $("#reset-dialog").close();
  $("#settings-dialog").close();
  notify(
    "Datos de ejemplo cargados. Puedes eliminarlos desde cada curso o deber.",
  );
});
for (const b of document.querySelectorAll("[data-close]"))
  b.addEventListener("click", () => $("#" + b.dataset.close).close());
for (const d of document.querySelectorAll("dialog"))
  d.addEventListener("click", (e) => {
    if (e.target === d) {
      const r = d.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        d.close();
    }
  });
document.addEventListener("click", (e) => {
  if (!e.target.closest(".task-menu"))
    document
      .querySelectorAll(".task-menu[open]")
      .forEach((m) => (m.open = false));
});
$("#open-menu").addEventListener("click", () => setMenu(true));
for (const id of ["close-menu", "menu-overlay"])
  $("#" + id).addEventListener("click", () => {
    setMenu(false);
    $("#open-menu").focus();
  });
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && $("#sidebar").classList.contains("open")) {
    setMenu(false);
    $("#open-menu").focus();
  }
});
$("#sidebar").addEventListener("keydown", (e) => {
  if (!$("#sidebar").classList.contains("open") || e.key !== "Tab") return;
  const bs = [...$("#sidebar").querySelectorAll("button")],
    first = bs[0],
    last = bs.at(-1);
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
});
$("#top-date").textContent = new Date().toLocaleDateString("es-PE", {
  weekday: "long",
  day: "numeric",
  month: "short",
});
render();
setupInstall(notify);
setupNative(notify);
loadInvitation();
checkReminders();
setInterval(() => {
  checkReminders();
  if (view === "calendar" && !document.querySelector("dialog[open]"))
    renderCalendar();
}, 30000);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    checkReminders();
    if (view === "calendar") renderCalendar();
  }
});

// Local backups, installation and optional authenticated collaboration.
function downloadFile(name, text, type = "application/json") {
  if (nativeAndroid()) {
    globalThis.ApuntesAndroid.saveFile(name, text, type);
    return;
  }
  const url = URL.createObjectURL(new Blob([text], { type })),
    a = el("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$("#export-backup").addEventListener("click", () => {
  const copies = tasks.map((t) => {
    const {
      remoteId,
      remoteSpace,
      remoteVersion,
      cloudUser,
      shareMode,
      shareRole,
      ...copy
    } = t;
    return { ...copy, shareMode: "copy", shareRole: "admin" };
  });
  downloadFile(
    `apuntes-${offset(0)}.json`,
    JSON.stringify(
      {
        version: 1,
        exportedAt: new Date().toISOString(),
        courses: courses.map(({ id, name, color }) => ({ id, name, color })),
        tasks: copies,
      },
      null,
      2,
    ),
  );
  notify(
    nativeAndroid()
      ? "Respaldo preparado. Elige dónde guardarlo en tu celular."
      : "Respaldo descargado. No contiene contraseñas ni claves. Los compartidos se respaldan como copias locales.",
  );
});
$("#export-recovery").addEventListener("click", () => {
  try {
    downloadFile(
      "apuntes-recuperacion.json",
      JSON.stringify(
        {
          current: localStorage.getItem(STORAGE),
          prototype: localStorage.getItem("apuntes-design-demo-v1"),
        },
        null,
        2,
      ),
    );
  } catch (e) {
    notify("Tu navegador no permite leer el almacenamiento.");
  }
});
$("#import-backup").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    if (file.size > 2 * 1024 * 1024)
      throw Error("El respaldo supera el límite de 2 MB.");
    const data = JSON.parse(await file.text());
    if (!validBackup(data))
      throw Error("El archivo no es un respaldo válido de Apuntes.");
    if (
      (tasks.length || courses.length) &&
      !confirm(
        "La importación reemplazará tus datos locales. Exporta primero un respaldo si quieres conservarlos. ¿Continuar?",
      )
    )
      return;
    // Never accept server references or permissions from an imported file.
    storageCorrupt = false;
    courses = data.courses.map(({ id, name, color }) => ({ id, name, color }));
    tasks = data.tasks.map((t) =>
      normalize({
        id: t.id,
        title: t.title,
        course: t.course,
        due: t.due,
        time: t.time,
        priority: t.priority,
        notes: t.notes,
        link: t.link,
        reminder: t.reminder,
        personalNotes:
          typeof t.personalNotes === "string"
            ? t.personalNotes.slice(0, 2000)
            : "",
        done: t.done,
        shareMode: "copy",
        shareRole: "admin",
      }),
    );
    acceptedInvites = [];
    firedReminders = {};
    view = "pending";
    selectedCourse = null;
    resetSearch();
    save();
    render();
    $("#settings-dialog").close();
    notify(
      "Respaldo importado. Los datos colaborativos se actualizarán al sincronizar.",
    );
  } catch (error) {
    notify(
      error.message ||
        "No se pudo leer el archivo. No se modificaron tus datos.",
    );
  } finally {
    e.target.value = "";
  }
});
$("#load-examples").addEventListener("click", () =>
  $("#reset-dialog").showModal(),
);
function cloudTaskData(t, include = true) {
  const c = courses.find((c) => c.id === t.course);
  return {
    client_ref: t.id,
    title: t.title,
    course_name: c.name,
    color: c.color,
    due: t.due,
    time: t.time,
    priority: t.priority,
    notes: include ? t.notes : "",
    link: include ? t.link : "",
  };
}
function purgeCloudData() {
  tasks = tasks.filter((t) => !t.remoteId);
  courses = courses
    .filter((c) => !c.remoteSpace || tasks.some((t) => t.course === c.id))
    .map((c) => {
      const { remoteSpace, remoteRole, remoteOwner, ...local } = c;
      return local;
    });
  if (selectedCourse && !courses.some((c) => c.id === selectedCourse))
    selectedCourse = null;
  cloudSpaces = [];
  save();
  render();
}
async function syncCloud() {
  if (!cloud.session || !cloud.configured) return;
  if (cloudSyncing) return cloudSyncing;
  cloudSyncing = (async () => {
    const user = cloud.session.user.id;
    const data = await cloud.snapshot();
    if (cloud.session?.user?.id !== user) return;
    const nextCourses = courses.map((c) => ({ ...c })),
      nextTasks = tasks.filter((t) => !t.remoteId),
      seen = new Set();
    for (const space of data.spaces.filter((s) => s.kind === "course")) {
      const sample = data.tasks.find((t) => t.space_id === space.id);
      const source =
        space.owner_id === user && sample
          ? tasks.find((t) => !t.remoteId && t.id === sample.client_ref)
          : null;
      let c =
        nextCourses.find((c) => c.remoteSpace === space.id) ||
        (source &&
          nextCourses.find((c) => c.id === source.course && !c.remoteSpace));
      if (!c) {
        if (nextCourses.length >= 100)
          throw Error(
            "No hay espacio para más cursos. Tus datos se conservaron.",
          );
        c = {
          id: uid(),
          name: (sample?.course_name || space.title).slice(0, 60),
          color: sample?.color || "#a9c2e8",
        };
        nextCourses.push(c);
      }
      Object.assign(c, {
        remoteSpace: space.id,
        remoteRole:
          data.members.find((m) => m.space_id === space.id)?.role || "member",
        remoteOwner: space.owner_id,
      });
    }
    for (const rt of data.tasks) {
      const space = data.spaces.find((s) => s.id === rt.space_id);
      if (!space) continue;
      const role =
        data.members.find((m) => m.space_id === space.id)?.role || "member";
      const old =
        tasks.find((t) => t.remoteId === rt.id && t.cloudUser === user) ||
        (space.owner_id === user
          ? tasks.find((t) => !t.remoteId && t.id === rt.client_ref)
          : null);
      let c =
        space.kind === "course"
          ? nextCourses.find((c) => c.remoteSpace === space.id)
          : null;
      if (!c && old)
        c = nextCourses.find(
          (c) =>
            c.id === old.course &&
            (!c.remoteSpace || c.remoteSpace === space.id),
        );
      if (!c)
        c = nextCourses.find(
          (c) =>
            nameKey(c.name) === nameKey(rt.course_name) &&
            (!c.remoteSpace || c.remoteSpace === space.id),
        );
      if (!c) {
        if (nextCourses.length >= 100)
          throw Error(
            "No hay espacio para más cursos. Tus datos actuales se conservaron.",
          );
        c = { id: uid(), name: rt.course_name, color: rt.color };
        nextCourses.push(c);
      }
      if (space.kind === "course")
        Object.assign(c, {
          remoteSpace: space.id,
          remoteRole: role,
          remoteOwner: space.owner_id,
        });
      if (old && !old.remoteId) {
        const i = nextTasks.indexOf(old);
        if (i >= 0) nextTasks.splice(i, 1);
      }
      const personalNotes = old?.remoteId
        ? old.personalNotes || ""
        : old && old.notes !== rt.notes
          ? old.notes
          : "";
      nextTasks.push(
        normalize({
          id: old?.id || uid(),
          title: rt.title,
          course: c.id,
          due: rt.due,
          time: rt.due_time.slice(0, 5),
          priority: rt.priority,
          notes: rt.notes,
          link: rt.link,
          personalNotes,
          done: data.progress.find((p) => p.task_id === rt.id)?.done || false,
          reminder: old?.reminder || "none",
          remoteId: rt.id,
          remoteSpace: space.id,
          remoteVersion: rt.version,
          cloudUser: user,
          shareMode: "shared",
          shareRole: role,
        }),
      );
      seen.add(space.id);
    }
    courses = nextCourses
      .filter(
        (c) =>
          !c.remoteSpace ||
          data.spaces.some((s) => s.id === c.remoteSpace) ||
          nextTasks.some((t) => t.course === c.id),
      )
      .map((c) => {
        if (c.remoteSpace && !data.spaces.some((s) => s.id === c.remoteSpace)) {
          const { remoteSpace, remoteRole, remoteOwner, ...local } = c;
          return local;
        }
        return c;
      });
    tasks = nextTasks;
    cloudSpaces = data.spaces.map((s) => ({
      ...s,
      role: data.members.find((m) => m.space_id === s.id)?.role || "member",
    }));
    if (selectedCourse && !courses.some((c) => c.id === selectedCourse))
      selectedCourse = null;
    save();
    render();
    renderCloudAccount();
  })();
  try {
    return await cloudSyncing;
  } finally {
    cloudSyncing = false;
  }
}
function renderCloudAccount() {
  $("#cloud-backend").textContent = cloud.configured
    ? "Servicio configurado: " + cloud.url
    : "Ningún servicio conectado.";
  $("#cloud-status").textContent = !cloud.configured
    ? "Esta publicación no tiene configurado el servicio de colaboración. Los deberes, cursos, calendario, copias y respaldos funcionan sin cuenta. Para activar la sincronización, el propietario debe configurar Supabase siguiendo la guía."
    : cloud.session
      ? "Tu cuenta está conectada. Las operaciones compartidas se verifican en el servidor; los datos locales no se suben automáticamente."
      : "Entra con Google para colaborar. La app local sigue funcionando sin cuenta. No necesitas crear otra contraseña.";
  $("#cloud-login").hidden = !cloud.configured || !!cloud.session;
  $("#auth-form").hidden = !cloud.configured || !!cloud.session;
  $("#cloud-account").hidden = !cloud.session;
  $("#cloud-user").textContent = cloud.session?.user?.email || "";
  $("#cloud-spaces").replaceChildren();
  for (const space of cloudSpaces) {
    const row = el("div", "space-row");
    row.append(
      el("h3", "", space.title),
      el("p", "hint", space.role === "admin" ? "Administrador" : "Miembro"),
    );
    const actions = el("div", "space-actions");
    if (space.role === "admin") {
      const revoke = el("button", "text", "Revocar enlaces");
      revoke.addEventListener("click", async () => {
        if (
          !confirm(
            "¿Revocar todas las invitaciones de este espacio? Los miembros actuales conservarán el acceso.",
          )
        )
          return;
        try {
          await cloud.revoke(space.id);
          notify("Invitaciones revocadas.");
        } catch (e) {
          notify(e.message);
        }
      });
      const members = el("button", "text", "Miembros y permisos");
      members.addEventListener("click", () => showMembers(space.id));
      actions.append(revoke, members);
    }
    if (space.owner_id !== cloud.session?.user.id) {
      const leave = el("button", "text", "Abandonar");
      leave.addEventListener("click", async () => {
        if (
          !confirm("¿Abandonar este espacio sin borrar los datos de los demás?")
        )
          return;
        try {
          await cloud.leave(space.id);
          await syncCloud();
          notify("Has abandonado el espacio.");
        } catch (e) {
          notify(e.message);
        }
      });
      actions.append(leave);
    }
    row.append(actions);
    $("#cloud-spaces").append(row);
  }
}
async function showMembers(space) {
  try {
    const members = await cloud.members(space);
    $("#members-list").replaceChildren();
    for (const member of members) {
      const row = el("div", "member-row");
      row.append(
        el(
          "span",
          "",
          member.label +
            (member.user_id === cloud.session.user.id ? " (tú)" : ""),
        ),
      );
      const select = el("select");
      select.setAttribute("aria-label", "Permiso de " + member.label);
      for (const [value, label] of [
        ["member", "Miembro"],
        ["admin", "Administrador"],
        ["remove", "Retirar acceso"],
      ]) {
        const o = el("option", "", label);
        o.value = value;
        select.append(o);
      }
      select.value = member.role;
      select.disabled =
        member.user_id === cloud.session.user.id ||
        cloudSpaces.find((s) => s.id === space)?.owner_id === member.user_id;
      select.addEventListener("change", async () => {
        if (!confirm("¿Aplicar el cambio de acceso?")) {
          select.value = member.role;
          return;
        }
        try {
          await cloud.changeMember(space, member.user_id, select.value);
          await showMembers(space);
        } catch (e) {
          select.value = member.role;
          notify(e.message);
        }
      });
      row.append(select);
      $("#members-list").append(row);
    }
    $("#members-dialog").showModal();
  } catch (e) {
    notify(e.message);
  }
}
function openCloud() {
  renderCloudAccount();
  $("#cloud-dialog").showModal();
}
$("#open-cloud").addEventListener("click", openCloud);
$("#connect-share").addEventListener("click", openCloud);
$("#sync-cloud").addEventListener("click", async () => {
  try {
    await syncCloud();
    $("#cloud-message").textContent =
      "Sincronizado a las " + new Date().toLocaleTimeString("es-PE");
  } catch (e) {
    $("#cloud-message").textContent = e.message;
  }
});
async function connectedAccount() {
  if (lastCloudUser && lastCloudUser !== cloud.session.user.id)
    purgeCloudData();
  lastCloudUser = cloud.session.user.id;
  renderCloudAccount();
  // A sync error must not look like a failed login or ask for the password again.
  try {
    await syncCloud();
    $("#cloud-message").textContent = "Sesión iniciada.";
  } catch (e) {
    $("#cloud-message").textContent =
      "Sesión iniciada. No se pudo sincronizar: " + e.message;
  }
  if (location.hash.startsWith("#join="))
    await openCloudInvite(location.hash.slice(6));
}
let googleStarting = false;
$("#sign-in-google").addEventListener("click", async () => {
  if (googleStarting) return;
  const current = cloud;
  googleStarting = true;
  $("#sign-in-google").disabled = true;
  $("#cloud-message").textContent = "Preparando el acceso seguro…";
  try {
    const url = await beginGoogleSignIn(
      current,
      oauthRedirect(nativeAndroid(), location.href),
      location.hash,
    );
    if (cloud !== current || cloud.session) {
      cancelGoogleSignIn();
      return;
    }
    $("#cloud-message").textContent =
      "Continúa en Google en el navegador. Si cancelas, vuelve aquí y pulsa Entrar con Google otra vez.";
    // Android intercepts this top-level HTTPS navigation and opens the system
    // browser. Google's login must NEVER be displayed inside our WebView.
    location.assign(url);
  } catch (e) {
    $("#cloud-message").textContent = e.message;
  } finally {
    googleStarting = false;
    $("#sign-in-google").disabled = false;
  }
});
async function resumeGoogleSignIn() {
  let callback;
  try {
    callback = oauthCallback(location.href, nativeAndroid());
  } catch (e) {
    notify(e.message);
    return;
  }
  if (!callback) return;
  // Erase the authorization code from history even if exchange fails.
  history.replaceState(null, "", callback.cleanUrl);
  const current = cloud;
  openCloud();
  $("#cloud-message").textContent = "Comprobando el acceso con Google…";
  try {
    const { session, returnHash } = await finishGoogleSignIn(current, callback);
    if (cloud !== current || current.session) return;
    current.store(session);
    if (returnHash)
      history.replaceState(null, "", callback.cleanUrl + returnHash);
    await connectedAccount();
  } catch (e) {
    $("#cloud-message").textContent = e.message;
  }
}
async function authenticate(signUp) {
  if (!$("#auth-form").reportValidity()) return;
  const password = $("#auth-password").value,
    email = $("#auth-email").value.trim();
  $("#cloud-message").textContent = "Conectando…";
  try {
    if (signUp) {
      const active = await cloud.signUp(email, password);
      if (!active) {
        $("#cloud-message").textContent =
          "Revisa tu correo para confirmar la cuenta y después inicia sesión.";
        return;
      }
    } else await cloud.signIn(email, password);
    await connectedAccount();
  } catch (e) {
    $("#cloud-message").textContent = e.message;
  } finally {
    $("#auth-password").value = "";
  }
}
$("#auth-form").addEventListener("submit", (e) => {
  e.preventDefault();
  authenticate(false);
});
$("#sign-up").addEventListener("click", () => authenticate(true));
$("#sign-out").addEventListener("click", async () => {
  cancelGoogleSignIn();
  try {
    await cloud.signOut();
  } catch {}
  purgeCloudData();
  lastCloudUser = null;
  renderCloudAccount();
  notify("Sesión cerrada. Las copias locales siguen en este dispositivo.");
});
$("#create-shared-link").addEventListener("click", async () => {
  const button = $("#create-shared-link");
  button.disabled = true;
  try {
    const items = sharedTasks();
    if (!items.length) throw Error("No hay deberes para compartir.");
    const existing =
      shareContext.kind === "course"
        ? courses.find((c) => c.id === shareContext.id)?.remoteSpace
        : items[0].remoteSpace;
    const space =
      existing ||
      (await cloud.createSpace(
        currentShareTitle(),
        shareContext.kind,
        items.map((t) => cloudTaskData(t, $("#include-notes").checked)),
      ));
    await syncCloud();
    const info = await cloud.invite(space, $("#share-role").value);
    const link = shareBase() + "#join=" + info.token;
    setShareLink(link, "Te invito a " + currentShareTitle());
    $("#share-error").textContent =
      "Invitación válida hasta " +
      new Date(info.expires_at).toLocaleString("es-PE") +
      ". Los miembros tendrán acceso al espacio compartido.";
    notify(
      "Invitación creada. La información compartida ya está en el servidor.",
    );
  } catch (e) {
    notify(e.message);
  } finally {
    button.disabled = false;
  }
});
function currentShareTitle() {
  return shareContext?.kind === "course"
    ? courses.find((c) => c.id === shareContext.id)?.name ||
        $("#share-subject").textContent
    : $("#share-subject").textContent;
}
async function openCloudInvite(token) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      token,
    )
  ) {
    notify("El enlace de invitación no es válido.");
    return;
  }
  if (!cloud.configured) {
    openCloud();
    return;
  }
  try {
    const info = await cloud.inviteInfo(token);
    invitation = { remoteToken: token };
    $("#invite-title").textContent = info.title;
    $("#invite-notice").textContent =
      "Invitación a un espacio colaborativo real. La información se sincroniza; tu progreso y recordatorios siguen siendo personales.";
    $("#invite-meta").textContent =
      `${info.count} deberes · Permiso: ${info.role === "admin" ? "administrador" : "miembro"} · Caduca ${new Date(info.expires_at).toLocaleString("es-PE")}`;
    $("#invite-tasks").replaceChildren();
    $("#accept-invite").disabled = false;
    $("#accept-invite").textContent = cloud.session
      ? "Unirme al espacio"
      : "Iniciar sesión para unirme";
    $("#invite-dialog").showModal();
  } catch (e) {
    notify(e.message);
  }
}
async function acceptRemoteInvite(token) {
  if (!cloud.session) {
    openCloud();
    return;
  }
  try {
    await cloud.accept(token);
    await syncCloud();
    $("#invite-dialog").close();
    $("#cloud-dialog").close();
    history.replaceState(null, "", location.pathname + location.search);
    invitation = null;
    notify("Ya formas parte del espacio. Tu progreso es individual.");
  } catch (e) {
    notify(e.message);
  }
}
// Do not expose another person's cached collaborative data after logout or account switch.
if (
  tasks.some(
    (t) =>
      t.remoteId && (!cloud.session || t.cloudUser !== cloud.session.user.id),
  )
)
  purgeCloudData();
renderCloudAccount();
if (cloud.session && cloud.configured)
  syncCloud().catch((e) => ($("#cloud-message").textContent = e.message));
setInterval(() => {
  if (
    !document.hidden &&
    cloud.session &&
    cloud.configured &&
    !document.querySelector("dialog[open]")
  )
    syncCloud().catch((e) => ($("#cloud-message").textContent = e.message));
}, 20000);

$("#task-dialog").addEventListener("cancel", (e) => {
  if (taskSaving) e.preventDefault();
});

if (location.protocol === "file:") {
  document.querySelectorAll("a[download]").forEach((a) =>
    a.addEventListener("click", (e) => {
      e.preventDefault();
      notify(
        "Ya estás usando el archivo descargado. Conserva el HTML original; exporta tus datos por separado desde Ajustes.",
      );
    }),
  );
  document.querySelectorAll('a[href$=".md"]').forEach((a) =>
    a.addEventListener("click", (e) => {
      e.preventDefault();
      notify(
        "Las instrucciones y privacidad están en el ZIP y en el repositorio. Datos locales en tu navegador; sin analítica. Usa HTTPS para instalar como app.",
      );
    }),
  );
}

$("#configure-cloud").addEventListener("click", () => {
  $("#config-url").value = cloud.url;
  $("#config-key").value = cloud.key;
  $("#config-message").textContent = "";
  $("#cloud-config-dialog").showModal();
});
$("#cloud-config-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const config = {
    supabaseUrl: $("#config-url").value.trim().replace(/\/$/, ""),
    supabaseKey: $("#config-key").value.trim(),
  };
  const candidate = new Cloud(config);
  if (!candidate.configured) {
    $("#config-message").textContent =
      "Usa la URL HTTPS del proyecto y una clave pública publishable o anon. Nunca service_role ni sb_secret_.";
    return;
  }
  if (
    cloud.session &&
    !confirm(
      "Cambiar de servicio cerrará la sesión y quitará la caché compartida de este dispositivo. Exporta un respaldo si necesitas sus notas personales y recordatorios. ¿Continuar?",
    )
  )
    return;
  try {
    localStorage.setItem("apuntes-cloud-config", JSON.stringify(config));
    try {
      await cloud.signOut();
    } catch {}
    cloud = new Cloud(config);
    cancelGoogleSignIn();
    cloud.store(null);
    lastCloudUser = null;
    purgeCloudData();
    renderCloudAccount();
    $("#cloud-config-dialog").close();
    notify(
      "Configuración guardada. El proyecto debe tener instalado el esquema SQL. Inicia sesión para comprobar la conexión.",
    );
  } catch {
    $("#config-message").textContent =
      "No se pudo guardar la configuración. Revisa el almacenamiento del dispositivo.";
  }
});

// All dialogs and invitation handlers are ready before handling a browser return.
resumeGoogleSignIn();
