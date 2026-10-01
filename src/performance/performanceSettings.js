import { reactive } from "vue";

const STORAGE_KEY = "total-city-grind-performance-v2";

const defaults = Object.freeze({
  renderQuality: typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches ? "performance" : "balanced",
  adaptivePerformance: true,
  showPerformanceMonitor: false,
});

const qualityPixelRatios = Object.freeze({
  performance: 1,
  balanced: 1.35,
  high: 2,
});

function loadSettings() {
  if (typeof window === "undefined") {
    return { ...defaults };
  }

  try {
    return {
      ...defaults,
      ...JSON.parse(window.localStorage.getItem(STORAGE_KEY)),
    };
  } catch {
    return { ...defaults };
  }
}

export const performanceSettings = reactive(loadSettings());

function persistSettings() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(performanceSettings));
  } catch { /* Settings remain usable when browser storage is unavailable. */ }
}

export function setRenderQuality(quality) {
  if (!(quality in qualityPixelRatios)) {
    return;
  }

  performanceSettings.renderQuality = quality;
  persistSettings();
}

export function setAdaptivePerformance(enabled) {
  performanceSettings.adaptivePerformance = Boolean(enabled);
  persistSettings();
}

export function setPerformanceMonitorVisible(visible) {
  performanceSettings.showPerformanceMonitor = Boolean(visible);
  persistSettings();
}

export function getRenderPixelRatioLimit(adaptiveScale = 1) {
  const qualityLimit =
    qualityPixelRatios[performanceSettings.renderQuality] ??
    qualityPixelRatios.balanced;

  return Math.max(0.8, qualityLimit * adaptiveScale);
}

