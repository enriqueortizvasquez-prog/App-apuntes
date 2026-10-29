/** Supabase OAuth with PKCE. No Google token, password or client secret in the APK. */
const OAUTH_KEY = "apuntes-oauth-pending";
const OAUTH_TTL = 10 * 60 * 1000;
const base64url = (bytes) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

export function oauthRedirect(native, href) {
  if (native) return "apuntes://open";
  const url = new URL(href);
  if (
    url.protocol !== "https:" &&
    !(
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(url.hostname)
    )
  )
    throw Error(
      "Para entrar con Google usa el APK o una publicación HTTPS; no el archivo HTML descargado.",
    );
  return url.origin + url.pathname;
}

export function cancelGoogleSignIn() {
  try {
    localStorage.removeItem(OAUTH_KEY);
  } catch {}
}

export async function beginGoogleSignIn(cloud, redirectTo, returnHash = "") {
  if (!cloud.configured)
    throw Error("Configura primero el servicio de colaboración.");
  const settings = await cloud.request("/auth/v1/settings", { auth: false });
  if (settings?.external?.google !== true)
    throw Error(
      "Falta activar Google en Supabase. El propietario debe completar la configuración; tus deberes locales siguen funcionando.",
    );
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const verifier = base64url(bytes);
  const challenge = base64url(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)),
    ),
  );
  const pending = {
    verifier,
    createdAt: Date.now(),
    project: cloud.url,
    redirectTo,
    // Only a collaborative invitation may be resumed after authentication.
    returnHash: /^#join=[0-9a-f-]{36}$/i.test(returnHash) ? returnHash : "",
  };
  try {
    localStorage.setItem(OAUTH_KEY, JSON.stringify(pending));
    if (localStorage.getItem(OAUTH_KEY) !== JSON.stringify(pending))
      throw Error();
  } catch {
    throw Error(
      "No se puede guardar temporalmente el acceso. Habilita el almacenamiento de la app e inténtalo otra vez.",
    );
  }
  const url = new URL(cloud.url + "/auth/v1/authorize");
  url.search = new URLSearchParams({
    provider: "google",
    redirect_to: redirectTo,
    code_challenge: challenge,
    code_challenge_method: "s256",
    // Only identity. Do not request Drive, Calendar, Gmail or offline Google tokens.
    scopes: "openid email profile",
    prompt: "select_account",
  }).toString();
  return url.href;
}

export function oauthCallback(href, native) {
  const url = new URL(href);
  const internal = url.hash.startsWith("#oauth=");
  const params = internal
    ? new URLSearchParams(url.hash.slice(7))
    : url.searchParams;
  if (!internal && !params.has("code") && !params.has("error")) return null;
  // Never accept implicit-flow tokens provided by a link.
  return {
    code: params.get("code"),
    error: params.has("error"),
    redirectTo: oauthRedirect(native, href),
    cleanUrl: internal
      ? url.pathname + url.search
      : (() => {
          url.searchParams.delete("code");
          url.searchParams.delete("error");
          url.searchParams.delete("error_description");
          url.searchParams.delete("error_code");
          return url.pathname + url.search;
        })(),
  };
}

export async function finishGoogleSignIn(cloud, callback) {
  let pending;
  try {
    pending = JSON.parse(localStorage.getItem(OAUTH_KEY));
  } catch {}
  // Consume before awaiting: a repeated link cannot exchange twice.
  cancelGoogleSignIn();
  if (callback.error)
    throw Error("Acceso con Google cancelado. Puedes volver a intentarlo.");
  if (
    !pending ||
    pending.project !== cloud.url ||
    pending.redirectTo !== callback.redirectTo ||
    !/^[A-Za-z0-9_-]{43}$/.test(pending.verifier) ||
    !Number.isFinite(pending.createdAt) ||
    Date.now() - pending.createdAt > OAUTH_TTL ||
    pending.createdAt > Date.now() + 1000
  )
    throw Error(
      "Este acceso no se inició aquí o ya caducó. Pulsa Entrar con Google otra vez.",
    );
  if (!/^[A-Za-z0-9_-]{1,2048}$/.test(callback.code || ""))
    throw Error(
      "La respuesta de acceso no es válida. Vuelve a entrar con Google.",
    );
  const session = await cloud.request("/auth/v1/token?grant_type=pkce", {
    method: "POST",
    auth: false,
    body: { auth_code: callback.code, code_verifier: pending.verifier },
  });
  if (
    !session?.access_token ||
    !session?.refresh_token ||
    !session?.user?.id ||
    !Number.isFinite(session.expires_at)
  )
    throw Error(
      "El servidor no devolvió una sesión válida. Vuelve a intentarlo.",
    );
  // The caller checks that the backend/account has not changed before storing.
  return {
    session,
    returnHash: /^#join=[0-9a-f-]{36}$/i.test(pending.returnHash)
      ? pending.returnHash
      : "",
  };
}
