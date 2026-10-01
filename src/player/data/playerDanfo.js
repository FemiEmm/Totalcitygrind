const gears = [
  {
    label: "R",
    direction: -1,
    maxSpeed: 82,
    acceleration: 39,
  },
  {
    label: "N",
    direction: 0,
    maxSpeed: 0,
    acceleration: 0,
  },
  {
    label: "1",
    direction: 1,
    maxSpeed: 110,
    acceleration: 54,
  },
  {
    label: "2",
    direction: 1,
    maxSpeed: 205,
    acceleration: 46.5,
  },
  {
    label: "3",
    direction: 1,
    maxSpeed: 305,
    acceleration: 38.25,
  },
  {
    label: "4",
    direction: 1,
    maxSpeed: 400,
    acceleration: 30,
  },
  {
    label: "5",
    direction: 1,
    // 488.888... world units × 0.45 displays as exactly 220 km/h.
    maxSpeed: 220 / 0.45,
    acceleration: 23.25,
  },
];

export const PLAYER_DANFO = Object.freeze({
  id: "starter-danfo",
  transmission: "automatic",

  width: 40,
  length: 70,
  // Player Danfo was previously drawn at the canvas default of 1.22.
  // 1.342 is exactly 10% larger while leaving collision dimensions unchanged.
  spriteRenderScale: 1.342,
  colour: "#2878d0",
  outlineColour: "#111111",
  frontMarkerColour: "#ffffff",

  gears: Object.freeze(
    gears.map((gear) => Object.freeze(gear)),
  ),

  reverseGearIndex: 0,
  neutralGearIndex: 1,
  firstDriveGearIndex: 2,
  lastDriveGearIndex: 6,
  startingGearIndex: 2,
  automaticShiftDelay: 0.35,

  speedToKmh: 0.45,

  braking: 280,
  engineBraking: 90,
  rollingResistance: 52,
  neutralRollingResistance: 24,
  steeringSpeed: 2.4,

  collisionDamageMinimumSpeedKmh: 8,
  collisionDamageMaximumSpeedKmh: 117,
  collisionDamageMaximum: 30,
  collisionDamageCooldownSeconds: 0.8,
  collisionBounceDistance: 7,
  collisionResponseCooldownSeconds: 0.12,
});
