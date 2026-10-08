<script setup>
import { LOCAL_STUDIO } from "./localStudio.js";
import { COAST_CITY_ENABLED, COAST_CITY_LOCK_MESSAGE } from "./worldAvailability.js";
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  watch,
} from "vue";

import { startNewPlayerInventory } from "../player/systems/playerInventory.js";
import OnlinePanel from '../network/OnlinePanel.vue';
import { connection, bootstrapAccount, gameRequest, emergencyGameRequest, connectWorld, disconnectWorld } from '../network/connection.js';
import { setSaveAccount } from './saveSlots.js';
import DailyQuestsModal from "./components/DailyQuestsModal.vue";
import TouchControls from "./components/TouchControls.vue";
import StartingHomePicker from "./components/StartingHomePicker.vue";
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

async function startLocalFilmingStudio() { return window.tcgStudioStart?.(); }
const onlinePanelOpen = ref(false);
const onlineMode = ref(false);
const onlineBusy = ref(false);
const unavailableHomes = ref([]);
const onlineHomePrices = ref({});
let accountReady = false;
let autosaveTimer = null;
let saveConflict = false;
function queueAccountSave() {
  if (!onlineMode.value || !accountReady || saveConflict) return;
  // Autosaves remain entirely local during the in-game day. The full account
  // snapshot is bundled into the single end-of-day economy checkpoint.
  connection.save = 'Local save · server checkpoint at day end';
}

const ONLINE_FINANCIAL_FIELDS = [
  'economyState', 'bankSavingsState', 'stockMarketState', 'customizationState',
  'playerInventory', 'propertyState', 'businessState', 'lifeObligationState',
  'objectiveState', 'dailyQuestState',
];
function currentOnlineCheckpointPacket() {
  if (!onlineMode.value || !accountReady || !worldStarted.value) return null;
  if (!activeWorldReference.value?.saveGame?.()) return null;
  let snapshot = null;
  try { snapshot = JSON.parse(localStorage.getItem(getSaveStorageKey(1)) || 'null'); } catch { return null; }
  if (!snapshot) return null;
  const financialState = {};
  for (const key of ONLINE_FINANCIAL_FIELDS) {
    if (snapshot[key] === undefined) return null;
    financialState[key] = snapshot[key];
  }
  return {
    op: 'session-checkpoint',
    financialState,
    closingBalance: Math.round(Number(snapshot.economyState?.money) || 0),
    snapshot,
    revision: connection.revision,
  };
}
async function saveOnlineSessionCheckpoint(label = 'Saved') {
  const packet = currentOnlineCheckpointPacket();
  if (!packet) return !onlineMode.value;
  connection.save = 'Saving…';
  try {
    const result = await gameRequest('economy', packet);
    if (Number.isInteger(result.revision)) connection.revision = result.revision;
    if (result.updatedAt) connection.lastSaved = result.updatedAt;
    connection.save = label;
    connection.error = '';
    return true;
  } catch (error) {
    connection.save = 'Local save only · server save failed';
    connection.error = error?.message || 'Could not save online progress.';
    return false;
  }
}
function emergencyOnlineSessionCheckpoint() {
  const packet = currentOnlineCheckpointPacket();
  if (!packet) return false;
  return emergencyGameRequest('economy', packet);
}

