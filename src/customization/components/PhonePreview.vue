<script setup>
import { computed } from 'vue';
import { phoneThemeStyle } from '../catalogue.js';
const props = defineProps({ phone: { type:Object, default:null }, compact: Boolean });
const style = computed(() => phoneThemeStyle(props.phone));
</script>
<template>
  <div class="phone-preview" :class="{'phone-preview--compact':compact}" :style="style" role="img" :aria-label="(phone?.name || 'Original phone') + ' design preview'">
    <div class="phone-preview__screen">
      <span class="phone-preview__camera" />
      <strong v-if="!compact" class="phone-preview__clock">09:41</strong>
      <div class="phone-preview__apps" aria-hidden="true">
        <span v-for="icon in ['comment-dots','map','music','wallet','palette','gear']" :key="icon"><i :class="'fa-solid fa-' + icon" /></span>
      </div>
      <span class="phone-preview__dock" />
    </div>
  </div>
</template>
<style scoped>
.phone-preview { --phone-frame:#ff8c32; --phone-paper:#fff7dc; --phone-wallpaper:linear-gradient(145deg,#f8fbff,#fff7dc); --phone-accent:#17213b; --phone-icon:#ffdb43; --phone-icon-radius:12px; --phone-camera-width:48px; --phone-camera-height:12px; --phone-camera-radius:999px; width:var(--phone-preview-width,98px); height:152px; padding:5px; border-radius:var(--phone-preview-radius,20px); background:var(--phone-frame); margin:auto; flex-shrink:0; }
.phone-preview__screen { position:relative; height:100%; overflow:hidden; border-radius:var(--phone-preview-screen-radius,16px); background:var(--phone-wallpaper); display:flex; flex-direction:column; align-items:center; padding:22px 6px 8px; gap:10px; }
.phone-preview__camera { position:absolute; top:5px; left:50%; transform:translateX(-50%); width:min(55%,var(--phone-camera-width)); height:var(--phone-camera-height); border-radius:var(--phone-camera-radius); background:#141923; }
.phone-preview__clock { color:#17213b; font-size:17px; letter-spacing:-.5px; }
.phone-preview__apps { display:grid; grid-template-columns:repeat(3,1fr); gap:5px; width:100%; }
.phone-preview__apps span { display:grid; place-items:center; aspect-ratio:1; border-radius:var(--phone-icon-radius); background:var(--phone-icon); color:var(--phone-accent); font-size:10px; }
.phone-preview__dock { height:4px; width:38%; border-radius:4px; background:var(--phone-accent); margin-top:auto; }
.phone-preview--compact { width:calc(var(--phone-preview-width,98px) * .65); height:91px; padding:3px; border-radius:var(--phone-preview-radius,12px); }
.phone-preview--compact .phone-preview__screen { padding:20px 5px 5px; border-radius:var(--phone-preview-screen-radius,10px); gap:4px; }
.phone-preview--compact .phone-preview__apps { gap:3px; }
.phone-preview--compact .phone-preview__apps span { font-size:7px; }
.phone-preview--compact .phone-preview__camera { height:7px; }
</style>
