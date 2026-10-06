import { createManagedAudio, onAudioBackground, isAudioBlocked } from "./audioLifecycle.js";
import { reactive } from "vue";

const AUDIO_SETTINGS_STORAGE_KEY =
  "lagos-experience-music-settings";
const MUSIC_VOLUME = 0.12;
const FADE_MILLISECONDS = 900;

const BUILT_IN_MUSIC_TRACKS = [
  Object.freeze({
    id: "game-music-1",
    number: 1,
    artist: "Kilobyte",
    title: "Wetin Dey",
    source: "./sounds/world/game_music_1.mp3",
  }),
  Object.freeze({
    id: "game-music-2",
    number: 2,
    artist: "BB",
    title: "Love and Roses",
    source: "./sounds/world/game_music_2.mp3",
  }),
  Object.freeze({
    id: "game-music-3",
    number: 3,
    artist: "Teniola",
    title: "Mainland Nights",
    source: "./sounds/world/game_music_3.mp3",
  }),
  Object.freeze({
    id: "game-music-4",
    number: 4,
    artist: "Ayo K",
    title: "Danfo Dreams",
    source: "./sounds/world/game_music_4.mp3",
  }),
  Object.freeze({
    id: "game-music-5",
    number: 5,
    artist: "Seyi Coast",
    title: "Third Mainland",
    source: "./sounds/world/game_music_5.mp3",
  }),
  Object.freeze({
    id: "game-music-6",
    number: 6,
    artist: "Nova Lagos",
    title: "After Hours",
    source: "./sounds/world/game_music_6.mp3",
  }),
  Object.freeze({
    id: "game-music-7",
    number: 7,
    artist: "Maro boy",
    title: "DANFO",
    genre: "Fuji",
    source: "./sounds/world/game_music_7.mp3",
  }),
  Object.freeze({
    id: "game-music-8",
    number: 8,
    artist: "DR WAHEED ALAFIN OWO",
    title: "OLOPA",
    genre: "Fuji",
    source: "./sounds/world/game_music_8.mp3",
  }),
  Object.freeze({
    id: "game-music-9",
    number: 9,
    artist: "MZTA DABI",
    title: "DHABI",
    source: "./sounds/world/game_music_9.mp3",
  }),
  Object.freeze({
    id: "game-music-10",
    number: 10,
    artist: "MZTA DABI",
    title: "MONEY N PACE",
    source: "./sounds/world/game_music_10.mp3",
  }),
];

export const MUSIC_TRACKS = reactive([...BUILT_IN_MUSIC_TRACKS]);

export const musicPlayerState = reactive({
  currentIndex: 0,
  playing: false,
  mode: "all",
  source: null,
  customDirectory: "",
  libraryLoading: false,
  libraryError: "",
});

let audio = null;
let fadeFrame = null;
let unlockHandler = null;
let gameplayStartTimer = null;
let gameplayPaused = false;
let resumeAfterGamePause = false;
let queuedPlayback = null;
let playbackRevision = 0;
let playbackPending = false;

export function setGameplayMusicPaused(paused) {
  if (gameplayPaused === Boolean(paused)) return;
  gameplayPaused = Boolean(paused);
  if (gameplayPaused) {
    resumeAfterGamePause = musicPlayerState.playing || playbackPending || Boolean(audio && !audio.paused);
    if (gameplayStartTimer !== null) {
      window.clearTimeout(gameplayStartTimer);
      gameplayStartTimer = null;
      queuedPlayback = { index: 0, mode: "all", source: "gameplay" };
    }
    pauseMusic();
  } else {
    const request = queuedPlayback;
    queuedPlayback = null;
    const shouldResume = resumeAfterGamePause;
    resumeAfterGamePause = false;
    if (request) playMusicTrack(request.index, request);
    else if (shouldResume) playMusicTrack(musicPlayerState.currentIndex, {
      mode: musicPlayerState.mode, source: musicPlayerState.source,
    });
  }
}

