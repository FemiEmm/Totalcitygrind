<script setup>
import { computed, ref } from "vue";

const props = defineProps({
  vehicles: { type: Array, required: true },
  ownedVehicleIds: { type: Array, required: true },
  money: { type: Number, required: true },
});

const emit = defineEmits(["close", "purchase"]);
const selectedIndex = ref(0);
const selectedVehicle = computed(() => props.vehicles[selectedIndex.value]);

function formatMoney(value) {
  return `₦${value.toLocaleString()}`;
}

function selectOffset(offset) {
  selectedIndex.value =
    (selectedIndex.value + offset + props.vehicles.length) %
    props.vehicles.length;
}
</script>

<template>
  <div class="service-modal" role="dialog" aria-modal="true" aria-label="Car dealership">
    <section class="dealership">
      <button class="dealership__close" type="button" @click="emit('close')">×</button>
      <header>
        <span>LAGOS MOTOR HOUSE</span>
        <h2>Choose your next car</h2>
      </header>

      <div class="dealership__hero">
        <img
          :src="selectedVehicle.showroomUrl"
          :alt="selectedVehicle.name"
          decoding="async"
          fetchpriority="low"
        >
        <button type="button" aria-label="Previous car" @click="selectOffset(-1)">‹</button>
        <button type="button" aria-label="Next car" @click="selectOffset(1)">›</button>
      </div>

      <div class="dealership__details">
        <span>
          <small>{{ selectedVehicle.transmission.toUpperCase() }}</small>
          <h3>{{ selectedVehicle.name }}</h3>
        </span>
        <strong>{{ formatMoney(selectedVehicle.price) }}</strong>
      </div>

      <div class="dealership__selector">
        <button
          v-for="(vehicle, index) in vehicles"
          :key="vehicle.id"
          type="button"
          :class="{ selected: index === selectedIndex }"
          @click="selectedIndex = index"
        >
          <img
            :src="vehicle.spriteUrl"
            alt=""
            loading="lazy"
            decoding="async"
          >
          <span>{{ vehicle.name }}</span>
        </button>
      </div>

      <button
        class="dealership__buy"
        type="button"
        :disabled="
          ownedVehicleIds.includes(selectedVehicle.id) ||
          money < selectedVehicle.price
        "
        @click="emit('purchase', selectedVehicle.id)"
      >
        {{
          ownedVehicleIds.includes(selectedVehicle.id)
            ? "Already owned"
            : money < selectedVehicle.price
              ? `Need ${formatMoney(selectedVehicle.price - money)} more`
              : `Buy for ${formatMoney(selectedVehicle.price)}`
        }}
      </button>
    </section>
  </div>
</template>

<style scoped>
.service-modal {
  position: absolute;
  z-index: 20;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgb(6 27 67 / 68%);
}

.dealership {
  position: relative;
  width: min(900px, 95vw);
  max-height: 92vh;
  overflow: auto;
  border: 3px solid var(--game-panel-border);
  border-radius: 22px;
  color: #f7f9ff;
  background: linear-gradient(180deg, #246cc2, #0b3479);
  box-shadow: var(--game-panel-shadow);
}

.dealership__close {
  position: absolute;
  z-index: 2;
  top: 16px;
  right: 18px;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 50%;
  color: #fff;
  background: #174c94;
  font: 27px Basic;
}

.dealership header {
  padding: 24px 28px 16px;
}

.dealership header span {
  color: #ffbd42;
  font-size: 12px;
  letter-spacing: 0.14em;
}

.dealership h2 {
  margin: 4px 0 0;
  font-size: 30px;
}

.dealership__hero {
  position: relative;
  height: min(42vh, 430px);
  overflow: hidden;
  background: #d8ecff;
}

.dealership__hero img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.dealership__hero button {
  position: absolute;
  top: 50%;
  width: 48px;
  height: 62px;
  border: 0;
  border-radius: 12px;
  color: #fff;
  background: rgb(10 54 125 / 86%);
  font: 38px Basic;
  transform: translateY(-50%);
}

.dealership__hero button:first-of-type {
  left: 16px;
}

.dealership__hero button:last-of-type {
  right: 16px;
}

.dealership__details {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 28px;
}

.dealership__details h3 {
  margin: 2px 0;
  font-size: 28px;
}

.dealership__details small {
  color: var(--game-blue-200);
  letter-spacing: 0.12em;
}

.dealership__details > strong {
  color: #ffca5d;
  font-size: 28px;
}

.dealership__selector {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  padding: 0 20px;
  gap: 8px;
}

.dealership__selector button {
  display: grid;
  min-width: 0;
  padding: 8px;
  border: 1px solid #78bbff;
  border-radius: 13px;
  color: #ffffff;
  background: #12468d;
  gap: 4px;
  font: 12px Basic;
}

.dealership__selector button.selected {
  border-color: #ffbd42;
  color: #fff;
  background: #0b2f70;
}

.dealership__selector img {
  width: 100%;
  height: 58px;
  object-fit: contain;
}

.dealership__buy {
  width: calc(100% - 48px);
  margin: 18px 24px 24px;
  padding: 15px;
  border: 0;
  border-radius: 14px;
  color: #201400;
  background: #ffbd42;
  font: 18px Basic;
}

.dealership__buy:disabled {
  color: #778391;
  background: #56718e;
}

@media (max-width: 700px) {
  .dealership__selector {
    grid-template-columns: repeat(3, 1fr);
  }

  .dealership__hero {
    height: 260px;
  }
}
</style>
