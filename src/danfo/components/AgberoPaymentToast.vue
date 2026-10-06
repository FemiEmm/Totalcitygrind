<script setup>
import { onBeforeUnmount, ref, watch } from 'vue';
const props=defineProps({payment:{type:Object,default:null}});
const visiblePayment=ref(null),seen=new Set();
let timer=null;
watch(()=>props.payment?.id,id=>{
 if(id==null||seen.has(id))return;
 seen.add(id);if(seen.size>100)seen.delete(seen.values().next().value);
 window.clearTimeout(timer);visiblePayment.value=props.payment;
 timer=window.setTimeout(()=>{visiblePayment.value=null;timer=null;},3400);
});
onBeforeUnmount(()=>window.clearTimeout(timer));
</script>

<template>
  <div class="agbero-toast-position" role="status" aria-live="polite" aria-atomic="true">
    <Transition name="agbero-toast">
      <aside v-if="visiblePayment" :key="visiblePayment.id" class="agbero-toast-card">
        <i class="fa-solid fa-receipt" aria-hidden="true" />
        <span><strong>Paid agbero &#8358;{{ visiblePayment.amount.toLocaleString('en-NG') }}</strong><small>{{ visiblePayment.reason }}</small></span>
      </aside>
    </Transition>
  </div>
</template>

<style scoped>
.agbero-toast-position {
  position: absolute;
  top: 25%;
  left: 50%;
  transform: translateX(-50%);
  width: min(310px, calc(100% - 32px));
  z-index: 6200;
  pointer-events: none;
}
.agbero-toast-card {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 13px 18px;
  border: 1px solid rgb(23 33 58 / 12%);
  border-radius: 14px;
  background: #fff7d9;
  color: #17213a;
  box-shadow: 0 3px 14px rgb(23 33 58 / 12%);
  font-family: 'Basic', sans-serif;
}
.agbero-toast-card i { font-size: 23px; color: #b97908; }
.agbero-toast-card span { min-width: 0; }
.agbero-toast-card strong { display: block; font-size: clamp(15px, 2.4vw, 19px); overflow-wrap: anywhere; }
.agbero-toast-card small { display: block; margin-top: 3px; font-size: 14px; }
.agbero-toast-enter-active, .agbero-toast-leave-active { transition: opacity 260ms ease, transform 260ms ease; }
.agbero-toast-enter-from, .agbero-toast-leave-to { opacity: 0; transform: translateY(-8px); }
@media (prefers-reduced-motion: reduce) {
  .agbero-toast-enter-active, .agbero-toast-leave-active { transition: opacity 100ms linear; }
  .agbero-toast-enter-from, .agbero-toast-leave-to { transform: none; }
}
</style>
