<script setup>
import { computed, ref, watch, nextTick, onMounted, onUnmounted } from "vue";
import { fullscreenActive, installed, displayNotice, installHelp, installing, appleDevice, toggleFullscreen, addToHomeScreen } from "../browserDisplay.js";
import { getMenuStatistics } from "../../network/connection.js";
import HowToPlay from "./HowToPlay.vue";
import ToggleIcon from "../../ui/components/ToggleIcon.vue";
import "@fortawesome/fontawesome-free/css/all.min.css";
import menuBackgroundUrl from "../../assets/game/TCG_image.jpg";

import {
  getPlayerVehicleAudioSettings,
  setPlayerVehicleAudioSettings,
} from "../../audio/vehicleAudio.js";
import { playGameSound } from "../../audio/gameAudio.js";
import { musicAudioSettings, setMusicSettings } from "../../audio/musicPlayer.js";
import {
  hudPreferences,
  setHudPreference,
} from "../../hud/hudPreferences.js";
import {
  performanceSettings,
  setAdaptivePerformance,
  setPerformanceMonitorVisible,
  setRenderQuality,
} from "../../performance/performanceSettings.js";

const props = defineProps({
  mode: {
    type: String,
    required: true,
  },
  saveSlots: {
    type: Array,
    default: () => [],
  },
  activeSaveSlot: {
    type: Number,
    default: 1,
  },
});

const emit = defineEmits([
  "play",
  "play-online",
  "load",
  "resume",
  "return-to-title",
  "start-tour",
  "save",
  "delete-save",
]);

const activePanel = ref("menu");
const music = ref(musicAudioSettings);
function updateMusic(){music.value=setMusicSettings(music.value);}
const statistics=ref({online:null,visits:null,users:null});
let statsTimer;
let statsLoading=false;
async function refreshStatistics(){
  if(props.mode==='paused'||document.hidden||statsLoading)return;
  statsLoading=true;
  try { statistics.value=await getMenuStatistics(); } finally {statsLoading=false;}
}
onMounted(()=>{refreshStatistics();statsTimer=setInterval(refreshStatistics,30000);});
onUnmounted(()=>clearInterval(statsTimer));
function statNumber(value){return Number.isFinite(value)?value.toLocaleString():'—';}
const howToPlay = ref(null);
const displayFeedback = ref(null);
watch([displayNotice, installHelp], async () => {
  await nextTick();
  if (displayNotice.value || installHelp.value) displayFeedback.value?.scrollIntoView({ block: "nearest" });
});
const pendingOverwriteSlot = ref(null);
const pendingDeleteSlot = ref(null);
const initialAudio = getPlayerVehicleAudioSettings();
const masterVolume = ref(initialAudio.volume);
const muted = ref(initialAudio.muted);
const hudOptions = Object.freeze([
  {
    id: "energyBar",
    label: "ENERGY BAR",
    description: "Daily tiredness and recovery",
    icon: "fa-bolt",
  },
  {
    id: "vehicleDashboard",
    label: "DRIVER DASHBOARD",
    description: "Speed, gear, fuel and damage",
    icon: "fa-gauge-high",
  },
  {
    id: "passengerOccupancy",
    label: "PASSENGER SEATS",
    description: "Vehicle occupancy display",
    icon: "fa-people-group",
  },
  {
    id: "routeGuide",
    label: "ROUTE GUIDE",
    description: "Current and next bus stop",
    icon: "fa-route",
  },
  {
    id: "servicePrompts",
    label: "SERVICE PROMPTS",
    description: "Fuel and mechanic instructions",
    icon: "fa-screwdriver-wrench",
  },
  {
    id: "feedback",
    label: "POP-UP FEEDBACK",
    description: "Fares, passengers and transactions",
    icon: "fa-comment-dots",
  },
]);

const isPaused = computed(() => props.mode === "paused");
const menuHeading = computed(() =>
  isPaused.value ? "CITY PAUSED" : "WELCOME TO LAGOS",
);
const menuCopy = computed(() =>
  isPaused.value
    ? "Take a breath. The city will wait for you."
    : "Build your hustle. Learn the roads. Own your journey.",
);
const menuStyle = computed(() =>
  isPaused.value
    ? null
    : {
        backgroundImage: [
          "linear-gradient(115deg, rgb(255 247 220 / 8%), transparent)",
          `url("${menuBackgroundUrl}")`,
        ].join(", "),
      },
);

function updateSound() {
  const settings = setPlayerVehicleAudioSettings({
    volume: masterVolume.value,
    muted: muted.value,
  });
  masterVolume.value = settings.volume;
  muted.value = settings.muted;
}

function toggleMute() {
  muted.value = !muted.value;
  updateSound();

  if (!muted.value) {
    playGameSound("confirm");
  }
}

