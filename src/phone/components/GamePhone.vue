<script setup>
import ShareApp from './ShareApp.vue';
import HeistPanel from '../../heist/HeistPanel.vue';
import HousingApp from "../../housing/HousingApp.vue";
import GovernmentPanel from '../../government/GovernmentPanel.vue';
import CareerPanel from "../../careers/CareerPanel.vue";
import BigPeopleClub from "../../wealth/BigPeopleClub.vue";
import { STOCK_ADVISER_PRICE, STOCK_ADVISER_DAYS } from '../../economy/data/stockMarket.js';
import { PHONES, phoneThemeStyle } from '../../customization/catalogue.js';
import '../../customization/phoneThemes.css';
import CustomizeShop from "../../customization/components/CustomizeShop.vue";
import { createManagedAudio } from "../../audio/audioLifecycle.js";
import {
  computed,
  onBeforeUnmount,
  ref,
  watch,
} from "vue";

import "@fortawesome/fontawesome-free/css/all.min.css";

import ToggleIcon from "../../ui/components/ToggleIcon.vue";
import { clearGameCaches } from "../../game/appCache.js";
import { PHONE_APPS } from "../data/phoneApps.js";
import phoneLauncherUrl from "../../assets/ui/phone-launcher.png";
import {
  musicAudioSettings,
  setMusicSettings,
  MUSIC_TRACKS,
  musicPlayerState,
  openCustomMusicFolder,
  playMusicTrack,
  playNextMusicTrack,
  playPreviousMusicTrack,
  refreshCustomMusicLibrary,
  setMusicMode,
  toggleMusicPlayback,
} from "../../audio/musicPlayer.js";
import {
  performanceSettings,
  setAdaptivePerformance,
  setPerformanceMonitorVisible,
  setRenderQuality,
} from "../../performance/performanceSettings.js";
import { CHARACTER_DEFINITIONS } from "../../characters/data/characters.js";
import {
  hudPreferences,
  setHudPreference,
} from "../../hud/hudPreferences.js";
import { playGameSound } from "../../audio/gameAudio.js";
import { STARTER_HOMES } from "../../property/data/starterHomes.js";
import { connection, getPlayerMessages, sendPlayerMessage, getPlayerTransfers, sendPlayerTransfer, claimPlayerTransfers, getPlaceAds, bookPlaceAd } from "../../network/connection.js";
import { BILLBOARDS, PLACE_AD_PRICE, PLACE_AD_SLOT_MINUTES, PLACE_AD_TIME_ZONE, realWorldAdDate, scheduledTimesForBooking } from '../../advertising/billboards.js';
import { uploadPlaceAdImage } from '../../advertising/placeAdStorage.js';

const PHONE_STATE_STORAGE_KEY = "total-city-grind-phone-v2";

const PHONE_CONTACTS = Object.freeze([
  Object.freeze({
    id: "family-group",
    name: "Family group chat",
    role: "Family back home",
    iconClass: "fa-solid fa-user-group",
    initials: "FG",
  }),
  Object.freeze({
    id: "megapay-bank",
    name: "MegaPay Bank",
    role: "Banking, account alerts, and loans",
    iconClass: "fa-solid fa-building-columns",
    initials: "MP",
    portraitUrl: CHARACTER_DEFINITIONS.bankRepresentative.portraitUrl,
  }),
  Object.freeze({
    id: "car-owner",
    name: "Danfo Owner",
    role: "Danfo owner and route dispatcher",
    iconClass: "fa-solid fa-key",
    initials: "CO",
    portraitUrl: CHARACTER_DEFINITIONS.carOwner.portraitUrl,
  }),
  Object.freeze({
    id: "mechanic",
    name: "Mechanic",
    role: "Repairs and vehicle servicing",
    iconClass: "fa-solid fa-screwdriver-wrench",
    initials: "ME",
    portraitUrl: CHARACTER_DEFINITIONS.mechanic.portraitUrl,
  }),
  Object.freeze({
    id: "doctor",
    name: "Doctor",
    role: "Private mobile medical treatment",
    iconClass: "fa-solid fa-user-doctor",
    initials: "DR",
    portraitUrl: CHARACTER_DEFINITIONS.doctor.portraitUrl,
  }),
  Object.freeze({
    id: "landlord",
    name: CHARACTER_DEFINITIONS.landlord.name,
    role: CHARACTER_DEFINITIONS.landlord.role,
    iconClass: "fa-solid fa-house",
    initials: "LA",
    portraitUrl: CHARACTER_DEFINITIONS.landlord.portraitUrl,
  }),
  Object.freeze({
    id: "fuel-attendant",
    name: "Fuel Attendant",
    role: "Petrol station assistance",
    iconClass: "fa-solid fa-gas-pump",
    initials: "FA",
  }),
  Object.freeze({
    id: "union-rep",
    name: "Danfo Union Rep",
    role: "Union matters, levies, and driver support",
    iconClass: "fa-solid fa-people-group",
    initials: "UR",
  }),
  Object.freeze({
    id: "mutiu-illegal",
    name: "Mr-Wire",
    role: "Hustler",
    iconClass: "fa-solid fa-flag-checkered",
    initials: "MI",
    portraitUrl: CHARACTER_DEFINITIONS.mutiu.portraitUrl,
  }),
]);

const FAMILY_MESSAGE_CONTACT_IDS = Object.freeze(['sister', 'mother', 'father', 'brother', 'aunty', 'uncle']);
function familyContactId(id) { return FAMILY_MESSAGE_CONTACT_IDS.includes(id) ? 'family-group' : id; }

const CALLABLE_CONTACT_IDS = Object.freeze([
  "mechanic",
  "doctor",
  "fuel-attendant",
  "mutiu-illegal",
]);

const props = defineProps({
 heistMinute:Number,heistView:Object,heistBusy:Boolean,heistError:String,
  housingView:Object,housingBusy:Boolean,housingError:String,
  intoxication:{type:Number,default:0},
  government:{type:Object,default:null},governmentUnread:{type:Number,default:0},governmentBusy:Boolean,governmentError:String,
  careerState: {type:Object,default:()=>({courses:{},certificates:[],lesson:null,job:null})},
  careerMinute:Number, careerOccupied:Object, careerBusy:Boolean, careerError:String, aiTrafficEnabled:{type:Boolean,default:true},
  netWorth: { type: Object, default: () => ({ total: 0, cash: 0, savings: 0, stocks: 0, properties: 0, vehicles: 0, businesses: 0, debts: 0 }) },
  playerName: { type: String, default: "Driver" },
  customizationVehicle: { type: Object, default: () => ({id:'starter-danfo',width:40,length:70}) },
  customizationState: { type: Object, default: () => ({owned:{sticker:[],paint:[],phone:[]},vehicles:{},phone:null}) },
  gameTime: {
    type: String,
    default: "6:00 AM",
  },
  currentDay: {
    type: Number,
    default: 1,
  },
  trafficPeriod: {
    type: String,
    default: "NORMAL",
  },
  garageFee: {
    type: Number,
    default: 0,
  },
  money: {
    type: Number,
    default: 0,
  },
  savingsBalance: {
    type: Number,
    default: 0,
  },
  stockAdviser: {
    type: Object,
    default: () => ({ untilDay: 0, messages: [], nextId: 1, readThrough: 0 }),
  },
  stockMarket: {
    type: Array,
    default: () => [],
  },
  routes: {
    type: Array,
    default: () => [],
  },
  routeStatus: {
    type: String,
    default: "selecting",
  },
  activeRoute: {
    type: Object,
    default: null,
  },
  currentStop: {
    type: Object,
    default: null,
  },
  followingStop: {
    type: Object,
    default: null,
  },
  currentStopIndex: {
    type: Number,
    default: 0,
  },
  navigationAngle: {
    type: Number,
    default: 0,
  },
  damage: {
    type: Number,
    default: 0,
  },
  health: {
    type: Number,
    default: 100,
  },
  energy: {
    type: Number,
    default: 100,
  },
  repairCost: {
    type: Number,
    default: 0,
  },
  transactions: {
    type: Array,
    default: () => [],
  },
  bankMessages: {
    type: Array,
    default: () => [],
  },
  loanOfferReceived: {
    type: Boolean,
    default: false,
  },
  loanBalance: {
    type: Number,
    default: 0,
  },
  largeLoanBalance: {
    type: Number,
    default: 0,
  },
  largeLoanEligible: {
    type: Boolean,
    default: false,
  },
  bankLoanAmount: {
    type: Number,
    default: 50000,
  },
  bankLoanInterestRate: {
    type: Number,
    default: 0.15,
  },
  incomingCall: {
    type: Object,
    default: null,
  },
  mapLocations: {
    type: Array,
    default: () => [],
  },
  navigationTarget: {
    type: Object,
    default: null,
  },
  carCatalogue: {
    type: Array,
    default: () => [],
  },
  ownedVehicleIds: {
    type: Array,
    default: () => [],
  },
  activeVehicleId: {
    type: String,
    default: "starter-danfo",
  },
  homeParkingAvailable: {
    type: Boolean,
    default: false,
  },
  motoEaziUnlocked: {
    type: Boolean,
    default: false,
  },
  motoEaziOffers: {
    type: Array,
    default: () => [],
  },
  motoEaziWaiting: {
    type: Boolean,
    default: false,
  },
  motoEaziActiveRequest: {
    type: Object,
    default: null,
  },
  motoEaziStage: {
    type: String,
    default: "idle",
  },
  motoEaziTarget: {
    type: Object,
    default: null,
  },
  motoEaziCompletedCount: {
    type: Number,
    default: 0,
  },
  motoEaziDriverRating: { type: Number, default: 5 },
  motoEaziRideElapsedSeconds: { type: Number, default: 0 },
  motoEaziRideExpectedSeconds: { type: Number, default: 0 },
  motoEaziRideCollisionCount: { type: Number, default: 0 },
  motoEaziProjectedStars: { type: Number, default: 5 },
  motoEaziLastResult: { type: Object, default: null },
  soundVolume: {
    type: Number,
    default: 1,
  },
  soundMuted: {
    type: Boolean,
    default: false,
  },
  outstandingFines: {
    type: Number,
    default: 0,
  },
  fineEntries: {
    type: Array,
    default: () => [],
  },
  vehicleImpounded: {
    type: Boolean,
    default: false,
  },
  doctorCallCost: {
    type: Number,
    default: 0,
  },
  fuel: {
    type: Number,
    default: 100,
  },
  roadsideFuelCost: {
    type: Number,
    default: 0,
  },
  roadsideFuelPercent: {
    type: Number,
    default: 0,
  },
  roadsideFuelDistance: {
    type: Number,
    default: 0,
  },
  currentJob: {
    type: String,
    default: null,
  },
  driverLicence: {
    type: Object,
    default: () => ({
      score: 80,
      rating: "B",
      testStatus: "idle",
      testStopIndex: 0,
      testStopIds: [],
      lastTestResult: null,
    }),
  },
  jobRequired: {
    type: Boolean,
    default: false,
  },
  inventoryItems: {
    type: Array,
    default: () => [],
  },
  godMode: Boolean,
  shareRewardAmount: { type: Number, default: 50000 },
  debugVisible: {
    type: Boolean,
    default: false,
  },
  observerMode: {
    type: Boolean,
    default: false,
  },
  currentMapId: {
    type: String,
    default: "mainland",
  },
  raceActive: {
    type: Boolean,
    default: false,
  },
  showWorldTravelDebug: {
    type: Boolean,
    default: true,
  },
  showRaceDebug: {
    type: Boolean,
    default: true,
  },
  objectives: {
    type: Array,
    default: () => [],
  },
  objectiveCategories: {
    type: Object,
    default: () => ({}),
  },
  trackedObjectiveId: {
    type: String,
    default: null,
  },
  lifeObligations: {
    type: Object,
    default: () => ({
      notificationRevision: 0,
      familyTrust: 0,
      discountCoupons: 0,
      rent: {},
      schoolFees: {},
    }),
  },
  propertyState: { type: Object, default: () => ({ activeHomeId: "starter-rental", ownedPropertyIds: [], rentals: { listings: {}, messages: [] } }) },
  propertyCatalogue: { type: Array, default: () => [] },
});

const equippedPhone = computed(() => PHONES.find(phone => phone.id === props.customizationState.phone));
const equippedPhoneStyle = computed(() => phoneThemeStyle(equippedPhone.value));
const currentHomeAddress = computed(() => {
  if (props.propertyState.activeHomeId === "starter-rental") {
    const home = STARTER_HOMES.find(item => item.id === props.propertyState.starterHomeId);
    if (!home) return "No home selected";
    const street = home.row && home.row !== home.label ? `${home.row}, ` : "";
    return `${home.name}, ${street}${home.district || "Lagos"}`;
  }
  const home = props.propertyCatalogue.find(item => item.id === props.propertyState.activeHomeId);
  return home ? `${home.name}, ${home.district || "Lagos"}` : "No home selected";
});


const transactionReviewMessage = computed(() =>
  connection.transactionsLocked
    ? "Transactions are temporarily unavailable while account activity is being reviewed."
    : "",
);

const weekdayLabel = computed(() => {
  const weekdays = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
  const day = Math.max(1, Math.floor(Number(props.currentDay) || 1));
  return weekdays[(day - 1) % weekdays.length];
});

const emit = defineEmits([
  "heist-action",
  "housing-action",
  "government-action",
  "career-action", "toggle-ai-traffic",
  "customize-vehicle",
  "select-route",
  "call-mechanic",
  "call-doctor",
  "call-fuel-attendant",
  "repay-loan",
  "take-bank-loan",
  "subscribe-stock-adviser",
  "cancel-stock-adviser",
  "read-stock-adviser",
  "buy-stock",
  "sell-stock",
  "accept-incoming-call",
  "decline-incoming-call",
  "select-map-destination",
  "call-car-owner",
  "call-mutiu",
  "wait-moto-eazi-request",
  "accept-moto-eazi-request",
  "reject-moto-eazi-request",
  "change-sound-settings",
  "pay-fines",
  "select-job",
  "start-driving-test",
  "consume-inventory-item",
  "toggle-debug",
  "toggle-god-mode",
  "toggle-observer",
  "save-game",
  "track-objective",
  "claim-objective-reward",
  "share-completed",
  "objective-event",
  "pay-rent",
  "pay-school-fees",
  "pay-family-request",
  "debug-go-coastal-city",
  "debug-start-race",
  "clear-saved-state",
  "list-property-rental",
  "remove-property-rental",
  "resolve-late-rent",
  "player-transfer-sent",
  "player-transfer-received",
  "place-ad-purchased",
]);

function loadSavedPhoneState() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return JSON.parse(
      window.localStorage.getItem(
        PHONE_STATE_STORAGE_KEY,
      ),
    );
  } catch {
    return null;
  }
}

const savedPhoneState = loadSavedPhoneState();
const isOpen = ref(Boolean(savedPhoneState?.isOpen));
const unreadMessageContactIds = ref(
  props.routeStatus === "selecting" ? ["car-owner"] : [],
);
const hasUnreadMessage = computed(() => unreadMessageContactIds.value.length > 0);
const hasUnreadBankMessage = ref(false);
const hasUnreadMotoRequest = ref(false);
const hasUnreadFine = ref(false);
const isNotificationShaking = ref(false);
let notificationShakeTimer = null;
const answeredCall = ref(null);
const callAnswered = ref(false);
let ringtoneAudio = null;
let voiceNoteAudio = null;
let ringTimeout = null;
const transferAmount = ref("");
const rentalAmounts = ref({});
const transferReceiver = ref("");
const playerMessages = ref([]);
const playerTransfers = ref([]);
const socialBusy = ref(false);
const socialError = ref("");
const showNewMessageComposer = ref(false);
const newMessageUsername = ref("");
const newMessageText = ref("");
const threadReplyText = ref("");
const playerTransferUsername = ref("");
const playerTransferAmount = ref("");
const transferFeedback = ref("");
const placeAdBillboardId = ref(BILLBOARDS[0]?.id || "billboard-01");
const placeAdDate = ref(realWorldAdDate());
const placeAdImageDataUrl = ref("");
const placeAdFile = ref(null);
const placeAdFileName = ref("");
const placeAdBookings = ref([]);
const placeAdBusy = ref(false);
const placeAdFeedback = ref("");
const placeAdSchedule = ref([]);
let messageRefreshTimer = null;
const loanRepaymentType = ref("quick");
const megapayPaymentTarget = ref("");
const megapayPaymentAmount = ref("");
const locationQuery = ref("");
const saveAcknowledged = ref(false);
const familyDebugVisible = ref(false);
const clearSaveWarningVisible = ref(false);
const cacheWarningVisible = ref(false);
const clearingCache = ref(false);
const cacheError = ref("");
async function clearCacheAndReload() {
  if (clearingCache.value) return;
  clearingCache.value = true;
  cacheError.value = "";
  try {
    await clearGameCaches();
    window.location.reload();
  } catch {
    cacheError.value = "Could not clear the cache. Your saves are unchanged. Please try again.";
    clearingCache.value = false;
  }
}
let saveAcknowledgedTimer = null;
// A fresh game/map load must always open the phone on its launcher.
// Only the physical open/closed phone state is restored from storage.
const activeMessageContactId = ref(null);
const activeAppId = ref(null);
const debuggerUnlocked = ref(false);
const debugUnlockVisible = ref(false);
const debugUnlockPassword = ref("");
const debugUnlockError = ref("");
const DEBUGGER_PASSWORD = "ADMINDEBUG";
const DEBUGGER_TAP_TARGET = 5;
let debuggerTapCount = 0;
let debuggerTapResetTimer = null;

function closeDebugUnlock() {
  debugUnlockVisible.value = false;
  debugUnlockPassword.value = "";
  debugUnlockError.value = "";
}

function submitDebugUnlock() {
  if (debugUnlockPassword.value === DEBUGGER_PASSWORD) {
    debuggerUnlocked.value = true;
    activeAppId.value = null;
    closeDebugUnlock();
    return;
  }
  debugUnlockError.value = "Incorrect password.";
  debugUnlockPassword.value = "";
}

function handleDebugUnlockTap() {
  if (debuggerUnlocked.value || debugUnlockVisible.value) return;
  debuggerTapCount += 1;
  window.clearTimeout(debuggerTapResetTimer);
  debuggerTapResetTimer = window.setTimeout(() => {
    debuggerTapCount = 0;
  }, 4000);
  if (debuggerTapCount < DEBUGGER_TAP_TARGET) return;
  debuggerTapCount = 0;
  window.clearTimeout(debuggerTapResetTimer);
  debugUnlockPassword.value = "";
  debugUnlockError.value = "";
  debugUnlockVisible.value = true;
}

const mutiuReply = ref(
  "You want to race? Call me when the city is dark.",
);

const activeApp = computed(() => {
  return PHONE_APPS.find((app) => {
    return app.id === activeAppId.value;
  }) ?? null;
});

const displayedCall = computed(() => {
  return props.incomingCall ?? answeredCall.value;
});

const launcherApps = computed(() => {
  return PHONE_APPS.filter((app) => !app.hidden && (app.id !== "debugger" || debuggerUnlocked.value));
});
const currentUsername = computed(() => connection.user?.user_metadata?.username || "");
const activePlayerThreadUsername = computed(() => activeMessageContactId.value?.startsWith("player:") ? activeMessageContactId.value.slice(7) : "");
const activePlayerThreadMessages = computed(() => playerMessages.value.filter(message => {
  if (!activePlayerThreadUsername.value) return false;
  const other = message.senderId === connection.user?.id ? message.recipientUsername : message.senderUsername;
  return other?.toLowerCase() === activePlayerThreadUsername.value.toLowerCase();
}));
const playerMessageThreads = computed(() => {
  const map = new Map();
  for (const message of playerMessages.value) {
    const sentByMe = message.senderId === connection.user?.id;
    const username = sentByMe ? message.recipientUsername : message.senderUsername;
    if (!username) continue;
    const existing = map.get(username.toLowerCase());
    if (!existing || message.createdAt > existing.createdAt) map.set(username.toLowerCase(), { username, text: message.text, createdAt: message.createdAt });
  }
  return [...map.values()].sort((a,b)=>b.createdAt-a.createdAt);
});

const orderedPhoneContacts = computed(() => {
  return [
    ...PHONE_CONTACTS.filter((contact) => {
      return CALLABLE_CONTACT_IDS.includes(contact.id);
    }),
    ...PHONE_CONTACTS.filter((contact) => {
      return !CALLABLE_CONTACT_IDS.includes(contact.id);
    }),
  ];
});

const accountAppIds = Object.freeze([
  "find-job",
  "driver-licence",
  "fines",
  "garage",
]);

const appHeaderTitle = computed(() => {
  if (activeAppId.value === "bpc") return "Big People Club";
  if (activeAppId.value === "messages" && activeMessageContactId.value === "government") return "Government";
  if (activeAppId.value === "messages" && activeMessageContactId.value === "stock-adviser") return "Stock Adviser";
  if (activeAppId.value === "messages" && activePlayerThreadUsername.value) return `@${activePlayerThreadUsername.value}`;
  if (activeAppId.value === "messages" && activeMessageContactId.value) {
    return PHONE_CONTACTS.find((contact) => {
      return contact.id === activeMessageContactId.value;
    })?.name ?? "Messages";
  }

  if (accountAppIds.includes(activeAppId.value)) {
    return "My Account";
  }

  return activeApp.value?.label ?? "Phone";
});

const currentMusicTrack = computed(() => {
  return MUSIC_TRACKS[musicPlayerState.currentIndex] ?? MUSIC_TRACKS[0];
});

function chooseMusicTrack(index) {
  playMusicTrack(index, {
    mode: musicPlayerState.mode,
    source: "phone",
  });
}

function formatMoney(amount) {
  const safeAmount = Math.round(Number(amount) || 0);
  return `\u20A6${safeAmount.toLocaleString("en-NG")}`;
}


