<script setup>
import { ref, watch, onBeforeUnmount } from 'vue';
import danfoUrl from '../../assets/vehicles/player-danfo.png';
import { loadCosmeticImage, prepareSticker, drawCustomizedVehicle } from '../rendering.js';
const props = defineProps({ vehicle: {type:Object,required:true}, selection: {type:Object,default:()=>({})} });
const canvas = ref(null);
const error = ref(false);
let revision = 0;
watch(() => [canvas.value, props.vehicle, props.selection.paint, props.selection.sticker], async () => {
  const current = ++revision;
  if (!canvas.value) return;
  error.value = false;
  const ctx = canvas.value.getContext('2d');
  ctx.clearRect(0,0,240,240);
  try {
    const [sprite] = await Promise.all([loadCosmeticImage(props.vehicle.spriteUrl || danfoUrl), prepareSticker(props.selection.sticker)]);
    if (current !== revision || !canvas.value) return;
    const ratio = props.vehicle.width / props.vehicle.length;
    ctx.save();
    ctx.translate(120,120);
    drawCustomizedVehicle(ctx,sprite,props.vehicle,props.selection,210*ratio,210);
    ctx.restore();
  } catch { if (current === revision) error.value = true; }
}, {flush:'post', immediate:true});
onBeforeUnmount(() => { revision++; });
</script>
<template>
  <div class="vehicle-preview">
    <canvas ref="canvas" width="240" height="240" role="img" :aria-label="(vehicle.name || 'Danfo') + ' customization preview'" />
    <small v-if="error" role="status">Preview unavailable. Reopen to retry.</small>
  </div>
</template>
<style scoped>
.vehicle-preview { display:grid; place-items:center; min-width:0; }
canvas { width:120px; height:120px; max-width:100%; object-fit:contain; }
small { font-size:12px; }
</style>
