<script setup>
defineProps({ checked: { type: Boolean, default: false } });
</script>
<template>
  <i class="fa-solid game-toggle-icon" :class="checked ? 'fa-toggle-on is-on' : 'fa-toggle-off is-off'" aria-hidden="true" />
</template>
<style scoped>
.game-toggle-icon { display:inline-block; width:42px !important; flex:0 0 42px; font-size:34px !important; line-height:1; text-align:center; justify-self:center; }
.game-toggle-icon.is-on { color:#24854b !important; }
.game-toggle-icon.is-off { color:#667085 !important; }
</style>
