<script setup>
import { computed, onMounted, ref } from 'vue';
import { CLUB_MEMBERS, CLUB_ENTRY_WEALTH } from './clubMembers.js';
import { rankWealth } from './netWorth.js';
import { connection, gameRequest } from '../network/connection.js';
import { getSaveAccount } from '../game/saveSlots.js';
const props = defineProps({ wealth: { type: Object, required: true }, playerName: { type: String, default: 'Driver' } });
const tab = ref('millionaires'), players = ref([]), busy = ref(false), error = ref(''), updatedAt = ref(null), page = ref(1);
const accountId = getSaveAccount();
const online = Boolean(accountId && connection.user?.id === accountId);
const local = computed(() => ({ id: 'local-player', name: props.playerName, wealth: props.wealth.total, fictional: false }));
const club = computed(() => rankWealth([...CLUB_MEMBERS, ...(online ? players.value : [local.value]).filter(p => p.wealth >= CLUB_ENTRY_WEALTH)]));
const pages = computed(() => Math.max(1, Math.ceil(players.value.length / 25)));
const visible = computed(() => tab.value === 'millionaires' ? club.value.slice(0, 50) : players.value.slice((page.value - 1) * 25, page.value * 25));
const currency = value => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(value);
const compact = value => '₦' + new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 2 }).format(value);
async function refresh() {
  if (!online || busy.value) return;
  busy.value = true; error.value = '';
  try {
    const result = await gameRequest('rankings');
    players.value = result.players; updatedAt.value = result.generatedAt;
    page.value = Math.min(page.value, pages.value);
  } catch (cause) { error.value = cause.message; }
  finally { busy.value = false; }
}
onMounted(refresh);
</script>
<template>
  <section class="bpc">
    <nav aria-label="BPC rankings"><button :aria-pressed="tab === 'millionaires'" @click="tab = 'millionaires'">Millionaires</button><button :aria-pressed="tab === 'players'" @click="tab = 'players'; refresh()">Player rankings</button></nav>
    <div class="bpc__content">
      <p v-if="error" role="alert">{{ error }}<span v-if="updatedAt"> Showing the last fetched rankings.</span></p>
      <p v-if="tab === 'players' && !online">Enter Online city from the main menu to see the shared player rankings.</p>
      <ol class="bpc__list" aria-label="Wealth rankings">
        <li v-for="person in visible" :key="person.id" :class="{ 'bpc__self': person.id === (online ? accountId : 'local-player') }">
          <b class="bpc__rank">{{ person.rank }}</b><div class="bpc__person"><strong>{{ person.name }}<span v-if="person.id === (online ? accountId : 'local-player')"> · You</span></strong></div><strong class="bpc__amount" :title="currency(person.wealth)">{{ compact(person.wealth) }}</strong>
        </li>
      </ol>
      <div v-if="tab === 'players' && pages > 1" class="bpc__refresh"><button :disabled="page === 1" @click="page--">Previous</button><span>{{ page }} / {{ pages }}</span><button :disabled="page === pages" @click="page++">Next</button></div>
      <p v-if="tab === 'players' && online && !busy && !players.length && !error">No rankings available yet.</p>
    </div>
  </section>
</template>
<style scoped>
.bpc { display:flex; flex-direction:column; height:100%; min-height:0; overflow:hidden; color:#17213a; background:#fff9e8; font-family:'Basic',sans-serif; }
nav { display:flex; gap:6px; padding:8px; flex-shrink:0; } button { min-height:36px; padding:7px 10px; border:0; border-radius:10px; background:#ece5d3; color:#17213a; font:inherit; cursor:pointer; white-space:normal; } nav button { flex:1; min-width:0; font-size:13px; } button[aria-pressed=true] { background:#ffda55; font-weight:bold; } button:disabled { opacity:.5; }
.bpc__content { min-height:0; overflow-y:auto; overscroll-behavior:contain; touch-action:pan-y; padding:10px; } p { font-size:12px; line-height:1.5; margin:8px 0; }
.bpc__refresh { display:flex; justify-content:space-between; align-items:center; gap:8px; margin:8px 0; font-size:12px; }
.bpc__list { padding:0; margin:8px 0; list-style:none; display:grid; gap:6px; } li { display:grid; grid-template-columns:28px minmax(0,1fr) auto; align-items:center; gap:7px; padding:10px 8px; border-radius:12px; background:white; border:1px solid #ede8d9; } .bpc__rank { text-align:center; font-size:14px; color:#927222; } .bpc__person { min-width:0; overflow-wrap:anywhere; } .bpc__person strong { font-size:13px; } .bpc__amount { font-size:13px; white-space:nowrap; } li.bpc__self { background:#e3f3e6; border-color:#59aa74; }

</style>
