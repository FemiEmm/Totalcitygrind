<script setup>
import { computed } from "vue";

const props = defineProps({
  angle: {
    type: Number,
    required: true,
  },
  targetLabel: {
    type: String,
    required: true,
  },
  distance: {
    type: Number,
    required: true,
  },
  vehicleType: {
    type: String,
    default: "danfo",
  },
});

const normalizedAngle = computed(() => {
  return ((props.angle % 360) + 360) % 360;
});

const heading = computed(() => {
  const directions = ["E", "SE", "S", "SW", "W", "NW", "N", "NE"];
  return directions[Math.round(normalizedAngle.value / 45) % directions.length];
});

const markerStyle = computed(() => ({
  left: `${18 + (normalizedAngle.value / 360) * 64}%`,
}));

const distanceLabel = computed(() => {
  if (props.distance >= 1000) {
    return `${(props.distance / 1000).toFixed(1)} km`;
  }

  return `${Math.max(10, Math.round(props.distance / 10) * 10)} m`;
});
</script>

<template>
  <aside class="route-navigation" aria-label="Next bus stop navigation">
    <div class="route-navigation__heading">
      <span>S</span>
      <strong>{{ heading }}</strong>
      <span>N</span>
    </div>

    <div class="route-navigation__tape" aria-hidden="true">
      <i v-for="index in 31" :key="index" :class="{ major: index % 5 === 1 }" />
      <b :style="markerStyle">
        <i class="fa-solid fa-location-dot" />
      </b>
    </div>

    <div class="route-navigation__destination">
      <i class="fa-solid fa-location-dot" aria-hidden="true" />
      <span>
        <small>NEXT STOP</small>
        <strong>{{ targetLabel }}</strong>
      </span>
      <em>{{ distanceLabel }}</em>
    </div>
  </aside>
</template>

<style scoped>
.route-navigation {
  position: absolute;
  z-index: 5000;
  top: 12px;
  left: 50%;
  width: min(430px, 42vw);
  color: #ddd3b8;
  font-family: "Basic", sans-serif;
  pointer-events: none;
  filter: none;
  transform: translateX(-50%);
}

.route-navigation__heading {
  display: grid;
  grid-template-columns: 1fr 42px 1fr;
  align-items: end;
  color: #918873;
  font-size: 11px;
  text-align: center;
}

.route-navigation__heading strong {
  color: #dfc987;
  font-size: 19px;
  line-height: 1;
}

.route-navigation__heading span:first-child {
  text-align: right;
}

.route-navigation__heading span:last-child {
  text-align: left;
}

.route-navigation__tape {
  position: relative;
  display: flex;
  height: 13px;
  align-items: start;
  justify-content: space-between;
  margin-top: 4px;
  border-right: 2px solid #a89d81;
  border-left: 2px solid #a89d81;
  background: linear-gradient(90deg, transparent, rgb(18 18 15 / 65%) 20% 80%, transparent);
}

.route-navigation__tape > i {
  width: 1px;
  height: 5px;
  background: #a69d84;
}

.route-navigation__tape > i.major {
  height: 10px;
  background: #d6c89f;
}

.route-navigation__tape > b {
  position: absolute;
  top: -4px;
  display: grid;
  width: 18px;
  height: 18px;
  color: #df3d35;
  background: transparent;
  font-size: 17px;
  place-items: center;
  filter: none;
  transform: translateX(-50%);
}

.route-navigation__destination {
  display: grid;
  grid-template-columns: 28px 1fr auto;
  align-items: center;
  width: min(280px, 80%);
  min-height: 38px;
  margin: 3px auto 0;
  padding: 5px 9px;
  border: 1px solid #756e5d;
  background:
    repeating-linear-gradient(135deg, rgb(255 255 255 / 2%) 0 2px, transparent 2px 8px),
    linear-gradient(180deg, rgb(57 54 47 / 91%), rgb(27 27 23 / 95%));
  box-shadow: var(--hud-shadow);
  clip-path: polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px);
}

.route-navigation__destination > i {
  color: #e0443b;
  font-size: 18px;
  filter: none;
}

.route-navigation__destination > span {
  display: grid;
  min-width: 0;
}

.route-navigation__destination small {
  color: #97907d;
  font-size: 7px;
  font-weight: 900;
  letter-spacing: 0.1em;
}

.route-navigation__destination strong {
  overflow: hidden;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.route-navigation__destination em {
  color: #b8cc70;
  font-size: 10px;
  font-style: normal;
  font-weight: 900;
}

@media (max-width: 780px) {
  .route-navigation {
    top: 72px;
    width: min(430px, 72vw);
  }
}
</style>
