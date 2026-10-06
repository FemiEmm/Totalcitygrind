<script setup>
import { computed } from "vue";

const props = defineProps({
  occupiedSeats: {
    type: Number,
    required: true,
  },
  capacity: {
    type: Number,
    required: true,
  },
});

const passengerSeats = computed(() =>
  Array.from(
    { length: props.capacity },
    (_, index) => index < props.occupiedSeats,
  ),
);
</script>

<template>
  <aside
    class="occupancy-hud"
    aria-label="Player vehicle passenger occupancy"
  >
    <header>
      <i class="fa-solid fa-people-group" aria-hidden="true" />
      <strong>{{ occupiedSeats }} / {{ capacity }}</strong>
    </header>

    <div class="occupancy-hud__vehicle">
      <div class="occupancy-hud__windshield" aria-hidden="true" />

      <div class="occupancy-hud__front">
        <span class="occupancy-hud__seat occupancy-hud__seat--driver">
          <i class="fa-solid fa-dharmachakra" aria-hidden="true" />
        </span>
        <span
          class="occupancy-hud__seat"
          :class="{
            'occupancy-hud__seat--occupied': passengerSeats[0],
          }"
        />
        <span
          class="occupancy-hud__seat"
          :class="{
            'occupancy-hud__seat--occupied': passengerSeats[1],
          }"
        />
      </div>

      <div class="occupancy-hud__passengers">
        <span
          v-for="(occupied, index) in passengerSeats.slice(2)"
          :key="index"
          class="occupancy-hud__seat"
          :class="{ 'occupancy-hud__seat--occupied': occupied }"
        />
      </div>
    </div>
  </aside>
</template>

<style scoped>
.occupancy-hud {
  position: absolute;
  z-index: 5000;
  top: 118px;
  left: 16px;
  display: grid;
  width: 126px;
  max-height: calc(100vh - 280px);
  padding: 8px;
  overflow: hidden;
  border: 1px solid var(--hud-metal);
  border-radius: 0;
  color: #ffffff;
  background:
    repeating-linear-gradient(135deg, rgb(255 255 255 / 2%) 0 2px, transparent 2px 8px),
    linear-gradient(180deg, var(--hud-panel), var(--hud-panel-deep));
  box-shadow: var(--hud-shadow);
  font-family: "Basic", sans-serif;
  gap: 6px;
  pointer-events: none;
  clip-path: polygon(7px 0, 100% 0, 100% calc(100% - 7px), calc(100% - 7px) 100%, 0 100%, 0 7px);
}

.occupancy-hud header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 5px;
  border-bottom: 1px solid #6e6756;
  color: #d1c39a;
  font-size: 9px;
}

.occupancy-hud header strong {
  color: #ffffff;
  font-size: 11px;
}

.occupancy-hud__front,
.occupancy-hud__passengers {
  display: grid;
  gap: 4px;
}

.occupancy-hud__front {
  grid-template-columns: repeat(3, 18px);
  justify-content: space-between;
}

.occupancy-hud__passengers {
  grid-template-columns: repeat(4, 18px);
  justify-content: space-between;
  overflow: hidden auto;
  padding-right: 0;
}

.occupancy-hud__vehicle {
  position: relative;
  display: grid;
  padding: 6px 8px 8px;
  border: 2px solid #77705f;
  border-radius: 18px 18px 6px 6px;
  background:
    linear-gradient(90deg, rgb(255 255 255 / 3%), transparent 20% 80%, rgb(255 255 255 / 3%)),
    #1b1b17;
  gap: 5px;
  box-shadow: none;
}

.occupancy-hud__windshield {
  height: 7px;
  border: 1px solid #746e5e;
  border-radius: 8px 8px 2px 2px;
  background: linear-gradient(180deg, #46483f, #20241f);
}

.occupancy-hud__seat {
  width: 18px;
  height: 18px;
  box-sizing: border-box;
  border: 1px solid #6e6756;
  border-radius: 2px;
  background:
    linear-gradient(180deg, #3c3931 0 68%, #211f1a 69%);
  box-shadow: none;
}

.occupancy-hud__seat--occupied {
  border-color: #b1cf60;
  background: #779c34;
  animation: occupancy-seat-enter 360ms
    cubic-bezier(0.2, 1.5, 0.4, 1);
}

.occupancy-hud__seat--driver {
  display: grid;
  border-color: #a68e4b;
  color: #ddd3b8;
  background: linear-gradient(180deg, #5b5030, #302918);
  font-size: 9px;
  font-weight: 900;
  place-items: center;
}

@keyframes occupancy-seat-enter {
  0% {
    opacity: 0.25;
    transform: scale(0.45);
  }

  62% {
    opacity: 1;
    transform: scale(1.2);
  }

  100% {
    transform: scale(1);
  }
}
</style>
