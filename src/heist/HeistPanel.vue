<script setup>
import {ref,computed,onMounted,onBeforeUnmount,watch} from 'vue';
const props=defineProps({view:Object,busy:Boolean,error:String,playerName:{type:String,default:'Driver'},compact:Boolean,minute:{type:Number,default:0}});
const emit=defineEmits(['action']);const now=ref(Date.now());let synced=Date.now(),timer;
watch(()=>props.view,()=>{synced=Date.now();});
onMounted(()=>{timer=setInterval(()=>now.value=Date.now(),100);});onBeforeUnmount(()=>clearInterval(timer));
const a=computed(()=>props.view?.account);
const lockDays=computed(()=>Math.max(0,Math.ceil(((a.value?.lockUntil||0)-props.minute)/1440)));
const active=computed(()=>['approach','loading','escape'].includes(a.value?.status));
const amount=computed(()=>Math.floor(Math.min(100000000,(a.value?.loot||0)+(a.value?.collecting?Math.min(5,Math.max(0,(now.value-synced)/1000))*10000000/60:0))));
</script>
<template>
 <section class="heist-panel" :class="{compact}">
  <strong>Mr-Wire · Hustler</strong>
  <div v-if="lockDays"><b>Crime 100% · locked {{lockDays}} game days</b><progress :value="100" :max="100" aria-label="Locked crime rating" /></div>
  <template v-if="active">
   <p v-if="a.status==='approach'">Drive to MegaPay Bank. Stop in its parking bay: X49 Y14.</p>
   <template v-else><b>₦{{amount.toLocaleString()}} / ₦100,000,000</b><progress :value="amount" :max="100000000" aria-label="Money stolen" /><p>{{a.status==='loading'?'₦10m per game hour. Leave whenever you are ready.':'Drive home. Avoid every police checkpoint.'}}</p></template>
   <button v-if="!a.loot" :disabled="busy" @click="emit('action',{op:'cancel'})">Cancel job</button>
  </template>
  <template v-else-if="!compact">
   <p v-if="view?.available">Hello {{playerName}}, i get one job for bank i need a driver to help us move funds. IYKYK.</p>
   <p v-else>{{view?.bankBusy?'Someone is already on the bank job.':view?.cooldownMinutes?'Bank job inactive. Returns in '+Math.ceil(view.cooldownMinutes/60)+' game hours.':'Checking bank availability…'}}</p>
   <p v-if="a?.status==='completed'">Job completed. Your 50% share has been paid. {{lockDays ? 'Crime stays locked until the 14-day period ends.' : 'The crime lock has expired.'}}</p>
   <p v-if="['caught','failed'].includes(a?.status)">Heist failed. Carried cash confiscated; bank savings are safe.</p>
   <button :disabled="busy||!view?.available" @click="emit('action',{op:'accept'})">Accept bank job</button>
   <p>Racing is inactive while map two is locked.</p>
  </template>
  <p v-if="error" role="alert">{{error}}</p>
 </section>
</template>
<style scoped>
.heist-panel{padding:12px;color:#17213a;background:#fff7dc;border-radius:14px;font-size:13px;line-height:1.4;overflow-wrap:anywhere}.heist-panel b,.heist-panel strong{display:block}.heist-panel p{margin:7px 0}.heist-panel progress{width:100%;height:14px;accent-color:#1eb67a}.heist-panel button{min-height:44px;border:0;border-radius:10px;padding:9px 12px;background:#ffdc3b;font:inherit;color:#17213a}.heist-panel button:disabled{opacity:.5}.compact{position:absolute;top:110px;left:50%;transform:translateX(-50%);width:min(310px,45vw);max-height:40dvh;overflow:auto;z-index:35;box-sizing:border-box}
</style>