function formatRideDuration(seconds) {
  const safeSeconds = Math.max(0, Math.ceil(Number(seconds) || 0));
  const minutes = Math.floor(safeSeconds / 60);
  return `${minutes}:${String(safeSeconds % 60).padStart(2, "0")}`;
}
function formatTransactionTime(value) {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const formattedMoney = computed(() => {
  return formatMoney(props.money);
});

const stockPortfolioValue = computed(() => {
  return props.stockMarket.reduce(
    (total, company) => total + Number(company.investedAmount ?? company.value ?? 0),
    0,
  );
});

const stockPortfolioCurrentValue = computed(() => {
  return props.stockMarket.reduce(
    (total, company) => total + Number(company.currentAmount ?? company.value ?? 0),
    0,
  );
});

const objectiveGroups = computed(() => {
  return Object.entries(props.objectiveCategories).map(([id, label]) => ({
    id,
    label,
    objectives: props.objectives.filter((objective) => {
      return (
        objective.category === id &&
        !["locked", "dormant"].includes(objective.status)
      );
    }),
  })).filter((group) => group.objectives.length > 0);
});

function formatObjectiveProgress(objective) {
  if (objective.target >= 1000) {
    return `${formatMoney(objective.progress)} / ${formatMoney(objective.target)}`;
  }

  return `${Math.round(objective.progress)} / ${objective.target}`;
}

function runDebugShortcut(eventName) {
  emit(eventName);
  activeAppId.value = null;
  isOpen.value = false;
}

const hasUnreadNotification = computed(() => {
  return (
    props.governmentUnread > 0 ||
    adviserUnreadCount.value > 0 ||
    hasUnreadMessage.value ||
    hasUnreadBankMessage.value ||
    hasUnreadMotoRequest.value ||
    hasUnreadFine.value ||
    props.jobRequired
  );
});

const adviserUnreadCount = computed(() => props.stockAdviser.messages.filter(message => message.id > props.stockAdviser.readThrough).length);
watch(()=>props.governmentUnread, count=>{if(count&&activeAppId.value==='messages'&&activeMessageContactId.value==='government')emit('government-action',{op:'read'});});
const adviserActive = computed(() => props.stockAdviser.untilDay > props.currentDay);
watch(() => props.stockAdviser.nextId, (nextId, previousId) => {
  if (nextId > previousId && props.stockAdviser.messages.length) triggerPhoneNotification();
  if (activeAppId.value === 'messages' && activeMessageContactId.value === 'stock-adviser') emit('read-stock-adviser');
});

// Watch message identities, not unread counts: reading and polling must not replay alerts.
watch(
  () => props.government?.messages?.map(message => message.id) ?? null,
  (ids, previousIds) => {
    if (!ids || !previousIds) return;
    const previousLatest = Math.max(0, ...previousIds);
    if (ids.some(id => id > previousLatest)) triggerPhoneNotification();
  },
);
watch(
  () => (props.propertyState.rentals?.messages ?? []).map(message => JSON.stringify([message.day, message.propertyId, message.text])),
  (messages, previousMessages) => {
    const previous = new Map();
    for (const key of previousMessages) previous.set(key, (previous.get(key) ?? 0) + 1);
    const hasNew = messages.some(key => {
      const count = previous.get(key) ?? 0;
      if (!count) return true;
      previous.set(key, count - 1);
      return false;
    });
    if (!hasNew) return;
    if (activeAppId.value !== 'messages' || activeMessageContactId.value !== 'realtor') markMessageContactUnread('realtor');
    triggerPhoneNotification();
  },
);
watch(() => props.jobRequired, (required, previous) => {
  if (required && !previous) triggerPhoneNotification();
});

watch(()=>props.heistView?.available,(available,previous)=>{if(available&&!previous){markMessageContactUnread('mutiu-illegal');triggerPhoneNotification();}});
const notificationCount = computed(() => {
  return (
    Number(props.governmentUnread > 0) +
    Number(adviserUnreadCount.value > 0) +
    Number(hasUnreadMessage.value) +
    Number(hasUnreadBankMessage.value) +
    Number(hasUnreadMotoRequest.value) +
    Number(hasUnreadFine.value) +
    Number(props.jobRequired)
  );
});

const bankMessages = computed(() => props.bankMessages);
const hasMessagesAppAttention = computed(() => {
  return props.governmentUnread > 0 || adviserUnreadCount.value > 0 || hasUnreadMessage.value || hasUnreadBankMessage.value;
});

function markMessageContactUnread(contactId) {
  contactId = familyContactId(contactId);
  if (!contactId || unreadMessageContactIds.value.includes(contactId)) {
    return;
  }
  unreadMessageContactIds.value = [...unreadMessageContactIds.value, contactId];
}

function clearMessageContactUnread(contactId) {
  unreadMessageContactIds.value = unreadMessageContactIds.value.filter((id) => id !== contactId);
}

function isMessageContactUnread(contactId) {
  return unreadMessageContactIds.value.includes(contactId);
}

const familyRequestEntries = computed(() => {
  const entries = props.lifeObligations.familyRequests?.entries ?? [];
  return Array.isArray(entries) ? entries : Object.values(entries);
});

function getFamilyRequestRemaining(request) {
  return request ? Math.max(0, Number(request.amount ?? 0) - Number(request.paidAmount ?? 0)) : 0;
}

function activeFamilyAttentionContactId() {
  const activeFamilyRequest = familyRequestEntries.value.find((entry) => {
    return entry.id === props.lifeObligations.familyRequests?.activeId;
  });
  if (activeFamilyRequest?.contactId) {
    return "family-group";
  }
  if (["active", "late"].includes(props.lifeObligations.schoolFees?.status)) {
    return "family-group";
  }
  return null;
}

const megapayPaymentOptions = computed(() => {
  const options = [];
  if (["due", "grace", "overdue"].includes(props.lifeObligations.rent?.status)) {
    const amount = Number(props.lifeObligations.rent?.amountDue ?? 0);
    options.push({ id: "rent", label: "Weekly rent", amount, fixed: true });
  }
  if (["active", "late"].includes(props.lifeObligations.schoolFees?.status)) {
    options.push({
      id: "school-fees",
      label: "Family school fees",
      amount: Number(props.lifeObligations.schoolFees?.remainingAmount ?? 0),
    });
  }
  const activeFamilyRequest = familyRequestEntries.value.find((entry) => {
    return entry.id === props.lifeObligations.familyRequests?.activeId;
  });
  if (activeFamilyRequest && ["active", "late"].includes(activeFamilyRequest.status)) {
    options.push({
      id: "family-request",
      label: `Family: ${activeFamilyRequest.title}`,
      amount: getFamilyRequestRemaining(activeFamilyRequest),
    });
  }
  if (props.loanBalance > 0) {
    options.push({ id: "quick-loan", label: "Quick loan", amount: props.loanBalance });
  }
  if (props.largeLoanBalance > 0) {
    options.push({ id: "large-loan", label: "Large bank loan", amount: props.largeLoanBalance });
  }
  return options.filter((option) => option.amount > 0);
});

const selectedMegapayPayment = computed(() => {
  return megapayPaymentOptions.value.find((option) => option.id === megapayPaymentTarget.value) ?? null;
});

function selectMegapayPayment() {
  megapayPaymentAmount.value = selectedMegapayPayment.value?.amount ?? "";
}

const locationMatches = computed(() => {
  const query = locationQuery.value.trim().toLowerCase();

  if (!query) {
    return [];
  }

  return props.mapLocations
    .filter((location) => {
      return (
        location.label.toLowerCase().includes(query) ||
        (location.searchAliases || "").toLowerCase().includes(query) ||
        location.districtName.toLowerCase().includes(query)
      );
    })
    .slice(0, 8);
});

function triggerPhoneNotification() {
  if (typeof window === "undefined") {
    return;
  }

  playGameSound("notification", { cooldownMilliseconds: 300 });
  isNotificationShaking.value = false;
  window.clearTimeout(notificationShakeTimer);

  window.requestAnimationFrame(() => {
    isNotificationShaking.value = true;
    notificationShakeTimer = window.setTimeout(() => {
      isNotificationShaking.value = false;
    }, 700);
  });
}

function stopRingtone() {
  window.clearTimeout(ringTimeout);
  ringTimeout = null;
  if (!ringtoneAudio) return;
  ringtoneAudio.pause();
  ringtoneAudio.currentTime = 0;
  ringtoneAudio = null;
}

function stopVoiceNote() {
  if (!voiceNoteAudio) return;
  voiceNoteAudio.onended = null;
  voiceNoteAudio.onerror = null;
  voiceNoteAudio.pause();
  voiceNoteAudio.currentTime = 0;
  voiceNoteAudio = null;
}

function finishAnsweredCall() {
  const call = answeredCall.value;
  stopVoiceNote();
  answeredCall.value = null;
  callAnswered.value = false;
  if (call) {
    emit("accept-incoming-call", call);
  }
}

function answerIncomingCall(call = displayedCall.value) {
  if (!call || callAnswered.value) return;

  stopRingtone();
  answeredCall.value = call;
  callAnswered.value = true;

  if (!call.audioUrl || typeof Audio === "undefined") {
    finishAnsweredCall();
    return;
  }

  voiceNoteAudio = createManagedAudio(call.audioUrl);
  voiceNoteAudio.volume = props.soundMuted
    ? 0
    : Math.min(0.72, 0.68 * props.soundVolume);
  voiceNoteAudio.onended = finishAnsweredCall;
  voiceNoteAudio.onerror = finishAnsweredCall;
  voiceNoteAudio.play().catch(finishAnsweredCall);
}

function declineOrEndIncomingCall() {
  const call = displayedCall.value;
  stopRingtone();
  stopVoiceNote();
  answeredCall.value = null;
  callAnswered.value = false;
  if (call) {
    emit("decline-incoming-call", call);
  }
}

function beginRinging(call) {
  stopRingtone();
  stopVoiceNote();
  answeredCall.value = null;
  callAnswered.value = false;
  if (!call) return;

  if (call.autoAnswer) {
    window.requestAnimationFrame(() => {
      answerIncomingCall(call);
    });
    return;
  }

  ringtoneAudio = playGameSound("phoneRing", {
    loop: true,
  });
  ringTimeout = window.setTimeout(() => {
    declineOrEndIncomingCall();
  }, 25000);
}

watch(
  () => props.incomingCall?.instanceId ?? null,
  (instanceId, previousInstanceId) => {
    if (instanceId && instanceId !== previousInstanceId) {
      beginRinging(props.incomingCall);
      return;
    }

    if (!instanceId && !answeredCall.value) {
      stopRingtone();
    }
  },
  { immediate: true },
);

watch(
  () => [props.soundMuted, props.soundVolume],
  () => {
    if (voiceNoteAudio) {
      voiceNoteAudio.volume = props.soundMuted
        ? 0
        : Math.min(0.72, 0.68 * props.soundVolume);
    }
  },
);

onBeforeUnmount(() => {
  stopRingtone();
  stopVoiceNote();
  window.clearTimeout(notificationShakeTimer);
  window.clearTimeout(saveAcknowledgedTimer);
  window.clearTimeout(debuggerTapResetTimer);
  window.clearInterval(messageRefreshTimer);
});

function requestGameSave() {
  emit("save-game");
  saveAcknowledged.value = true;
  window.clearTimeout(saveAcknowledgedTimer);
  saveAcknowledgedTimer = window.setTimeout(() => {
    saveAcknowledged.value = false;
  }, 1800);
}

const totalSpent = computed(() => {
  return props.transactions
    .filter((transaction) => {
      return transaction.direction === "expense";
    })
    .reduce((total, transaction) => {
      return total + transaction.amount;
    }, 0);
});

const totalReceived = computed(() => {
  return props.transactions
    .filter((transaction) => {
      return transaction.direction === "income";
    })
    .reduce((total, transaction) => {
      return total + transaction.amount;
    }, 0);
});

const damageState = computed(() => {
  if (props.damage >= 100) return "Engine disabled";
  if (props.damage >= 61) return "Severe damage";
  if (props.damage >= 26) return "Moderate damage";
  if (props.damage > 0) return "Light damage";
  return "No damage";
});

const navigationArrowStyle = computed(() => ({
  transform: `rotate(${props.navigationAngle}deg)`,
}));

const currentStopNumber = computed(() => {
  return Math.max(1, props.currentStopIndex + 1);
});

watch(
  () => props.routeStatus,
  (status, previousStatus) => {
    if (status !== "selecting") {
      clearMessageContactUnread("car-owner");
      return;
    }

    markMessageContactUnread("car-owner");

    if (previousStatus !== undefined && previousStatus !== "selecting") {
      triggerPhoneNotification();
    }
  },
);

watch(
  () => props.bankMessages[0]?.id,
  (transactionId, previousTransactionId) => {
    if (!transactionId || transactionId === previousTransactionId) {
      return;
    }

    const latestTransaction = props.bankMessages[0];

    hasUnreadBankMessage.value = true;
    triggerPhoneNotification();
  },
);

watch(
  () => props.loanOfferReceived,
  (offered, previouslyOffered) => {
    if (offered && !previouslyOffered) {
      hasUnreadBankMessage.value = true;
      triggerPhoneNotification();
    }
  },
);

watch(
  () => props.motoEaziOffers.map((offer) => offer.id).join("|"),
  (requestIds, previousRequestIds) => {
    const previousIds = new Set((previousRequestIds || "").split("|").filter(Boolean));
    const hasNewRequest = requestIds
      .split("|")
      .filter(Boolean)
      .some((requestId) => !previousIds.has(requestId));
    if (hasNewRequest) {
      hasUnreadMotoRequest.value = true;
      triggerPhoneNotification();
    }
  },
);

watch(
  () => props.fineEntries[0]?.id,
  (fineId, previousFineId) => {
    if (fineId && fineId !== previousFineId) {
      hasUnreadFine.value = true;
      triggerPhoneNotification();
    }
  },
);

watch(
  () => props.lifeObligations.notificationRevision,
  (revision, previousRevision) => {
    if (revision > previousRevision) {
      const contactId = activeFamilyAttentionContactId();
      if (contactId) {
        markMessageContactUnread(contactId);
      } else {
        hasUnreadBankMessage.value = true;
      }
      triggerPhoneNotification();
    }
  },
);

watch(activeAppId, (appId) => {
  window.clearInterval(messageRefreshTimer);
  messageRefreshTimer = null;
  if (appId === "messages" && connection.user?.id) {
    void refreshPlayerMessages();
    messageRefreshTimer = window.setInterval(() => { void refreshPlayerMessages(); }, 15000);
  }
  if (appId === "wallet" && connection.user?.id) void refreshPlayerTransfers(true);
  if (appId === "place-ad") void refreshPlaceAds();
});

watch(() => connection.user?.id, (userId) => {
  if (userId) void refreshPlayerTransfers(true);
}, { immediate: true });

watch(
  isOpen,
  (open) => {
    if (typeof window === "undefined") {
      return;
    }

    // Do not persist the active app or conversation. Reloading the map must
    // always return the phone to its homepage/launcher.
    window.localStorage.setItem(
      PHONE_STATE_STORAGE_KEY,
      JSON.stringify({ isOpen: open }),
    );
  },
);

function openNavigationFromLauncher() {
  isOpen.value = true;
  openApp("map");
}

function ratingStarClass(star, rating) {
  if (star <= Math.floor(rating)) return "fa-solid fa-star";
  if (star - 0.5 <= rating) return "fa-solid fa-star-half-stroke";
  return "fa-regular fa-star";
}

function openApp(appId) {
  if (appId === "my-account") {
    appId = "find-job";
  }
  activeAppId.value = appId;
  activeMessageContactId.value = null;


  if (appId === "wallet") {
    hasUnreadBankMessage.value = false;
    void refreshPlayerTransfers(true);
  }
  if (appId === "messages") {
    void refreshPlayerMessages();
  }
  if (appId === "place-ad") {
    void refreshPlaceAds();
  }

  if (appId === "moto-eazi") {
    hasUnreadMotoRequest.value = false;
  }

  if (appId === "fines" || appId === "my-account") {
    hasUnreadFine.value = false;
  }

  if (appId === "find-job") {
    emit("objective-event", {
      type: "find-job-opened",
    });
  }
}

function openMessageContact(contactId) {
  if(contactId==='mutiu-illegal'){clearMessageContactUnread(contactId);emit('heist-action',{op:'status'});}
  if(contactId==='government')emit('government-action',{op:'read'});
  contactId = familyContactId(contactId);
  if (contactId === "stock-adviser") emit("read-stock-adviser");
  if (contactId === "realtor") clearMessageContactUnread("realtor");
  activeMessageContactId.value = contactId;

  if (contactId === "family-group") {
    clearMessageContactUnread("family-group");
    FAMILY_MESSAGE_CONTACT_IDS.forEach(clearMessageContactUnread);
    emit("objective-event", {
      type: "welcome-read",
    });
  }

  if (contactId === "car-owner") {
    clearMessageContactUnread("car-owner");
  }

  if (contactId === "megapay-bank") {
    hasUnreadBankMessage.value = false;
  }
  if (FAMILY_MESSAGE_CONTACT_IDS.includes(contactId)) {
    clearMessageContactUnread(contactId);
  }
}

function openContactConversation(contactId) {
  activeAppId.value = "messages";
  openMessageContact(contactId);
}

function handleAppBack() {
  if (activeAppId.value === "messages" && activeMessageContactId.value) {
    activeMessageContactId.value = null;
    return;
  }

  returnHome();
}

function returnHome() {
  activeAppId.value = null;
  activeMessageContactId.value = null;
}

function togglePhone() {
  isOpen.value = !isOpen.value;
}

function changeSoundVolume(event) {
  const volume = Number(event.target.value) / 100;

  emit("change-sound-settings", {
    volume,
    muted: props.soundMuted && volume <= 0,
  });
}

function toggleSoundMuted() {
  emit("change-sound-settings", {
    volume: props.soundVolume,
    muted: !props.soundMuted,
  });
}

function selectRoute(routeId) {
  emit("select-route", routeId);
  activeAppId.value = "map";
}

function selectJob(jobId) {
  if (jobId === "brt" && !["A", "B", "C"].includes(props.driverLicence.rating)) {
    return;
  }
  if (jobId === "moto-eazi" && !props.motoEaziUnlocked) {
    return;
  }
  if (jobId === props.currentJob) return;

  emit("select-job", jobId);
  if (jobId === "moto-eazi") {
    activeAppId.value = "moto-eazi";
    return;
  }
  activeAppId.value = "messages";
  activeMessageContactId.value = "car-owner";
  clearMessageContactUnread("car-owner");
}

function callMechanic() {
  emit("call-mechanic");
}

function callDoctor() {
  emit("call-doctor");
}

function callFuelAttendant() {
  emit("call-fuel-attendant");
}

function chooseMapDestination(location) {
  emit("select-map-destination", location.id);
  locationQuery.value = "";

  if (
    typeof document !== "undefined" &&
    document.activeElement instanceof HTMLElement
  ) {
    document.activeElement.blur();
  }
}

function callCarOwner() {
  emit("call-car-owner");
}

function gameTimeIsNight() {
  const match = props.gameTime.match(
    /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i,
  );

  if (!match) {
    return false;
  }

  let hour = Number(match[1]) % 12;
  if (match[3].toUpperCase() === "PM") {
    hour += 12;
  }

  return hour >= 18 || hour < 6;
}

function callMutiu() {
  activeAppId.value='messages';
  openMessageContact('mutiu-illegal');
}

function submitMegapayPayment() {
  if (connection.transactionsLocked) { transferFeedback.value = transactionReviewMessage.value; return; }
  const option = selectedMegapayPayment.value;
  const amount = Math.max(0, Math.round(Number(megapayPaymentAmount.value) || 0));
  if (!option || amount <= 0 || amount > option.amount || amount > props.money) return;
  if (option.fixed && amount !== option.amount) return;

  if (option.id === "rent") emit("pay-rent");
  else if (option.id === "school-fees") emit("pay-school-fees", amount);
  else if (option.id === "family-request") emit("pay-family-request", amount);
  else {
    emit("repay-loan", {
      amount,
      receiver: "MegaPay Bank",
      loanType: option.id === "large-loan" ? "bank" : "quick",
    });
  }

  megapayPaymentAmount.value = "";
  megapayPaymentTarget.value = "";
}

async function refreshPlayerMessages() {
  if (!connection.user?.id) return;
  try {
    const result = await getPlayerMessages();
    playerMessages.value = Array.isArray(result?.messages) ? result.messages : [];
    socialError.value = "";
  } catch (error) {
    socialError.value = error.message || "Messages are unavailable.";
  }
}

async function submitNewPlayerMessage() {
  const username = newMessageUsername.value.trim().replace(/^@/, "");
  const text = newMessageText.value.trim();
  if (!username || !text || socialBusy.value) return;
  socialBusy.value = true; socialError.value = "";
  try {
    await sendPlayerMessage(username, text);
    newMessageUsername.value = ""; newMessageText.value = ""; showNewMessageComposer.value = false;
    await refreshPlayerMessages();
    activeMessageContactId.value = `player:${username}`;
  } catch (error) { socialError.value = error.message || "Message could not be sent."; }
  finally { socialBusy.value = false; }
}

async function submitThreadReply() {
  const username = activePlayerThreadUsername.value;
  const text = threadReplyText.value.trim();
  if (!username || !text || socialBusy.value) return;
  socialBusy.value = true; socialError.value = "";
  try { await sendPlayerMessage(username, text); threadReplyText.value = ""; await refreshPlayerMessages(); }
  catch (error) { socialError.value = error.message || "Message could not be sent."; }
  finally { socialBusy.value = false; }
}

function openPlayerThread(username) {
  activeMessageContactId.value = `player:${username}`;
  void refreshPlayerMessages();
}

async function refreshPlayerTransfers(claimIncoming = false) {
  if (!connection.user?.id) return;
  try {
    const result = await getPlayerTransfers();
    playerTransfers.value = Array.isArray(result?.transfers) ? result.transfers : [];
    if (claimIncoming && !connection.transactionsLocked && playerTransfers.value.some(row => row.recipientId === connection.user.id && !row.claimedAt)) {
      const claimed = await claimPlayerTransfers();
      if (claimed?.total > 0) emit("player-transfer-received", claimed.total);
      const refreshed = await getPlayerTransfers();
      playerTransfers.value = Array.isArray(refreshed?.transfers) ? refreshed.transfers : [];
    }
  } catch (error) { transferFeedback.value = error.message || "Transfers are unavailable."; }
}

async function submitPlayerTransfer() {
  if (connection.transactionsLocked) { transferFeedback.value = transactionReviewMessage.value; return; }
  const username = playerTransferUsername.value.trim().replace(/^@/, "");
  const amount = Math.round(Number(playerTransferAmount.value) || 0);
  if (!username || amount <= 0 || amount > props.money || socialBusy.value) return;
  socialBusy.value = true; transferFeedback.value = "";
  try {
    await sendPlayerTransfer(username, amount, Math.round(props.money));
    emit("player-transfer-sent", amount);
    transferFeedback.value = `${formatMoney(amount)} sent to @${username}.`;
    playerTransferUsername.value = ""; playerTransferAmount.value = "";
    await refreshPlayerTransfers(false);
  } catch (error) { transferFeedback.value = error.message || "Transfer could not be sent."; }
  finally { socialBusy.value = false; }
}

async function refreshPlaceAds() {
  try {
    const result = await getPlaceAds(placeAdDate.value || realWorldAdDate());
    placeAdBookings.value = Array.isArray(result?.ads) ? result.ads : [];
  } catch (error) {
    placeAdFeedback.value = error.message || "Ad schedule is unavailable.";
  }
}

function handlePlaceAdImage(event) {
  const file = event?.target?.files?.[0];
  placeAdFeedback.value = "";
  placeAdSchedule.value = [];
  if (!file) { placeAdImageDataUrl.value = ""; placeAdFile.value = null; placeAdFileName.value = ""; return; }
  if (!['image/png','image/jpeg','image/webp'].includes(file.type)) {
    placeAdFeedback.value = 'Use a PNG, JPG or WebP image.';
    placeAdFile.value = null;
    event.target.value = '';
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    placeAdFeedback.value = 'Ad image must be 2 MB or smaller.';
    placeAdFile.value = null;
    event.target.value = '';
    return;
  }
  placeAdFile.value = file;
  const reader = new FileReader();
  reader.addEventListener('load', () => { placeAdImageDataUrl.value = String(reader.result || ''); placeAdFileName.value = file.name; });
  reader.addEventListener('error', () => { placeAdFeedback.value = 'Could not read that image.'; });
  reader.readAsDataURL(file);
}

async function submitPlaceAd() {
  if (connection.transactionsLocked) { placeAdFeedback.value = transactionReviewMessage.value; return; }
  if (placeAdBusy.value || !placeAdFile.value || props.money < PLACE_AD_PRICE) return;
  if (!connection.user?.id) { placeAdFeedback.value = 'Sign in before booking an ad.'; return; }
  const duplicate = placeAdBookings.value.some((booking) =>
    booking.billboardId === placeAdBillboardId.value &&
    booking.bookingDate === placeAdDate.value &&
    booking.playerId === connection.user.id
  );
  if (duplicate) { placeAdFeedback.value = 'You already booked this billboard for this date.'; return; }
  placeAdBusy.value = true; placeAdFeedback.value = ''; placeAdSchedule.value = [];
  try {
    const uploaded = await uploadPlaceAdImage({
      file: placeAdFile.value,
      playerId: connection.user.id,
      billboardId: placeAdBillboardId.value,
      bookingDate: placeAdDate.value,
    });
    const result = await bookPlaceAd({
      billboardId: placeAdBillboardId.value,
      bookingDate: placeAdDate.value,
      imagePath: uploaded.imagePath,
      availableBalance: Math.round(props.money),
    });
    emit('place-ad-purchased', PLACE_AD_PRICE);
    await refreshPlaceAds();
    const sameBillboard = placeAdBookings.value.filter((booking) => booking.billboardId === placeAdBillboardId.value);
    placeAdSchedule.value = scheduledTimesForBooking(sameBillboard, result.booking?.id);
    const label = BILLBOARDS.find((billboard) => billboard.id === placeAdBillboardId.value)?.label || 'Billboard';
    placeAdFeedback.value = `${label} booked for ${placeAdDate.value}. Your ad runs for ${PLACE_AD_SLOT_MINUTES} minutes each turn and rotates throughout the real-world day.`;
    placeAdImageDataUrl.value = '';
    placeAdFile.value = null;
    placeAdFileName.value = '';
  } catch (error) {
    placeAdFeedback.value = error.message || 'Ad could not be booked.';
  } finally { placeAdBusy.value = false; }
}

function repayLoan() {
  if (connection.transactionsLocked) { transferFeedback.value = transactionReviewMessage.value; return; }
  const selectedLoanType =
    loanRepaymentType.value === "bank" && props.largeLoanBalance > 0
      ? "bank"
      : props.loanBalance > 0
        ? "quick"
        : "bank";
  emit("repay-loan", {
    amount: Number(transferAmount.value),
    receiver: transferReceiver.value,
    loanType: selectedLoanType,
  });
  transferAmount.value = "";
  transferReceiver.value = "";
}
</script>

<template>
  <aside
    class="game-phone"
    :class="{ 'game-phone--open': isOpen || displayedCall }"
    aria-label="Player phone"
  >
    <button
      v-if="!isOpen && !displayedCall"
      class="game-phone__launcher"
      :class="{
        'game-phone__launcher--shake': isNotificationShaking,
        'game-phone__launcher--ringing': jobRequired,
      }"
      type="button"
      aria-label="Open phone"
      title="Open phone"
      @click="togglePhone"
    >
      <img
        class="game-phone__launcher-image"
        :src="phoneLauncherUrl"
        alt=""
        aria-hidden="true"
      >

      <span
        v-if="hasUnreadNotification"
        class="game-phone__launcher-notification"
        aria-label="Unread phone notifications"
      >{{ notificationCount }}</span>
    </button>

    <button
      v-if="!isOpen && !displayedCall && navigationTarget"
      class="game-phone__navigation-launcher"
      type="button"
      :aria-label="`Direction to ${navigationTarget.label}`"
      :title="`Direction to ${navigationTarget.label}`"
      @click="openNavigationFromLauncher"
    >
      <i
        class="fa-solid fa-arrow-right"
        :style="navigationArrowStyle"
        aria-hidden="true"
      />
    </button>

    <div
      v-if="isOpen || displayedCall"
      class="game-phone__device"
      :class="{ 'phone-skin': Boolean(equippedPhone) }"
      :data-phone-model="equippedPhone?.id"
      :style="equippedPhoneStyle"
      @click.self="handleDebugUnlockTap"
    >
      <button
        class="game-phone__side-button"
        type="button"
        aria-label="Lock phone"
        title="Close phone"
        @click="togglePhone"
      />

      <div class="game-phone__speaker" aria-hidden="true" @click="handleDebugUnlockTap" />

      <div class="game-phone__screen">
        <header class="game-phone__status-bar">
          <span>{{ gameTime }}</span>

          <span class="game-phone__status-icons" aria-hidden="true">
            <i class="fa-solid fa-signal" />
            <i class="fa-solid fa-wifi" />
            <i class="fa-solid fa-battery-three-quarters" />
          </span>
        </header>

        <div v-if="connection.transactionsLocked" class="game-phone__review-lock" role="status">
          <i class="fa-solid fa-lock" aria-hidden="true" />
          <span>{{ transactionReviewMessage }}</span>
        </div>

        <div
          v-if="debugUnlockVisible"
          class="game-phone__debug-unlock-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="debug-unlock-title"
        >
          <form class="game-phone__debug-unlock-card" @submit.prevent="submitDebugUnlock">
            <button
              class="game-phone__debug-unlock-close"
              type="button"
              aria-label="Close debug unlock"
              @click="closeDebugUnlock"
            >
              <i class="fa-solid fa-xmark" aria-hidden="true" />
            </button>
            <span class="game-phone__debug-unlock-icon" aria-hidden="true">
              <i class="fa-solid fa-shield-halved" />
            </span>
            <small>ADMIN ACCESS</small>
            <strong id="debug-unlock-title">Unlock Debugger</strong>
            <p>Enter the admin password to show the Debugger app.</p>
            <label for="debug-unlock-password">Password</label>
            <input
              id="debug-unlock-password"
              v-model="debugUnlockPassword"
              type="password"
              autocomplete="off"
              autocapitalize="characters"
              spellcheck="false"
              placeholder="Enter password"
              autofocus
              @input="debugUnlockError = ''"
            >
            <small v-if="debugUnlockError" class="game-phone__debug-unlock-error" role="alert">{{ debugUnlockError }}</small>
            <button class="game-phone__debug-unlock-submit" type="submit">Unlock</button>
          </form>
        </div>

        <section
          v-if="displayedCall"
          class="game-phone__incoming-call"
          :class="{
            'game-phone__incoming-call--connected': callAnswered,
          }"
        >
          <small>
            {{ callAnswered ? "CALL CONNECTED" : "INCOMING CALL" }}
          </small>
          <img
            :src="displayedCall.character.portraitUrl"
            :alt="displayedCall.character.name"
          />
          <strong>{{ displayedCall.character.name }}</strong>
          <span>
            {{
              callAnswered
                ? "Voice message playing..."
                : displayedCall.message
            }}
          </span>
          <div
            :class="{
              'game-phone__incoming-actions--connected': callAnswered,
            }"
          >
            <button
              type="button"
              class="game-phone__incoming-decline"
              @click="declineOrEndIncomingCall"
            >
              <i class="fa-solid fa-phone-slash" aria-hidden="true" />
              {{ callAnswered ? "End call" : "Decline" }}
            </button>
            <button
              v-if="!callAnswered"
              type="button"
              class="game-phone__incoming-accept"
              @click="answerIncomingCall(displayedCall)"
            >
              <i class="fa-solid fa-phone" aria-hidden="true" />
              Answer
            </button>
          </div>
        </section>

        <section
          v-else-if="!activeApp"
          class="game-phone__home"
          aria-label="Phone applications"
        >
          <div class="game-phone__home-heading">
            <span>Lagos</span>
            <small>
              {{ weekdayLabel }} &middot; DAY {{ currentDay }}
            </small>
          </div>

          <div class="game-phone__app-grid">
            <button
              v-for="app in launcherApps"
              :key="app.id"
              class="game-phone__app-button"
              type="button"
              :disabled="app.id === 'moto-eazi' && !motoEaziUnlocked"
              :aria-label="`Open ${app.label}`"
              @click="openApp(app.id)"
            >
              <span
                class="game-phone__app-icon"
                :class="{
                  'game-phone__app-icon--shake':
                    isNotificationShaking &&
                    (
                      (app.id === 'messages' && hasMessagesAppAttention) ||
                      (app.id === 'wallet' && hasUnreadBankMessage) ||
                      (app.id === 'moto-eazi' && hasUnreadMotoRequest) ||
                      (app.id === 'my-account' && hasUnreadFine)
                    ),
                  'game-phone__app-icon--ringing':
                    app.id === 'my-account' && jobRequired,
                }"
                :style="{ backgroundColor: app.colour }"
              >
                <i :class="app.iconClass" aria-hidden="true" />

                <span
                  v-if="
                    (app.id === 'messages' && hasMessagesAppAttention) ||
                    (app.id === 'my-account' && jobRequired) ||
                    (app.id === 'wallet' && hasUnreadBankMessage) ||
                    (app.id === 'moto-eazi' && hasUnreadMotoRequest) ||
                    (app.id === 'my-account' && hasUnreadFine)
                  "
                  class="game-phone__notification"
                  aria-label="Unread notification"
                >
                  <i class="fa-solid fa-exclamation" aria-hidden="true" />
                </span>
              </span>

              <span>{{ app.label }}</span>
              <small
                v-if="app.id === 'moto-eazi' && !motoEaziUnlocked"
                class="game-phone__app-locked"
              >Buy a car</small>
            </button>
          </div>
        </section>

        <section
          v-else
          class="game-phone__app-screen"
          :aria-label="activeApp.label"
        >
          <header class="game-phone__app-header">
            <button
              type="button"
              aria-label="Return to phone home"
              title="Back"
              @click="handleAppBack"
            >
              <i class="fa-solid fa-chevron-left" aria-hidden="true" />
            </button>

            <strong>{{ appHeaderTitle }}</strong>
            <span aria-hidden="true" />
          </header>

          <nav
            v-if="accountAppIds.includes(activeApp.id)"
            class="game-phone__account-tabs"
            aria-label="My Account sections"
          >
            <button
              v-for="tab in [
                { id: 'find-job', label: 'Jobs', icon: 'fa-solid fa-briefcase' },
                { id: 'driver-licence', label: 'Licence', icon: 'fa-solid fa-id-card' },
                { id: 'fines', label: 'Fines', icon: 'fa-solid fa-file-invoice-dollar' },
                { id: 'garage', label: 'Garage', icon: 'fa-solid fa-car-side' },
              ]"
              :key="tab.id"
              type="button"
              :class="{ 'game-phone__account-tab--active': activeApp.id === tab.id }"
              @click="openApp(tab.id)"
            >
              <i :class="tab.icon" aria-hidden="true" />
              {{ tab.label }}
              <span
                v-if="(tab.id === 'find-job' && jobRequired) || (tab.id === 'fines' && hasUnreadFine)"
                class="game-phone__account-tab-attention"
                aria-label="Needs attention"
              >!</span>
            </button>
          </nav>

          <CareerPanel v-if="activeApp.id === 'me'" :state="careerState" :home-address="currentHomeAddress" :minute="careerMinute" :occupied="careerOccupied" :busy="careerBusy" :error="careerError" :bars="{health,energy,fuel,damage,intoxication}" @action="$emit('career-action',$event)" />
          <ShareApp v-else-if="activeApp.id === 'share'" :reward-amount="shareRewardAmount" @shared="$emit('share-completed', $event)" />
          <HousingApp v-else-if="activeApp.id === 'housing'" :view="housingView" :busy="housingBusy" :error="housingError" @action="$emit('housing-action',$event)" />
          <BigPeopleClub v-else-if="activeApp.id === 'bpc'" :wealth="netWorth" :player-name="playerName" />
          <CustomizeShop
            v-else-if="activeApp.id === 'customize'"
            :vehicle="customizationVehicle"
            :state="customizationState"
            :money="money"
            @apply="emit('customize-vehicle', $event)"
          />
          <div
            v-else-if="activeApp.id === 'find-job'"
            class="game-phone__jobs"
          >
            <header class="game-phone__messages-heading">
              <span class="game-phone__eyebrow">WORK IN LAGOS</span>
              <strong>Find a driving job</strong>
              <small>
                Switch between Danfo, Moto Eazi, and BRT here. Your vehicle state is kept separately for each.
              </small>
            </header>

            <button
              class="game-phone__job-card"
              type="button"
              :class="{ 'game-phone__job-card--active': currentJob === 'danfo' }"
              :disabled="currentJob === 'danfo'"
              @click="selectJob('danfo')"
            >
              <i class="fa-solid fa-bus-simple" aria-hidden="true" />
              <span>
                <strong>Danfo driver</strong>
                <small>
                  Start at home with the leased danfo and keep passenger fares
                  after the daily owner and garage charges.
                </small>
              </span>
              <b>{{ currentJob === "danfo" ? "CURRENT" : "CHOOSE" }}</b>
            </button>

            <button
              class="game-phone__job-card"
              type="button"
              :class="{ 'game-phone__job-card--active': currentJob === 'moto-eazi' }"
              :disabled="!motoEaziUnlocked"
              @click="selectJob('moto-eazi')"
            >
              <i class="fa-solid fa-car-side" aria-hidden="true" />
              <span>
                <strong>Moto Eazi</strong>
                <small>
                  Drive one of your own cars and choose rider requests when they arrive.
                </small>
              </span>
              <b>{{ !motoEaziUnlocked ? "BUY A CAR" : currentJob === "moto-eazi" ? "CURRENT" : "CHOOSE" }}</b>
            </button>

            <button
              class="game-phone__job-card"
              type="button"
              :class="{ 'game-phone__job-card--active': currentJob === 'brt' }"
              :disabled="
                currentJob === 'brt' ||
                !['A', 'B', 'C'].includes(driverLicence.rating)
              "
              @click="selectJob('brt')"
            >
              <i class="fa-solid fa-bus" aria-hidden="true" />
              <span>
                <strong>BRT driver</strong>
                <small>
                  Requires a C licence or better. Report to the central terminal
                  and earn more on longer completed scheduled routes.
                </small>
              </span>
              <b>{{ currentJob === "brt" ? "CURRENT" : "CHOOSE" }}</b>
            </button>
          </div>

          <div
            v-else-if="activeApp.id === 'driver-licence'"
            class="game-phone__driver-licence"
          >
            <header class="game-phone__licence-card">
              <span>FEDERAL DRIVER LICENCE</span>
              <strong>CLASS {{ driverLicence.rating }}</strong>
              <small>Safety score {{ Math.round(driverLicence.score) }} / 100</small>
            </header>

            <p>
              A, B, and C ratings qualify for BRT work. Complete a five-checkpoint
              road test without a collision or traffic violation to improve
              your score.
            </p>

            <div v-if="driverLicence.testStatus === 'active'" class="game-phone__test-status">
              <strong>ROAD TEST IN PROGRESS</strong>
              <small>
                Checkpoint {{ driverLicence.testStopIndex + 1 }} /
                {{ driverLicence.testStopIds.length }}
              </small>
              <small>Follow the blue checkpoint square.</small>
            </div>

            <div
              v-else-if="driverLicence.lastTestResult"
              class="game-phone__test-status"
              :class="`game-phone__test-status--${driverLicence.lastTestResult}`"
            >
              <strong>
                {{ driverLicence.lastTestResult === 'passed' ? 'TEST PASSED' : 'TEST FAILED' }}
              </strong>
              <small>
                {{
                  driverLicence.lastTestResult === 'passed'
                    ? 'Your licence moved up exactly one class.'
                    : 'A collision or traffic violation was recorded.'
                }}
              </small>
            </div>

            <button
              class="game-phone__licence-test-button"
              type="button"
              :disabled="driverLicence.testStatus === 'active'"
              @click="$emit('start-driving-test')"
            >
              Find nearest driving school
            </button>
          </div>

          <div
            v-else-if="activeApp.id === 'goals'"
            class="game-phone__goals"
          >
            <header class="game-phone__messages-heading">
              <span class="game-phone__eyebrow">YOUR JOURNEY</span>
              <strong>Goals and progression</strong>
              <small>
                Track one objective on the gameplay HUD and claim completed rewards.
              </small>
            </header>

            <section
              v-for="group in objectiveGroups"
              :key="group.id"
              class="game-phone__goal-group"
            >
              <header>
                <strong>{{ group.label }}</strong>
                <span>
                  {{ group.objectives.filter((item) => item.status === "completed").length }}
                  / {{ group.objectives.length }}
                </span>
              </header>

              <article
                v-for="objective in group.objectives"
                :key="objective.id"
                class="game-phone__goal"
                :class="{
                  'game-phone__goal--tracked': objective.id === trackedObjectiveId,
                  'game-phone__goal--complete': objective.status === 'completed',
                  'game-phone__goal--failed': objective.status === 'failed',
                }"
              >
                <div class="game-phone__goal-heading">
                  <i
                    :class="
                      objective.status === 'completed'
                        ? 'fa-solid fa-circle-check'
                        : objective.status === 'failed'
                          ? 'fa-solid fa-circle-xmark'
                          : 'fa-regular fa-circle'
                    "
                    aria-hidden="true"
                  />
                  <span>
                    <small>{{ objective.chapter }}</small>
                    <strong>{{ objective.title }}</strong>
                  </span>
                </div>

                <p>{{ objective.description }}</p>

                <div class="game-phone__goal-progress">
                  <span>
                    <i :style="{ width: `${objective.progressRatio * 100}%` }" />
                  </span>
                  <b>{{ formatObjectiveProgress(objective) }}</b>
                </div>

                <small
                  v-if="objective.deadlineDay"
                  class="game-phone__goal-deadline"
                >
                  Deadline: Day {{ objective.deadlineDay }}
                </small>

                <div class="game-phone__goal-actions">
                  <button
                    v-if="objective.status !== 'failed'"
                    type="button"
                    :disabled="objective.id === trackedObjectiveId"
                    @click="$emit('track-objective', objective.id)"
                  >
                    {{
                      objective.id === trackedObjectiveId
                        ? "TRACKING"
                        : "TRACK ON HUD"
                    }}
                  </button>

                  <button
                    v-if="
                      objective.status === 'completed' &&
                      !objective.rewardClaimed
                    "
                    type="button"
                    class="game-phone__goal-claim"
                    @click="$emit('claim-objective-reward', objective.id)"
                  >
                    CLAIM &#8358;{{ objective.reward?.money?.toLocaleString() ?? 0 }}
                  </button>

                  <span
                    v-else-if="
                      objective.status === 'completed' &&
                      objective.rewardClaimed
                    "
                  >
                    REWARD CLAIMED
                  </span>
                </div>
              </article>
            </section>
          </div>

          <div
            v-else-if="activeApp.id === 'messages'"
            class="game-phone__messages"
          >
            <template v-if="!activeMessageContactId">
              <header class="game-phone__messages-heading">
                <span class="game-phone__eyebrow">MESSAGES</span>
                <strong>People</strong>
                <small>Open a conversation to view messages and actions.</small>
              </header>

              <button class="game-phone__call-button" type="button" :disabled="!connection.user?.id" @click="showNewMessageComposer = !showNewMessageComposer">
                <i class="fa-solid fa-pen" aria-hidden="true" /> NEW MESSAGE
              </button>
              <form v-if="showNewMessageComposer" class="game-phone__bank-form" @submit.prevent="submitNewPlayerMessage">
                <label>Username<input v-model="newMessageUsername" type="text" maxlength="24" placeholder="username" required></label>
                <label>Message<textarea v-model="newMessageText" maxlength="500" rows="3" placeholder="Type your message" required></textarea></label>
                <button type="submit" :disabled="socialBusy || !newMessageUsername.trim() || !newMessageText.trim()">{{ socialBusy ? 'SENDING...' : 'SEND' }}</button>
              </form>
              <small v-if="socialError" class="game-phone__social-error">{{ socialError }}</small>

              <div v-if="playerMessageThreads.length" class="game-phone__conversation-list game-phone__player-conversations">
                <button v-for="thread in playerMessageThreads" :key="thread.username" class="game-phone__conversation" type="button" @click="openPlayerThread(thread.username)">
                  <span class="game-phone__contact-avatar"><i class="fa-solid fa-user" aria-hidden="true" /></span>
                  <span class="game-phone__conversation-details"><strong>@{{ thread.username }}</strong><small>{{ thread.text }}</small></span>
                  <i class="fa-solid fa-chevron-right" aria-hidden="true" />
                </button>
              </div>

              <div class="game-phone__conversation-list">
                <button v-if="government" class="game-phone__conversation" type="button" @click="openMessageContact('government')"><span class="game-phone__contact-avatar game-phone__contact-avatar--bank"><i class="fa-solid fa-landmark" aria-hidden="true" /></span><span class="game-phone__conversation-details"><strong>Government</strong><small>{{government.sunday?'Sunday election · cast your vote':government.messages.at(-1)?.text||'Elections, taxes and government wages'}}</small></span><span v-if="governmentUnread" class="game-phone__conversation-badge">{{governmentUnread}}</span></button>
                <button class="game-phone__conversation" type="button" @click="openMessageContact('stock-adviser')">
                  <span class="game-phone__contact-avatar game-phone__contact-avatar--bank"><i class="fa-solid fa-chart-line" aria-hidden="true" /></span>
                  <span class="game-phone__conversation-details"><strong>Stock Adviser</strong><small>{{ stockAdviser.messages.at(-1)?.text ?? 'Regular stock updates and subscription' }}</small></span>
                  <span v-if="adviserUnreadCount" class="game-phone__conversation-badge">{{ adviserUnreadCount }}</span>
                  <i v-else class="fa-solid fa-chevron-right" aria-hidden="true" />
                </button>
                <button
                  v-if="currentJob || routeStatus === 'selecting'"
                  class="game-phone__conversation"
                  type="button"
                  @click="openMessageContact('car-owner')"
                >
                  <span class="game-phone__contact-avatar game-phone__contact-avatar--work">
                    <i :class="currentJob === 'brt' ? 'fa-solid fa-bus-simple' : 'fa-solid fa-van-shuttle'" aria-hidden="true" />
                  </span>
                  <span class="game-phone__conversation-details">
                    <strong>{{ currentJob === 'brt' ? 'BRT Operations' : 'Car Owner' }}</strong>
                    <small>{{ routeStatus === 'selecting' ? 'Choose your next route' : 'Route and vehicle messages' }}</small>
                  </span>
                  <span v-if="isMessageContactUnread('car-owner')" class="game-phone__conversation-badge">1</span>
                  <i v-else class="fa-solid fa-chevron-right" aria-hidden="true" />
                </button>

                <button class="game-phone__conversation" type="button" @click="openMessageContact('megapay-bank')">
                  <span class="game-phone__contact-avatar game-phone__contact-avatar--bank">
                    <img :src="CHARACTER_DEFINITIONS.bankRepresentative.portraitUrl" alt="" />
                  </span>
                  <span class="game-phone__conversation-details">
                    <strong>MegaPay Bank</strong>
                    <small v-if="loanBalance > 0 || largeLoanBalance > 0">
                      Owed: {{ formatMoney(loanBalance + largeLoanBalance) }}
                    </small>
                    <small v-else-if="loanOfferReceived">Quick loan offer available</small>
                    <small v-else-if="bankMessages.length">{{ bankMessages[0].label }}</small>
                    <small v-else>Important account notices</small>
                  </span>
                  <span v-if="hasUnreadBankMessage" class="game-phone__conversation-badge">1</span>
                  <i v-else class="fa-solid fa-chevron-right" aria-hidden="true" />
                </button>

