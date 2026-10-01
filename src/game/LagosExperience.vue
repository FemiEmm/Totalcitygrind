<script setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  watch,
} from "vue";

import DailyQuestsModal from "./components/DailyQuestsModal.vue";
import TouchControls from "./components/TouchControls.vue";
import GameMenu from "./components/GameMenu.vue";
import GameTour from "./components/GameTour.vue";


import {
  enterMainMenuMusic,
  leaveMainMenuMusic,
  setGameplayMusicPaused,
} from "../audio/musicPlayer.js";
import openingBackgroundUrl from "../assets/game/TCG_image.jpg";
import {
  clearSaveSlot,
  getActiveSaveSlotId,
  getSaveSlots,
  getSaveStorageKey,
  setActiveSaveSlotId,
} from "./saveSlots.js";

const TOUR_STORAGE_KEY = "total-city-grind-tour-v2";
const WorldMap = shallowRef(null);
const WorldMap2 = shallowRef(null);
const worldLoading = ref(false);
async function prepareWorld(coast = false) {
  worldLoading.value = true;
  try {
    if (coast && !WorldMap2.value) WorldMap2.value = (await import("../world2/components/WorldMap2.vue")).default;
    if (!coast && !WorldMap.value) WorldMap.value = (await import("../world/components/WorldMap.vue")).default;
    return true;
  } catch {
    saveNotice.value = "Could not load the city. Please try again.";
    return false;
  } finally {
    worldLoading.value = false;
  }
}
const screen = ref("title");
const portraitQuery = window.matchMedia("(orientation: portrait)");
const touchQuery = window.matchMedia("(pointer: coarse)");
const portrait = ref(portraitQuery.matches);
const touchDevice = ref(touchQuery.matches);
const worldStarted = ref(false);
function updateViewport() {
  portrait.value = portraitQuery.matches;
  touchDevice.value = touchQuery.matches;
  if (portrait.value) pauseGame();
}
function handleTouchInput(input) {
  activeWorldReference.value?.handleTouchInput?.(input);
}
const questsOpen = ref(false);
const questButton = ref(null);
function closeQuests() {
  questsOpen.value = false;
  nextTick(() => questButton.value?.focus());
}
const tourVisible = ref(false);
const worldMapReference = ref(null);
const worldMap2Reference = ref(null);
const activeWorld = ref("mainland");
const world2VehicleSnapshot = ref(null);
const world2RaceRequested = ref(false);
const openingVisible = ref(true);
const saveNotice = ref("");
const activeSaveSlot = ref(getActiveSaveSlotId());
const saveSlots = ref(getSaveSlots());
const worldInstanceKey = ref(0);
let saveNoticeTimer = null;
let openingTimer = null;
let pausedByVisibility = false;
const worldPaused = computed(
  () => screen.value !== "playing" || tourVisible.value || portrait.value || worldLoading.value || questsOpen.value,
);

watch(
  () => [screen.value, worldPaused.value],
  ([currentScreen, paused]) => {
    if (currentScreen !== "title") setGameplayMusicPaused(paused);
  },
  { flush: "sync" },
);

const activeWorldReference = computed(() =>
  activeWorld.value === "world2"
    ? worldMap2Reference.value
    : worldMapReference.value,
);

function deleteSavedGame(slotId) {
  try {
    clearSaveSlot(slotId);
    if (worldStarted.value && slotId === activeSaveSlot.value) {
      // Discard the deleted slot's live world so travel cannot save it again.
      worldStarted.value = false;
      activeWorld.value = "mainland";
      world2VehicleSnapshot.value = null;
      world2RaceRequested.value = false;
      questsOpen.value = false;
      returnToTitle();
    }
    refreshSaveSlots();
    saveNotice.value = `SAVE ${slotId} DELETED`;
  } catch {
    saveNotice.value = "Could not delete this save. Please try again.";
  }
  window.clearTimeout(saveNoticeTimer);
  saveNoticeTimer = window.setTimeout(() => { saveNotice.value = ""; }, 2500);
}

