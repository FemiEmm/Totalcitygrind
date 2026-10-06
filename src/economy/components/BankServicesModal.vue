<script setup>
import { computed, ref } from "vue";
import { CHARACTER_DEFINITIONS } from "../../characters/data/characters.js";

const props = defineProps({
  currentDay: { type: Number, required: true },
  money: { type: Number, required: true },
  savingsBalance: { type: Number, required: true },
  savingsRate: { type: Number, required: true },
  existingBalance: { type: Number, required: true },
  interestRate: { type: Number, required: true },
  minimumAmount: { type: Number, required: true },
  maximumAmount: { type: Number, required: true },
  eligible: { type: Boolean, default: false },
});

const emit = defineEmits(["close", "submit", "deposit", "withdraw"]);
const tab = ref("savings");
const savingsAmount = ref(5000);
const loanAmount = ref(props.minimumAmount);
const accepted = ref(false);
const repayment = computed(() => Math.ceil(Number(loanAmount.value || 0) * (1 + props.interestRate)));
const estimatedInterest = computed(() => Math.round(props.savingsBalance * props.savingsRate));
const formatMoney = (value) => `₦${Math.ceil(Number(value) || 0).toLocaleString()}`;
</script>

<template>
  <div class="bank-modal" role="dialog" aria-modal="true" aria-label="MegaPay Bank services">
    <section class="bank-card">
      <button class="bank-card__close" type="button" @click="emit('close')">×</button>
      <header>
        <img :src="CHARACTER_DEFINITIONS.bankRepresentative.portraitUrl" alt="" />
        <span><small>MEGAPAY BANK · DAY {{ currentDay }}</small><strong>Branch services</strong></span>
      </header>

      <nav>
        <button type="button" :class="{ active: tab === 'savings' }" @click="tab = 'savings'">Savings</button>
        <button type="button" :class="{ active: tab === 'loans' }" @click="tab = 'loans'">Large loan</button>
      </nav>

      <div v-if="tab === 'savings'" class="bank-card__panel">
        <div class="bank-card__rate"><span>This week</span><strong>{{ Math.round(savingsRate * 100) }}%</strong><small>Interest is added every Monday.</small></div>
        <dl>
          <div><dt>Spendable balance</dt><dd>{{ formatMoney(money) }}</dd></div>
          <div><dt>Savings balance</dt><dd>{{ formatMoney(savingsBalance) }}</dd></div>
          <div><dt>Estimated weekly interest</dt><dd>{{ formatMoney(estimatedInterest) }}</dd></div>
        </dl>
        <label>Amount<input v-model.number="savingsAmount" type="number" min="1" step="1000"></label>
        <div class="bank-card__actions">
          <button type="button" :disabled="savingsAmount <= 0 || savingsAmount > money" @click="emit('deposit', Number(savingsAmount))">Deposit</button>
          <button type="button" :disabled="savingsAmount <= 0 || savingsAmount > savingsBalance" @click="emit('withdraw', Number(savingsAmount))">Withdraw</button>
        </div>
      </div>

      <div v-else class="bank-card__panel">
        <div v-if="!eligible" class="bank-card__notice">Build a short account history first. MegaPay will contact you when you qualify.</div>
        <div v-else-if="existingBalance > 0" class="bank-card__notice">Existing large-loan balance: <strong>{{ formatMoney(existingBalance) }}</strong></div>
        <form v-else @submit.prevent="emit('submit', Number(loanAmount))">
          <label>Requested principal<input v-model.number="loanAmount" type="number" :min="minimumAmount" :max="maximumAmount" step="5000" required></label>
          <dl><div><dt>Fixed interest</dt><dd>{{ Math.round(interestRate * 100) }}%</dd></div><div><dt>Total repayment</dt><dd>{{ formatMoney(repayment) }}</dd></div></dl>
          <label class="bank-card__agreement"><input v-model="accepted" type="checkbox"><span>I accept the repayment amount shown.</span></label>
          <button type="submit" :disabled="!accepted">Submit application</button>
        </form>
      </div>
    </section>
  </div>
</template>

<style scoped>
.bank-modal { position:absolute; z-index:7000; inset:0; display:grid; place-items:center; padding:20px; background:rgb(7 12 27 / 78%); backdrop-filter:blur(4px); font-family:"Basic",sans-serif; }
.bank-card { position:relative; width:min(560px,94vw); max-height:90vh; overflow:auto; padding:26px; border:1px solid rgb(23 33 58 / 16%); border-radius:22px; color:#14213d; background:#fff8df; box-shadow:0 2px 8px rgb(23 33 58 / 10%); }
.bank-card__close { position:absolute; top:12px; right:14px; width:38px; height:38px; border:1px solid rgb(23 33 58 / 16%); border-radius:50%; background:#ffca3a; color:#14213d; font:700 24px/1 inherit; cursor:pointer; }
header { display:flex; align-items:center; gap:12px; padding-right:44px; } header img { width:72px; height:72px; object-fit:contain; } header span { display:grid; } header small { color:#6c4f00; font-weight:900; letter-spacing:.1em; } header strong { font-size:28px; }
nav { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin:18px 0; } nav button,.bank-card__actions button,form>button { padding:12px; border:1px solid rgb(23 33 58 / 16%); border-radius:12px; background:#eaf2ff; color:#14213d; font:700 16px inherit; box-shadow:0 2px 8px rgb(23 33 58 / 10%); cursor:pointer; } nav button.active,.bank-card__actions button:first-child,form>button { background:#ffca3a; }
.bank-card__panel,form,label { display:grid; gap:12px; } .bank-card__rate { display:grid; padding:16px; border:1px solid rgb(23 33 58 / 16%); border-radius:16px; background:#8ac926; } .bank-card__rate strong { font-size:38px; } dl { display:grid; margin:0; } dl div { display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #b9ad88; } dd { margin:0; font-weight:900; } input[type="number"] { padding:12px; border:1px solid rgb(23 33 58 / 16%); border-radius:10px; background:#fff; font:18px inherit; } .bank-card__actions { display:grid; grid-template-columns:1fr 1fr; gap:10px; } .bank-card__agreement { grid-template-columns:auto 1fr; align-items:center; } .bank-card__notice { padding:18px; border:1px solid rgb(23 33 58 / 16%); border-radius:14px; background:#ffd6a5; } button:disabled { opacity:.45; cursor:not-allowed; }
</style>
