import {
  STOPPED_VEHICLE_REPORT_CONFIG,
} from "../data/stoppedVehicleReportConfig.js";

function getPlannedStopReason(vehicle) {
  if (vehicle.beingTowed) {
    return "BEING TOWED";
  }

  if (vehicle.towAssigned) {
    return "TOW ASSIGNED";
  }

  if (vehicle.blockedByPlayer) {
    return "PLAYER BLOCKING";
  }

  if (vehicle.waitingAtTrafficLight) {
    return "TRAFFIC LIGHT";
  }

  if (vehicle.waitingAtTerminal) {
    return "TERMINAL LAYOVER";
  }

  if (
    vehicle.waitingAtBusStop ||
    (vehicle.busStopDwellRemaining ?? 0) > 0
  ) {
    return "BUS STOP";
  }

  if ((vehicle.terminalLayoverRemainingMinutes ?? 0) > 0) {
    return "TERMINAL LAYOVER";
  }

  if (
    vehicle.waitingAtPrivateCitizenStop ||
    vehicle.waitingAtPrivateCitizenStart ||
    vehicle.waitingForPrivateCitizenMerge ||
    vehicle.waitingForPrivateCitizenMergeReservation
  ) {
    return "PRIVATE CITIZEN CONTROL";
  }

  if (
    vehicle.waitingAtYield ||
    vehicle.waitingAtMerge ||
    vehicle.waitingForMergeIntent
  ) {
    return "LEGAL MERGE/YIELD";
  }

  if (vehicle.waitingForTowReservation) {
    return "TOW ROUTE RESERVATION";
  }

  return null;
}

function writeVehicleDebugStatus(vehicle, report) {
  vehicle.towStationaryGameMinutes =
    report.stationaryGameMinutes ?? 0;
  vehicle.towReportState = report.state ?? "MOVING";
  vehicle.towReportReason = report.reason ?? null;
}

function getDistanceToRouteTarget(vehicle) {
  const target = vehicle.route?.points?.[vehicle.pointIndex];

  if (!target) {
    return 0;
  }

  return Math.hypot(
    target.x - vehicle.x,
    target.y - vehicle.y,
  );
}

export function createStoppedVehicleReportState() {
  return {
    reportsByVehicleId: new Map(),
    lastAbsoluteGameMinute: null,
  };
}

export function updateStoppedVehicleReports({
  state,
  vehicles,
  absoluteGameMinute,
  config = STOPPED_VEHICLE_REPORT_CONFIG,
}) {
  if (!Number.isFinite(absoluteGameMinute)) {
    return;
  }

  const previousGameMinute = state.lastAbsoluteGameMinute;
  const elapsedGameMinutes = Number.isFinite(previousGameMinute)
    ? Math.max(0, absoluteGameMinute - previousGameMinute)
    : 0;

  state.lastAbsoluteGameMinute = absoluteGameMinute;

  const activeIds = new Set();

  vehicles.forEach((vehicle) => {
    activeIds.add(vehicle.id);

    let report = state.reportsByVehicleId.get(vehicle.id);

    if (!report) {
      report = {
        anchorX: vehicle.x,
        anchorY: vehicle.y,
        anchorPointIndex: vehicle.pointIndex,
        anchorTargetDistance: getDistanceToRouteTarget(vehicle),
        stationaryGameMinutes: 0,
        state: "WATCHING",
        reason: null,
      };
      state.reportsByVehicleId.set(vehicle.id, report);
    }

    const plannedStopReason = getPlannedStopReason(vehicle);
    const routeAdvanced =
      report.anchorPointIndex !== vehicle.pointIndex;
    const movedDistance = Math.hypot(
      vehicle.x - report.anchorX,
      vehicle.y - report.anchorY,
    );
    const targetDistance = getDistanceToRouteTarget(vehicle);
    const madeForwardRouteProgress =
      Number.isFinite(report.anchorTargetDistance) &&
      report.anchorTargetDistance - targetDistance >=
        config.movementResetDistance;
    const madeProgress =
      routeAdvanced ||
      (
        movedDistance >= config.movementResetDistance &&
        madeForwardRouteProgress
      );

    if (plannedStopReason) {
      report.anchorX = vehicle.x;
      report.anchorY = vehicle.y;
      report.anchorPointIndex = vehicle.pointIndex;
      report.anchorTargetDistance = targetDistance;
      report.stationaryGameMinutes = 0;
      report.state = "PLANNED STOP";
      report.reason = plannedStopReason;
      writeVehicleDebugStatus(vehicle, report);
      return;
    }

    if (madeProgress) {
      report.anchorX = vehicle.x;
      report.anchorY = vehicle.y;
      report.anchorPointIndex = vehicle.pointIndex;
      report.anchorTargetDistance = targetDistance;
      report.stationaryGameMinutes = 0;
      report.state = "MOVING";
      report.reason = null;
      writeVehicleDebugStatus(vehicle, report);
      return;
    }

    report.stationaryGameMinutes += elapsedGameMinutes;
    report.state =
      report.stationaryGameMinutes >=
      config.minimumStationaryGameMinutes
        ? "SUSPECTED STUCK"
        : "WATCHING";
    report.reason = vehicle.blockingVehicleId
      ? `BLOCKED BY ${vehicle.blockingVehicleId}`
      : vehicle.waitingForLeader
        ? "UNRESOLVED LEADER QUEUE"
        : vehicle.blocked
          ? "NO ROUTE PROGRESS"
          : "STOPPED WITHOUT PROGRESS";

    writeVehicleDebugStatus(vehicle, report);
  });

  for (const vehicleId of state.reportsByVehicleId.keys()) {
    if (!activeIds.has(vehicleId)) {
      state.reportsByVehicleId.delete(vehicleId);
    }
  }
}

