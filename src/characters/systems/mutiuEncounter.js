const MUTIU_INTRO_STORAGE_KEY =
  "lagos-experience-character-intro-mutiu-v1";
const MUTIU_INVITE_STORAGE_KEY =
  "lagos-experience-mutiu-race-invites-v1";

function readInviteHistory() {
  if (typeof window === "undefined") return {};

  try {
    return JSON.parse(
      window.localStorage.getItem(MUTIU_INVITE_STORAGE_KEY) || "{}",
    );
  } catch {
    return {};
  }
}

function writeInviteHistory(history) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    MUTIU_INVITE_STORAGE_KEY,
    JSON.stringify(history),
  );
}

export function isMutiuGuaranteedCallWindow(day, minuteOfDay) {
  // Day 1 is Monday: indices 4 and 5 are Friday and Saturday.
  const weekday = ((Math.max(1, Math.floor(Number(day) || 1)) - 1) % 7 + 7) % 7;
  const minute = ((Number(minuteOfDay) % 1440) + 1440) % 1440;
  return (weekday === 4 || weekday === 5) && minute >= 0 && minute < 2 * 60;
}
export function raceOfferedOnDay(day) {
  // Stable per-day roll: invitations happen on roughly three nights out of five.
  // A 63% chance is 50% more frequent than the previous 42% rate.
  const roll = ((day * 9301 + 49297) % 233280) / 233280;
  return roll < 0.63;
}

export function hasCompletedMutiuRaceOnDay(day) {
  return readInviteHistory()[String(day)] === "completed";
}

export function markMutiuRaceCompleted(day) {
  const history = readInviteHistory();
  history[String(day)] = "completed";
  writeInviteHistory(history);
}

export function createMutiuEncounterState() {
  return {
    mode: null,
    introPlaySeconds: 0,
  };
}

export function updateMutiuEncounter({
  state,
  day,
  minuteOfDay,
  deltaSeconds,
  blocked,
}) {
  if (state.mode || blocked) return false;

  if (!hasSeenMutiuIntroduction()) {
    state.introPlaySeconds += Math.max(0, deltaSeconds);
    if (state.introPlaySeconds >= 10) {
      state.mode = "introduction";
      return true;
    }
    return false;
  }

  const minute =
    ((minuteOfDay % (24 * 60)) + 24 * 60) % (24 * 60);
  const invitationWindow =
    minute >= 21 * 60 && minute < 23 * 60;

  if (!invitationWindow || !raceOfferedOnDay(day)) {
    return false;
  }

  const history = readInviteHistory();
  if (history[String(day)]) return false;

  history[String(day)] = "shown";
  writeInviteHistory(history);
  state.mode = "incoming-call";
  return true;
}

export function closeMutiuIntroduction(state) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(MUTIU_INTRO_STORAGE_KEY, "yes");
  }
  state.mode = null;
}

export function resolveMutiuInvitation(state, accepted, day) {
  const history = readInviteHistory();
  history[String(day)] = accepted ? "accepted" : "declined";
  writeInviteHistory(history);
  state.mode = null;
}

export function hasSeenMutiuIntroduction() {
  return (
    typeof window !== "undefined" &&
    window.localStorage.getItem(MUTIU_INTRO_STORAGE_KEY) === "yes"
  );
}

