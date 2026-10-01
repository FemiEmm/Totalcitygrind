<script setup>
import { CHARACTER_DEFINITIONS } from "../../characters/data/characters.js";

defineProps({
  serviceType: {
    type: String,
    required: true,
  },
  cost: {
    type: Number,
    required: true,
  },
  speedAllowed: {
    type: Boolean,
    required: true,
  },
  discountCoupons: {
    type: Number,
    default: 0,
  },
});
</script>

<template>
  <aside class="service-prompt">
    <template v-if="serviceType === 'fuel'">
      <strong>FUEL PUMP</strong>
      <span v-if="!speedAllowed">STOP INSIDE THE PUMP CIRCLE</span>
      <span v-else-if="cost > 0">AUTO REFUEL · ₦{{ cost.toLocaleString() }}</span>
      <span v-else>FUEL TANK FULL</span>
    </template>

    <template v-else>
      <img
        class="service-prompt__portrait"
        :src="CHARACTER_DEFINITIONS.mechanic.portraitUrl"
        alt=""
      />
      <strong>MECHANIC</strong>
      <span v-if="!speedAllowed">STOP FOR REPAIRS</span>
      <span v-else-if="cost > 0">PRESS R · REPAIR ₦{{ cost.toLocaleString() }}</span>
      <span v-if="speedAllowed && cost > 0 && discountCoupons > 0" class="service-prompt__coupon">
        PRESS V · USE 50% COUPON ({{ discountCoupons }})
      </span>
      <span v-else>NO REPAIRS NEEDED</span>
    </template>
  </aside>
</template>

<style scoped>
.service-prompt {
  position: absolute;
  z-index: 5100;
  right: auto;
  bottom: 82px;
  left: 50%;
  display: grid;
  min-width: 290px;
  min-height: 62px;
  padding: 10px 16px;
  border: 1px solid var(--hud-metal-light);
  color: #eee9dc;
  background:
    repeating-linear-gradient(
      135deg,
      rgb(255 255 255 / 2%) 0 2px,
      transparent 2px 9px
    ),
    linear-gradient(150deg, rgb(67 63 53 / 98%), rgb(24 24 20 / 98%));
  box-shadow: var(--hud-shadow), 0 16px 36px rgb(0 0 0 / 45%);
  clip-path: polygon(
    8px 0,
    100% 0,
    100% calc(100% - 8px),
    calc(100% - 8px) 100%,
    0 100%,
    0 8px
  );
  gap: 2px;
  font-size: 12px;
  pointer-events: none;
  transform: translateX(-50%);
}

.service-prompt:has(.service-prompt__portrait) {
  min-height: 66px;
  padding-left: 72px;
}

.service-prompt__portrait {
  position: absolute;
  left: 4px;
  bottom: 0;
  width: 66px;
  height: 72px;
  object-fit: contain;
  object-position: center bottom;
}

.service-prompt__coupon {
  margin-top: 3px;
  color: #fff0a8;
  font-weight: 900;
}

.service-prompt strong {
  color: #d8bf72;
  font-size: 13px;
  letter-spacing: 0.08em;
}
</style>
