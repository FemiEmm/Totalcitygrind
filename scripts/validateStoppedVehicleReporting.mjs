import {
  STOPPED_VEHICLE_REPORT_CONFIG,
} from "../src/traffic/stoppedVehicleReports/data/stoppedVehicleReportConfig.js";
import {
  createStoppedVehicleReportState,
  getStoppedVehicleRecoveryCandidates,
  updateStoppedVehicleReports,
} from "../src/traffic/stoppedVehicleReports/systems/stoppedVehicleReportSystem.js";

function makeVehicle(id, overrides = {}) {
  return {
    id,
    typeId: "private-car",
    x: 100,
    y: 100,
    pointIndex: 1,
    speed: 0,
    blocked: true,
    waitingForLeader: false,
    blockingVehicleId: null,
    waitingAtTrafficLight: false,
    waitingAtTerminal: false,
    waitingAtBusStop: false,
    waitingAtYield: false,
    waitingAtMerge: false,
    waitingForMergeIntent: false,
    waitingForTowReservation: false,
    waitingForPrivateCitizenMerge: false,
    waitingForPrivateCitizenMergeReservation: false,
    waitingAtPrivateCitizenStop: false,
    waitingAtPrivateCitizenStart: false,
    blockedByPlayer: false,
    busStopDwellRemaining: 0,
    terminalLayoverRemainingMinutes: 0,
    hardBlockedSeconds: 10,
    width: 34,
    length: 58,
    ...overrides,
  };
}

function observeFor(reportState, vehicles, start, minutes) {
  updateStoppedVehicleReports({
    state: reportState,
    vehicles,
    absoluteGameMinute: start,
  });
  updateStoppedVehicleReports({
    state: reportState,
    vehicles,
    absoluteGameMinute: start + minutes,
  });
}

const errors = [];

// A genuinely stationary BRT must be reported.
{
  const state = createStoppedVehicleReportState();
  const brt = makeVehicle("stuck-brt", {
    typeId: "brt",
    length: 180,
  });
  observeFor(
    state,
    [brt],
    100,
    STOPPED_VEHICLE_REPORT_CONFIG.minimumStationaryGameMinutes + 1,
  );
  const candidates = getStoppedVehicleRecoveryCandidates({
    reportState: state,
    vehicles: [brt],
  });

  if (candidates[0]?.id !== brt.id) {
    errors.push("Stationary BRT was not reported");
  }
}

// A BRT on its declared terminal layover must never be reported.
{
  const state = createStoppedVehicleReportState();
  const brt = makeVehicle("layover-brt", {
    typeId: "brt",
    waitingAtTerminal: true,
    terminalLayoverRemainingMinutes: 30,
  });
  observeFor(state, [brt], 200, 120);
  const candidates = getStoppedVehicleRecoveryCandidates({
    reportState: state,
    vehicles: [brt],
  });

  if (candidates.length !== 0) {
    errors.push("Legitimate BRT terminal layover was reported");
  }
}

// A queue behind a red-light vehicle must not be reported.
{
  const state = createStoppedVehicleReportState();
  const redLightRoot = makeVehicle("red-root", {
    waitingAtTrafficLight: true,
  });
  const follower = makeVehicle("queue-follower", {
    waitingForLeader: true,
    blockingVehicleId: redLightRoot.id,
  });
  observeFor(state, [redLightRoot, follower], 300, 120);
  const candidates = getStoppedVehicleRecoveryCandidates({
    reportState: state,
    vehicles: [redLightRoot, follower],
  });

  if (candidates.length !== 0) {
    errors.push("Legitimate red-light queue was reported");
  }
}

// A collision cycle must produce one recovery root.
{
  const state = createStoppedVehicleReportState();
  const brt = makeVehicle("cycle-brt", {
    typeId: "brt",
    length: 180,
    waitingForLeader: true,
    blockingVehicleId: "cycle-car",
    hardBlockedSeconds: 20,
  });
  const car = makeVehicle("cycle-car", {
    waitingForLeader: true,
    blockingVehicleId: brt.id,
    hardBlockedSeconds: 0,
  });
  observeFor(state, [brt, car], 400, 60);
  const candidates = getStoppedVehicleRecoveryCandidates({
    reportState: state,
    vehicles: [brt, car],
  });

  if (
    candidates.length !== 1 ||
    candidates[0].id !== brt.id
  ) {
    errors.push("Collision cycle did not select the hard-blocked BRT");
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(
  "PASS: stopped BRTs are reported, planned stops and legal queues are ignored, and collision cycles select one recovery root.",
);
