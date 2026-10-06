<script setup>
import { computed, ref } from "vue";

import { playGameSound } from "../../audio/gameAudio.js";

const emit = defineEmits(["finish", "skip"]);
const currentStep = ref(0);

const steps = Object.freeze([
  {
    title: "Health and energy",
    copy: "Health falls after hard collisions. Energy drains through the day and can be restored with food or sleep.",
    icon: "fa-heart-pulse",
    side: "right",
    spotlight: {
      top: "10px",
      left: "10px",
      width: "226px",
      height: "102px",
    },
  },
  {
    title: "Driver dashboard",
    copy: "Watch speed, gear, fuel and damage. Use START (I on keyboard) to start the engine. On phones, hold the left arrows to steer and THROTTLE to accelerate. BRAKE / R slows or reverses; GEAR − / + shifts manual vehicles.",
    icon: "fa-gauge-high",
    side: "top",
    spotlight: {
      bottom: "9px",
      left: "10px",
      width: "340px",
      height: "132px",
    },
  },
  {
    title: "Route guidance",
    copy: "When you take a Danfo or BRT job, your current stop, next stop and loading progress appear here.",
    icon: "fa-route",
    side: "left",
    spotlight: {
      top: "10px",
      right: "10px",
      width: "322px",
      height: "176px",
    },
  },
  {
    title: "Your phone",
    copy: "Use the phone for jobs, navigation, MegaPay, inventory, messages and debugging. It always remains available.",
    icon: "fa-mobile-screen-button",
    side: "left",
    spotlight: {
      right: "8px",
      bottom: "8px",
      width: "108px",
      height: "108px",
    },
  },
  {
    title: "Pause whenever you need",
    copy: "Press Escape or the Pause button. The player, traffic, clock, jobs, fuel and energy all stop until you resume.",
    icon: "fa-pause",
    side: "left",
    spotlight: {
      top: "9px",
      right: "337px",
      width: "60px",
      height: "60px",
    },
  },
]);

const step = computed(() => steps[currentStep.value]);
const progress = computed(
  () => `${currentStep.value + 1} / ${steps.length}`,
);
const isLastStep = computed(
  () => currentStep.value === steps.length - 1,
);

function nextStep() {
  playGameSound("buttonClick");

  if (isLastStep.value) {
    emit("finish");
    return;
  }

  currentStep.value += 1;
}

function skipTour() {
  playGameSound("buttonClick");
  emit("skip");
}
</script>

<template>
  <section class="game-tour" aria-label="Game interface tour">
    <div
      class="game-tour__spotlight"
      :style="step.spotlight"
      aria-hidden="true"
    />

    <article
      class="game-tour__card"
      :class="`game-tour__card--${step.side}`"
    >
      <header>
        <span>
          <i class="fa-solid" :class="step.icon" aria-hidden="true" />
        </span>
        <small>QUICK TOUR · {{ progress }}</small>
      </header>
      <h2>{{ step.title }}</h2>
      <p>{{ step.copy }}</p>

      <footer>
        <button type="button" class="game-tour__skip" @click="skipTour">
          Skip tour
        </button>
        <button type="button" class="game-tour__next" @click="nextStep">
          {{ isLastStep ? "Start driving" : "Next" }}
          <i
            class="fa-solid"
            :class="isLastStep ? 'fa-check' : 'fa-arrow-right'"
            aria-hidden="true"
          />
        </button>
      </footer>
    </article>
  </section>
</template>

<style scoped>
.game-tour {
  position: absolute;
  z-index: 11000;
  inset: 0;
  overflow: hidden;
  font-family: "Basic", sans-serif;
}

.game-tour__spotlight {
  position: absolute;
  border: 3px solid #ffd348;
  border-radius: 18px;
  box-shadow:
    0 2px 8px rgb(23 33 58 / 10%);
  pointer-events: none;
  transition: all 260ms ease;
}

.game-tour__card {
  position: absolute;
  width: min(390px, calc(100vw - 32px));
  padding: 22px;
  border: 2px solid #8bcbff;
  border-radius: 20px;
  color: #ffffff;
  background: linear-gradient(150deg, #2875ca, #0a347a);
  box-shadow: var(--game-panel-shadow);
}

.game-tour__card--right {
  top: 50%;
  right: 7vw;
  transform: translateY(-50%);
}

.game-tour__card--left {
  top: 50%;
  left: 7vw;
  transform: translateY(-50%);
}

.game-tour__card--top {
  top: 9vh;
  left: 50%;
  transform: translateX(-50%);
}

.game-tour__card header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.game-tour__card header span {
  display: grid;
  width: 38px;
  height: 38px;
  border-radius: 11px;
  color: #18345e;
  background: var(--game-gold);
  place-items: center;
}

.game-tour__card header small {
  color: #a9d6ff;
  font-weight: 900;
  letter-spacing: 0.12em;
}

.game-tour__card h2 {
  margin: 15px 0 7px;
  font-size: 27px;
}

.game-tour__card p {
  margin: 0;
  color: #d9edff;
  line-height: 1.5;
}

.game-tour__card footer {
  display: flex;
  justify-content: space-between;
  margin-top: 22px;
  gap: 12px;
}

.game-tour__card button {
  min-height: 42px;
  padding: 8px 15px;
  border-radius: 11px;
  font-weight: 900;
  cursor: pointer;
}

.game-tour__skip {
  border: 1px solid #73b6ef;
  color: #d9edff;
  background: #124786;
}

.game-tour__next {
  display: flex;
  align-items: center;
  border: 1px solid #ffe27a;
  color: #27324a;
  background: var(--game-gold);
  gap: 9px;
}

@media (max-width: 720px) {
  .game-tour__card {
    right: auto;
    bottom: 18px;
    left: 50%;
    top: auto;
    transform: translateX(-50%);
  }
}
</style>
