import { GRID_SIZE } from "../../../world/data/mapConstants.js";

export const STOPPED_VEHICLE_REPORT_CONFIG = Object.freeze({
  // A vehicle must make no meaningful route progress for this long before
  // it can be reported. Scheduled stops are excluded completely.
  minimumStationaryGameMinutes: 30,

  // Tow dispatch checks reports frequently. This is intentionally separate
  // from the old three-hour tow scan.
  scanIntervalGameMinutes: 6,

  // Small steering/collision corrections do not count as real progress.
  movementResetDistance: GRID_SIZE * 0.12,

  maximumBlockerDepth: 64,
});