function refreshSaveSlots() {
  saveSlots.value = getSaveSlots();
}

async function playGame(slotId = activeSaveSlot.value) {
  if (!await prepareWorld()) return;
  worldStarted.value = true;
  activeSaveSlot.value = setActiveSaveSlotId(slotId);
  clearSaveSlot(activeSaveSlot.value);
  activeWorld.value = "mainland";
  world2VehicleSnapshot.value = null;
  world2RaceRequested.value = false;
  worldInstanceKey.value += 1;
  await nextTick();
  leaveMainMenuMusic();
  screen.value = "playing";
  tourVisible.value =
    window.localStorage.getItem(TOUR_STORAGE_KEY) !== "yes";
}

async function loadGame(slotId = activeSaveSlot.value) {
  if (!await prepareWorld()) return;
  worldStarted.value = true;
  activeSaveSlot.value = setActiveSaveSlotId(slotId);
  activeWorld.value = "mainland";
  world2VehicleSnapshot.value = null;
  world2RaceRequested.value = false;
  worldInstanceKey.value += 1;
  await nextTick();
  leaveMainMenuMusic();
  worldMapReference.value?.loadGame?.();
  try {
    const save = JSON.parse(
      window.localStorage.getItem(getSaveStorageKey()) || "{}",
    );
    if (save.currentMapId === "coastal-city") {
      if (!await prepareWorld(true)) return;
      activeWorld.value = "world2";
      const savedWorld2 = save.world2State;
      world2VehicleSnapshot.value = savedWorld2
        ? {
            id: savedWorld2.vehicleState?.activeVehicleId,
            fuel: savedWorld2.hudState?.fuel,
            damage: savedWorld2.hudState?.damage,
            gearIndex: savedWorld2.player?.gearIndex,
            health: savedWorld2.playerStatus?.health,
            energy: savedWorld2.playerStatus?.energy,
            money: savedWorld2.economyState?.money,
            currentDay: savedWorld2.gameClock?.day,
          }
        : save.world2VehicleSnapshot ?? null;
      await nextTick();
      worldMap2Reference.value?.loadGame?.();
    }
  } catch {
    activeWorld.value = "mainland";
  }
  screen.value = "playing";
}

function pauseGame() {
  questsOpen.value = false;
  if (screen.value === "playing") {
    screen.value = "paused";
  }
}

function resumeGame() {
  screen.value = "playing";
}

function returnToTitle() {
  tourVisible.value = false;
  refreshSaveSlots();
  screen.value = "title";
  enterMainMenuMusic();
}

function saveGame() {
  if (activeWorld.value === "world2") {
    worldMapReference.value?.saveGame?.();
  }
  const result = activeWorldReference.value?.saveGame?.();
  if (result) refreshSaveSlots();
  saveNotice.value = result
    ? `SAVE ${activeSaveSlot.value} SAVED`
    : "SAVE NOT AVAILABLE";
  window.clearTimeout(saveNoticeTimer);
  saveNoticeTimer = window.setTimeout(() => {
    saveNotice.value = "";
  }, 1800);
}

async function enterWorld2(payload = {}) {
  if (!await prepareWorld(true)) return;
  // Persist the paused mainland exactly where the player left it. World 2
  // adds its own position to this save instead of replacing Lagos state.
  worldMapReference.value?.saveGame?.();
  world2VehicleSnapshot.value = payload.vehicle ?? null;
  world2RaceRequested.value = Boolean(payload.startRace);
  activeWorld.value = "world2";
}

async function returnToMainland(payload = {}) {
  world2VehicleSnapshot.value = payload;
  world2RaceRequested.value = false;
  activeWorld.value = "mainland";
  await nextTick();
  worldMapReference.value?.restoreTravelVehicleState?.(payload);
}

async function startTour() {
  if (!await prepareWorld()) return;
  worldStarted.value = true;
  screen.value = "playing";
  tourVisible.value = true;
}

