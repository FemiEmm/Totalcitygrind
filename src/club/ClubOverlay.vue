<script setup>
import {CLUB_DRINKS} from './catalogue.js';
import eko from '../assets/drinks/eko-reserve.png';
import gold from '../assets/drinks/mainland-gold.png';
import rose from '../assets/drinks/owanbe-rose.png';
import noir from '../assets/drinks/big-baller-noir.png';
import crown from '../assets/drinks/one-million-crown.png';
const props=defineProps({club:Object,money:Number,intoxication:Number});
const images=[eko,gold,rose,noir,crown];
</script>
<template>
 <button v-if="club.parked.value&&!club.modal.value" class="club-open" @click="club.modal.value=true;club.act()">🥂 Night Club</button>
 <div v-if="club.modal.value" class="club-shade" @click.self="club.modal.value=false"><section class="club-panel" role="dialog" aria-modal="true" aria-label="Night Club drinks" @keydown.stop @keyup.stop>
  <header><h2>Night Club</h2><button aria-label="Close" @click="club.modal.value=false">✕</button></header>
  <p v-if="intoxication > 0">🥴 You are intoxicated. Drinks are consumed when purchased.</p><p v-else>Drinks are consumed when purchased.</p><p>Effects fade over 10 game hours. Sleep clears them twice as fast.</p>
  <p v-if="club.error.value" role="alert">{{club.error.value}}</p>
  <article v-for="(drink,index) in CLUB_DRINKS" :key="drink.id"><img :src="images[index]" :alt="drink.name"/><div><strong>{{drink.name}}</strong><p>₦{{drink.price.toLocaleString()}} · +{{drink.intoxication}}% intoxication</p><small v-if="drink.celebration">Your name on the roof · 30 seconds of neon lights</small><button :disabled="club.busy.value||money<drink.price" @click="club.act('buy',drink.id)">Buy & drink</button></div></article>
 </section></div>
</template>
<style scoped>
.club-open{position:absolute;right:12px;top:145px;z-index:70;border:0;border-radius:12px;background:#ffdf48;color:#19253d;padding:12px;font:inherit;pointer-events:auto}.club-shade{position:absolute;inset:0;display:grid;place-items:center;background:#10142b88;z-index:1200;pointer-events:auto}.club-panel{background:#fff8e4;color:#19253d;padding:16px;border-radius:20px;box-sizing:border-box;width:min(530px,94%);max-height:88%;overflow:auto;overscroll-behavior:contain}.club-panel header{display:flex;justify-content:space-between;align-items:center;gap:12px}.club-panel h2{margin:0}.club-panel p{font-size:13px;line-height:1.4}.club-panel article{display:flex;gap:14px;border:1px solid #dfddcf;background:#fffdf4;border-radius:14px;padding:12px;margin:10px 0}.club-panel img{width:70px;height:100px;object-fit:contain}.club-panel article div{min-width:0;flex:1;overflow-wrap:anywhere}.club-panel small{display:block;margin-bottom:8px}.club-panel button{border:0;border-radius:10px;background:#ffdd48;color:#19253d;padding:10px 14px;min-height:42px;font:inherit;white-space:normal;cursor:pointer}.club-panel button:disabled{opacity:.5}
</style>
