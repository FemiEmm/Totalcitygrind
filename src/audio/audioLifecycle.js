// One lifecycle gate for music, engines, effects and phone audio.
const activeAudio = new Set();
const backgroundListeners = new Set();
let background = typeof document !== "undefined" && document.hidden;
let generation = 0;
export const audioGeneration = () => generation;
export const isAudioBlocked = () => background || (typeof document !== "undefined" && document.hidden);
export function onAudioBackground(listener) { backgroundListeners.add(listener); return () => backgroundListeners.delete(listener); }
function stopBackgroundAudio() {
  background = true;
  generation += 1;
  for (const audio of activeAudio) audio.pause();
  activeAudio.clear();
  for (const listener of backgroundListeners) listener();
}
function foreground() { if (!document.hidden) background = false; }
if (typeof window !== "undefined" && typeof document !== "undefined") {
  document.addEventListener?.("visibilitychange", () => document.hidden ? stopBackgroundAudio() : foreground());
  document.addEventListener?.("freeze", stopBackgroundAudio);
  document.addEventListener?.("resume", foreground);
  window.addEventListener?.("pagehide", stopBackgroundAudio);
  window.addEventListener?.("blur", stopBackgroundAudio);
  window.addEventListener?.("pageshow", foreground);
  window.addEventListener?.("focus", foreground);
}
export function createManagedAudio(source) {
  const audio = new Audio(source);
  const play = audio.play.bind(audio);
  audio.addEventListener("ended", () => activeAudio.delete(audio));
  audio.addEventListener("error", () => activeAudio.delete(audio));
  audio.addEventListener("pause", () => activeAudio.delete(audio));
  audio.addEventListener("play", () => {
    if (isAudioBlocked()) audio.pause();
    else activeAudio.add(audio);
  });
  audio.play = async () => {
    if (isAudioBlocked()) throw new DOMException("App is in the background", "AbortError");
    const revision = generation;
    activeAudio.add(audio);
    try {
      await play();
      if (isAudioBlocked() || revision !== generation) {
        audio.pause();
        throw new DOMException("Playback interrupted", "AbortError");
      }
    } catch (error) {
      activeAudio.delete(audio);
      throw error;
    }
  };
  return audio;
}