function completeTour() {
  tourVisible.value = false;
  window.localStorage.setItem(TOUR_STORAGE_KEY, "yes");
}

function handleMenuKey(event) {
  if (
    event.key !== "Escape" ||
    event.repeat
  ) {
    return;
  }

  event.preventDefault();

  if (questsOpen.value) {
    closeQuests();
  } else if (tourVisible.value) {
    completeTour();
  } else if (screen.value === "playing") {
    pauseGame();
  } else if (screen.value === "paused") {
    resumeGame();
  }
}

function handleVisibilityChange() {
  if (document.hidden && screen.value === "playing") {
    pausedByVisibility = true;
    pauseGame();
    return;
  }

  if (!document.hidden && pausedByVisibility) {
    pausedByVisibility = false;
  }
}

onMounted(() => {
  portraitQuery.addEventListener("change", updateViewport);
  touchQuery.addEventListener("change", updateViewport);
  window.addEventListener("keydown", handleMenuKey);
  document.addEventListener(
    "visibilitychange",
    handleVisibilityChange,
  );
  enterMainMenuMusic();
  openingTimer = window.setTimeout(() => {
    openingVisible.value = false;
    openingTimer = null;
  }, 600);
});

onBeforeUnmount(() => {
  portraitQuery.removeEventListener("change", updateViewport);
  touchQuery.removeEventListener("change", updateViewport);
  window.removeEventListener("keydown", handleMenuKey);
  document.removeEventListener(
    "visibilitychange",
    handleVisibilityChange,
  );
  window.clearTimeout(saveNoticeTimer);
  window.clearTimeout(openingTimer);
});
</script>

<template>
  <main class="game">
    <WorldMap
      v-if="worldStarted"
      :key="worldInstanceKey"
      ref="worldMapReference"
      v-show="activeWorld === 'mainland'"
      :paused="worldPaused || activeWorld !== 'mainland'"
      :phone-visible="screen === 'playing' && activeWorld === 'mainland' && !portrait"
      @enter-world2="enterWorld2"
    />
    <WorldMap2
      v-if="worldStarted && activeWorld === 'world2'"
      ref="worldMap2Reference"
      :paused="worldPaused"
      :phone-visible="screen === 'playing' && !portrait"
      :vehicle-snapshot="world2VehicleSnapshot"
      :start-race="world2RaceRequested"
      @return-mainland="returnToMainland"
    />

    <div v-if="worldLoading" class="game__loading" role="status">Loading the city…</div>
    <TouchControls v-if="!worldPaused" :steering-only="!touchDevice" :key="`${activeWorld}:${activeWorldReference?.transmission}`" :transmission="activeWorldReference?.transmission" @input="handleTouchInput" />
    <section v-if="portrait" class="game__rotate" role="status" aria-live="polite">
      <i class="fa-solid fa-mobile-screen-button" aria-hidden="true" />
      <h1>Turn your phone sideways</h1>
      <p>Total City Grind plays in landscape.<br />Rotate your phone to get back on the road.</p>
    </section>
    <GameMenu
      v-if="screen !== 'playing'"
      :mode="screen"
      :save-slots="saveSlots"
      :active-save-slot="activeSaveSlot"
      @play="playGame"
      @load="loadGame"
      @resume="resumeGame"
      @return-to-title="returnToTitle"
      @start-tour="startTour"
      @save="saveGame"
      @delete-save="deleteSavedGame"
    />

    <GameTour
      v-if="tourVisible"
      @finish="completeTour"
      @skip="completeTour"
    />

    <DailyQuestsModal v-if="questsOpen" :quests="activeWorldReference?.dailyQuests ?? []" :story="activeWorldReference?.storyObjective ?? null" :day="activeWorldReference?.questDay ?? 1" @close="closeQuests" />
    <div v-if="screen === 'playing' && !tourVisible" class="game__toolbar">
      <button ref="questButton" class="game__quests" type="button" aria-label="Quests" title="Quests" :aria-expanded="questsOpen" aria-controls="daily-quests-dialog" @click="questsOpen ? closeQuests() : questsOpen = true">
        <i class="fa-solid fa-list-check" aria-hidden="true" />
      </button>
    <button
      class="game__pause"
      type="button"
      aria-label="Pause game"
      title="Pause game"
      @click="pauseGame"
    >
      <i class="fa-solid fa-pause" aria-hidden="true" />
    </button>
    </div>

    <div v-if="saveNotice" class="game__save-notice">
      <i class="fa-solid fa-floppy-disk" aria-hidden="true" />
      {{ saveNotice }}
    </div>

    <Transition name="opening">
      <section
        v-if="openingVisible"
        class="game__opening"
        :style="{
          backgroundImage: [
            'linear-gradient(rgb(5 10 18 / 8%), rgb(5 10 18 / 28%))',
            `url('${openingBackgroundUrl}')`,
          ].join(', '),
        }"
        aria-label="Total City Grind loading"
      >
        <span>LOADING</span>
      </section>
    </Transition>
  </main>
