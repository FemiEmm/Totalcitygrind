<script setup>
import { computed, ref } from "vue";
import { CHARACTER_DEFINITIONS } from "../../characters/data/characters.js";

const props = defineProps({
  currentDay: { type: Number, required: true },
  existingBalance: { type: Number, required: true },
  interestRate: { type: Number, required: true },
  minimumAmount: { type: Number, required: true },
  maximumAmount: { type: Number, required: true },
  eligible: { type: Boolean, default: false },
});

const emit = defineEmits(["close", "submit"]);
const amount = ref(props.minimumAmount);
const accepted = ref(false);

const repayment = computed(() => {
  return Math.ceil(Number(amount.value || 0) * (1 + props.interestRate));
});

function formatMoney(value) {
  return `₦${Math.ceil(value).toLocaleString()}`;
}
</script>

<template>
  <div class="service-modal" role="dialog" aria-modal="true" aria-label="Bank loan application">
    <section class="loan-document">
      <button class="loan-document__close" type="button" @click="emit('close')">×</button>
      <header>
        <span class="loan-document__seal">MP</span>
        <span>
          <strong>MEGAPAY BANK</strong>
          <small>LAGOS CONSUMER CREDIT DIVISION</small>
        </span>
        <img
          class="loan-document__officer"
          :src="CHARACTER_DEFINITIONS.bankRepresentative.portraitUrl"
          :alt="CHARACTER_DEFINITIONS.bankRepresentative.name"
        />
      </header>

      <div class="loan-document__rule" />
      <p class="loan-document__reference">APPLICATION FORM · DAY {{ currentDay }}</p>
      <h2>Personal Vehicle &amp; Business Loan</h2>

      <div v-if="!eligible" class="loan-document__existing">
        <strong>Application not yet available</strong>
        <small>
          Build a short account history first. MegaPay will call when you
          qualify for a larger in-branch loan.
        </small>
      </div>

      <div v-else-if="existingBalance > 0" class="loan-document__existing">
        <strong>Existing loan balance</strong>
        <b>{{ formatMoney(existingBalance) }}</b>
        <small>Repay the current loan through MegaPay before applying again.</small>
      </div>

      <form v-else @submit.prevent="emit('submit', Number(amount))">
        <label>
          Requested principal
          <span class="loan-document__money-input">
            ₦
            <input
              v-model.number="amount"
              type="number"
              :min="minimumAmount"
              :max="maximumAmount"
              step="5000"
              required
            >
          </span>
        </label>

        <dl>
          <div><dt>Fixed interest</dt><dd>{{ Math.round(interestRate * 100) }}%</dd></div>
          <div><dt>Total repayment</dt><dd>{{ formatMoney(repayment) }}</dd></div>
          <div><dt>Disbursement</dt><dd>Immediate to MegaPay</dd></div>
        </dl>

        <label class="loan-document__agreement">
          <input v-model="accepted" type="checkbox">
          <span>I confirm this application and accept the fixed repayment amount shown above.</span>
        </label>

        <div class="loan-document__signature">
          <span>Applicant signature</span>
          <b>PLAYER / DIGITAL SIGNATURE</b>
        </div>

        <button type="submit" :disabled="!accepted">Submit loan application</button>
      </form>
    </section>
  </div>
</template>

<style scoped>
.service-modal {
  position: absolute;
  z-index: 20;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgb(4 10 18 / 74%);
}

.loan-document {
  position: relative;
  width: min(600px, 94vw);
  max-height: 90vh;
  overflow: auto;
  padding: 34px 38px;
  border: 1px solid #b6aa89;
  color: #1f2a31;
  background:
    linear-gradient(rgb(255 255 255 / 92%), rgb(255 255 255 / 92%)),
    repeating-linear-gradient(0deg, #ede8d8 0 1px, transparent 1px 5px);
  box-shadow: 0 30px 80px rgb(0 0 0 / 50%);
}

.loan-document > header {
  position: relative;
  padding-right: 86px;
}

.loan-document__officer {
  position: absolute;
  right: 0;
  bottom: -18px;
  width: 84px;
  height: 104px;
  object-fit: contain;
  object-position: center bottom;
}

.loan-document__close {
  position: absolute;
  top: 12px;
  right: 14px;
  border: 0;
  color: #26343d;
  background: transparent;
  font: 28px Basic;
}

.loan-document header {
  display: flex;
  align-items: center;
  gap: 13px;
}

.loan-document header span:last-child {
  display: grid;
}

.loan-document header strong {
  color: #123f5a;
  font-size: 23px;
  letter-spacing: 0.08em;
}

.loan-document header small {
  font-size: 11px;
  letter-spacing: 0.12em;
}

.loan-document__seal {
  display: grid;
  width: 54px;
  height: 54px;
  place-items: center;
  border: 3px double #123f5a;
  border-radius: 50%;
  color: #123f5a;
  font-size: 20px;
}

.loan-document__rule {
  height: 4px;
  margin: 18px 0;
  background: #123f5a;
}

.loan-document__reference {
  margin: 0;
  color: #68767c;
  font-size: 12px;
  letter-spacing: 0.12em;
}

h2 {
  margin: 8px 0 24px;
  font: 29px Georgia, serif;
}

.loan-document form,
.loan-document label {
  display: grid;
  gap: 8px;
}

.loan-document__money-input {
  display: flex;
  align-items: center;
  border-bottom: 2px solid #273940;
  font: 24px Georgia, serif;
}

.loan-document__money-input input {
  width: 100%;
  padding: 8px;
  border: 0;
  outline: 0;
  background: transparent;
  font: 24px Georgia, serif;
}

dl {
  display: grid;
  margin: 20px 0;
  border-top: 1px solid #a9a28e;
}

dl div {
  display: flex;
  justify-content: space-between;
  padding: 11px 0;
  border-bottom: 1px solid #c9c2ae;
}

dd {
  margin: 0;
  font-weight: 700;
}

.loan-document__agreement {
  grid-template-columns: auto 1fr;
  align-items: start;
  font-size: 13px;
}

.loan-document__signature {
  display: grid;
  margin: 20px 0;
  padding-top: 12px;
  border-top: 1px solid #333;
  color: #5a656a;
  font-size: 11px;
}

.loan-document__signature b {
  color: #173e57;
  font: italic 18px Georgia, serif;
}

.loan-document button[type="submit"] {
  width: 100%;
  padding: 13px;
  border: 0;
  color: #fff;
  background: #123f5a;
  font: 16px Basic;
}

.loan-document button:disabled {
  opacity: 0.45;
}

.loan-document__existing {
  display: grid;
  padding: 22px;
  border: 1px solid #b69a59;
  background: #fff7da;
  gap: 6px;
}

.loan-document__existing b {
  font-size: 28px;
}
</style>
