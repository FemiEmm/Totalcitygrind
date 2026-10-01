<script setup>
import { onMounted, ref } from "vue";
defineProps({ quests: { type: Array, default: () => [] }, day: { type: Number, default: 1 }, story: { type: Object, default: null } });
const emit = defineEmits(["close"]);
const closeButton = ref(null);
onMounted(() => closeButton.value?.focus());
</script>
<template>
  <div class="daily-quests" @click.self="emit('close')">
    <section id="daily-quests-dialog" class="daily-quests__card" role="dialog" aria-modal="true" aria-labelledby="daily-quests-title" @keydown.tab.prevent="closeButton?.focus()">
      <header>
        <div><small>DAY {{ day }} · {{ quests.filter(quest => quest.completed).length }} / {{ quests.length }} COMPLETE</small><h2 id="daily-quests-title">Quests</h2></div>
        <button ref="closeButton" type="button" aria-label="Close quests" @click="emit('close')">×</button>
      </header>
      <section v-if="story" class="daily-quests__story" aria-labelledby="story-objective-title">
        <h3 id="story-objective-title">Story objectives</h3>
        <article>
          <i class="fa-solid" :class="story.step >= story.totalSteps ? 'fa-circle-check' : 'fa-book-open'" aria-hidden="true" />
          <div>
            <small>{{ story.chapter }}</small>
            <h4>{{ story.label }}</h4>
            <p>{{ story.detail }}</p>
            <progress :value="Math.max(0, Math.min(1, story.progress))" max="1" aria-label="Story objective progress" />
            <footer><span>{{ story.step >= story.totalSteps ? 'Objective complete' : 'Progress ' + story.step + ' of ' + story.totalSteps }}</span></footer>
          </div>
        </article>
      </section>
      <h3>Daily Quests</h3>
      <p>Complete challenges before the day ends to earn bonus rewards.</p>
      <div class="daily-quests__list">
        <article v-for="quest in quests" :key="quest.id" :class="{ completed: quest.completed }">
          <i class="fa-solid" :class="quest.completed ? 'fa-circle-check' : 'fa-bullseye'" aria-hidden="true" />
          <div><strong>{{ quest.title }}</strong><p>{{ quest.description }}</p>
            <progress :value="Math.min(quest.target, quest.progress)" :max="quest.target" :aria-label="quest.title" />
            <footer><span>{{ quest.completed ? 'Complete' : Math.min(quest.target, Math.round(quest.progress)) + ' / ' + quest.target }}</span><b>₦{{ quest.reward.toLocaleString() }}</b></footer>
          </div>
        </article>
        <p v-if="!quests.length">No daily quests available yet.</p>
      </div>
      <small>Unfinished quests reset at the start of the next game day.</small>
    </section>
  </div>
</template>
<style scoped>
.daily-quests { position:absolute; z-index:23000; inset:0; display:grid; place-items:center; padding:68px max(16px, env(safe-area-inset-right)) 12px max(16px, env(safe-area-inset-left)); background:rgb(7 12 27 / 78%); }
.daily-quests__card { width:min(560px,100%); max-height:100%; min-height:0; overflow-y:auto; padding:18px; border:3px solid #17213a; border-radius:18px; color:#17213a; background:#fff7dc; box-shadow:4px 5px 0 #17213a; overscroll-behavior:contain; touch-action:pan-y; }
header { display:flex; justify-content:space-between; align-items:center; gap:12px; }
h3 { margin:18px 0 8px; font-size:17px; }
h4 { margin:4px 0; font-size:15px; }
.daily-quests__story small { color:#ad4d15; font-weight:bold; }
h2 { margin:3px 0; font-size:25px; }
header small { font-size:11px; font-weight:bold; }
button { flex-shrink:0; width:44px; height:44px; border:2px solid #17213a; border-radius:12px; color:#17213a; background:#ffd43b; font-size:26px; cursor:pointer; }
p { font-size:13px; line-height:1.4; }
.daily-quests__list { display:grid; gap:10px; margin:12px 0; }
article { display:flex; gap:10px; padding:12px; border:2px solid #17213a; border-radius:12px; background:#fffdf4; }
article > i { color:#c66a18; margin-top:3px; }
article > div { flex:1; min-width:0; }
article p { margin:4px 0 8px; }
.completed > i { color:#25874b; }
progress { width:100%; height:10px; accent-color:#25874b; }
footer { display:flex; justify-content:space-between; gap:12px; font-size:12px; margin-top:4px; }
</style>