<button class="game-phone__conversation" type="button" @click="openMessageContact('mutiu-illegal')">
 <span class="game-phone__contact-avatar game-phone__contact-avatar--work"><i class="fa-solid fa-user-secret" aria-hidden="true" /></span>
 <span class="game-phone__conversation-details"><strong>Mr-Wire</strong><small>Hustler · {{heistView?.available?'Bank job available':'Bank job status'}}</small></span>
 <span v-if="isMessageContactUnread('mutiu-illegal')" class="game-phone__conversation-badge">1</span>
</button>
<button class="game-phone__conversation" type="button" @click="openMessageContact('realtor')">
                  <span class="game-phone__contact-avatar game-phone__contact-avatar--work"><i class="fa-solid fa-house-circle-check" /></span>
                  <span class="game-phone__conversation-details"><strong>Realtor</strong><small>Manage owned homes and tenants</small></span>
                  <span v-if="isMessageContactUnread('realtor')" class="game-phone__conversation-badge">1</span>
                  <i v-else class="fa-solid fa-chevron-right" />
                </button>

                <button class="game-phone__conversation" type="button" @click="openMessageContact('family-group')">
                  <span class="game-phone__contact-avatar game-phone__contact-avatar--family"><i class="fa-solid fa-users" aria-hidden="true" /></span>
                  <span class="game-phone__conversation-details"><strong>Family group chat</strong><small>Family messages, school fees and requests</small></span>
                  <span v-if="isMessageContactUnread('family-group')" class="game-phone__conversation-badge">1</span>
                  <i v-else class="fa-solid fa-chevron-right" aria-hidden="true" />
                </button>
              </div>
            </template>

            <template v-else-if="activePlayerThreadUsername">
              <header class="game-phone__messages-heading">
                <span class="game-phone__eyebrow">PLAYER MESSAGE</span>
                <strong>@{{ activePlayerThreadUsername }}</strong>
                <small>{{ activePlayerThreadMessages.length ? 'Conversation history' : 'Start the conversation' }}</small>
              </header>
              <div v-for="message in activePlayerThreadMessages" :key="message.id" class="game-phone__message-bubble" :class="{ 'game-phone__message-bubble--sent': message.senderId === connection.user?.id }">
                {{ message.text }}
                <time>{{ formatTransactionTime(message.createdAt) }}</time>
              </div>
              <form class="game-phone__bank-form" @submit.prevent="submitThreadReply">
                <label>Message<textarea v-model="threadReplyText" maxlength="500" rows="3" placeholder="Type a reply" required></textarea></label>
                <button type="submit" :disabled="socialBusy || !threadReplyText.trim()">{{ socialBusy ? 'SENDING...' : 'SEND' }}</button>
              </form>
              <small v-if="socialError" class="game-phone__social-error">{{ socialError }}</small>
            </template>

            <template v-else-if="activeMessageContactId === 'government' && government"><GovernmentPanel :state="government" :busy="governmentBusy" :error="governmentError" @action="$emit('government-action',$event)" /></template>
            <template v-else-if="activeMessageContactId === 'stock-adviser'">
              <div class="game-phone__message-bubble">Hi {{ playerName }}, subscribe to regular stock updates. I will message you about rising and falling stocks, with suggestions on when to consider buying or selling.</div>
            <article class="game-phone__stock-card">
              <strong>Stock Adviser</strong>
              <small>{{ formatMoney(STOCK_ADVISER_PRICE) }} every {{ STOCK_ADVISER_DAYS }} game days until cancelled. Rising and falling stock tips delivered in Messages.</small>
              <small v-if="adviserActive">{{ stockAdviser.autoRenew ? 'Next automatic renewal:' : 'Cancelled. Access ends:' }} day {{ stockAdviser.untilDay }}.</small>
              <small v-else-if="stockAdviser.paymentPending">Renewal awaiting funds. Updates paused; payment retries each game day until you cancel.</small>
              <small v-else-if="money < STOCK_ADVISER_PRICE">You need {{ formatMoney(STOCK_ADVISER_PRICE) }} to subscribe.</small>
              <div class="game-phone__stock-actions">
                <button type="button" :disabled="adviserActive ? stockAdviser.autoRenew : money < STOCK_ADVISER_PRICE" @click="$emit('subscribe-stock-adviser')">{{ adviserActive ? (stockAdviser.autoRenew ? 'Subscribed' : 'Resume renewal') : stockAdviser.untilDay ? 'Renew' : 'Subscribe' }}</button>
                <button v-if="stockAdviser.autoRenew" type="button" @click="$emit('cancel-stock-adviser')">Cancel subscription</button>
              </div>
            </article>
              <div v-for="message in stockAdviser.messages" :key="message.id" class="game-phone__message-bubble">
                {{ message.text }}<time>Day {{ message.day }}</time>
              </div>

              <div class="game-phone__stock-actions"><button type="button" @click="openApp('stocks')">Open Stocks</button></div>
            </template>
            <template v-else-if="activeMessageContactId === 'family-group'">
              <div class="game-phone__message-bubble">Hi {{ playerName }}, welcome to Lagos! We hope you are settling into your room. Check Find Job on your phone when you are ready to work.</div>
              <div v-if="['active','late','paid'].includes(lifeObligations.schoolFees.status)" class="game-phone__message-bubble">
                <template v-if="lifeObligations.schoolFees.status === 'paid'">Hi {{ playerName }}, the school fees are paid. Thank you for helping!</template>
                <template v-else>Hi {{ playerName }}, I need {{ formatMoney(lifeObligations.schoolFees.remainingAmount) }} for my school fees. The deadline is day {{ lifeObligations.schoolFees.deadlineDay }}.<span v-if="lifeObligations.schoolFees.status === 'late'"> The deadline has passed, but payment is still needed.</span></template>
                <time>Day {{ lifeObligations.schoolFees.requestedDay }}</time>
              </div>
              <div v-if="['active','late'].includes(lifeObligations.schoolFees.status)" class="game-phone__obligation-actions">
                <button type="button" :disabled="money < Math.min(25000, lifeObligations.schoolFees.remainingAmount)" @click="$emit('pay-school-fees', Math.min(25000, lifeObligations.schoolFees.remainingAmount))">Send {{ formatMoney(Math.min(25000, lifeObligations.schoolFees.remainingAmount)) }}</button>
                <button type="button" :disabled="money < lifeObligations.schoolFees.remainingAmount" @click="$emit('pay-school-fees', lifeObligations.schoolFees.remainingAmount)">Pay balance</button>
              </div>
              <template v-for="request in familyRequestEntries.filter(entry => entry.status !== 'locked')" :key="request.id">
                <div class="game-phone__message-bubble">
                  Hi {{ playerName }}, {{ request.status === 'paid' ? request.thanks : request.message }}
                  <template v-if="['active','late'].includes(request.status)">Remaining: {{ formatMoney(getFamilyRequestRemaining(request)) }}. Due day {{ request.deadlineDay }}.</template>
                  <time>Day {{ request.requestedDay }}</time>
                </div>
                <div v-if="request.id === lifeObligations.familyRequests?.activeId && ['active','late'].includes(request.status)" class="game-phone__obligation-actions">
                  <button type="button" :disabled="money < Math.min(25000,getFamilyRequestRemaining(request))" @click="$emit('pay-family-request',Math.min(25000,getFamilyRequestRemaining(request)))">Send {{ formatMoney(Math.min(25000,getFamilyRequestRemaining(request))) }}</button>
                  <button type="button" :disabled="money < getFamilyRequestRemaining(request)" @click="$emit('pay-family-request',getFamilyRequestRemaining(request))">Pay balance</button>
                </div>
              </template>
            </template>

