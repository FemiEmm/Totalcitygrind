import { COASTAL_CIRCUIT } from "../data/raceCircuit.js";

export function createRaceState() {
  return {
    status: "idle",
    elapsedSeconds: 0,
    checkpointIndex: 0,
    bestTime: null,
    completedRuns: 0,
    lastResult: null,
  };
}

export function restoreRaceState(state, savedState) {
  if (!savedState) return;
  state.status = savedState.status === "active" ? "idle" : (savedState.status ?? "idle");
  state.elapsedSeconds = 0;
  state.checkpointIndex = 0;
  state.bestTime = Number(savedState.bestTime) || null;
  state.completedRuns = Number(savedState.completedRuns) || 0;
  state.lastResult = savedState.lastResult ? { ...savedState.lastResult } : null;
}

export function startRace(state) {
  if (state.status === "active") return false;
  state.status = "active";
  state.elapsedSeconds = 0;
  state.checkpointIndex = 0;
  state.lastResult = null;
  return true;
}

function pointInsideZone(point, zone) {
  return (
    point.x >= zone.x &&
    point.x <= zone.x + zone.width &&
    point.y >= zone.y &&
    point.y <= zone.y + zone.height
  );
}

function getRaceTier(elapsedSeconds) {
  if (elapsedSeconds <= COASTAL_CIRCUIT.firstPlaceTime) return "gold";
  if (elapsedSeconds <= COASTAL_CIRCUIT.secondPlaceTime) return "silver";
  if (elapsedSeconds <= COASTAL_CIRCUIT.completionTime) return "bronze";
  return "finish";
}

export function updateRace(state, playerPosition, deltaSeconds) {
  if (state.status !== "active") return null;
  state.elapsedSeconds += Math.max(0, deltaSeconds);
  const checkpoint = COASTAL_CIRCUIT.checkpoints[state.checkpointIndex];
  if (!checkpoint || !pointInsideZone(playerPosition, checkpoint)) return null;

  state.checkpointIndex += 1;
  if (state.checkpointIndex < COASTAL_CIRCUIT.checkpoints.length) {
    return { type: "checkpoint", checkpointIndex: state.checkpointIndex };
  }

  const time = Math.round(state.elapsedSeconds * 100) / 100;
  const tier = getRaceTier(time);
  const firstCompletion = state.completedRuns === 0;
  const baseReward = COASTAL_CIRCUIT.rewards[tier];
  const reward = firstCompletion ? baseReward : Math.round(baseReward * 0.25);
  state.status = "complete";
  state.completedRuns += 1;
  state.bestTime = state.bestTime === null ? time : Math.min(state.bestTime, time);
  state.lastResult = { time, tier, reward, firstCompletion };
  return { type: "complete", ...state.lastResult };
}

export function cancelRace(state) {
  state.status = "idle";
  state.elapsedSeconds = 0;
  state.checkpointIndex = 0;
}
