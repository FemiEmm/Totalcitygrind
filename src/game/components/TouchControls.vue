<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { isPlayerVehicleEngineStarted } from "../../audio/vehicleAudio.js";
const props = defineProps({ transmission: { type: String, default: "automatic" }, steeringOnly: { type: Boolean, default: false } });
const engineOn = computed(isPlayerVehicleEngineStarted);
const emit = defineEmits(["input"]);
const held = ref(new Map());
const groups = [
  { id: "steering", controls: [{ key: "a", label: "Steer left", icon: "fa-circle-arrow-left" }, { key: "d", label: "Steer right", icon: "fa-circle-arrow-right" }] },
  { id: "gears", controls: [{ key: "e", label: "Gear up", text: "GEAR +" }, { key: "q", label: "Gear down", text: "GEAR −" }] },
  { id: "utility", controls: [{ key: "i", label: "Start or stop engine", text: "START", icon: "fa-key" }, { key: "h", label: "Horn", text: "HORN" }] },
  { id: "pedals", controls: [{ key: "s", label: "Brake or reverse", text: "BRAKE / R" }, { key: "w", label: "Throttle — accelerate", text: "THROTTLE" }] },
];
const visibleGroups = computed(() => groups.filter(group => props.steeringOnly ? group.id === "steering" : group.id !== "gears" || props.transmission === "manual"));
function press(event, key) {
  if (event.pointerType === "mouse" && event.button !== 0) return;
  event.currentTarget.setPointerCapture(event.pointerId);
  if (![...held.value.values()].includes(key)) emit("input", { key, down: true });
  held.value.set(event.pointerId, key);
}
function release(event) {
  const key = held.value.get(event.pointerId);
  held.value.delete(event.pointerId);
  if (key && ![...held.value.values()].includes(key)) emit("input", { key, down: false });
}
function releaseAll() {
  for (const key of new Set(held.value.values())) emit("input", { key, down: false });
  held.value.clear();
}
onMounted(() => {
  window.addEventListener("blur", releaseAll);
  document.addEventListener("visibilitychange", releaseAll);
});
onBeforeUnmount(() => {
  releaseAll();
  window.removeEventListener("blur", releaseAll);
  document.removeEventListener("visibilitychange", releaseAll);
});
</script>
<template>
  <nav class="touch-controls" :class="{ 'touch-controls--automatic': props.transmission !== 'manual', 'touch-controls--steering-only': props.steeringOnly }" aria-label="Driving controls">
    <div v-for="group in visibleGroups" :key="group.id" class="touch-controls__group" :class="`touch-controls__${group.id}`">
      <button v-for="control in group.controls" :key="control.key" type="button" :aria-label="control.key === 'i' ? (engineOn ? 'Stop engine' : 'Start engine') : control.label"
        :class="{ held: [...held.values()].includes(control.key), accelerator: control.key === 'w' }"
        @pointerdown.prevent="press($event, control.key)" @pointerup="release" @pointercancel="release"
        @lostpointercapture="release" @contextmenu.prevent>
        <i v-if="control.icon" class="fa-solid" :class="control.icon" aria-hidden="true" />
        <span v-if="control.text">{{ control.key === "i" ? (engineOn ? "STOP" : "START") : control.text }}</span>
      </button>
    </div>
  </nav>
</template>
<style scoped>
.touch-controls { position:absolute; z-index:1100; inset:auto max(12px, env(safe-area-inset-right)) max(10px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left)); display:grid; grid-template-columns:auto auto 1fr auto; align-items:end; gap:10px; pointer-events:none; }
.touch-controls--automatic { grid-template-columns:auto 1fr auto; }
.touch-controls--steering-only { left:50%; right:auto; width:max-content; transform:translateX(-50%); grid-template-columns:auto; }
.touch-controls__steering button { display:grid; place-items:center; }
.touch-controls__steering i { font-size:32px; line-height:1; pointer-events:none; }
.touch-controls__group { display:flex; gap:8px; }
button { width:64px; height:64px; border:2px solid #fff7dc80; border-radius:18px; color:#fff7dc; background:#17213ae8; font-size:13px; font-weight:bold; touch-action:none; user-select:none; -webkit-user-select:none; pointer-events:auto; }
button.accelerator { background:#ffd43b; color:#17213a; }
button.held { background:#65d6ee; color:#17213a; transform:translateY(2px); }
.touch-controls__gears { flex-direction:column; }
.touch-controls__utility { justify-self:end; }
.touch-controls__utility button, .touch-controls__gears button { width:52px; height:44px; border-radius:12px; font-size:10px; }
.touch-controls__utility button { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; }
.touch-controls__utility i { font-size:14px; }
@media (max-width:700px) { button { width:54px; height:58px; } .touch-controls { gap:8px; } .touch-controls__utility, .touch-controls__gears { gap:5px; } .touch-controls__utility button, .touch-controls__gears button { height:44px; width:48px; } }
/* Enlarge touch hit areas without changing desktop controls or scaling the grid. */
@media (pointer: coarse) {
  button { width:80px; height:80px; border-radius:22.5px; }
  .touch-controls__steering i { font-size:40px; }
  .touch-controls__utility button, .touch-controls__gears button { width:65px; height:55px; border-radius:15px; font-size:12.5px; }
  .touch-controls__utility i { font-size:17.5px; }
}
@media (pointer: coarse) and (max-width:700px) {
  button { width:67.5px; height:72.5px; }
  .touch-controls__utility button, .touch-controls__gears button { width:60px; height:55px; }
}
</style>