function selectAction(action, payload) {
  playGameSound("confirm");
  emit(action, payload);
}

function openSaveSlots(mode) {
  pendingOverwriteSlot.value = null;
  pendingDeleteSlot.value = null;
  activePanel.value = mode;
  playGameSound("confirm");
}

function chooseSaveSlot(slot) {
  if (activePanel.value === "load-game") {
    if (slot.exists) selectAction("load", slot.id);
    return;
  }

  if (slot.exists && pendingOverwriteSlot.value !== slot.id) {
    pendingOverwriteSlot.value = slot.id;
    playGameSound("error");
    return;
  }
  selectAction("play", slot.id);
}

function slotDetails(slot) {
  if (!slot.exists) return "Empty — start a new city life";
  return "Day " + slot.day + " · " + slot.location + " · ₦" + Math.round(slot.money).toLocaleString();
}

function toggleHud(preference) {
  setHudPreference(
    preference,
    !hudPreferences[preference],
  );
}

function chooseRenderQuality(quality) {
  setRenderQuality(quality);
  playGameSound("confirm");
}

</script>

<template>
  <section
    class="game-menu"
    :class="{ 'game-menu--paused': isPaused }"
    :style="menuStyle"
    :aria-label="isPaused ? 'Pause menu' : 'Start menu'"
  >
    <div class="game-menu__glow game-menu__glow--one" />
    <div class="game-menu__glow game-menu__glow--two" />

    <main class="game-menu__card">
      <section class="game-menu__navigation">
        <header class="game-menu__heading"><div>
        <span class="game-menu__eyebrow">
          {{ isPaused ? "PAUSE MENU" : "MAIN MENU" }}
        </span>
        <h2>{{ menuHeading }}</h2>
        <p>{{ menuCopy }}</p>
        </div><button v-if="isPaused" class="game-menu__mute" type="button" :aria-label="muted ? 'Unmute game audio' : 'Mute game audio'" :title="muted ? 'Unmute' : 'Mute'" :aria-pressed="muted" @click="toggleMute">
          <i class="fa-solid" :class="muted ? 'fa-volume-xmark' : 'fa-volume-high'" aria-hidden="true" />
        </button></header>

        <nav v-if="activePanel === 'menu'" class="game-menu__actions">
          <button v-if="!isPaused" class="game-menu__action game-menu__action--primary" type="button" @click="selectAction('play-online')">
            <i class="fa-solid fa-globe" aria-hidden="true" />
            <span><strong>PLAY ONLINE GAME</strong><small>Join the shared city</small></span>
            <i class="fa-solid fa-chevron-right" aria-hidden="true" />
          </button>
          <button
            v-if="isPaused"
            class="game-menu__action game-menu__action--primary"
            type="button"
            @click="selectAction('resume')"
          >
            <i class="fa-solid fa-play" aria-hidden="true" />
            <span><strong>RESUME</strong><small>Return to the road</small></span>
            <i class="fa-solid fa-chevron-right" aria-hidden="true" />
          </button>

          <button
            v-else
            class="game-menu__action game-menu__action--primary"
            type="button"
            @click="activePanel = 'offline'"
          >
            <i class="fa-solid fa-play" aria-hidden="true" />
            <span><strong>PLAY OFFLINE</strong><small>New game or load a save</small></span>
            <i class="fa-solid fa-chevron-right" aria-hidden="true" />
          </button>

          <button
            v-if="isPaused"
            class="game-menu__action"
            type="button"
            @click="openSaveSlots('load-game')"
          >
            <i class="fa-solid fa-box-archive" aria-hidden="true" />
            <span><strong>LOAD</strong><small>Continue saved local data</small></span>
            <i class="fa-solid fa-chevron-right" aria-hidden="true" />
          </button>

          <button
            v-if="isPaused"
            class="game-menu__action"
            type="button"
            @click="selectAction('save')"
          >
            <i class="fa-solid fa-floppy-disk" aria-hidden="true" />
            <span><strong>SAVE GAME</strong><small>Overwrite Save {{ activeSaveSlot }}</small></span>
            <i class="fa-solid fa-chevron-right" aria-hidden="true" />
          </button>

          <button
            class="game-menu__action"
            type="button"
            @click="activePanel = 'settings'"
          >
            <i class="fa-solid fa-sliders" aria-hidden="true" />
            <span><strong>SETTINGS</strong><small>Sound and display</small></span>
            <i class="fa-solid fa-chevron-right" aria-hidden="true" />
          </button>

          <button
            v-if="isPaused"
            class="game-menu__action game-menu__action--quiet"
            type="button"
            @click="selectAction('return-to-title')"
          >
            <i class="fa-solid fa-house" aria-hidden="true" />
            <span><strong>MAIN MENU</strong><small>Return to the title screen</small></span>
            <i class="fa-solid fa-chevron-right" aria-hidden="true" />
          </button>

        </nav>

        <section v-else-if="activePanel === 'offline'" class="game-menu__settings">
          <button class="game-menu__back" type="button" @click="activePanel = 'menu'">← BACK</button>
          <div class="game-menu__settings-heading"><span>PLAY OFFLINE</span></div>
          <button class="game-menu__action" type="button" @click="openSaveSlots('new-game')"><i class="fa-solid fa-play" aria-hidden="true" /><span><strong>NEW GAME</strong><small>Start a new Lagos story</small></span><i class="fa-solid fa-chevron-right" aria-hidden="true" /></button>
          <button class="game-menu__action" type="button" @click="openSaveSlots('load-game')"><i class="fa-solid fa-box-archive" aria-hidden="true" /><span><strong>LOAD GAME</strong><small>Continue your saved game</small></span><i class="fa-solid fa-chevron-right" aria-hidden="true" /></button>
        </section>
        <section v-else-if="activePanel === 'settings'" class="game-menu__settings">
          <button
            class="game-menu__back"
            type="button"
            @click="activePanel = 'menu'"
          >
            <i class="fa-solid fa-arrow-left" aria-hidden="true" />
            BACK
          </button>

          <label>
            <span>
              <i class="fa-solid fa-volume-high" aria-hidden="true" />
              GAME SOUNDS VOLUME
              <b>{{ Math.round(masterVolume * 100) }}%</b>
            </span>
            <input
              v-model.number="masterVolume"
              type="range"
              min="0"
              max="1"
              step="0.05"
              @input="updateSound"
            >
          </label>

          <button
            class="game-menu__setting-button"
            type="button"
            role="switch"
            aria-label="Game sounds"
            :aria-checked="!muted"
            @click="toggleMute"
          >
            <i
              class="fa-solid"
              :class="muted ? 'fa-volume-xmark' : 'fa-volume-high'"
              aria-hidden="true"
            />
            <span>
              <strong>GAME SOUNDS</strong>
              <small>{{ muted ? "Muted" : "Enabled" }}</small>
            </span>
            <ToggleIcon :checked="!muted" />
          </button>

          <label><span><i class="fa-solid fa-music" aria-hidden="true" /> MUSIC VOLUME <b>{{ Math.round(music.volume * 100) }}%</b></span><input v-model.number="music.volume" aria-label="Music volume" type="range" min="0" max="1" step="0.05" @input="updateMusic" /></label>
          <button class="game-menu__setting-button" type="button" role="switch" aria-label="Music" :aria-checked="!music.muted" @click="music.muted = !music.muted; updateMusic()"><i class="fa-solid fa-music" aria-hidden="true" /><span><strong>MUSIC</strong><small>{{ music.muted ? 'Muted' : 'Enabled' }}</small></span><ToggleIcon :checked="!music.muted" /></button>
          <button
            class="game-menu__setting-button"
            type="button"
            @click="toggleFullscreen"
          >
            <i class="fa-solid fa-expand" aria-hidden="true" />
            <span>
              <strong>FULLSCREEN</strong>
              <small>Fill the current display</small>
            </span>
            <i class="fa-solid fa-chevron-right" aria-hidden="true" />
          </button>

          <div class="game-menu__settings-heading">
            <span>PERFORMANCE</span>
            <small>Balance image sharpness and smooth play</small>
          </div>

          <div class="game-menu__quality-options">
            <button
              v-for="quality in ['performance', 'balanced', 'high']"
              :key="quality"
              type="button"
              :class="{ active: performanceSettings.renderQuality === quality }"
              @click="chooseRenderQuality(quality)"
            >
              {{ quality.toUpperCase() }}
            </button>
          </div>

          <button
            class="game-menu__setting-button"
            type="button"
            role="switch"
            :aria-checked="performanceSettings.adaptivePerformance"
            aria-label="Adaptive performance"
            @click="setAdaptivePerformance(!performanceSettings.adaptivePerformance)"
          >
            <i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true" />
            <span>
              <strong>ADAPTIVE PERFORMANCE</strong>
              <small>Reduce distant traffic work during slow frames</small>
            </span>
            <ToggleIcon :checked="performanceSettings.adaptivePerformance" />
          </button>

          <button
            class="game-menu__setting-button"
            type="button"
            role="switch"
            :aria-checked="performanceSettings.showPerformanceMonitor"
            aria-label="Performance monitor"
            @click="setPerformanceMonitorVisible(!performanceSettings.showPerformanceMonitor)"
          >
            <i class="fa-solid fa-chart-line" aria-hidden="true" />
            <span>
              <strong>PERFORMANCE MONITOR</strong>
              <small>Show FPS and simulation timing</small>
            </span>
            <ToggleIcon :checked="performanceSettings.showPerformanceMonitor" />
          </button>

          <div class="game-menu__settings-heading">
            <span>HUD VISIBILITY</span>
            <small>Health and phone always stay visible</small>
          </div>

          <button
            v-for="option in hudOptions"
            :key="option.id"
            class="game-menu__setting-button"
            type="button"
            role="switch"
            :aria-checked="hudPreferences[option.id]"
            :aria-label="option.label"
            @click="toggleHud(option.id)"
          >
            <i
              class="fa-solid"
              :class="option.icon"
              aria-hidden="true"
            />
            <span>
              <strong>{{ option.label }}</strong>
              <small>{{ option.description }}</small>
            </span>
            <ToggleIcon :checked="hudPreferences[option.id]" />
          </button>

          <button
            class="game-menu__setting-button"
            type="button"
            @click="selectAction('start-tour')"
          >
            <i class="fa-solid fa-circle-question" aria-hidden="true" />
            <span>
              <strong>REPLAY TOUR</strong>
              <small>Show the game controls again</small>
            </span>
            <i class="fa-solid fa-chevron-right" aria-hidden="true" />
          </button>
  

      </section>

        <section v-else class="game-menu__settings game-menu__slots">
          <button
            class="game-menu__back"
            type="button"
            @click="activePanel = isPaused ? 'menu' : 'offline'"
          >
            <i class="fa-solid fa-arrow-left" aria-hidden="true" />
            BACK
          </button>
          <div class="game-menu__settings-heading">
            <span>{{ activePanel === "new-game" ? "NEW GAME" : "LOAD GAME" }}</span>
            <small>Each save keeps a separate player, inventory and progress.</small>
          </div>
          <div class="game-menu__actions">
            <div v-for="slot in saveSlots" :key="slot.id" class="game-menu__slot-row">
            <button
              class="game-menu__action game-menu__slot"
              :class="{
                'game-menu__slot--active': slot.id === activeSaveSlot,
                'game-menu__slot--disabled': activePanel === 'load-game' && !slot.exists,
              }"
              type="button"
              :disabled="activePanel === 'load-game' && !slot.exists"
              @click="chooseSaveSlot(slot)"
            >
              <i class="fa-solid fa-user" aria-hidden="true" />
              <span>
                <strong>{{ slot.label }}</strong>
                <small v-if="pendingOverwriteSlot === slot.id">
                  Select again to overwrite this save
                </small>
                <small v-else>{{ slotDetails(slot) }}</small>
              </span>
              <i
                class="fa-solid"
                :class="slot.exists ? 'fa-chevron-right' : 'fa-plus'"
                aria-hidden="true"
              />
            </button>
              <button v-if="slot.exists" class="game-menu__delete-slot" type="button" :aria-label="'Delete Save ' + slot.id" @click="pendingDeleteSlot = slot.id; pendingOverwriteSlot = null">
                <i class="fa-solid fa-trash-can" aria-hidden="true" /> Delete
              </button>
              <div v-if="pendingDeleteSlot === slot.id && slot.exists" class="game-menu__delete-confirm" role="group" :aria-label="'Confirm deleting Save ' + slot.id">
                <p>Delete Save {{ slot.id }}? Its progress and inventory will be permanently removed. Other saves stay intact.</p>
                <button type="button" @click="pendingDeleteSlot = null">Cancel</button>
                <button type="button" @click="selectAction('delete-save', slot.id); pendingDeleteSlot = null">Delete permanently</button>
              </div>
            </div>
          </div>
        </section>
        <div ref="displayFeedback">
        <div v-if="displayNotice" class="game-menu__display-notice" role="status">{{ displayNotice }}</div>
        <section v-if="installHelp && !isPaused" class="game-menu__install-help" aria-label="Add to Home Screen instructions">
          <strong>ADD TO HOME SCREEN</strong>
          <ol v-if="appleDevice">
            <li>Open this game in Safari and tap Share (the square with an upward arrow).</li>
            <li>Choose Add to Home Screen. You may need to scroll or tap More.</li>
            <li>Keep Open as Web App enabled if shown, then tap Add.</li>
            <li>Launch Total City Grind from its new icon and turn your device sideways.</li>
          </ol>
          <p v-else>Open your browser menu and choose Install app or Add to Home Screen. If neither appears, try a browser that supports web app installation.</p>
          <button type="button" class="game-menu__setting-button" @click="installHelp = false">Got it</button>
        </section>
        </div>
      </section>
    </main>

    <div v-if="!isPaused" class="game-menu__display-actions" aria-label="Display, help and installation">
      <button type="button" @click="toggleFullscreen"><i class="fa-solid" :class="fullscreenActive ? 'fa-compress' : 'fa-expand'" aria-hidden="true" /><span>{{ fullscreenActive ? 'Exit Fullscreen' : 'Fullscreen' }}</span></button>
      <button type="button" @click="howToPlay.open()"><i class="fa-solid fa-book-open" aria-hidden="true" /><span>How to Play</span></button>
      <button type="button" :disabled="installing" @click="addToHomeScreen"><i class="fa-solid fa-mobile-screen-button" aria-hidden="true" /><span>{{ installed ? 'App Installed' : 'Add to Home Screen' }}</span></button>
    </div>
    <HowToPlay ref="howToPlay" />
    <div v-if="!isPaused" class="game-menu__statistics" aria-label="Online statistics">
      <span><strong>{{ statNumber(statistics.online) }}</strong> Online now</span>
      <span><strong>{{ statNumber(statistics.visits) }}</strong> Visits</span>
      <span><strong>{{ statNumber(statistics.users) }}</strong> Users</span>
    </div>
    <footer v-if="isPaused" class="game-menu__footer">
      <span><kbd>ESC</kbd> {{ isPaused ? "Resume" : "Pause in game" }}</span>

    </footer>
  </section>