const ONLINE_LOAD_ERROR = "Oh oh... Total City Grind is having issues. Relax, we’ll be back up soon.";
async function enterOnlineCity() {
  if (onlineBusy.value) return;
  onlineBusy.value = true; connection.error = '';
  accountReady = false;
  let cachedSaveKey = null, previousCachedSave = null;
  try {
    const data = await bootstrapAccount();
    worldStarted.value = false;
    await nextTick();
    setSaveAccount(connection.user.id); setActiveSaveSlotId(1); activeSaveSlot.value = 1;
    onlineMode.value = true; accountReady = false; saveConflict = false;
    unavailableHomes.value = data.homes.filter(home => !home.available).map(home => home.id); onlineHomePrices.value=Object.fromEntries(data.homes.map(home=>[home.id,home.weeklyRent]));
    if (data.save) {
      const snapshot = data.save.snapshot;
      if (snapshot?.version !== 1 || !Number.isFinite(snapshot.player?.x) || !Number.isFinite(snapshot.player?.y) || !Number.isFinite(snapshot.player?.rotation)) throw new Error('Invalid online save position');
      cachedSaveKey = getSaveStorageKey(1);
      previousCachedSave = localStorage.getItem(cachedSaveKey);
      localStorage.setItem(cachedSaveKey, JSON.stringify(snapshot));
      accountReady = await loadGame(1) === true;
      if (!accountReady) throw new Error('Could not load your account game. Please try again.');
    } else if (data.home && data.firstGamePending === true) {
      // Only a confirmed, unfinished first reservation can create its initial save.
      // Existing or invalid saves always take the restoration/error path above.
      cachedSaveKey = getSaveStorageKey(1);
      previousCachedSave = localStorage.getItem(cachedSaveKey);
      await startNewGameAtHome(1, { homeId: data.home.homeId, playerName: data.profile.display_name, onlineTenancy: data.home });
      if (screen.value !== 'playing') throw new Error('First home setup did not finish');
      accountReady = true;
      queueAccountSave();
    } else if (data.home) {
      throw new Error('Existing online home has no saved game');
    } else { playGame(1); }
    onlinePanelOpen.value = false;
  } catch (error) {
    accountReady = false;
    worldStarted.value = false; screen.value = 'title'; tourVisible.value = false;
    if (cachedSaveKey) {
      try {
        if (previousCachedSave === null) localStorage.removeItem(cachedSaveKey);
        else localStorage.setItem(cachedSaveKey, previousCachedSave);
      } catch { /* Never upload a failed restoration. */ }
    }
    leaveOnlineAccount();
    enterMainMenuMusic();
    connection.error = ONLINE_LOAD_ERROR;
    onlinePanelOpen.value = true;
    console.error('Online game could not be loaded', error);
  }
  finally { onlineBusy.value = false; }
}
function leaveOnlineAccount() {
  disconnectWorld(); accountReady = false; onlineMode.value = false;
  setSaveAccount(null); refreshSaveSlots();
}
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
  () => onlinePanelOpen.value || screen.value !== "playing" || tourVisible.value || portrait.value || worldLoading.value || questsOpen.value,
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
  if (onlineMode.value) { saveNotice.value = "Online homes and account saves cannot be deleted from local slots."; return; }
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

const pendingNewGameSlot = ref(null);
const startingHomeBusy = ref(false);
const startingHomeError = ref('');
function playGame(slotId = activeSaveSlot.value) {
  if (onlineMode.value && accountReady) { saveNotice.value = "Return to the main menu to change accounts."; return; }
  pendingNewGameSlot.value = slotId;
  startingHomeError.value = '';
  tourVisible.value = false;
  screen.value = 'choose-home';
}
function cancelStartingHome() {
  if (startingHomeBusy.value) return;
  pendingNewGameSlot.value = null;
  screen.value = 'title';
  if (onlineMode.value) leaveOnlineAccount();
}
async function confirmStartingHome(selection) {
  if (startingHomeBusy.value) return;
  startingHomeBusy.value = true;
  try {
    if (onlineMode.value) {
      // Load assets before reserving; a retry returns the same tenancy without charging twice.
      if (!await prepareWorld()) throw new Error('Could not load the city.');
      selection.onlineTenancy = await gameRequest('claim', { homeId: selection.homeId });
      connection.home = selection.onlineTenancy;
      selection.playerName = connection.user.user_metadata?.display_name || selection.playerName;
    }
    await startNewGameAtHome(pendingNewGameSlot.value ?? activeSaveSlot.value, selection);
    if (onlineMode.value && screen.value === 'playing') { accountReady = true; queueAccountSave(); }
  }
  catch (error) {
    startingHomeError.value = error.message || 'Could not prepare your home. Please try again.';
    if (onlineMode.value && [400,409].includes(error.status)) {
      try { const data = await gameRequest('bootstrap'); unavailableHomes.value = data.homes.filter(home => !home.available).map(home => home.id); onlineHomePrices.value=Object.fromEntries(data.homes.map(home=>[home.id,home.weeklyRent])); } catch { /* Keep the original reservation error. */ }
    }
  }
  finally { startingHomeBusy.value = false; }
}
async function startNewGameAtHome(slotId, selection) {
  if (!await prepareWorld()) { startingHomeError.value = "Could not load the city. Please try again."; return; }
  worldStarted.value = true;
  activeSaveSlot.value = setActiveSaveSlotId(slotId);
  clearSaveSlot(activeSaveSlot.value);
  startNewPlayerInventory();
  activeWorld.value = "mainland";
  world2VehicleSnapshot.value = null;
  world2RaceRequested.value = false;
  worldInstanceKey.value += 1;
  await nextTick();
  if (!worldMapReference.value?.beginNewGame?.(selection)) {
    worldStarted.value = false;
    throw new Error('Could not finish setting up your home. Please retry the same room.');
  }
  pendingNewGameSlot.value = null;
  leaveMainMenuMusic();
  screen.value = "playing";
  tourVisible.value =
    window.localStorage.getItem(TOUR_STORAGE_KEY) !== "yes";
}

