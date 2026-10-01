const AUDIO_SETTINGS_STORAGE_KEY =
  "lagos-experience-audio-settings";
const MAXIMUM_OUTPUT_VOLUME = 0.72;
const soundCooldowns = new Map();

export const GAME_SOUNDS = Object.freeze({
  buttonClick: { source: "./sounds/ui/button-click.wav", volume: 0.34 },
  confirm: { source: "./sounds/ui/confirm.wav", volume: 0.42 },
  error: { source: "./sounds/ui/error.wav", volume: 0.38 },
  phoneRing: { source: "./sounds/ui/phone-ring.wav", volume: 0.44 },
  notification: { source: "./sounds/ui/notification.wav", volume: 0.4 },
  statusWarning: {
    source: "./sounds/vehicle/damaged-engine-warning.wav",
    volume: 0.42,
  },
  engineStop: {
    source: "./sounds/vehicle/engine-stop-placeholder.wav",
    volume: 0.38,
  },
  tyreSkid: { source: "./sounds/vehicle/tyre-skid.wav", volume: 0.34 },
  damagedEngineWarning: {
    source: "./sounds/vehicle/damaged-engine-warning.wav",
    volume: 0.34,
  },
  passengerBoard: {
    source: "./sounds/danfo/passenger-board.wav",
    volume: 0.36,
  },
  passengerAlight: {
    source: "./sounds/danfo/passenger-alight.wav",
    volume: 0.34,
  },
  fareCollected: {
    source: "./sounds/danfo/fare-collected.wav",
    volume: 0.38,
  },
  busStopArrival: {
    source: "./sounds/danfo/bus-stop-arrival.wav",
    volume: 0.4,
  },
  routeComplete: {
    source: "./sounds/danfo/route-complete.wav",
    volume: 0.42,
  },
  fuelPump: {
    source: "./sounds/services/fuel-pump.wav",
    volume: 0.24,
    loop: true,
  },
  mechanicRepair: {
    source: "./sounds/services/mechanic-repair.wav",
    volume: 0.34,
  },
  eatFood: { source: "./sounds/services/eat-food.wav", volume: 0.3 },
  drink: { source: "./sounds/services/drink.wav", volume: 0.28 },
});

function getAudioSettings() {
  try {
    const saved = JSON.parse(
      window.localStorage.getItem(AUDIO_SETTINGS_STORAGE_KEY),
    );

    return {
      muted: Boolean(saved?.muted),
      volume: Math.min(1, Math.max(0, Number(saved?.volume ?? 1))),
    };
  } catch {
    return { muted: false, volume: 1 };
  }
}

export function playGameSound(soundId, options = {}) {
  const sound = GAME_SOUNDS[soundId];

  if (!sound || typeof Audio === "undefined") {
    return null;
  }

  const cooldownMilliseconds = Math.max(
    0,
    Number(options.cooldownMilliseconds ?? 0),
  );
  const currentTime =
    typeof performance !== "undefined"
      ? performance.now()
      : Date.now();
  const lastPlayedAt = soundCooldowns.get(soundId) ?? -Infinity;

  if (
    cooldownMilliseconds > 0 &&
    currentTime - lastPlayedAt < cooldownMilliseconds
  ) {
    return null;
  }
  soundCooldowns.set(soundId, currentTime);

  const settings = getAudioSettings();
  const audio = new Audio(sound.source);
  audio.loop = options.loop ?? sound.loop ?? false;
  audio.lagosBaseVolume = options.volume ?? sound.volume;
  audio.volume = settings.muted
    ? 0
    : Math.min(
        MAXIMUM_OUTPUT_VOLUME,
        audio.lagosBaseVolume * settings.volume,
      );
  audio.play().catch(() => {});
  return audio;
}

export function playGameSoundSequence(
  soundIds,
  { gapMilliseconds = 260 } = {},
) {
  if (!Array.isArray(soundIds) || typeof window === "undefined") {
    return;
  }

  soundIds.forEach((soundId, index) => {
    window.setTimeout(() => {
      playGameSound(soundId, { loop: false });
    }, index * gapMilliseconds);
  });
}

export function installGameUiSounds() {
  if (typeof document === "undefined") {
    return () => {};
  }

  const playButtonClick = (event) => {
    const button = event.target.closest("button");

    if (button && !button.disabled) {
      playGameSound("buttonClick");
    }
  };

  document.addEventListener("pointerdown", playButtonClick);
  return () => {
    document.removeEventListener("pointerdown", playButtonClick);
  };
}
