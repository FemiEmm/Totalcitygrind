<script setup>
import {
  computed,
  onBeforeUnmount,
  ref,
  watch,
} from "vue";

const props = defineProps({
  speed: {
    type: Number,
    required: true,
  },
  gear: {
    type: String,
    required: true,
  },
  fuel: {
    type: Number,
    required: true,
  },
  damage: {
    type: Number,
    required: true,
  },
  transmission: {
    type: String,
    default: "automatic",
  },
  engineOn: {
    type: Boolean,
    default: false,
  },
  engineStarting: {
    type: Boolean,
    default: false,
  },
  energy: {
    type: Number,
    default: 100,
  },
  health: {
    type: Number,
    default: 100,
  },
  impounded: {
    type: Boolean,
    default: false,
  },
  pocketItem: {
    type: Object,
    default: null,
  },
  pocketQuantity: {
    type: Number,
    default: 0,
  },
});

const emit = defineEmits([
  "use-pocket-item",
  "cycle-pocket-item",
]);

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

const speedRatio = computed(() => {
  return clamp(props.speed / 220, 0, 1);
});

const speedometerStyle = computed(() => ({
  "--speed-arc": `${speedRatio.value * 270}deg`,
  "--speed-needle": `${-135 + speedRatio.value * 270}deg`,
}));

const gearIndicators = Object.freeze(["P", "R", "N", "D"]);

const gearMode = computed(() => {
  if (props.gear.startsWith("P")) return "P";
  if (props.gear.startsWith("R")) return "R";
  if (props.gear.startsWith("N")) return "N";
  return "D";
});

const gearSelectorStyle = computed(() => {
  const position = Math.max(0, gearIndicators.indexOf(gearMode.value));

  return {
    "--gear-position": position,
  };
});

const manualGearPositions = Object.freeze({
  R: { x: 8, y: 8 },
  N: { x: 50, y: 50 },
  1: { x: 31, y: 8 },
  2: { x: 31, y: 82 },
  3: { x: 58, y: 8 },
  4: { x: 58, y: 82 },
  5: { x: 85, y: 8 },
});

const displayedManualPosition = ref(
  manualGearPositions[props.gear] ??
    manualGearPositions.N,
);
let manualShiftTimers = [];

function clearManualShiftTimers() {
  for (const timer of manualShiftTimers) {
    window.clearTimeout(timer);
  }
  manualShiftTimers = [];
}

function queueManualPosition(position, delay) {
  const timer = window.setTimeout(() => {
    displayedManualPosition.value = position;
  }, delay);
  manualShiftTimers.push(timer);
}

watch(
  () => props.gear,
  (nextGear, previousGear) => {
    if (props.transmission !== "manual") return;

    clearManualShiftTimers();

    const from =
      manualGearPositions[previousGear] ??
      displayedManualPosition.value;
    const target =
      manualGearPositions[nextGear] ??
      manualGearPositions.N;

    if (nextGear === previousGear) return;

    if (nextGear === "N") {
      queueManualPosition({ x: from.x, y: 50 }, 0);
      queueManualPosition(target, 180);
      return;
    }

    if (previousGear === "N") {
      queueManualPosition({ x: target.x, y: 50 }, 0);
      queueManualPosition(target, 180);
      return;
    }

    queueManualPosition({ x: from.x, y: 50 }, 0);
    queueManualPosition({ x: target.x, y: 50 }, 180);
    queueManualPosition(target, 360);
  },
);

onBeforeUnmount(clearManualShiftTimers);

const manualGearStyle = computed(() => {
  const position = displayedManualPosition.value;

  return {
    "--manual-gear-x": `${position.x}%`,
    "--manual-gear-y": `${position.y}%`,
  };
});

const engineStatus = computed(() => {
  if (props.impounded) {
    return { label: "IMPOUNDED", tone: "danger" };
  }

  if (props.fuel <= 0) {
    return { label: "NO FUEL", tone: "danger" };
  }

  if (props.damage >= 100) {
    return { label: "ENGINE DAMAGED", tone: "danger" };
  }

  if (props.health <= 0) {
    return { label: "DRIVER INJURED", tone: "danger" };
  }

  if (props.energy <= 0) {
    return { label: "NO ENERGY", tone: "danger" };
  }

  if (props.engineStarting) {
    return { label: "ENGINE STARTING", tone: "warning" };
  }

  if (!props.engineOn) {
    return { label: "ENGINE OFF", tone: "muted" };
  }

  if (props.fuel <= 20) {
    return { label: "LOW FUEL", tone: "warning" };
  }

  if (props.damage >= 70) {
    return { label: "HIGH DAMAGE", tone: "warning" };
  }

  if (props.energy <= 15) {
    return { label: "LOW ENERGY", tone: "warning" };
  }

  return { label: "ENGINE ON", tone: "ready" };
});