async function loadGame(slotId = activeSaveSlot.value) {
  if (!COAST_CITY_ENABLED) {
    try {
      const saved = JSON.parse(localStorage.getItem(getSaveStorageKey(slotId)) || 'null');
      if (saved?.currentMapId === 'coastal-city') {
        saveNotice.value = COAST_CITY_LOCK_MESSAGE + '. Your coastal save is preserved.';
        return;
      }
    } catch { /* Existing load handling will report invalid saves. */ }
  }
  if (onlineMode.value && slotId !== 1) { saveNotice.value = "Online accounts use one shared save."; return; }
  if (!await prepareWorld()) return;
  worldStarted.value = true;
  activeSaveSlot.value = setActiveSaveSlotId(slotId);
  activeWorld.value = "mainland";
  world2VehicleSnapshot.value = null;
  world2RaceRequested.value = false;
  worldInstanceKey.value += 1;
  await nextTick();
  leaveMainMenuMusic();
  const restored = worldMapReference.value?.loadGame?.();
  if (onlineMode.value && restored !== true) throw new Error('Online save restoration failed');
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
  return true;
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

async function returnToTitle() {
  if (onlineMode.value) {
    const saved = await saveOnlineSessionCheckpoint('Saved · main menu');
    if (!saved) {
      saveNotice.value = 'SERVER SAVE FAILED · TRY AGAIN';
      window.clearTimeout(saveNoticeTimer);
      saveNoticeTimer = window.setTimeout(() => { saveNotice.value = ''; }, 3000);
      return;
    }
    worldStarted.value = false;
    await nextTick();
    leaveOnlineAccount();
  }
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
  if (!COAST_CITY_ENABLED) { saveNotice.value = COAST_CITY_LOCK_MESSAGE; return; }
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

function handleAppBackground() {
  if (onlineMode.value && accountReady) activeWorldReference.value?.saveGame?.();
  if (screen.value === "playing" && !activeWorldReference.value?.isGodMode?.()) pauseGame();
}
function handlePageHide() {
  if (onlineMode.value && accountReady) emergencyOnlineSessionCheckpoint();
  handleAppBackground();
}

function handleVisibilityChange() {
  if (document.hidden && screen.value === "playing" && !activeWorldReference.value?.isGodMode?.()) {
    pausedByVisibility = true;
    pauseGame();
    return;
  }

  if (!document.hidden && pausedByVisibility) {
    pausedByVisibility = false;
  }
}

watch(() => onlineMode.value && worldStarted.value && activeWorld.value === 'mainland' && (screen.value === 'playing' || screen.value === 'paused'), enabled => {
  if (enabled) connectWorld(() => worldMapReference.value?.getNetworkPose?.(), async () => {
    if (accountReady) activeWorldReference.value?.saveGame?.();
  });
  else disconnectWorld();
}, { flush: 'post' });

function reconnectAfterPoliceTransfer() {
  if (onlineMode.value && activeWorld.value === 'mainland') connectWorld(() => worldMapReference.value?.getNetworkPose?.());
}
onMounted(() => {
  if (LOCAL_STUDIO) {
    window.tcgStudioStart = async () => {
      if (onlineMode.value) throw new Error('Studio requires offline play.');
      if (!worldStarted.value) await startNewGameAtHome(1, { homeId: 'single-room-row-a-room-1', playerName: 'The City Grind' });
      tourVisible.value = false;
      openingVisible.value = false;
      screen.value = 'playing';
      return true;
    };
    window.tcgStudioResume = () => { tourVisible.value = false; screen.value = 'playing'; };
  }

  window.addEventListener('tcg:police-teleport', reconnectAfterPoliceTransfer);
  window.addEventListener('tcg:game-saved', queueAccountSave);
  autosaveTimer = setInterval(() => {
    if (onlineMode.value && accountReady && worldStarted.value && !document.hidden) activeWorldReference.value?.saveGame?.();
  }, 30000);
  portraitQuery.addEventListener("change", updateViewport);
  touchQuery.addEventListener("change", updateViewport);
  window.addEventListener("keydown", handleMenuKey);
  window.addEventListener("pagehide", handlePageHide);
  window.addEventListener("blur", handleAppBackground);
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
  if (LOCAL_STUDIO) { delete window.tcgStudioStart; delete window.tcgStudioResume; }
  window.removeEventListener('tcg:police-teleport', reconnectAfterPoliceTransfer);
  window.removeEventListener('tcg:game-saved', queueAccountSave);
  clearInterval(autosaveTimer); disconnectWorld();
  portraitQuery.removeEventListener("change", updateViewport);
  touchQuery.removeEventListener("change", updateViewport);
  window.removeEventListener("keydown", handleMenuKey);
  window.removeEventListener("pagehide", handlePageHide);
  window.removeEventListener("blur", handleAppBackground);
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
    <button v-if="LOCAL_STUDIO && !worldStarted" style="position:fixed;top:16px;left:16px;z-index:2147483647;background:#ffd43b;color:#17213a;padding:12px;border:0;border-radius:6px;font-weight:bold" @click="startLocalFilmingStudio">Start local filming studio</button>
    <button v-if="screen === 'paused'" class="game__online" @click="onlinePanelOpen = true"><i class="fa-solid fa-globe" aria-hidden="true" /> Online city</button>
    <OnlinePanel v-if="onlinePanelOpen" :active="onlineMode" :busy="onlineBusy" @close="onlinePanelOpen = false" @enter="enterOnlineCity" @logout="leaveOnlineAccount" />
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
    <TouchControls v-if="!worldPaused" :ignition-only="!touchDevice" :key="`${activeWorld}:${activeWorldReference?.transmission}`" :transmission="activeWorldReference?.transmission" @input="handleTouchInput" />
    <section v-if="portrait" class="game__rotate" role="status" aria-live="polite">
      <i class="fa-solid fa-mobile-screen-button" aria-hidden="true" />
      <h1>Turn your phone sideways</h1>
      <p>Total City Grind plays in landscape.<br />Rotate your phone to get back on the road.</p>
    </section>
    <StartingHomePicker :prices="onlineMode ? onlineHomePrices : {}" v-if="screen === 'choose-home'" :busy="startingHomeBusy" :error="startingHomeError" :unavailable="onlineMode ? unavailableHomes : []" :initial-name="onlineMode ? connection.user?.user_metadata?.display_name || '' : ''" @choose="confirmStartingHome" @cancel="cancelStartingHome" />
    <GameMenu
      v-if="screen !== 'playing' && screen !== 'choose-home'"
      :mode="screen"
      :save-slots="saveSlots"
      :active-save-slot="activeSaveSlot"
      @play="playGame"
      @play-online="onlinePanelOpen = true"
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
.game__online { position:absolute; left:50%; bottom:max(12px,env(safe-area-inset-bottom)); transform:translateX(-50%); z-index:25000; background:#ffdb3b; color:#17213a; border:0; border-radius:12px; padding:10px 18px; min-height:42px; font:inherit; cursor:pointer; }
.game__toolbar { position:absolute; z-index:24000; top:max(8px, env(safe-area-inset-top)); left:auto; right:max(16px, env(safe-area-inset-right)); display:flex; gap:8px; }
.game__toolbar .game__pause { position:static; width:44px; height:44px; }
.game__quests { display:grid; place-items:center; width:44px; height:44px; padding:0; border:1px solid rgb(23 33 58 / 16%); border-radius:11px; color:#17213a; background:#ffd43b; font-weight:bold; cursor:pointer; box-shadow:var(--comic-shadow-small); }
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
  overscroll-behavior: none;
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
  background: #111418;
}
@media (pointer: coarse) {
  .game { touch-action: manipulation; }
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
  text-shadow: none;
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
