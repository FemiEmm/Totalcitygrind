<script setup>
import { COASTAL_CIRCUIT } from "../data/raceCircuit.js";

defineProps({
  raceState: { type: Object, required: true },
  money: { type: Number, required: true },
});
const emit = defineEmits(["close", "start"]);
const formatMoney = (value) => `₦${Number(value).toLocaleString()}`;
</script>

<template>
  <div class="race-modal" role="dialog" aria-modal="true" aria-label="Race circuit">
    <section class="race-card">
      <button class="race-card__close" type="button" @click="emit('close')">×</button>
      <span>COASTAL MOTORSPORT CLUB</span>
      <h2>{{ COASTAL_CIRCUIT.name }}</h2>
      <p>Complete one clockwise lap through every checkpoint. Missing a gate does not advance the run.</p>

      <div class="race-card__targets">
        <strong>GOLD <small>≤ {{ COASTAL_CIRCUIT.firstPlaceTime }}s · {{ formatMoney(COASTAL_CIRCUIT.rewards.gold) }}</small></strong>
        <strong>SILVER <small>≤ {{ COASTAL_CIRCUIT.secondPlaceTime }}s · {{ formatMoney(COASTAL_CIRCUIT.rewards.silver) }}</small></strong>
        <strong>BRONZE <small>≤ {{ COASTAL_CIRCUIT.completionTime }}s · {{ formatMoney(COASTAL_CIRCUIT.rewards.bronze) }}</small></strong>
      </div>
      <p v-if="raceState.bestTime !== null">Personal best: <b>{{ raceState.bestTime.toFixed(2) }}s</b></p>
      <small>Repeat runs pay 25% after the first completion.</small>
      <button
        class="race-card__start"
        type="button"
        :disabled="money < COASTAL_CIRCUIT.entryFee"
        @click="emit('start')"
      >
        Start run · {{ formatMoney(COASTAL_CIRCUIT.entryFee) }}
      </button>
    </section>
  </div>
</template>

<style scoped>
.race-modal{position:absolute;z-index:120;inset:0;display:grid;place-items:center;padding:18px;background:#080d13d1}
.race-card{position:relative;width:min(650px,94vw);padding:28px;border:2px solid #aaa184;color:#eee9d8;background:#292820;box-shadow:0 2px 8px rgb(23 33 58 / 10%)}
.race-card>span{color:#d8c365;font-size:12px;letter-spacing:.14em}.race-card h2{margin:6px 0;font-size:30px}.race-card p{color:#beb7a1}
.race-card__close{position:absolute;top:12px;right:12px;width:38px;height:38px;border:1px solid #69624f;color:#eee9d8;background:#39362c;font-size:24px}
.race-card__targets{display:grid;grid-template-columns:repeat(3,1fr);margin:22px 0;gap:8px}.race-card__targets strong{display:grid;padding:14px;border:1px solid #625c4b;background:#343229;color:#e4ce6d}.race-card__targets small{margin-top:5px;color:#beb7a1;font-size:11px}
.race-card__start{width:100%;margin-top:18px;padding:14px;border:1px solid #f1df8c;color:#201d12;background:#dcc665;font:16px Basic,sans-serif}.race-card__start:disabled{color:#918b7b;background:#444137}
</style>
