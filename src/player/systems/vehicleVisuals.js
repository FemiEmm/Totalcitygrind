// Render-only effects: never alter vehicle coordinates, speed or collision shapes.
export function drawVehicleGroundShadow(context, width, length) {
  context.save();
  // Layered contact shadows avoid a per-sprite blur pass on mobile GPUs.
  for (const [spread, opacity] of [[4, 0.08], [2, 0.13], [0, 0.22]]) {
    const w = width + spread * 2;
    const h = length + spread * 2;
    context.fillStyle = `rgba(0, 0, 0, ${opacity})`;
    context.beginPath();
    context.roundRect(-w / 2, -h / 2, w, h, Math.min(w, h) * 0.26);
    context.fill();
  }
  context.restore();
}

export function createDanfoBodyMotion() {
  return { time: 0, brakeAge: 1, wasBraking: false, offsetY: 0 };
}

export function updateDanfoBodyMotion(state, deltaSeconds, { enabled, engineOn, braking, speed = 0 }) {
  if (!enabled || !engineOn) {
    Object.assign(state, createDanfoBodyMotion());
    return;
  }
  // Half-speed visual clock preserves the same shake and braking amplitudes.
  const dt = Math.max(0, Math.min(deltaSeconds, 0.1)) * 0.5;
  state.time += dt;
  // One forward/rebound cycle per press, rather than repeated bouncing while held.
  if (braking && !state.wasBraking) state.brakeAge = 0;
  state.wasBraking = braking;
  state.brakeAge = Math.min(1, state.brakeAge + dt);
  const duration = 0.7;
  const brakeRock = state.brakeAge < duration
    ? -4 * Math.sin(2 * Math.PI * state.brakeAge / duration) * (1 - state.brakeAge / duration)
    : 0;
  const engineShake = Math.abs(speed) < 0.05
    ? 0.65 * Math.sin(state.time * Math.PI * 16) + 0.18 * Math.sin(state.time * Math.PI * 23)
    : 0;
  // Keep both the idle shake and braking rebound subtle.
  state.offsetY = (engineShake + brakeRock) * 0.5;
}
