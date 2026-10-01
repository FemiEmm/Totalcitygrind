<script setup>
import { computed } from "vue";

const props = defineProps({
  x: {
    type: Number,
    required: true,
  },
  y: {
    type: Number,
    required: true,
  },
  rotation: {
    type: Number,
    default: 0,
  },
  scale: {
    type: Number,
    default: 1,
  },
  signal: {
    type: String,
    required: true,
  },
  label: {
    type: String,
    default: "Traffic light",
  },
});

const lightStyle = computed(() => {
  return {
    left: `${props.x}px`,
    top: `${props.y}px`,
    transform:
      `translate(-50%, -50%) ` +
      `rotate(${props.rotation}rad) ` +
      `scale(${props.scale})`,
  };
});
</script>

<template>
  <div
    class="traffic-light"
    :style="lightStyle"
    :aria-label="`${label}: ${signal}`"
  >
    <span class="traffic-light__post" />

    <span class="traffic-light__housing">
      <span
        class="traffic-light__lamp traffic-light__lamp--red"
        :class="{
          'traffic-light__lamp--active': signal === 'red',
        }"
      />
      <span
        class="traffic-light__lamp traffic-light__lamp--yellow"
        :class="{
          'traffic-light__lamp--active': signal === 'yellow',
        }"
      />
      <span
        class="traffic-light__lamp traffic-light__lamp--green"
        :class="{
          'traffic-light__lamp--active': signal === 'green',
        }"
      />
    </span>
  </div>
</template>

<style scoped>
.traffic-light {
  position: absolute;
  z-index: 3;
  width: 24px;
  height: 42px;
  pointer-events: none;
  transform-origin: center;
}

.traffic-light__post {
  position: absolute;
  left: 10px;
  top: 31px;
  width: 4px;
  height: 13px;
  border-radius: 2px;
  background: #20242a;
}

.traffic-light__housing {
  position: absolute;
  inset: 0 3px 9px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-evenly;
  padding: 3px;
  border: 2px solid #08090b;
  border-radius: 5px;
  background: #252a31;
  box-shadow: 0 2px 0 rgb(0 0 0 / 35%);
}

.traffic-light__lamp {
  width: 7px;
  height: 7px;
  border: 1px solid #050607;
  border-radius: 50%;
  opacity: 0.22;
}

.traffic-light__lamp--red {
  background: #ff3f3f;
}

.traffic-light__lamp--yellow {
  background: #ffd84a;
}

.traffic-light__lamp--green {
  background: #40e56f;
}

.traffic-light__lamp--active {
  opacity: 1;
  box-shadow: 0 0 7px currentColor;
}
</style>
