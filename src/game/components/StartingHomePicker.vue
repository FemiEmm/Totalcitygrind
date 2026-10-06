<script setup>
import { computed, ref } from 'vue';
import { STARTER_HOMES } from '../../property/data/starterHomes.js';
import { DANFO_ECONOMY_CONFIG } from '../../economy/data/danfoEconomyConfig.js';
const props = defineProps({ prices:{type:Object,default:()=>({})}, busy: Boolean, unavailable: { type: Array, default: () => [] }, initialName: { type: String, default: '' }, error: { type: String, default: '' } });
const emit = defineEmits(['choose', 'cancel']);
const playerName = ref(props.initialName);
const selectedId = ref('');
const selectedDistrict = ref('Ifako-Ijaiye LGA');
const selectedStreet = ref(1);
const pricedHomes=computed(()=>STARTER_HOMES.map(home=>({...home,weeklyRent:props.prices[home.id]??home.weeklyRent})));
const visibleHomes = computed(() => pricedHomes.value.filter(home =>
  !props.unavailable.includes(home.id) && home.district === selectedDistrict.value && (selectedDistrict.value !== 'Sango Otta' || home.street === Number(selectedStreet.value))));
const selected = computed(() => pricedHomes.value.find(home => home.id === selectedId.value));
const money = amount => '\u20a6' + amount.toLocaleString('en-NG');
function submit() {
  if (props.busy || !selected.value || selected.value.weeklyRent>DANFO_ECONOMY_CONFIG.startingMoney || !playerName.value.trim()) return;
  emit('choose', { homeId: selectedId.value, playerName: playerName.value.trim() });
}
</script>
<template>
  <section class="starting-home" role="dialog" aria-modal="true" aria-labelledby="starting-home-title" @keydown.stop @keyup.stop>
    <form class="starting-home__panel" @submit.prevent="submit">
      <header><h1 id="starting-home-title">Choose your first home</h1><p>Choose a neighbourhood. Each empty room includes its labelled parking space.</p></header>
      <label class="starting-home__name">Your name<input v-model="playerName" required maxlength="24" placeholder="Enter your name" autocomplete="nickname" :disabled="busy" /></label>
      <div class="starting-home__filters">
        <label>Neighbourhood<select v-model="selectedDistrict" :disabled="busy" @change="selectedId = ''"><option>Ifako-Ijaiye LGA</option><option>Sango Otta</option></select></label>
        <label v-if="selectedDistrict === 'Sango Otta'">Street<select v-model.number="selectedStreet" :disabled="busy" @change="selectedId = ''"><option v-for="street in 15" :key="street" :value="street">Street {{ street }} · West / East</option></select></label>
      </div>
      <p v-if="selectedDistrict === 'Sango Otta'">180 homes · 90 west, 90 east · Connected to Abule Egba Road</p>
      <fieldset :disabled="busy"><legend>Available rooms</legend><div class="starting-home__rooms">
        <label v-for="home in visibleHomes" :key="home.id" class="starting-home__room" :class="{ selected: selectedId === home.id }">
          <input v-model="selectedId" type="radio" name="home" :value="home.id" :disabled="home.weeklyRent>DANFO_ECONOMY_CONFIG.startingMoney" required />
          <strong>{{ home.name }}</strong><small>Parking {{ home.label }} · Empty</small><span>{{ money(home.weeklyRent) }}/week</span>
        </label>
      </div></fieldset>
      <footer>
        <p v-if="selected">{{ selected.district }} · {{ selected.name }}: Pay {{ money(selected.weeklyRent) }} now. Cash remaining: {{ money(DANFO_ECONOMY_CONFIG.startingMoney - selected.weeklyRent) }}. Next rent is due on day 8.</p>
        <p v-else>Starting cash: {{ money(DANFO_ECONOMY_CONFIG.startingMoney) }}. Choose a room to pay your first week's rent.</p>
        <p v-if="error" role="alert">{{ error }}</p>
        <div class="starting-home__actions"><button type="button" :disabled="busy" @click="emit('cancel')">Back</button><button type="submit" :disabled="busy || !selected || selected.weeklyRent>DANFO_ECONOMY_CONFIG.startingMoney || !playerName.trim()">{{ busy ? 'Preparing your home…' : 'Pay rent & start' }}</button></div>
      </footer>
    </form>
  </section>
</template>
<style scoped>
.starting-home { position: fixed; inset: 0; z-index: 10000000; display: grid; place-items: center; padding: max(12px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left)); background: #141d30ed; color: #17213a; }
.starting-home__panel { box-sizing: border-box; width: min(820px, 100%); max-height: 100%; overflow-y: auto; touch-action: pan-y; overscroll-behavior: contain; padding: 20px; background: #fff8df; border-radius: 22px; display: grid; gap: 14px; font-family: 'Basic', sans-serif; }
h1, p { margin: 0; } h1 { font-size: 26px; } p { font-size: 14px; line-height: 1.4; }
.starting-home__name { display: grid; gap: 6px; font-weight: bold; }
.starting-home__name input { width: 100%; box-sizing: border-box; padding: 10px; border: 1px solid #bcc1c7; border-radius: 10px; font: inherit; user-select: text; }
fieldset { min-width: 0; border: 0; padding: 0; margin: 0; } legend { margin-bottom: 8px; }
.starting-home__rooms { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 8px; }
.starting-home__room { position: relative; display: grid; gap: 4px; padding: 12px; background: #fff; border: 2px solid transparent; border-radius: 12px; cursor: pointer; }
.starting-home__room.selected { border-color: #17213a; background: #ffe675; }
.starting-home__room input { position: absolute; top: 10px; right: 8px; }
.starting-home__room strong { padding-right: 20px; }
.starting-home__room small, .starting-home__room span { font-size: 12px; }
footer { display: grid; gap: 9px; } .starting-home__actions { display: flex; gap: 10px; }
button { min-height: 44px; padding: 10px 18px; border: 0; border-radius: 12px; font: inherit; font-weight: bold; background: #e7ebf0; color: #17213a; }
button[type=submit] { background: #ffdb3b; flex: 1; } button:disabled { opacity: .5; }
@media(max-height: 500px) { .starting-home__panel { padding: 12px; gap: 8px; } h1 { font-size: 21px; } .starting-home__room { padding: 8px; } }
@media(max-width: 500px) { .starting-home__rooms { grid-template-columns: repeat(2,minmax(0,1fr)); } }
.starting-home__filters { display: flex; flex-wrap: wrap; gap: 12px; }
.starting-home__filters label { display: grid; gap: 5px; flex: 1; min-width: 160px; }
.starting-home__filters select { padding: 9px; min-height: 42px; border: 1px solid #bcc1c7; border-radius: 10px; color: #17213a; background: white; font: inherit; }
</style>
