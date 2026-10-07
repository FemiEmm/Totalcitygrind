<script setup>
const emit = defineEmits(["close", "sleep"]);

</script>

<template>
  <section class="sleep-modal" aria-label="Sleep at home">
    <div>
      <span>PLAYER HOME</span>
      <h2>Rest at home</h2>
      <p>Restore health and energy while the city keeps running. Wake up whenever you want.</p>
      <div>
        <button type="button" @click="emit('sleep')">Start sleeping</button>
      </div>
      <button type="button" class="sleep-modal__cancel" @click="emit('close')">
        Cancel
      </button>
    </div>
  </section>
</template>

<style scoped>
.sleep-modal {
  position: absolute;
  inset: 0;
  z-index: 40;
  display: grid;
  place-items: center;
  background: rgb(6 27 67 / 68%);
  font-family: "Basic", sans-serif;
}

.sleep-modal > div {
  width: min(460px, 90vw);
  padding: 26px;
  border: 3px solid var(--game-panel-border);
  border-radius: 18px;
  background: linear-gradient(180deg, #2670c7, #0b3479);
  color: #f5f8ff;
  text-align: center;
}

.sleep-modal span {
  color: var(--game-gold);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.14em;
}

.sleep-modal h2 {
  margin: 8px 0;
}

.sleep-modal p {
  color: var(--game-blue-200);
}

.sleep-modal > div > div {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 9px;
  margin: 20px 0;
}

.sleep-modal button {
  padding: 12px;
  border: 1px solid #6e87ac;
  border-radius: 9px;
  background: #1b62b8;
  color: #ffffff;
  font: inherit;
  cursor: pointer;
}

.sleep-modal button.sleep-modal__cancel {
  width: 100%;
  background: #17447f;
}
</style>