</template>

<style scoped>
.game-menu__statistics {position:absolute;top:max(12px,env(safe-area-inset-top));left:50%;transform:translateX(-50%);z-index:2;display:flex;gap:clamp(10px,3vw,28px);padding:10px 16px;border-radius:14px;background:#fff8df;color:#17213a;max-width:calc(100% - 24px);box-sizing:border-box;font-size:clamp(11px,1.4vw,15px);}
.game-menu__statistics span {white-space:nowrap;}

.game-menu__display-actions { position:absolute; left:50%; bottom:max(12px,env(safe-area-inset-bottom)); transform:translateX(-50%); display:flex; justify-content:center; gap:10px; width:max-content; max-width:calc(100% - 32px); z-index:2; }
.game-menu__display-actions button { display:flex; align-items:center; justify-content:center; gap:8px; min-width:0; min-height:44px; padding:10px 16px; border:1px solid rgb(23 33 58 / 16%); border-radius:12px; background:#ffdb3b; color:#17213a; font:inherit; font-size:14px; cursor:pointer; white-space:normal; }
.game-menu__display-actions button:disabled { opacity:.5; }

.game-menu__display-notice, .game-menu__install-help { padding:12px; margin:12px 0; border:1px solid rgb(23 33 58 / 16%); border-radius:12px; background:#fff7dc; color:#17213a; font-size:14px; line-height:1.4; }
.game-menu__install-help ol { padding-left:20px; }
.game-menu__install-help li + li { margin-top:6px; }
.game-menu__action span { min-width:0; overflow-wrap:anywhere; }
.game-menu__heading { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:14px; }
.game-menu__heading > div { min-width:0; }
.game-menu__heading p { margin:6px 0 0; font-size:13px; line-height:1.4; }
.game-menu__mute { display:grid; place-items:center; flex:0 0 44px; width:44px; height:44px; border:1px solid rgb(23 33 58 / 16%); border-radius:12px; background:#ffd43b; color:#17213a; font-size:19px; cursor:pointer; }
.game-menu__setting-button[role="switch"] { grid-template-columns:36px minmax(0,1fr) 44px; }

.game-menu__slot-row { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:8px; }
.game-menu__delete-slot { min-width:64px; min-height:44px; border:1px solid rgb(23 33 58 / 16%); border-radius:10px; background:#ffe6e8; color:#9d1821; cursor:pointer; }
.game-menu__delete-confirm { grid-column:1 / -1; padding:12px; border:2px solid #9d1821; border-radius:10px; background:#fff7dc; }
.game-menu__delete-confirm p { margin:0 0 10px; font-size:13px; }
.game-menu__delete-confirm button { min-height:44px; margin:0 6px 4px 0; padding:8px 10px; border:1px solid rgb(23 33 58 / 16%); border-radius:8px; background:#ffd43b; cursor:pointer; }

.game-menu {
  position: absolute;
  z-index: 10000;
  inset: 0;
  display: grid;
  grid-template-rows: auto 1fr auto;
  padding: clamp(24px, 5vw, 64px);
  overflow: hidden;
  color: #ffffff;
  background-color: #111418;
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;
  font-family: "Basic", sans-serif;
}

.game-menu--paused {
  background:
    linear-gradient(115deg, rgb(13 13 11 / 86%), rgb(34 32 27 / 82%));
}

.game-menu--paused::before {
  background-image:
    linear-gradient(rgb(184 173 143 / 6%) 1px, transparent 1px),
    linear-gradient(90deg, rgb(184 173 143 / 6%) 1px, transparent 1px);
  mask-image: linear-gradient(90deg, #000, transparent 78%);
}

.game-menu--paused .game-menu__glow--one {
  background: #9b8c63;
  opacity: 0.1;
}

.game-menu--paused .game-menu__glow--two {
  background: #625b48;
  opacity: 0.12;
}

.game-menu--paused .game-menu__card {
  border: 1px solid var(--hud-metal-light);
  border-radius: 0;
  background: var(--hud-panel-deep);
  box-shadow: 0 2px 8px rgb(23 33 58 / 10%);
  clip-path: polygon(
    12px 0,
    100% 0,
    100% calc(100% - 12px),
    calc(100% - 12px) 100%,
    0 100%,
    0 12px
  );
}

.game-menu--paused .game-menu__navigation {
  background:
    repeating-linear-gradient(
      135deg,
      rgb(255 255 255 / 2%) 0 2px,
      transparent 2px 9px
    ),
    linear-gradient(150deg, rgb(67 63 53 / 98%), rgb(24 24 20 / 98%));
}

.game-menu--paused .game-menu__brand span,
.game-menu--paused .game-menu__eyebrow,
.game-menu--paused .game-menu__brand p,
.game-menu--paused .game-menu__navigation > p,
.game-menu--paused .game-menu__footer {
  color: #cfc5aa;
}

.game-menu--paused .game-menu__brand h1 b {
  color: #d0b463;
}

.game-menu--paused .game-menu__badge {
  border-color: #c7b87e;
  border-radius: 2px;
  color: #e4d7b1;
  background: linear-gradient(145deg, #5d584a, #26251f);
  box-shadow: var(--hud-shadow);
}

.game-menu--paused .game-menu__action,
.game-menu--paused .game-menu__setting-button {
  border: 1px solid #817967;
  border-radius: 0;
  color: #eee9dc;
  background: linear-gradient(180deg, #4e4a3f, #292823);
  box-shadow:
    none;
  clip-path: polygon(
    7px 0,
    100% 0,
    100% calc(100% - 7px),
    calc(100% - 7px) 100%,
    0 100%,
    0 7px
  );
}

.game-menu--paused .game-menu__action--primary {
  border-color: #c7af65;
  color: #171711;
  background: linear-gradient(180deg, #d5bd70, #9f812f);
}

.game-menu--paused .game-menu__footer kbd {
  border-color: #8d846f;
  border-radius: 2px;
  color: #e8dfc8;
  background: #302f28;
}

.game-menu::before {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgb(91 169 241 / 9%) 1px, transparent 1px),
    linear-gradient(90deg, rgb(91 169 241 / 9%) 1px, transparent 1px);
  background-size: 72px 72px;
  content: "";
  mask-image: linear-gradient(90deg, #000, transparent 72%);
  pointer-events: none;
}

.game-menu__glow {
  position: absolute;
  width: 420px;
  height: 420px;
  border-radius: 50%;
  background: #1da8ed;
  filter: blur(110px);
  opacity: 0.19;
}

.game-menu__glow--one {
  top: -190px;
  right: 8%;
}

.game-menu__glow--two {
  bottom: -250px;
  left: 24%;
  background: #ffc83d;
  opacity: 0.12;
}

.game-menu__brand,
.game-menu__card,
.game-menu__footer {
  position: relative;
  z-index: 1;
}

.game-menu__brand {
  display: grid;
  justify-items: start;
  gap: 0;
}

.game-menu__badge {
  display: grid;
  width: 58px;
  height: 58px;
  border: 3px solid #ffe88a;
  border-radius: 17px;
  color: #132851;
  background: linear-gradient(145deg, #ffe26c, #ffb80d);
  box-shadow: 0 2px 8px rgb(23 33 58 / 10%);
  font-size: 25px;
  place-items: center;
  transform: rotate(-4deg);
}

.game-menu__brand span,
.game-menu__eyebrow {
  color: #79c8ff;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.18em;
}

.game-menu__brand h1 {
  margin: 1px 0;
  font-size: clamp(24px, 3vw, 38px);
  letter-spacing: -0.03em;
  line-height: 1;
}

.game-menu__brand h1 b {
  color: var(--game-gold);
}

.game-menu__brand p {
  margin: 5px 0 0;
  color: #cbe9ff;
  font-size: 12px;
}

.game-menu__card {
  display: grid;
  width: min(560px, 92vw);
  height: min(720px, 82vh);
  max-height: min(720px, 82vh);
  min-height: 510px;
  align-self: center;
  justify-self: center;
  grid-row: 2;
  grid-template-columns: 1fr;
  grid-template-rows: minmax(0, 1fr);
  overflow: hidden;
  border: 3px solid #79c5ff;
  border-radius: 28px;
  background: #0b3b82;
  box-shadow:
    none;
}

.game-menu__navigation {
  height: 100%;
  max-height: 100%;
  min-height: 0;
  box-sizing: border-box;
  padding: clamp(28px, 4vw, 50px);
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  touch-action: pan-y;
  scrollbar-gutter: stable;
  background:
    linear-gradient(150deg, rgb(31 104 195 / 98%), rgb(8 44 105 / 98%));
}

.game-menu__navigation h2 {
  margin: 10px 0 5px;
  color: #ffffff;
  font-size: clamp(28px, 4vw, 44px);
  line-height: 1;
}

.game-menu__navigation > p {
  max-width: 330px;
  margin: 0 0 27px;
  color: #cbe9ff;
  line-height: 1.45;
}

.game-menu__actions {
  display: grid;
  gap: 10px;
}

.game-menu__action,
.game-menu__setting-button {
  display: grid;
  width: 100%;
  min-height: 62px;
  grid-template-columns: 36px 1fr 18px;
  align-items: center;
  padding: 10px 15px;
  border: 1px solid #67b4f0;
  border-radius: 14px;
  color: #ffffff;
  background: linear-gradient(180deg, #2166b8, #124988);
  box-shadow:
    none;
  text-align: left;
  cursor: pointer;
  transition:
    transform 120ms ease,
    border-color 120ms ease,
    filter 120ms ease;
}

.game-menu__action:hover,
.game-menu__setting-button:hover {
  border-color: #d8efff;
  filter: brightness(1.12);
  transform: translateX(5px);
}

.game-menu__action--primary {
  border-color: #ffe17a;
  color: #1c2b46;
  background: linear-gradient(180deg, #ffe265, #f5ad09);
}

.game-menu__action--quiet {
  opacity: 0.78;
}

.game-menu__slot--active {
  border-color: #ffe17a;
}

.game-menu__slot--disabled {
  cursor: not-allowed;
  filter: grayscale(0.7);
  opacity: 0.48;
}

.game-menu__slots .game-menu__settings-heading {
  margin-top: 0;
  padding-top: 0;
  border-top: 0;
}

.game-menu__action > i:first-child,
.game-menu__setting-button > i:first-child {
  font-size: 18px;
  text-align: center;
}

.game-menu__action span,
.game-menu__setting-button span {
  display: grid;
}

.game-menu__action strong,
.game-menu__setting-button strong {
  font-size: 15px;
  letter-spacing: 0.04em;
}

.game-menu__action small,
.game-menu__setting-button small {
  opacity: 0.72;
}

.game-menu__settings {
  display: grid;
  gap: 15px;
}

.game-menu__settings-heading {
  display: grid;
  margin-top: 5px;
  padding-top: 14px;
  border-top: 1px solid #66a9e0;
  gap: 2px;
}

.game-menu__settings-heading span {
  color: var(--game-gold);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.12em;
}

.game-menu__settings-heading small {
  color: var(--game-blue-200);
}

.game-menu__back {
  justify-self: start;
  border: 0;
  color: #d9edff;
  background: transparent;
  font-weight: 900;
  cursor: pointer;
}

.game-menu__settings label {
  display: grid;
  padding: 17px;
  border: 1px solid #67b4f0;
  border-radius: 14px;
  background: rgb(7 38 93 / 58%);
  gap: 13px;
}

.game-menu__settings label > span {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 13px;
  font-weight: 900;
}

.game-menu__settings label b {
  margin-left: auto;
  color: var(--game-gold);
}

.game-menu__settings input {
  width: 100%;
  accent-color: var(--game-gold);
}


.game-menu__city {
  position: relative;
  min-height: 100%;
  overflow: hidden;
  background:
    linear-gradient(180deg, #168ed0 0 43%, #55c8e9 44% 53%, #173a77 54%);
}

.game-menu__sun {
  position: absolute;
  top: 55px;
  right: 70px;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: #ffe06b;
  box-shadow: 0 2px 8px rgb(23 33 58 / 10%);
}

.game-menu__skyline {
  position: absolute;
  right: 0;
  bottom: 112px;
  left: 0;
  display: flex;
  height: 210px;
  align-items: end;
  gap: 6px;
  padding: 0 20px;
}

.game-menu__skyline i {
  flex: 1;
  height: 45%;
  border-top: 5px solid #ffcc3a;
  background:
    repeating-linear-gradient(90deg, transparent 0 12px, #5ba9dc 13px 17px),
    #0b2e66;
}

.game-menu__skyline i:nth-child(2) { height: 76%; }
.game-menu__skyline i:nth-child(3) { height: 57%; }
.game-menu__skyline i:nth-child(4) { height: 94%; }
.game-menu__skyline i:nth-child(5) { height: 68%; }
.game-menu__skyline i:nth-child(6) { height: 84%; }

.game-menu__road {
  position: absolute;
  right: -30px;
  bottom: 0;
  left: -30px;
  height: 125px;
  background: #183058;
  transform: skewY(-4deg);
}

.game-menu__road span {
  position: absolute;
  top: 54%;
  right: 0;
  left: 0;
  height: 6px;
  background: repeating-linear-gradient(
    90deg,
    #ffd43e 0 60px,
    transparent 60px 100px
  );
}

.game-menu__road i {
  position: absolute;
  top: 18px;
  right: 18%;
  color: #ffca31;
  font-size: 58px;
  filter: none;
  transform: skewY(4deg);
}

.game-menu__city-copy {
  position: absolute;
  top: 25px;
  left: 25px;
  display: grid;
  padding: 13px 15px;
  border: 1px solid rgb(255 255 255 / 46%);
  border-radius: 12px;
  background: rgb(7 39 89 / 65%);
}

.game-menu__quality-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 7px;
}

.game-menu__quality-options button {
  min-height: 42px;
  border: 1px solid rgb(143 207 255 / 55%);
  border-radius: 10px;
  color: #d7efff;
  background: #0b4b94;
  cursor: pointer;
  font: inherit;
  font-size: 11px;
  font-weight: 900;
}

.game-menu__quality-options button.active {
  border-color: #ffe47b;
  color: #09254f;
  background: #ffcb35;
}

.game-menu__city-copy span {
  color: var(--game-gold);
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.16em;
}

.game-menu__city-copy strong {
  margin-top: 2px;
  font-size: 24px;
}

.game-menu__city-copy small {
  color: #cbe9ff;
}

.game-menu__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #9cc9ed;
  font-size: 11px;
  letter-spacing: 0.08em;
}

.game-menu__footer kbd {
  padding: 4px 7px;
  border: 1px solid #73b7eb;
  border-radius: 5px;
  color: #ffffff;
  background: #124888;
  font-family: inherit;
}

.game-menu:not(.game-menu--paused) {
  background:
    repeating-linear-gradient(
      135deg,
      rgb(255 255 255 / 1.5%) 0 2px,
      transparent 2px 10px
    ),
    linear-gradient(115deg, rgb(19 19 16 / 98%), rgb(48 45 37 / 96%));
}

.game-menu:not(.game-menu--paused)::before {
  background-image:
    linear-gradient(rgb(184 173 143 / 6%) 1px, transparent 1px),
    linear-gradient(90deg, rgb(184 173 143 / 6%) 1px, transparent 1px);
}

.game-menu:not(.game-menu--paused) .game-menu__card {
  border: 1px solid var(--hud-metal-light);
  border-radius: 0;
  background: var(--hud-panel-deep);
  box-shadow: 0 2px 8px rgb(23 33 58 / 10%);
  clip-path: polygon(
    12px 0,
    100% 0,
    100% calc(100% - 12px),
    calc(100% - 12px) 100%,
    0 100%,
    0 12px
  );
}

.game-menu:not(.game-menu--paused) .game-menu__navigation {
  background:
    repeating-linear-gradient(
      135deg,
      rgb(255 255 255 / 2%) 0 2px,
      transparent 2px 9px
    ),
    linear-gradient(150deg, rgb(67 63 53 / 98%), rgb(24 24 20 / 98%));
}

.game-menu:not(.game-menu--paused) .game-menu__badge {
  border-color: #c7b87e;
  border-radius: 2px;
  color: #e4d7b1;
  background: linear-gradient(145deg, #5d584a, #26251f);
  box-shadow: var(--hud-shadow);
}

.game-menu:not(.game-menu--paused) .game-menu__brand span,
.game-menu:not(.game-menu--paused) .game-menu__eyebrow,
.game-menu:not(.game-menu--paused) .game-menu__brand p,
.game-menu:not(.game-menu--paused) .game-menu__navigation > p,
.game-menu:not(.game-menu--paused) .game-menu__footer {
  color: #cfc5aa;
}

.game-menu:not(.game-menu--paused) .game-menu__brand h1 b {
  color: #d0b463;
}

.game-menu:not(.game-menu--paused) .game-menu__action,
.game-menu:not(.game-menu--paused) .game-menu__setting-button {
  border: 1px solid #817967;
  border-radius: 0;
  color: #eee9dc;
  background: linear-gradient(180deg, #4e4a3f, #292823);
  box-shadow:
    none;
  clip-path: polygon(
    7px 0,
    100% 0,
    100% calc(100% - 7px),
    calc(100% - 7px) 100%,
    0 100%,
    0 7px
  );
}

.game-menu:not(.game-menu--paused) .game-menu__action--primary {
  border-color: #c7af65;
  color: #171711;
  background: linear-gradient(180deg, #d5bd70, #9f812f);
}

@media (max-width: 800px) {
  .game-menu {
    padding: 20px;
  }

  .game-menu__card {
    min-height: 0;
    grid-template-columns: 1fr;
  }

  .game-menu__city {
    display: none;
  }

  .game-menu__brand {
    margin-bottom: 18px;
  }
}
</style>
