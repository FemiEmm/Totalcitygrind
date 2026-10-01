function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function createDanfoRouteState() {
  return {
    status: "selecting",
    selectedRouteId: null,
    currentStopIndex: 0,
    stopHoldSeconds: 0,
    completedRouteId: null,
  };
}

export function selectDanfoRoute(routeState, routeId, routes) {
  const route = routes.find((item) => item.id === routeId);

  if (!route) {
    return false;
  }

  routeState.status = "active";
  routeState.selectedRouteId = route.id;
  routeState.currentStopIndex = 0;
  routeState.stopHoldSeconds = 0;
  routeState.completedRouteId = null;
  return true;
}

export function returnToRouteSelection(routeState) {
  routeState.status = "selecting";
  routeState.selectedRouteId = null;
  routeState.currentStopIndex = 0;
  routeState.stopHoldSeconds = 0;
  routeState.completedRouteId = null;
}

export function getSelectedRoute(routeState, routes) {
  return (
    routes.find((route) => route.id === routeState.selectedRouteId) ??
    null
  );
}

export function getStopById(stopId, busStops) {
  return busStops.find((stop) => stop.id === stopId) ?? null;
}

export function getCurrentRouteStop(routeState, routes, busStops) {
  const route = getSelectedRoute(routeState, routes);

  if (!route) {
    return null;
  }

  return getStopById(
    route.stopIds[routeState.currentStopIndex],
    busStops,
  );
}

export function getFollowingRouteStop(routeState, routes, busStops) {
  const route = getSelectedRoute(routeState, routes);

  if (!route) {
    return null;
  }

  return getStopById(
    route.stopIds[routeState.currentStopIndex + 1],
    busStops,
  );
}

export function getStopCentre(stop) {
  return {
    x: stop.x + stop.width / 2,
    y: stop.y + stop.height / 2,
  };
}

export function getDistanceToStop(vehicle, stop) {
  if (!stop) {
    return Number.POSITIVE_INFINITY;
  }

  const centre = getStopCentre(stop);
  return Math.hypot(vehicle.x - centre.x, vehicle.y - centre.y);
}

export function isInsideStopZone(vehicle, stop, halfSize) {
  if (!stop) {
    return false;
  }

  const centre = getStopCentre(stop);

  return (
    Math.abs(vehicle.x - centre.x) <= halfSize &&
    Math.abs(vehicle.y - centre.y) <= halfSize
  );
}

export function updateDanfoRoute({
  routeState,
  routes,
  busStops,
  vehicle,
  speedKmh,
  deltaSeconds,
  config,
}) {
  if (routeState.status !== "active") {
    routeState.stopHoldSeconds = 0;
    return null;
  }

  const route = getSelectedRoute(routeState, routes);
  const stop = getCurrentRouteStop(routeState, routes, busStops);

  if (!route || !stop) {
    return null;
  }

  const insideStop = isInsideStopZone(
    vehicle,
    stop,
    config.stopDetectionRadius,
  );

  const slowEnough = speedKmh <= config.maximumStopSpeedKmh;

  if (!insideStop || !slowEnough) {
    routeState.stopHoldSeconds = 0;
    return null;
  }

  routeState.stopHoldSeconds = clamp(
    routeState.stopHoldSeconds + deltaSeconds,
    0,
    config.requiredStopSeconds,
  );

  if (routeState.stopHoldSeconds < config.requiredStopSeconds) {
    return null;
  }

  const completedStop = stop;
  const completedStopIndex = routeState.currentStopIndex;
  routeState.currentStopIndex += 1;
  routeState.stopHoldSeconds = 0;

  if (routeState.currentStopIndex >= route.stopIds.length) {
    routeState.status = "complete";
    routeState.completedRouteId = route.id;

    return {
      type: "route-complete",
      route,
      stop: completedStop,
      stopIndex: completedStopIndex,
    };
  }

  return {
    type: "stop-complete",
    route,
    stop: completedStop,
    stopIndex: completedStopIndex,
  };
}

export function getStopHoldProgress(routeState, config) {
  if (routeState.status !== "active") {
    return 0;
  }

  return clamp(
    routeState.stopHoldSeconds / config.requiredStopSeconds,
    0,
    1,
  );
}
