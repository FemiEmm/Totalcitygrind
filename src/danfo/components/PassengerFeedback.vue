<script setup>
defineProps({
  result: {
    type: Object,
    required: true,
  },
});
</script>

<template>
  <aside class="passenger-feedback" aria-live="polite">
    <strong>{{ result.stopLabel }}</strong>

    <div class="passenger-feedback__stats">
      <span>{{ result.exitedCount }} EXITED</span>
      <span>{{ result.boardedCount }} BOARDED</span>
      <span v-if="result.remainingWaiting != null">{{ result.remainingWaiting }} WAITING</span>
      <span v-if="result.fareEarned > 0">PAYMENT MESSAGE SENT</span>
    </div>
  </aside>
</template>

<style scoped>
.passenger-feedback {
  position: absolute;
  top: 22px;
  left: 50%;
  min-width: 330px;
  padding: 12px 18px;
  border: 3px solid var(--game-panel-border);
  border-radius: 12px;
  color: #ffffff;
  background: linear-gradient(
    180deg,
    rgb(38 112 199 / 97%),
    rgb(11 52 121 / 97%)
  );
  box-shadow: var(--game-panel-shadow);
  box-shadow: 0 2px 8px rgb(23 33 58 / 10%);
  font-family: "Basic", sans-serif;
  text-align: center;
  transform: translateX(-50%);
  pointer-events: none;
  z-index: 5100;
}

.passenger-feedback > strong {
  display: block;
  color: #f2c438;
  font-size: 15px;
}

.passenger-feedback__stats {
  display: flex;
  justify-content: center;
  margin-top: 5px;
  gap: 16px;
  font-size: 13px;
  font-weight: 900;
}
</style>