</script>

<template>
  <aside class="vehicle-hud" aria-label="Vehicle dashboard">
    <section class="vehicle-hud__mobile" aria-label="Vehicle status">
      <strong>{{ speed }} <small>km/h</small> · {{ gear }}</strong>
      <small>{{ engineStatus.label }}</small>
    </section>
    <section class="vehicle-hud__instruments">
      <div class="vehicle-hud__speed-column">
        <section
          class="vehicle-hud__speedometer"
          :style="speedometerStyle"
          aria-label="Speedometer"
        >
          <div class="vehicle-hud__dial">
            <span class="vehicle-hud__needle" />
            <span class="vehicle-hud__needle-centre" />

            <div class="vehicle-hud__speed-reading">
              <strong>{{ speed }}</strong>
              <small>KM/H</small>
            </div>
          </div>
        </section>

        <div
          class="vehicle-hud__engine-state"
          :class="`vehicle-hud__engine-state--${engineStatus.tone}`"
          aria-live="polite"
        >
          <i class="fa-solid fa-power-off" aria-hidden="true" />
          <span>{{ engineStatus.label }}</span>
        </div>
      </div>

    </section>

    <section
      class="vehicle-hud__gear"
      :class="{
        'vehicle-hud__gear--manual': transmission === 'manual',
      }"
      aria-label="Current gear"
    >
      <template v-if="transmission === 'manual'">
        <div class="vehicle-hud__manual-gate" :style="manualGearStyle">
          <span class="vehicle-hud__manual-line vehicle-hud__manual-line--top" />
          <span class="vehicle-hud__manual-line vehicle-hud__manual-line--middle" />
          <span class="vehicle-hud__manual-line vehicle-hud__manual-line--left" />
          <span class="vehicle-hud__manual-line vehicle-hud__manual-line--centre" />
          <span class="vehicle-hud__manual-line vehicle-hud__manual-line--right" />
          <span class="vehicle-hud__manual-line vehicle-hud__manual-line--reverse" />

          <i
            v-for="manualGear in ['R', '1', '2', '3', '4', '5']"
            :key="manualGear"
            class="vehicle-hud__manual-label"
            :class="[
              `vehicle-hud__manual-label--${manualGear.toLowerCase()}`,
              {
                'vehicle-hud__manual-label--active':
                  gear === manualGear,
              },
            ]"
          >
            {{ manualGear }}
          </i>
          <i
            class="vehicle-hud__manual-neutral"
            :class="{
              'vehicle-hud__manual-neutral--active': gear === 'N',
            }"
          >
            N
          </i>

          <b class="vehicle-hud__manual-knob" />
        </div>
      </template>

      <template v-else>
        <div class="vehicle-hud__gear-indicators">
        <span
          v-for="indicator in gearIndicators"
          :key="indicator"
          :class="{
            'vehicle-hud__gear-indicator--active':
              gearMode === indicator,
          }"
        >
          {{ indicator }}
        </span>
        </div>

        <div class="vehicle-hud__gear-mechanism" :style="gearSelectorStyle">
          <i class="vehicle-hud__gear-slot" aria-hidden="true" />
          <i class="vehicle-hud__gear-shaft" aria-hidden="true" />
          <b class="vehicle-hud__gear-knob" aria-hidden="true" />
        </div>
      </template>
    </section>

    <section class="vehicle-hud__pocket" aria-label="Food pocket">
      <button
        class="vehicle-hud__pocket-use"
        type="button"
        :disabled="!pocketItem"
        :title="pocketItem ? `Eat ${pocketItem.label} (Z)` : 'No food equipped'"
        @click="emit('use-pocket-item')"
      >
        <span class="vehicle-hud__pocket-key">Z</span>
        <img
          v-if="pocketItem?.imageUrl"
          :src="pocketItem.imageUrl"
          :alt="pocketItem.label"
        >
        <i v-else class="fa-solid fa-bag-shopping" aria-hidden="true" />
        <small>{{ pocketItem?.label ?? "EMPTY" }}</small>
        <b v-if="pocketItem">×{{ pocketQuantity }}</b>
      </button>
      <button
        class="vehicle-hud__pocket-cycle"
        type="button"
        :disabled="!pocketItem"
        title="Equip next food"
        aria-label="Equip next food"
        @click="emit('cycle-pocket-item')"
      >
        <i class="fa-solid fa-rotate" aria-hidden="true" />
      </button>
    </section>
  </aside>
