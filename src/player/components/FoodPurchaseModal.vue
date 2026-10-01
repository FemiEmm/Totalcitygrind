<script setup>
defineProps({
  sellerLabel: {
    type: String,
    default: "Food shop",
  },
  items: {
    type: Array,
    default: () => [],
  },
  money: {
    type: Number,
    required: true,
  },
  energy: {
    type: Number,
    required: true,
  },
});

const emit = defineEmits(["close", "purchase"]);

function formatMoney(value) {
  return `₦${value.toLocaleString()}`;
}
</script>

<template>
  <section class="service-modal" aria-label="Buy food">
    <div class="service-modal__panel">
      <header>
        <span>FOOD AND ENERGY</span>
        <h2>{{ sellerLabel }}</h2>
        <p>
          Energy {{ Math.round(energy) }}% · Purchases go to My Stuff
        </p>
      </header>

      <div class="service-modal__items">
        <button
          v-for="item in items"
          :key="item.id"
          type="button"
          :disabled="money < item.price"
          @click="emit('purchase', item.id)"
        >
          <img :src="item.imageUrl" :alt="item.label">
          <span>
            <strong>{{ item.label }}</strong>
            <small>{{ item.description }}</small>
          </span>
          <b>+{{ item.energy }}</b>
          <em>{{ formatMoney(item.price) }}</em>
        </button>
      </div>

      <button class="service-modal__close" type="button" @click="emit('close')">
        Leave
      </button>
    </div>
  </section>
</template>

<style scoped>
.service-modal {
  position: absolute;
  inset: 0;
  z-index: 40;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgb(4 8 12 / 74%);
  font-family: "Basic", sans-serif;
}

.service-modal__panel {
  width: min(560px, 94vw);
  max-height: 86vh;
  overflow: auto;
  padding: 24px;
  border: 2px solid #d8c79d;
  border-radius: 18px;
  background: #f5f0e4;
  color: #17201e;
  box-shadow: 0 24px 70px rgb(0 0 0 / 50%);
}

header span {
  color: #ad7114;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.14em;
}

header h2,
header p {
  margin: 6px 0 0;
}

.service-modal__items {
  display: grid;
  gap: 9px;
  margin: 20px 0;
}

.service-modal__items button {
  display: grid;
  grid-template-columns: 64px 1fr auto auto;
  align-items: center;
  gap: 14px;
  padding: 13px;
  border: 1px solid #c9b98f;
  border-radius: 11px;
  background: #ffffff;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.service-modal__items img {
  width: 58px;
  height: 58px;
  object-fit: contain;
}

.service-modal__items span {
  display: grid;
}

.service-modal__items small {
  color: #66706d;
}

.service-modal__items b {
  color: #23904a;
}

.service-modal__items em {
  font-style: normal;
  font-weight: 900;
}

.service-modal__items button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.service-modal__close {
  width: 100%;
  padding: 11px;
  border: 0;
  border-radius: 9px;
  background: #1b2825;
  color: #ffffff;
  font: inherit;
  cursor: pointer;
}
</style>
