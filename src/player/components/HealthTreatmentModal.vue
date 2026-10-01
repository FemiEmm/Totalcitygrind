<script setup>
import ToggleIcon from "../../ui/components/ToggleIcon.vue";
import { computed, ref } from "vue";

import { CHARACTER_DEFINITIONS } from "../../characters/data/characters.js";

const props = defineProps({
  provider: {
    type: String,
    required: true,
  },
  cost: {
    type: Number,
    required: true,
  },
  health: {
    type: Number,
    required: true,
  },
  money: {
    type: Number,
    required: true,
  },
  discountCoupons: {
    type: Number,
    default: 0,
  },
});

const emit = defineEmits(["close", "treat"]);
const useCoupon = ref(false);
const payableCost = computed(() => Math.round(props.cost * (useCoupon.value ? 0.5 : 1)));
</script>

<template>
  <section class="treatment-modal" aria-label="Medical treatment">
    <div>
      <img
        class="treatment-modal__doctor"
        :src="CHARACTER_DEFINITIONS.doctor.portraitUrl"
        :alt="CHARACTER_DEFINITIONS.doctor.name"
      />
      <i class="fa-solid fa-staff-snake" aria-hidden="true" />
      <span>MEDICAL TREATMENT</span>
      <h2>{{ provider }}</h2>
      <p>Current health: {{ Math.round(health) }} / 100</p>
      <strong>Full treatment · ₦{{ payableCost.toLocaleString() }}</strong>
      <label v-if="discountCoupons > 0" class="treatment-modal__coupon">
        <input v-model="useCoupon" class="game-toggle-input" type="checkbox" role="switch" :aria-checked="useCoupon">
        <ToggleIcon :checked="useCoupon" />
        <span>Use one 50% family coupon · {{ discountCoupons }} available</span>
      </label>
      <button
        type="button"
        :disabled="health >= 100 || money < payableCost"
        @click="emit('treat', { useCoupon })"
      >
        Restore health
      </button>
      <button type="button" class="secondary" @click="emit('close')">
        Leave
      </button>
    </div>
  </section>
</template>

<style scoped>
.treatment-modal {
  position: absolute;
  inset: 0;
  z-index: 40;
  display: grid;
  place-items: center;
  background: rgb(4 8 12 / 74%);
  font-family: "Basic", sans-serif;
}

.treatment-modal > div {
  position: relative;
  overflow: hidden;
  display: grid;
  width: min(420px, 90vw);
  gap: 11px;
  padding: 28px;
  border: 2px solid #b9d8d2;
  border-radius: 18px;
  background: #f4faf8;
  color: #17322d;
  text-align: center;
  box-shadow: 0 24px 70px rgb(0 0 0 / 50%);
}

.treatment-modal__doctor {
  width: 150px;
  height: 150px;
  margin: -16px auto -20px;
  object-fit: contain;
  object-position: center top;
}

.treatment-modal i {
  color: #1a9a78;
  font-size: 35px;
}

.treatment-modal span {
  color: #188366;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.14em;
}

.treatment-modal h2,
.treatment-modal p {
  margin: 0;
}

.treatment-modal__coupon {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 10px;
  border: 2px solid #d6ae26;
  border-radius: 9px;
  color: #332608;
  background: #fff0a8;
  cursor: pointer;
}

.treatment-modal__coupon input {
  width: 18px;
  height: 18px;
  accent-color: #178664;
}

.treatment-modal button {
  padding: 11px;
  border: 0;
  border-radius: 9px;
  background: #178664;
  color: #ffffff;
  font: inherit;
  cursor: pointer;
}

.treatment-modal button.secondary {
  background: #293431;
}

.treatment-modal button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