function candidateScore(vehicle, report) {
  const hardCollisionBonus =
    (vehicle.hardBlockedSeconds ?? 0) > 0 ? 100000 : 0;
  const noLeaderBonus =
    !vehicle.waitingForLeader ? 10000 : 0;
  const largeVehicleBonus =
    Math.max(vehicle.length ?? 0, vehicle.width ?? 0);

  return (
    hardCollisionBonus +
    noLeaderBonus +
    (report.stationaryGameMinutes ?? 0) * 100 +
    largeVehicleBonus
  );
}

function chooseCycleRoot(cycleVehicles, reportState) {
  return cycleVehicles
    .slice()
    .sort((first, second) => {
      return (
        candidateScore(
          second,
          reportState.reportsByVehicleId.get(second.id),
        ) -
        candidateScore(
          first,
          reportState.reportsByVehicleId.get(first.id),
        )
      );
    })[0] ?? null;
}

function resolveRecoveryRoot({
  startingVehicle,
  vehiclesById,
  reportState,
  config,
}) {
  const visited = [];
  const visitedIndexes = new Map();
  let current = startingVehicle;

  for (
    let depth = 0;
    depth < config.maximumBlockerDepth;
    depth += 1
  ) {
    const report =
      reportState.reportsByVehicleId.get(current.id);

    if (
      !report ||
      report.stationaryGameMinutes <
        config.minimumStationaryGameMinutes
    ) {
      return null;
    }

    const plannedStopReason = getPlannedStopReason(current);
    if (plannedStopReason) {
      return null;
    }

    if (visitedIndexes.has(current.id)) {
      const cycleStart = visitedIndexes.get(current.id);
      return chooseCycleRoot(
        visited.slice(cycleStart),
        reportState,
      );
    }

    visitedIndexes.set(current.id, visited.length);
    visited.push(current);

    const blockerId = current.blockingVehicleId;

    if (!blockerId) {
      // Waiting for an unnamed leader is treated as an unresolved queue,
      // not a tow report. This protects legitimate queues.
      if (current.waitingForLeader) {
        return null;
      }

      return current;
    }

    const blocker = vehiclesById.get(blockerId);

    if (!blocker) {
      // A leader can leave the active simulation between the traffic update
      // and the recovery scan. Do not freeze and tow the follower for that
      // one-frame stale reference; traffic will clear the leader state on
      // its next update and the follower can resume normally.
      return null;
    }

    current = blocker;
  }

  return chooseCycleRoot(visited, reportState);
}

export function getStoppedVehicleRecoveryCandidates({
  reportState,
  vehicles,
  assignedVehicleIds = new Set(),
  config = STOPPED_VEHICLE_REPORT_CONFIG,
}) {
  const vehiclesById = new Map(
    vehicles.map((vehicle) => [vehicle.id, vehicle]),
  );
  const candidatesById = new Map();

  vehicles.forEach((vehicle) => {
    const report =
      reportState.reportsByVehicleId.get(vehicle.id);

    if (
      !report ||
      assignedVehicleIds.has(vehicle.id) ||
      report.stationaryGameMinutes <
        config.minimumStationaryGameMinutes
    ) {
      return;
    }

    const root = resolveRecoveryRoot({
      startingVehicle: vehicle,
      vehiclesById,
      reportState,
      config,
    });

    if (
      !root ||
      assignedVehicleIds.has(root.id) ||
      root.beingTowed ||
      root.towAssigned
    ) {
      return;
    }

    const rootReport =
      reportState.reportsByVehicleId.get(root.id);

    rootReport.state = "REPORTED";
    rootReport.reason =
      root.blockingVehicleId
        ? `COLLISION CHAIN ROOT: ${root.blockingVehicleId}`
        : "NO LEGITIMATE STOP REASON";
    writeVehicleDebugStatus(root, rootReport);

    candidatesById.set(root.id, root);
  });

  return [...candidatesById.values()].sort(
    (first, second) => {
      const firstReport =
        reportState.reportsByVehicleId.get(first.id);
      const secondReport =
        reportState.reportsByVehicleId.get(second.id);

      return (
        (secondReport?.stationaryGameMinutes ?? 0) -
        (firstReport?.stationaryGameMinutes ?? 0)
      );
    },
  );
}

export function markStoppedVehicleReportAssigned(
  reportState,
  vehicle,
) {
  const report =
    reportState.reportsByVehicleId.get(vehicle.id);

  if (!report) {
    return;
  }

  report.state = "TOW ASSIGNED";
  report.reason = "RECOVERY TRUCK DISPATCHED";
  writeVehicleDebugStatus(vehicle, report);
}

export function removeStoppedVehicleReport(
  reportState,
  vehicleId,
) {
  reportState.reportsByVehicleId.delete(vehicleId);
}
