<script setup>
defineProps({
  route: {
    type: Object,
    required: true,
  },
  bonus: {
    type: Number,
    required: true,
  },
  rewardLabel: {
    type: String,
    default: "ROUTE BONUS",
  },
});

const emit = defineEmits(["continue"]);
</script>

<template>
  <section class="route-complete" aria-label="Route complete">
    <div class="route-complete__panel">
      <span>ROUTE {{ route.id }}</span>
      <h2>Route complete</h2>
      <p>{{ route.name }}</p>
      <strong v-if="bonus > 0" class="route-complete__bonus">
        PAYMENT RECEIPT SENT TO MESSAGES
      </strong>
      <button type="button" @click="emit('continue')">
        CHOOSE ANOTHER ROUTE
      </button>
    </div>
  </section>
</template>

<style scoped>
.route-complete {
  position: absolute;
  inset: 0;
  display: grid;
  background: rgb(12 12 10 / 68%);
  place-items: center;
  z-index: 6500;
}

.route-complete__panel {
  width: min(420px, calc(100% - 32px));
  padding: 26px;
  border: 1px solid var(--hud-metal-light);
  border-radius: 0;
  color: #ffffff;
  background:
    repeating-linear-gradient(135deg, rgb(255 255 255 / 2%) 0 2px, transparent 2px 9px),
    linear-gradient(150deg, rgb(67 63 53 / 98%), rgb(24 24 20 / 98%));
  box-shadow: 0 2px 8px rgb(23 33 58 / 10%);
  text-align: center;
  clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);
}

.route-complete__panel span {
  color: #d0b463;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0.12em;
}

.route-complete__panel h2 {
  margin: 7px 0 0;
  font-size: 30px;
}

.route-complete__panel p {
  margin: 7px 0 20px;
  color: #cfc5aa;
}

.route-complete__bonus {
  display: block;
  margin: -8px 0 20px;
  color: #b8cc70;
  font-size: 16px;
}

.route-complete__panel button {
  padding: 12px 18px;
  border: 1px solid #c7af65;
  border-radius: 0;
  color: #171711;
  background: linear-gradient(180deg, #d5bd70, #9f812f);
  font: inherit;
  font-weight: 900;
  cursor: pointer;
  clip-path: polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px);
}
</style>
