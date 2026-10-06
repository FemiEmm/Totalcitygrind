<script setup>
import { computed } from "vue";

const props = defineProps({
  activityLabel:{type:String,default:null},
  route: {
    type: Object,
    default: null,
  },
  currentStop: {
    type: Object,
    default: null,
  },
  followingStop: {
    type: Object,
    default: null,
  },
  currentStopIndex: {
    type: Number,
    required: true,
  },
  holdProgress: {
    type: Number,
    required: true,
  },
  insideStop: {
    type: Boolean,
    required: true,
  },
  speedAllowed: {
    type: Boolean,
    required: true,
  },
});

const progressText = computed(() => {
  if (!props.route) {
    return "0 / 0";
  }

  return `${Math.min(props.currentStopIndex + 1, props.route.stopIds.length)} / ${props.route.stopIds.length}`;
});

const instruction = computed(() => {
  if (!props.speedAllowed) {
    return "Slow down";
  }

  return props.activityLabel || "Boarding passengers";
});
</script>

<template>
  <aside
    v-if="route"
    class="route-hud"
    :class="{ 'route-hud--loading': insideStop }"
    :aria-label="activityLabel ? 'Waste collection progress' : 'Danfo route progress'"
  >
    <header class="route-hud__header">
      <span class="route-hud__route-id">{{ route.id }}</span>
      <div>
        <strong>{{ route.name }}</strong>
        <small v-if="!activityLabel">STOP {{ progressText }}</small>
      </div>
    </header>

    <div v-if="insideStop" class="route-hud__action">
      <strong>{{ instruction }}</strong>
      <div class="route-hud__hold" :aria-label="activityLabel ? 'Waste collection progress' : 'Passenger loading progress'">
        <span :style="{ width: `${holdProgress * 100}%` }" />
      </div>
    </div>
  </aside>
</template>

<style scoped>
.route-hud {
  position: absolute;
  z-index: 5000;
  top: 104px;
  left: 50%;
  display: grid;
  grid-template-columns: 1fr;
  width: min(260px, calc(100% - 430px));
  min-width: 230px;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid var(--hud-metal);
  border-radius: 0;
  color: #ffffff;
  background:
    repeating-linear-gradient(135deg, rgb(255 255 255 / 2%) 0 2px, transparent 2px 8px),
    linear-gradient(180deg, var(--hud-panel), var(--hud-panel-deep));
  box-shadow: var(--hud-shadow);
  font-family: "Basic", sans-serif;
  pointer-events: none;
  transform: translateX(-50%);
  clip-path: polygon(9px 0, 100% 0, 100% calc(100% - 9px), calc(100% - 9px) 100%, 0 100%, 0 9px);
}

.route-hud__header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.route-hud__header > div {
  display: grid;
  gap: 2px;
}

.route-hud--loading {
  grid-template-columns: 1fr minmax(130px, 0.65fr);
  width: min(390px, calc(100% - 430px));
  min-width: 310px;
}

.route-hud__header small {
  font-size: 11px;
  opacity: 0.68;
}

.route-hud__route-id {
  display: grid;
  min-width: 38px;
  height: 34px;
  border: 1px solid #d0b45e;
  border-radius: 2px;
  color: #17200f;
  background: linear-gradient(180deg, #a6c94c, #5f7d22);
  font-weight: 900;
  place-items: center;
}

.route-hud__action {
  display: grid;
  min-width: 0;
  gap: 5px;
}

.route-hud__action > strong {
  overflow: hidden;
  font-size: 12px;
  font-weight: 800;
  color: #b3d66a;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.route-hud__hold {
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  border: 1px solid #615b4c;
  border-radius: 1px;
  background: #171713;
}

@media (max-width: 1100px) {
  .route-hud {
    top: 116px;
    width: min(250px, calc(100% - 300px));
    min-width: 220px;
  }

  .route-hud--loading {
    width: min(370px, calc(100% - 300px));
    min-width: 290px;
  }
}

.route-hud__hold span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #7cad2c;
  transition: width 80ms linear;
}
.route-hud.route-hud--collection{top:auto;bottom:112px;width:min(340px,calc(100% - 24px));min-width:0;grid-template-columns:1fr;gap:6px;box-sizing:border-box}.route-hud--collection .route-hud__header strong{white-space:normal;overflow-wrap:anywhere}
</style>
