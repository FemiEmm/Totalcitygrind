import { reactive } from "vue";

const HUD_PREFERENCES_STORAGE_KEY =
  "lagos-experience-hud-preferences";
const HUD_PREFERENCES_VERSION_KEY =
  "lagos-experience-hud-preferences-version";
const HUD_PREFERENCES_VERSION = 2;

const defaults = Object.freeze({
  energyBar: true,
  vehicleDashboard: true,
  passengerOccupancy: false,
  routeGuide: true,
  servicePrompts: true,
  feedback: true,
});

function loadPreferences() {
  if (typeof window === "undefined") {
    return { ...defaults };
  }

  try {
    const savedPreferences = JSON.parse(
      window.localStorage.getItem(
        HUD_PREFERENCES_STORAGE_KEY,
      ),
    );
    const savedVersion = Number(
      window.localStorage.getItem(
        HUD_PREFERENCES_VERSION_KEY,
      ) ?? 0,
    );
    const preferences = {
      ...defaults,
      ...savedPreferences,
    };

    // Version 2 removes the occupancy panel from the default driving layout.
    // Apply that cleaner default once, while retaining every other HUD choice.
    if (savedVersion < HUD_PREFERENCES_VERSION) {
      preferences.passengerOccupancy = false;
      window.localStorage.setItem(
        HUD_PREFERENCES_STORAGE_KEY,
        JSON.stringify(preferences),
      );
      window.localStorage.setItem(
        HUD_PREFERENCES_VERSION_KEY,
        String(HUD_PREFERENCES_VERSION),
      );
    }

    return preferences;
  } catch {
    return { ...defaults };
  }
}

export const hudPreferences = reactive(loadPreferences());

export function setHudPreference(preference, visible) {
  if (!(preference in defaults)) {
    return;
  }

  hudPreferences[preference] = Boolean(visible);

  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      HUD_PREFERENCES_STORAGE_KEY,
      JSON.stringify(hudPreferences),
    );
  }
}