</template>

<style scoped>
.game__toolbar { position:absolute; z-index:24000; top:max(8px, env(safe-area-inset-top)); left:238px; display:flex; gap:8px; }
.game__toolbar .game__pause { position:static; width:44px; height:44px; }
.game__quests { display:grid; place-items:center; width:44px; height:44px; padding:0; border:3px solid #17213a; border-radius:11px; color:#17213a; background:#ffd43b; font-weight:bold; cursor:pointer; box-shadow:var(--comic-shadow-small); }
.game__quests[aria-expanded="true"] { background:#65d6ee; }

.game__loading { position:absolute; inset:0; z-index:22000; display:grid; place-items:center; background:#17213a; color:#ffd43b; font-size:24px; }
.game__rotate { position:absolute; inset:0; z-index:30000; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:28px; text-align:center; color:#fff7dc; background:#17213a; }
.game__rotate i { font-size:68px; color:#ffd43b; transform:rotate(90deg); margin-bottom:24px; }
.game__rotate h1 { font-size:25px; }
.game__rotate p { line-height:1.6; max-width:320px; }
.game {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #111418;
}

.game__opening {
  position: absolute;
  z-index: 20000;
  inset: 0;
  display: grid;
  align-content: end;
  justify-items: center;
  padding-bottom: clamp(34px, 7vh, 76px);
  background-color: #121820;
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;
}

.game__opening span {
  color: #fff4c9;
  font-family: "Basic", sans-serif;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0.32em;
  text-shadow: 0 2px 5px #000;
  animation: opening-pulse 900ms ease-in-out infinite alternate;
}

.opening-leave-active {
  transition: opacity 320ms ease;
}

.opening-leave-to {
  opacity: 0;
}

@keyframes opening-pulse {
  to { opacity: 0.45; }
}

.game__pause {
  position: absolute;
  z-index: 6000;
  top: 16px;
  right: auto;
  left: 238px;
  display: grid;
  width: 42px;
  height: 42px;
  border: 1px solid var(--hud-metal);
  border-radius: 0;
  color: #d6caa8;
  background:
    linear-gradient(135deg, transparent 5px, var(--hud-panel) 0)
    top left;
  box-shadow: var(--hud-shadow);
  cursor: pointer;
  place-items: center;
  clip-path: polygon(7px 0, 100% 0, 100% calc(100% - 7px), calc(100% - 7px) 100%, 0 100%, 0 7px);
}

@media (max-width: 780px) {
  .game__pause {
    right: 16px;
    left: auto;
  }
}

.game__pause:hover {
  border-color: #d5bb6c;
  color: #ffe39a;
  filter: brightness(1.12);
}

.game__save-notice {
  position: absolute;
  z-index: 23000;
  top: 22px;
  left: 50%;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 11px 18px;
  border: 2px solid #8dccff;
  border-radius: 12px;
  color: #ffffff;
  background: #0a458d;
  box-shadow: var(--game-panel-shadow);
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0.08em;
  transform: translateX(-50%);
}
</style>
