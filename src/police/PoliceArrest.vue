<script setup>
import { computed } from 'vue';
const props = defineProps({ state:Object, money:Number, minute:Number, error:String });
const emit = defineEmits(['bribe','station']);
const remaining = computed(() => { const minutes=Math.max(0,Math.ceil(props.state.releaseMinute-props.minute)); return `${Math.floor(minutes/60)}h ${minutes%60}m`; });
</script>
<template>
  <section v-if="state.status !== 'free'" class="police" :class="{ 'police--black':state.status === 'transfer' }" role="dialog" aria-modal="true" aria-label="Police arrest" @keydown.stop @keyup.stop>
    <div v-if="state.status !== 'transfer'" class="police__card">
      <i class="fa-solid fa-shield-halved" aria-hidden="true" />
      <h2>{{ state.status === 'detained' ? 'At the police station' : 'You have been arrested by the police' }}</h2>
      <template v-if="state.status === 'arrested'">
        <div class="police__actions"><button v-if="!state.heistCustody" :disabled="money < state.bribe" @click="emit('bribe')">Pay bribe · ₦{{ state.bribe.toLocaleString() }}</button><button @click="emit('station')">Go to station</button></div>
        <p v-if="state.heistCustody">Bank heist: all carried cash confiscated. You must go to the station.</p><p v-else-if="money < state.bribe">Not enough cash for the bribe.</p><p v-if="error" role="alert">{{ error }}</p>
      </template>
      <template v-else><strong>{{ remaining }} remaining</strong><p>Your car is parked. You will be released after 24 in-game hours.</p></template>
    </div>
  </section>
</template>
<style scoped>
.police { position:fixed; inset:0; z-index:10000100; display:grid; place-items:center; padding:16px; background:#15203866; color:#17213a; transition:background .35s; }
.police--black { background:#000; }
.police__card { box-sizing:border-box; width:min(440px,100%); max-height:100%; overflow:auto; padding:22px; border-radius:20px; background:#fff8df; text-align:center; }
h2 { font-size:21px; margin:10px 0 18px; } i { font-size:30px; } p { font-size:13px; } strong { font-size:24px; } .police__actions { display:flex; gap:10px; flex-wrap:wrap; }
button { flex:1; min-width:130px; min-height:46px; padding:10px; border:0; border-radius:12px; background:#ffdb3b; color:#17213a; font:inherit; font-weight:bold; cursor:pointer; } button:disabled { opacity:.45; }
</style>