</template>

<style scoped>
.vehicle-hud__mobile { display:none; }
.vehicle-hud {
  position: absolute;
  z-index: 5000;
  bottom: 18px;
  left: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #f7fafc;
  font-family: "Basic", sans-serif;
  box-shadow: none;
  pointer-events: none;
}

.vehicle-hud__instruments,
.vehicle-hud__gear,
.vehicle-hud__pocket {
  border: 1px solid var(--hud-metal);
  background:
    repeating-linear-gradient(135deg, rgb(255 255 255 / 2%) 0 2px, transparent 2px 8px),
    linear-gradient(180deg, var(--hud-panel), var(--hud-panel-deep));
  box-shadow: var(--hud-shadow);
}

.vehicle-hud__pocket {
  position: absolute;
  bottom: calc(100% + 9px);
  left: 0;
  display: grid;
  width: 88px;
  height: 88px;
  padding: 7px;
  clip-path: polygon(7px 0, 100% 0, 100% calc(100% - 7px), calc(100% - 7px) 100%, 0 100%, 0 7px);
  pointer-events: auto;
}

.vehicle-hud__pocket-use {
  display: grid;
  min-width: 0;
  place-items: center;
  border: 1px solid #625d50;
  background: rgb(12 13 10 / 82%);
  color: #eee9d8;
  cursor: pointer;
  font-family: inherit;
  grid-template-rows: 1fr auto;
}

.vehicle-hud__pocket-use:disabled,
.vehicle-hud__pocket-cycle:disabled {
  cursor: default;
  opacity: 0.48;
}

.vehicle-hud__pocket-use img {
  width: 42px;
  height: 42px;
  object-fit: contain;
}

.vehicle-hud__pocket-use > i {
  color: #847f71;
  font-size: 24px;
}

