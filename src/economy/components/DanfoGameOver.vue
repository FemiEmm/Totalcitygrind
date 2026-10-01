<script setup>
defineProps({
  money: {
    type: Number,
    required: true,
  },
  garageFee: {
    type: Number,
    required: true,
  },
  carOwnerFee: {
    type: Number,
    required: true,
  },
});
</script>

<template>
  <section class="game-over" aria-label="Game over">
    <div class="game-over__panel">
      <span>GAME OVER</span>
      <h2>Daily fees unpaid</h2>
      <div class="game-over__fees">
        <span>Garage fee: &#8358;{{ garageFee.toLocaleString() }}</span>
        <span>Car owner fee: &#8358;{{ carOwnerFee.toLocaleString() }}</span>
        <strong>
          Total due: &#8358;{{ (garageFee + carOwnerFee).toLocaleString() }}
        </strong>
        <small>You had &#8358;{{ money.toLocaleString() }} at midnight.</small>
      </div>
    </div>
  </section>
</template>

<style scoped>
.game-over {
  position: absolute;
  inset: 0;
  display: grid;
  background: rgb(6 27 67 / 72%);
  place-items: center;
  z-index: 30;
}

.game-over__panel {
  width: min(440px, calc(100% - 32px));
  padding: 28px;
  border: 3px solid #ff9f91;
  border-radius: 18px;
  color: #ffffff;
  background: linear-gradient(180deg, #b23c48, #6d1730);
  box-shadow: var(--game-panel-shadow);
  text-align: center;
}

.game-over__panel span {
  color: #ffcf45;
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 0.14em;
}

.game-over__panel h2 {
  margin: 8px 0;
  font-size: 30px;
}

.game-over__panel p {
  margin: 0;
  line-height: 1.5;
}

.game-over__fees {
  display: grid;
  gap: 7px;
  margin-top: 14px;
}

.game-over__fees strong {
  color: #ffcf45;
}

.game-over__fees small {
  margin-top: 5px;
  color: #f1dede;
}
</style>
