<script setup>
import GovernmentPanel from './GovernmentPanel.vue';
defineProps({government:Object});
</script>
<template>
 <button v-if="government.parked.value&&!government.modal.value" class="government-open" @click="government.modal.value=true">Governor residence</button>
 <div v-if="government.modal.value" class="government-shade" @click.self="government.modal.value=false"><div class="government-dialog" role="dialog" aria-modal="true" aria-label="Governor residence" @keydown.stop @keyup.stop><GovernmentPanel :state="government.view.value" :busy="government.busy.value" :error="government.error.value" at-residence @action="government.act" @close="government.modal.value=false" /></div></div>
</template>
<style scoped>
.government-open{position:absolute;right:12px;top:90px;z-index:66;border:0;border-radius:12px;background:#ffdf48;color:#19253d;padding:12px;font:inherit;max-width:45vw;white-space:normal;pointer-events:auto}.government-shade{position:absolute;inset:0;z-index:1100;background:#15203b66;display:grid;place-items:center;pointer-events:auto}.government-dialog{background:#fff7df;border-radius:20px;width:min(560px,94%);max-height:88%;overflow:auto;overscroll-behavior:contain}
</style>
