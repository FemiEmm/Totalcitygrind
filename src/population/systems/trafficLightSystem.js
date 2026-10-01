export const TRAFFIC_SIGNAL = Object.freeze({
  RED: "red",
  YELLOW: "yellow",
  GREEN: "green",
});

function normaliseCycleTime(value, cycleLength) {
  return ((value % cycleLength) + cycleLength) % cycleLength;
}

export function createTrafficLightState() {
  return {
    elapsedSeconds: 0,
  };
}

export function updateTrafficLights(state, deltaSeconds) {
  state.elapsedSeconds += Math.max(0, deltaSeconds);
}

function getTrafficLightTimings(light, config) {
  return {
    horizontalGreenSeconds:
      light?.horizontalGreenSeconds ?? config.horizontalGreenSeconds,
    verticalGreenSeconds:
      light?.verticalGreenSeconds ?? config.verticalGreenSeconds,
    yellowSeconds:
      light?.yellowSeconds ?? config.yellowSeconds,
    allRedSeconds:
      light?.allRedSeconds ?? config.allRedSeconds,
  };
}

export function getTrafficLightCycleLength(config, light = null) {
  const timings = getTrafficLightTimings(light, config);

  return (
    timings.horizontalGreenSeconds +
    timings.yellowSeconds +
    timings.allRedSeconds +
    timings.verticalGreenSeconds +
    timings.yellowSeconds +
    timings.allRedSeconds
  );
}

export function getTrafficLightPhase(
  light,
  state,
  config,
) {
  const timings = getTrafficLightTimings(light, config);
  const cycleLength = getTrafficLightCycleLength(config, light);
  const cycleTime = normaliseCycleTime(
    state.elapsedSeconds + (light.cycleOffsetSeconds ?? 0),
    cycleLength,
  );

  const horizontalGreenEnd = timings.horizontalGreenSeconds;
  const horizontalYellowEnd =
    horizontalGreenEnd + timings.yellowSeconds;
  const firstAllRedEnd =
    horizontalYellowEnd + timings.allRedSeconds;
  const verticalGreenEnd =
    firstAllRedEnd + timings.verticalGreenSeconds;
  const verticalYellowEnd =
    verticalGreenEnd + timings.yellowSeconds;

  if (cycleTime < horizontalGreenEnd) {
    return {
      id: "horizontal-green",
      horizontal: TRAFFIC_SIGNAL.GREEN,
      vertical: TRAFFIC_SIGNAL.RED,
    };
  }

  if (cycleTime < horizontalYellowEnd) {
    return {
      id: "horizontal-yellow",
      horizontal: TRAFFIC_SIGNAL.YELLOW,
      vertical: TRAFFIC_SIGNAL.RED,
    };
  }

  if (cycleTime < firstAllRedEnd) {
    return {
      id: "all-red-after-horizontal",
      horizontal: TRAFFIC_SIGNAL.RED,
      vertical: TRAFFIC_SIGNAL.RED,
    };
  }

  if (cycleTime < verticalGreenEnd) {
    return {
      id: "vertical-green",
      horizontal: TRAFFIC_SIGNAL.RED,
      vertical: TRAFFIC_SIGNAL.GREEN,
    };
  }

  if (cycleTime < verticalYellowEnd) {
    return {
      id: "vertical-yellow",
      horizontal: TRAFFIC_SIGNAL.RED,
      vertical: TRAFFIC_SIGNAL.YELLOW,
    };
  }

  return {
    id: "all-red-after-vertical",
    horizontal: TRAFFIC_SIGNAL.RED,
    vertical: TRAFFIC_SIGNAL.RED,
  };
}

export function getTrafficLightSignal(
  light,
  approach,
  state,
  config,
) {
  const phase = getTrafficLightPhase(light, state, config);
  return phase[approach.axis] ?? TRAFFIC_SIGNAL.RED;
}
