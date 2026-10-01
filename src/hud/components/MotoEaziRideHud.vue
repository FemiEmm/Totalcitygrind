<script setup>
import { computed } from "vue";

const props = defineProps({
  request: { type: Object, required: true },
  stage: { type: String, default: "pickup" },
  target: { type: Object, default: null },
  elapsedSeconds: { type: Number, default: 0 },
  expectedSeconds: { type: Number, default: 0 },
  collisionCount: { type: Number, default: 0 },
  projectedStars: { type: Number, default: 5 },
  driverRating: { type: Number, default: 5 },
});

const remainingSeconds = computed(() =>
  Math.max(0, Math.ceil(props.expectedSeconds - props.elapsedSeconds)),
);
const isLate = computed(() => props.stage === "dropoff" && remainingSeconds.value <= 0);
const timeText = computed(() => {
  const value = isLate.value
    ? Math.ceil(props.elapsedSeconds - props.expectedSeconds)
    : remainingSeconds.value;
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
});
</script>

<template>
  <aside class="moto-ride-hud" :class="{ 'moto-ride-hud--late': isLate }">
    <header>
      <span><i class="fa-solid fa-car-side" /> MOTO EAZI</span>
      <b><i class="fa-solid fa-star" aria-hidden="true" /> {{ driverRating.toFixed(1) }}</b>
    </header>
    <div class="moto-ride-hud__route">
      <small>{{ stage === "pickup" ? "PICK UP RIDER" : "NEXT DROP" }}</small>
      <strong>{{ target?.label ?? "Follow the blue marker" }}</strong>
    </div>
    <div v-if="stage === 'dropoff'" class="moto-ride-hud__metrics">
      <span>
        <small>{{ isLate ? "LATE BY" : "EXPECTED IN" }}</small>
        <strong>{{ timeText }}</strong>
      </span>
      <span>
        <small>RIDE RATING</small>
        <strong class="moto-ride-hud__stars">
          <i v-for="star in 5" :key="star" :class="star <= projectedStars ? 'fa-solid fa-star' : 'fa-regular fa-star'" />
        </strong>
      </span>
      <span>
        <small>IMPACTS</small>
        <strong>{{ collisionCount }}</strong>
      </span>
    </div>
    <p v-else>Stop at the marker to begin the timed ride.</p>
  </aside>
</template>

<style scoped>
.moto-ride-hud {
  position: absolute;
  z-index: 5100;
  top: 112px;
  left: 50%;
  width: 370px;
  overflow: hidden;
  border: 3px solid #14213d;
  border-radius: 15px;
  color: #14213d;
  background: #fff7dc;
  box-shadow: 5px 5px 0 rgb(20 33 61 / 72%);
  font-family: "Basic", sans-serif;
  transform: translateX(-50%);
  pointer-events: none;
}
.moto-ride-hud header { display: flex; justify-content: space-between; padding: 8px 12px; color: #fff; background: #2f80ed; }
.moto-ride-hud header span, .moto-ride-hud header b { font-size: 11px; font-weight: 900; }
.moto-ride-hud__route { display: grid; padding: 9px 12px 7px; }
.moto-ride-hud__route small, .moto-ride-hud__metrics small { color: #6a7185; font-size: 8px; font-weight: 900; letter-spacing: .09em; }
.moto-ride-hud__route strong { overflow: hidden; font-size: 15px; text-overflow: ellipsis; white-space: nowrap; }
.moto-ride-hud__metrics { display: grid; grid-template-columns: 1fr 1.7fr .7fr; border-top: 2px solid #14213d; }
.moto-ride-hud__metrics > span { display: grid; gap: 2px; padding: 7px 10px; border-right: 1px solid #b6bdd0; }
.moto-ride-hud__metrics > span:last-child { border-right: 0; text-align: center; }
.moto-ride-hud__metrics strong { font-size: 13px; }
.moto-ride-hud__stars { color: #ffb703; white-space: nowrap; }
.moto-ride-hud p { margin: 0; padding: 0 12px 9px; color: #556078; font-size: 10px; }
.moto-ride-hud--late header { background: #e63946; }
@media (max-width: 760px) { .moto-ride-hud { top: 150px; width: min(340px, calc(100vw - 24px)); } }
</style>