<template v-else-if="activeMessageContactId === 'realtor'">
              <header class="game-phone__messages-heading"><span class="game-phone__eyebrow">PROPERTY</span><strong>Your Realtor</strong><small>List vacant owned homes and manage tenants</small></header>
              <div v-for="message in [...(propertyState.rentals?.messages ?? [])].reverse()" :key="message.day + message.text" class="game-phone__message-bubble">{{ message.text }}<time>Day {{ message.day }}</time></div>
              <button type="button" @click="openApp('housing')">Open Housing to buy, move or manage rentals</button>
            </template>

            <template v-else-if="activeMessageContactId === 'megapay-bank'">
              <header class="game-phone__messages-heading">
                <span class="game-phone__eyebrow">MEGAPAY BANK</span>
                <strong>Account messages</strong>
                <small>Important account notices and loan information</small>
              </header>

              <div v-if="loanOfferReceived && loanBalance <= 0" class="game-phone__message-bubble game-phone__message-bubble--bank">
                You are eligible for a fixed {{ formatMoney(bankLoanAmount) }} quick loan.
                Repayment will be {{ formatMoney(bankLoanAmount * (1 + bankLoanInterestRate)) }}.
                Larger loans remain available at a physical branch.
                <time>Day {{ currentDay }}</time>
              </div>
              <button
                v-if="loanOfferReceived && loanBalance <= 0"
                class="game-phone__call-button"
                type="button"
                @click="$emit('take-bank-loan')"
              >
                Accept {{ formatMoney(bankLoanAmount) }} quick loan
              </button>

              <div v-if="loanBalance > 0 || largeLoanBalance > 0" class="game-phone__message-bubble game-phone__message-bubble--bank">
                Quick-loan balance: {{ formatMoney(loanBalance) }}.
                Large-loan balance: {{ formatMoney(largeLoanBalance) }}.
                <time>Day {{ currentDay }}</time>
              </div>

              <form
                v-if="loanBalance > 0 || largeLoanBalance > 0"
                class="game-phone__bank-form"
                @submit.prevent="repayLoan"
              >
                <strong>Repay a loan</strong>
                <label>
                  Loan
                  <select v-model="loanRepaymentType">
                    <option v-if="loanBalance > 0" value="quick">Quick loan &middot; {{ formatMoney(loanBalance) }}</option>
                    <option v-if="largeLoanBalance > 0" value="bank">Bank loan &middot; {{ formatMoney(largeLoanBalance) }}</option>
                  </select>
                </label>
                <label>
                  Receiver
                  <input v-model="transferReceiver" type="text" placeholder="Bank" required>
                </label>
                <label>
                  Amount
                  <input v-model="transferAmount" type="number" min="1" :max="money" placeholder="Amount" required>
                </label>
                <button type="submit">Send repayment</button>
              </form>

              <div
                v-for="transaction in bankMessages"
                :key="`bank-message-${transaction.id}`"
                class="game-phone__message-bubble game-phone__message-bubble--bank"
              >
                <template v-if="transaction.direction === 'notice'">
                  {{ transaction.label }}.
                </template>
                <template v-else>
                  {{ transaction.label }}:
                  {{ ["expense", "transfer-out"].includes(transaction.direction) ? "-" : "+" }}{{ formatMoney(transaction.amount) }}.
                </template>
                <time>{{ formatTransactionTime(transaction.createdAt) }}</time>
              </div>

              <div v-if="!loanOfferReceived && loanBalance <= 0 && largeLoanBalance <= 0 && bankMessages.length === 0" class="game-phone__empty-app">
                <i class="fa-solid fa-building-columns" aria-hidden="true" />
                <strong>No bank messages</strong>
              </div>
            </template>

            <template v-else-if="activeMessageContactId === 'car-owner'">
              <header class="game-phone__messages-heading">
                <span class="game-phone__eyebrow">
                  {{ currentJob === "brt" ? "BRT OPERATIONS" : "DANFO OWNER" }}
                </span>
                <strong>
                  {{ currentJob === "brt" ? "Route assignment" : "Danfo lease" }}
                </strong>
                <small>Online now</small>
              </header>

              <div
                v-if="currentJob === 'brt'"
                class="game-phone__message-bubble"
              >
                Report to the central bus terminal and select your assigned
                route. Your salary is calculated from the full route distance and paid after completion.
                <time>Now</time>
              </div>

              <div v-else class="game-phone__message-bubble">
                Hello. I am leasing you my danfo. You pay me a total of
                &#8358;10,000 per day. Anything else you earn is yours.
                <time>Now</time>
              </div>

              <div class="game-phone__lease-card">
                <span>
                  {{ currentJob === "brt" ? "ROUTE SALARY" : "DAILY PAYMENT" }}
                </span>
                <strong>
                  {{ currentJob === "brt" ? "DISTANCE BASED" : "&#8358;10,000" }}
                </strong>
                <small v-if="currentJob === 'brt'">
                  Longer routes pay more &middot; &#8358;5,000 tax deducted at midnight
                </small>
                <small v-else>
                  Automatically deducted every night at 12:00 AM
                </small>
              </div>

              <button
                v-if="currentJob !== 'brt'"
                class="game-phone__call-button"
                type="button"
                @click="callCarOwner"
              >
                <i class="fa-solid fa-phone" aria-hidden="true" />
                Request danfo
              </button>

              <template v-if="routeStatus === 'selecting'">
                <div class="game-phone__message-bubble">
                  Choose the {{ currentJob === "brt" ? "BRT " : "" }}route
                  you want to drive today.
                  <time>Now</time>
                </div>

                <div class="game-phone__route-list">
                  <button
                    v-for="route in routes"
                    :key="route.id"
                    class="game-phone__route"
                    type="button"
                    @click="selectRoute(route.id)"
                  >
                    <span class="game-phone__route-id">
                      {{ route.id }}
                    </span>

                    <span class="game-phone__route-details">
                      <strong>{{ route.name }}</strong>
                      <small>{{ route.direction }}</small>
                      <small>{{ route.stopIds.length }} stops</small>
                      <small
                        v-if="route.corridor === 'central-highway'"
                        class="game-phone__route-corridor"
                      >
                        <i class="fa-solid fa-road" aria-hidden="true" />
                        CENTRAL HIGHWAY
                      </small>
                      <small v-if="currentJob === 'brt'">
                        Salary: &#8358;20,000 on completion
                      </small>
                    </span>

                    <i class="fa-solid fa-chevron-right" aria-hidden="true" />
                  </button>
                </div>
              </template>

              <template v-else-if="activeRoute">
                <div class="game-phone__selected-route">
                  <i class="fa-solid fa-circle-check" aria-hidden="true" />
                  <span>Route selected</span>
                  <strong>{{ activeRoute.name }}</strong>
                  <small>{{ activeRoute.direction }}</small>

                  <button type="button" @click="openApp('map')">
                    <i class="fa-solid fa-map-location-dot" aria-hidden="true" />
                    Open navigation
                  </button>
                </div>
              </template>

              <div v-else class="game-phone__empty-app">
                <i class="fa-solid fa-inbox" aria-hidden="true" />
                <strong>No route message</strong>
              </div>
            </template>

            <template v-else-if="activeMessageContactId === 'mechanic'">
              <header class="game-phone__messages-heading">
                <span class="game-phone__eyebrow">MOBILE MECHANIC</span>
                <strong>Roadside repair</strong>
                <small>Callout fee included in the estimate</small>
              </header>

              <div class="game-phone__repair-card">
                <span>{{ damageState }}</span>
                <strong>{{ Math.round(damage) }}% damage</strong>
                <small v-if="repairCost > 0">
                  Repair total: {{ formatMoney(repairCost) }}
                </small>
                <small v-else>Your danfo does not need repairs.</small>
              </div>

              <button
                class="game-phone__call-button"
                type="button"
                :disabled="repairCost <= 0"
                @click="callMechanic"
              >
                <i class="fa-solid fa-phone" aria-hidden="true" />
                Call mechanic
              </button>
            </template>

            <template v-else-if="activeMessageContactId === 'doctor'">
              <header class="game-phone__messages-heading">
                <span class="game-phone__eyebrow">PRIVATE DOCTOR</span>
                <strong>Mobile treatment</strong>
                <small>More expensive than visiting a hospital or clinic</small>
              </header>

              <div class="game-phone__repair-card">
                <span>PLAYER HEALTH</span>
                <strong>{{ Math.round(health) }} / 100</strong>
                <small>
                  Mobile treatment: {{ formatMoney(doctorCallCost) }}
                </small>
              </div>

              <button
                class="game-phone__call-button"
                type="button"
                :disabled="health >= 100 || money < doctorCallCost"
                @click="callDoctor"
              >
                <i class="fa-solid fa-phone" aria-hidden="true" />
                Call doctor
              </button>
            </template>

            <template v-else-if="activeMessageContactId === 'fuel-attendant'">
              <header class="game-phone__messages-heading">
                <span class="game-phone__eyebrow">ROADSIDE FUEL</span>
                <strong>Fuel Attendant</strong>
                <small>Emergency delivery to your current location</small>
              </header>

              <div class="game-phone__repair-card">
                <span>CURRENT FUEL</span>
                <strong>{{ Math.round(fuel) }}%</strong>
                <small>
                  Deliver {{ Math.round(roadsideFuelPercent) }}% fuel &middot;
                  {{ roadsideFuelDistance.toFixed(1) }} tiles away
                </small>
                <small>
                  Distance-based total: {{ formatMoney(roadsideFuelCost) }}
                </small>
              </div>

              <button
                class="game-phone__call-button"
                type="button"
                :disabled="
                  roadsideFuelPercent <= 0 ||
                  roadsideFuelCost <= 0 ||
                  money < roadsideFuelCost
                "
                @click="callFuelAttendant"
              >
                <i class="fa-solid fa-gas-pump" aria-hidden="true" />
                Request fuel delivery
              </button>
            </template>

            <template v-else-if="activeMessageContactId === 'mutiu-illegal'">
              <HeistPanel :minute="heistMinute" :view="heistView" :busy="heistBusy" :error="heistError" :player-name="playerName" @action="$emit('heist-action',$event)" />
            </template>
          </div>

          <div
            v-else-if="activeApp.id === 'contacts'"
            class="game-phone__contacts"
          >
            <header class="game-phone__messages-heading">
              <span class="game-phone__eyebrow">CONTACTS</span>
              <strong>People you can call</strong>
              <small>Callable services are listed first. Tap a phone button to call.</small>
            </header>

            <div class="game-phone__contact-list">
              <article
                v-for="contact in orderedPhoneContacts"
                :key="contact.id"
                class="game-phone__contact"
              >
                <span class="game-phone__contact-avatar">
                  <img
                    v-if="contact.portraitUrl"
                    :src="contact.portraitUrl"
                    alt=""
                  />
                  <template v-else>{{ contact.initials }}</template>
                </span>

                <span class="game-phone__contact-details">
                  <strong>{{ contact.name }}</strong>
                  <small>{{ contact.role }}</small>
                </span>

                <i
                  v-if="
                    !CALLABLE_CONTACT_IDS.includes(contact.id)
                  "
                  :class="contact.iconClass"
                  aria-hidden="true"
                />

                <button
                  v-if="
                    CALLABLE_CONTACT_IDS.includes(contact.id)
                  "
                  class="game-phone__contact-call"
                  type="button"
                  :aria-label="`Call ${contact.name}`"
                  @click="openContactConversation(contact.id)"
                >
                  <i class="fa-solid fa-phone" aria-hidden="true" />
                </button>
              </article>
            </div>
          </div>

          <div
            v-else-if="activeApp.id === 'music'"
            class="game-phone__music"
          >
            <label class="game-phone__volume-control"><span>Music volume <strong>{{ Math.round(musicAudioSettings.volume * 100) }}%</strong></span><input type="range" min="0" max="1" step="0.05" :value="musicAudioSettings.volume" aria-label="Music volume" @input="setMusicSettings({ ...musicAudioSettings, volume: Number($event.target.value) })" /></label>
            <button class="game-phone__mute-control" type="button" role="switch" aria-label="Music" :aria-checked="!musicAudioSettings.muted" @click="setMusicSettings({ ...musicAudioSettings, muted: !musicAudioSettings.muted })"><i class="fa-solid fa-music" aria-hidden="true" /><span><strong>{{ musicAudioSettings.muted ? 'Music muted' : 'Music on' }}</strong></span><ToggleIcon :checked="!musicAudioSettings.muted" /></button>
            <header class="game-phone__music-now">
              <span class="game-phone__music-art">
                <i class="fa-solid fa-music" aria-hidden="true" />
              </span>
              <small>NOW PLAYING</small>
              <strong>{{ currentMusicTrack.title }}</strong>
              <em>{{ currentMusicTrack.artist }}{{ currentMusicTrack.genre ? " · " + currentMusicTrack.genre : "" }}</em>
              <span>
                {{
                  musicPlayerState.mode === "one"
                    ? "Repeat one"
                    : "Play all"
                }}
              </span>
            </header>

            <div class="game-phone__music-controls">
              <button
                type="button"
                aria-label="Previous track"
                @click="playPreviousMusicTrack"
              >
                <i class="fa-solid fa-backward-step" aria-hidden="true" />
              </button>
              <button
                class="game-phone__music-play"
                type="button"
                :aria-label="musicPlayerState.playing ? 'Pause music' : 'Play music'"
                @click="toggleMusicPlayback"
              >
                <i
                  :class="
                    musicPlayerState.playing
                      ? 'fa-solid fa-pause'
                      : 'fa-solid fa-play'
                  "
                  aria-hidden="true"
                />
              </button>
              <button
                type="button"
                aria-label="Next track"
                @click="playNextMusicTrack"
              >
                <i class="fa-solid fa-forward-step" aria-hidden="true" />
              </button>
            </div>

            <div class="game-phone__music-modes">
              <button
                type="button"
                :class="{ active: musicPlayerState.mode === 'one' }"
                @click="setMusicMode('one')"
              >
                <i class="fa-solid fa-repeat" aria-hidden="true" />
                Loop one
              </button>
              <button
                type="button"
                :class="{ active: musicPlayerState.mode === 'all' }"
                @click="setMusicMode('all')"
              >
                <i class="fa-solid fa-list-ol" aria-hidden="true" />
                Play all
              </button>
            </div>

            <div class="game-phone__music-library-actions">
              <button type="button" @click="openCustomMusicFolder">
                <i class="fa-solid fa-folder-open" aria-hidden="true" />
                Open music folder
              </button>
              <button
                type="button"
                :disabled="musicPlayerState.libraryLoading"
                @click="refreshCustomMusicLibrary"
              >
                <i class="fa-solid fa-rotate" aria-hidden="true" />
                {{ musicPlayerState.libraryLoading ? "Refreshing..." : "Refresh songs" }}
              </button>
            </div>
            <small
              v-if="musicPlayerState.libraryError"
              class="game-phone__music-library-error"
            >
              {{ musicPlayerState.libraryError }}
            </small>

            <div class="game-phone__music-list">
              <button
                v-for="(track, index) in MUSIC_TRACKS"
                :key="track.id"
                type="button"
                :class="{
                  active: musicPlayerState.currentIndex === index,
                }"
                @click="chooseMusicTrack(index)"
              >
                <b>{{ track.number }}</b>
                <span>
                  <strong>{{ track.title }}</strong>
                  <small>{{ track.artist }}{{ track.genre ? " · " + track.genre : "" }}</small>
                </span>
                <i
                  :class="
                    musicPlayerState.currentIndex === index &&
                    musicPlayerState.playing
                      ? 'fa-solid fa-volume-low'
                      : 'fa-solid fa-play'
                  "
                  aria-hidden="true"
                />
              </button>
            </div>
          </div>

          <div
            v-else-if="activeApp.id === 'map'"
            class="game-phone__map"
          >
            <div class="game-phone__location-search">
              <label for="phone-location-search">Find a place</label>
              <input
                id="phone-location-search"
                v-model="locationQuery"
                type="search"
                placeholder="Bank, club, hospital..."
              >

              <div
                v-if="locationMatches.length"
                class="game-phone__location-results"
              >
                <button
                  v-for="location in locationMatches"
                  :key="location.id"
                  type="button"
                  @click="chooseMapDestination(location)"
                >
                  <strong>{{ location.label }}</strong>
                  <small>{{ location.districtName }}</small>
                </button>
              </div>
            </div>

            <template v-if="navigationTarget">
              <div class="game-phone__navigation-compass" aria-label="Direction to next stop">
                <i
                  class="fa-solid fa-arrow-right"
                  :style="navigationArrowStyle"
                  aria-hidden="true"
                />
              </div>

              <span class="game-phone__map-label">NEXT STOP</span>
              <strong>{{ navigationTarget.label }}</strong>
              <small v-if="motoEaziActiveRequest">
                {{ motoEaziStage === "pickup" ? "Passenger pickup" : "Passenger drop-off" }}
              </small>
              <small v-else-if="activeRoute && currentStop">
                Stop {{ currentStopNumber }} of {{ activeRoute.stopIds.length }}
              </small>
              <small v-else>{{ navigationTarget.districtName }}</small>

              <div
                v-if="
                  followingStop &&
                  navigationTarget?.label === currentStop?.label
                "
                class="game-phone__following-stop"
              >
                <span>Then</span>
                <strong>{{ followingStop.label }}</strong>
              </div>
            </template>

            <div
              v-else
              class="game-phone__empty-app game-phone__empty-app--no-destination"
            >
              <i class="fa-solid fa-map-location-dot" aria-hidden="true" />
              <strong>No destination selected</strong>
              <small>Search above or choose a work route in Messages.</small>
            </div>
          </div>

          <div
            v-else-if="activeApp.id === 'help'"
            class="game-phone__help"
          >
            <dl>
              <div>
                <dt>I</dt>
                <dd>Shift between Park and Drive; start or stop the engine</dd>
              </div>
              <div>
                <dt>W / Up</dt>
                <dd>Accelerate after the engine starts</dd>
              </div>
              <div>
                <dt>S / Down</dt>
                <dd>Brake or reverse</dd>
              </div>
              <div>
                <dt>A / Left</dt>
                <dd>Steer left</dd>
              </div>
              <div>
                <dt>D / Right</dt>
                <dd>Steer right</dd>
              </div>
              <div>
                <dt>H</dt>
                <dd>Horn</dd>
              </div>
              <div>
                <dt>Fuel</dt>
                <dd>Park in a labelled petrol-station bay and choose an amount</dd>
              </div>
              <div>
                <dt>R</dt>
                <dd>Repair at a mechanic</dd>
              </div>
            </dl>
          </div>

          <div
            v-else-if="activeApp.id === 'settings'"
            class="game-phone__settings"
          >
            <header>
              <i class="fa-solid fa-volume-high" aria-hidden="true" />
              <div>
                <h3>Game sounds</h3>
                <small>Engine, horn and sound effects</small>
              </div>
            </header>

            <label class="game-phone__volume-control">
              <span>
                Game sounds volume
                <strong>{{ Math.round(soundVolume * 100) }}%</strong>
              </span>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                :value="Math.round(soundVolume * 100)"
                aria-label="Game sounds volume"
                @input="changeSoundVolume"
              >
            </label>

            <button role="switch" :aria-checked="!soundMuted" aria-label="Game sounds"
              class="game-phone__mute-control"
              type="button"
              @click="toggleSoundMuted"
            >
              <i
                :class="
                  soundMuted
                    ? 'fa-solid fa-volume-xmark'
                    : 'fa-solid fa-volume-high'
                "
                aria-hidden="true"
              />
              <span>
                <strong>{{ soundMuted ? "Sound muted" : "Sound on" }}</strong>
                <small>Tap to {{ soundMuted ? "unmute" : "mute" }}</small>
              </span>
              <ToggleIcon :checked="!soundMuted" />
            </button>

            <header>
              <i class="fa-solid fa-display" aria-hidden="true" />
              <div>
                <h3>Performance</h3>
                <small>Rendering and frame stability</small>
              </div>
            </header>

            <label class="game-phone__volume-control">
              <span>
                Render quality
                <strong>{{ performanceSettings.renderQuality }}</strong>
              </span>
              <select
                :value="performanceSettings.renderQuality"
                @change="setRenderQuality($event.target.value)"
              >
                <option value="performance">Performance</option>
                <option value="balanced">Balanced</option>
                <option value="high">High</option>
              </select>
            </label>

            <button role="switch" :aria-checked="performanceSettings.adaptivePerformance" aria-label="Adaptive performance"
              class="game-phone__mute-control"
              type="button"
              @click="setAdaptivePerformance(!performanceSettings.adaptivePerformance)"
            >
              <i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true" />
              <span>
                <strong>Adaptive performance</strong>
                <small>{{ performanceSettings.adaptivePerformance ? "Enabled" : "Disabled" }}</small>
              </span>
              <ToggleIcon :checked="performanceSettings.adaptivePerformance" />
            </button>

            <button role="switch" :aria-checked="hudPreferences.passengerOccupancy" aria-label="Passenger occupancy HUD"
              class="game-phone__mute-control"
              type="button"
              @click="
                setHudPreference(
                  'passengerOccupancy',
                  !hudPreferences.passengerOccupancy,
                )
              "
            >
              <i class="fa-solid fa-people-group" aria-hidden="true" />
              <span>
                <strong>Passenger occupancy HUD</strong>
                <small>
                  {{
                    hudPreferences.passengerOccupancy
                      ? "Visible while driving"
                      : "Hidden to keep the road clear"
                  }}
                </small>
              </span>
              <ToggleIcon :checked="hudPreferences.passengerOccupancy" />
            </button>

            <button
              class="game-phone__mute-control"
              type="button"
              @click="requestGameSave"
            >
              <i class="fa-solid fa-floppy-disk" aria-hidden="true" />
              <span>
                <strong>{{ saveAcknowledged ? "Game saved" : "Save game" }}</strong>
                <small>{{ saveAcknowledged ? "Progress written successfully" : "Save progress to this Windows PC" }}</small>
              </span>
            </button>
          </div>

          <div
            v-else-if="activeApp.id === 'inventory'"
            class="game-phone__inventory"
          >
            <header>
              <span class="game-phone__eyebrow">PLAYER INVENTORY</span>
              <h3>My Stuff</h3>
              <small>Food bought in the city is stored here for the road.</small>
            </header>

            <article v-if="lifeObligations.discountCoupons > 0" class="game-phone__coupon-wallet">
              <i class="fa-solid fa-ticket" aria-hidden="true" />
              <div>
                <strong>50% family coupon</strong>
                <small>Choose it while paying for fuel, repairs, or medical care.</small>
              </div>
              <b>&times;{{ lifeObligations.discountCoupons }}</b>
            </article>

            <div
              v-if="inventoryItems.length === 0 && lifeObligations.discountCoupons <= 0"
              class="game-phone__empty-app"
            >
              <i class="fa-solid fa-bag-shopping" aria-hidden="true" />
              <strong>Your bag is empty</strong>
              <small>Park at a food shop, restaurant, or supermarket.</small>
            </div>

            <div v-else class="game-phone__inventory-list">
              <article
                v-for="item in inventoryItems"
                :key="item.id"
              >
                <img :src="item.imageUrl" :alt="item.label">
                <div>
                  <strong>{{ item.label }}</strong>
                  <small>{{ item.description }}</small>
                  <span>+{{ item.energy }} energy</span>
                </div>
                <b>&times;{{ item.quantity }}</b>
                <button
                  type="button"
                  @click="$emit('consume-inventory-item', item.id)"
                >
                  Eat / drink
                </button>
              </article>
            </div>
          </div>

          <div
            v-else-if="activeApp.id === 'debugger'"
            class="game-phone__debugger"
          >
            <header>
              <i class="fa-solid fa-bug" aria-hidden="true" />
              <div>
                <h3>Debugger</h3>
                <small>Development and inspection controls</small>
              </div>
            </header>

            <button role="switch" :aria-checked="aiTrafficEnabled" class="game-phone__debug-action" @click="$emit('toggle-ai-traffic')"><i class="fa-solid fa-car"/><span><strong>AI traffic</strong><small>Remove or restore AI vehicles. Online players stay.</small></span><ToggleIcon :checked="aiTrafficEnabled" /></button>
            <button role="switch" :aria-checked="godMode" class="game-phone__debug-action" @click="$emit('toggle-god-mode')"><i class="fa-solid fa-shield-halved"/><span><strong>God Mode</strong><small>Full health and energy, ₦100,000 each game day, automatic rent, and no pause when switching apps.</small></span><ToggleIcon :checked="godMode" /></button>
            <button role="switch" :aria-checked="debugVisible" aria-label="Debug view"
              type="button"
              :class="{ 'game-phone__debug-action--active': debugVisible }"
              @click="$emit('toggle-debug')"
            >
              <i class="fa-solid fa-border-all" aria-hidden="true" />
              <span>
                <strong>{{ debugVisible ? "Hide debug view" : "Show debug view" }}</strong>
                <small>Grid, labels, collision boxes, and diagnostics</small>
              </span>
              <ToggleIcon :checked="debugVisible" />
            </button>

            <button role="switch" :aria-checked="performanceSettings.showPerformanceMonitor" aria-label="Performance monitor"
              type="button"
              :class="{
                'game-phone__debug-action--active':
                  performanceSettings.showPerformanceMonitor,
              }"
              @click="
                setPerformanceMonitorVisible(
                  !performanceSettings.showPerformanceMonitor,
                )
              "
            >
              <i class="fa-solid fa-chart-line" aria-hidden="true" />
              <span>
                <strong>Performance monitor</strong>
                <small>FPS, frame time, traffic, and tile cache</small>
              </span>
              <ToggleIcon :checked="performanceSettings.showPerformanceMonitor" />
            </button>

            <button role="switch" :aria-checked="observerMode" aria-label="Observation mode"
              type="button"
              :class="{ 'game-phone__debug-action--active': observerMode }"
              @click="$emit('toggle-observer')"
            >
              <i class="fa-solid fa-binoculars" aria-hidden="true" />
              <span>
                <strong>{{ observerMode ? "Exit observation mode" : "Observation mode" }}</strong>
                <small>Pan around the world without driving</small>
              </span>
              <ToggleIcon :checked="observerMode" />
            </button>

            <button
              v-if="showWorldTravelDebug"
              type="button"
              @click="runDebugShortcut('debug-go-coastal-city')"
            >
              <i class="fa-solid fa-city" aria-hidden="true" />
              <span>
                <strong>Go to new city</strong>
                <small>
                  Keep the current car and spawn on the Coastal City highway
                </small>
              </span>
            </button>

            <button
              v-if="showRaceDebug"
              type="button"
              :class="{ 'game-phone__debug-action--active': raceActive }"
              @click="runDebugShortcut('debug-start-race')"
            >
              <i class="fa-solid fa-flag-checkered" aria-hidden="true" />
              <span>
                <strong>{{ raceActive ? "Restart circuit race" : "Start circuit race" }}</strong>
                <small>Load Coastal City and place the current car on the start grid</small>
              </span>
            </button>
            <button type="button" @click="familyDebugVisible = true">
              <i class="fa-solid fa-people-roof" aria-hidden="true" />
              <span><strong>Inspect family requests</strong><small>Open the full family request inspector</small></span>
            </button>
            <button type="button" @click="cacheWarningVisible = true; cacheError = ''">
              <i class="fa-solid fa-broom" aria-hidden="true" />
              <span><strong>Clear Lagos Experience Cache</strong><small>Clear temporary app caches and reload; keep saved games</small></span>
            </button>
            <button type="button" class="game-phone__debug-danger" @click="clearSaveWarningVisible = true">
              <i class="fa-solid fa-trash-can" aria-hidden="true" />
              <span><strong>Clear saved state</strong><small>Permanently reset the active save slot</small></span>
            </button>
          </div>

          <div
            v-else-if="activeApp.id === 'fines'"
            class="game-phone__fines"
          >
            <header
              class="game-phone__fine-card"
              :class="{
                'game-phone__fine-card--impounded': vehicleImpounded,
              }"
            >
              <img
                class="game-phone__fine-officer"
                :src="CHARACTER_DEFINITIONS.policeOfficer.portraitUrl"
                :alt="CHARACTER_DEFINITIONS.policeOfficer.name"
              />
              <span>OUTSTANDING ROAD FINES</span>
              <strong>{{ formatMoney(outstandingFines) }}</strong>
              <small v-if="vehicleImpounded">
                VEHICLE IMPOUNDED &middot; Pay all fines to release it
              </small>
              <small v-else>
                Fines remain outstanding until you choose to pay.
              </small>
            </header>

            <button
              class="game-phone__pay-fines"
              type="button"
              :disabled="outstandingFines <= 0 || money < outstandingFines"
              @click="$emit('pay-fines')"
            >
              Pay all outstanding fines
            </button>

            <section class="game-phone__fine-list">
              <strong>Notices</strong>
              <div v-if="fineEntries.length === 0" class="game-phone__empty-app">
                <i class="fa-solid fa-circle-check" aria-hidden="true" />
                <strong>No outstanding fines</strong>
              </div>
              <article v-for="fine in fineEntries" :key="fine.id">
                <span>
                  <strong>{{ fine.label }}</strong>
                  <small>Day {{ fine.gameDay }} &middot; {{ fine.gameTime }}</small>
                </span>
                <b>{{ formatMoney(fine.amount) }}</b>
              </article>
            </section>
          </div>

          <div
            v-else-if="activeApp.id === 'place-ad'"
            class="game-phone__place-ad"
          >
            <header class="game-phone__messages-heading">
              <span class="game-phone__eyebrow">PLACEAD</span>
              <strong>Book a city billboard</strong>
              <small>{{ formatMoney(PLACE_AD_PRICE) }} per real-world day. Each booked ad gets a 30-minute turn and repeats throughout the day.</small>
            </header>

            <form class="game-phone__place-ad-form" @submit.prevent="submitPlaceAd">
              <label>
                Billboard
                <select v-model="placeAdBillboardId" required @change="placeAdSchedule = []; refreshPlaceAds()">
                  <option v-for="billboard in BILLBOARDS" :key="billboard.id" :value="billboard.id">
                    {{ billboard.label }} · {{ billboard.district }}
                  </option>
                </select>
              </label>
              <label>
                Pick a date for ad
                <input v-model="placeAdDate" type="date" :min="realWorldAdDate()" required @change="placeAdSchedule = []; refreshPlaceAds()">
              </label>
              <label class="game-phone__place-ad-upload">
                Ad image
                <input type="file" accept="image/png,image/jpeg,image/webp" required @change="handlePlaceAdImage">
              </label>
              <small>PNG, JPG or WebP · maximum 2 MB.</small>
              <div v-if="placeAdImageDataUrl" class="game-phone__place-ad-preview">
                <img :src="placeAdImageDataUrl" alt="Ad preview">
                <small>{{ placeAdFileName }}</small>
              </div>
              <div class="game-phone__place-ad-price">
                <span>PRICE</span><strong>{{ formatMoney(PLACE_AD_PRICE) }}</strong>
              </div>
              <button type="submit" :disabled="placeAdBusy || !placeAdFile || money < PLACE_AD_PRICE">
                {{ placeAdBusy ? 'BOOKING...' : 'BOOK AD' }}
              </button>
              <small v-if="money < PLACE_AD_PRICE">You need {{ formatMoney(PLACE_AD_PRICE) }} in your current account.</small>
              <p v-if="placeAdFeedback" class="game-phone__place-ad-feedback">{{ placeAdFeedback }}</p>
              <div v-if="placeAdSchedule.length" class="game-phone__place-ad-times">
                <strong>Current rotation times · {{ PLACE_AD_TIME_ZONE }}</strong>
                <span>{{ placeAdSchedule.join(' · ') }}</span>
                <small>Times update if more ads are booked for the same billboard and date.</small>
              </div>
            </form>
          </div>

          <div
            v-else-if="activeApp.id === 'wallet'"
            class="game-phone__megapay"
          >
            <header class="game-phone__megapay-card">
              <span>MEGAPAY ACCOUNTS</span>
              <div class="game-phone__megapay-balances">
                <div>
                  <small>CURRENT ACCOUNT</small>
                  <strong>{{ formattedMoney }}</strong>
                </div>
                <div>
                  <small>SAVINGS ACCOUNT</small>
                  <strong>{{ formatMoney(savingsBalance) }}</strong>
                </div>
              </div>
              <small>
                Danfo garage fee when used &middot; {{ formatMoney(garageFee) }}
              </small>
            </header>

            <form class="game-phone__megapay-payment" @submit.prevent="submitPlayerTransfer">
              <header>
                <span><i class="fa-solid fa-arrow-right-arrow-left" aria-hidden="true" /> TRANSFER</span>
                <small>Send money to another player by username.</small>
              </header>
              <label>Username<input v-model="playerTransferUsername" type="text" maxlength="24" placeholder="username" required></label>
              <label>Amount<input v-model="playerTransferAmount" type="number" min="1" :max="money" placeholder="Amount" required></label>
              <button type="submit" :disabled="socialBusy || !playerTransferUsername.trim() || Number(playerTransferAmount) <= 0 || Number(playerTransferAmount) > money">
                {{ socialBusy ? 'SENDING...' : `SEND ${formatMoney(Math.max(0, Number(playerTransferAmount) || 0))}` }}
              </button>
              <small v-if="transferFeedback">{{ transferFeedback }}</small>
            </form>

            <form class="game-phone__megapay-payment" @submit.prevent="submitMegapayPayment">
              <header>
                <span>
                  <i class="fa-solid fa-paper-plane" aria-hidden="true" />
                  PAY
                </span>
                <small>Select a bill or loan, choose an amount, and pay.</small>
              </header>

              <template v-if="megapayPaymentOptions.length">
                <label>
                  Pay
                  <select v-model="megapayPaymentTarget" required @change="selectMegapayPayment">
                    <option value="" disabled>Select payment</option>
                    <option
                      v-for="option in megapayPaymentOptions"
                      :key="option.id"
                      :value="option.id"
                    >
                      {{ option.label }} &middot; {{ formatMoney(option.amount) }}
                    </option>
                  </select>
                </label>
                <label>
                  Amount
                  <input
                    v-model="megapayPaymentAmount"
                    type="number"
                    min="1"
                    :max="Math.min(money, selectedMegapayPayment?.amount ?? money)"
                    :readonly="selectedMegapayPayment?.fixed"
                    placeholder="Enter amount"
                    required
                  >
                </label>
                <small v-if="selectedMegapayPayment?.fixed">
                  Rent must be paid as the full amount due.
                </small>
                <button
                  type="submit"
                  :disabled="
                    !selectedMegapayPayment ||
                    Number(megapayPaymentAmount) <= 0 ||
                    Number(megapayPaymentAmount) > money ||
                    Number(megapayPaymentAmount) > selectedMegapayPayment.amount ||
                    (selectedMegapayPayment.fixed &&
                      Number(megapayPaymentAmount) !== selectedMegapayPayment.amount)
                  "
                >
                  PAY
                  {{ formatMoney(Math.max(0, Number(megapayPaymentAmount) || 0)) }}
                </button>
              </template>

              <div v-else class="game-phone__transaction-empty">
                Nothing is currently due.
              </div>
            </form>

            <div class="game-phone__megapay-summary">
              <span>
                <small>Received</small>
                <b>{{ formatMoney(totalReceived) }}</b>
              </span>
              <span>
                <small>Spent</small>
                <b>{{ formatMoney(totalSpent) }}</b>
              </span>
            </div>

            <section v-if="playerTransfers.length" class="game-phone__transactions">
              <strong>Player transfers</strong>
              <article v-for="transfer in playerTransfers.slice(0, 12)" :key="transfer.id" class="game-phone__transaction">
                <span class="game-phone__transaction-icon" :class="`game-phone__transaction-icon--${transfer.senderId === connection.user?.id ? 'expense' : 'income'}`">
                  <i :class="transfer.senderId === connection.user?.id ? 'fa-solid fa-arrow-up' : 'fa-solid fa-arrow-down'" aria-hidden="true" />
                </span>
                <span><strong>{{ transfer.senderId === connection.user?.id ? `To @${transfer.recipientUsername}` : `From @${transfer.senderUsername}` }}</strong><small>{{ formatTransactionTime(transfer.createdAt) }}</small></span>
                <b :class="`game-phone__transaction-amount--${transfer.senderId === connection.user?.id ? 'expense' : 'income'}`">{{ transfer.senderId === connection.user?.id ? '-' : '+' }}{{ formatMoney(transfer.amount) }}</b>
              </article>
            </section>

            <section class="game-phone__transactions">
              <strong>Recent activity</strong>

              <div
                v-if="transactions.length === 0"
                class="game-phone__transaction-empty"
              >
                No transactions yet
              </div>

              <article
                v-for="transaction in transactions"
                :key="transaction.id"
                class="game-phone__transaction"
              >
                <span
                  :class="[
                    'game-phone__transaction-icon',
                    `game-phone__transaction-icon--${transaction.direction}`,
                  ]"
                >
                  <i
                    :class="
                      transaction.direction === 'income'
                        ? 'fa-solid fa-arrow-down'
                        : 'fa-solid fa-arrow-up'
                    "
                    aria-hidden="true"
                  />
                </span>

                <span>
                  <strong>{{ transaction.label }}</strong>
                  <small>{{ formatTransactionTime(transaction.createdAt) }}</small>
                </span>

                <b
                  :class="`game-phone__transaction-amount--${transaction.direction}`"
                >
                  {{ transaction.direction === "income" ? "+" : "-" }}{{
                    formatMoney(transaction.amount)
                  }}
                </b>
              </article>
            </section>
          </div>

          <div
            v-else-if="activeApp.id === 'garage'"
            class="game-phone__garage"
          >
            <header class="game-phone__messages-heading">
              <span class="game-phone__eyebrow">DEALERSHIP</span>
              <strong>Five cars</strong>
              <small>
                Visit the dealership and park in its labelled bay to browse
                and purchase cars.
              </small>
            </header>

            <article
              v-for="vehicle in carCatalogue"
              :key="vehicle.id"
              class="game-phone__vehicle-card"
            >
              <img
                class="game-phone__vehicle-swatch"
                :src="vehicle.spriteUrl"
                alt=""
              >
              <span>
                <strong>{{ vehicle.name }}</strong>
                <small>{{ vehicle.transmission.toUpperCase() }}</small>
                <small>{{ formatMoney(vehicle.price) }}</small>
              </span>
              <button
                type="button"
                disabled
              >
                {{
                  ownedVehicleIds.includes(vehicle.id)
                    ? "Owned"
                    : "At dealer"
                }}
              </button>
            </article>

            <small v-if="ownedVehicleIds.length && !homeParkingAvailable">
              Park in your home's labelled space to switch into your newest car.
            </small>
            <small v-else-if="homeParkingAvailable && ownedVehicleIds.length">
              Home parking active. Your newest purchased car is selected automatically.
            </small>
          </div>

          <div
            v-else-if="activeApp.id === 'stocks'"
            class="game-phone__stocks"
          >
            <header class="game-phone__messages-heading">
              <span class="game-phone__eyebrow">STOCK MARKET</span>
              <strong>Your portfolio</strong>
              <small>
                Invested {{ formatMoney(stockPortfolioValue) }} &middot; Current {{ formatMoney(stockPortfolioCurrentValue) }}
              </small>
            </header>
            <p class="game-phone__market-explanation">Prices update each game day from company revenue and costs. More profitable patronage supports prices; weaker results can lower them. Gains stay in your shares until you sell.</p>

            <article v-for="company in stockMarket" :key="company.id" class="game-phone__stock-card">
              <div class="game-phone__stock-heading">
                <span><b>{{ company.symbol }}</b><small>{{ company.name }}</small></span>
                <span><b>{{ formatMoney(company.price) }}</b><small :class="company.changePercent >= 0 ? 'is-gain' : 'is-loss'">{{ company.changePercent >= 0 ? '+' : '' }}{{ company.changePercent.toFixed(1) }}%</small></span>
              </div>
              <small>
                {{ company.sector }}
              </small>
              <small>Last settled day: revenue {{ formatMoney(company.revenue) }} &middot; costs {{ formatMoney(company.costs) }} &middot; profit {{ formatMoney(company.profit) }}</small>
              <small>
                You own {{ company.quantity }} &middot; Invested {{ formatMoney(company.investedAmount ?? company.value) }} &middot; Current {{ formatMoney(company.currentAmount ?? company.value) }}
              </small>
              <div class="game-phone__stock-actions">
                <button type="button" :disabled="money < company.price" @click="$emit('buy-stock', company.id)">Buy 1</button>
                <button type="button" :disabled="company.quantity <= 0" @click="$emit('sell-stock', company.id)">Sell 1</button>
              </div>
            </article>
          </div>

          <div
            v-else-if="activeApp.id === 'moto-eazi'"
            class="game-phone__moto-eazi"
          >
            <header class="game-phone__messages-heading">
              <span class="game-phone__eyebrow">MOTO EAZI</span>
              <strong>Driver requests</strong>
              <small>{{ motoEaziCompletedCount }} trips completed</small>
            </header>

            <div class="game-phone__driver-rating" aria-label="Current driver rating">
              <span>CURRENT RATING</span>
              <strong>
                <i
                  v-for="star in 5"
                  :key="star"
                  :class="ratingStarClass(star, motoEaziDriverRating)"
                  aria-hidden="true"
                />
              </strong>
            </div>

            <div v-if="currentJob !== 'moto-eazi'" class="game-phone__empty-app">
              <i class="fa-solid fa-house" aria-hidden="true" />
              <strong>Private car required</strong>
              <small>Park in your home's labelled space to change into your purchased car.</small>
            </div>

            <article
              v-else-if="motoEaziActiveRequest"
              class="game-phone__ride-card game-phone__ride-card--active"
            >
              <span>ONGOING RIDE</span>
              <strong>{{ formatMoney(motoEaziActiveRequest.fare) }}</strong>
              <div class="game-phone__active-ride-target">
                <small>{{ motoEaziStage === "pickup" ? "PICK UP RIDER" : "NEXT DROP" }}</small>
                <b>{{ motoEaziTarget?.label ?? "Follow the blue marker" }}</b>
              </div>
              <small v-if="motoEaziStage === 'pickup'">
                Stop at the blue marker. The timer begins when the rider enters.
              </small>
              <template v-else>
                <div class="game-phone__active-ride-metrics">
                  <span>
                    <small>EXPECTED IN</small>
                    <b>{{ formatRideDuration(Math.max(0, motoEaziRideExpectedSeconds - motoEaziRideElapsedSeconds)) }}</b>
                  </span>
                  <span>
                    <small>IMPACTS</small>
                    <b>{{ motoEaziRideCollisionCount }}</b>
                  </span>
                </div>
                <small class="game-phone__ride-stars">
                  <i
                    v-for="star in 5"
                    :key="star"
                    :class="star <= motoEaziProjectedStars ? 'fa-solid fa-star' : 'fa-regular fa-star'"
                  />
                </small>
              </template>
              <small
                v-for="(destination, index) in motoEaziActiveRequest.destinations"
                :key="destination.id"
              >
                Drop {{ index + 1 }}: {{ destination.label }}
              </small>
              <button type="button" @click="openApp('map')">Open navigation</button>
            </article>
            <template v-else-if="motoEaziOffers.length > 0 || motoEaziWaiting">
              <div class="game-phone__ride-list-heading">
                <strong>AVAILABLE RIDES</strong>
                <span>{{ motoEaziOffers.length }}</span>
              </div>
              <article
                v-for="offer in motoEaziOffers"
                :key="offer.id"
                class="game-phone__ride-card"
              >
                <span>RIDE REQUEST &middot; DRIVER RATING {{ motoEaziDriverRating.toFixed(1) }}</span>
                <strong>{{ formatMoney(offer.fare) }}</strong>
                <small>Pickup: {{ offer.pickup.label }}</small>
                <small>
                  {{ offer.destinations.length }} drop location{{
                    offer.destinations.length > 1 ? "s" : ""
                  }} &middot; about {{ Math.ceil(offer.expectedSeconds / 60) }} min
                </small>
                <div class="game-phone__ride-actions">
                  <button
                    type="button"
                    @click="$emit('accept-moto-eazi-request', offer.id)"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    @click="$emit('reject-moto-eazi-request', offer.id)"
                  >
                    Reject
                  </button>
                </div>
              </article>
              <p v-if="motoEaziWaiting" class="game-phone__ride-searching">
                <i class="fa-solid fa-signal" /> More requests are coming in...
              </p>
            </template>

            <button
              v-else
              class="game-phone__call-button"
              type="button"
              @click="$emit('wait-moto-eazi-request')"
            >
              Wait for requests
            </button>
          </div>
        </section>
      </div>

      <nav
        class="game-phone__hub"
        aria-label="Phone controls"
      >
        <button
          type="button"
          aria-label="Phone home"
          title="Home"
          @click="returnHome"
        >
          <i class="fa-solid fa-house" aria-hidden="true" />
        </button>

        <button
          type="button"
          aria-label="Minimize phone"
          title="Minimize"
          @click="togglePhone"
        >
          <i class="fa-solid fa-minus" aria-hidden="true" />
        </button>
      </nav>
    </div>
  </aside>

  <Teleport to="body">
    <div v-if="familyDebugVisible" class="game-phone__screen-modal" role="dialog" aria-modal="true" aria-labelledby="family-debug-title" @click.self="familyDebugVisible = false">
      <section class="game-phone__screen-modal-card">
        <header><span><small>DEBUG INSPECTOR</small><strong id="family-debug-title">Family request state</strong></span><button type="button" aria-label="Close" @click="familyDebugVisible = false"><i class="fa-solid fa-xmark" /></button></header>
        <div class="game-phone__family-summary">
          <article><small>School fees</small><strong>{{ lifeObligations.schoolFees?.status ?? "Not registered" }}</strong></article>
          <article><small>Active request</small><strong>{{ lifeObligations.familyRequests?.activeId ?? "None" }}</strong></article>
          <article><small>Next activation</small><strong>Day {{ lifeObligations.familyRequests?.nextActivationDay ?? "?" }}</strong></article>
        </div>
        <div class="game-phone__family-request-list">
          <article v-for="entry in familyRequestEntries" :key="entry.id"><div><strong>Family group chat</strong><span>{{ entry.title }}</span></div><b :data-status="entry.status">{{ entry.status }}</b><small>Paid {{ formatMoney(entry.paidAmount ?? 0) }} of {{ formatMoney(entry.amount ?? 0) }}</small></article>
          <p v-if="familyRequestEntries.length === 0">No family requests are registered.</p>
        </div>
        <button type="button" class="game-phone__modal-close" @click="familyDebugVisible = false">Close inspector</button>
      </section>
    </div>
    <div v-if="clearSaveWarningVisible" class="game-phone__screen-modal" role="alertdialog" aria-modal="true" aria-labelledby="clear-save-title" @click.self="clearSaveWarningVisible = false">
      <section class="game-phone__screen-modal-card game-phone__clear-warning">
        <i class="fa-solid fa-triangle-exclamation" /><small>DESTRUCTIVE ACTION</small><h2 id="clear-save-title">Clear this saved game?</h2>
        <p>This permanently resets the active save slot, including progress and inventory. This cannot be undone from inside the game.</p>
        <div><button type="button" @click="clearSaveWarningVisible = false">Cancel</button><button type="button" class="game-phone__confirm-clear" @click="clearSaveWarningVisible = false; emit('clear-saved-state')">Yes, clear this save</button></div>
      </section>
    </div>
    <div v-if="cacheWarningVisible" class="game-phone__screen-modal" role="alertdialog" aria-modal="true" aria-labelledby="clear-cache-title" @click.self="!clearingCache && (cacheWarningVisible = false)">
      <section class="game-phone__screen-modal-card game-phone__clear-warning">
        <h2 id="clear-cache-title">Clear Lagos Experience Cache?</h2>
        <p>This clears temporary app caches and reloads the game. Saved games, inventory and settings are kept. Save your current progress first: unsaved progress will be lost on reload.</p>
        <p v-if="cacheError" role="alert">{{ cacheError }}</p>
        <div><button type="button" :disabled="clearingCache" @click="cacheWarningVisible = false">Cancel</button><button type="button" :disabled="clearingCache" @click="clearCacheAndReload">{{ clearingCache ? 'Clearing…' : 'Clear cache and reload' }}</button></div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.game-phone button[role="switch"] { display:grid; grid-template-columns:28px minmax(0,1fr) 44px; align-items:center; gap:10px; width:100%; min-height:44px; }
