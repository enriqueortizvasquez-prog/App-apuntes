/** Optional real collaboration through Supabase Auth/PostgREST. No SDK or third-party scripts. */
export class Cloud {
  constructor(config = globalThis.APUNTES_CONFIG || {}) {
    this.url = (config.supabaseUrl || "").replace(/\/$/, "");
    this.key = config.supabaseKey || "";
    this.session = null;
    try {
      this.session = JSON.parse(sessionStorage.getItem("apuntes-session"));
      if (
        !this.session?.access_token ||
        !this.session?.refresh_token ||
        !this.session?.user?.id ||
        !Number.isFinite(this.session?.expires_at)
      )
        this.session = null;
    } catch {}
  }
  get configured() {
    if (!this.key || /^sb_secret_/.test(this.key)) return false;
    try {
      if (new URL(this.url).protocol !== "https:") return false;
      if (this.key.includes(".")) {
        const p = JSON.parse(
          atob(this.key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
        );
        if (p.role !== "anon") return false;
      }
      return true;
    } catch {
      return false;
    }
  }
  store(session) {
    this.session = session;
    try {
      if (session)
        sessionStorage.setItem("apuntes-session", JSON.stringify(session));
      else sessionStorage.removeItem("apuntes-session");
    } catch {}
  }
  async request(
    path,
    { method = "GET", body, auth = true, refresh = true } = {},
  ) {
    if (!this.configured)
      throw Error(
        "La colaboración no está configurada. Puedes seguir usando tus deberes locales.",
      );
    if (auth && !this.session?.access_token)
      throw Error("Inicia sesión para colaborar.");
    if (auth && refresh && this.session.expires_at * 1000 < Date.now() + 60000)
      await this.refresh();
    const response = await fetch(this.url + path, {
      method,
      headers: {
        apikey: this.key,
        "Content-Type": "application/json",
        ...(auth
          ? { Authorization: `Bearer ${this.session.access_token}` }
          : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(15000),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok)
      throw Error(
        result?.message ||
          result?.msg ||
          result?.error_description ||
          "No se pudo completar la operación. Comprueba tu conexión y los permisos.",
      );
    return result;
  }
  async refresh() {
    if (this.refreshing) return this.refreshing;
    const token = this.session?.refresh_token;
    this.refreshing = (async () => {
      try {
        const s = await this.request(
          "/auth/v1/token?grant_type=refresh_token",
          { method: "POST", auth: false, body: { refresh_token: token } },
        );
        // A signed-out/switched account must not be restored by an old request.
        if (this.session?.refresh_token === token) this.store(s);
      } catch (e) {
        if (this.session?.refresh_token === token) this.store(null);
        throw Error("Tu sesión caducó. Vuelve a iniciar sesión.");
      } finally {
        this.refreshing = null;
      }
    })();
    return this.refreshing;
  }
  async signIn(email, password) {
    const s = await this.request("/auth/v1/token?grant_type=password", {
      method: "POST",
      auth: false,
      body: { email, password },
    });
    this.store(s);
    return s.user;
  }
  async signUp(email, password) {
    const s = await this.request("/auth/v1/signup", {
      method: "POST",
      auth: false,
      body: { email, password },
    });
    if (s.access_token) this.store(s);
    return !!s.access_token;
  }
  async signOut() {
    try {
      if (this.session)
        await this.request("/auth/v1/logout", { method: "POST" });
    } finally {
      this.store(null);
    }
  }
  rpc(name, body, auth = true) {
    return this.request(`/rest/v1/rpc/${name}`, { method: "POST", body, auth });
  }
  async readAll(query) {
    const rows = [];
    for (let offset = 0; offset <= 10000; offset += 500) {
      const page = await this.request(query + `&limit=500&offset=${offset}`);
      if (!Array.isArray(page))
        throw Error("El servidor devolvió datos no válidos.");
      rows.push(...page);
      if (rows.length > 10000)
        throw Error(
          "El espacio supera el límite de descarga. Tus datos actuales se conservan.",
        );
      if (page.length < 500) return rows;
    }
    throw Error("No se pudo completar la descarga.");
  }
  async snapshot() {
    const user = this.session.user.id;
    const [spaces, tasks, progress, members] = await Promise.all([
      this.readAll("/rest/v1/shared_spaces?select=*&order=id.asc"),
      this.readAll("/rest/v1/shared_tasks?select=*&order=id.asc"),
      this.readAll(
        `/rest/v1/task_progress?user_id=eq.${user}&select=*&order=task_id.asc`,
      ),
      this.readAll(
        `/rest/v1/space_members?user_id=eq.${user}&select=*&order=space_id.asc`,
      ),
    ]);
    return { spaces, tasks, progress, members };
  }
  createSpace(title, kind, items) {
    return this.rpc("create_space", {
      p_title: title,
      p_kind: kind,
      p_tasks: items,
    });
  }
  invite(space, role) {
    return this.rpc("create_invite", { p_space: space, p_role: role });
  }
  inviteInfo(token) {
    return this.rpc("preview_invite", { p_token: token }, false);
  }
  accept(token) {
    return this.rpc("accept_invite", { p_token: token });
  }
  setDone(task, done) {
    return this.rpc("set_task_progress", { p_task: task, p_done: done });
  }
  update(task, version, data) {
    return this.rpc("update_shared_task", {
      p_task: task,
      p_version: version,
      p_data: data,
    });
  }
  addTask(space, data) {
    return this.rpc("add_shared_task", { p_space: space, p_data: data });
  }
  deleteTask(id) {
    return this.rpc("delete_shared_task", { p_task: id });
  }
  revoke(space) {
    return this.rpc("revoke_invites", { p_space: space });
  }
  leave(space) {
    return this.rpc("leave_space", { p_space: space });
  }
  members(space) {
    return this.rpc("list_members", { p_space: space });
  }
  changeMember(space, user, role) {
    return this.rpc("change_member", {
      p_space: space,
      p_user: user,
      p_role: role,
    });
  }
}