.vehicle-hud__pocket-use small {
  overflow: hidden;
  max-width: 62px;
  color: #c9c2ac;
  font-size: 8px;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vehicle-hud__pocket-use b {
  position: absolute;
  right: 10px;
  bottom: 22px;
  color: #f3d36f;
  font-size: 10px;
}

.vehicle-hud__pocket-key {
  position: absolute;
  z-index: 6;
  top: -12px;
  left: 50%;
  display: grid;
  width: 28px;
  height: 22px;
  border: 2px solid #11182b;
  border-radius: 7px;
  background: #ffd43b;
  color: #11182b;
  box-shadow: 2px 3px 0 #11182b;
  font-size: 11px;
  font-weight: 900;
  place-items: center;
  transform: translateX(-50%);
}

.vehicle-hud__pocket-cycle {
  position: absolute;
  right: -7px;
  bottom: -7px;
  display: grid;
  width: 25px;
  height: 25px;
  border: 1px solid #80765d;
  border-radius: 50%;
  background: #272820;
  color: #e8dfc7;
  cursor: pointer;
  font-size: 9px;
  place-items: center;
}

.vehicle-hud__manual-gate {
  position: relative;
  width: 100%;
  height: 100%;
}

.vehicle-hud__manual-line {
  position: absolute;
  display: block;
  border-radius: 3px;
  background: #171713;
  box-shadow:
    inset 1px 1px 2px #050504,
    1px 1px rgb(255 255 255 / 7%);
}

.vehicle-hud__manual-line--top {
  top: 25%;
  left: 8%;
  width: 80%;
  height: 7px;
}

.vehicle-hud__manual-line--middle {
  top: 50%;
  left: 8%;
  width: 80%;
  height: 7px;
}

.vehicle-hud__manual-line--left,
.vehicle-hud__manual-line--centre,
.vehicle-hud__manual-line--right,
.vehicle-hud__manual-line--reverse {
  top: 25%;
  width: 7px;
  height: 55%;
}

.vehicle-hud__manual-line--reverse { left: 8%; height: 28%; }
.vehicle-hud__manual-line--left { left: 31%; }
.vehicle-hud__manual-line--centre { left: 58%; }
.vehicle-hud__manual-line--right { left: 85%; }

.vehicle-hud__manual-label {
  position: absolute;
  color: #8d8778;
  font-size: 9px;
  font-style: normal;
  font-weight: 900;
  transition:
    color 140ms ease,
    text-shadow 140ms ease,
    transform 140ms ease;
}

.vehicle-hud__manual-label--r { top: 0; left: 4%; }
.vehicle-hud__manual-label--1 { top: 0; left: 28%; }
.vehicle-hud__manual-label--2 { right: 65%; bottom: 0; }
.vehicle-hud__manual-label--3 { top: 0; left: 55%; }
.vehicle-hud__manual-label--4 { right: 38%; bottom: 0; }
.vehicle-hud__manual-label--5 { top: 0; right: 10%; }

.vehicle-hud__manual-label--active,
.vehicle-hud__manual-neutral--active {
  color: #f3d36f;
  text-shadow:
    0 0 5px rgb(243 211 111 / 90%),
    0 0 12px rgb(243 211 111 / 55%);
  transform: scale(1.25);
}

.vehicle-hud__manual-neutral {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 3;
  display: grid;
  width: 17px;
  height: 17px;
  border: 1px solid #625d50;
  border-radius: 50%;
  color: #8d8778;
  background: #24231e;
  font-size: 8px;
  font-style: normal;
  font-weight: 900;
  place-items: center;
  transform: translate(-50%, -50%);
  transition:
    color 140ms ease,
    border-color 140ms ease,
    box-shadow 140ms ease;
}

.vehicle-hud__manual-neutral--active {
  border-color: #f3d36f;
  box-shadow: 0 0 10px rgb(243 211 111 / 50%);
  transform: translate(-50%, -50%) scale(1.15);
}

.vehicle-hud__manual-knob {
  position: absolute;
  z-index: 2;
  left: var(--manual-gear-x);
  top: var(--manual-gear-y);
  width: 25px;
  height: 25px;
  border: 1px solid #e0dacb;
  border-radius: 50%;
  background:
    radial-gradient(circle at 38% 32%, #ece8dd, #8a867d 55%, #4f4d48);
  box-shadow: 0 4px 7px rgb(0 0 0 / 68%);
  transform: translate(-50%, -50%);
  transition:
    left 180ms ease,
    top 180ms ease;
}

.vehicle-hud__instruments {
  display: grid;
  grid-template-columns: 112px;
  align-items: center;
  min-height: 130px;
  padding: 12px;
  gap: 12px;
  clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px);
}

.vehicle-hud__speed-column {
  display: grid;
  align-content: center;
  gap: 7px;
}

.vehicle-hud__engine-state {
  display: flex;
  min-height: 20px;
  align-items: center;
  justify-content: center;
  border: 1px solid #655f50;
  color: #aaa494;
  background: rgb(10 10 8 / 82%);
  box-shadow: inset 0 0 8px rgb(0 0 0 / 55%);
  gap: 5px;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.04em;
}

.vehicle-hud__engine-state--ready {
  border-color: #718b39;
  color: #b9dd67;
}

.vehicle-hud__engine-state--warning {
  border-color: #a47728;
  color: #f0c15c;
}

.vehicle-hud__engine-state--danger {
  border-color: #9b3732;
  color: #ff7068;
}

.vehicle-hud__engine-state--muted {
  color: #918b7d;
}

.vehicle-hud__speedometer {
  width: 108px;
  height: 108px;
  padding: 6px;
  border-radius: 50%;
  background:
    conic-gradient(
      from 225deg,
      #e33838 0deg var(--speed-arc),
      #3a372f var(--speed-arc) 270deg,
      transparent 270deg
    );
}

.vehicle-hud__dial {
  position: relative;
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  border: 2px solid #9b927c;
  border-radius: 50%;
  background:
    radial-gradient(circle at center, #37352e 0 54%, #13130f 55%);
  overflow: hidden;
}

.vehicle-hud__needle {
  position: absolute;
  left: calc(50% - 2px);
  bottom: 50%;
  width: 4px;
  height: 32px;
  border-radius: 4px;
  background: #f04444;
  box-shadow: 0 0 7px rgb(240 68 68 / 65%);
  transform: rotate(var(--speed-needle));
  transform-origin: 50% 100%;
}

.vehicle-hud__needle-centre {
  position: absolute;
  z-index: 12;
  width: 12px;
  height: 12px;
  border: 3px solid #b8c1c7;
  border-radius: 50%;
  background: #26241e;
}

.vehicle-hud__speed-reading {
  position: absolute;
  bottom: 13px;
  display: grid;
  justify-items: center;
  line-height: 1;
}

.vehicle-hud__speed-reading strong {
  font-size: 23px;
}

.vehicle-hud__speed-reading small,
.vehicle-hud__gear small {
  color: var(--game-blue-200);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.11em;
}

.vehicle-hud__gear {
  display: grid;
  width: 130px;
  height: 130px;
  grid-template-columns: 30% 70%;
  align-items: stretch;
  text-align: center;
  clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px);
}

.vehicle-hud__gear.vehicle-hud__gear--manual {
  display: grid;
  width: 180px;
  grid-template-columns: minmax(0, 1fr);
  padding: 12px 16px;
}

.vehicle-hud__gear-indicators {
  display: grid;
  grid-template-rows: repeat(4, 1fr);
  padding: 17px 0 14px 8px;
  border-right: 1px solid #655f50;
}

.vehicle-hud__gear-indicators span {
  display: grid;
  color: #777267;
  font-size: 12px;
  font-weight: 900;
  place-items: center;
  transition:
    color 160ms ease,
    text-shadow 160ms ease;
}

.vehicle-hud__gear-indicators
  .vehicle-hud__gear-indicator--active {
  color: #e1d5b5;
  text-shadow: 0 0 8px rgb(220 202 150 / 55%);
}

.vehicle-hud__gear-mechanism {
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 18%, rgb(255 255 255 / 7%), transparent 34%),
    linear-gradient(90deg, rgb(0 0 0 / 12%), transparent 28% 72%, rgb(0 0 0 / 12%));
}

