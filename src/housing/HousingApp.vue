<script setup>
import {ref,computed,onMounted} from 'vue';
const props=defineProps({view:Object,busy:Boolean,error:String});
const emit=defineEmits(['action']);
const tab=ref('available'),rents=ref({});
const money=n=>'₦'+Number(n||0).toLocaleString();
const houses=computed(()=>(props.view?.homes||[]).filter(h=>tab.value==='owned'?h.owned:h.available||h.listed&&!h.occupied&&!h.owned));
onMounted(()=>emit('action',{op:'status'}));
</script>
<template>
 <section class="housing-app">
  <nav><button :class="{selected:tab==='available'}" @click="tab='available'">Available homes</button><button :class="{selected:tab==='owned'}" @click="tab='owned'">My houses</button></nav>
  <p>Owners pay ₦30,000 NEPA + ₦15,000 waste per house each game week. No property tax.</p>
  <p v-if="error" role="alert">{{error}}</p>
  <p v-if="!view">Loading housing…</p>
  <template v-else>
   <p v-if="view.homes.some(h=>h.tenant&&h.overdue)">Overdue rent: {{money(view.homes.find(h=>h.tenant)?.overdue)}}</p>
   <p v-if="view.account.debt">Unpaid utility bills: {{money(view.account.debt)}}</p>
   <p v-if="view.account.mortgage">Mortgage balance: {{money(view.account.mortgage.balance)}} · overdue {{money(view.account.mortgage.arrears)}}</p>
   <p>Current home: {{view.homes.find(h=>h.id===view.account.activeHomeId)?.name||'Starter room'}}</p>
   <button v-if="view.account.activeHomeId!=='starter-rental'" :disabled="busy" @click="emit('action',{op:'starter'})">Return to starter room / end tenancy</button>
   <button :disabled="busy" @click="emit('action',{op:'status'})">Refresh / pay due bills</button>
   <p v-if="!houses.length">{{tab==='owned'?'You do not own a house yet.':'No vacant homes are available.'}}</p>
   <article v-for="home in houses" :key="home.id">
    <strong>{{home.name}}</strong><small>{{home.district}} · parking X{{home.parking.x}} Y{{home.parking.y}}</small>
    <small>{{home.id==='wealthy-estate-home'?'No home theft · 20% faster recovery':'5% weekly robbery chance · 10% faster recovery'}}</small>
    <template v-if="home.available">
     <b>{{money(home.price)}}</b>
     <button :disabled="busy" @click="emit('action',{op:'buy',propertyId:home.id,paymentMethod:'cash'})">Buy outright</button>
     <small>Mortgage: {{money(home.deposit)}} deposit + {{money(home.weeklyPayment)}} × {{home.mortgageWeeks}} weeks</small>
     <button :disabled="busy||!!view.account.mortgage" @click="emit('action',{op:'buy',propertyId:home.id,paymentMethod:'mortgage'})">Buy with mortgage</button>
    </template>
    <template v-else-if="home.owned">
     <small>{{view.account.activeHomeId===home.id?'Your home':home.occupied?'Occupied by a tenant':home.listed?'Listed: '+money(home.weeklyRent)+'/week':'Vacant'}}</small>
     <button v-if="!home.occupied" :disabled="busy" @click="emit('action',{op:'move',propertyId:home.id})">Move in</button>
     <template v-if="!home.occupied">
      <label>Weekly rent<input v-model.number="rents[home.id]" type="number" min="1" step="1" placeholder="Amount in naira"></label>
      <button :disabled="busy" @click="emit('action',{op:'list',propertyId:home.id,weeklyRent:rents[home.id]})">{{home.listed?'Update rent':'List for rent'}}</button>
      <button v-if="home.listed" :disabled="busy" @click="emit('action',{op:'unlist',propertyId:home.id})">Remove listing</button>
     </template>
    </template>
    <template v-else><b>{{money(home.weeklyRent)}} / week</b><button :disabled="busy" @click="emit('action',{op:'rent',propertyId:home.id})">Pay first rent and move in</button></template>
   </article>
  </template>
 </section>
</template>
<style scoped>
.housing-app{padding:12px;color:#17213a;min-width:0;overflow-y:auto;font-size:13px;line-height:1.4}.housing-app nav{display:flex;gap:8px}.housing-app nav button{flex:1}.housing-app article{display:grid;gap:9px;padding:12px;margin-top:12px;border:1px solid #d9d4c4;border-radius:14px;background:#fffdf5;overflow-wrap:anywhere}.housing-app small{display:block}.housing-app button,.housing-app input{box-sizing:border-box;max-width:100%;min-height:44px;border:1px solid #d9d4c4;border-radius:10px;padding:9px;color:#17213a;font:inherit;white-space:normal;overflow-wrap:anywhere}.housing-app button{background:#ffdc3b;cursor:pointer}.housing-app button:disabled{opacity:.5}.housing-app input{display:block;width:100%;background:white}.housing-app nav button:not(.selected){background:#eee8d7}
</style>
