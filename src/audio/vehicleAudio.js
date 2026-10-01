import { ref } from "vue";

const VEHICLE_SOUNDS = Object.freeze({
  start: "./sounds/vehicle/engine-start.mp3",
  drive: "./sounds/vehicle/engine-drive.mp3",
  stop: "./sounds/vehicle/engine-stop.mp3",
  hit: "./sounds/vehicle/vehicle-hit.mp3",
  horn: "./sounds/vehicle/vehicle-horn.mp3",
});

const START_FALLBACK_MS = 4000;
const START_RETRY_PAUSE_MS = 250;
const HIT_COOLDOWN_MS = 420;
const DRIVE_LOOP_ENABLED = true;
const DRIVE_LOOP_VOLUME = 0.4;
const IDLE_LOOP_VOLUME = 0.1;
const AUDIO_SETTINGS_STORAGE_KEY =
  "lagos-experience-audio-settings";

const engineStarted = ref(false);
let engineStarting = false;
let engineLoop = null;
let activeStartSound = null;
let startTimer = null;
let startSequence = 0;
let lastHitAt = 0;
let lastAiHornAt = 0;
let masterVolume = 1;
let soundMuted = false;
let driveLoopBaseVolume = 0;
const activeOneShots = new Set();

function loadAudioSettings() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const saved = JSON.parse(
      window.localStorage.getItem(
        AUDIO_SETTINGS_STORAGE_KEY,
      ),
    );

    masterVolume = Math.min(
      1,
      Math.max(0, Number(saved?.volume ?? 1)),
    );
    soundMuted = Boolean(saved?.muted);
  } catch {
    masterVolume = 1;
    soundMuted = false;
  }
}

loadAudioSettings();

function applyAudioVolume(audio, baseVolume) {
  if (!audio) {
    return;
  }

  audio.lagosBaseVolume = baseVolume;
  audio.volume = soundMuted
    ? 0
    : Math.min(1, baseVolume * masterVolume);
}

function refreshActiveAudioVolumes() {
  [engineLoop, activeStartSound, ...activeOneShots].forEach((audio) => {
    if (audio) {
      applyAudioVolume(
        audio,
        audio.lagosBaseVolume ?? 1,
      );
    }
  });
}

function saveAudioSettings() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    AUDIO_SETTINGS_STORAGE_KEY,
    JSON.stringify({
      volume: masterVolume,
      muted: soundMuted,
    }),
  );
}

export function getPlayerVehicleAudioSettings() {
  return {
    volume: masterVolume,
    muted: soundMuted,
  };
}

export function setPlayerVehicleAudioSettings({
  volume = masterVolume,
  muted = soundMuted,
} = {}) {
  masterVolume = Math.min(
    1,
    Math.max(0, Number(volume)),
  );
  soundMuted = Boolean(muted);
  refreshActiveAudioVolumes();
  saveAudioSettings();

  return getPlayerVehicleAudioSettings();
}

function createAudio(source) {
  if (typeof Audio === "undefined") {
    return null;
  }

  return new Audio(source);
}

function safePlay(audio) {
  if (!audio) {
    return Promise.resolve(false);
  }

  try {
    return audio.play().then(
      () => true,
      () => false,
    );
  } catch {
    return Promise.resolve(false);
  }
}

function playOneShot(source, volume = 1, playbackRate = 1) {
  const audio = createAudio(source);

  if (!audio) {
    return null;
  }

  applyAudioVolume(audio, volume);
  audio.playbackRate = playbackRate;
  activeOneShots.add(audio);
  const releaseAudio = () => {
    activeOneShots.delete(audio);
  };
  audio.addEventListener("ended", releaseAudio, { once: true });
  audio.addEventListener("error", releaseAudio, { once: true });
  safePlay(audio);
  return audio;
}

function playEngineStopTail() {
  playOneShot(
    "./sounds/vehicle/engine-stop-placeholder.wav",
    0.38,
  );
}

function clearStartTimer() {
  if (startTimer === null || typeof window === "undefined") {
    return;
  }

  window.clearTimeout(startTimer);
  startTimer = null;
}

function stopActiveStartSound() {
  if (!activeStartSound) {
    return;
  }

  activeStartSound.pause();
  activeStartSound.currentTime = 0;
  activeStartSound = null;
}

function ensureEngineLoop() {
  if (!engineLoop) {
    engineLoop = createAudio(VEHICLE_SOUNDS.drive);
  }

  if (!engineLoop) {
    return null;
  }

  engineLoop.loop = true;
  return engineLoop;
}

function startIdleSound() {
  if (!DRIVE_LOOP_ENABLED) {
    return;
  }

  const loop = ensureEngineLoop();

  if (!loop || !engineStarted.value) {
    return;
  }

  driveLoopBaseVolume = IDLE_LOOP_VOLUME;
  applyAudioVolume(loop, driveLoopBaseVolume);
  loop.loop = true;
  loop.playbackRate = 0.62;

  if (loop.paused) {
    safePlay(loop);
  }
}

