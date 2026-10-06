<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";
import LagosExperience from "./game/LagosExperience.vue";
const desktopWindow = window.totalCityGrindWindow;
const maximized = ref(false);
let removeListener;
onMounted(() => { removeListener = desktopWindow?.onMaximized?.(value => { maximized.value = value; }); });
onBeforeUnmount(() => removeListener?.());
async function toggleMaximize() { if (desktopWindow) maximized.value = await desktopWindow.toggleMaximize(); }
</script>
<template>
  <div class="desktop-shell" :class="{ native: !desktopWindow }">
    <header v-if="desktopWindow" class="titlebar" @dblclick="toggleMaximize">
      <div class="brand"><b>TCG</b><span>Total City Grind</span></div>
      <div class="controls" @dblclick.stop>
        <button title="Minimize" @click="desktopWindow.minimize()"><i class="min"></i></button>
        <button :title="maximized ? 'Restore' : 'Maximize'" @click="toggleMaximize"><i :class="maximized ? 'restore' : 'max'"></i></button>
        <button class="close" title="Close" @click="desktopWindow.close()">×</button>
      </div>
    </header>
    <main><LagosExperience /></main>
  </div>
</template>
<style scoped>
.desktop-shell{width:100%;height:100%;overflow:hidden;background:#17213a}.desktop-shell main{position:relative;height:calc(100% - 38px);overflow:hidden;transform:translateZ(0)}.desktop-shell.native main{height:100%;transform:none}
.titlebar{position:relative;z-index:2147483647;display:flex;align-items:center;justify-content:space-between;height:38px;color:#fff7dc;background:repeating-linear-gradient(135deg,rgb(255 255 255/4%) 0 5px,transparent 5px 10px),#17213a;border-bottom:3px solid #ffd43b;user-select:none;-webkit-app-region:drag}
.brand{display:flex;gap:9px;align-items:center;padding-left:12px;font-size:13px;font-weight:800;letter-spacing:.04em;text-transform:uppercase}.brand b{display:grid;height:22px;padding:0 5px;place-items:center;color:#17213a;background:#ffd43b;border:2px solid #fff7dc;border-radius:7px;box-shadow:0 2px 8px rgb(23 33 58 / 10%);font-size:9px}
.controls{display:flex;align-self:stretch;padding:3px 4px 4px;-webkit-app-region:no-drag}.controls button{display:grid;width:48px;padding:0;place-items:center;color:#fff7dc;background:transparent;border:0;border-left:1px solid rgb(255 247 220/14%);cursor:pointer}.controls button:hover{color:#17213a;background:#ffd43b}.controls button:active{transform:translateY(1px);background:#ff8c32}.controls .close{font-size:25px;line-height:1}.controls .close:hover{color:white;background:#f24f5e}
.min{display:block;width:14px;height:3px;margin-top:8px;background:currentColor;border-radius:3px}.max{display:block;width:13px;height:13px;border:2px solid currentColor;border-radius:2px}.restore{position:relative;display:block;width:12px;height:11px;border:2px solid currentColor;border-radius:2px}.restore:before{position:absolute;top:-6px;left:3px;width:10px;height:9px;content:"";border:2px solid currentColor;border-radius:2px}
</style>
