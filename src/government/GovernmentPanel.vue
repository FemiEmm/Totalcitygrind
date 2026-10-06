<script setup>
import {ref,watch} from 'vue';
const props=defineProps({state:Object,busy:Boolean,error:String,atResidence:Boolean});
const emit=defineEmits(['action','close']);
const tax=ref(15),rent=ref(0),loot=ref(0);
watch(()=>[props.state.taxRate,props.state.rentPercent],()=>{tax.value=props.state.taxRate;rent.value=props.state.rentPercent;},{immediate:true});
const money=n=>'₦'+Math.round(n||0).toLocaleString();
</script>
<template><section class="government-panel">
 <header><h3>{{atResidence?'Governor residence':'Government'}}</h3><button v-if="atResidence" @click="emit('close')" aria-label="Close">✕</button></header>
 <p>Governor: <strong>{{state.governor.name}}</strong></p>
 <p v-if="error" role="alert">{{error}}</p>
 <article v-if="atResidence"><p>Nomination form · {{money(10000000)}}</p><p>Buy Monday–Saturday. Voting runs all Sunday, Lagos time.</p><button :disabled="busy||state.sunday||state.nominated" @click="emit('action',{op:'nominate'})">{{state.nominated?'Nominated for this week':'Buy nomination form'}}</button></article>
 <article><strong>{{state.sunday?'Sunday election · vote now':'Weekly election'}}</strong><p v-if="!state.candidates.length">No candidates yet. DIDEJADE OWOWOLU retains office if nobody runs.</p><p v-if="!state.sunday&&state.candidates.length">Voting opens on Sunday, 00:00 Lagos time.</p><p v-if="state.voted">Your vote is recorded.</p>
  <div v-for="candidate in state.candidates" :key="candidate.id" class="candidate"><strong>{{candidate.name}}</strong><button v-if="state.sunday" :disabled="busy||state.voted" @click="emit('action',{op:'vote',candidateId:candidate.id})">Vote</button></div>
  <small v-if="state.lastResult">Last result: {{state.lastResult.name}}</small>
 </article>
 <article><p>Tax: {{state.taxRate}}% of each in-game week’s income</p><p>Tax outstanding: {{money(state.taxDebt)}}</p><p>Your unpaid government wages: {{money(state.owed)}}</p></article>
 <template v-if="atResidence&&state.isGovernor">
  <article><h4>Government account</h4><p>Treasury: {{money(state.treasury)}}</p><p>Salary arrears: {{money(state.totalOwed)}}</p><p>Funds police, LASTMA, LAWMA, Abule Egba Hospital and school teachers.</p></article>
  <article><label>Weekly income tax (%)<input v-model.number="tax" type="number" min="0" max="100" step="0.1" inputmode="decimal" /></label><label>Mainland single-room rent adjustment (%)<input v-model.number="rent" type="number" min="-100" max="10000" step="1" inputmode="decimal" /></label><small>Applied to base rents across mainland rows A–E. Sango Otta is unchanged. Negative numbers reduce rent.</small><button :disabled="busy" @click="emit('action',{op:'policy',taxRate:tax,rentPercent:rent})">Save rates</button></article>
  <article><label>Loot amount (₦)<input v-model.number="loot" type="number" min="1" :max="state.treasury" step="1" inputmode="numeric" /></label><p>Each withdrawal adds 100 crime.</p><button :disabled="busy||loot<=0||loot>state.treasury" @click="emit('action',{op:'loot',amount:loot})">Loot government funds</button></article>
 </template>
 <article v-for="message in [...state.messages].reverse()" :key="message.id" class="message">{{message.text}}</article>
</section></template>
<style scoped>
.government-panel{padding:14px;min-width:0;color:#19253d;font-size:14px;box-sizing:border-box}.government-panel header,.candidate{display:flex;align-items:center;justify-content:space-between;gap:10px}.government-panel h3{margin:0;font-size:20px}.government-panel h4{margin:0}.government-panel p{line-height:1.45;margin:8px 0}.government-panel article{padding:12px;background:#fffdf4;border:1px solid #dedccf;border-radius:14px;margin:10px 0;overflow-wrap:anywhere}.government-panel button{background:#ffde48;color:#19253d;border:0;border-radius:12px;padding:10px 14px;min-height:42px;white-space:normal;overflow-wrap:anywhere;font:inherit;cursor:pointer}.government-panel button:disabled{opacity:.5}.government-panel label{display:block;margin:10px 0}.government-panel input{display:block;width:100%;box-sizing:border-box;padding:10px;border:1px solid #c6c8c9;border-radius:8px;font:inherit}.government-panel small{display:block;line-height:1.4;margin:8px 0}.candidate{padding:9px 0;border-bottom:1px solid #eee}.candidate strong{min-width:0;overflow-wrap:anywhere}.message{font-size:13px}
</style>
