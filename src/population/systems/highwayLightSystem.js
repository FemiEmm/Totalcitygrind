export const HIGHWAY_SIGNAL = Object.freeze({
  RED: "red",
  YELLOW: "yellow",
  GREEN: "green",
});

function normaliseCycleTime(value, cycleLength) {
  return ((value % cycleLength) + cycleLength) % cycleLength;
}

export function createHighwayLightState() {
  return { elapsedSeconds: 0 };
}

export function updateHighwayLights(state, deltaSeconds) {
  state.elapsedSeconds += Math.max(0, deltaSeconds);
}

export function getHighwayLightCycleLength(config) {
  return (
    config.highwayGreenSeconds +
    config.highwayYellowSeconds +
    config.clearanceAfterHighwaySeconds +
    config.mergeGreenSeconds +
    config.mergeYellowSeconds +
    config.clearanceBeforeHighwaySeconds
  );
}

export function getHighwayLightPhase(light, state, config) {
  const cycleTime = normaliseCycleTime(
    state.elapsedSeconds + (light.cycleOffsetSeconds ?? 0),
    getHighwayLightCycleLength(config),
  );

  const highwayGreenEnd = config.highwayGreenSeconds;
  const highwayYellowEnd = highwayGreenEnd + config.highwayYellowSeconds;
  const firstClearanceEnd = highwayYellowEnd + config.clearanceAfterHighwaySeconds;
  const mergeGreenEnd = firstClearanceEnd + config.mergeGreenSeconds;
  const mergeYellowEnd = mergeGreenEnd + config.mergeYellowSeconds;

  if (cycleTime < highwayGreenEnd) {
    return { id: "highway-green", highway: HIGHWAY_SIGNAL.GREEN, merge: HIGHWAY_SIGNAL.RED };
  }
  if (cycleTime < highwayYellowEnd) {
    return { id: "highway-yellow", highway: HIGHWAY_SIGNAL.YELLOW, merge: HIGHWAY_SIGNAL.RED };
  }
  if (cycleTime < firstClearanceEnd) {
    return { id: "all-red-after-highway", highway: HIGHWAY_SIGNAL.RED, merge: HIGHWAY_SIGNAL.RED };
  }
  if (cycleTime < mergeGreenEnd) {
    return { id: "merge-green", highway: HIGHWAY_SIGNAL.RED, merge: HIGHWAY_SIGNAL.GREEN };
  }
  if (cycleTime < mergeYellowEnd) {
    return { id: "merge-yellow", highway: HIGHWAY_SIGNAL.RED, merge: HIGHWAY_SIGNAL.YELLOW };
  }
  return { id: "clearance-before-highway", highway: HIGHWAY_SIGNAL.RED, merge: HIGHWAY_SIGNAL.RED };
}

export function getHighwayLightSignal(light, approach, state, config) {
  const phase = getHighwayLightPhase(light, state, config);
  return phase[approach.priority] ?? HIGHWAY_SIGNAL.RED;
}
