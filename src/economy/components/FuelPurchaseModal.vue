<script setup>
import ToggleIcon from "../../ui/components/ToggleIcon.vue";
import { computed, ref } from "vue";

import { getFuelPurchaseQuote } from "../systems/danfoEconomy.js";

const props = defineProps({
  currentFuel: { type: Number, required: true },
  money: { type: Number, required: true },
  config: { type: Object, required: true },
  discountCoupons: { type: Number, default: 0 },
});

const emit = defineEmits(["close", "purchase"]);
const selectedAmount = ref("full");
const useCoupon = ref(false);
const choices = Object.freeze([1, 2, 5, 10, 20, "full"]);

const quote = computed(() => {
  return getFuelPurchaseQuote(
    props.currentFuel,
    selectedAmount.value,
    props.config,
  );
});

const payableCost = computed(() => {
  return Math.round(quote.value.cost * (useCoupon.value ? 0.5 : 1));
});

function submitPurchase() {
  emit("purchase", {
    requestedLitres: selectedAmount.value,
    useCoupon: useCoupon.value && props.discountCoupons > 0,
  });
}

function formatMoney(value) {
  return `₦${Math.ceil(value).toLocaleString()}`;
}
</script>

<template>
  <div class="service-modal" role="dialog" aria-modal="true" aria-label="Buy fuel">
    <section class="fuel-card">
      <button class="service-modal__close" type="button" @click="emit('close')">×</button>
      <span class="fuel-card__eyebrow">PETROL STATION</span>
      <h2>How much fuel?</h2>

      <div class="fuel-card__gauge">
        <span :style="{ width: `${currentFuel}%` }" />
      </div>
      <p>{{ Math.round(currentFuel) }}% in tank · {{ config.fuelTankCapacityLitres }}L capacity</p>

      <div class="fuel-card__choices">
        <button
          v-for="choice in choices"
          :key="choice"
          type="button"
          :class="{ selected: selectedAmount === choice }"
          @click="selectedAmount = choice"
        >
          {{ choice === "full" ? "Full tank" : `${choice} litre${choice === 1 ? "" : "s"}` }}
        </button>
      </div>

      <label v-if="discountCoupons > 0" class="fuel-card__coupon">
        <input v-model="useCoupon" class="game-toggle-input" type="checkbox" role="switch" :aria-checked="useCoupon">
        <ToggleIcon :checked="useCoupon" />
        <span><b>Use one 50% family coupon</b> · {{ discountCoupons }} available</span>
      </label>

      <div class="fuel-card__receipt">
        <span>Fuel supplied <b>{{ quote.litres.toFixed(1) }}L</b></span>
        <span>Price per litre <b>{{ formatMoney(config.fuelCostPerLitre) }}</b></span>
        <strong>Total <b>{{ formatMoney(payableCost) }}</b></strong>
      </div>

      <button
        class="fuel-card__pay"
        type="button"
        :disabled="quote.cost <= 0 || money < payableCost"
        @click="submitPurchase"
      >
        {{
          quote.cost <= 0
            ? "Tank is full"
            : money < payableCost
              ? "Not enough money"
              : `Pay ${formatMoney(payableCost)}`
        }}
      </button>
    </section>
  </div>
</template>

<style scoped>
.service-modal {
  position: absolute;
  z-index: 7000;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgb(8 9 8 / 72%);
  backdrop-filter: blur(2px);
}

.fuel-card {
  position: relative;
  width: min(460px, 92vw);
  padding: 28px;
  border: 1px solid var(--hud-metal-light);
  color: #eee9dc;
  background:
    repeating-linear-gradient(
      135deg,
      rgb(255 255 255 / 2%) 0 2px,
      transparent 2px 9px
    ),
    linear-gradient(150deg, rgb(67 63 53 / 99%), rgb(24 24 20 / 99%));
  box-shadow: 0 2px 8px rgb(23 33 58 / 10%);
  clip-path: polygon(
    12px 0,
    100% 0,
    100% calc(100% - 12px),
    calc(100% - 12px) 100%,
    0 100%,
    0 12px
  );
}

.service-modal__close {
  position: absolute;
  top: 14px;
  right: 16px;
  width: 36px;
  height: 36px;
  border: 1px solid #817967;
  border-radius: 0;
  color: #e9dfc7;
  background: #302f28;
  font: 24px Basic;
  cursor: pointer;
}

.fuel-card__eyebrow {
  color: #d8bf72;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0.14em;
}

h2 {
  margin: 8px 0 16px;
  font-size: 31px;
}

.fuel-card p {
  margin: 8px 0 20px;
  color: #cfc5aa;
}

.fuel-card__gauge {
  height: 14px;
  overflow: hidden;
  border: 1px solid #6f6858;
  border-radius: 0;
  background: #11120f;
}

.fuel-card__gauge span {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #8eaa37, #b8d857);
}

.fuel-card__choices {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.fuel-card__choices button {
  padding: 12px 8px;
  border: 1px solid #817967;
  border-radius: 0;
  color: #eee9dc;
  background: linear-gradient(180deg, #4e4a3f, #292823);
  font: 15px Basic;
  cursor: pointer;
}

.fuel-card__choices button.selected {
  border-color: #d8bf72;
  color: #171711;
  background: linear-gradient(180deg, #d5bd70, #9f812f);
}

.fuel-card__coupon {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 16px;
  padding: 12px;
  border: 2px solid #d8bf72;
  color: #171711;
  background: #fff0a8;
  cursor: pointer;
}

.fuel-card__coupon input {
  width: 18px;
  height: 18px;
  accent-color: #8eaa37;
}

.fuel-card__receipt {
  display: grid;
  margin: 20px 0;
  padding: 16px;
  border: 1px solid #625d50;
  border-radius: 0;
  color: #cfc5aa;
  background: rgb(12 13 10 / 75%);
  gap: 8px;
}

.fuel-card__receipt span,
.fuel-card__receipt strong {
  display: flex;
  justify-content: space-between;
}

.fuel-card__receipt strong {
  padding-top: 10px;
  border-top: 1px dashed #6d6655;
  color: #f3e9cf;
  font-size: 18px;
}

.fuel-card__pay {
  width: 100%;
  padding: 14px;
  border: 1px solid #c7af65;
  border-radius: 0;
  color: #171711;
  background: linear-gradient(180deg, #d5bd70, #9f812f);
  font: 18px Basic;
  cursor: pointer;
}

.fuel-card__pay:disabled {
  border-color: #5f5b50;
  color: #858075;
  background: #302f2a;
  cursor: default;
}
</style>
