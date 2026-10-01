<script setup>
defineProps({
  character: {
    type: Object,
    required: true,
  },
  eyebrow: {
    type: String,
    default: "NEW CONTACT",
  },
  title: {
    type: String,
    default: "",
  },
  message: {
    type: String,
    required: true,
  },
  incomingCall: {
    type: Boolean,
    default: false,
  },
});

defineEmits(["accept", "decline", "close"]);
</script>

<template>
  <div
    class="character-encounter"
    role="dialog"
    aria-modal="true"
    :aria-label="incomingCall ? `Incoming call from ${character.name}` : character.name"
  >
    <div class="character-encounter__backdrop" />

    <article
      class="character-encounter__card"
      :class="{ 'character-encounter__card--call': incomingCall }"
    >
      <div class="character-encounter__portrait-frame">
        <img
          :src="character.portraitUrl"
          :alt="character.name"
          class="character-encounter__portrait"
        />
      </div>

      <div class="character-encounter__copy">
        <small>{{ eyebrow }}</small>
        <h2>{{ title || character.name }}</h2>
        <span>{{ character.role }}</span>
        <p>{{ message }}</p>

        <div v-if="incomingCall" class="character-encounter__call-actions">
          <button
            type="button"
            class="character-encounter__call-button character-encounter__call-button--decline"
            aria-label="Decline race"
            @click="$emit('decline')"
          >
            <i class="fa-solid fa-phone-slash" aria-hidden="true" />
            Decline
          </button>

          <button
            type="button"
            class="character-encounter__call-button character-encounter__call-button--accept"
            aria-label="Accept race"
            @click="$emit('accept')"
          >
            <i class="fa-solid fa-phone" aria-hidden="true" />
            Accept race
          </button>
        </div>

        <button
          v-else
          type="button"
          class="character-encounter__continue"
          @click="$emit('close')"
        >
          Continue
          <i class="fa-solid fa-chevron-right" aria-hidden="true" />
        </button>
      </div>
    </article>
  </div>
</template>

<style scoped>
.character-encounter {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 24px;
  z-index: 100000;
}

.character-encounter__backdrop {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 50% 45%, rgb(12 28 43 / 38%), rgb(3 8 13 / 88%)),
    rgb(4 9 14 / 74%);
  backdrop-filter: blur(4px);
}

.character-encounter__card {
  position: relative;
  display: grid;
  grid-template-columns: minmax(230px, 0.78fr) minmax(320px, 1fr);
  width: min(850px, calc(100vw - 40px));
  min-height: 430px;
  overflow: hidden;
  border: 2px solid #80765c;
  background:
    repeating-linear-gradient(
      135deg,
      rgb(255 255 255 / 2%) 0 6px,
      transparent 6px 12px
    ),
    linear-gradient(145deg, #292820, #151612);
  color: #eee8d5;
  box-shadow: 0 24px 70px rgb(0 0 0 / 70%);
}

.character-encounter__card--call {
  border-color: #e2c85d;
}

.character-encounter__portrait-frame {
  position: relative;
  overflow: hidden;
  min-height: 430px;
  background:
    radial-gradient(circle at 50% 28%, #544d37, #151612 72%);
}

.character-encounter__portrait-frame::after {
  position: absolute;
  inset: 0;
  content: "";
  box-shadow: inset -30px 0 45px rgb(10 10 8 / 55%);
  pointer-events: none;
}

.character-encounter__portrait {
  position: absolute;
  inset: 12px 0 0;
  width: 100%;
  height: calc(100% - 12px);
  object-fit: contain;
  object-position: center bottom;
}

.character-encounter__copy {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 42px;
}

.character-encounter__copy small {
  color: #e8c942;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.18em;
}

.character-encounter__copy h2 {
  margin: 10px 0 4px;
  color: #ffffff;
  font-size: clamp(32px, 4vw, 52px);
  line-height: 0.95;
}

.character-encounter__copy > span {
  color: #aaa28b;
  font-size: 14px;
}

.character-encounter__copy p {
  margin: 28px 0;
  color: #ded8c5;
  font-size: 18px;
  line-height: 1.55;
}

.character-encounter__continue,
.character-encounter__call-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 52px;
  border: 1px solid #8c8268;
  color: #f7f2df;
  font: 800 15px Basic, sans-serif;
  cursor: pointer;
}

.character-encounter__continue {
  align-self: flex-start;
  min-width: 190px;
  background: #3e3a2c;
}

.character-encounter__call-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.character-encounter__call-button--decline {
  border-color: #bd3d3d;
  background: #7e2424;
}

.character-encounter__call-button--accept {
  border-color: #54c47a;
  background: #207d42;
}

.character-encounter__continue:hover,
.character-encounter__continue:focus-visible,
.character-encounter__call-button:hover,
.character-encounter__call-button:focus-visible {
  filter: brightness(1.16);
  transform: translateY(-1px);
}

@media (max-width: 680px) {
  .character-encounter__card {
    grid-template-columns: 1fr;
    max-height: calc(100vh - 32px);
  }

  .character-encounter__portrait-frame {
    min-height: 220px;
  }

  .character-encounter__copy {
    padding: 24px;
  }
}
</style>
