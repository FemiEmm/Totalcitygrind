<script setup>
import { ref } from 'vue';
const props = defineProps({ rewardAmount: { type: Number, default: 50000 } });
const emit = defineEmits(['shared']);
const link = 'https://totalcitygrind.netlify.app/';
const text = 'Come drive, work and build your life in Total City Grind!';
const busy = ref(false);
const message = ref('');
const failed = ref(false);
const nativeShareAvailable = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
async function share(channel) {
  if (busy.value) return;
  busy.value = true;
  message.value = '';
  failed.value = false;
  try {
    if (channel === 'copy') {
      await navigator.clipboard.writeText(link);
    } else if (channel === 'native') {
      await navigator.share({ title: 'Total City Grind', text, url: link });
    } else {
      const url = channel === 'x'
        ? 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(link)
        : 'https://wa.me/?text=' + encodeURIComponent(text + ' ' + link);
      const target = window.open('about:blank', '_blank');
      if (!target) throw new Error('Allow pop-ups to open the share window, or use Copy link.');
      target.opener = null;
      target.location.href = url;
    }
    emit('shared', { complete(result) {
      failed.value = Boolean(result.error);
      message.value = result.error || '₦' + result.amount.toLocaleString() + ' added to your MegaPay balance.';
    } });
  } catch (error) {
    if (error?.name !== 'AbortError') {
      failed.value = true;
      message.value = error?.message || 'Sharing did not complete. Please try again.';
    }
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="share-app">
    <i class="fa-solid fa-share-nodes share-app__icon" aria-hidden="true" />
    <h2>Invite friends to the city</h2>
    <p>Share Total City Grind and earn <strong>₦{{ rewardAmount.toLocaleString() }}</strong>.</p>
    <p v-if="rewardAmount === 50000">Your first share earns ₦50,000. Every share after that earns ₦20,000.</p>
    <p v-else>Earn ₦20,000 every time you share. No daily limit.</p>
    <label>Game link<input :value="link" readonly aria-label="Game link" /></label>
    <div class="share-app__actions">
      <button type="button" :disabled="busy" @click="share('x')">Share on X</button>
      <button type="button" :disabled="busy" @click="share('whatsapp')">WhatsApp</button>
      <button type="button" :disabled="busy" @click="share('copy')">Copy link</button>
      <button v-if="nativeShareAvailable" type="button" :disabled="busy" @click="share('native')">More options</button>
    </div>
    <p class="share-app__hint">Earn the reward when you open X or WhatsApp, copy the link, or complete sharing through More options.</p>
    <p v-if="message" role="status" :class="{ 'share-app__error': failed }">{{ message }}</p>
  </div>
</template>

<style scoped>
.share-app { box-sizing:border-box; height:calc(100% - 44px); overflow-y:auto; padding:18px; color:#17213a; }
.share-app__icon { color:#168b92; font-size:28px; }
h2 { margin:12px 0; font-size:22px; }
p { line-height:1.45; }
label { display:grid; gap:6px; font-weight:bold; }
input { box-sizing:border-box; width:100%; min-width:0; padding:10px; border:1px solid #d6d2c3; border-radius:10px; background:#fffdf4; color:#17213a; }
.share-app__actions { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; margin:16px 0; }
button { min-height:44px; padding:10px; border:0; border-radius:12px; background:#ffdb45; color:#17213a; font:inherit; font-weight:bold; cursor:pointer; }
button:disabled { opacity:.6; cursor:wait; }
.share-app__hint { font-size:12px; color:#536078; }
.share-app__error { color:#aa233b; }
</style>