export async function refreshCustomMusicLibrary() {
  const bridge = globalThis.window?.totalCityGrindMusic;
  if (!bridge?.listTracks || musicPlayerState.libraryLoading) return false;

  const currentTrackId = MUSIC_TRACKS[musicPlayerState.currentIndex]?.id;
  musicPlayerState.libraryLoading = true;
  musicPlayerState.libraryError = "";

  try {
    const result = await bridge.listTracks();
    const customTracks = (result?.tracks ?? []).map((track, index) => ({
      ...track,
      number: BUILT_IN_MUSIC_TRACKS.length + index + 1,
    }));
    MUSIC_TRACKS.splice(
      0,
      MUSIC_TRACKS.length,
      ...BUILT_IN_MUSIC_TRACKS,
      ...customTracks,
    );
    musicPlayerState.customDirectory = result?.directory ?? "";

    const restoredIndex = MUSIC_TRACKS.findIndex(
      (track) => track.id === currentTrackId,
    );
    if (restoredIndex >= 0) {
      musicPlayerState.currentIndex = restoredIndex;
    } else {
      audio?.pause();
      audio?.removeAttribute("src");
      musicPlayerState.currentIndex = 0;
      musicPlayerState.playing = false;
      musicPlayerState.source = null;
    }
    return true;
  } catch (error) {
    musicPlayerState.libraryError =
      error instanceof Error ? error.message : "Could not refresh My Music.";
    return false;
  } finally {
    musicPlayerState.libraryLoading = false;
  }
}

export async function openCustomMusicFolder() {
  const bridge = globalThis.window?.totalCityGrindMusic;
  if (!bridge?.openFolder) return false;
  const result = await bridge.openFolder();
  musicPlayerState.customDirectory = result?.directory ?? "";
  if (result?.error) {
    musicPlayerState.libraryError = result.error;
    return false;
  }
  return true;
}

export function getMusicSettings() {
  try {
    const saved = JSON.parse(
      window.localStorage.getItem(
        AUDIO_SETTINGS_STORAGE_KEY,
      ),
    );

    return {
      muted: Boolean(saved?.muted),
      volume: Math.min(
        1,
        Math.max(0, Number(saved?.volume ?? 1)),
      ),
    };
  } catch {
    return { muted: false, volume: 1 };
  }
}

export const musicAudioSettings = reactive(getMusicSettings());

function getTargetVolume() {
  const settings = getMusicSettings();
  return settings.muted
    ? 0
    : MUSIC_VOLUME * settings.volume;
}

function cancelFade() {
  if (fadeFrame !== null) {
    window.cancelAnimationFrame(fadeFrame);
    fadeFrame = null;
  }
}

function clearPlaybackRetry() {
  if (!unlockHandler || typeof document === "undefined") {
    return;
  }

  document.removeEventListener("pointerdown", unlockHandler);
  unlockHandler = null;
}

function armPlaybackRetry() {
  if (unlockHandler || typeof document === "undefined") {
    return;
  }

  unlockHandler = () => {
    clearPlaybackRetry();
    playMusicTrack(musicPlayerState.currentIndex, {
      mode: musicPlayerState.mode,
      source: musicPlayerState.source,
      fadeIn: true,
    });
  };
  document.addEventListener("pointerdown", unlockHandler, {
    once: true,
  });
}

function fadeTo(targetVolume, {
  duration = FADE_MILLISECONDS,
  pauseAfter = false,
} = {}) {
  if (!audio || typeof window === "undefined") {
    return;
  }

  cancelFade();
  const startingVolume = audio.volume;
  const startedAt = performance.now();

  const step = (now) => {
    const progress = Math.min(
      1,
      (now - startedAt) / Math.max(1, duration),
    );
    audio.volume =
      startingVolume +
      (targetVolume - startingVolume) * progress;

    if (progress < 1) {
      fadeFrame = window.requestAnimationFrame(step);
      return;
    }

    fadeFrame = null;
    if (pauseAfter) {
      audio.pause();
      musicPlayerState.playing = false;
    }
  };

  fadeFrame = window.requestAnimationFrame(step);
}

function ensureAudio() {
  if (audio || typeof Audio === "undefined") {
    return audio;
  }

  audio = createManagedAudio();
  audio.preload = "metadata";
  audio.addEventListener("ended", () => {
    if (gameplayPaused) return;
    if (musicPlayerState.mode === "one") {
      audio.currentTime = 0;
      audio.play().catch(() => {});
      return;
    }

    playMusicTrack(
      (musicPlayerState.currentIndex + 1) %
        MUSIC_TRACKS.length,
      {
        mode: "all",
        source: musicPlayerState.source,
      },
    );
  });

  return audio;
}