function getRequiredStartAttempts(damage) {
  if (damage >= 85) {
    return 3;
  }

  if (damage >= 70) {
    return 2;
  }

  return 1;
}

function runStartAttempt(sequence, attempt, requiredAttempts) {
  if (
    sequence !== startSequence ||
    !engineStarting ||
    typeof window === "undefined"
  ) {
    return;
  }

  stopActiveStartSound();
  clearStartTimer();

  const startSound = createAudio(VEHICLE_SOUNDS.start);
  activeStartSound = startSound;
  let attemptFinished = false;

  const finishAttempt = () => {
    if (attemptFinished || sequence !== startSequence) {
      return;
    }

    attemptFinished = true;
    clearStartTimer();
    activeStartSound = null;
    startSound?.pause();
    if (startSound) {
      startSound.currentTime = 0;
    }

    if (attempt < requiredAttempts) {
      startTimer = window.setTimeout(() => {
        runStartAttempt(sequence, attempt + 1, requiredAttempts);
      }, START_RETRY_PAUSE_MS);
      return;
    }

    engineStarting = false;
    engineStarted.value = true;
    startIdleSound();
  };

  if (!startSound) {
    finishAttempt();
    return;
  }

  applyAudioVolume(startSound, 0.56);
  startSound.addEventListener("ended", finishAttempt, { once: true });
  startSound.addEventListener("error", finishAttempt, { once: true });

  safePlay(startSound).then((played) => {
    if (!played) {
      finishAttempt();
    }
  });

  startTimer = window.setTimeout(
    finishAttempt,
    START_FALLBACK_MS,
  );
}

export function requestPlayerVehicleEngineStart(damage = 0) {
  if (
    engineStarted.value ||
    engineStarting ||
    damage >= 100 ||
    typeof window === "undefined"
  ) {
    return false;
  }

  engineStarting = true;
  startSequence += 1;

  runStartAttempt(
    startSequence,
    1,
    getRequiredStartAttempts(damage),
  );

  return true;
}

export function isPlayerVehicleEngineStarted() {
  return engineStarted.value;
}

export function isPlayerVehicleEngineStarting() {
  return engineStarting;
}

export function updatePlayerVehicleEngineSound(
  _speed,
  _maximumSpeed,
  accelerating = false,
  _deltaSeconds = 1 / 60,
) {
  if (
    !engineStarted.value ||
    !DRIVE_LOOP_ENABLED
  ) {
    if (engineLoop) {
      engineLoop.pause();
      engineLoop.currentTime = 0;
    }
    driveLoopBaseVolume = 0;
    return;
  }

  const loop = ensureEngineLoop();

  if (!loop) {
    return;
  }

  driveLoopBaseVolume = accelerating
    ? DRIVE_LOOP_VOLUME
    : IDLE_LOOP_VOLUME;
  applyAudioVolume(loop, driveLoopBaseVolume);
  loop.loop = true;
  loop.playbackRate = accelerating ? 1 : 0.62;

  if (loop.paused) {
    safePlay(loop);
  }
}

export function stopPlayerVehicleEngine({ playStopSound = true } = {}) {
  const wasRunning = engineStarted.value || engineStarting;

  startSequence += 1;
  engineStarted.value = false;
  engineStarting = false;
  clearStartTimer();
  stopActiveStartSound();

  if (engineLoop) {
    engineLoop.pause();
    engineLoop.currentTime = 0;
  }
  driveLoopBaseVolume = 0;

  if (wasRunning && playStopSound) {
    playEngineStopTail();
  }
}

export function playPlayerVehicleHitSound() {
  const now =
    typeof performance === "undefined"
      ? Date.now()
      : performance.now();

  if (now - lastHitAt < HIT_COOLDOWN_MS) {
    return;
  }

  lastHitAt = now;
  playOneShot(VEHICLE_SOUNDS.hit, 0.52);
}

export function playPlayerVehicleHorn() {
  playOneShot(VEHICLE_SOUNDS.horn, 0.5);
}

export function playAiVehicleHorn({
  volume = 0.08,
  playbackRate = 1,
} = {}) {
  const now =
    typeof performance === "undefined"
      ? Date.now()
      : performance.now();

  // Keep overlapping AI horns from turning into a single loud burst.
  if (now - lastAiHornAt < 320) {
    return false;
  }

  lastAiHornAt = now;
  playOneShot(
    VEHICLE_SOUNDS.horn,
    Math.min(0.12, Math.max(0.025, volume)),
    Math.min(1.12, Math.max(0.9, playbackRate)),
  );
  return true;
}

export function disposePlayerVehicleAudio() {
  stopPlayerVehicleEngine({ playStopSound: false });
  engineLoop = null;
}
