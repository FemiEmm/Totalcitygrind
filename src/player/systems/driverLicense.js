const LICENCE_GRADES = Object.freeze(["A", "B", "C", "D", "E"]);
const GRADE_SCORE = Object.freeze({ A: 95, B: 80, C: 65, D: 50, E: 30 });

export const DRIVER_LICENCE_MINIMUM_BRT_RATING = "C";
export const DRIVER_LICENCE_TEST_FEE = 1000;

export function getDriverLicenceRating(score) {
  const safeScore = Math.max(0, Math.min(100, Number(score) || 0));
  if (safeScore >= 90) return "A";
  if (safeScore >= 75) return "B";
  if (safeScore >= 60) return "C";
  if (safeScore >= 40) return "D";
  return "E";
}

export function canRatingDriveBrt(rating) {
  return ["A", "B", "C"].includes(String(rating ?? "").toUpperCase());
}

export function createDriverLicenceState() {
  return {
    score: 80,
    rating: "B",
    offenceCount: 0,
    testStatus: "idle",
    testRouteId: null,
    testStopIds: [],
    testStopIndex: 0,
    testHadCollision: false,
    testHadTrafficViolation: false,
    lastTestResult: null,
    navigationMode: "none",
  };
}

export function restoreDriverLicenceState(state, savedState) {
  Object.assign(state, createDriverLicenceState(), savedState ?? {});
  state.score = Math.max(0, Math.min(100, Number(state.score) || 80));
  state.rating = LICENCE_GRADES.includes(state.rating) ? state.rating : getDriverLicenceRating(state.score);
  state.offenceCount = Math.max(0, Math.floor(Number(state.offenceCount) || 0)) % 10;
  state.testStopIds = Array.isArray(state.testStopIds) ? state.testStopIds : [];
}

export function prepareDriverLicenceSchoolNavigation(state) {
  if (state.testStatus === "active") return false;
  state.navigationMode = "school";
  state.testStatus = "travelling-to-school";
  state.lastTestResult = null;
  return true;
}

export function beginDriverLicenceTest(state, route) {
  const checkpoints = route?.checkpoints ?? route;
  if (state.testStatus === "active" || !Array.isArray(checkpoints) || checkpoints.length !== 5) return false;
  state.testStatus = "active";
  state.testRouteId = route?.id ?? null;
  state.testStopIds = checkpoints.map((checkpoint) => checkpoint.id);
  state.testStopIndex = 0;
  state.testHadCollision = false;
  state.testHadTrafficViolation = false;
  state.lastTestResult = null;
  state.navigationMode = "checkpoint";
  return true;
}

function lowerRating(state) {
  const index = Math.max(0, LICENCE_GRADES.indexOf(state.rating));
  const rating = LICENCE_GRADES[Math.min(LICENCE_GRADES.length - 1, index + 1)];
  state.rating = rating;
  state.score = GRADE_SCORE[rating];
  return rating;
}

function raiseRating(state) {
  const index = Math.max(0, LICENCE_GRADES.indexOf(state.rating));
  const rating = LICENCE_GRADES[Math.max(0, index - 1)];
  state.rating = rating;
  state.score = GRADE_SCORE[rating];
  return rating;
}

function recordNormalOffence(state) {
  state.offenceCount += 1;
  if (state.offenceCount < 10) return false;
  state.offenceCount = 0;
  lowerRating(state);
  return true;
}

function failActiveTest(state, reason) {
  if (state.testStatus !== "active") return null;
  state.testStatus = "failed";
  state.lastTestResult = "failed";
  state.navigationMode = "school";
  return { complete: true, passed: false, reason, score: state.score, rating: state.rating };
}

export function recordDriverLicenceCollision(state) {
  if (state.testStatus === "active") {
    state.testHadCollision = true;
    return failActiveTest(state, "collision");
  }
  return { downgraded: recordNormalOffence(state) };
}

export function recordDriverLicenceTrafficViolation(state) {
  if (state.testStatus === "active") {
    state.testHadTrafficViolation = true;
    return failActiveTest(state, "traffic-violation");
  }
  return { downgraded: recordNormalOffence(state) };
}

export function advanceDriverLicenceTest(state) {
  if (state.testStatus !== "active") return null;
  state.testStopIndex += 1;
  if (state.testStopIndex < state.testStopIds.length) return { complete: false };
  const rating = raiseRating(state);
  state.testStatus = "passed";
  state.lastTestResult = "passed";
  state.navigationMode = "none";
  return { complete: true, passed: true, score: state.score, rating };
}

export function abandonDriverLicenceTest(state) {
  state.testStatus = "idle";
  state.testRouteId = null;
  state.testStopIds = [];
  state.testStopIndex = 0;
  state.navigationMode = "none";
}
