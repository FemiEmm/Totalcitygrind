<script setup>
import { computed, ref, useId } from "vue";
const props = defineProps({
  intoxication: {type:Number,default:0},
  health: { type: Number, required: true },
  energy: { type: Number, required: true },
  fuel: { type: Number, required: true },
  damage: { type: Number, required: true },
  showEnergy: { type: Boolean, default: true },
});
const expanded = ref(false);
const panelId = useId();
const clampPercent = value => Math.max(0, Math.min(100, Number(value) || 0));
const bars = computed(() => [
  { id: "health", label: "Health", value: clampPercent(props.health), icon: "fa-heart", bad: props.health <= 20 },
  { id: "energy", label: "Energy", value: clampPercent(props.energy), icon: "fa-bolt", bad: props.energy <= 20 },
  { id: "fuel", label: "Fuel", value: clampPercent(props.fuel), icon: "fa-gas-pump", bad: props.fuel <= 20 },
  { id: "damage", label: "Damage", value: clampPercent(props.damage), icon: "fa-car-burst", bad: props.damage >= 70 },
]);
const badCount = computed(() => bars.value.filter(bar => bar.bad).length);
const mood = computed(() => props.intoxication >= 30 ? "🥴" : ["😄", "🙂", "😐", "🙁", "😠"][badCount.value]);
const summary = computed(() => props.intoxication >= 30 ? "Intoxication: " + Math.round(props.intoxication) + "%" : badCount.value ? badCount.value + " of 4 indicators need attention" : "All four indicators are good");
</script>
<template>
  <aside class="player-status" :class="{ 'player-status--collapsed': !expanded }" aria-label="Player status">
    <button class="player-status__toggle" type="button" :aria-expanded="expanded" :aria-controls="panelId"
      :aria-label="(expanded ? 'Hide status bars. ' : 'Show status bars. ') + summary"
      :title="summary" @click="expanded = !expanded">
      <span aria-hidden="true">{{ mood }}</span>
    </button>
    <div v-if="expanded" :id="panelId" class="player-status__bars">
      <small v-if="intoxication > 0">🥴 Intoxication {{Math.ceil(intoxication)}}%</small>
      <div v-for="bar in bars.filter(item => item.id !== 'energy' || showEnergy)" :key="bar.id" class="player-status__row" :class="'player-status__row--' + bar.id"
        :title="bar.label + ': ' + Math.round(bar.value) + '%'">
        <i class="fa-solid" :class="bar.icon" aria-hidden="true" />
        <span><small>{{ bar.label }}</small><b>{{ Math.round(bar.value) }}</b></span>
        <div role="meter" :aria-label="bar.label" :aria-valuenow="bar.value" aria-valuemin="0" aria-valuemax="100">
          <i :style="{ width: bar.value + '%' }" />
        </div>
      </div>
    </div>
  </aside>
</template>
<style scoped>
.player-status {
  position: absolute;
  top: 16px;
  bottom: auto;
  left: 16px;
  z-index: 5000;
  display: grid;
  width: 210px;
  gap: 6px;
  padding: 7px 9px;
  border: 1px solid var(--hud-metal);
  border-radius: 0;
  background:
    repeating-linear-gradient(135deg, rgb(255 255 255 / 2%) 0 2px, transparent 2px 7px),
    linear-gradient(180deg, var(--hud-panel), var(--hud-panel-deep));
  color: #ffffff;
  box-shadow: var(--hud-shadow);
  font-family: "Basic", sans-serif;
  pointer-events: none;
  clip-path: polygon(7px 0, 100% 0, 100% calc(100% - 7px), calc(100% - 7px) 100%, 0 100%, 0 7px);
}

.player-status__row {
  display: grid;
  grid-template-columns: 32px 1fr;
  align-items: center;
  gap: 7px;
}

.player-status__row > i {
  display: grid;
  width: 32px;
  height: 28px;
  border: 0;
  background: linear-gradient(135deg, #5d594d, #24231e);
  color: #d8cfb6;
  text-align: center;
  place-items: center;
  clip-path: polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%);
  filter: none;
}

.player-status__row > i::before {
  transform: none;
}

.player-status__row > span {
  display: none;
  line-height: 1;
}

.player-status__row small {
  color: var(--game-blue-200);
  font-size: 8px;
  letter-spacing: 0.08em;
}

.player-status__row b {
  margin-top: 3px;
  font-size: 14px;
}

.player-status__row > div {
  height: 11px;
  overflow: hidden;
  border: 2px solid #8c8470;
  border-radius: 2px;
  background: #24211b;
  box-shadow: none;
}

.player-status__row > div > i {
  display: block;
  height: 100%;
  border-radius: 0;
  transition: width 220ms ease;
}

.player-status__row--health > i,
.player-status__row--health b {
  color: #f24f5e;
}

.player-status__row--health > i {
  border: 0;
  background: transparent;
  clip-path: none;
  font-size: 23px;
  filter:
    none;
}

.player-status__row--health > div > i {
  background: repeating-linear-gradient(135deg, #be302a 0 9px, #d54537 9px 17px);
}

.player-status__row--energy > i,
.player-status__row--energy b {
  color: #ffd43b;
}

.player-status__row--energy > i {
  border: 0;
  background: transparent;
  clip-path: none;
  font-size: 23px;
  filter:
    none;
}

.player-status__row--energy > div > i {
  background: repeating-linear-gradient(135deg, #78a52c 0 9px, #9fc644 9px 17px);
}

.player-status { pointer-events:auto; }
.player-status__toggle { display:grid; place-items:center; width:48px; height:48px; padding:0; border:1px solid rgb(23 33 58 / 12%); border-radius:50%; background:#fffdf4; cursor:pointer; }
.player-status__toggle > span { font-family:"Apple Color Emoji", "Segoe UI Emoji", sans-serif; font-size:32px; line-height:1; }
.player-status__bars { display:grid; gap:6px; }
.player-status.player-status--collapsed { width:auto !important; padding:0 !important; border:0 !important; background:transparent !important; box-shadow:none !important; clip-path:none !important; }
</style>
