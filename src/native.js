/** Small, explicit Android adapter; the web app remains dependency-free. */
export function nativeAndroid() {
  return (
    globalThis.APUNTES_ANDROID === true &&
    typeof globalThis.ApuntesAndroid?.saveFile === "function"
  );
}
export function shareBase() {
  return nativeAndroid() ? "apuntes://open" : location.href.split("#")[0];
}
export function setupNative(notify) {
  if (!nativeAndroid()) return;
  window.addEventListener("apuntes-native-notice", (e) =>
    notify(String(e.detail)),
  );
  document.querySelectorAll("a[download]").forEach((a) => {
    a.href = "https://github.com/enriqueortizvasquez-prog/App-apuntes/releases";
    a.removeAttribute("download");
    a.textContent = "Ver descargas y versiones";
  });
}
