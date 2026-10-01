<script setup>
import { computed } from "vue";
import { BUSINESS_CONFIG } from "../data/businessAssets.js";

const props = defineProps({
  businessState: { type: Object, required: true },
  ownedPropertyIds: { type: Array, required: true },
  money: { type: Number, required: true },
});

const emit = defineEmits(["close", "buy-office", "buy-asset"]);
const requirementMet = computed(() =>
  props.ownedPropertyIds.includes(
    BUSINESS_CONFIG.officeRequirementPropertyId,
  ),
);
const formatMoney = (value) =>
  `₦${Number(value || 0).toLocaleString()}`;
</script>

<template>
  <div class="business-modal" role="dialog" aria-modal="true" aria-label="Transport office">
    <section class="business">
      <button class="business__close" type="button" @click="emit('close')">×</button>
      <header>
        <span>LAGOS TRANSPORT ENTERPRISE</span>
        <h2>{{ businessState.officeOwned ? "Fleet management" : "Build your company" }}</h2>
        <p>Available capital: {{ formatMoney(money) }}</p>
      </header>

      <div v-if="!businessState.officeOwned" class="business__purchase">
        <i class="fa-solid fa-building" aria-hidden="true" />
        <div>
          <h3>Work Hub Office</h3>
          <p>Purchase permanent office space to employ drivers and manage income-producing vehicles.</p>
          <small v-if="!requirementMet">Own the Mainland Terrace before opening a company.</small>
        </div>
        <strong>{{ formatMoney(BUSINESS_CONFIG.officePrice) }}</strong>
        <button
          type="button"
          :disabled="!requirementMet || money < BUSINESS_CONFIG.officePrice"
          @click="emit('buy-office')"
        >
          Purchase office
        </button>
      </div>

      <template v-else>
        <div class="business__summary">
          <span><small>DAILY GROSS</small>{{ formatMoney(businessState.dailyGross) }}</span>
          <span><small>DAILY COSTS</small>{{ formatMoney(businessState.dailyCosts) }}</span>
          <span class="profit"><small>NET PROFIT</small>{{ formatMoney(businessState.dailyProfit) }}</span>
          <span><small>LIFETIME PROFIT</small>{{ formatMoney(businessState.lifetimeProfit) }}</span>
        </div>

        <div class="business__assets">
          <article v-for="asset in BUSINESS_CONFIG.assets" :key="asset.id">
            <i :class="['fa-solid', asset.icon]" aria-hidden="true" />
            <div>
              <small>OWNED {{ businessState.assetCounts[asset.id] || 0 }} / {{ asset.maximumOwned }}</small>
              <h3>{{ asset.name }}</h3>
              <p>{{ asset.description }}</p>
              <span>
                {{ formatMoney(asset.dailyGross) }} gross −
                {{ formatMoney(asset.dailyCosts) }} costs =
                <strong>{{ formatMoney(asset.dailyGross - asset.dailyCosts) }}/day</strong>
              </span>
            </div>
            <button
              type="button"
              :disabled="
                money < asset.purchasePrice ||
                (businessState.assetCounts[asset.id] || 0) >= asset.maximumOwned
              "
              @click="emit('buy-asset', asset.id)"
            >
              Buy · {{ formatMoney(asset.purchasePrice) }}
            </button>
          </article>
        </div>
      </template>
    </section>
  </div>
</template>

<style scoped>
.business-modal { position:absolute; z-index:120; inset:0; display:grid; place-items:center; padding:18px; background:#07131fc9; }
.business { position:relative; width:min(920px,95vw); max-height:92vh; overflow:auto; border:2px solid #aaa184; color:#eee9d8; background:#292820; box-shadow:0 20px 50px #000c; }
.business::after { content:""; position:absolute; inset:0; pointer-events:none; opacity:.2; background:repeating-linear-gradient(135deg,#fff1 0 2px,transparent 2px 10px); }
.business__close { position:absolute; z-index:2; top:14px; right:14px; width:38px; height:38px; border:1px solid #716a56; color:#eee9d8; background:#3b382d; font-size:25px; }
header { position:relative; z-index:1; padding:24px 28px 18px; border-bottom:1px solid #68614e; }
header span, small { color:#cfc08a; font-size:11px; letter-spacing:.1em; }
header h2 { margin:5px 0; font-size:30px; }
header p { margin:0; color:#aaa38d; }
.business__purchase { position:relative; z-index:1; display:grid; grid-template-columns:90px 1fr auto; align-items:center; padding:32px; gap:20px; }
.business__purchase > i { color:#d9c66d; font-size:64px; text-align:center; }
.business__purchase h3,.business__assets h3 { margin:3px 0; }
.business__purchase p,.business__assets p { color:#bdb6a0; }
.business__purchase > strong { color:#e2cf79; font-size:22px; }
.business button { padding:12px 16px; border:1px solid #eadb94; color:#201d12; background:#d9c66d; font:14px Basic,sans-serif; }
.business button:disabled { border-color:#625d50; color:#928c7b; background:#444137; }
.business__purchase button { grid-column:2/4; }
.business__summary { position:relative; z-index:1; display:grid; grid-template-columns:repeat(4,1fr); padding:18px; gap:8px; }
.business__summary span { display:grid; padding:14px; border:1px solid #625c4b; background:#343229; font-size:18px; }
.business__summary small { margin-bottom:5px; }
.business__summary .profit { color:#c8e178; }
.business__assets { position:relative; z-index:1; display:grid; padding:0 18px 22px; gap:10px; }
.business__assets article { display:grid; grid-template-columns:64px 1fr auto; align-items:center; padding:18px; border:1px solid #625c4b; background:#323028; gap:16px; }
.business__assets article > i { color:#d9c66d; font-size:38px; text-align:center; }
.business__assets article p { margin:5px 0; }
.business__assets article span { color:#aaa38d; font-size:12px; }
.business__assets article span strong { color:#c9df7b; }
@media(max-width:700px){.business__summary{grid-template-columns:1fr 1fr}.business__purchase,.business__assets article{grid-template-columns:1fr}.business__purchase button{grid-column:auto}}
</style>
