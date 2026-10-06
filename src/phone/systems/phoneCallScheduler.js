import {
  BANK_AD_CALL_IDS,
  getPhoneCallVoice,
  SISTER_IDLE_CALL_IDS,
} from "../data/phoneCallVoices.js";

const IDLE_BEFORE_RANDOM_CALL_SECONDS = 18;
const MINIMUM_RANDOM_CALL_COOLDOWN_SECONDS = 150;
const RANDOM_CALL_COOLDOWN_RANGE_SECONDS = 150;
const DAILY_RANDOM_CALL_STORAGE_KEY = "total-city-grind-random-call-day";

function readLastRandomCallDay() {
  if (typeof window === "undefined") return null;
  const value = Number(window.localStorage.getItem(DAILY_RANDOM_CALL_STORAGE_KEY));
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : null;
}

function writeLastRandomCallDay(day) {
  if (typeof window !== "undefined") window.localStorage.setItem(DAILY_RANDOM_CALL_STORAGE_KEY, String(day));
}

export function createPhoneCallSchedulerState() {
  return {
    activeCall: null,
    pendingCallIds: [],
    idleSeconds: 0,
    cooldownSeconds: 75,
    sequence: 0,
    lastRandomCallId: null,
    lastRandomCallDay: readLastRandomCallDay(),
  };
}

function activateCall(state, callId) {
  const definition = getPhoneCallVoice(callId);
  if (!definition) return false;

  state.sequence += 1;
  state.activeCall = {
    ...definition,
    instanceId: `${definition.id}-${state.sequence}`,
  };
  return true;
}

export function queuePhoneCall(
  state,
  callId,
  { priority = false } = {},
) {
  if (!getPhoneCallVoice(callId)) return false;

  if (!state.activeCall) {
    return activateCall(state, callId);
  }

  if (
    state.activeCall.id === callId ||
    state.pendingCallIds.includes(callId)
  ) {
    return false;
  }

  if (priority) {
    state.pendingCallIds.unshift(callId);
  } else {
    state.pendingCallIds.push(callId);
  }
  return true;
}

export function resolvePhoneCall(state, instanceId) {
  if (
    instanceId &&
    state.activeCall?.instanceId !== instanceId
  ) {
    return false;
  }

  state.activeCall = null;
  const nextCallId = state.pendingCallIds.shift();
  if (nextCallId) {
    activateCall(state, nextCallId);
  }
  return true;
}

function chooseRandomCallId(state, context, random) {
  const candidates = [...SISTER_IDLE_CALL_IDS];
  const hasOutstandingLoan =
    Number(context.quickLoanBalance) > 0 ||
    Number(context.bankLoanBalance) > 0;

  if (hasOutstandingLoan) {
    candidates.push("bank-loan-reminder");
  } else {
    candidates.push(...BANK_AD_CALL_IDS);
  }

  if (
    context.currentJob === "brt" ||
    context.motoEaziActive
  ) {
    candidates.push("car-owner-other-work");
  }

  const freshCandidates = candidates.filter((callId) => {
    return callId !== state.lastRandomCallId;
  });
  const pool =
    freshCandidates.length > 0 ? freshCandidates : candidates;
  return pool[Math.floor(random() * pool.length)] ?? null;
}

export function updatePhoneCallScheduler({
  state,
  deltaSeconds,
  playerSpeed,
  engineStarted,
  blocked,
  context,
  random = Math.random,
}) {
  const currentDay = Math.max(1, Math.floor(Number(context.currentDay) || 1));
  if (state.lastRandomCallDay === currentDay) {
    state.idleSeconds = 0;
    return false;
  }

  state.cooldownSeconds = Math.max(
    0,
    state.cooldownSeconds - Math.max(0, deltaSeconds),
  );

  if (
    blocked ||
    state.activeCall ||
    !engineStarted ||
    Math.abs(Number(playerSpeed) || 0) > 0.08
  ) {
    state.idleSeconds = 0;
    return false;
  }

  state.idleSeconds += Math.max(0, deltaSeconds);
  if (
    state.idleSeconds < IDLE_BEFORE_RANDOM_CALL_SECONDS ||
    state.cooldownSeconds > 0
  ) {
    return false;
  }

  const callId = chooseRandomCallId(state, context, random);
  if (!callId || !activateCall(state, callId)) {
    return false;
  }

  state.lastRandomCallDay = currentDay;
  writeLastRandomCallDay(currentDay);
  state.lastRandomCallId = callId;
  state.idleSeconds = 0;
  state.cooldownSeconds =
    MINIMUM_RANDOM_CALL_COOLDOWN_SECONDS +
    random() * RANDOM_CALL_COOLDOWN_RANGE_SECONDS;
  return true;
}
