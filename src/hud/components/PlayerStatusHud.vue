<script setup>
defineProps({
  health: {
    type: Number,
    required: true,
  },
  energy: {
    type: Number,
    required: true,
  },
  fuel: { type: Number, required: true },
  damage: { type: Number, required: true },
  showEnergy: {
    type: Boolean,
    default: true,
  },
});
</script>

<template>
  <aside class="player-status" aria-label="Health, energy, fuel and damage">
    <div class="player-status__row player-status__row--health">
      <i class="fa-solid fa-heart" aria-hidden="true" />
      <span>
        <small>HEALTH</small>
        <b>{{ Math.round(health) }}</b>
      </span>
      <div><i :style="{ width: `${health}%` }" /></div>
    </div>

    <div
      v-if="showEnergy"
      class="player-status__row player-status__row--energy"
    >
      <i class="fa-solid fa-bolt" aria-hidden="true" />
      <span>
        <small>ENERGY</small>
        <b>{{ Math.round(energy) }}</b>
      </span>
      <div><i :style="{ width: `${energy}%` }" /></div>
    </div>

    <div v-for="bar in [{ id: 'fuel', label: 'Fuel', value: fuel, icon: 'fa-gas-pump' }, { id: 'damage', label: 'Damage', value: damage, icon: 'fa-car-burst' }]"
      :key="bar.id" class="player-status__row" :class="'player-status__row--' + bar.id" :title="bar.label + ': ' + Math.round(bar.value) + '%'">
      <i class="fa-solid" :class="bar.icon" aria-hidden="true" />
      <span><small>{{ bar.label }}</small><b>{{ Math.round(bar.value) }}</b></span>
      <div role="meter" :aria-label="bar.label" :aria-valuenow="Math.max(0, Math.min(100, bar.value))" aria-valuemin="0" aria-valuemax="100">
        <i :style="{ width: Math.max(0, Math.min(100, bar.value)) + '%' }" />
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
  filter: drop-shadow(0 0 1px #b8ad91);
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
  box-shadow: inset 0 1px 4px #000;
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
    drop-shadow(1px 0 0 #17213a)
    drop-shadow(-1px 0 0 #17213a)
    drop-shadow(0 1px 0 #17213a)
    drop-shadow(0 -1px 0 #17213a)
    drop-shadow(2px 2px 0 #17213a);
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
    drop-shadow(1px 0 0 #17213a)
    drop-shadow(-1px 0 0 #17213a)
    drop-shadow(0 1px 0 #17213a)
    drop-shadow(0 -1px 0 #17213a)
    drop-shadow(2px 2px 0 #17213a);
}

.player-status__row--energy > div > i {
  background: repeating-linear-gradient(135deg, #78a52c 0 9px, #9fc644 9px 17px);
}

</style>
