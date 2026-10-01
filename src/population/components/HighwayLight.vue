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
    default: "Highway light",
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
    class="highway-light"
    :style="lightStyle"
    :aria-label="`${label}: ${signal}`"
  >
    <span class="highway-light__post" />

    <span class="highway-light__housing">
      <span
        class="highway-light__lamp highway-light__lamp--red"
        :class="{
          'highway-light__lamp--active': signal === 'red',
        }"
      />
      <span
        class="highway-light__lamp highway-light__lamp--yellow"
        :class="{
          'highway-light__lamp--active': signal === 'yellow',
        }"
      />
      <span
        class="highway-light__lamp highway-light__lamp--green"
        :class="{
          'highway-light__lamp--active': signal === 'green',
        }"
      />
    </span>
  </div>
</template>

<style scoped>
.highway-light {
  position: absolute;
  z-index: 3;
  width: 24px;
  height: 42px;
  pointer-events: none;
  transform-origin: center;
}

.highway-light__post {
  position: absolute;
  left: 10px;
  top: 31px;
  width: 4px;
  height: 13px;
  border-radius: 2px;
  background: #20242a;
}

.highway-light__housing {
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

.highway-light__lamp {
  width: 7px;
  height: 7px;
  border: 1px solid #050607;
  border-radius: 50%;
  opacity: 0.22;
}

.highway-light__lamp--red {
  background: #ff3f3f;
}

.highway-light__lamp--yellow {
  background: #ffd84a;
}

.highway-light__lamp--green {
  background: #40e56f;
}

.highway-light__lamp--active {
  opacity: 1;
  box-shadow: 0 0 7px currentColor;
}
</style>