.vehicle-hud__gear-slot {
  position: absolute;
  top: 17px;
  bottom: 17px;
  left: calc(50% - 8px);
  width: 16px;
  border-radius: 9px;
  background: #151512;
  box-shadow:
    inset 2px 0 4px #050504,
    inset -2px 0 4px #5d584c;
}

.vehicle-hud__gear-shaft {
  position: absolute;
  top: 29px;
  left: calc(50% - 2px);
  width: 5px;
  height: 30px;
  border-radius: 3px;
  background: linear-gradient(90deg, #77736a, #e0dcd2 52%, #5b5851);
  box-shadow: 0 1px 3px #000;
  transform:
    translateY(calc(var(--gear-position) * 18px));
  transition: transform 180ms ease;
}

.vehicle-hud__gear-knob {
  position: absolute;
  top: 18px;
  left: calc(50% - 12px);
  width: 24px;
  height: 24px;
  border: 1px solid #e0dacb;
  border-radius: 10px 10px 8px 8px;
  background: linear-gradient(90deg, #77736b, #ddd9cf 48%, #5d5a54);
  box-shadow: 0 4px 6px rgb(0 0 0 / 64%);
  transform:
    translateY(calc(var(--gear-position) * 24px));
  transition: transform 180ms ease;
}

.vehicle-hud__readouts {
  display: grid;
  grid-template-rows: repeat(2, 1fr);
  gap: 8px;
}

.vehicle-hud__digital {
  display: grid;
  align-content: center;
  justify-items: center;
  min-height: 50px;
  padding: 7px;
  gap: 1px;
  border: 1px solid #6e6756;
  border-radius: 2px;
  background: #171713;
  box-shadow: inset 0 0 8px #080806;
}

.vehicle-hud__digital small {
  display: flex;
  align-items: center;
  gap: 3px;
  color: var(--game-blue-200);
  font-size: 7px;
  font-weight: 900;
  letter-spacing: 0.06em;
}

.vehicle-hud__digital strong {
  color: #e7d7ab;
  font-family:
    Consolas,
    "Courier New",
    monospace;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.04em;
  line-height: 1;
  text-shadow:
    0 0 4px rgb(230 202 127 / 55%),
    0 0 9px rgb(230 202 127 / 18%);
}

.vehicle-hud__digital strong b {
  margin-left: 1px;
  font-size: 9px;
}

</style>
