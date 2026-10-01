<script setup>
defineProps({
  transaction: {
    type: Object,
    required: true,
  },
});
</script>

<template>
  <aside class="economy-feedback" aria-live="polite">
    <strong>{{ transaction.label }}</strong>

    <div
      v-if="transaction.type === 'daily-fees-paid'"
      class="economy-feedback__breakdown"
    >
      <span>
        Garage: -&#8358;{{ transaction.garageFee.toLocaleString() }}
      </span>
      <span>
        Car owner: -&#8358;{{ transaction.carOwnerFee.toLocaleString() }}
      </span>
      <b>
        Total: -&#8358;{{ transaction.amount.toLocaleString() }}
      </b>
    </div>

    <span
      v-else-if="transaction.direction === 'expense'"
      class="economy-feedback__expense"
    >
      -₦{{ transaction.amount.toLocaleString() }}
    </span>

    <span
      v-else-if="false"
      class="economy-feedback__expense"
    >
      -₦{{ transaction.amount.toLocaleString() }}
    </span>

    <span
      v-else-if="false"
      class="economy-feedback__expense"
    >
      -₦{{ transaction.amount.toLocaleString() }}
    </span>
  </aside>
</template>

<style scoped>
.economy-feedback {
  position: absolute;
  top: 88px;
  left: 50%;
  display: grid;
  min-width: 310px;
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
  box-shadow: 0 10px 30px rgb(0 0 0 / 35%);
  gap: 4px;
  font-family: "Basic", sans-serif;
  text-align: center;
  transform: translateX(-50%);
  pointer-events: none;
  z-index: 16;
}

.economy-feedback strong {
  color: #f2c438;
  font-size: 14px;
}

.economy-feedback__expense {
  font-size: 13px;
  font-weight: 900;
}

.economy-feedback__breakdown {
  display: grid;
  gap: 2px;
  font-size: 12px;
}

.economy-feedback__breakdown b {
  margin-top: 3px;
  color: #ffcf45;
}
</style>
