<script setup>
defineProps({
  hasFood: {
    type: Boolean,
    default: false,
  },
  hospitalCost: {
    type: Number,
    required: true,
  },
});

defineEmits(["clinic"]);
</script>

<template>
  <div class="energy-depleted" role="dialog" aria-modal="true" aria-labelledby="energy-depleted-title">
    <section class="energy-depleted__card">
      <i class="fa-solid fa-bolt energy-depleted__icon" aria-hidden="true" />
      <small>ENERGY DEPLETED</small>
      <h2 id="energy-depleted-title">You cannot continue driving</h2>

      <p v-if="hasFood">
        Use the food equipped in your pocket to recover.
      </p>
      <p v-else>
        You have no food. Wake up at the clinic; if you cannot cover the bill,
        the shortfall will be added to your bank loan.
      </p>

      <div v-if="hasFood" class="energy-depleted__shortcut">
        <kbd>Z</kbd>
        <span>Eat pocket food</span>
      </div>
      <button v-else type="button" @click="$emit('clinic')">
        <i class="fa-solid fa-hospital" aria-hidden="true" />
        Wake up at clinic
        <small>Hospital bill · ₦{{ hospitalCost.toLocaleString() }}</small>
      </button>
    </section>
  </div>
</template>

<style scoped>
.energy-depleted {
  position: absolute;
  z-index: 9000;
  inset: 0;
  display: grid;
  padding: 24px;
  background: rgb(5 7 9 / 64%);
  backdrop-filter: blur(4px);
  place-items: center;
  pointer-events: auto;
}

.energy-depleted__card {
  display: grid;
  width: min(390px, calc(100vw - 40px));
  padding: 28px;
  border: 1px solid #81765b;
  background:
    repeating-linear-gradient(135deg, rgb(255 255 255 / 2%) 0 2px, transparent 2px 8px),
    linear-gradient(180deg, #34332c, #171813);
  box-shadow: 0 18px 55px rgb(0 0 0 / 65%);
  color: #f4f0df;
  font-family: "Basic", sans-serif;
  text-align: center;
  gap: 12px;
}

.energy-depleted__icon {
  color: #e4bd45;
  font-size: 34px;
}

.energy-depleted__card > small {
  color: #e4bd45;
  font-weight: 900;
  letter-spacing: 0.15em;
}

.energy-depleted__card h2,
.energy-depleted__card p {
  margin: 0;
}

.energy-depleted__card p {
  color: #c7c1ae;
  line-height: 1.45;
}

.energy-depleted__shortcut,
.energy-depleted__card button {
  display: flex;
  min-height: 58px;
  align-items: center;
  justify-content: center;
  border: 1px solid #9a813d;
  background: #24251e;
  color: #f4f0df;
  gap: 10px;
  font: inherit;
  font-weight: 900;
}

.energy-depleted__shortcut kbd {
  padding: 7px 11px;
  border: 1px solid #d7c686;
  background: #11130f;
  color: #e4bd45;
}

.energy-depleted__card button {
  cursor: pointer;
}

.energy-depleted__card button:hover {
  background: #343528;
}

.energy-depleted__card button small {
  color: #bdb49b;
  font-size: 10px;
}
</style>
