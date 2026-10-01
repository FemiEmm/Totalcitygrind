const SAMPLE_WINDOW_MS = 600;
const SLOW_FRAME_MS = 21;
const RECOVERY_FRAME_MS = 17.2;

export function createPerformanceMonitor() {
  return {
    frameCount: 0,
    frameTotalMs: 0,
    simulationTotalMs: 0,
    renderTotalMs: 0,
    lastSampleTime: 0,
    slowSampleCount: 0,
    recoverySampleCount: 0,
    adaptiveScale: 1,
    trafficScale: 1,
    fps: 60,
    frameMs: 16.7,
    simulationMs: 0,
    renderMs: 0,
    tileCacheMisses: 0,
  };
}

export function recordPerformanceFrame(
  monitor,
  {
    timestamp,
    frameMs,
    simulationMs,
    renderMs,
    adaptiveEnabled,
  },
) {
  monitor.frameCount += 1;
  monitor.frameTotalMs += frameMs;
  monitor.simulationTotalMs += simulationMs;
  monitor.renderTotalMs += renderMs;

  if (!monitor.lastSampleTime) {
    monitor.lastSampleTime = timestamp;
    return false;
  }

  if (timestamp - monitor.lastSampleTime < SAMPLE_WINDOW_MS) {
    return false;
  }

  const count = Math.max(1, monitor.frameCount);
  monitor.frameMs = monitor.frameTotalMs / count;
  monitor.simulationMs = monitor.simulationTotalMs / count;
  monitor.renderMs = monitor.renderTotalMs / count;
  monitor.fps = Math.min(240, 1000 / Math.max(1, monitor.frameMs));

  if (adaptiveEnabled) {
    if (monitor.frameMs > SLOW_FRAME_MS) {
      monitor.slowSampleCount += 1;
      monitor.recoverySampleCount = 0;
    } else if (monitor.frameMs < RECOVERY_FRAME_MS) {
      monitor.recoverySampleCount += 1;
      monitor.slowSampleCount = 0;
    } else {
      monitor.slowSampleCount = 0;
      monitor.recoverySampleCount = 0;
    }

    if (monitor.slowSampleCount >= 3) {
      monitor.adaptiveScale = Math.max(
        0.75,
        monitor.adaptiveScale - 0.1,
      );
      monitor.trafficScale = Math.max(
        0.68,
        monitor.trafficScale - 0.08,
      );
      monitor.slowSampleCount = 0;
    }

    if (monitor.recoverySampleCount >= 8) {
      monitor.adaptiveScale = Math.min(
        1,
        monitor.adaptiveScale + 0.05,
      );
      monitor.trafficScale = Math.min(
        1,
        monitor.trafficScale + 0.05,
      );
      monitor.recoverySampleCount = 0;
    }
  } else {
    monitor.adaptiveScale = 1;
    monitor.trafficScale = 1;
    monitor.slowSampleCount = 0;
    monitor.recoverySampleCount = 0;
  }

  monitor.frameCount = 0;
  monitor.frameTotalMs = 0;
  monitor.simulationTotalMs = 0;
  monitor.renderTotalMs = 0;
  monitor.lastSampleTime = timestamp;
  return true;
}