export function playMusicTrack(index, {
  mode = musicPlayerState.mode,
  source = "phone",
  fadeIn = false,
} = {}) {
  if (isAudioBlocked()) return false;
  if (gameplayPaused) {
    queuedPlayback = { index, mode, source, fadeIn };
    return false;
  }
  const player = ensureAudio();
  if (!player) return false;

  const safeIndex =
    ((Number(index) || 0) % MUSIC_TRACKS.length +
      MUSIC_TRACKS.length) %
    MUSIC_TRACKS.length;
  const track = MUSIC_TRACKS[safeIndex];
  const changingTrack =
    musicPlayerState.currentIndex !== safeIndex ||
    !player.src.endsWith(track.source.replace("./", "/"));

  cancelFade();
  musicPlayerState.currentIndex = safeIndex;
  musicPlayerState.mode = mode === "one" ? "one" : "all";
  musicPlayerState.source = source;
  player.loop = false;

  if (changingTrack) {
    player.src = track.source;
    player.currentTime = 0;
  }

  player.volume = fadeIn ? 0 : getTargetVolume();
  const revision = ++playbackRevision;
  playbackPending = true;
  player.play().then(() => {
    if (revision !== playbackRevision) return;
    playbackPending = false;
    clearPlaybackRetry();
    musicPlayerState.playing = true;
    if (fadeIn) {
      fadeTo(getTargetVolume());
    }
  }).catch(() => {
    if (revision !== playbackRevision) return;
    playbackPending = false;
    musicPlayerState.playing = false;
    if (source === "menu") {
      armPlaybackRetry();
    }
  });
  return true;
}

export function pauseMusic({ fadeOut = false } = {}) {
  playbackRevision += 1;
  playbackPending = false;
  clearPlaybackRetry();
  if (!audio) return;

  if (fadeOut && !audio.paused) {
    fadeTo(0, { pauseAfter: true });
    return;
  }

  cancelFade();
  audio.pause();
  musicPlayerState.playing = false;
}

export function toggleMusicPlayback() {
  if (musicPlayerState.playing) {
    pauseMusic();
    return;
  }

  playMusicTrack(musicPlayerState.currentIndex, {
    mode: musicPlayerState.mode,
    source: "phone",
  });
}

export function playNextMusicTrack() {
  playMusicTrack(
    (musicPlayerState.currentIndex + 1) %
      MUSIC_TRACKS.length,
    {
      mode: musicPlayerState.mode,
      source: "phone",
    },
  );
}

export function playPreviousMusicTrack() {
  playMusicTrack(
    (musicPlayerState.currentIndex - 1) %
      MUSIC_TRACKS.length,
    {
      mode: musicPlayerState.mode,
      source: "phone",
    },
  );
}

export function setMusicMode(mode) {
  musicPlayerState.mode = mode === "one" ? "one" : "all";
}

export function refreshMusicVolume() {
  if (audio && musicPlayerState.playing) {
    cancelFade();
    audio.volume = getTargetVolume();
  }
}

export function enterMainMenuMusic() {
  gameplayPaused = false;
  resumeAfterGamePause = false;
  queuedPlayback = null;
  window.clearTimeout(gameplayStartTimer);
  gameplayStartTimer = null;
  playMusicTrack(0, {
    mode: "one",
    source: "menu",
    fadeIn: true,
  });
}

export function leaveMainMenuMusic() {
  if (musicPlayerState.source === "menu") {
    pauseMusic({ fadeOut: true });
    window.clearTimeout(gameplayStartTimer);
    gameplayStartTimer = window.setTimeout(() => {
      gameplayStartTimer = null;
      playMusicTrack(0, {
        mode: "all",
        source: "gameplay",
        fadeIn: true,
      });
    }, FADE_MILLISECONDS + 60);
  }
}


if (globalThis.window?.totalCityGrindMusic) {
  refreshCustomMusicLibrary();
}

onAudioBackground(() => {
  if (typeof window !== "undefined") window.clearTimeout(gameplayStartTimer);
  gameplayStartTimer = null;
  pauseMusic();
});

export function setMusicSettings({volume=1,muted=false}) {
  const settings={volume:Number.isFinite(Number(volume))?Math.min(1,Math.max(0,Number(volume))):1,muted:Boolean(muted)};
  window.localStorage.setItem(AUDIO_SETTINGS_STORAGE_KEY,JSON.stringify(settings));
  Object.assign(musicAudioSettings,settings);
  refreshMusicVolume();
  return musicAudioSettings;
}