.game-phone button[role="switch"] > span { min-width:0; }

.game-phone {
  position: absolute;
  right: 16px;
  bottom: 16px;
  z-index: 9999999;
  font-family: "Basic", sans-serif;
}

/* The open phone is anchored to the viewport independently of its launcher. */
.game-phone--open {
  position: fixed;
  right: max(16px, env(safe-area-inset-right));
  bottom: max(16px, env(safe-area-inset-bottom));
}


.game-phone__screen-modal { position: fixed; inset: 0; z-index: 9999999; display: grid; place-items: center; box-sizing: border-box; padding: 24px; overflow-y: auto; background: rgb(8 15 31 / 78%); font-family: "Basic", sans-serif; backdrop-filter: blur(5px); }
.game-phone__screen-modal-card { box-sizing: border-box; width: min(680px, 100%); max-height: min(780px, calc(100vh - 48px)); padding: 22px; overflow-y: auto; border: 1px solid rgb(23 33 58 / 16%); border-radius: 24px; background: #fff8dc; color: #14213d; box-shadow: 0 2px 8px rgb(23 33 58 / 10%); }
.game-phone__screen-modal-card > header { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
.game-phone__screen-modal-card > header span { display: grid; gap: 3px; }
.game-phone__screen-modal-card > header small { color: #d8612c; font-weight: 900; letter-spacing: .12em; }
.game-phone__screen-modal-card > header strong { font-size: 28px; }
.game-phone__screen-modal-card > header button { display: grid; width: 42px; height: 42px; place-items: center; border: 1px solid rgb(23 33 58 / 16%); border-radius: 50%; background: #ff5c69; color: #14213d; font-size: 20px; }
.game-phone__family-summary { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 10px; margin-bottom: 16px; }
.game-phone__family-summary article, .game-phone__family-request-list > article { padding: 12px; border: 1px solid rgb(23 33 58 / 16%); border-radius: 14px; background: #fff; }
.game-phone__family-summary article { display: grid; gap: 5px; }
.game-phone__family-summary small, .game-phone__family-request-list small { color: #536078; }
.game-phone__family-request-list { display: grid; gap: 9px; }
.game-phone__family-request-list > article { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 5px 12px; }
.game-phone__family-request-list > article > div { display: grid; gap: 2px; }
.game-phone__family-request-list > article > b { align-self: start; padding: 4px 7px; border-radius: 999px; background: #dce5f3; font-size: 11px; text-transform: uppercase; }
.game-phone__family-request-list > article > b[data-status="active"] { background: #ffd43b; }
.game-phone__family-request-list > article > b[data-status="completed"] { background: #99df78; }
.game-phone__family-request-list > article > small { grid-column: 1/-1; }
.game-phone__modal-close { width: 100%; margin-top: 18px; padding: 12px; border: 1px solid rgb(23 33 58 / 16%); border-radius: 13px; background: #ffd43b; color: #14213d; font: inherit; font-weight: 900; }
.game-phone__debug-danger { background: #ffe6e8 !important; color: #9d1821 !important; }
.game-phone__clear-warning { width: min(520px,100%); text-align: center; }
.game-phone__clear-warning > i { color: #e53945; font-size: 46px; }
.game-phone__clear-warning > small { display: block; margin-top: 10px; color: #c42631; font-weight: 900; letter-spacing: .12em; }
.game-phone__clear-warning h2 { margin: 8px 0; font-size: 30px; }
.game-phone__clear-warning p { line-height: 1.55; }
.game-phone__clear-warning > div { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 20px; }
.game-phone__clear-warning button { padding: 12px; border: 1px solid rgb(23 33 58 / 16%); border-radius: 13px; background: #fff; color: #14213d; font: inherit; font-weight: 900; }
.game-phone__clear-warning .game-phone__confirm-clear { background: #e53945; color: #fff; }
@media (max-width:620px) { .game-phone__family-summary, .game-phone__clear-warning > div { grid-template-columns: 1fr; } }

.game-phone__music {
  display: grid;
  box-sizing: border-box;
  height: calc(100% - 43px);
  gap: 12px;
  padding: 14px;
  overflow-y: auto;
  background:
    linear-gradient(160deg, #21112f, #101722 58%, #081018);
  color: #f5edf9;
}

.game-phone__goals {
  box-sizing: border-box;
  height: calc(100% - 43px);
  padding: 14px;
  overflow-y: auto;
  background: linear-gradient(180deg, #f2f4f6, #e8edf1);
}

.game-phone__goal-group {
  display: grid;
  gap: 8px;
  margin-top: 16px;
}

.game-phone__goal-group > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #26313b;
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.game-phone__goal-group > header span {
  color: #7a6540;
  font-weight: 900;
}

.game-phone__goal {
  display: grid;
  gap: 8px;
  padding: 11px;
  border: 1px solid #c9d0d5;
  border-left: 4px solid #9b7b2f;
  border-radius: 7px;
  background: #ffffff;
  box-shadow: 0 2px 8px rgb(23 33 58 / 10%);
}

.game-phone__goal--tracked {
  border-color: #a98a40;
  background: #fffaf0;
}

.game-phone__goal--complete {
  border-left-color: #3f8f55;
}

.game-phone__goal--failed {
  border-left-color: #b94742;
  opacity: 0.72;
}

.game-phone__goal-heading {
  display: grid;
  grid-template-columns: 20px 1fr;
  align-items: start;
  gap: 7px;
}

.game-phone__goal-heading > i {
  margin-top: 2px;
  color: #8e7335;
}

.game-phone__goal--complete .game-phone__goal-heading > i {
  color: #3f8f55;
}

.game-phone__goal-heading > span {
  display: grid;
  gap: 1px;
}

.game-phone__goal-heading small {
  color: #8a929a;
  font-size: 8px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.game-phone__goal-heading strong {
  color: #1f2933;
  font-size: 13px;
}

.game-phone__goal p {
  margin: 0;
  color: #5c6670;
  font-size: 10px;
  line-height: 1.35;
}

.game-phone__goal-progress {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 8px;
}

.game-phone__goal-progress > span {
  height: 7px;
  overflow: hidden;
  border-radius: 999px;
  background: #dce1e4;
}

.game-phone__goal-progress i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #826722, #c0a451);
}

.game-phone__goal-progress b {
  color: #57616a;
  font-size: 9px;
}

.game-phone__goal-deadline {
  color: #a14c43;
  font-size: 9px;
  font-weight: 800;
}

.game-phone__goal-actions {
  display: flex;
  align-items: center;
  gap: 7px;
}

.game-phone__goal-actions button {
  min-height: 28px;
  padding: 6px 9px;
  border: 1px solid #8c7338;
  border-radius: 5px;
  color: #ffffff;
  background: #735d2c;
  font: inherit;
  font-size: 9px;
  font-weight: 900;
}

.game-phone__goal-actions button:disabled {
  color: #747b80;
  background: #e2e5e7;
  border-color: #c3c8cb;
}

.game-phone__goal-actions .game-phone__goal-claim {
  border-color: #347b49;
  background: #3f8f55;
}

.game-phone__goal-actions > span {
  color: #478058;
  font-size: 9px;
  font-weight: 900;
}

.game-phone__obligations {
  display: grid;
  gap: 9px;
}

.game-phone__obligations > strong {
  color: #34404a;
  font-size: 11px;
}

.game-phone__obligation-card {
  display: grid;
  gap: 7px;
  padding: 11px;
  border: 1px solid #ced5da;
  border-left: 4px solid #987a35;
  border-radius: 7px;
  background: #ffffff;
  box-shadow: 0 2px 8px rgb(23 33 58 / 10%);
}

.game-phone__obligation-card--family {
  border-left-color: #4b779f;
}

.game-phone__obligation-card > span {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #78602c;
}

.game-phone__obligation-card > span small {
  color: #65717a;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.06em;
}

.game-phone__obligation-card > strong {
  color: #222d36;
  font-size: 14px;
}

.game-phone__obligation-card > small {
  color: #6f7981;
  font-size: 9px;
}

.game-phone__obligation-card > button,
.game-phone__obligation-actions button {
  min-height: 30px;
  padding: 7px 9px;
  border: 1px solid #846a31;
  border-radius: 5px;
  color: #ffffff;
  background: #79612e;
  font: inherit;
  font-size: 9px;
  font-weight: 900;
}

.game-phone__obligation-card button:disabled {
  border-color: #c5cacf;
  color: #8a9196;
  background: #e1e4e6;
}

.game-phone__obligation-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.game-phone__obligation-card--family .game-phone__obligation-actions button {
  border-color: #436a8b;
  background: #4b779f;
}

.game-phone__music-now {
  display: grid;
  justify-items: center;
  padding: 15px 12px;
  border: 1px solid rgb(202 145 230 / 35%);
  border-radius: 16px;
  background: linear-gradient(145deg, #713895, #252243);
  box-shadow: 0 2px 8px rgb(23 33 58 / 10%);
  text-align: center;
}

.game-phone__music-art {
  display: grid;
  width: 60px;
  height: 60px;
  margin-bottom: 9px;
  place-items: center;
  border-radius: 50%;
  color: #32143d;
  background: linear-gradient(145deg, #f4c85b, #d776da);
  box-shadow: 0 2px 8px rgb(23 33 58 / 10%);
  font-size: 23px;
}

.game-phone__music-now small {
  color: #d9a9ec;
  font-size: 8px;
  font-weight: 900;
  letter-spacing: 0.16em;
}

.game-phone__music-now strong {
  margin-top: 3px;
  font-size: 16px;
}

.game-phone__music-now em {
  margin-top: 2px;
  color: #f2d879;
  font-size: 10px;
  font-style: normal;
  font-weight: 800;
}

.game-phone__music-now > span:last-child {
  margin-top: 4px;
  color: #d6c8df;
  font-size: 9px;
}

.game-phone__music-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
}

.game-phone__music-controls button {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border: 1px solid #71587e;
  border-radius: 50%;
  color: #f6edfa;
  background: #2b2133;
  cursor: pointer;
}

.game-phone__music-controls .game-phone__music-play {
  width: 50px;
  height: 50px;
  border-color: #efc85a;
  color: #241725;
  background: #efc85a;
  font-size: 18px;
}

.game-phone__music-modes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 7px;
}

.game-phone__music-modes button {
  padding: 8px;
  border: 1px solid #51445a;
  border-radius: 8px;
  color: #c8bccc;
  background: #1e1924;
  font: inherit;
  font-size: 9px;
  font-weight: 800;
  cursor: pointer;
}

.game-phone__music-modes button.active {
  border-color: #dbb84f;
  color: #261c12;
  background: #dbb84f;
}

.game-phone__music-library-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 7px;
}

.game-phone__music-library-actions button {
  padding: 8px 6px;
  border: 2px solid #17223f;
  border-radius: 9px;
  color: #17223f;
  background: #ffd43b;
  box-shadow: 0 2px 8px rgb(23 33 58 / 10%);
  font: inherit;
  font-size: 8px;
  font-weight: 900;
  cursor: pointer;
}

.game-phone__music-library-actions button:disabled {
  opacity: 0.6;
  cursor: wait;
}

.game-phone__music-library-error {
  color: #ff8c91;
  font-size: 8px;
  font-weight: 800;
}

.game-phone__music-list {
  display: grid;
  gap: 6px;
}

.game-phone__music-list > button {
  display: grid;
  grid-template-columns: 28px 1fr 18px;
  align-items: center;
  padding: 8px 9px;
  border: 1px solid #3c3342;
  border-radius: 9px;
  color: #e9e0ed;
  background: #19171d;
  text-align: left;
  cursor: pointer;
}

.game-phone__music-list > button.active {
  border-color: #b984cf;
  background: #34223d;
}

.game-phone__music-list b {
  color: #d9b857;
}

.game-phone__music-list span {
  display: grid;
}

.game-phone__music-list strong {
  font-size: 10px;
}

.game-phone__music-list small {
  color: #9e919f;
  font-size: 8px;
}

.game-phone__launcher {
  position: relative;
  display: grid;
  width: 88px;
  height: 96px;
  place-items: center;
  border: 0;
  border-radius: 20px;
  background: transparent;
  cursor: pointer;
  filter: none;
}

.game-phone__launcher:hover,
.game-phone__launcher:focus-visible {
  transform: translateY(-2px) scale(1.04);
}

.game-phone__navigation-launcher {
  position: absolute;
  right: 100px;
  bottom: 8px;
  display: grid;
  width: 76px;
  height: 76px;
  place-items: center;
  border: 1px solid rgb(23 33 58 / 16%);
  border-radius: 20px;
  color: #ffffff;
  background: #2f80ed;
  box-shadow: 0 2px 8px rgb(23 33 58 / 10%);
  cursor: pointer;
}

.game-phone__navigation-launcher i {
  font-size: 34px;
  transition: transform 160ms linear;
}

.game-phone__navigation-launcher:hover,
.game-phone__navigation-launcher:focus-visible {
  background: #1f6fd8;
  transform: translateY(-2px);
}

.game-phone__launcher-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
  transform: scale(1.12);
}

.game-phone__device {
  position: relative;
  width: 292px;
  padding: 9px 8px 48px;
  border: 2px solid #39414b;
  border-radius: 38px;
  background: linear-gradient(145deg, #20252b, #090b0e);
  box-shadow:
    none;
}

.game-phone__speaker {
  position: absolute;
  top: 14px;
  left: 50%;
  width: 74px;
  height: 20px;
  margin: 0;
  border-radius: 999px;
  background: #07090b;
  transform: translateX(-50%);
  z-index: 2;
}

.game-phone__screen {
  position: relative;
  height: 430px;
  overflow: hidden;
  border: 1px solid #050607;
  border-radius: 31px;
  background: #f1f5f8;
  color: #17202a;
}

.game-phone__debug-unlock-overlay {
  position: absolute;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgb(7 9 11 / 78%);
  backdrop-filter: blur(5px);
}

.game-phone__debug-unlock-card {
  position: relative;
  display: grid;
  gap: 9px;
  width: 100%;
  box-sizing: border-box;
  padding: 20px 16px 16px;
  border: 1px solid rgb(255 255 255 / 14%);
  border-radius: 20px;
  background: #111820;
  color: #f8fafc;
  box-shadow: 0 16px 40px rgb(0 0 0 / 45%);
}

.game-phone__debug-unlock-card > small { color: #93a4b8; font-size: 10px; font-weight: 900; letter-spacing: .14em; }
.game-phone__debug-unlock-card > strong { font-size: 21px; line-height: 1.1; }
.game-phone__debug-unlock-card > p { margin: 0 0 4px; color: #cbd5e1; font-size: 12px; line-height: 1.4; }
.game-phone__debug-unlock-card > label { color: #dbe4ef; font-size: 11px; font-weight: 800; }
.game-phone__debug-unlock-card > input {
  width: 100%;
  min-height: 44px;
  box-sizing: border-box;
  padding: 0 12px;
  border: 1px solid #3d4b5f;
  border-radius: 11px;
  outline: none;
  background: #0b1118;
  color: #fff;
  font: inherit;
  font-size: 16px;
}
.game-phone__debug-unlock-card > input:focus { border-color: #f4c542; box-shadow: 0 0 0 2px rgb(244 197 66 / 20%); }
.game-phone__debug-unlock-icon { display: grid; width: 38px; height: 38px; place-items: center; border-radius: 12px; background: #f4c542; color: #111820; font-size: 17px; }
.game-phone__debug-unlock-close { position: absolute; top: 10px; right: 10px; display: grid; width: 34px; height: 34px; place-items: center; border: 0; border-radius: 50%; background: #263241; color: #fff; }
.game-phone__debug-unlock-submit { min-height: 44px; margin-top: 3px; border: 0; border-radius: 11px; background: #f4c542; color: #111820; font: inherit; font-weight: 900; }
.game-phone__debug-unlock-error { color: #ff8f96 !important; letter-spacing: 0 !important; }

.game-phone__status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 38px;
  padding: 0 17px;
  background: rgb(231 239 244 / 94%);
  font-size: 11px;
  font-weight: 800;
}

.game-phone__status-icons {
  display: flex;
  gap: 7px;
}

.game-phone__home {
  height: calc(100% - 38px);
  padding: 17px 14px;
  overflow-y: auto;
  background:
    linear-gradient(145deg, rgb(49 114 175 / 24%), transparent 48%),
    linear-gradient(325deg, rgb(63 153 94 / 24%), transparent 55%),
    #edf3f6;
}

.game-phone__home-heading {
  display: flex;
  flex-direction: column;
  margin-bottom: 19px;
}

.game-phone__home-heading span {
  font-size: 20px;
  font-weight: 900;
}

.game-phone__home-heading small {
  color: #51606d;
  font-size: 11px;
  font-weight: 700;
}

.game-phone__app-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px 9px;
}

.game-phone__app-button {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #17202a;
  font: inherit;
  font-size: 10px;
  font-weight: 800;
  cursor: pointer;
}

.game-phone__app-button:disabled {
  opacity: 0.45;
  cursor: default;
}

.game-phone__app-locked {
  margin-top: -5px;
  color: #9aa5af;
  font-size: 7px;
}

.game-phone__app-icon {
  position: relative;
  display: grid;
  width: 50px;
  height: 50px;
  place-items: center;
  border: 2px solid rgb(255 255 255 / 80%);
  border-radius: 14px;
  color: #ffffff;
  font-size: 22px;
  box-shadow: 0 2px 8px rgb(23 33 58 / 10%);
}

@keyframes game-phone-notification-shake {
  0%, 100% { transform: rotate(0deg); }
  15% { transform: rotate(-8deg); }
  30% { transform: rotate(8deg); }
  45% { transform: rotate(-6deg); }
  60% { transform: rotate(6deg); }
  75% { transform: rotate(-3deg); }
}

.game-phone__launcher--shake {
  animation: game-phone-notification-shake 0.7s ease-in-out;
}

.game-phone__launcher--ringing,
.game-phone__app-icon--ringing {
  animation: game-phone-notification-shake 0.85s ease-in-out infinite;
}

.game-phone__app-icon--shake {
  animation: game-phone-notification-shake 0.7s ease-in-out;
}

.game-phone__launcher-notification {
  position: absolute;
  top: 6px;
  right: 5px;
  display: grid;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  place-items: center;
  border: 2px solid #ffffff;
  border-radius: 999px;
  background: #d93636;
  color: #ffffff;
  font-size: 10px;
  font-weight: 900;
  line-height: 1;
}

.game-phone__notification {
  position: absolute;
  top: -7px;
  right: -7px;
  display: grid;
  width: 20px;
  height: 20px;
  place-items: center;
  border: 2px solid #ffffff;
  border-radius: 50%;
  background: #d93636;
  color: #ffffff;
  font-size: 10px;
}

.game-phone__app-button:hover .game-phone__app-icon,
.game-phone__app-button:focus-visible .game-phone__app-icon {
  transform: translateY(-2px);
}

.game-phone__app-screen {
  display: flex;
  height: calc(100% - 38px);
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
  background: #f7f9fb;
}

.game-phone__app-header,
.game-phone__account-tabs {
  flex: 0 0 auto;
}

.game-phone__app-screen > :not(.game-phone__app-header):not(.game-phone__account-tabs) {
  box-sizing: border-box;
  height: auto;
  min-height: 0;
  flex: 1 1 auto;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.game-phone__app-screen > .bpc { flex: 1 1 0; overflow: hidden; }

.game-phone__app-header {
  display: grid;
  grid-template-columns: 34px 1fr 34px;
  align-items: center;
  height: 43px;
  padding: 0 7px;
  border-bottom: 1px solid #cbd5dd;
  background: #ffffff;
  text-align: center;
}

.game-phone__app-header button,
.game-phone__navigation button {
  display: grid;
  place-items: center;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.game-phone__app-header button {
  width: 34px;
  height: 34px;
  border-radius: 9px;
}

.game-phone__app-header button:hover,
.game-phone__app-header button:focus-visible {
  background: #e7edf1;
}

.game-phone__app-content,
.game-phone__wallet {
  display: flex;
  height: calc(100% - 43px);
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 25px 20px;
  text-align: center;
}

.game-phone__large-icon {
  margin-bottom: 16px;
  color: #326fa8;
  font-size: 46px;
}

.game-phone__app-content h3 {
  margin: 0 0 9px;
  font-size: 16px;
}

.game-phone__app-content p,
.game-phone__wallet p {
  margin: 0;
  color: #53616d;
  font-size: 12px;
  line-height: 1.45;
}

.game-phone__settings {
  height: calc(100% - 43px);
  min-height: 0;
  box-sizing: border-box;
  padding: 18px 16px;
  overflow-y: auto;
  overscroll-behavior: contain;
  background: #eef2f5;
}

.game-phone__settings > header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
}

.game-phone__settings > header > i {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 13px;
  background: #326fa8;
  color: #ffffff;
  font-size: 18px;
}

.game-phone__settings h3,
.game-phone__settings small {
  display: block;
  margin: 0;
}

.game-phone__settings h3 {
  font-size: 17px;
}

.game-phone__settings small {
  color: #61707c;
  font-size: 10px;
}

.game-phone__inventory,
.game-phone__debugger {
  height: calc(100% - 43px);
  padding: 16px;
  overflow-y: auto;
  background: #eef2f5;
}

.game-phone__inventory > header,
.game-phone__debugger > header {
  margin-bottom: 14px;
}

.game-phone__inventory h3,
.game-phone__debugger h3 {
  margin: 3px 0;
}

.game-phone__inventory > header small,
.game-phone__debugger > header small {
  color: #61707c;
  font-size: 10px;
}

.game-phone__inventory-list {
  display: grid;
  gap: 9px;
}

.game-phone__inventory-list article {
  display: grid;
  grid-template-columns: 48px 1fr auto;
  gap: 8px 10px;
  padding: 11px;
  border: 1px solid #ced7de;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 2px 8px rgb(23 33 58 / 10%);
}

.game-phone__inventory-list article > img {
  width: 44px;
  height: 44px;
  object-fit: contain;
}

.game-phone__inventory-list article > div {
  display: grid;
  gap: 2px;
}

.game-phone__inventory-list article small {
  color: #687580;
  font-size: 9px;
}

.game-phone__inventory-list article span {
  color: #258447;
  font-size: 9px;
  font-weight: 900;
}

.game-phone__inventory-list article > b {
  color: #8b5e34;
  font-size: 16px;
}

.game-phone__inventory-list button {
  grid-column: 1 / -1;
  padding: 8px;
  border: 0;
  border-radius: 8px;
  background: #1e7b43;
  color: #ffffff;
  font: inherit;
  font-size: 10px;
  font-weight: 900;
  cursor: pointer;
}

.game-phone__debugger > header {
  display: flex;
  align-items: center;
  gap: 11px;
}

.game-phone__debugger > header > i {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: 12px;
  background: #30343b;
  color: #ffffff;
}

.game-phone__debugger > button {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 11px;
  margin-top: 9px;
  padding: 11px;
  border: 1px solid #cbd4da;
  border-radius: 11px;
  background: #ffffff;
  color: #1d2730;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.game-phone__debugger > button > i {
  width: 24px;
  color: #52616d;
  text-align: center;
}

.game-phone__debugger > button > span {
  display: grid;
  gap: 2px;
}

.game-phone__debugger > button small {
  color: #687580;
  font-size: 9px;
}

.game-phone__debugger >
  button.game-phone__debug-action--active {
  border-color: #2c8d54;
  background: #e7f6ec;
}

.game-phone__debugger >
  button.game-phone__debug-action--danger {
  border-color: #e0a4a4;
  color: #a72424;
}

.game-phone__volume-control {
  display: grid;
  gap: 12px;
  padding: 15px;
  border: 1px solid #d2dbe2;
  border-radius: 15px;
  background: #ffffff;
}

.game-phone__volume-control > span {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 800;
}

.game-phone__volume-control input {
  width: 100%;
  accent-color: #326fa8;
  cursor: pointer;
}

.game-phone__mute-control {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  padding: 14px 15px;
  border: 1px solid #d2dbe2;
  border-radius: 15px;
  background: #ffffff;
  color: #17202a;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.game-phone__mute-control > i {
  width: 25px;
  color: #326fa8;
  font-size: 18px;
  text-align: center;
}

.game-phone__mute-control span {
  display: grid;
  gap: 3px;
}

.game-phone__mute-control strong {
  font-size: 12px;
}


.game-phone__messages {
  height: calc(100% - 43px);
  overflow-y: auto;
  padding: 12px;
}

.game-phone__incoming-call {
  display: flex;
  height: calc(100% - 43px);
  align-items: center;
  flex-direction: column;
  justify-content: center;
  padding: 22px;
  background: linear-gradient(165deg, #172331, #0b1118);
  color: #ffffff;
  text-align: center;
  gap: 10px;
}

.game-phone__incoming-call > small {
  color: #e6c447;
  font-size: 9px;
  letter-spacing: .14em;
}

.game-phone__incoming-call > img {
  width: 150px;
  height: 190px;
  object-fit: contain;
  object-position: center bottom;
}

.game-phone__incoming-call > strong {
  font-size: 21px;
}

.game-phone__incoming-call > span {
  color: #c7d0d8;
  font-size: 11px;
  line-height: 1.4;
}

.game-phone__incoming-call > div {
  display: grid;
  width: 100%;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 12px;
}

.game-phone__incoming-call > .game-phone__incoming-actions--connected {
  grid-template-columns: 1fr;
}

.game-phone__incoming-call button {
  display: grid;
  min-height: 54px;
  place-items: center;
  border: 0;
  border-radius: 12px;
  color: #fff;
  font: 800 11px Basic, sans-serif;
}

.game-phone__incoming-decline { background: #a92e36; }
.game-phone__incoming-accept { background: #21854b; }

.game-phone__incoming-call--connected > img {
  animation: game-phone-call-pulse 1.8s ease-in-out infinite;
}

@keyframes game-phone-call-pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.035);
  }
}

.game-phone__messages-heading {
  display: grid;
  gap: 4px;
  margin-bottom: 11px;
}

.game-phone__messages-heading strong {
  font-size: 15px;
}

.game-phone__messages-heading small,
.game-phone__route-details small,
.game-phone__map small,
.game-phone__empty-app small {
  color: #5b6974;
  font-size: 10px;
  line-height: 1.3;
}

.game-phone__eyebrow,
.game-phone__map-label {
  color: #b47b00;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.12em;
}

.game-phone__conversation-list,
.game-phone__contact-list {
  display: grid;
  gap: 8px;
}

.game-phone__conversation,
.game-phone__contact {
  display: grid;
  grid-template-columns: 40px 1fr auto;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 9px;
  border: 1px solid #cbd4dc;
  border-radius: 11px;
  background: #ffffff;
  color: #17202a;
  text-align: left;
}

.game-phone__conversation {
  cursor: pointer;
}

.game-phone__conversation:hover,
.game-phone__conversation:focus-visible {
  border-color: #2b73bd;
  background: #edf5fc;
}

.game-phone__contact-avatar {
  display: grid;
  width: 40px;
  height: 40px;
  overflow: hidden;
  place-items: center;
  border-radius: 50%;
  background: #2f7f55;
  color: #ffffff;
  font-size: 11px;
  font-weight: 900;
}

.game-phone__contact-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 18%;
}

.game-phone__conversation-details,
.game-phone__contact-details {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.game-phone__conversation-details strong,
.game-phone__contact-details strong {
  font-size: 12px;
}

.game-phone__conversation-details small,
.game-phone__contact-details small {
  overflow: hidden;
  color: #5b6974;
  font-size: 10px;
  line-height: 1.3;
  text-overflow: ellipsis;
}

.game-phone__conversation-badge {
  display: grid;
  min-width: 20px;
  height: 20px;
  place-items: center;
  border-radius: 999px;
  background: #d93636;
  color: #ffffff;
  font-size: 10px;
  font-weight: 900;
}

.game-phone__message-bubble {
  margin: 0 0 10px 24px;
  padding: 10px 11px 7px;
  border: 1px solid #c5e3d0;
  border-radius: 16px 16px 5px 16px;
  background: linear-gradient(145deg, #e8f7ed, #d4eddd);
  color: #21352a;
  font-size: 11px;
  line-height: 1.4;
  box-shadow: 0 2px 8px rgb(23 33 58 / 10%);
}

.game-phone__message-bubble time {
  display: block;
  margin-top: 4px;
  color: #708078;
  font-size: 8px;
  text-align: right;
}

.game-phone__lease-card {
  display: grid;
  gap: 3px;
  margin: 0 0 11px;
  padding: 11px 13px;
  border-radius: 15px;
  background:
    radial-gradient(circle at top right, rgb(255 255 255 / 17%), transparent 42%),
    linear-gradient(135deg, #141c27, #273b4d);
  color: #ffffff;
  box-shadow: 0 2px 8px rgb(23 33 58 / 10%);
}

.game-phone__lease-card span {
  color: #79d99d;
  font-size: 8px;
  font-weight: 900;
  letter-spacing: 0.14em;
}

.game-phone__lease-card strong {
  font-size: 20px;
}

.game-phone__lease-card small {
  color: #c8d5df;
  font-size: 9px;
  line-height: 1.35;
}

.game-phone__contacts {
  height: calc(100% - 43px);
  overflow-y: auto;
  padding: 12px;
}

.game-phone__contact > i {
  color: #3f6d91;
  font-size: 15px;
}

.game-phone__route-list {
  display: grid;
  gap: 8px;
}

.game-phone__route {
  display: grid;
  grid-template-columns: 39px 1fr 12px;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px;
  border: 1px solid #cbd4dc;
  border-radius: 10px;
  background: #ffffff;
  color: #17202a;
  text-align: left;
  cursor: pointer;
}

.game-phone__route:hover,
.game-phone__route:focus-visible {
  border-color: #2b73bd;
  background: #edf5fc;
}

.game-phone__route-id {
  display: grid;
  width: 37px;
  height: 37px;
  place-items: center;
  border-radius: 9px;
  background: #f2c438;
  color: #111111;
  font-size: 13px;
  font-weight: 900;
}

.game-phone__route-details {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.game-phone__route-details strong {
  overflow: hidden;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.game-phone__route-details .game-phone__route-corridor {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #b26b16;
  font-size: 7px;
  font-weight: 900;
  letter-spacing: 0.05em;
}

.game-phone__selected-route,
.game-phone__empty-app {
  display: flex;
  min-height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
  text-align: center;
}

.game-phone__selected-route > i,
.game-phone__empty-app > i {
  color: #2f8b4d;
  font-size: 38px;
}

.game-phone__empty-app--no-destination > i {
  color: #65758a;
}

.game-phone__selected-route > span {
  color: #2f8b4d;
  font-size: 10px;
  font-weight: 900;
  text-transform: uppercase;
}

.game-phone__selected-route > strong {
  font-size: 15px;
}

.game-phone__selected-route > small {
  color: #5b6974;
  font-size: 11px;
}

.game-phone__selected-route button {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 9px;
  padding: 9px 12px;
  border: 0;
  border-radius: 9px;
  background: #347fd0;
  color: #ffffff;
  font-size: 11px;
  font-weight: 900;
  cursor: pointer;
}

.game-phone__map {
  display: flex;
  height: calc(100% - 43px);
  box-sizing: border-box;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  padding: 24px 18px 14px;
  text-align: center;
}

.game-phone__map > * {
  flex-shrink: 0;
}

.game-phone__location-search {
  position: relative;
  display: grid;
  width: 100%;
  box-sizing: border-box;
  gap: 6px;
  margin: 0 0 18px;
}

.game-phone__location-search label {
  color: #d6e4f7;
  font-size: 8px;
  font-weight: 900;
  text-transform: uppercase;
}

.game-phone__location-search input {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border: 1px solid #71849a;
  border-radius: 10px;
  color: #17212b;
  background: #ffffff;
}

.game-phone__map > .game-phone__empty-app {
  flex: 1;
  min-height: 0;
  width: 100%;
  padding-bottom: 42px;
}

.game-phone__location-results {
  position: absolute;
  top: 48px;
  left: 0;
  right: 0;
  display: grid;
  max-height: 170px;
  overflow-y: auto;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 2px 8px rgb(23 33 58 / 10%);
  z-index: 4;
}

.game-phone__location-results button {
  display: grid;
  padding: 8px;
  border: 0;
  border-bottom: 1px solid #dce4eb;
  color: #17212b;
  background: #ffffff;
  gap: 2px;
  text-align: left;
  cursor: pointer;
}

.game-phone__location-results strong {
  font-size: 9px;
}

.game-phone__location-results small {
  color: #71808e;
  font-size: 7px;
}

.game-phone__garage,
.game-phone__moto-eazi {
  display: grid;
  height: calc(100% - 43px);
  box-sizing: border-box;
  align-content: start;
  overflow-y: auto;
  padding: 12px;
  background: #f3f6fa;
  gap: 8px;
}

.game-phone__vehicle-card,
.game-phone__ride-card {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 8px;
  padding: 10px;
  border-radius: 13px;
  background: #ffffff;
  box-shadow: 0 2px 8px rgb(23 33 58 / 10%);
}

.game-phone__vehicle-card > span:nth-child(2),
.game-phone__ride-card {
  display: grid;
  gap: 3px;
}

.game-phone__vehicle-card small,
.game-phone__ride-card small {
  color: #71808e;
  font-size: 8px;
}

.game-phone__vehicle-swatch {
  width: 28px;
  height: 44px;
  object-fit: contain;
  border: 2px solid #26323d;
  border-radius: 6px;
  background: #e9eef2;
}

.game-phone__vehicle-card button,
.game-phone__ride-card button {
  padding: 8px;
  border: 0;
  border-radius: 9px;
  color: #ffffff;
  background: #1769e0;
  font-size: 9px;
  font-weight: 900;
  cursor: pointer;
}

.game-phone__vehicle-card button:disabled {
  background: #aab5bd;
  cursor: default;
}

.game-phone__ride-card {
  grid-template-columns: 1fr;
}

.game-phone__driver-rating {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 10px;
  border: 1px solid rgb(23 33 58 / 16%);
  border-radius: 11px;
  color: #14213d;
  background: #fff3bf;
}

.game-phone__driver-rating span {
  font-size: 8px;
  font-weight: 900;
  letter-spacing: .08em;
}

.game-phone__driver-rating strong,
.game-phone__ride-stars {
  color: #ffb703;
  letter-spacing: 2px;
}

.game-phone__active-ride-target {
  display: grid;
  gap: 2px;
  padding: 8px;
  border-radius: 9px;
  background: #eaf4ff;
}

.game-phone__active-ride-target b {
  font-size: 12px;
}

.game-phone__active-ride-metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 7px;
}

.game-phone__active-ride-metrics span {
  display: grid;
  gap: 2px;
  padding: 7px;
  border: 1px solid #cbd4dc;
  border-radius: 8px;
  background: #f8fbff;
}

.game-phone__ride-list-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #14213d;
  font-size: 10px;
}

.game-phone__ride-list-heading span {
  display: grid;
  min-width: 22px;
  height: 22px;
  place-items: center;
  border: 1px solid rgb(23 33 58 / 16%);
  border-radius: 50%;
  background: #ffd83d;
  font-weight: 900;
}

.game-phone__ride-searching {
  margin: 0;
  padding: 8px;
  border: 2px dashed #3979c9;
  border-radius: 10px;
  color: #31506f;
  background: #eaf4ff;
  font-size: 8px;
  font-weight: 800;
  text-align: center;
}

.game-phone__ride-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 7px;
}

.game-phone__ride-actions button:last-child {
  background: #b84343;
}

.game-phone__navigation-compass {
  box-sizing: border-box;
  aspect-ratio: 1;
  display: grid;
  width: 112px;
  height: 112px;
  align-self: center;
  margin-bottom: 15px;
  place-items: center;
  border: 8px solid #25303a;
  border-radius: 50%;
  background: #17222c;
  box-shadow: none;
}

.game-phone__navigation-compass i {
  color: #df3d35;
  font-size: 55px;
  filter: none;
  transition: transform 100ms linear;
}

.game-phone__map > strong {
  margin-top: 4px;
  font-size: 16px;
}

.game-phone__following-stop {
  box-sizing: border-box;
  overflow-wrap: anywhere;
  display: grid;
  width: 100%;
  margin-top: 13px;
  padding: 9px;
  border-radius: 9px;
  background: #e8eef3;
}

.game-phone__following-stop span {
  color: #667580;
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
}

.game-phone__following-stop strong {
  font-size: 11px;
}

.game-phone__help {
  height: calc(100% - 43px);
  overflow-y: auto;
  padding: 10px 13px 14px;
}

.game-phone__help dl {
  margin: 0;
}

.game-phone__help dl div {
  display: grid;
  grid-template-columns: 76px 1fr;
  gap: 9px;
  padding: 9px 0;
  border-bottom: 1px solid #d7dfe5;
}

.game-phone__help dt {
  font-size: 11px;
  font-weight: 900;
}

.game-phone__help dd {
  margin: 0;
  color: #4d5b66;
  font-size: 11px;
}

.game-phone__wallet span {
  color: #596874;
  font-size: 12px;
  font-weight: 700;
}

.game-phone__wallet strong {
  margin: 8px 0 16px;
  color: #2f6d43;
  font-size: 25px;
}

.game-phone__wallet-fees {
  display: grid;
  width: 100%;
  gap: 6px;
  margin: 0 0 13px;
  padding: 10px;
  border-radius: 12px;
  background: #e8eef3;
  font-size: 10px;
}

.game-phone__wallet-fees span {
  display: flex;
  justify-content: space-between;
  color: #485762;
}

.game-phone__wallet-fees b {
  color: #17202a;
}

.game-phone__wallet-fees strong {
  margin: 4px 0 0;
  padding-top: 7px;
  border-top: 1px solid #c7d2da;
  color: #8b2f2f;
  font-size: 11px;
}

.game-phone__navigation {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 30px;
  padding-top: 8px;
  color: #ffffff;
}

.game-phone__navigation button {
  width: 34px;
  height: 24px;
  border-radius: 8px;
}

.game-phone__navigation button:hover,
.game-phone__navigation button:focus-visible {
  background: #343b44;
}

.game-phone__side-button {
  position: absolute;
  top: 105px;
  right: -6px;
  width: 5px;
  height: 68px;
  padding: 0;
  border: 0;
  border-radius: 0 4px 4px 0;
  background: #303740;
  cursor: pointer;
}

.game-phone__hub {
  position: absolute;
  bottom: 8px;
  left: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  min-width: 116px;
  height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgb(255 255 255 / 10%);
  box-shadow: none;
  transform: translateX(-50%);
  z-index: 4;
}

.game-phone__hub button {
  display: grid;
  width: 38px;
  height: 27px;
  padding: 0;
  place-items: center;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #ffffff;
  font-size: 12px;
  cursor: pointer;
}

.game-phone__hub button:hover,
.game-phone__hub button:focus-visible {
  background: rgb(255 255 255 / 15%);
}

.game-phone__contact-avatar--mechanic {
  background: #1769e0;
}

.game-phone__contact-avatar--bank {
  background: #0b3c89;
}

.game-phone__message-bubble--bank {
  background: #e9f2ff;
  color: #173b68;
}

.game-phone__repair-card {
  display: grid;
  gap: 5px;
  padding: 16px;
  border-radius: 18px;
  background: linear-gradient(145deg, #172331, #28445f);
  color: #ffffff;
  box-shadow: 0 2px 8px rgb(23 33 58 / 10%);
}

.game-phone__repair-card span {
  color: #86c5ff;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.game-phone__repair-card strong {
  font-size: 21px;
}

.game-phone__repair-card small {
  color: #d6e4ee;
  font-size: 10px;
}

.game-phone__call-button,
.game-phone__contact-call {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0;
  background: #24a35a;
  color: #ffffff;
  cursor: pointer;
}

.game-phone__call-button {
  width: 100%;
  gap: 8px;
  margin-top: 12px;
  padding: 12px;
  border-radius: 14px;
  font-size: 12px;
  font-weight: 900;
}

.game-phone__call-button:disabled {
  background: #aab5bd;
  cursor: default;
}

.game-phone__contact-call {
  width: 34px;
  height: 34px;
  border-radius: 50%;
}

.game-phone__megapay {
  height: calc(100% - 43px);
  overflow-y: auto;
  padding: 12px;
  background: #f3f6fa;
}

.game-phone__megapay-card {
  display: grid;
  gap: 4px;
  padding: 17px;
  border-radius: 19px;
  background:
    radial-gradient(circle at top right, rgb(92 183 255 / 35%), transparent 45%),
    linear-gradient(145deg, #0b3c89, #1769e0);
  color: #ffffff;
  box-shadow: 0 2px 8px rgb(23 33 58 / 10%);
}

.game-phone__megapay-card span {
  color: #bcd8ff;
  font-size: 8px;
  font-weight: 900;
  letter-spacing: 0.13em;
}

.game-phone__megapay-card strong {
  font-size: 25px;
}

.game-phone__megapay-balances {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.game-phone__megapay-balances > div {
  display: grid;
  gap: 2px;
  min-width: 0;
  padding: 9px;
  border: 1px solid rgb(255 255 255 / 32%);
  border-radius: 11px;
  background: rgb(4 26 70 / 28%);
}

.game-phone__megapay-balances strong {
  overflow: hidden;
  font-size: 16px;
  text-overflow: ellipsis;
}

.game-phone__megapay-card small {
  color: #d9e8ff;
  font-size: 9px;
}

.game-phone__megapay-payment {
  display: grid;
  gap: 9px;
  margin-top: 10px;
  padding: 12px;
  border: 3px solid #152346;
  border-radius: 16px;
  color: #152346;
  background: #fff7dc;
  box-shadow: 0 2px 8px rgb(23 33 58 / 10%);
}

.game-phone__megapay-payment header {
  display: grid;
  gap: 2px;
}

.game-phone__megapay-payment header span {
  color: #155b9b;
  font-size: 13px;
  font-weight: 1000;
}

.game-phone__megapay-payment header small,
.game-phone__megapay-payment > small {
  color: #5d6574;
  font-size: 9px;
  font-weight: 800;
}

.game-phone__megapay-payment label {
  display: grid;
  gap: 4px;
  font-size: 9px;
  font-weight: 1000;
}

.game-phone__megapay-payment select,
.game-phone__megapay-payment input,
.game-phone__megapay-payment textarea {
  width: 100%;
  min-height: 36px;
  box-sizing: border-box;
  padding: 7px 9px;
  border: 2px solid #152346;
  border-radius: 9px;
  color: #152346;
  background: #ffffff;
  font: inherit;
  font-weight: 900;
}

.game-phone__megapay-payment button {
  min-height: 39px;
  border: 3px solid #152346;
  border-radius: 10px;
  color: #152346;
  background: #ffd83d;
  box-shadow: 0 2px 8px rgb(23 33 58 / 10%);
  font: inherit;
  font-weight: 1000;
}

.game-phone__megapay-payment button:disabled {
  color: #7e8490;
  background: #d9dce2;
  box-shadow: none;
}

.game-phone__loan-card {
  display: grid;
  gap: 7px;
  margin-top: 10px;
  padding: 12px;
  border: 1px solid #d7e2ef;
  border-radius: 15px;
  background: #ffffff;
  box-shadow: 0 2px 8px rgb(23 33 58 / 10%);
}

.game-phone__loan-card > span,
.game-phone__bank-form label {
  color: #71808e;
  font-size: 8px;
  font-weight: 900;
  letter-spacing: 0.08em;
}

.game-phone__loan-card > strong {
  color: #123f79;
  font-size: 18px;
}

.game-phone__loan-card > small,
.game-phone__bank-form small {
  color: #71808e;
  font-size: 8px;
}

.game-phone__bank-form {
  display: grid;
  gap: 7px;
}

.game-phone__bank-form label {
  display: grid;
  gap: 4px;
}

.game-phone__bank-form input {
  width: 100%;
  box-sizing: border-box;
  padding: 8px;
  border: 1px solid #bfccda;
  border-radius: 9px;
  color: #17212b;
  background: #f8fafc;
  font: inherit;
}

.game-phone__bank-form button {
  padding: 9px;
  border: 0;
  border-radius: 10px;
  color: #ffffff;
  background: #1769e0;
  font-size: 10px;
  font-weight: 900;
  cursor: pointer;
}

.game-phone__megapay-summary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin: 10px 0 14px;
}

.game-phone__megapay-summary > span {
  display: grid;
  gap: 3px;
  padding: 10px;
  border-radius: 13px;
  background: #ffffff;
  box-shadow: 0 2px 8px rgb(23 33 58 / 10%);
}

.game-phone__megapay-summary small {
  color: #71808e;
  font-size: 9px;
}

.game-phone__megapay-summary b {
  font-size: 11px;
}

.game-phone__transactions {
  display: grid;
  gap: 7px;
}

.game-phone__transactions > strong {
  font-size: 12px;
}

.game-phone__transaction {
  display: grid;
  grid-template-columns: 32px 1fr auto;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid #dce4eb;
}

.game-phone__transaction > span:nth-child(2) {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.game-phone__transaction > span:nth-child(2) strong {
  overflow: hidden;
  font-size: 9px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.game-phone__transaction > span:nth-child(2) small,
.game-phone__transaction-empty {
  color: #81909d;
  font-size: 8px;
}

.game-phone__transaction-icon {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: 10px;
  font-size: 10px;
}

.game-phone__transaction-icon--income {
  background: #daf3e3;
  color: #188447;
}

.game-phone__transaction-icon--expense {
  background: #fae1e1;
  color: #bb3434;
}

.game-phone__transaction > b {
  font-size: 9px;
}

.game-phone__transaction-amount--income {
  color: #188447;
}

.game-phone__transaction-amount--expense {
  color: #bb3434;
}

.game-phone__fines {
  display: grid;
  align-content: start;
  gap: 12px;
  padding: 13px;
}

.game-phone__fine-card {
  position: relative;
  overflow: hidden;
  display: grid;
  min-height: 118px;
  padding-right: 96px;
  gap: 4px;
  padding: 15px;
  border-radius: 15px;
  background: linear-gradient(145deg, #742626, #c64242);
  color: #ffffff;
}

.game-phone__fine-officer {
  position: absolute;
  right: -8px;
  bottom: 0;
  width: 104px;
  height: 112px;
  object-fit: contain;
  object-position: center bottom;
  filter: none;
}

.game-phone__fine-card--impounded {
  background: linear-gradient(145deg, #571313, #a51717);
  box-shadow: 0 2px 8px rgb(23 33 58 / 10%);
}

.game-phone__fine-card span,
.game-phone__fine-card small {
  font-size: 8px;
  letter-spacing: 0.06em;
}

.game-phone__fine-card strong {
  font-size: 23px;
}

.game-phone__pay-fines {
  padding: 11px;
  border: 0;
  border-radius: 10px;
  background: #b52d2d;
  color: #ffffff;
  font: inherit;
  font-size: 11px;
  font-weight: 900;
}

.game-phone__pay-fines:disabled {
  opacity: 0.4;
}

.game-phone__fine-list {
  display: grid;
  gap: 8px;
}

.game-phone__fine-list > .game-phone__empty-app {
  min-height: 62px;
  padding: 9px;
  border: 2px solid #17213d;
  border-radius: 12px;
  background: #fffdf5;
}

.game-phone__fine-list > .game-phone__empty-app > i {
  font-size: 26px;
}

.game-phone__fine-list > article {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 9px;
  border: 1px solid #e1d1d1;
  border-radius: 10px;
  background: #ffffff;
}

.game-phone__fine-list > article > span {
  display: grid;
}

.game-phone__fine-list > article strong,
.game-phone__fine-list > article b {
  font-size: 9px;
}

.game-phone__fine-list > article small {
  color: #7d898f;
  font-size: 8px;
}

.game-phone__jobs {
  display: grid;
  grid-auto-rows: max-content;
  align-content: start;
  gap: 11px;
  padding: 13px;
}

.game-phone__job-card {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border: 1px solid #ccd5da;
  border-radius: 13px;
  background: #ffffff;
  color: #17202a;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.game-phone__job-card > i {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 11px;
  background: #e34b42;
  color: #ffffff;
  font-size: 16px;
}

.game-phone__job-card > span {
  min-width: 0;
  overflow-wrap: anywhere;
  display: grid;
  gap: 3px;
}

.game-phone__job-card strong {
  font-size: 11px;
}

.game-phone__job-card small {
  color: #66757e;
  font-size: 8px;
  line-height: 1.35;
}

.game-phone__job-card b {
  color: #c83b35;
  font-size: 8px;
}

.game-phone__job-card--active {
  border-color: #35a365;
  box-shadow: none;
}

.game-phone__account-tabs {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  padding: 7px 9px;
  border-bottom: 1px solid #d8e0e5;
  background: #edf2f5;
}

.game-phone__account-tabs button {
  position: relative;
  display: grid;
  justify-items: center;
  gap: 3px;
  padding: 6px 2px;
  border: 0;
  border-radius: 8px;
  color: #64727c;
  background: transparent;
  font: inherit;
  font-size: 7px;
  font-weight: 900;
}

.game-phone__account-tabs i {
  font-size: 12px;
}

.game-phone__account-tab-attention {
  position: absolute;
  top: 2px;
  right: 5px;
  display: grid;
  width: 13px;
  height: 13px;
  place-items: center;
  border: 2px solid #edf2f5;
  border-radius: 50%;
  background: #ef4050;
  color: #ffffff;
  font-size: 8px;
  font-weight: 1000;
  line-height: 1;
}

.game-phone__account-tabs .game-phone__account-tab--active {
  color: #fff;
  background: #20384b;
}

.game-phone__driver-licence {
  display: grid;
  align-content: start;
  gap: 12px;
  padding: 14px;
  color: #21303a;
}

.game-phone__licence-card {
  display: grid;
  gap: 4px;
  padding: 16px;
  border: 2px solid #d4b75e;
  border-radius: 13px;
  color: #fff;
  background: linear-gradient(135deg, #173a58, #255f86);
}

.game-phone__licence-card span,
.game-phone__licence-card small {
  font-size: 8px;
  letter-spacing: 0.08em;
}

.game-phone__licence-card strong {
  color: #f4cf58;
  font-size: 24px;
}

.game-phone__driver-licence > p,
.game-phone__test-status {
  margin: 0;
  font-size: 9px;
  line-height: 1.45;
}

.game-phone__test-status {
  display: grid;
  gap: 4px;
  padding: 11px;
  border: 1px solid #87a4b7;
  border-radius: 10px;
  background: #eef6fb;
}

.game-phone__test-status--passed {
  border-color: #61a975;
  background: #e8f7ec;
}

.game-phone__test-status--failed {
  border-color: #ce706b;
  background: #fff0ef;
}

.game-phone__licence-test-button {
  padding: 11px;
  border: 0;
  border-radius: 10px;
  color: #fff;
  background: #20384b;
  font: inherit;
  font-weight: 900;
}

.game-phone__screen *,
.game-phone__screen {
  scrollbar-width: none;
}

.game-phone__screen *::-webkit-scrollbar,
.game-phone__screen::-webkit-scrollbar {
  width: 0;
  height: 0;
}

@media (max-width: 800px) {
  .game-phone__device {
    width: 235px;
  }

  .game-phone__screen {
    height: 330px;
  }

  .game-phone__app-grid {
    gap: 14px 6px;
  }

  .game-phone__app-icon {
    width: 45px;
    height: 45px;
  }
}
.game-phone__ride-stars { color: #f4b400 !important; letter-spacing: 2px; }
.game-phone__ride-card--result { border-color: #2f9e5b; background: #eaffef; }

.game-phone__coupon-wallet {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
  margin: 12px 0;
  padding: 12px;
  border: 3px solid var(--tcg-ink, #17213b);
  border-radius: 16px;
  color: #17213b;
  background: #ffe274;
  box-shadow: 0 2px 8px rgb(23 33 58 / 10%);
}

.game-phone__coupon-wallet i { font-size: 24px; }
.game-phone__coupon-wallet div { display: grid; gap: 2px; }
.game-phone__coupon-wallet small { line-height: 1.2; }
.game-phone__coupon-wallet > b { font-size: 18px; }

.game-phone__stocks { display: grid; height: calc(100% - 43px); min-height: 0; box-sizing: border-box; align-content: start; gap: 12px; padding: 12px; overflow-y: auto; overscroll-behavior: contain; }
.game-phone__stock-card { border: 1px solid rgb(23 33 58 / 16%); border-radius: 16px; background: #fffaf0; padding: 12px; box-shadow: 0 2px 8px rgb(23 33 58 / 10%); display: grid; gap: 9px; }
.game-phone__stock-heading { display: flex; justify-content: space-between; gap: 10px; }
.game-phone__stock-heading > span { display: grid; gap: 2px; }
.game-phone__stock-heading > span:last-child { text-align: right; }
.game-phone__stock-heading small { font-size: 0.72rem; }
.game-phone__stock-heading .is-gain { color: #168a46; }
.game-phone__stock-heading .is-loss { color: #d53535; }
.game-phone__stock-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.game-phone__stock-actions button { border: 1px solid rgb(23 33 58 / 16%); border-radius: 10px; background: #ffd43b; color: #14213d; font: inherit; font-weight: 900; padding: 9px; }
.game-phone__stock-actions button:last-child { background: #e8f1ff; }
.game-phone__stock-actions button:disabled { opacity: 0.38; }

.game-phone__rental-card { display:grid; gap:8px; margin:10px 0; padding:12px; border:1px solid rgb(23 33 58 / 16%); border-radius:14px; background:#fffaf0; box-shadow:0 2px 8px rgb(23 33 58 / 10%); }
.game-phone__rental-card input,.game-phone__rental-card button { min-height:38px; border:1px solid rgb(23 33 58 / 16%); border-radius:9px; padding:7px; font:inherit; }
.game-phone__rental-card button { background:#ffd43b; font-weight:800; }
.game-phone__rental-actions { display:grid; gap:6px; }
.game-phone__market-explanation { margin: 0; font-size: 12px; line-height: 1.5; }
.game-phone__stock-card { min-width: 0; overflow-wrap: anywhere; }
.game-phone__stock-actions button { white-space: normal; min-width: 0; }

.game-phone__bank-form textarea { width:100%; box-sizing:border-box; resize:vertical; min-height:72px; font:inherit; }
.game-phone__social-error { display:block; margin:8px 0; color:#b42318; font-weight:700; }
.game-phone__player-conversations { margin:10px 0; }
.game-phone__message-bubble--sent { margin-left:18px; background:#dff7e8; }
.game-phone__place-ad {
  display: grid;
  gap: 14px;
  padding: 16px;
  min-width: 0;
  box-sizing: border-box;
}
.game-phone__place-ad-form {
  display: grid;
  gap: 12px;
}
.game-phone__place-ad-form label {
  display: grid;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
}
.game-phone__place-ad-form input,
.game-phone__place-ad-form select {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid rgb(17 24 39 / 18%);
  border-radius: 10px;
  padding: 10px;
  background: #fff;
  color: #111827;
  font: inherit;
}
.game-phone__place-ad-form button {
  min-height: 42px;
  border: 0;
  border-radius: 10px;
  background: #111827;
  color: #fff;
  font-weight: 800;
}
.game-phone__place-ad-form button:disabled { opacity: .45; }
.game-phone__place-ad-preview {
  display: grid;
  gap: 6px;
  padding: 8px;
  border: 1px solid rgb(17 24 39 / 18%);
  border-radius: 10px;
  background: #fff;
}
.game-phone__place-ad-preview img {
  width: 100%;
  max-height: 150px;
  object-fit: contain;
  background: #fff;
  border: 2px solid #111;
}
.game-phone__place-ad-price,
.game-phone__place-ad-times {
  display: grid;
  gap: 4px;
  padding: 10px;
  border-radius: 10px;
  background: rgb(17 24 39 / 6%);
}
.game-phone__place-ad-price {
  grid-template-columns: 1fr auto;
  align-items: center;
}
.game-phone__place-ad-feedback { margin: 0; font-size: 12px; line-height: 1.4; }
.game-phone__place-ad-times span { font-size: 12px; line-height: 1.5; }


.game-phone__review-lock {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin: 0.35rem 0.55rem 0;
  padding: 0.45rem 0.55rem;
  border: 1px solid currentColor;
  border-radius: 0.55rem;
  font-size: 0.68rem;
  line-height: 1.25;
  font-weight: 700;
}
</style>


