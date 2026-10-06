<script setup>
import { computed, ref, watch } from 'vue';
import { PAINTS, STICKERS, PHONES } from '../catalogue.js';
import PhonePreview from './PhonePreview.vue';
import VehiclePreview from './VehiclePreview.vue';
const props = defineProps({ vehicle:{type:Object,required:true}, state:{type:Object,required:true}, money:{type:Number,default:0} });
const emit = defineEmits(['apply']);
const kind = ref('sticker');
const selectedId = ref(null);
const equipped = computed(() => ({...props.state.vehicles[props.vehicle.id], phone:props.state.phone}));
watch(() => [kind.value, props.vehicle.id], () => { selectedId.value = equipped.value[kind.value] ?? null; }, {immediate:true});
const items = computed(() => kind.value === 'phone' ? PHONES : kind.value === 'sticker' ? STICKERS : PAINTS);
const selected = computed(() => items.value.find(item => item.id === selectedId.value));
const owned = computed(() => !selected.value || (props.state.owned[kind.value] ?? []).includes(selectedId.value));
const applied = computed(() => (equipped.value[kind.value] ?? null) === selectedId.value);
const cost = computed(() => owned.value ? 0 : selected.value.price);
const affordable = computed(() => cost.value === 0 || props.money >= cost.value);
const preview = computed(() => ({...equipped.value, [kind.value]: selectedId.value}));
const formatMoney = value => '₦' + value.toLocaleString('en-NG');
const resetLabel = computed(() => kind.value === 'phone' ? 'Original phone' : kind.value === 'sticker' ? 'No sticker' : 'Original paint');
</script>
<template>
  <section class="customize-shop" aria-label="Cosmetics shop">
    <header class="customize-shop__heading">
      <strong>{{ kind === 'phone' ? 'Your phone' : vehicle.name || 'Your Danfo' }}</strong>
      <span>{{ formatMoney(money) }}</span>
    </header>
    <div class="customize-shop__tabs" aria-label="Customization category">
      <button type="button" :aria-pressed="kind === 'sticker'" @click="kind = 'sticker'">Stickers</button>
      <button type="button" :aria-pressed="kind === 'paint'" @click="kind = 'paint'">Paint</button>
      <button type="button" :aria-pressed="kind === 'phone'" @click="kind = 'phone'">Phone</button>
    </div>
    <div class="customize-shop__preview">
      <PhonePreview v-if="kind === 'phone'" :phone="selected" />
      <VehiclePreview v-else :vehicle="vehicle" :selection="preview" />
      <div class="customize-shop__purchase">
        <strong>{{ selected?.name || resetLabel }}</strong>
        <small v-if="selected?.description">{{ selected.description }}</small>
        <span>{{ applied ? 'Applied' : owned ? 'Free to apply' : formatMoney(cost) }}</span>
        <button type="button" :disabled="applied || !affordable" @click="emit('apply', {kind, id:selectedId})">
          {{ applied ? 'Applied' : !affordable ? 'Not enough cash' : owned ? 'Apply' : 'Buy & apply' }}
        </button>
      </div>
    </div>
    <p>{{ kind === 'phone' ? 'Preview a phone, then buy & apply. Owned phones are free to switch.' : 'Tap to preview. Purchases unlock for all your vehicles; each keeps its own look.' }}</p>
    <div class="customize-shop__items">
      <button type="button" class="customize-shop__item" :aria-pressed="selectedId === null" @click="selectedId = null">
        <i class="fa-solid fa-rotate-left" aria-hidden="true" />
        <strong>{{ resetLabel }}</strong><small>Free</small>
      </button>
      <button v-for="item in items" :key="item.id" type="button" class="customize-shop__item" :aria-pressed="selectedId === item.id" @click="selectedId = item.id">
        <img v-if="kind === 'sticker'" :src="item.url" alt="" width="64" height="64" />
        <PhonePreview v-else-if="kind === 'phone'" :phone="item" compact />
        <span v-else class="customize-shop__swatch" :style="{backgroundColor:item.colour}" />
        <strong>{{ item.name }}</strong>
        <small>{{ equipped[kind] === item.id ? 'Applied' : (state.owned[kind] ?? []).includes(item.id) ? 'Owned' : formatMoney(item.price) }}</small>
      </button>
    </div>
  </section>
</template>
<style scoped>
.customize-shop { padding:14px; color:#19263e; height:calc(100% - 43px); min-height:0; overflow-y:auto; box-sizing:border-box; overscroll-behavior:contain; }
.customize-shop__purchase small { font-size:12px; line-height:1.4; }
.customize-shop__heading { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; }
.customize-shop__tabs { display:flex; gap:8px; margin:12px 0; }
.customize-shop button { font:inherit; color:inherit; cursor:pointer; border:1px solid #cad3dc; border-radius:14px; background:#fffdf5; padding:10px; min-height:44px; white-space:normal; overflow-wrap:anywhere; line-height:1.25; }
.customize-shop button[aria-pressed="true"] { border-color:#267757; background:#e6f5ed; outline:2px solid #267757; outline-offset:-2px; }
.customize-shop button:focus-visible { outline:3px solid #287de0; outline-offset:2px; }
.customize-shop button:disabled { cursor:default; opacity:.65; }
.customize-shop__tabs button { flex:1; }
.customize-shop__preview { display:grid; grid-template-columns:minmax(85px, .8fr) minmax(0, 1.2fr); align-items:center; gap:12px; background:#eef2ed; border-radius:18px; padding:8px; }
.customize-shop__purchase { display:flex; flex-direction:column; gap:8px; min-width:0; }
.customize-shop__purchase button { background:#1eae73; color:#fff; border:0; font-weight:700; }
.customize-shop p { font-size:12px; line-height:1.5; margin:12px 0; }
.customize-shop__items { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; padding-bottom:8px; }
.customize-shop__item { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:7px; min-width:0; }
.customize-shop__item img { object-fit:contain; }
.customize-shop__item strong { font-size:12px; }
.customize-shop__item small { font-size:12px; }
.customize-shop__item i { font-size:28px; padding:18px; }
.customize-shop__swatch { width:56px; height:44px; border:1px solid #17233a30; border-radius:12px; }
</style>
