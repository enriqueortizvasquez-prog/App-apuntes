export function setupInstall(notify) {
  const button = document.querySelector("#install-app");
  let prompt;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    prompt = e;
    button.textContent = "Instalar gratis";
  });
  button.addEventListener("click", async () => {
    if (prompt) {
      await prompt.prompt();
      await prompt.userChoice;
      prompt = null;
      return;
    }
    document.querySelector("#install-dialog").showModal();
  });
  window.addEventListener("appinstalled", () => {
    button.textContent = "App instalada";
    notify("Apuntes ya está instalada.");
  });
  const status = document.querySelector("#connection-status");
  let offlineReady = location.protocol === "file:";
  const update = () => {
    status.textContent = navigator.onLine
      ? offlineReady
        ? "Disponible sin conexión"
        : "Guardado local"
      : "Sin conexión · guardado local";
  };
  window.addEventListener("online", update);
  window.addEventListener("offline", update);
  update();
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker
      .register("./sw.js")
      .then((reg) => {
        const check = (worker) =>
          worker?.addEventListener("statechange", () => {
            if (
              worker.state === "installed" &&
              navigator.serviceWorker.controller
            )
              notify(
                "Hay una actualización. Cierra todas las ventanas de Apuntes y vuelve a abrir.",
              );
          });
        check(reg.installing);
        reg.addEventListener("updatefound", () => check(reg.installing));
        navigator.serviceWorker.ready.then(() => {
          offlineReady = true;
          update();
        });
      })
      .catch(() =>
        notify(
          "La instalación sin conexión no está disponible aquí. Tus datos locales siguen guardados.",
        ),
      );
  }
}
