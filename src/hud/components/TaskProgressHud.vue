<script setup>
defineProps({
  chapter: { type: String, default: "New in Lagos" },
  taskLabel: { type: String, required: true },
  taskDetail: { type: String, required: true },
  step: { type: Number, required: true },
  totalSteps: { type: Number, required: true },
  progress: { type: Number, required: true },
});
</script>

<template>
  <aside class="task-progress" aria-label="Current task and progression">
    <header class="task-progress__header">
      <i class="fa-solid fa-circle-exclamation" aria-hidden="true" />
      <span>
        <small>{{ chapter }}</small>
        <strong>{{ taskLabel }}</strong>
      </span>
      <b>{{ step }} / {{ totalSteps }}</b>
    </header>

    <div class="task-progress__task">
      <p>{{ taskDetail }}</p>
      <span class="task-progress__objective">
        <i :class="step >= totalSteps ? 'fa-solid fa-circle-check' : 'fa-regular fa-circle'" aria-hidden="true" />
        <strong>{{ step >= totalSteps ? "Objective complete" : `Progress ${step} of ${totalSteps}` }}</strong>
      </span>
    </div>

    <footer class="task-progress__footer">
      <div aria-label="Chapter progress">
        <i :style="{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }" />
      </div>
    </footer>

  </aside>

</template>

<style scoped>
.task-progress {
  position: absolute;
  z-index: 5000;
  top: 16px;
  right: 16px;
  width: 286px;
  padding: 8px 10px 9px;
  color: #fff;
  background: linear-gradient(90deg, rgb(5 12 10 / 76%), rgb(5 12 10 / 54%) 78%, transparent);
  font-family: "Basic", sans-serif;
  pointer-events: none;
}
.task-progress__header { display: grid; grid-template-columns: 18px minmax(0, 1fr) auto; align-items: center; gap: 6px; padding-bottom: 5px; border-bottom: 2px solid #72a338; }
.task-progress__header > i { color: #f0bd35; font-size: 15px; filter: drop-shadow(1px 1px 0 #513900); }
.task-progress__header > span { display: grid; min-width: 0; gap: 1px; }
.task-progress__header small { overflow: hidden; color: #efd78f; font-size: 8px; font-weight: 900; letter-spacing: .09em; text-overflow: ellipsis; text-transform: uppercase; white-space: nowrap; }
.task-progress__header strong { overflow: hidden; color: #fff4c9; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.task-progress__header b { color: #dce7d4; font-size: 8px; }
.task-progress__task { padding: 7px 1px 6px 24px; }
.task-progress__task p { margin: 0 0 6px; color: #fff; font-size: 10px; line-height: 1.25; }
.task-progress__objective { display: flex; align-items: center; gap: 7px; }
.task-progress__objective > i { color: #a7bd92; font-size: 11px; }
.task-progress__objective strong { color: #f3f5ef; font-size: 9px; font-weight: 600; }
.task-progress__footer { padding-left: 24px; }
.task-progress__footer > div { height: 3px; overflow: hidden; border-radius: 999px; background: rgb(255 255 255 / 20%); }
.task-progress__footer i { display: block; height: 100%; background: #86b845; transition: width 180ms ease; }
@media (max-width: 920px) { .task-progress { top: 136px; width: 248px; } }
</style>