<script setup>
import { computed, ref } from "vue";
import { CHARACTER_DEFINITIONS } from "../../characters/data/characters.js";

const props = defineProps({
  properties: { type: Array, required: true },
  propertyState: { type: Object, required: true },
  money: { type: Number, required: true },
});

const emit = defineEmits(["close", "purchase"]);
const selectedId = ref(
  props.properties.find((property) => property.tenure === "ownership")?.id,
);
const paymentMethod = ref("mortgage");
const selected = computed(() =>
  props.properties.find((property) => property.id === selectedId.value),
);
const owned = computed(() =>
  props.propertyState.ownedPropertyIds.includes(selected.value?.id),
);
const requirementMet = computed(() =>
  !selected.value?.requiresPropertyId ||
  props.propertyState.ownedPropertyIds.includes(selected.value.requiresPropertyId),
);
const priceNow = computed(() =>
  paymentMethod.value === "mortgage"
    ? selected.value?.deposit ?? 0
    : selected.value?.price ?? 0,
);
const canBuy = computed(() =>
  selected.value &&
  !owned.value &&
  requirementMet.value &&
  !props.propertyState.mortgage &&
  props.money >= priceNow.value,
);

const formatMoney = (value) => `₦${Number(value || 0).toLocaleString()}`;
</script>

<template>
  <div class="estate-modal" role="dialog" aria-modal="true" aria-label="Estate agency">
    <section class="estate">
      <button class="estate__close" type="button" @click="emit('close')">×</button>
      <header>
        <img
          class="estate__agent"
          :src="CHARACTER_DEFINITIONS.estateAgent.portraitUrl"
          :alt="CHARACTER_DEFINITIONS.estateAgent.name"
        />
        <span>KEYSTONE ESTATE AGENCY</span>
        <h2>Find your place in Lagos</h2>
        <p>Balance: {{ formatMoney(money) }}</p>
        <p v-if="propertyState.mortgage" class="estate__mortgage">
          Active mortgage:
          {{ formatMoney(propertyState.mortgage.balance) }} remaining ·
          next payment Day {{ propertyState.mortgage.nextDueDay }}
          <template v-if="propertyState.mortgage.arrears">
            · {{ formatMoney(propertyState.mortgage.arrears) }} overdue
          </template>
        </p>
      </header>

      <nav class="estate__tabs">
        <button
          v-for="property in properties.filter((item) => item.tenure === 'ownership')"
          :key="property.id"
          type="button"
          :class="{ active: property.id === selectedId }"
          @click="selectedId = property.id"
        >
          <small>{{ property.district }}</small>
          {{ property.name }}
        </button>
      </nav>

      <div v-if="selected" class="estate__content">
        <div class="estate__visual">
          <i class="fa-solid fa-house-chimney" aria-hidden="true" />
          <span>{{ selected.district }}</span>
        </div>
        <div class="estate__details">
          <h3>{{ selected.name }}</h3>
          <p>{{ selected.description }}</p>
          <ul>
            <li v-for="benefit in selected.benefits" :key="benefit">{{ benefit }}</li>
          </ul>

          <div class="estate__payment-options">
            <button
              type="button"
              :class="{ active: paymentMethod === 'mortgage' }"
              @click="paymentMethod = 'mortgage'"
            >
              <strong>Mortgage</strong>
              <span>{{ formatMoney(selected.deposit) }} deposit</span>
              <small>{{ formatMoney(selected.weeklyPayment) }}/week × {{ selected.mortgageWeeks }}</small>
            </button>
            <button
              type="button"
              :class="{ active: paymentMethod === 'cash' }"
              @click="paymentMethod = 'cash'"
            >
              <strong>Buy outright</strong>
              <span>{{ formatMoney(selected.price) }}</span>
              <small>No weekly payment</small>
            </button>
          </div>

          <p v-if="!requirementMet" class="estate__warning">
            Own the Mainland Terrace before moving into the wealthy estate.
          </p>
          <p v-else-if="propertyState.mortgage && !owned" class="estate__warning">
            Finish your current mortgage before financing another home.
          </p>

          <button
            class="estate__buy"
            type="button"
            :disabled="!canBuy"
            @click="emit('purchase', { propertyId: selected.id, paymentMethod })"
          >
            {{
              owned
                ? "Already owned"
                : money < priceNow
                  ? `Need ${formatMoney(priceNow - money)} more`
                  : `Confirm for ${formatMoney(priceNow)}`
            }}
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.estate-modal {
  position: absolute;
  z-index: 120;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgb(7 16 27 / 76%);
}
.estate {
  position: relative;
  width: min(920px, 95vw);
  max-height: 92vh;
  overflow: auto;
  border: 2px solid #aea68a;
  border-radius: 4px;
  color: #eee9d7;
  background: #282720;
  box-shadow: 0 18px 45px #000b;
}
.estate::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: .25;
  background: repeating-linear-gradient(135deg, #fff1 0 2px, transparent 2px 10px);
}
.estate__close {
  position: absolute;
  z-index: 2;
  top: 14px;
  right: 14px;
  width: 38px;
  height: 38px;
  border: 1px solid #77705d;
  color: #eee9d7;
  background: #39362c;
  font-size: 25px;
}
header { position: relative; padding: 24px 28px 18px; border-bottom: 1px solid #665f4d; }
header span { color: #d9ca92; font-size: 12px; letter-spacing: .14em; }
header h2 { margin: 5px 0; font-size: 30px; }
header p { margin: 0; color: #aaa38d; }
.estate__mortgage { margin-top: 7px; color: #e4cf76; }
.estate__tabs { position: relative; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 14px; }
.estate__tabs button { padding: 13px; border: 1px solid #625c4b; color: #ccc5ae; background: #343229; text-align: left; font: inherit; }
.estate__tabs button.active { border-color: #d7c783; color: #fff; background: #474334; }
.estate__tabs small { display: block; color: #a69d80; font-size: 10px; }
.estate__content { position: relative; display: grid; grid-template-columns: 38% 62%; border-top: 1px solid #665f4d; }
.estate__visual { display: grid; place-items: center; align-content: center; min-height: 340px; color: #e2d49d; background: linear-gradient(#35342d, #1d1c18); gap: 18px; }
.estate > header { position: relative; overflow: hidden; min-height: 116px; padding-right: 132px; }
.estate__agent { position: absolute; right: 12px; bottom: -8px; width: 120px; height: 138px; object-fit: contain; object-position: center bottom; }
.estate__visual i { font-size: 100px; }
.estate__visual span { letter-spacing: .1em; }
.estate__details { padding: 24px; }
.estate__details h3 { margin: 0; font-size: 27px; }
.estate__details p, li { color: #c5bfaa; }
.estate__payment-options { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 20px 0; }
.estate__payment-options button { display: grid; padding: 14px; border: 1px solid #625c4b; color: #eee9d7; background: #302e26; text-align: left; gap: 4px; }
.estate__payment-options button.active { border-color: #d9c66f; background: #45402e; }
.estate__payment-options span { color: #e4cf76; font-size: 17px; }
.estate__payment-options small { color: #aaa38d; }
.estate__warning { color: #efb26c !important; }
.estate__buy { width: 100%; padding: 14px; border: 1px solid #f3df87; color: #201d12; background: #d8c363; font: 17px Basic, sans-serif; }
.estate__buy:disabled { border-color: #656052; color: #969080; background: #444137; }
@media (max-width: 700px) {
  .estate__content { grid-template-columns: 1fr; }
  .estate__visual { min-height: 150px; }
  .estate__visual i { font-size: 60px; }
}
</style>
