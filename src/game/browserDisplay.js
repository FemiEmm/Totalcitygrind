import { ref, shallowRef } from "vue";

export const fullscreenActive = ref(false);
export const installed = ref(false);
const installPrompt = shallowRef(null);
export const displayNotice = ref("");
export const installHelp = ref(false);
export const installing = ref(false);
export const appleDevice = typeof navigator !== "undefined" && (/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

function syncDisplay() {
  fullscreenActive.value = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
  installed.value = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}
if (typeof window !== "undefined") {
  syncDisplay();
  document.addEventListener("fullscreenchange", syncDisplay);
  document.addEventListener("webkitfullscreenchange", syncDisplay);
  window.matchMedia("(display-mode: standalone)").addEventListener("change", syncDisplay);
  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    installPrompt.value = event;
  });
  window.addEventListener("appinstalled", () => {
    installed.value = true;
    installPrompt.value = null;
    installHelp.value = false;
    displayNotice.value = "Total City Grind has been added. Open it from your app icon.";
  });
}

export async function toggleFullscreen() {
  displayNotice.value = "";
  try {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      await exit.call(document);
    } else {
      const root = document.documentElement;
      const request = root.requestFullscreen || root.webkitRequestFullscreen;
      if (!request) {
        displayNotice.value = "Fullscreen is unavailable in this browser. Use Add to Home Screen to open the game as an app.";
        return;
      }
      await request.call(root);
    }
    syncDisplay();
  } catch {
    displayNotice.value = "The browser could not enter fullscreen. Try Add to Home Screen instead.";
  }
}

export async function addToHomeScreen() {
  displayNotice.value = "";
  if (installed.value) {
    displayNotice.value = "You are already playing in the installed app.";
    return;
  }
  const prompt = installPrompt.value;
  if (!prompt) {
    installHelp.value = !installHelp.value;
    return;
  }
  installPrompt.value = null;
  installing.value = true;
  try {
    await prompt.prompt();
    const result = await prompt.userChoice;
    displayNotice.value = result.outcome === "accepted" ? "Installation requested. Open the game from its app icon once added." : "Installation cancelled. You can keep playing in your browser.";
  } catch {
    installHelp.value = true;
  } finally {
    installing.value = false;
  }
}
