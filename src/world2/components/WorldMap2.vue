<script setup>
import { advanceIntoxication, intoxicationSteering } from '../../player/systems/intoxication.js';
import { migrateLocationLabels } from "../../game/migrateLocationLabels.js";
import { createCrimeState, restoreCrimeState, addCrime } from "../../police/policeSystem.js";
import { calculateNetWorth } from "../../wealth/netWorth.js";
import wealthCatalogue from "../../wealth/catalogue.json";
import { STARTER_HOMES } from '../../property/data/starterHomes.js';
import { createCustomizationState, restoreCustomizationState, applyCustomization } from '../../customization/state.js';
import { drawCustomizedVehicle } from '../../customization/rendering.js';
import {
  computed,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from "vue";
import { drawVehicleGroundShadow, createDanfoBodyMotion, updateDanfoBodyMotion } from "../../player/systems/vehicleVisuals.js";
import { clearSaveSlot, getSaveStorageKey } from "../../game/saveSlots.js";

import playerDanfoSpriteUrl from "../../assets/vehicles/player-danfo.png";
import asphaltTileUrl from "../../assets/roads/asphalt-tile.png";
import untarredRoadTileUrl from "../../assets/roads/untarred-road-tile.png";
import busStopCanopyUrl from "../../assets/world/bus-stop-canopy.png";
import grassTileUrl from "../../assets/ground/grass-tile.png";
import trafficLightConcreteUrl from "../../assets/ground/traffic-light-concrete.png";
import parkingBayTileUrl from "../../assets/roads/parking-bay-tile.png";
import beachSandTileUrl from "../../assets/ground/coast/beach-sand-tile.png";
import beachPropUmbrellaLoungersUrl from "../../assets/ground/coast/beach-prop-umbrella-loungers.png";
import beachPropSocialUrl from "../../assets/ground/coast/beach-prop-social.png";
import beachPropSurfUrl from "../../assets/ground/coast/beach-prop-surf.png";
import beachPropKioskUrl from "../../assets/ground/coast/beach-prop-kiosk.png";
import shorelineTransitionTileUrl from "../../assets/ground/coast/shoreline-transition-tile.png";
import { getCameraDimensions, GRID_COLUMNS, GRID_ROWS, GRID_SIZE, WORLD_HEIGHT, WORLD_MAX_X, WORLD_MAX_Y, WORLD_MIN_X, WORLD_MIN_Y, WORLD_WIDTH } from "../data/mapConstants";

import {
  buildings,
  barriers,
  beachParkingZones,
  beachRoadDivider,
  beachTiles,
  busStops,
  bankParkingZones,
  businessOfficeParkingZones,
  dealershipParkingZones,
  estateAgencyParkingZones,
  districts,
  edgeBorderTiles,
  foodParkingZones,
  fuelPumps,
  getDistrictAtWorldPosition,
  homeParkingZones,
  healthParkingZones,
  landmarks,
  mapTravelZones,
  obstacles,
  playerStart,
  repairZones,
  raceZones,
  roads,
  trafficLightConcretePads,
  waterTiles,
  WORLD2_TRAFFIC_SPAWN_POINTS,
} from "../data/worldMap";


import { PLAYER_DANFO } from "../../player/data/playerDanfo";
import {
  getPlayerVehicleConfig,
  PURCHASABLE_CARS,
} from "../../player/data/purchasableCars.js";
import {
  createPlayerVehicle,
  getVehicleCollisionBox,
  getVehicleCollisionShape,
  getVehicleGearLabel,
  getVehicleSpeedKmh,
  shiftGearDown,
  shiftGearUp,
  updatePlayerVehicle,
} from "../../player/systems/playerVehicle";
import VehicleHud from "../../hud/components/VehicleHud.vue";
import PlayerStatusHud from "../../hud/components/PlayerStatusHud.vue";
import RouteHud from "../../danfo/components/RouteHud.vue";
import RouteNavigationHud from "../../hud/components/RouteNavigationHud.vue";
import PassengerOccupancyHud from "../../hud/components/PassengerOccupancyHud.vue";
import { hudPreferences } from "../../hud/hudPreferences.js";
import GamePhone from "../../phone/components/GamePhone.vue";
import {
  createPhoneCallSchedulerState,
  queuePhoneCall,
  resolvePhoneCall,
  updatePhoneCallScheduler,
} from "../../phone/systems/phoneCallScheduler.js";
import CharacterEncounter from "../../characters/components/CharacterEncounter.vue";
import { CHARACTER_DEFINITIONS } from "../../characters/data/characters.js";
import {
  closeMutiuIntroduction,
  createMutiuEncounterState,
  hasCompletedMutiuRaceOnDay,
  markMutiuRaceCompleted,
  raceOfferedOnDay,
  isMutiuGuaranteedCallWindow,
  resolveMutiuInvitation,
  updateMutiuEncounter,
} from "../../characters/systems/mutiuEncounter.js";
import FoodPurchaseModal from "../../player/components/FoodPurchaseModal.vue";
import HealthTreatmentModal from "../../player/components/HealthTreatmentModal.vue";
import SleepModal from "../../player/components/SleepModal.vue";
import EnergyDepletedModal from "../../player/components/EnergyDepletedModal.vue";
import DanfoGameOver from "../../economy/components/DanfoGameOver.vue";
import EconomyFeedback from "../../economy/components/EconomyFeedback.vue";
import EconomyServicePrompt from "../../economy/components/EconomyServicePrompt.vue";
import FuelPurchaseModal from "../../economy/components/FuelPurchaseModal.vue";
import BankServicesModal from "../../economy/components/BankServicesModal.vue";
import {
  createBankSavingsState,
  depositIntoSavings,
  processBankSavingsDay,
  restoreBankSavingsState,
  withdrawFromSavings,
  withdrawSavingsForExpense,
} from "../../economy/systems/bankSavings.js";
import {
  recordStockTransaction,
  recordMarketActivity,
  sampleMarketDeposits,
  subscribeStockAdviser,
  cancelStockAdviser,
  buyStock,
  createStockMarketState,
  getStockMarketView,
  restoreStockMarketState,
  sellStock,
  updateStockMarketForDay,
} from "../../economy/systems/stockMarket.js";
import { observeTransactions, createMarketReceiptId } from "../../economy/systems/transactionObservers.js";
import CarDealershipModal from "../../economy/components/CarDealershipModal.vue";
import EstateAgencyModal from "../../property/components/EstateAgencyModal.vue";
import { PROPERTY_CATALOGUE } from "../../property/data/properties.js";
import {
  createPropertyState,
  getHomeSleepMultiplier,
  processPropertyMortgageDay,
  purchaseProperty,
  restorePropertyState,
} from "../../property/systems/propertySystem.js";
import {
  handleLateTenant,
  listOwnedHome,
  processRentalDay,
  removeVacantListing,
} from "../../property/systems/propertyRentalSystem.js";
import BusinessOfficeModal from "../../business/components/BusinessOfficeModal.vue";
import {
  createBusinessState,
  getBusinessSummary,
  processBusinessDay,
  purchaseBusinessAsset,
  purchaseBusinessOffice,
  restoreBusinessState,
} from "../../business/systems/businessSystem.js";
import RaceCircuitModal from "../../racing/components/RaceCircuitModal.vue";
import { COASTAL_CIRCUIT } from "../../racing/data/raceCircuit.js";
import {
  MUTIU_STREET_RACE,
  isMutiuRaceNight,
} from "../../racing/data/illegalStreetRace.js";
import {
  cancelRace,
  createRaceState,
  restoreRaceState,
  startRace,
  updateRace,
} from "../../racing/systems/raceSystem.js";
import {
  createIllegalStreetRaceState,
  getIllegalStreetRaceLivePlace,
  resetIllegalStreetRace,
  startIllegalStreetRace,
  updateIllegalStreetRace,
} from "../../racing/systems/illegalStreetRaceSystem.js";
import { DANFO_ECONOMY_CONFIG } from "../../economy/data/danfoEconomyConfig.js";
import {
  addPassengerFare,
  addMotoEaziFare,
  addEmergencyBankLoan,
  chargeAgberoPickup,
  borrowBankLoan,
  borrowQuickLoan,
  chargeExpense,
  clearLastRouteBonus,
  creditIncome,
  createDanfoEconomyState,
  getRepairPurchaseCost,
  normaliseLoanState,
  offerBankLoan,
  processDailyBrtTax,
  processDailyGarageFees,
  purchaseFuel,
  purchasePlayerVehicle,
  purchaseRepairs,
  repayBankLoan,
  updateEconomyFeedback,
} from "../../economy/systems/danfoEconomy.js";
import {
  advanceDriverLicenceTest,
  beginDriverLicenceTest,
  createDriverLicenceState,
  recordDriverLicenceCollision,
  recordDriverLicenceTrafficViolation,
  restoreDriverLicenceState,
} from "../../player/systems/driverLicense.js";
import {
  getRoadsideFuelQuote,
} from "../../economy/systems/roadsideAssistance.js";
import {
  clearOutstandingFines,
  createFineState,
  issueOutstandingFine,
} from "../../economy/systems/fineSystem.js";
import {
  FOOD_ITEMS,
  PLAYER_STATUS_CONFIG,
} from "../../player/data/playerStatus.js";
import {
  applyCollisionHealthLoss,
  consumeFood,
  createPlayerStatusState,
  getAbsoluteGameMinute,
  restoreEnergyFromSleep,
  restorePlayerHealth,
  updatePlayerEnergy,
} from "../../player/systems/playerStatus.js";
import {
  addInventoryItem,
  consumeInventoryItem,
  createPlayerInventoryState,
} from "../../player/systems/playerInventory.js";
import {
  BRT_PASSENGER_CONFIG,
  getBrtRouteSalary,
  PLAYER_BRT,
} from "../../employment/data/brtEmployment.js";
import AgberoPaymentToast from "../../danfo/components/AgberoPaymentToast.vue";
import PassengerFeedback from "../../danfo/components/PassengerFeedback.vue";
import RouteComplete from "../../danfo/components/RouteComplete.vue";
import { DANFO_PASSENGER_CONFIG } from "../../danfo/data/danfoPassengerConfig.js";
import {
  DANFO_ROUTE_CONFIG,
} from "../../danfo/data/danfoRoutes.js";
import {
  COAST_CITY_BRT_ROUTES,
  COAST_CITY_DANFO_ROUTES,
  pickRandomCoastCityDanfoRoutes,
} from "../data/transitRoutes.js";
import {
  createDanfoRouteState,
  getCurrentRouteStop,
  getFollowingRouteStop,
  getSelectedRoute,
  getStopCentre,
  getStopHoldProgress,
  isInsideStopZone,
  returnToRouteSelection,
  selectDanfoRoute,
  updateDanfoRoute,
} from "../../danfo/systems/danfoRoute.js";
import {
  clearDanfoPassengerRoute,
  createDanfoPassengerState,
  processDanfoStop,
  startDanfoPassengerRoute,
  updatePassengerFeedback,
} from "../../danfo/systems/danfoPassengers.js";
import { GAME_TIME_CONFIG } from "../../time/data/gameTimeConfig.js";
import {
  createGameClock,
  formatGameTime,
  getTrafficPeriod,
  updateGameClock,
} from "../../time/systems/gameClock.js";
import TrafficLight from "../../population/components/TrafficLight.vue";
import HighwayLight from "../../population/components/HighwayLight.vue";
import {
  WORLD2_POPULATION_ROUTES,
  WORLD2_ROUTE_PROPOSALS,
} from "../data/populationRoutes.js";
import {
  POPULATION_TRAFFIC_CONFIG,
  POPULATION_VEHICLE_TYPES,
} from "../../population/data/populationVehicles.js";
import {
  TOW_TRUCK_ASSETS,
  TOW_TRUCK_CONFIG,
} from "../../population/data/towTrucks.js";
import {
  TOW_TRUCK_BASES,
} from "../../traffic/towParking/towTruckParkingBases.js";
import {
  ALL_SIGNAL_LIGHTS,
  HIGHWAY_LIGHT_CONFIG,
  HIGHWAY_LIGHTS,
  TRAFFIC_LIGHT_CONFIG,
  TRAFFIC_LIGHTS,
} from "../data/trafficLights.js";
import {
  createPopulationTrafficState,
  getPopulationVehicleCollisionBox,
  getPopulationVehicleCollisionShape,
  populationTrafficStateOverlaps,
  seedPopulationTraffic,
  updatePopulationTraffic,
} from "../../population/systems/populationTraffic.js";
import {
  createTrafficLightState,
  getTrafficLightSignal,
  updateTrafficLights,
} from "../../population/systems/trafficLightSystem.js";
import {
  createHighwayLightState,
  getHighwayLightSignal,
  updateHighwayLights,
} from "../../population/systems/highwayLightSystem.js";
import {
  createTowTruckState,
  reportViewportTraffic,
  updateTowTrucks,
} from "../../population/systems/towTruckSystem.js";
import {
  canVehicleOccupy,
  findObstacleCollision,
  getSolidVehicleBounds,
  rebuildObstacleSpatialIndex,
} from "../systems/worldCollision";
import { MOTO_EAZI_LOCATIONS } from "../data/motoEaziLocations.js";
import { MOTO_EAZI_REQUESTS } from "../data/motoEaziRequests.js";
import {
  acceptMotoEaziRequest,
  createMotoEaziState,
  getMotoEaziTarget,
  rejectMotoEaziRequest,
  recordMotoEaziCollision,
  restoreMotoEaziState,
  updateMotoEaziJob,
  updateMotoEaziOffers,
  waitForMotoEaziRequest,
} from "../../motoEazi/systems/motoEaziJobs.js";
import {
  disposePlayerVehicleAudio,
  getPlayerVehicleAudioSettings,
  isPlayerVehicleEngineStarted,
  isPlayerVehicleEngineStarting,
  playAiVehicleHorn,
  playPlayerVehicleHitSound,
  playPlayerVehicleHorn,
  requestPlayerVehicleEngineStart,
  setPlayerVehicleAudioSettings,
  stopPlayerVehicleEngine,
  updatePlayerVehicleEngineSound,
} from "../../audio/vehicleAudio.js";
import {
  drawManualDestinationWorldMarker,
  drawMotoEaziWorldMarker,
} from "../../navigation/systems/worldDestinationMarkers.js";
import { refreshMusicVolume } from "../../audio/musicPlayer.js";
import {
  playGameSound,
  playGameSoundSequence,
} from "../../audio/gameAudio.js";
import {
  OBJECTIVE_CATEGORIES,
  OBJECTIVE_DEFINITIONS,
} from "../../progression/data/objectives.js";
import {
  claimObjectiveReward,
  createObjectiveState,
  getObjectiveViews,
  recordObjectiveEvent,
  restoreObjectiveState,
  setTrackedObjective,
  updateObjectiveDeadlines,
} from "../../progression/systems/objectiveSystem.js";
import {
  createDailyQuestState,
  getDailyQuestViews,
  recordDailyQuestEvent,
  restoreDailyQuestState,
  syncDailyQuestDay,
} from "../../dailyQuests/systems/dailyQuestSystem.js";
import {
  LIFE_OBLIGATION_CONFIG,
} from "../../life/data/lifeObligations.js";
import {
  activateSchoolFees,
  createLifeObligationState,
  getLifeObligationView,
  payFamilyRequest,
  paySchoolFees,
  payWeeklyRent,
  processLifeObligationDay,
  restoreLifeObligationState,
  endWeeklyRent,
} from "../../life/systems/lifeObligations.js";
import {
  getRenderPixelRatioLimit,
  performanceSettings,
} from "../../performance/performanceSettings.js";
import {
  createPerformanceMonitor,
  recordPerformanceFrame,
} from "../../performance/performanceMonitor.js";

const props = defineProps({
  phoneVisible: { type: Boolean, default: true },
  paused: {
    type: Boolean,
    default: false,
  },
  vehicleSnapshot: {
    type: Object,
    default: null,
  },
  startRace: {
    type: Boolean,
    default: false,
  },
});
const emit = defineEmits(["return-mainland"]);

const canvasReference = ref(null);
const showGrid = ref(false);
const observerMode = ref(false);
const currentMapId = ref("coastal-city");
const worldTransition = reactive({
  active: false,
  remainingSeconds: 0,
  totalSeconds: 10,
  label: "",
  eyebrow: "TRAVELLING",
  message: "Preparing Coast City",
});
let worldTransitionTimer = null;
let worldTransitionCompletion = null;
const observerPanSpeed = 900;
const RENDER_MARGIN = GRID_SIZE * 2;
const STATIC_MAP_TILE_SIZE = GRID_SIZE * 8;
const STATIC_MAP_TILE_LIMIT = 12;
const TRAFFIC_SIMULATION_STEP = 1 / 30;
const showCollisionSpace = computed(() => showGrid.value);
const initialAudioSettings = getPlayerVehicleAudioSettings();
const soundVolume = ref(initialAudioSettings.volume);
const soundMuted = ref(initialAudioSettings.muted);
const MAINLAND_MAP_DATA = {
  id: "mainland",
  name: "Mainland Lagos",
  districts: [...districts],
  roads: [...roads],
  barriers: [...barriers],
  beachParkingZones: [...beachParkingZones],
  landmarks: [...landmarks],
  buildings: [...buildings],
  obstacles: [...obstacles],
  busStops: [...busStops],
  fuelPumps: [...fuelPumps],
  repairZones: [...repairZones],
  raceZones: [...raceZones],
  bankParkingZones: [...bankParkingZones],
  dealershipParkingZones: [...dealershipParkingZones],
  estateAgencyParkingZones: [...estateAgencyParkingZones],
  businessOfficeParkingZones: [...businessOfficeParkingZones],
  homeParkingZones: [...homeParkingZones],
  healthParkingZones: [...healthParkingZones],
  foodParkingZones: [...foodParkingZones],
  mapTravelZones: [...mapTravelZones],
  playerStart: { ...playerStart },
};

const cameraDimensions = getCameraDimensions(window.matchMedia("(pointer: coarse)").matches);
let CAMERA_WIDTH = cameraDimensions.width;
let CAMERA_HEIGHT = cameraDimensions.height;

const camera = reactive({
  x: Math.max(
    0,
    playerStart.x - CAMERA_WIDTH / 2,
  ),

  y: Math.max(
    0,
    playerStart.y - CAMERA_HEIGHT / 2,
  ),
  previousX: Math.max(
    0,
    playerStart.x - CAMERA_WIDTH / 2,
  ),
  previousY: Math.max(
    0,
    playerStart.y - CAMERA_HEIGHT / 2,
  ),
});
const lightOverlayCamera = reactive({
  x: camera.x,
  y: camera.y,
});

const viewport = reactive({
  width: CAMERA_WIDTH,
  height: CAMERA_HEIGHT,
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  pixelRatio: 1,
});

const pressedKeys = new Set();
const danfoBodyMotion = createDanfoBodyMotion();
const touchMotionQuery = window.matchMedia("(pointer: coarse)");
const EMPTY_PLAYER_INPUT = new Set();
const player = reactive(
  createPlayerVehicle(playerStart, PLAYER_DANFO),
);
player.previousX = player.x;
player.previousY = player.y;
player.previousRotation = player.rotation;

const vehicleState = reactive({
  activeVehicleId: PLAYER_DANFO.id,
  lastDanfoDrivenDay: 0,
  lastBrtDrivenDay: 0,
});

const hudState = reactive({
  fuel: 100,
  damage: 0,
});
const vehicleConditionStates = reactive({
  [PLAYER_DANFO.id]: {
    fuel: 100,
    damage: 0,
    gearIndex: PLAYER_DANFO.startingGearIndex,
  },
  [PLAYER_BRT.id]: {
    fuel: 100,
    damage: 0,
    gearIndex: PLAYER_BRT.startingGearIndex,
  },
});

const playerStatus = reactive(
  createPlayerStatusState(PLAYER_STATUS_CONFIG),
);

const playerInventory = reactive(
  createPlayerInventoryState(),
);

const gameClock = reactive(
  createGameClock(GAME_TIME_CONFIG),
);
const mutiuEncounter = reactive(createMutiuEncounterState());
const bankColdCallVisible = ref(false);
const phoneCallState = reactive(createPhoneCallSchedulerState());

const routeState = reactive(
  createDanfoRouteState(),
);

const passengerState = reactive(
  createDanfoPassengerState(DANFO_PASSENGER_CONFIG),
);

const economyState = reactive(
  createDanfoEconomyState(
    DANFO_ECONOMY_CONFIG,
    gameClock.day,
  ),
);
const bankSavingsState = reactive(createBankSavingsState(gameClock.day));
const customizationState = reactive(createCustomizationState());
function handleCustomizeVehicle({ kind, id }) {
  const result = applyCustomization(customizationState, activeVehicleConfig.value.id, kind, id, economyState.money);
  if (!result.ok) return;
  if (result.price > 0) chargeExpense({ economyState, amount: result.price, type: 'vehicle-customization', label: result.label, config: DANFO_ECONOMY_CONFIG });
}
const agberoPayment = ref(null);
let agberoPaymentSequence = 0;
const stockMarketState = reactive(createStockMarketState());
const stockMarketView = computed(() => getStockMarketView(stockMarketState));
const bankMessageFeed = computed(() => {
  return [...bankSavingsState.messages, ...economyState.transactions].sort(
    (left, right) => Number(right.createdAt || 0) - Number(left.createdAt || 0),
  );
});

function processStockMarketUpdate() {
  sampleMarketDeposits(stockMarketState, gameClock.day, gameClock.minuteOfDay, bankSavingsState.balance);
  return updateStockMarketForDay(stockMarketState, gameClock.day, (amount) => {
    if (economyState.money < amount) return false;
    chargeExpense({ economyState, amount, type: "stock-adviser", label: "STOCK ADVISER AUTO RENEWAL - 7 DAYS", config: DANFO_ECONOMY_CONFIG });
    return true;
  });
}
function handleSubscribeStockAdviser() {
  const cost = subscribeStockAdviser(stockMarketState, gameClock.day, economyState.money);
  if (cost !== null) {
    if (cost > 0) chargeExpense({ economyState, amount: cost, type: "stock-adviser", label: "STOCK ADVISER - 7 DAYS", config: DANFO_ECONOMY_CONFIG });
    saveGame();
  }
}
function handleCancelStockAdviser() {
  cancelStockAdviser(stockMarketState, gameClock.day);
  saveGame();
}
function handleReadStockAdviser() {
  stockMarketState.adviser.readThrough = stockMarketState.adviser.nextId - 1;
}

const fineState = reactive(
  createFineState(DANFO_ECONOMY_CONFIG),
);
const driverLicenceState = reactive(
  createDriverLicenceState(),
);
const objectiveState = reactive(
  createObjectiveState(OBJECTIVE_DEFINITIONS),
);
const dailyQuestState = reactive(
  createDailyQuestState(gameClock.day),
);
const lifeObligationState = reactive(
  createLifeObligationState(LIFE_OBLIGATION_CONFIG),
);
const propertyState = reactive(createPropertyState());
const businessState = reactive(createBusinessState(gameClock.day));
const raceState = reactive(createRaceState());
const illegalStreetRaceState = reactive(
  createIllegalStreetRaceState(),
);
const illegalStreetRaceLivePlace = computed(() =>
  getIllegalStreetRaceLivePlace(illegalStreetRaceState, player),
);
let illegalStreetRaceResetTimer = null;
let illegalStreetRaceReturnSnapshot = null;
const routeCareerState = reactive({
  collisionDuringRoute: false,
  trafficViolationDuringRoute: false,
});
const activeObjectiveNotice = ref(null);
const coastalVisitFlags = reactive({
  circuit: false,
  coastRoad: false,
});
const playerBridgeState = reactive({
  bridgeId: null,
  elevation: 0,
  phase: "ground",
});
let objectiveNoticeTimer = null;

const objectiveViews = computed(() => {
  return getObjectiveViews(
    objectiveState,
    OBJECTIVE_DEFINITIONS,
  );
});

const dailyQuestViews = computed(() => {
  return getDailyQuestViews(dailyQuestState);
});

const trackedObjective = computed(() => {
  return objectiveViews.value.find((objective) => objective.tracked) ??
    objectiveViews.value.find((objective) => objective.status === "active") ??
    null;
});

const lifeObligationView = computed(() => {
  const view = getLifeObligationView(lifeObligationState);
  view.rent.daysUntilDue =
    lifeObligationState.rent.nextDueDay - gameClock.day;
  view.schoolFees.daysUntilDeadline =
    lifeObligationState.schoolFees.deadlineDay === null
      ? null
      : lifeObligationState.schoolFees.deadlineDay - gameClock.day;
  return view;
});
const businessView = computed(() => ({
  ...businessState,
  ...getBusinessSummary(businessState),
}));
const activePopulationRoutes = computed(() =>
  WORLD2_POPULATION_ROUTES,
);

function showObjectiveNotice(objectiveId) {
  const objective = objectiveViews.value.find((item) => {
    return item.id === objectiveId;
  });

  if (!objective) {
    return;
  }

  activeObjectiveNotice.value = {
    ...objective,
    noticeLabel:
      objectiveId === "new-arrival-sleep"
        ? "CHAPTER COMPLETE"
        : "OBJECTIVE COMPLETE",
  };
  playGameSound("confirm");

  if (objectiveNoticeTimer !== null) {
    window.clearTimeout(objectiveNoticeTimer);
  }

  objectiveNoticeTimer = window.setTimeout(() => {
    activeObjectiveNotice.value = null;
    objectiveNoticeTimer = null;
  }, 4200);
}

function handleObjectiveEvent(type, amount = 1) {
  const result = recordObjectiveEvent({
    state: objectiveState,
    definitions: OBJECTIVE_DEFINITIONS,
    type,
    amount,
    currentDay: gameClock.day,
  });

  result.completedIds.forEach(showObjectiveNotice);

  const completedDailyQuests = recordDailyQuestEvent(
    dailyQuestState,
    type,
    amount,
    gameClock.day,
  );
  completedDailyQuests.forEach((quest) => {
    const entry = dailyQuestState.entries.find((item) => item.id === quest.id);
    if (!entry || entry.rewardPaid) return;
    entry.rewardPaid = true;
    creditIncome({
      economyState,
      amount: quest.reward,
      type: "daily-quest-reward",
      label: `DAILY QUEST · ${quest.title}`,
      config: DANFO_ECONOMY_CONFIG,
    });
    activeObjectiveNotice.value = {
      title: quest.title,
      noticeLabel: "DAILY QUEST COMPLETE",
      reward: { money: quest.reward },
    };
    playGameSound("confirm");
    if (objectiveNoticeTimer !== null) {
      window.clearTimeout(objectiveNoticeTimer);
    }
    objectiveNoticeTimer = window.setTimeout(() => {
      activeObjectiveNotice.value = null;
      objectiveNoticeTimer = null;
    }, 4200);
  });

  if (
    result.completedIds.includes("new-arrival-sleep") &&
    activateSchoolFees({
      state: lifeObligationState,
      currentDay: gameClock.day,
      config: LIFE_OBLIGATION_CONFIG,
    })
  ) {
    handleObjectiveEvent("school-fees-requested");
  }
}

function processCurrentLifeObligations() {
  const events = processLifeObligationDay({
    state: lifeObligationState,
    currentDay: gameClock.day,
    config: LIFE_OBLIGATION_CONFIG,
  });

  events.forEach((type) => {
    if (type === "rent-reminder") {
      handleObjectiveEvent("rent-reminder");
      queuePhoneCall(
        phoneCallState,
        gameClock.day % 7 === 6
          ? "landlord-rent-saturday"
          : "landlord-rent-reminder",
        { priority: true },
      );
    } else if (
      type === "rent-grace" ||
      type === "rent-overdue"
    ) {
      queuePhoneCall(
        phoneCallState,
        "landlord-rent-reminder",
        { priority: true },
      );
    }
  });
}

function processCurrentPropertyMortgage() {
  const result = processPropertyMortgageDay({
    state: propertyState,
    currentDay: gameClock.day,
    availableMoney: economyState.money,
    availableSavings: bankSavingsState.balance,
  });
  if (!result) return;
  if (result.cashAmount > 0) {
    chargeExpense({ economyState, amount: result.cashAmount, type: "property-mortgage", label: "WEEKLY HOME MORTGAGE", config: DANFO_ECONOMY_CONFIG });
  }
  if (result.savingsAmount > 0) {
    withdrawSavingsForExpense(bankSavingsState, result.savingsAmount, "HOME MORTGAGE FROM SAVINGS");
  }
  if (result.type === "missed") {
    showPlayerWarning("mortgage", result.repossessed ? "HOME REPOSSESSED" : "MORTGAGE PAYMENT MISSED", result.repossessed ? "You have returned to the starter rental." : `10% penalty added · ${result.missedPayments}/5 missed payments`);
    if (result.repossessed) {
      lifeObligationState.rent.status = "current";
      lifeObligationState.rent.nextDueDay = gameClock.day + 7;
      lifeObligationState.rent.lateFee = 0;
      lifeObligationState.rent.missedPayments = 0;
    }
  }
}

function processCurrentRentalIncome() {
  processRentalDay(propertyState, gameClock.day).forEach((event) => {
    if (event.amount > 0) {
      creditIncome({ economyState, amount: event.amount, type: "property-rent", label: "PROPERTY RENT", config: DANFO_ECONOMY_CONFIG });
    }
  });
}

function handleRentalListing({ propertyId, weeklyRent }) {
  listOwnedHome({ propertyState, propertyId, weeklyRent, currentDay: gameClock.day });
}

function handleRentalRemoval(propertyId) {
  removeVacantListing(propertyState, propertyId, gameClock.day);
}

function handleLateRentalAction({ propertyId, action }) {
  handleLateTenant(propertyState, propertyId, action, gameClock.day);
}

function processCurrentBusinessIncome() {
  const result = processBusinessDay({
    state: businessState,
    currentDay: gameClock.day,
  });
  if (!result || (result.gross <= 0 && result.costs <= 0)) return;

  if (result.gross > 0) {
    creditIncome({
      economyState,
      amount: result.gross,
      type: "business-fleet-income",
      label: "TRANSPORT FLEET REVENUE",
      config: DANFO_ECONOMY_CONFIG,
    });
  }
  if (result.costs > 0) {
    chargeExpense({
      economyState,
      amount: result.costs,
      type: "business-operating-costs",
      label: "FLEET WAGES, FUEL & MAINTENANCE",
      config: DANFO_ECONOMY_CONFIG,
    });
  }
  if (result.profit > 0) {
    handleObjectiveEvent("business-profit-earned", result.profit);
  }
}

function handlePhoneObjectiveEvent(event) {
  if (event?.type) {
    handleObjectiveEvent(event.type, event.amount ?? 1);
  }
}

function recordHomeArrival() {
  if (
    nearbyHomeParking.value &&
    serviceSpeedAllowed.value
  ) {
    handleObjectiveEvent("home-arrived");
  }
}

function recordCoastalMapProgress() {
  if (currentMapId.value !== "coastal-city") return;

  if (
    !coastalVisitFlags.circuit &&
    player.x >= 26 * GRID_SIZE &&
    player.x <= 46 * GRID_SIZE &&
    player.y >= 2 * GRID_SIZE &&
    player.y <= 13 * GRID_SIZE
  ) {
    coastalVisitFlags.circuit = true;
    handleObjectiveEvent("coastal-circuit-visited");
  }

  if (
    !coastalVisitFlags.coastRoad &&
    player.x >= 54 * GRID_SIZE
  ) {
    coastalVisitFlags.coastRoad = true;
    handleObjectiveEvent("coastal-road-visited");
  }
}

function updatePlayerBridgeState() {
  if (currentMapId.value !== "coastal-city") {
    playerBridgeState.bridgeId = null;
    playerBridgeState.elevation = 0;
    playerBridgeState.phase = "ground";
    return;
  }

  const bridgeRoads = roads.filter((road) => road.type === "bridge");
  const rampLength = GRID_SIZE * 3;
  let activeBridge = bridgeRoads.find((bridge) => {
    return bridge.id === playerBridgeState.bridgeId;
  });

  if (!activeBridge) {
    activeBridge = bridgeRoads.find((bridge) => {
      const insideWidth =
        player.x >= bridge.x &&
        player.x <= bridge.x + bridge.width;
      const onNorthRamp =
        player.y >= bridge.y &&
        player.y <= bridge.y + rampLength;
      const onSouthRamp =
        player.y >= bridge.y + bridge.height - rampLength &&
        player.y <= bridge.y + bridge.height;
      return insideWidth && (onNorthRamp || onSouthRamp);
    });

    if (!activeBridge) {
      playerBridgeState.bridgeId = null;
      playerBridgeState.elevation = 0;
      playerBridgeState.phase = "ground";
      return;
    }
    playerBridgeState.bridgeId = activeBridge.id;
  }

  const insideBridge =
    player.x >= activeBridge.x &&
    player.x <= activeBridge.x + activeBridge.width &&
    player.y >= activeBridge.y &&
    player.y <= activeBridge.y + activeBridge.height;

  if (!insideBridge) {
    playerBridgeState.bridgeId = null;
    playerBridgeState.elevation = 0;
    playerBridgeState.phase = "ground";
    return;
  }

  const northRampEnd = activeBridge.y + rampLength;
  const southRampStart =
    activeBridge.y + activeBridge.height - rampLength;

  if (player.y < northRampEnd) {
    playerBridgeState.phase = "ramp";
    playerBridgeState.elevation = clamp(
      (player.y - activeBridge.y) / rampLength,
      0,
      1,
    );
  } else if (player.y > southRampStart) {
    playerBridgeState.phase = "ramp";
    playerBridgeState.elevation = clamp(
      (activeBridge.y + activeBridge.height - player.y) /
        rampLength,
      0,
      1,
    );
  } else {
    playerBridgeState.phase = "bridge";
    playerBridgeState.elevation = 1;
  }
}

function updateActiveRace(deltaSeconds) {
  const event = updateRace(
    raceState,
    { x: player.x, y: player.y },
    deltaSeconds,
  );
  if (!event) return;

  if (event.type === "checkpoint") {
    playGameSound("confirm");
    return;
  }

  creditIncome({
    economyState,
    amount: event.reward,
    type: "race-prize",
    label: `${event.tier.toUpperCase()} CIRCUIT PRIZE`,
    config: DANFO_ECONOMY_CONFIG,
  });
  handleObjectiveEvent("race-completed");
  if (event.tier === "gold") {
    handleObjectiveEvent("race-gold-earned");
  }
  playGameSound("routeComplete");
}

function streetRaceIsRunning() {
  return ["countdown", "active"].includes(
    illegalStreetRaceState.status,
  );
}

function clearWorldTrafficForStreetRace() {
  Object.assign(
    populationState,
    createPopulationTrafficState(),
  );
  towTruckState.trucks.splice(
    0,
    towTruckState.trucks.length,
  );
}

function restoreWorldTrafficAfterStreetRace() {
  Object.assign(
    populationState,
    createPopulationTrafficState(),
  );
  Object.assign(
    towTruckState,
    createTowTruckState(
      TOW_TRUCK_BASES,
      TOW_TRUCK_CONFIG,
    ),
  );
}

function beginMutiuStreetRace() {
  if (
    currentMapId.value !== "coastal-city" ||
    !isMutiuRaceNight(gameClock.minuteOfDay) ||
    hasCompletedMutiuRaceOnDay(gameClock.day)
  ) {
    return false;
  }

  window.clearTimeout(illegalStreetRaceResetTimer);
  illegalStreetRaceResetTimer = null;
  illegalStreetRaceReturnSnapshot = {
    world: "mainland",
    x: player.x,
    y: player.y,
    rotation: player.rotation,
    gearIndex: player.gearIndex,
    engineOn: isPlayerVehicleEngineStarted(),
  };
  pressedKeys.clear();
  activeServiceModal.value = null;
  clearDanfoPassengerRoute(passengerState);
  returnToRouteSelection(routeState);
  cancelRace(raceState);
  clearWorldTrafficForStreetRace();
  startIllegalStreetRace(illegalStreetRaceState);
  addCrime(crimeState, "racing");

  player.x = MUTIU_STREET_RACE.start.x;
  player.y = MUTIU_STREET_RACE.start.y;
  player.rotation = MUTIU_STREET_RACE.start.rotation;
  player.previousX = player.x;
  player.previousY = player.y;
  player.previousRotation = player.rotation;
  player.speed = 0;
  player.isParked = false;
  player.gearIndex =
    activeVehicleConfig.value.neutralGearIndex;
  centreCameraOnPlayer();
  stopPlayerVehicleEngine();
  playGameSound("confirm");
  return true;
}

function restorePlayerAfterMutiuRace() {
  const snapshot = illegalStreetRaceReturnSnapshot;
  illegalStreetRaceReturnSnapshot = null;

  if (!snapshot) return;

  if (snapshot.world === "mainland") {
    saveActiveVehicleCondition();
    emit("return-mainland", {
      id: activeVehicleConfig.value.id,
      fuel: hudState.fuel,
      damage: hudState.damage,
      gearIndex: snapshot.gearIndex,
      health: playerStatus.health,
      energy: playerStatus.energy,
      money: economyState.money,
      currentDay: gameClock.day,
      minuteOfDay: gameClock.minuteOfDay,
      ownedVehicleIds: [...economyState.ownedVehicleIds],
      economyState: JSON.parse(JSON.stringify(economyState)),
      bankSavingsState: JSON.parse(JSON.stringify(bankSavingsState)),
      stockMarketState: JSON.parse(JSON.stringify(stockMarketState)),
      travelCrimeState: { ...crimeState },
      travelPropertyState: JSON.parse(JSON.stringify(propertyState)),
      travelLifeState: JSON.parse(JSON.stringify(lifeObligationState)),
    customizationState: JSON.parse(JSON.stringify(customizationState)),
      towHome: true,
    });
    return;
  }

  player.x = snapshot.x;
  player.y = snapshot.y;
  player.rotation = snapshot.rotation;
  player.previousX = player.x;
  player.previousY = player.y;
  player.previousRotation = player.rotation;
  player.gearIndex = clamp(
    snapshot.gearIndex,
    0,
    activeVehicleConfig.value.gears.length - 1,
  );
  player.speed = 0;
  if (snapshot.engineOn) {
    startCurrentPlayerVehicle();
  } else {
    stopPlayerVehicleEngine();
  }
  centreCameraOnPlayer();
  saveActiveVehicleCondition();
}

function finishMutiuStreetRace(event) {
  player.speed = 0;

  if (event.reward > 0) {
    creditIncome({
      economyState,
      amount: event.reward,
      type: "illegal-race-prize",
      label: `MUTIU STREET RACE · PLACE ${event.place}`,
      config: DANFO_ECONOMY_CONFIG,
    });
  }

  markMutiuRaceCompleted(gameClock.day);
  handleObjectiveEvent("race-completed");
  if (event.place === 1) {
    handleObjectiveEvent("race-gold-earned");
  }
  playGameSound(
    event.place === 1 ? "routeComplete" : "confirm",
  );
  if (worldTransitionTimer !== null) {
    window.clearInterval(worldTransitionTimer);
  }
  worldTransition.active = true;
  worldTransition.eyebrow = "RACE COMPLETE";
  worldTransition.label = "Returning Home";
  worldTransition.message = "Loading your home";
  worldTransition.totalSeconds = 3;
  worldTransition.remainingSeconds = 3;
  const returnStartedAt = performance.now();
  worldTransitionTimer = window.setInterval(() => {
    const elapsedSeconds = (performance.now() - returnStartedAt) / 1000;
    worldTransition.remainingSeconds = Math.max(0, 3 - elapsedSeconds);
    if (elapsedSeconds < 3) return;
    window.clearInterval(worldTransitionTimer);
    worldTransitionTimer = null;
    resetIllegalStreetRace(illegalStreetRaceState);
    restoreWorldTrafficAfterStreetRace();
    restorePlayerAfterMutiuRace();
  }, 100);
}

function updateMutiuStreetRace(deltaSeconds) {
  const event = updateIllegalStreetRace(
    illegalStreetRaceState,
    player,
    deltaSeconds,
    activeVehicleConfig.value,
  );

  if (event?.type === "started") {
    playGameSound("confirm");
  } else if (event?.type === "complete") {
    finishMutiuStreetRace(event);
  }
}

function handleMutiuCall() {
  const minuteOfDay =
    ((gameClock.minuteOfDay % (24 * 60)) + 24 * 60) %
    (24 * 60);

  const isNight = minuteOfDay >= 18 * 60 || minuteOfDay < 6 * 60;

  if (
    isNight &&
    (raceOfferedOnDay(gameClock.day) || isMutiuGuaranteedCallWindow(gameClock.day, minuteOfDay)) &&
    !hasCompletedMutiuRaceOnDay(gameClock.day)
  ) {
    beginMutiuStreetRace();
  } else if (!isNight) {
    queuePhoneCall(
      phoneCallState,
      "mutiu-day-rejection",
      { priority: true },
    );
  } else {
    showPlayerWarning(
      "info",
      "NO RACE TONIGHT",
      "Mr-Wire has no race running tonight. Try another night.",
    );
  }
}

function closeMutiuEncounter() {
  closeMutiuIntroduction(mutiuEncounter);
  playGameSound("confirm");
}

function declineMutiuRaceInvitation() {
  resolveMutiuInvitation(mutiuEncounter, false, gameClock.day);
  playGameSound("confirm");
}

function acceptMutiuRaceInvitation() {
  resolveMutiuInvitation(mutiuEncounter, true, gameClock.day);
  beginMutiuStreetRace();
}

const PLAYER_WARNING_CONFIG = Object.freeze({
  fineAmount: 12000,
  health: 25,
  energy: PLAYER_STATUS_CONFIG.lowEnergyThreshold,
  displayMilliseconds: 5200,
});
const activePlayerWarning = ref(null);
const energyDepleted = ref(false);
let playerWarningTimer = null;

function showPlayerWarning(type, label, detail) {
  activePlayerWarning.value = {
    type,
    label,
    detail,
  };
  playGameSound("statusWarning");

  if (playerWarningTimer !== null) {
    window.clearTimeout(playerWarningTimer);
  }

  playerWarningTimer = window.setTimeout(() => {
    activePlayerWarning.value = null;
    playerWarningTimer = null;
  }, PLAYER_WARNING_CONFIG.displayMilliseconds);
}

watch(
  () => fineState.outstandingAmount,
  (amount, previousAmount = 0) => {
    if (
      amount >= PLAYER_WARNING_CONFIG.fineAmount &&
      previousAmount < PLAYER_WARNING_CONFIG.fineAmount
    ) {
      showPlayerWarning(
        "fine",
        "FINE WARNING",
        `Outstanding fines are now ₦${Math.round(amount).toLocaleString()}. At ₦${DANFO_ECONOMY_CONFIG.fineImpoundThreshold.toLocaleString()}, your vehicle will be impounded.`,
      );
      handleObjectiveEvent("high-fines");
    }

    if (
      amount >= DANFO_ECONOMY_CONFIG.fineImpoundThreshold &&
      previousAmount < DANFO_ECONOMY_CONFIG.fineImpoundThreshold
    ) {
      handleObjectiveEvent("vehicle-impounded");
    }
  },
);

watch(
  () => playerStatus.health,
  (health, previousHealth = PLAYER_STATUS_CONFIG.maximumHealth) => {
    if (
      health <= PLAYER_WARNING_CONFIG.health &&
      previousHealth > PLAYER_WARNING_CONFIG.health
    ) {
      showPlayerWarning(
        "health",
        "LOW HEALTH",
        `${Math.max(0, Math.round(health))}% remaining. Visit a clinic or call a doctor.`,
      );
      handleObjectiveEvent("low-health");
    }
  },
);

watch(
  () => playerStatus.energy,
  (energy, previousEnergy = PLAYER_STATUS_CONFIG.maximumEnergy) => {
    if (
      energy <= PLAYER_WARNING_CONFIG.energy &&
      previousEnergy > PLAYER_WARNING_CONFIG.energy
    ) {
      showPlayerWarning(
        "energy",
        "LOW ENERGY",
        `${Math.max(0, Math.round(energy))}% remaining. Eat or sleep before the engine shuts down.`,
      );
      handleObjectiveEvent("low-energy");
    }
    if (energy <= 0 && previousEnergy > 0) {
      handleEnergyDepleted();
    } else if (energy > 0) {
      energyDepleted.value = false;
    }
  },
);

watch(
  () => hudState.damage,
  (damage, previousDamage = 0) => {
    if (damage >= 50 && previousDamage < 50) {
      queuePhoneCall(
        phoneCallState,
        "mechanic-damage-50",
        { priority: true },
      );
    } else if (damage >= 25 && previousDamage < 25) {
      queuePhoneCall(
        phoneCallState,
        "mechanic-damage-25",
        { priority: true },
      );
    }

    if (damage >= 60 && previousDamage < 60) {
      handleObjectiveEvent("high-damage");
    }
  },
);

watch(
  () => mutiuEncounter.mode,
  (mode) => {
    if (mode === "incoming-call") {
      queuePhoneCall(
        phoneCallState,
        "mutiu-race-reminder",
        { priority: true },
      );
    }
  },
);

const playerNetWorth = computed(() => calculateNetWorth({ economyState, bankSavingsState, stockMarketState, propertyState, businessState }, wealthCatalogue));

const crimeState = reactive(createCrimeState());

const employmentState = reactive({
  selectedJob: null,
});

const sleepState = reactive({
  modalOpen: false,
  overlayVisible: false,
  overlayFading: false,
});

const populationState = reactive(
  createPopulationTrafficState(),
);
const towTruckState = reactive(
  createTowTruckState(TOW_TRUCK_BASES, TOW_TRUCK_CONFIG),
);

const trafficLightState = reactive(
  createTrafficLightState(),
);
const highwayLightState = reactive(
  createHighwayLightState(),
);

const motoEaziState = reactive(
  createMotoEaziState(),
);

const manualMapDestination = ref(null);
const activeServiceModal = ref(null);
const performanceMonitor = reactive(createPerformanceMonitor());
const performanceDisplay = reactive({
  fps: 60,
  frameMs: 16.7,
  simulationMs: 0,
  renderMs: 0,
  trafficScale: 1,
  activeVehicles: 0,
  visibleVehicles: 0,
  tileCacheMisses: 0,
});
const runtimeTrafficConfig = {
  ...POPULATION_TRAFFIC_CONFIG,
};

const activeVehicleConfig = computed(() => {
  return getPlayerVehicleConfig(vehicleState.activeVehicleId);
});

const activeVehicleMaximumSpeed = computed(() => {
  return Math.max(
    1,
    ...activeVehicleConfig.value.gears.map((gear) => {
      return Math.abs(gear.maxSpeed);
    }),
  );
});

const isDrivingDanfo = computed(() => {
  return vehicleState.activeVehicleId === PLAYER_DANFO.id;
});

const isDrivingBrt = computed(() => {
  return vehicleState.activeVehicleId === PLAYER_BRT.id;
});

const availableRoutes = computed(() => {
  return employmentState.selectedJob === "brt"
    ? COAST_CITY_BRT_ROUTES
    : COAST_CITY_DANFO_ROUTES;
});

const danfoRouteOffers = ref(
  pickRandomCoastCityDanfoRoutes(),
);

const offeredRoutes = computed(() => {
  return employmentState.selectedJob === "brt"
    ? COAST_CITY_BRT_ROUTES
    : danfoRouteOffers.value;
});

function refreshDanfoRouteOffers() {
  danfoRouteOffers.value =
    pickRandomCoastCityDanfoRoutes();
}

const activePassengerConfig = computed(() => {
  return employmentState.selectedJob === "brt"
    ? BRT_PASSENGER_CONFIG
    : DANFO_PASSENGER_CONFIG;
});

const displayedSpeed = computed(() => {
  return getVehicleSpeedKmh(player, activeVehicleConfig.value);
});

const displayedGear = computed(() => {
  return getVehicleGearLabel(player, activeVehicleConfig.value);
});

const displayedGameTime = computed(() => {
  return formatGameTime(gameClock.minuteOfDay);
});

const nightIntensity = computed(() => {
  const minute =
    ((gameClock.minuteOfDay % (24 * 60)) + 24 * 60) %
    (24 * 60);
  const maximumDarkness = 0.76;
  const dawnStart = 5 * 60;
  const dawnEnd = 6.5 * 60;
  const duskStart = 17.5 * 60;
  const duskEnd = 19.5 * 60;

  if (minute < dawnStart || minute >= duskEnd) {
    return maximumDarkness;
  }

  if (minute < dawnEnd) {
    const progress =
      (minute - dawnStart) / (dawnEnd - dawnStart);
    return maximumDarkness * (1 - smoothstep(progress));
  }

  if (minute >= duskStart) {
    const progress =
      (minute - duskStart) / (duskEnd - duskStart);
    return maximumDarkness * smoothstep(progress);
  }

  return 0;
});

const currentTrafficPeriod = computed(() => {
  return getTrafficPeriod(
    gameClock.minuteOfDay,
    GAME_TIME_CONFIG,
  );
});

const visibleTrafficLightHeads = computed(() => {
  const margin = RENDER_MARGIN * viewport.scale;
  const displayScale = clamp(
    viewport.scale,
    0.7,
    1.15,
  );

  return TRAFFIC_LIGHTS.flatMap((light) => {
    return light.approaches.flatMap((approach) => {
      if (approach.render === false) {
        return [];
      }

      const screenX =
        viewport.offsetX +
        (approach.signalX - lightOverlayCamera.x) * viewport.scale;

      const screenY =
        viewport.offsetY +
        (approach.signalY - lightOverlayCamera.y) * viewport.scale;

      if (
        screenX < -margin ||
        screenY < -margin ||
        screenX > viewport.width + margin ||
        screenY > viewport.height + margin
      ) {
        return [];
      }

      return [{
        id: `${light.id}-${approach.id}`,
        x: screenX,
        y: screenY,
        rotation: approach.rotation,
        scale: displayScale,
        label: light.label,
        signal: getTrafficLightSignal(
          light,
          approach,
          trafficLightState,
          TRAFFIC_LIGHT_CONFIG,
        ),
      }];
    });
  });
});

const visibleHighwayLightHeads = computed(() => {
  const margin = RENDER_MARGIN * viewport.scale;
  const displayScale = clamp(viewport.scale, 0.7, 1.15);
  return HIGHWAY_LIGHTS.flatMap((light) => {
    return light.approaches.flatMap((approach) => {
      if (approach.render === false) return [];
      const screenX = viewport.offsetX + (approach.signalX - lightOverlayCamera.x) * viewport.scale;
      const screenY = viewport.offsetY + (approach.signalY - lightOverlayCamera.y) * viewport.scale;
      if (screenX < -margin || screenY < -margin ||
          screenX > viewport.width + margin || screenY > viewport.height + margin) {
        return [];
      }
      return [{
        id: `${light.id}-${approach.id}`,
        x: screenX, y: screenY, rotation: approach.rotation, scale: displayScale,
        label: light.label,
        signal: getHighwayLightSignal(
          light, approach, highwayLightState, HIGHWAY_LIGHT_CONFIG,
        ),
      }];
    });
  });
});

const activeRoute = computed(() => {
  return getSelectedRoute(routeState, availableRoutes.value);
});

const activeRouteStop = computed(() => {
  return getCurrentRouteStop(
    routeState,
    availableRoutes.value,
    busStops,
  );
});

const navigationAngleDegrees = computed(() => {
  const target = navigationTarget.value;

  if (!target) {
    return 0;
  }

  return (
    Math.atan2(
      target.y - player.y,
      target.x - player.x,
    ) *
    180 /
    Math.PI
  );
});

const navigationDistanceMetres = computed(() => {
  const target = navigationTarget.value;

  if (!target) {
    return 0;
  }

  return (
    Math.hypot(target.x - player.x, target.y - player.y) /
    GRID_SIZE *
    100
  );
});

const motoEaziTarget = computed(() => {
  return getMotoEaziTarget(motoEaziState);
});

const driverLicenceTarget = computed(() => {
  if (driverLicenceState.testStatus !== "active") {
    return null;
  }
  const stopId =
    driverLicenceState.testStopIds[driverLicenceState.testStopIndex];
  const stop = busStops.find((item) => item.id === stopId);
  if (!stop) return null;
  return {
    ...getStopCentre(stop),
    label: `Driving test · ${stop.label}`,
    districtName: "Licence test",
  };
});

const navigationTarget = computed(() => {
  if (driverLicenceTarget.value) {
    return driverLicenceTarget.value;
  }

  if (motoEaziTarget.value) {
    return motoEaziTarget.value;
  }

  if (manualMapDestination.value) {
    return manualMapDestination.value;
  }

  if (routeState.status === "active" && activeRouteStop.value) {
    const centre = getStopCentre(activeRouteStop.value);
    return {
      ...centre,
      label: activeRouteStop.value.label,
      districtName: currentDistrict.value?.name ?? "",
    };
  }

  return null;
});

const followingRouteStop = computed(() => {
  return getFollowingRouteStop(
    routeState,
    availableRoutes.value,
    busStops,
  );
});

const completedRoute = computed(() => {
  return (
    availableRoutes.value.find(
      (route) => route.id === routeState.completedRouteId,
    ) ?? null
  );
});

const stopHoldProgress = computed(() => {
  return getStopHoldProgress(
    routeState,
    DANFO_ROUTE_CONFIG,
  );
});

const currentTaskPresentation = computed(() => {
  const objective = trackedObjective.value;

  if (!objective) {
    return {
      chapter: "Progression",
      label: "All current goals complete",
      detail: "Open Goals to review completed objectives.",
      step: 1,
      totalSteps: 1,
      progress: 1,
    };
  }

  return {
    chapter: objective.chapter,
    label: objective.title,
    detail: objective.description,
    step: Math.min(objective.progress, objective.target),
    totalSteps: objective.target,
    progress: objective.progressRatio,
  };
});

const isInsideActiveStop = computed(() => {
  return isInsideStopZone(
    player,
    activeRouteStop.value,
    DANFO_ROUTE_CONFIG.stopDetectionRadius,
  );
});

const isStopSpeedAllowed = computed(() => {
  return (
    displayedSpeed.value <=
    DANFO_ROUTE_CONFIG.maximumStopSpeedKmh
  );
});

const occupiedSeatCount = computed(() => {
  return passengerState.onboard.length;
});





const nearbyFuelPump = computed(() => {
  return fuelPumps.find((fuelPump) => {
    return isPlayerInsideZone(fuelPump);
  }) ?? null;
});

const roadsideFuelQuote = computed(() => {
  return getRoadsideFuelQuote({
    player,
    fuelPumps,
    fallbackPosition: playerStart,
    currentFuel: hudState.fuel,
    gridSize: GRID_SIZE,
    config: DANFO_ECONOMY_CONFIG,
  });
});

const nearbyRepairService = computed(() => {
  return repairZones.find((repairZone) => {
    return isPlayerInsideZone(repairZone);
  }) ?? null;
});

const nearbyBankParking = computed(() => {
  return bankParkingZones.find((parkingZone) => {
    return isPlayerInsideZone(parkingZone);
  }) ?? null;
});

const activeHomeParkingId = computed(() => propertyState.activeHomeId === 'starter-rental' ? (propertyState.starterHomeId ?? 'starter-rental') : propertyState.activeHomeId);
const nearbyAnyHomeParking = computed(() => {
  return homeParkingZones.find((parkingZone) => {
    return isPlayerInsideZone(parkingZone);
  }) ?? null;
});

const nearbyHomeParking = computed(() => {
  const parkingZone = nearbyAnyHomeParking.value;
  if (!parkingZone) return null;
  return (parkingZone.homeId ?? "starter-rental") === activeHomeParkingId.value
    ? parkingZone
    : null;
});

const activeHomeParkingZone = computed(() => {
  return homeParkingZones.find((parkingZone) => {
    return (parkingZone.homeId ?? "starter-rental") === activeHomeParkingId.value;
  }) ?? null;
});

const canMoveToOwnedHome = computed(() => {
  const parkingZone = nearbyAnyHomeParking.value;
  return Boolean(
    parkingZone &&
    (parkingZone.homeId ?? "starter-rental") === (propertyState.starterHomeId ?? "starter-rental") &&
    propertyState.activeHomeId !== "starter-rental" &&
    activeHomeParkingZone.value,
  );
});

const activeHomeName = computed(() => {
  if (propertyState.activeHomeId === 'starter-rental' && propertyState.starterHomeId) return STARTER_HOMES.find(home => home.id === propertyState.starterHomeId)?.name ?? 'Your room';
  return PROPERTY_CATALOGUE.find((property) => {
    return property.id === propertyState.activeHomeId;
  })?.name ?? "new home";
});

const nearbyDealership = computed(() => {
  return dealershipParkingZones.find((parkingZone) => {
    return isPlayerInsideZone(parkingZone);
  }) ?? null;
});

const nearbyEstateAgency = computed(() => {
  return estateAgencyParkingZones.find((parkingZone) => {
    return isPlayerInsideZone(parkingZone);
  }) ?? null;
});

const nearbyBusinessOffice = computed(() => {
  return businessOfficeParkingZones.find((parkingZone) => {
    return isPlayerInsideZone(parkingZone);
  }) ?? null;
});

const nearbyMapTravel = computed(() => {
  return mapTravelZones.find((travelZone) => {
    return isPlayerInsideZone(travelZone);
  }) ?? null;
});
const nearbyRaceCircuit = computed(() => {
  return raceZones.find((raceZone) => {
    return isPlayerInsideZone(raceZone);
  }) ?? null;
});

const nearbyHealthService = computed(() => {
  return healthParkingZones.find((parkingZone) => {
    return isPlayerInsideZone(parkingZone);
  }) ?? null;
});

const nearbyFoodService = computed(() => {
  return foodParkingZones.find((parkingZone) => {
    return isPlayerInsideZone(parkingZone);
  }) ?? null;
});

const availableFoodItems = computed(() => {
  const sellerType = nearbyFoodService.value?.sellerType;

  if (!sellerType) {
    return [];
  }

  return FOOD_ITEMS.filter((item) => {
    return item.sellers.includes(sellerType);
  });
});

const inventoryItems = computed(() => {
  return FOOD_ITEMS
    .map((item) => ({
      ...item,
      quantity: playerInventory.items[item.id] ?? 0,
    }))
    .filter((item) => item.quantity > 0);
});
const equippedFoodId = ref(null);
const equippedFoodItem = computed(() => {
  return inventoryItems.value.find((item) => {
    return item.id === equippedFoodId.value;
  }) ?? null;
});

watch(
  inventoryItems,
  (items) => {
    if (!items.some((item) => item.id === equippedFoodId.value)) {
      equippedFoodId.value = items[0]?.id ?? null;
    }
  },
  { immediate: true },
);

const treatmentCost = computed(() => {
  return nearbyHealthService.value?.providerType === "private-clinic"
    ? PLAYER_STATUS_CONFIG.privateClinicCost
    : PLAYER_STATUS_CONFIG.publicHospitalCost;
});

const fatigueStrength = computed(() => {
  if (playerStatus.energy >= PLAYER_STATUS_CONFIG.lowEnergyThreshold) {
    return 0;
  }

  return clamp(
    1 - playerStatus.energy / PLAYER_STATUS_CONFIG.lowEnergyThreshold,
    0,
    1,
  );
});

const serviceSpeedAllowed = computed(() => {
  return displayedSpeed.value <= DANFO_ECONOMY_CONFIG.maximumServiceSpeedKmh;
});

const repairPurchaseCost = computed(() => {
  return getRepairPurchaseCost(
    hudState.damage,
    DANFO_ECONOMY_CONFIG,
  );
});

const mobileRepairCost = computed(() => {
  const repairCost = repairPurchaseCost.value;

  return repairCost > 0
    ? repairCost +
      DANFO_ECONOMY_CONFIG.mechanicCalloutFee
    : 0;
});

const currentDistrict = computed(() => {
  return getDistrictAtWorldPosition(
    player.x,
    player.y,
  );
});

const currentGridCell = computed(() => ({
  x: Math.floor(player.x / GRID_SIZE),
  y: Math.floor(player.y / GRID_SIZE),
}));

let animationFrameId = null;
let trafficUpdateErrorLogged = false;
let resizeObserver = null;
let previousTimestamp = 0;
let simulationAccumulator = 0;
let trafficSimulationAccumulator = 0;
let renderInterpolationAlpha = 1;
let trafficRenderInterpolationAlpha = 1;
const FIXED_SIMULATION_STEP = 1 / 60;
const MAX_FRAME_DELTA_SECONDS = 0.1;
const MAX_SIMULATION_STEPS_PER_FRAME = 6;
let currentServiceZoneId = null;
let playerTrafficCollisionDetected = false;
let trafficCollisionFineActive = false;
let motoEaziCollisionActive = false;
let homeParkingProcessed = false;
let sleepWarmupTimer = null;
let sleepFadeTimer = null;
let playerDanfoSprite = null;
let asphaltTileImage = null;
let untarredRoadTileImage = null;
let busStopCanopyImage = null;
let grassTileImage = null;
let trafficLightConcreteImage = null;
let parkingBayTileImage = null;
let beachSandTileImage = null;
const beachPropImages = [null, null, null, null];
let shorelineTransitionTileImage = null;
let towTruckSpriteImage = null;
let towYardTileImage = null;
const purchasedVehicleSprites = new Map();
const AI_HORN_AUDIBLE_RADIUS = CAMERA_WIDTH * 0.9;
const AI_HORN_AUDIBLE_RADIUS_SQUARED =
  AI_HORN_AUDIBLE_RADIUS * AI_HORN_AUDIBLE_RADIUS;

function randomHornDelay(minimum, maximum) {
  return minimum + Math.random() * (maximum - minimum);
}

function requestNearbyAiHorn(vehicle, urgency = 0) {
  const distance = Math.hypot(
    vehicle.x - player.x,
    vehicle.y - player.y,
  );

  if (distance > AI_HORN_AUDIBLE_RADIUS) {
    return false;
  }

  const distanceVolume =
    1 - distance / AI_HORN_AUDIBLE_RADIUS;

  return playAiVehicleHorn({
    volume: 0.035 + distanceVolume * 0.045 + urgency * 0.01,
    playbackRate: 0.94 + Math.random() * 0.12,
  });
}

function updateAiTrafficHorns(deltaSeconds) {
  for (const vehicle of populationState.vehicles) {
    if (
      populationState.activeVehicleIds.size > 0 &&
      !populationState.activeVehicleIds.has(vehicle.id)
    ) {
      continue;
    }

    const differenceX = vehicle.x - player.x;
    const differenceY = vehicle.y - player.y;
    const distanceSquared =
      differenceX * differenceX + differenceY * differenceY;

    if (distanceSquared > AI_HORN_AUDIBLE_RADIUS_SQUARED) {
      continue;
    }

    vehicle.hornCooldownSeconds = Math.max(
      0,
      (vehicle.hornCooldownSeconds ?? 0) - deltaSeconds,
    );

    const stoppedAndBlocked =
      Math.abs(vehicle.speed) < 1.5 &&
      vehicle.blocked &&
      !vehicle.waitingAtTerminal;

    if (!stoppedAndBlocked) {
      vehicle.hornStoppedSeconds = 0;
      vehicle.hornTriggerSeconds ??= randomHornDelay(8, 18);
      continue;
    }

    vehicle.hornStoppedSeconds =
      (vehicle.hornStoppedSeconds ?? 0) + deltaSeconds;

    const greenAndPlayerBlocking =
      vehicle.blockedByPlayer &&
      vehicle.trafficLightSignal === "green";
    const playerBlocking = vehicle.blockedByPlayer;

    vehicle.hornTriggerSeconds ??= greenAndPlayerBlocking
      ? randomHornDelay(1.1, 2.8)
      : playerBlocking
        ? randomHornDelay(3, 7)
        : randomHornDelay(9, 21);

    if (
      vehicle.hornCooldownSeconds > 0 ||
      vehicle.hornStoppedSeconds < vehicle.hornTriggerSeconds
    ) {
      continue;
    }

    if (requestNearbyAiHorn(vehicle, greenAndPlayerBlocking ? 1 : 0)) {
      vehicle.hornCooldownSeconds = randomHornDelay(4, 9);
      vehicle.hornStoppedSeconds = 0;
      vehicle.hornTriggerSeconds = greenAndPlayerBlocking
        ? randomHornDelay(1.8, 4)
        : playerBlocking
          ? randomHornDelay(4, 9)
          : randomHornDelay(10, 24);
    }
  }
}

function hornNearestAiVehicleAfterCollision() {
  let nearestVehicle = null;
  let nearestDistance = GRID_SIZE * 1.8;

  for (const vehicle of populationState.vehicles) {
    const distance = Math.hypot(
      vehicle.x - player.x,
      vehicle.y - player.y,
    );

    if (distance < nearestDistance) {
      nearestVehicle = vehicle;
      nearestDistance = distance;
    }
  }

  if (
    nearestVehicle &&
    (nearestVehicle.hornCooldownSeconds ?? 0) <= 0 &&
    requestNearbyAiHorn(nearestVehicle, 1)
  ) {
    nearestVehicle.hornCooldownSeconds = randomHornDelay(3, 6);
  }
}
const populationVehicleSprites = new Map();
const landmarkSprites = new Map();
const genericBuildingSprites = new Map();
const staticMapTiles = new Map();
const pendingCanvasImages = new Set();
const activeTowTruckBuffer = [];
const populationPlayerProxy = {
  x: 0,
  y: 0,
  width: 0,
  length: 0,
  rotation: 0,
  speed: 0,
};
const populationViewPosition = {
  x: 0,
  y: 0,
};
let pendingStaticPrewarm = null;
let lastPrewarmTileKey = "";
let appliedAdaptivePixelScale = 1;
let pausedFrameRendered = false;
const labelledLandmarks = buildings.filter((building) => {
  return building.isLandmark;
});
const staticServiceZones = [
  ...fuelPumps,
  ...repairZones,
  ...beachParkingZones,
  ...bankParkingZones,
  ...businessOfficeParkingZones,
  ...mapTravelZones,
  ...raceZones,
  ...dealershipParkingZones,
  ...estateAgencyParkingZones,
  ...homeParkingZones,
  ...healthParkingZones,
  ...foodParkingZones,
];

function clamp(value, minimum, maximum) {
  return Math.min(
    Math.max(value, minimum),
    maximum,
  );
}

function interpolateValue(previousValue, currentValue) {
  const start = Number.isFinite(previousValue)
    ? previousValue
    : currentValue;
  return start +
    (currentValue - start) * renderInterpolationAlpha;
}

function interpolateRotation(
  previousRotation,
  currentRotation,
  interpolationAlpha = renderInterpolationAlpha,
) {
  const start = Number.isFinite(previousRotation)
    ? previousRotation
    : currentRotation;
  const difference = Math.atan2(
    Math.sin(currentRotation - start),
    Math.cos(currentRotation - start),
  );
  return start + difference * interpolationAlpha;
}

function getInterpolatedVehicleTransform(vehicle) {
  const interpolationAlpha =
    vehicle === player
      ? renderInterpolationAlpha
      : trafficRenderInterpolationAlpha;
  return {
    x:
      (Number.isFinite(vehicle.previousX)
        ? vehicle.previousX
        : vehicle.x) +
      (vehicle.x -
        (Number.isFinite(vehicle.previousX)
          ? vehicle.previousX
          : vehicle.x)) *
        interpolationAlpha,
    y:
      (Number.isFinite(vehicle.previousY)
        ? vehicle.previousY
        : vehicle.y) +
      (vehicle.y -
        (Number.isFinite(vehicle.previousY)
          ? vehicle.previousY
          : vehicle.y)) *
        interpolationAlpha,
    rotation: interpolateRotation(
      vehicle.previousRotation,
      vehicle.rotation,
      interpolationAlpha,
    ),
  };
}

function smoothstep(value) {
  const clamped = clamp(value, 0, 1);
  return clamped * clamped * (3 - 2 * clamped);
}

function loadCanvasImage(source, assignImage) {
  const image = new Image();
  image.addEventListener("load", () => {
    assignImage(image);
  });
  image.src = source;
}

function requestMappedCanvasImage({
  source,
  target,
  key,
  invalidateStaticMap = false,
}) {
  if (!source || target.has(key) || pendingCanvasImages.has(source)) {
    return;
  }

  pendingCanvasImages.add(source);
  const image = new Image();

  image.addEventListener("load", () => {
    pendingCanvasImages.delete(source);
    target.set(key, image);

    if (invalidateStaticMap) {
      invalidateStaticMapCache();
    }
  });

  image.addEventListener("error", () => {
    pendingCanvasImages.delete(source);
  });

  image.src = source;
}

function isPlayerInsideZone(zone) {
  return (
    player.x >= zone.x &&
    player.x <= zone.x + zone.width &&
    player.y >= zone.y &&
    player.y <= zone.y + zone.height
  );
}

function isVisible(item) {
  return (
    item.x < camera.x + CAMERA_WIDTH + RENDER_MARGIN &&
    item.x + item.width > camera.x - RENDER_MARGIN &&
    item.y < camera.y + CAMERA_HEIGHT + RENDER_MARGIN &&
    item.y + item.height > camera.y - RENDER_MARGIN
  );
}

function canPlayerOccupy(collisionShape) {
  if (!canVehicleOccupy(collisionShape)) {
    return false;
  }

  const overlapsRaceCar =
    streetRaceIsRunning() &&
    populationTrafficStateOverlaps(collisionShape, {
      vehicles: illegalStreetRaceState.opponents,
    });
  if (overlapsRaceCar) {
    return false;
  }

  const overlapsTraffic = populationTrafficStateOverlaps(
    collisionShape,
    populationState,
  );

  if (overlapsTraffic) {
    playerTrafficCollisionDetected = true;
  }

  return !overlapsTraffic;
}

function canPopulationVehicleOccupy(collisionShape) {
  const bounds = getSolidVehicleBounds(collisionShape);
  const offMapStagingDistance = GRID_SIZE * 3;
  const insidePopulationStagingBounds = (
    bounds.x >= -offMapStagingDistance &&
    bounds.y >= -offMapStagingDistance &&
    bounds.x + bounds.width <=
      WORLD_WIDTH + offMapStagingDistance &&
    bounds.y + bounds.height <=
      WORLD_HEIGHT + offMapStagingDistance
  );

  return (
    insidePopulationStagingBounds &&
    findObstacleCollision(collisionShape) === null
  );
}

function crossedTrafficLightStop(previousPosition, currentPosition, approach) {
  const laneTolerance = GRID_SIZE * 0.82;

  if (approach.direction === "east") {
    return (
      previousPosition.x <= approach.stopX &&
      currentPosition.x > approach.stopX &&
      Math.abs(currentPosition.y - approach.stopY) <= laneTolerance
    );
  }

  if (approach.direction === "west") {
    return (
      previousPosition.x >= approach.stopX &&
      currentPosition.x < approach.stopX &&
      Math.abs(currentPosition.y - approach.stopY) <= laneTolerance
    );
  }

  if (approach.direction === "north") {
    return (
      previousPosition.y >= approach.stopY &&
      currentPosition.y < approach.stopY &&
      Math.abs(currentPosition.x - approach.stopX) <= laneTolerance
    );
  }

  return (
    previousPosition.y <= approach.stopY &&
    currentPosition.y > approach.stopY &&
    Math.abs(currentPosition.x - approach.stopX) <= laneTolerance
  );
}

function processPlayerTrafficLightViolations(
  previousPosition,
  currentPosition,
) {
  if (currentMapId.value !== "coastal-city") return;
  const violatedLight = ALL_SIGNAL_LIGHTS.find((light) => {
    return light.approaches.some((approach) => {
      const signal = light.lightSystem === "highway"
        ? getHighwayLightSignal(light, approach, highwayLightState, HIGHWAY_LIGHT_CONFIG)
        : getTrafficLightSignal(light, approach, trafficLightState, TRAFFIC_LIGHT_CONFIG);
      return (
        signal === "red" &&
        crossedTrafficLightStop(
          previousPosition,
          currentPosition,
          approach,
        )
      );
    });
  });

  if (!violatedLight) {
    return;
  }

  issueOutstandingFine({
    state: fineState,
    amount: DANFO_ECONOMY_CONFIG.trafficLightViolationFine,
    label: `Traffic-light violation · ${violatedLight.label}`,
    gameDay: gameClock.day,
    gameTime: displayedGameTime.value,
  });
  addCrime(crimeState, "traffic");
  recordDriverLicenceTrafficViolation(driverLicenceState);
  if (routeState.status === "active") {
    routeCareerState.trafficViolationDuringRoute = true;
  }
}

function drawTrafficLightConcretePad(
  context,
  concretePad,
  checkVisibility = true,
) {
  if (checkVisibility && !isVisible(concretePad)) {
    return;
  }

  if (trafficLightConcreteImage) {
    context.drawImage(
      trafficLightConcreteImage,
      concretePad.x,
      concretePad.y,
      concretePad.width,
      concretePad.height,
    );
    return;
  }

  context.fillStyle = "#bdbdb7";
  context.fillRect(
    concretePad.x,
    concretePad.y,
    concretePad.width,
    concretePad.height,
  );
}

function drawTrafficLightStopLines(context) {
  if (currentMapId.value !== "coastal-city") return;
  const lineLength = GRID_SIZE * 0.72;
  const lineThickness = 6;

  context.save();
  context.fillStyle = "#ffffff";

  ALL_SIGNAL_LIGHTS.forEach((light) => {
    light.approaches.forEach((approach) => {
      const stopLineAxis =
        approach.stopLineAxis ?? approach.axis;

      if (stopLineAxis === "horizontal") {
        context.fillRect(
          approach.stopX - lineThickness / 2,
          approach.stopY - lineLength / 2,
          lineThickness,
          lineLength,
        );
        return;
      }

      context.fillRect(
        approach.stopX - lineLength / 2,
        approach.stopY - lineThickness / 2,
        lineLength,
        lineThickness,
      );
    });
  });

  context.restore();
}

function drawWorldGrid(context) {
  if (!showGrid.value) {
    return;
  }

  const firstColumn = Math.max(0, Math.floor(camera.x / GRID_SIZE));
  const lastColumn = Math.min(
    GRID_COLUMNS - 1,
    Math.ceil((camera.x + CAMERA_WIDTH) / GRID_SIZE),
  );
  const firstRow = Math.max(0, Math.floor(camera.y / GRID_SIZE));
  const lastRow = Math.min(
    GRID_ROWS - 1,
    Math.ceil((camera.y + CAMERA_HEIGHT) / GRID_SIZE),
  );

  context.save();
  context.strokeStyle = "rgb(18 74 22 / 38%)";
  context.fillStyle = "rgb(11 46 14 / 72%)";
  context.lineWidth = 2;
  context.font = "13px Basic";
  context.textAlign = "left";
  context.textBaseline = "top";

  for (let row = firstRow; row <= lastRow; row += 1) {
    for (let column = firstColumn; column <= lastColumn; column += 1) {
      const x = column * GRID_SIZE;
      const y = row * GRID_SIZE;

      context.strokeRect(x, y, GRID_SIZE, GRID_SIZE);
      context.fillText(`X${column} Y${row}`, x + 7, y + 7);
    }
  }

  context.restore();
}

function drawTrafficSpawnPoints(context) {
  if (!showGrid.value) return;

  const directionAngles = {
    east: 0,
    south: Math.PI / 2,
    west: Math.PI,
    north: -Math.PI / 2,
  };

  context.save();
  context.font = "700 11px Basic";
  context.textAlign = "center";
  context.textBaseline = "top";

  WORLD2_TRAFFIC_SPAWN_POINTS.forEach((spawnPoint) => {
    if (
      !isVisible({
        x: spawnPoint.x - 18,
        y: spawnPoint.y - 18,
        width: 36,
        height: 36,
      })
    ) {
      return;
    }

    context.save();
    context.translate(spawnPoint.x, spawnPoint.y);
    context.rotate(directionAngles[spawnPoint.direction] ?? 0);
    context.fillStyle = "#e6b83f";
    context.beginPath();
    context.moveTo(18, 0);
    context.lineTo(-10, -11);
    context.lineTo(-10, 11);
    context.closePath();
    context.fill();
    context.restore();

    context.fillStyle = "rgb(8 14 18 / 82%)";
    context.fillRect(
      spawnPoint.x - 62,
      spawnPoint.y + 20,
      124,
      18,
    );
    context.fillStyle = "#f2dc91";
    context.fillText(
      spawnPoint.id,
      spawnPoint.x,
      spawnPoint.y + 22,
      118,
    );
  });

  context.restore();
}

function drawRouteProposals(context) {
  if (!showGrid.value) return;

  const routeColours = [
    "#ffcc3d",
    "#60d7ff",
    "#ff765f",
    "#a8e063",
    "#c98cff",
    "#ff9ed1",
    "#64e5c4",
    "#f1a65a",
  ];

  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";

  WORLD2_ROUTE_PROPOSALS.forEach((route, routeIndex) => {
    const colour = routeColours[routeIndex % routeColours.length];
    const points = route.points;
    if (points.length < 2) return;

    context.strokeStyle = colour;
    context.globalAlpha = 0.76;
    context.lineWidth = 7;
    context.setLineDash([34, 18]);
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((point) => {
      context.lineTo(point.x, point.y);
    });
    context.stroke();
    context.setLineDash([]);

    points.slice(0, -1).forEach((point, pointIndex) => {
      const target = points[pointIndex + 1];
      const dx = target.x - point.x;
      const dy = target.y - point.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 1) return;
      const angle = Math.atan2(dy, dx);
      const arrowSpacing = GRID_SIZE * 6;
      const arrowCount = Math.max(1, Math.floor(distance / arrowSpacing));

      for (let arrowIndex = 1; arrowIndex <= arrowCount; arrowIndex += 1) {
        const progress = arrowIndex / (arrowCount + 1);
        context.save();
        context.translate(
          point.x + dx * progress,
          point.y + dy * progress,
        );
        context.rotate(angle);
        context.fillStyle = colour;
        context.globalAlpha = 0.95;
        context.beginPath();
        context.moveTo(15, 0);
        context.lineTo(-10, -8);
        context.lineTo(-10, 8);
        context.closePath();
        context.fill();
        context.restore();
      }
    });

    const first = points[0];
    const next = points[1];
    const labelX = clamp(
      first.x + Math.sign(next.x - first.x) * 72,
      84,
      WORLD_WIDTH - 84,
    );
    const labelY = clamp(
      first.y + Math.sign(next.y - first.y) * 54,
      28,
      WORLD_HEIGHT - 28,
    );
    const routeNumber = `R${routeIndex + 1}`;

    context.globalAlpha = 1;
    context.fillStyle = "rgb(10 14 18 / 90%)";
    context.fillRect(labelX - 24, labelY - 15, 48, 30);
    context.strokeStyle = colour;
    context.lineWidth = 2;
    context.strokeRect(labelX - 24, labelY - 15, 48, 30);
    context.fillStyle = colour;
    context.font = "900 14px Basic";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(routeNumber, labelX, labelY + 1);
  });

  context.restore();
}

function mergeIntervals(intervals) {
  return intervals
    .sort((a, b) => a[0] - b[0])
    .reduce((merged, interval) => {
      const previous = merged[merged.length - 1];

      if (previous && interval[0] <= previous[1]) {
        previous[1] = Math.max(previous[1], interval[1]);
      } else {
        merged.push([...interval]);
      }

      return merged;
    }, []);
}

function getDividerSegments(road) {
  const horizontal = road.width > road.height;
  const start = horizontal ? road.x : road.y;
  const end = start + (horizontal ? road.width : road.height);
  const centre = horizontal
    ? road.y + road.height / 2
    : road.x + road.width / 2;

  const exclusions = roads.flatMap((otherRoad) => {
    if (otherRoad.id === road.id) return [];

    const crossesCentre = horizontal
      ? centre >= otherRoad.y && centre <= otherRoad.y + otherRoad.height
      : centre >= otherRoad.x && centre <= otherRoad.x + otherRoad.width;

    if (!crossesCentre) return [];

    const exclusionStart = horizontal ? otherRoad.x : otherRoad.y;
    const exclusionEnd = exclusionStart + (horizontal ? otherRoad.width : otherRoad.height);

    if (exclusionEnd <= start || exclusionStart >= end) return [];
    return [[Math.max(start, exclusionStart - 8), Math.min(end, exclusionEnd + 8)]];
  });

  const merged = mergeIntervals(exclusions);
  const segments = [];
  let cursor = start;

  merged.forEach(([exclusionStart, exclusionEnd]) => {
    if (exclusionStart > cursor) segments.push([cursor, exclusionStart]);
    cursor = Math.max(cursor, exclusionEnd);
  });

  if (cursor < end) segments.push([cursor, end]);
  return segments;
}

function drawDashedRoadLine(
  context,
  start,
  end,
  crossPosition,
  horizontal,
  width = 5,
) {
  const dashLength = 48;
  const dashGap = 30;
  for (
    let position = start;
    position < end;
    position += dashLength + dashGap
  ) {
    const length = Math.min(dashLength, end - position);
    if (horizontal) {
      context.fillRect(
        position,
        crossPosition - width / 2,
        length,
        width,
      );
    } else {
      context.fillRect(
        crossPosition - width / 2,
        position,
        width,
        length,
      );
    }
  }
}

function drawRoadDivider(context, road) {
  const roadThickness = Math.min(road.width, road.height);

  if (
    road.type === "dirt" ||
    roadThickness < GRID_SIZE * 2
  ) {
    return;
  }

  const horizontal = road.width > road.height;
  context.fillStyle = "#ffffff";

  if (
    road.type === "highway" &&
    roadThickness >= GRID_SIZE * 4
  ) {
    context.save();
    const centre = horizontal
      ? road.y + road.height / 2
      : road.x + road.width / 2;
    const shoulderInset = 9;
    const medianOuterWidth = 28;
    const medianInnerWidth = 16;
    const medianRenderLength =
      horizontal && road.id === "central-four-lane-highway"
        ? Math.min(road.width, GRID_SIZE * 61)
        : horizontal
          ? road.width
          : road.height;

    context.fillStyle = "#b89245";
    if (horizontal) {
      context.fillRect(
        road.x,
        road.y + shoulderInset,
        road.width,
        5,
      );
      context.fillRect(
        road.x,
        road.y + road.height - shoulderInset - 5,
        road.width,
        5,
      );
    } else {
      context.fillRect(
        road.x + shoulderInset,
        road.y,
        5,
        road.height,
      );
      context.fillRect(
        road.x + road.width - shoulderInset - 5,
        road.y,
        5,
        road.height,
      );
    }

    context.fillStyle = "#252922";
    if (horizontal) {
      context.fillRect(
        road.x,
        centre - medianOuterWidth / 2,
        medianRenderLength,
        medianOuterWidth,
      );
    } else {
      context.fillRect(
        centre - medianOuterWidth / 2,
        road.y,
        medianOuterWidth,
        road.height,
      );
    }

    context.fillStyle = "#758f42";
    if (horizontal) {
      context.fillRect(
        road.x,
        centre - medianInnerWidth / 2,
        medianRenderLength,
        medianInnerWidth,
      );
    } else {
      context.fillRect(
        centre - medianInnerWidth / 2,
        road.y,
        medianInnerWidth,
        road.height,
      );
    }

    context.fillStyle = "#d8c277";
    const ornamentSpacing = GRID_SIZE * 2;
    const roadStart = horizontal ? road.x : road.y;
    const roadEnd = roadStart + medianRenderLength;
    for (
      let position = roadStart + GRID_SIZE;
      position < roadEnd;
      position += ornamentSpacing
    ) {
      context.beginPath();
      context.arc(
        horizontal ? position : centre,
        horizontal ? centre : position,
        4.5,
        0,
        Math.PI * 2,
      );
      context.fill();
    }

    const laneDividerWidth = 5;
    const dividerOffsets = [
      {
        offset: roadThickness * 0.25,
        width: laneDividerWidth,
      },
      {
        offset: roadThickness * 0.75,
        width: laneDividerWidth,
      },
    ];

    getDividerSegments(road).forEach(([start, end]) => {
      dividerOffsets.forEach((divider) => {
        drawDashedRoadLine(
          context,
          start,
          end,
          (horizontal ? road.y : road.x) + divider.offset,
          horizontal,
          divider.width,
        );
      });
    });
    context.restore();
    return;
  }

  const dividerWidth = road.type === "highway" ? 14 : 8;
  getDividerSegments(road).forEach(([start, end]) => {
    if (horizontal) {
      context.fillRect(start, road.y + (road.height - dividerWidth) / 2, end - start, dividerWidth);
    } else {
      context.fillRect(road.x + (road.width - dividerWidth) / 2, start, dividerWidth, end - start);
    }
  });
}

function drawRoadLabel(context, road) {
  if (!road.name) return;

  const horizontal = road.width >= road.height;
  const length = horizontal ? road.width : road.height;
  const roadThickness = horizontal ? road.height : road.width;
  const repeatDistance =
    road.type === "highway" ? GRID_SIZE * 14 : GRID_SIZE * 8;
  const fontSize =
    road.type === "highway"
      ? 20
      : roadThickness >= GRID_SIZE * 2
        ? 16
        : 13;
  const label = road.name.toUpperCase();
  const labelCount = Math.max(1, Math.ceil(length / repeatDistance));
  const spacing = length / labelCount;

  context.save();
  context.font = `800 ${fontSize}px Basic`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#ffffff";
  context.shadowColor = "rgb(0 0 0 / 72%)";
  context.shadowBlur = 3;
  context.shadowOffsetX = 1;
  context.shadowOffsetY = 1;

  for (let index = 0; index < labelCount; index += 1) {
    const along = spacing * (index + 0.5);
    let x = horizontal
      ? road.x + along
      : road.x + road.width / 2;
    const y = horizontal
      ? road.y + road.height / 2
      : road.y + along;

    if (road.type === "bridge") {
      // Keep the bridge name beside the deck so it never covers vehicles or
      // lane markings.
      x = road.x - 18;
    } else {
      const labelTouchesBridge = roads.some((bridge) => {
        if (bridge.type !== "bridge") return false;
        return (
          x >= bridge.x - GRID_SIZE * 0.5 &&
          x <= bridge.x + bridge.width + GRID_SIZE * 0.5 &&
          y >= bridge.y &&
          y <= bridge.y + bridge.height
        );
      });
      if (labelTouchesBridge) continue;
    }

    context.save();
    context.translate(x, y);
    if (!horizontal) context.rotate(-Math.PI / 2);
    context.fillText(
      label,
      0,
      1,
      Math.max(60, spacing - 26),
    );
    context.restore();
  }

  context.restore();
}

function staticItemTouchesTile(item, tileBounds) {
  return (
    item.x < tileBounds.x + tileBounds.width &&
    item.x + item.width > tileBounds.x &&
    item.y < tileBounds.y + tileBounds.height &&
    item.y + item.height > tileBounds.y
  );
}

function drawStaticRoadSurface(context, road) {
  const surfaceImage =
    road.type === "dirt"
      ? untarredRoadTileImage
      : asphaltTileImage;

  if (surfaceImage) {
    const pattern = context.createPattern(
      surfaceImage,
      "repeat",
    );

    if (pattern) {
      if (typeof pattern.setTransform === "function") {
        pattern.setTransform(
          new DOMMatrix().scale(
            GRID_SIZE / surfaceImage.naturalWidth,
            GRID_SIZE / surfaceImage.naturalHeight,
          ),
        );
      }

      context.fillStyle = pattern;
      context.fillRect(
        road.x,
        road.y,
        road.width,
        road.height,
      );
      return;
    }
  }

  context.fillStyle =
    road.type === "dirt"
      ? "#946331"
      : "#484d53";
  context.fillRect(
    road.x,
    road.y,
    road.width,
    road.height,
  );
}

function getRoadRenderLayer(road) {
  if (road.type === "highway") return 0;
  if (road.type === "bridge") return 2;
  return 1;
}

function getRoadsInRenderOrder() {
  return [...roads].sort((first, second) => {
    return getRoadRenderLayer(first) - getRoadRenderLayer(second);
  });
}

function drawBridgeDeckDetails(context, road, openEnds = false) {
  if (road.type !== "bridge") return;
  context.save();
  context.strokeStyle = "rgb(12 18 22 / 72%)";
  context.lineWidth = 16;
  if (openEnds) {
    context.beginPath();
    context.moveTo(road.x + 5, road.y);
    context.lineTo(road.x + 5, road.y + road.height);
    context.moveTo(road.x + road.width - 5, road.y);
    context.lineTo(road.x + road.width - 5, road.y + road.height);
    context.stroke();
  } else {
    context.strokeRect(
      road.x + 5,
      road.y + 5,
      road.width - 10,
      road.height - 10,
    );
  }
  context.strokeStyle = "#bbb6a7";
  context.lineWidth = 5;
  if (openEnds) {
    context.beginPath();
    context.moveTo(road.x + 9, road.y);
    context.lineTo(road.x + 9, road.y + road.height);
    context.moveTo(road.x + road.width - 9, road.y);
    context.lineTo(road.x + road.width - 9, road.y + road.height);
    context.stroke();
  } else {
    context.strokeRect(
      road.x + 9,
      road.y + 9,
      road.width - 18,
      road.height - 18,
    );
  }
  context.restore();
}

function getCoastalNoDriveOutlineAreas() {
  return [];
}

function drawNoDriveAreaOutline(context, area) {
  const inset = Math.min(
    7,
    Math.max(1, Math.min(area.width, area.height) * 0.2),
  );
  context.save();
  context.strokeStyle = "rgb(18 20 18 / 88%)";
  context.lineWidth = 12;
  context.strokeRect(
    area.x + inset,
    area.y + inset,
    Math.max(1, area.width - inset * 2),
    Math.max(1, area.height - inset * 2),
  );
  context.setLineDash([18, 12]);
  context.strokeStyle = "#d4bc58";
  context.lineWidth = 4;
  context.strokeRect(
    area.x + inset,
    area.y + inset,
    Math.max(1, area.width - inset * 2),
    Math.max(1, area.height - inset * 2),
  );
  context.restore();
}

function pointIsOnBridge(x, y, bridgeRoads) {
  return bridgeRoads.some((bridge) => {
    return (
      x >= bridge.x &&
      x <= bridge.x + bridge.width &&
      y >= bridge.y &&
      y <= bridge.y + bridge.height
    );
  });
}

function getBridgeElevationAtPosition(x, y, bridgeRoads) {
  const rampLength = GRID_SIZE * 3;
  const bridge = bridgeRoads.find((candidate) => {
    return (
      x >= candidate.x &&
      x <= candidate.x + candidate.width &&
      y >= candidate.y &&
      y <= candidate.y + candidate.height
    );
  });
  if (!bridge) return 0;

  const northRampEnd = bridge.y + rampLength;
  const southRampStart =
    bridge.y + bridge.height - rampLength;

  if (y < northRampEnd) {
    return clamp((y - bridge.y) / rampLength, 0, 1);
  }
  if (y > southRampStart) {
    return clamp(
      (bridge.y + bridge.height - y) / rampLength,
      0,
      1,
    );
  }
  return 1;
}

function getPopulationBridgeElevation(vehicle) {
  const bridgeRoads = roads.filter((road) => {
    return (
      road.type === "bridge" &&
      vehicle.route?.roadIds?.includes(road.id)
    );
  });
  return getBridgeElevationAtPosition(
    vehicle.x,
    vehicle.y,
    bridgeRoads,
  );
}

function drawElevatedBridgeLayer(context) {
  if (currentMapId.value !== "coastal-city") return;
  const bridgeRoads = roads.filter((road) => {
    return road.type === "bridge" && isVisible(road);
  });
  if (bridgeRoads.length === 0) return;

  const rampLength = GRID_SIZE * 3;
  const bridgeDecks = bridgeRoads.map((bridge) => ({
    ...bridge,
    y: bridge.y + rampLength,
    height: bridge.height - rampLength * 2,
  }));

  bridgeDecks.forEach((bridgeDeck) => {
    drawStaticRoadSurface(context, bridgeDeck);
    drawBridgeDeckDetails(context, bridgeDeck, true);
    drawRoadDivider(context, bridgeDeck);
    drawRoadLabel(context, bridgeDeck);
  });

  populationState.vehicles.forEach((vehicle) => {
    if (
      vehicle.route?.roadIds?.some((roadId) => {
        return bridgeRoads.some((bridge) => bridge.id === roadId);
      }) &&
      pointIsOnBridge(vehicle.x, vehicle.y, bridgeDecks)
    ) {
      drawPopulationVehicle(context, vehicle);
    }
  });

  if (
    playerBridgeState.elevation >= 0.5 &&
    pointIsOnBridge(player.x, player.y, bridgeDecks)
  ) {
    drawPlayerDanfo(context);
  }
}

function renderStaticMapTile(column, row) {
  const tileX = column * STATIC_MAP_TILE_SIZE;
  const tileY = row * STATIC_MAP_TILE_SIZE;
  const tileBounds = {
    x: tileX,
    y: tileY,
    width: STATIC_MAP_TILE_SIZE,
    height: STATIC_MAP_TILE_SIZE,
  };
  const tileCanvas = document.createElement("canvas");
  tileCanvas.width = STATIC_MAP_TILE_SIZE;
  tileCanvas.height = STATIC_MAP_TILE_SIZE;
  const context = tileCanvas.getContext("2d");

  if (!context) {
    return tileCanvas;
  }

  context.imageSmoothingEnabled = true;
  context.translate(-tileX, -tileY);

  districts.forEach((district) => {
    const districtBounds = {
      x: district.worldX,
      y: district.worldY,
      width: district.width,
      height: district.height,
    };

    if (!staticItemTouchesTile(districtBounds, tileBounds)) {
      return;
    }

    context.fillStyle =
      (district.id !== "coastal-ocean" &&
        district.id !== "atlantic-ocean" &&
        grassTileImage &&
        context.createPattern(grassTileImage, "repeat")) ||
      district.ground;
    context.fillRect(
      district.worldX,
      district.worldY,
      district.width,
      district.height,
    );
  });

  beachTiles.forEach((tile) => {
    if (staticItemTouchesTile(tile, tileBounds)) {
      drawBeachSurface(context, tile);
    }
  });

  waterTiles.forEach((tile) => {
    if (staticItemTouchesTile(tile, tileBounds)) {
      if (tile.surface === "shoreline") {
        drawShorelineSurface(context, tile);
      } else {
        drawWaterSurface(context, tile);
      }
    }
  });

  edgeBorderTiles.forEach((tile) => {
    if (!staticItemTouchesTile(tile, tileBounds)) {
      return;
    }

    drawBarrier(context, tile, false);
  });

  const orderedRoads = getRoadsInRenderOrder();
  orderedRoads.forEach((road) => {
    if (staticItemTouchesTile(road, tileBounds)) {
      drawStaticRoadSurface(context, road);
    }
  });

  const westSouthRoadPatch = {
    x: 7 * GRID_SIZE,
    y: 33 * GRID_SIZE,
    width: GRID_SIZE,
    height: GRID_SIZE,
    type: "local",
  };

  if (
    currentMapId.value === "mainland" &&
    staticItemTouchesTile(westSouthRoadPatch, tileBounds)
  ) {
    drawStaticRoadSurface(context, westSouthRoadPatch);
  }

  orderedRoads.forEach((road) => {
    if (
      road.type === "bridge" &&
      staticItemTouchesTile(road, tileBounds)
    ) {
      drawBridgeDeckDetails(context, road, true);
    }
  });

  orderedRoads.forEach((road) => {
    if (staticItemTouchesTile(road, tileBounds)) {
      drawRoadDivider(context, road);
    }
  });

  orderedRoads.forEach((road) => {
    if (
      road.type !== "bridge" &&
      staticItemTouchesTile(road, tileBounds)
    ) {
      drawRoadLabel(context, road);
    }
  });

  if (currentMapId.value === "mainland") {
    trafficLightConcretePads.forEach((concretePad) => {
      if (staticItemTouchesTile(concretePad, tileBounds)) {
        drawTrafficLightConcretePad(context, concretePad, false);
      }
    });
  }

  drawTrafficLightStopLines(context);

  staticServiceZones.forEach((zone) => {
    if (staticItemTouchesTile(zone, tileBounds)) {
      drawServiceParkingZone(context, zone, false);
    }
  });

  if (staticItemTouchesTile(beachRoadDivider, tileBounds)) {
    drawBeachRoadDivider(context);
  }

  buildings.forEach((building) => {
    const buildingLot = {
      x: building.lotX ?? building.x,
      y: building.lotY ?? building.y,
      width: building.lotWidth ?? building.width,
      height: building.lotHeight ?? building.height,
    };

    if (staticItemTouchesTile(buildingLot, tileBounds)) {
      drawBuildingBody(context, building, false);
    }
  });

  barriers.forEach((barrier) => {
    if (staticItemTouchesTile(barrier, tileBounds)) {
      drawBarrier(context, barrier, false);
    }
  });

  getCoastalNoDriveOutlineAreas().forEach((area) => {
    if (staticItemTouchesTile(area, tileBounds)) {
      drawNoDriveAreaOutline(context, area);
    }
  });

  busStops.forEach((busStop) => {
    if (staticItemTouchesTile(busStop, tileBounds)) {
      drawBusStop(context, busStop, false);
    }
  });

  return tileCanvas;
}

function getStaticMapTile(column, row) {
  const key = `${column}:${row}`;
  const cachedTile = staticMapTiles.get(key);

  if (cachedTile) {
    // Refresh insertion order so the Map also acts as a small LRU cache.
    staticMapTiles.delete(key);
    staticMapTiles.set(key, cachedTile);
    return cachedTile;
  }

  const tile = renderStaticMapTile(column, row);
  performanceMonitor.tileCacheMisses += 1;
  staticMapTiles.set(key, tile);

  while (staticMapTiles.size > STATIC_MAP_TILE_LIMIT) {
    const oldestKey = staticMapTiles.keys().next().value;
    staticMapTiles.delete(oldestKey);
  }

  return tile;
}

function drawStaticMapLayer(context) {
  const minimumColumn = Math.floor(
    (camera.x - RENDER_MARGIN) /
      STATIC_MAP_TILE_SIZE,
  );
  const maximumColumn = Math.floor(
    (camera.x + CAMERA_WIDTH + RENDER_MARGIN) /
      STATIC_MAP_TILE_SIZE,
  );
  const minimumRow = Math.floor(
    (camera.y - RENDER_MARGIN) /
      STATIC_MAP_TILE_SIZE,
  );
  const maximumRow = Math.floor(
    (camera.y + CAMERA_HEIGHT + RENDER_MARGIN) /
      STATIC_MAP_TILE_SIZE,
  );

  for (
    let row = minimumRow;
    row <= maximumRow;
    row += 1
  ) {
    for (
      let column = minimumColumn;
      column <= maximumColumn;
      column += 1
    ) {
      context.drawImage(
        getStaticMapTile(column, row),
        column * STATIC_MAP_TILE_SIZE,
        row * STATIC_MAP_TILE_SIZE,
      );
    }
  }

  scheduleStaticMapPrewarm(
    minimumColumn,
    maximumColumn,
    minimumRow,
    maximumRow,
  );
}

function invalidateStaticMapCache() {
  staticMapTiles.clear();
  lastPrewarmTileKey = "";
}

function scheduleStaticMapPrewarm(
  minimumColumn,
  maximumColumn,
  minimumRow,
  maximumRow,
) {
  const prewarmKey = [
    minimumColumn,
    maximumColumn,
    minimumRow,
    maximumRow,
  ].join(":");

  if (prewarmKey === lastPrewarmTileKey || pendingStaticPrewarm) {
    return;
  }

  lastPrewarmTileKey = prewarmKey;
  const work = () => {
    pendingStaticPrewarm = null;
    const centreColumn = Math.floor(
      (minimumColumn + maximumColumn) / 2,
    );
    const centreRow = Math.floor(
      (minimumRow + maximumRow) / 2,
    );
    [
      [minimumColumn - 1, centreRow],
      [maximumColumn + 1, centreRow],
      [centreColumn, minimumRow - 1],
      [centreColumn, maximumRow + 1],
    ].forEach(([column, row]) => {
      getStaticMapTile(column, row);
    });
  };

  if (typeof window.requestIdleCallback === "function") {
    pendingStaticPrewarm = window.requestIdleCallback(work, {
      timeout: 250,
    });
  } else {
    pendingStaticPrewarm = window.setTimeout(work, 0);
  }
}

function drawBarrier(context, barrier, checkVisibility = true) {
  if (checkVisibility && !isVisible(barrier)) return;
  if (barrier.surface === "water") {
    drawWaterSurface(context, barrier);
    return;
  }
  if (barrier.surface === "shoreline") {
    drawShorelineSurface(context, barrier);
    return;
  }
  context.fillStyle = barrier.colour ?? "#102a43";
  context.fillRect(barrier.x, barrier.y, barrier.width, barrier.height);
}

function drawWaterSurface(context, area) {
  context.fillStyle = "#102a43";
  context.fillRect(area.x, area.y, area.width, area.height);
}

function drawShorelineSurface(context, area) {
  if (!shorelineTransitionTileImage) {
    context.fillStyle = "#42bed0";
    context.fillRect(area.x, area.y, area.width, area.height);
    return;
  }

  for (let y = area.y; y < area.y + area.height; y += GRID_SIZE) {
    for (let x = area.x; x < area.x + area.width; x += GRID_SIZE) {
      context.drawImage(
        shorelineTransitionTileImage,
        x,
        y,
        GRID_SIZE,
        GRID_SIZE,
      );
    }
  }
}

function getBeachPropImage(column, row) {
  const loadedImages = beachPropImages.filter(Boolean);
  if (loadedImages.length === 0) return null;

  const hash =
    Math.imul(column + 11, 73856093) ^
    Math.imul(row + 17, 19349663);

  // Keep some cells as open sand and make the random layout redraw-safe.
  if ((hash >>> 4) % 5 < 2) return null;
  return loadedImages[(hash >>> 0) % loadedImages.length];
}

function drawBeachSurface(context, area) {
  for (let y = area.y; y < area.y + area.height; y += GRID_SIZE) {
    for (let x = area.x; x < area.x + area.width; x += GRID_SIZE) {
      const column = Math.round(x / GRID_SIZE);
      const row = Math.round(y / GRID_SIZE);
      if (beachSandTileImage) {
        context.drawImage(
          beachSandTileImage,
          x,
          y,
          GRID_SIZE,
          GRID_SIZE,
        );
      } else {
        context.fillStyle = "#d8b46a";
        context.fillRect(x, y, GRID_SIZE, GRID_SIZE);
      }

      const propImage = getBeachPropImage(column, row);
      if (propImage) {
        const inset = GRID_SIZE * 0.08;
        context.drawImage(
          propImage,
          x + inset,
          y + inset,
          GRID_SIZE - inset * 2,
          GRID_SIZE - inset * 2,
        );
      }
    }
  }
}

function drawBeachRoadDivider(context) {
  context.fillStyle = beachRoadDivider.colour;
  context.fillRect(
    beachRoadDivider.x,
    beachRoadDivider.y,
    beachRoadDivider.width,
    beachRoadDivider.height,
  );
  context.fillStyle = "rgba(255, 224, 166, 0.22)";
  context.fillRect(
    beachRoadDivider.x,
    beachRoadDivider.y,
    beachRoadDivider.width,
    2,
  );
}

function drawImageContained(context, image, x, y, width, height) {
  const imageWidth = image.naturalWidth || image.width || 1;
  const imageHeight = image.naturalHeight || image.height || 1;
  const scale = Math.min(width / imageWidth, height / imageHeight);
  const renderWidth = imageWidth * scale;
  const renderHeight = imageHeight * scale;

  context.drawImage(
    image,
    x + (width - renderWidth) / 2,
    y + (height - renderHeight) / 2,
    renderWidth,
    renderHeight,
  );
}

function drawBuildingBody(
  context,
  building,
  checkVisibility = true,
) {
  if (checkVisibility && !isVisible(building)) {
    return;
  }

  if (building.pedestrianSetback > 0) {
    context.fillStyle = "#c5c2ba";
    context.fillRect(
      building.lotX,
      building.lotY,
      building.lotWidth,
      building.lotHeight,
    );
    context.strokeStyle = "#96948e";
    context.lineWidth = 1;
    context.strokeRect(
      building.lotX + 0.5,
      building.lotY + 0.5,
      building.lotWidth - 1,
      building.lotHeight - 1,
    );
  }

  const landmarkSprite = building.spriteUrl
    ? landmarkSprites.get(building.spriteUrl)
    : null;

  if (building.isLandmark && building.spriteUrl && !landmarkSprite) {
    requestMappedCanvasImage({
      source: building.spriteUrl,
      target: landmarkSprites,
      key: building.spriteUrl,
      invalidateStaticMap: true,
    });
  }

  if (building.isLandmark && landmarkSprite) {
    drawImageContained(
      context,
      landmarkSprite,
      building.x,
      building.y,
      building.width,
      building.height,
    );

    return;
  }

  const genericSprite = !building.isLandmark && building.spriteUrl
    ? genericBuildingSprites.get(building.spriteUrl)
    : null;

  if (!building.isLandmark && building.spriteUrl && !genericSprite) {
    requestMappedCanvasImage({
      source: building.spriteUrl,
      target: genericBuildingSprites,
      key: building.spriteUrl,
      invalidateStaticMap: true,
    });
  }

  if (genericSprite) {
    const spriteInset = Math.max(
      0,
      Math.min(
        building.spriteInset ?? 0,
        Math.min(building.width, building.height) / 3,
      ),
    );
    const spriteWidth = building.width - spriteInset * 2;
    const spriteHeight = building.height - spriteInset * 2;
    context.save();
    context.translate(
      building.x + building.width / 2,
      building.y + building.height / 2,
    );
    context.rotate(
      (building.spriteRotationQuarterTurns ?? 0) *
        Math.PI /
        2,
    );
    drawImageContained(
      context,
      genericSprite,
      -spriteWidth / 2,
      -spriteHeight / 2,
      spriteWidth,
      spriteHeight,
    );
    context.restore();
    return;
  }

  context.fillStyle = building.isLandmark
    ? "#eee7da"
    : "#b7afa1";

  context.fillRect(
    building.x,
    building.y,
    building.width,
    building.height,
  );

  context.strokeStyle = "#2a2d30";
  context.lineWidth = building.isLandmark
    ? 7
    : 4;

  context.strokeRect(
    building.x,
    building.y,
    building.width,
    building.height,
  );

}

function drawBuildingLabel(context, building) {
  if (
    !showGrid.value ||
    !building.isLandmark ||
    !isVisible(building)
  ) {
    return;
  }

  context.save();
  context.font = "24px Basic";
  context.textAlign = "center";
  context.textBaseline = "middle";

  const labelWidth = Math.min(
    context.measureText(building.label).width + 28,
    building.width - 20,
  );
  const labelHeight = 42;
  const labelX =
    building.x + (building.width - labelWidth) / 2;
  const labelY =
    building.y + building.height - labelHeight - 10;

  context.fillStyle = "rgb(11 23 20 / 82%)";
  context.fillRect(
    labelX,
    labelY,
    labelWidth,
    labelHeight,
  );

  context.fillStyle = "#ffffff";
  context.fillText(
    building.label,
    building.x + building.width / 2,
    labelY + labelHeight / 2,
    labelWidth - 18,
  );
  context.restore();
}

function drawActiveStopZone(context) {
  const stop = activeRouteStop.value;

  if (!stop || routeState.status !== "active") {
    return;
  }

  const centre = getStopCentre(stop);
  const radius = DANFO_ROUTE_CONFIG.stopDetectionRadius;
  const bounds = {
    x: centre.x - radius,
    y: centre.y - radius,
    width: radius * 2,
    height: radius * 2,
  };

  if (!isVisible(bounds)) {
    return;
  }

  context.save();
  context.fillStyle = isInsideActiveStop.value
    ? "rgb(72 204 96 / 17%)"
    : "rgb(255 205 45 / 15%)";
  context.fillRect(
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
  );
  context.restore();
}

function drawWorldDestinationIndicators(context) {
  const elapsedSeconds = performance.now() / 1000;

  if (motoEaziTarget.value) {
    drawMotoEaziWorldMarker(
      context,
      motoEaziTarget.value,
      motoEaziState.stage,
      elapsedSeconds,
    );
  }

  if (manualMapDestination.value) {
    drawManualDestinationWorldMarker(
      context,
      manualMapDestination.value,
      elapsedSeconds,
    );
  }
}

function drawBusStop(context, busStop, checkVisibility = true) {
  if (checkVisibility && !isVisible(busStop)) {
    return;
  }

  if (busStopCanopyImage) {
    const padding = 9;
    context.drawImage(
      busStopCanopyImage,
      busStop.x + padding,
      busStop.y + 4,
      busStop.width - padding * 2,
      busStop.height - 38,
    );
  }

  const signSize = 68;
  const signX =
    busStop.x + (busStop.width - signSize) / 2;
  const signY = busStop.y + busStop.height - signSize - 4;

  context.save();
  context.shadowColor = "rgb(0 0 0 / 38%)";
  context.shadowBlur = 7;
  context.shadowOffsetY = 3;
  context.beginPath();
  context.roundRect(signX, signY, signSize, signSize, 9);
  context.fillStyle = "#102a25";
  context.fill();
  context.shadowColor = "transparent";
  context.strokeStyle = "#f2c438";
  context.lineWidth = 3;
  context.stroke();

  const iconX = signX + signSize / 2;
  const iconY = signY + 9;
  context.fillStyle = "#f2c438";
  context.beginPath();
  context.roundRect(iconX - 13, iconY, 26, 15, 4);
  context.fill();
  context.fillStyle = "#102a25";
  context.fillRect(iconX - 8, iconY + 4, 6, 5);
  context.fillRect(iconX + 2, iconY + 4, 6, 5);
  context.beginPath();
  context.arc(iconX - 8, iconY + 15, 2.5, 0, Math.PI * 2);
  context.arc(iconX + 8, iconY + 15, 2.5, 0, Math.PI * 2);
  context.fill();

  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#f2c438";
  context.font = "8px Basic";
  context.fillText(
    "BUS STOP",
    iconX,
    signY + 35,
    signSize - 10,
  );
  context.fillStyle = "#ffffff";
  context.font = "12px Basic";
  context.fillText(
    busStop.label,
    iconX,
    signY + 52,
    signSize - 10,
  );
  context.restore();
}

function drawMapTravelGateway(context, zone) {
  context.save();

  // One square gate marker per tile: four vertically aligned markers for Y16-Y19.
  const markerSize = Math.min(GRID_SIZE * 0.68, zone.width - 10);
  const markerX = zone.x + (zone.width - markerSize) / 2;
  const markerCount = Math.max(1, Math.round(zone.height / GRID_SIZE));

  for (let tileIndex = 0; tileIndex < markerCount; tileIndex += 1) {
    const markerY =
      zone.y + tileIndex * GRID_SIZE + (GRID_SIZE - markerSize) / 2;
    context.fillStyle = "#14213d";
    context.fillRect(markerX - 4, markerY - 4, markerSize + 8, markerSize + 8);
    context.fillStyle = "#ffca3a";
    context.fillRect(markerX, markerY, markerSize, markerSize);
    context.fillStyle = "#ff595e";
    const stripeHeight = markerSize / 4;
    context.fillRect(markerX, markerY, markerSize, stripeHeight);
    context.fillRect(markerX, markerY + stripeHeight * 2, markerSize, stripeHeight);
  }

  const textDirection = zone.orientation === "west" ? 1 : -1;
  const warningX = zone.x + zone.width / 2 + textDirection * GRID_SIZE * 2.15;
  const warningY = zone.y + zone.height / 2 - 8;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "rgba(255, 255, 255, 0.94)";
  context.font = "900 19px Basic, sans-serif";
  context.fillText(zone.warningLabel || "SLOW DOWN", warningX, warningY);

  context.fillStyle = "rgba(255, 255, 255, 0.9)";
  context.font = "900 14px Basic, sans-serif";
  const destination = zone.shortLabel || zone.label;
  context.fillText(destination, warningX, warningY + 25);
  context.restore();
}

function drawServiceParkingZone(context, zone, checkVisibility = true) {
  if (zone.kind === "world-travel") {
    drawMapTravelGateway(context, zone);
    return;
  }
  if (checkVisibility && !isVisible(zone)) {
    return;
  }

  context.save();

  if (parkingBayTileImage) {
    if (zone.id === "southwest-beach-drop-off") {
      for (
        let x = zone.x;
        x < zone.x + zone.width;
        x += GRID_SIZE
      ) {
        context.drawImage(
          parkingBayTileImage,
          x,
          zone.y,
          GRID_SIZE,
          GRID_SIZE,
        );
      }
    } else {
      context.drawImage(
        parkingBayTileImage,
        zone.x,
        zone.y,
        zone.width,
        zone.height,
      );
    }
  } else {
    context.fillStyle = "#303338";
    context.fillRect(
      zone.x,
      zone.y,
      zone.width,
      zone.height,
    );

    const lineInset = Math.min(zone.width, zone.height) * 0.22;
    context.strokeStyle = "#ffffff";
    context.lineWidth = Math.max(4, zone.width * 0.045);
    context.beginPath();
    context.moveTo(
      zone.x + lineInset,
      zone.y + zone.height - lineInset * 0.35,
    );
    context.lineTo(
      zone.x + lineInset,
      zone.y + lineInset,
    );
    context.lineTo(
      zone.x + zone.width - lineInset,
      zone.y + lineInset,
    );
    context.lineTo(
      zone.x + zone.width - lineInset,
      zone.y + zone.height - lineInset * 0.35,
    );
    context.stroke();
  }

  context.restore();
}

function drawPopulationVehicle(context, vehicle) {
  const collisionBox = getPopulationVehicleCollisionBox(
    vehicle,
  );

  if (!isVisible(collisionBox)) {
    return;
  }

  const renderTransform =
    getInterpolatedVehicleTransform(vehicle);
  const bridgeElevation =
    getPopulationBridgeElevation(vehicle);
  context.save();
  context.translate(renderTransform.x, renderTransform.y);
  context.rotate(renderTransform.rotation);
  if (bridgeElevation > 0) {
    const elevationScale =
      1 + bridgeElevation * 0.055;
    context.scale(elevationScale, elevationScale);
  }

  const sprite = populationVehicleSprites.get(vehicle.typeId);
  if (!sprite && vehicle.spriteUrl) {
    requestMappedCanvasImage({
      source: vehicle.spriteUrl,
      target: populationVehicleSprites,
      key: vehicle.typeId,
    });
  }
  // Resolve Danfo visuals from the same definition as the player, including old saves.
  const isDanfo = vehicle.typeId === 'danfo';
  const renderWidth = isDanfo ? PLAYER_DANFO.width * PLAYER_DANFO.spriteRenderScale : vehicle.renderWidth ?? vehicle.width;
  const renderLength = isDanfo ? PLAYER_DANFO.length * PLAYER_DANFO.spriteRenderScale : vehicle.renderLength ?? vehicle.length;
  const spriteCrop = isDanfo ? PLAYER_DANFO.spriteCrop : vehicle.spriteCrop;
  // The cyan sedan sprite has transparent padding around its body.
  const sedanShadow = vehicle.typeId === "private-citizen-1";
  drawVehicleGroundShadow(context, sedanShadow ? vehicle.width : renderWidth, sedanShadow ? vehicle.length : renderLength);

  if (sprite) {
    if (spriteCrop) {
      context.drawImage(
        sprite,
        spriteCrop.x,
        spriteCrop.y,
        spriteCrop.width,
        spriteCrop.height,
        -renderWidth / 2,
        -renderLength / 2,
        renderWidth,
        renderLength,
      );
    } else {
      context.drawImage(
        sprite,
        -renderWidth / 2,
        -renderLength / 2,
        renderWidth,
        renderLength,
      );
    }

    if (vehicle.displayLabel) {
      context.fillStyle = "#ffffff";
      context.font = "13px Basic";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(vehicle.displayLabel, 0, 2);
    }

    if (vehicle.blocked && showGrid.value) {
      context.strokeStyle = "#ff3434";
      context.lineWidth = 3;
      context.strokeRect(
        -vehicle.width / 2,
        -vehicle.length / 2,
        vehicle.width,
        vehicle.length,
      );
    }

    context.restore();
    return;
  }

  context.fillStyle = vehicle.colour;
  context.strokeStyle = vehicle.blocked && showGrid.value
    ? "#b33232"
    : vehicle.outlineColour;
  context.lineWidth = 4;

  context.fillRect(
    -vehicle.width / 2,
    -vehicle.length / 2,
    vehicle.width,
    vehicle.length,
  );

  context.strokeRect(
    -vehicle.width / 2,
    -vehicle.length / 2,
    vehicle.width,
    vehicle.length,
  );

  context.fillStyle = vehicle.frontMarkerColour;

  context.fillRect(
    -vehicle.width / 2 + 7,
    -vehicle.length / 2 + 7,
    Math.max(8, vehicle.width - 14),
    7,
  );

  if (vehicle.displayLabel) {
    context.fillStyle = "#ffffff";
    context.font = "13px Basic";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(vehicle.displayLabel, 0, 3);
  }

  context.restore();
}

function drawPopulationVehicles(context) {
  populationState.vehicles.forEach((vehicle) => {
    drawPopulationVehicle(context, vehicle);
  });
}

function drawMutiuStreetRace(context) {
  if (illegalStreetRaceState.status === "idle") {
    return;
  }

  const tileSize = 18;
  const lineTop = 33 * GRID_SIZE;
  const lineHeight = GRID_SIZE;
  const finishX = MUTIU_STREET_RACE.finish.x;

  if (
    isVisible({
      x: finishX - tileSize,
      y: lineTop,
      width: tileSize * 2,
      height: lineHeight,
    })
  ) {
    context.save();
    for (let y = lineTop; y < lineTop + lineHeight; y += tileSize) {
      const row = Math.floor((y - lineTop) / tileSize);
      for (let column = 0; column < 2; column += 1) {
        context.fillStyle =
          (row + column) % 2 === 0 ? "#f4f1df" : "#171717";
        context.fillRect(
          finishX + (column - 1) * tileSize,
          y,
          tileSize,
          tileSize,
        );
      }
    }
    context.restore();
  }

  illegalStreetRaceState.opponents.forEach((opponent) => {
    drawPopulationVehicle(context, opponent);
  });
}

function drawTowTruckBases(context) {
  towTruckState.trucks.forEach((truck) => {
    const baseBounds = {
      x: truck.base.x - truck.base.width / 2,
      y: truck.base.y - truck.base.height / 2,
      width: truck.base.width,
      height: truck.base.height,
    };

    if (!isVisible(baseBounds)) {
      return;
    }

    if (towYardTileImage) {
      context.drawImage(
        towYardTileImage,
        baseBounds.x,
        baseBounds.y,
        baseBounds.width,
        baseBounds.height,
      );
    } else {
      context.fillStyle = "#242a31";
      context.fillRect(
        baseBounds.x,
        baseBounds.y,
        baseBounds.width,
        baseBounds.height,
      );
      context.strokeStyle = "#f6c445";
      context.lineWidth = 6;
      context.strokeRect(
        baseBounds.x + 10,
        baseBounds.y + 10,
        baseBounds.width - 20,
        baseBounds.height - 20,
      );
    }
  });
}

function drawTowTrucks(context) {
  towTruckState.trucks.forEach((truck) => {
    const renderTransform =
      getInterpolatedVehicleTransform(truck);
    const targetVehicle = populationState.vehicles.find(
      (vehicle) => vehicle.id === truck.targetVehicleId,
    );

    if (truck.status === "towing" && targetVehicle) {
      const targetTransform =
        getInterpolatedVehicleTransform(targetVehicle);
      context.save();
      context.strokeStyle = "#f6c445";
      context.lineWidth = 5;
      context.beginPath();
      context.moveTo(renderTransform.x, renderTransform.y);
      context.lineTo(targetTransform.x, targetTransform.y);
      context.stroke();
      context.restore();
    }

    const bounds = {
      x: renderTransform.x - truck.width / 2,
      y: renderTransform.y - truck.length / 2,
      width: truck.width,
      height: truck.length,
    };
    if (!isVisible(bounds)) {
      return;
    }

    context.save();
    context.translate(renderTransform.x, renderTransform.y);
    context.rotate(renderTransform.rotation);

    drawVehicleGroundShadow(context, truck.width, truck.length);

    if (towTruckSpriteImage) {
      context.drawImage(
        towTruckSpriteImage,
        -truck.width / 2,
        -truck.length / 2,
        truck.width,
        truck.length,
      );
    } else {
      context.fillStyle = "#1478e8";
      context.fillRect(
        -truck.width / 2,
        -truck.length / 2,
        truck.width,
        truck.length,
      );
    }

    if (showGrid.value) {
      context.fillStyle = "#ffffff";
      context.font = "12px Basic";
      context.textAlign = "center";
      context.fillText(
        truck.status.toUpperCase(),
        0,
        truck.length / 2 + 18,
      );
    }
    context.restore();
  });
}

function drawNightOverlay(context) {
  if (nightIntensity.value <= 0.001) {
    return;
  }

  context.save();
  context.fillStyle =
    `rgb(4 10 27 / ${nightIntensity.value})`;
  context.fillRect(
    camera.x - RENDER_MARGIN,
    camera.y - RENDER_MARGIN,
    CAMERA_WIDTH + RENDER_MARGIN * 2,
    CAMERA_HEIGHT + RENDER_MARGIN * 2,
  );
  context.restore();
}

function drawVehicleHeadlights(context, vehicle) {
  const renderTransform =
    getInterpolatedVehicleTransform(vehicle);
  if (
    nightIntensity.value <= 0.08 ||
    !isVisible({
      x: renderTransform.x - GRID_SIZE * 2,
      y: renderTransform.y - GRID_SIZE * 2,
      width: GRID_SIZE * 4,
      height: GRID_SIZE * 4,
    })
  ) {
    return;
  }

  const beamLength = GRID_SIZE * 2;
  const startY = -vehicle.length / 2 + 3;
  const endY = startY - beamLength;
  const lampOffset = vehicle.width * 0.27;
  const beamHalfWidth = GRID_SIZE * 0.38;
  const brightness = clamp(
    nightIntensity.value / 0.76,
    0,
    1,
  );

  context.save();
  context.translate(renderTransform.x, renderTransform.y);
  context.rotate(renderTransform.rotation);
  context.translate(0, vehicle.bodyOffsetY ?? 0);
  context.globalCompositeOperation = "screen";

  [-lampOffset, lampOffset].forEach((lampX) => {
    const beamGradient = context.createLinearGradient(
      0,
      startY,
      0,
      endY,
    );
    beamGradient.addColorStop(
      0,
      `rgb(255 242 177 / ${0.34 * brightness})`,
    );
    beamGradient.addColorStop(
      0.68,
      `rgb(255 232 151 / ${0.14 * brightness})`,
    );
    beamGradient.addColorStop(1, "rgb(255 232 151 / 0)");

    context.beginPath();
    context.moveTo(lampX - 4, startY);
    context.lineTo(lampX + 4, startY);
    context.lineTo(lampX + beamHalfWidth, endY);
    context.lineTo(lampX - beamHalfWidth, endY);
    context.closePath();
    context.fillStyle = beamGradient;
    context.fill();

    context.beginPath();
    context.arc(lampX, startY, 5, 0, Math.PI * 2);
    context.fillStyle =
      `rgb(255 249 210 / ${0.85 * brightness})`;
    context.fill();
  });

  context.restore();
}

function drawAllVehicleHeadlights(context) {
  if (nightIntensity.value <= 0.08) {
    return;
  }

  const headlightStride =
    performanceMonitor.adaptiveScale < 0.86 ? 2 : 1;
  populationState.vehicles.forEach((vehicle, index) => {
    if (index % headlightStride !== 0) {
      return;
    }
    drawVehicleHeadlights(context, vehicle);
  });
  towTruckState.trucks.forEach((truck) => {
    drawVehicleHeadlights(context, truck);
  });

  if (isPlayerVehicleEngineStarted()) {
    drawVehicleHeadlights(context, {
      bodyOffsetY: activeVehicleConfig.value.id === PLAYER_DANFO.id ? danfoBodyMotion.offsetY : 0,
      x: player.x,
      y: player.y,
      rotation: player.rotation,
      previousX: player.previousX,
      previousY: player.previousY,
      previousRotation: player.previousRotation,
      width: activeVehicleConfig.value.width,
      length: activeVehicleConfig.value.length,
    });
  }
}

function drawPlayerVehicleSignalLights(context) {
  const vehicleConfig = activeVehicleConfig.value;
  const renderTransform =
    getInterpolatedVehicleTransform(player);
  const rearY = vehicleConfig.length / 2 - 5 + (vehicleConfig.id === PLAYER_DANFO.id ? 8 : 0);
  const lampOffset = vehicleConfig.width * 0.3;
  const braking =
    pressedKeys.has("s") ||
    pressedKeys.has("arrowdown");
  const reversing =
    vehicleConfig.gears[player.gearIndex]?.direction < 0;

  if (!braking && !reversing) {
    return;
  }

  context.save();
  context.translate(renderTransform.x, renderTransform.y);
  context.rotate(renderTransform.rotation);
  if (vehicleConfig.id === PLAYER_DANFO.id) context.translate(0, danfoBodyMotion.offsetY);
  context.globalCompositeOperation = "screen";

  if (braking || reversing) {
    const colour = braking
      ? "rgb(255 28 24 / 96%)"
      : "rgb(218 24 22 / 82%)";
    const glow = braking ? 13 : 9;

    [-lampOffset, lampOffset].forEach((lampX) => {
      context.shadowColor = "#ff211c";
      context.shadowBlur = glow;
      context.fillStyle = colour;
      context.beginPath();
      context.arc(lampX, rearY, braking ? 5 : 4, 0, Math.PI * 2);
      context.fill();
    });
  }

  context.restore();
}

function drawSolidVehicleCollisionSpace(
  context,
  collisionShape,
) {
  context.save();
  context.translate(
    collisionShape.x,
    collisionShape.y,
  );
  context.rotate(collisionShape.rotation);
  context.fillRect(
    -collisionShape.width / 2,
    -collisionShape.length / 2,
    collisionShape.width,
    collisionShape.length,
  );
  context.strokeRect(
    -collisionShape.width / 2,
    -collisionShape.length / 2,
    collisionShape.width,
    collisionShape.length,
  );
  context.restore();
}

function getDebugSpriteStatus(vehicle) {
  if (!vehicle.spriteUrl) {
    return "NO SPRITE URL";
  }

  return populationVehicleSprites.has(vehicle.typeId)
    ? "SPRITE LOADED"
    : "SPRITE MISSING";
}

function getTowReportDebugLine(vehicle) {
  const stationaryMinutes = Math.floor(
    vehicle.towStationaryGameMinutes ?? 0,
  );
  const state = vehicle.towReportState ?? "NOT WATCHED";
  const reason = vehicle.towReportReason
    ? ` | ${vehicle.towReportReason}`
    : "";

  return `tow: ${state} ${stationaryMinutes}m${reason}`;
}

function drawVehicleDebugLabel(context, vehicle, collisionBox) {
  const lines = [
    `${vehicle.id ?? "UNKNOWN ID"} | ${vehicle.typeId ?? "UNKNOWN TYPE"}`,
    `route: ${vehicle.routeId ?? "NO ROUTE"}`,
    getDebugSpriteStatus(vehicle),
    getTowReportDebugLine(vehicle),
  ];

  const lineHeight = 15;
  const paddingX = 7;
  const paddingY = 5;
  const labelX = collisionBox.x + collisionBox.width / 2;
  const labelBottom = collisionBox.y - 8;

  context.save();
  context.font = "12px monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";

  const widestLine = Math.max(
    ...lines.map((line) => context.measureText(line).width),
  );
  const plateWidth = widestLine + paddingX * 2;
  const plateHeight = lines.length * lineHeight + paddingY * 2;
  const plateX = labelX - plateWidth / 2;
  const plateY = labelBottom - plateHeight;

  context.fillStyle = "rgb(0 0 0 / 82%)";
  context.strokeStyle = "#00b7ff";
  context.lineWidth = 2;
  context.fillRect(plateX, plateY, plateWidth, plateHeight);
  context.strokeRect(plateX, plateY, plateWidth, plateHeight);

  lines.forEach((line, index) => {
    context.fillStyle =
      index === 2 && line !== "SPRITE LOADED"
        ? "#ff6464"
        : index === 3 &&
            (
              line.includes("REPORTED") ||
              line.includes("TOW ASSIGNED") ||
              line.includes("SUSPECTED STUCK")
            )
          ? "#ffb347"
          : "#ffffff";
    context.fillText(
      line,
      labelX,
      plateY + paddingY + lineHeight * (index + 0.5),
    );
  });

  context.restore();
}

function drawCollisionSpace(context) {
  if (!showCollisionSpace.value) {
    return;
  }

  context.save();
  context.fillStyle = "rgb(0 183 255 / 34%)";
  context.strokeStyle = "#00b7ff";
  context.lineWidth = 4;

  obstacles.forEach((obstacle) => {
    if (!isVisible(obstacle)) {
      return;
    }

    if (obstacle.shape === "circle") {
      context.beginPath();
      context.arc(
        obstacle.x + obstacle.width / 2,
        obstacle.y + obstacle.height / 2,
        Math.min(obstacle.width, obstacle.height) / 2,
        0,
        Math.PI * 2,
      );
      context.fill();
      context.stroke();
      return;
    }

    context.fillRect(
      obstacle.x,
      obstacle.y,
      obstacle.width,
      obstacle.height,
    );
    context.strokeRect(
      obstacle.x,
      obstacle.y,
      obstacle.width,
      obstacle.height,
    );
  });

  populationState.vehicles.forEach((vehicle) => {
    const collisionBox =
      getPopulationVehicleCollisionBox(vehicle);

    if (!isVisible(collisionBox)) {
      return;
    }

    drawSolidVehicleCollisionSpace(
      context,
      getPopulationVehicleCollisionShape(vehicle),
    );
    drawVehicleDebugLabel(context, vehicle, collisionBox);
  });
  const playerCollisionBox = getVehicleCollisionBox(
    player,
    activeVehicleConfig.value,
  );

  if (isVisible(playerCollisionBox)) {
    drawSolidVehicleCollisionSpace(
      context,
      getVehicleCollisionShape(
        player,
        activeVehicleConfig.value,
      ),
    );
  }

  context.strokeRect(
    0,
    0,
    WORLD_WIDTH,
    WORLD_HEIGHT,
  );
  context.restore();
}

function drawPlayerDanfo(context) {
  const vehicleConfig = activeVehicleConfig.value;
  const collisionBox = getVehicleCollisionBox(
    player,
    vehicleConfig,
  );

  if (!isVisible(collisionBox)) {
    return;
  }

  const renderTransform =
    getInterpolatedVehicleTransform(player);
  context.save();
  context.translate(renderTransform.x, renderTransform.y);
  context.rotate(renderTransform.rotation);

  const shadowScale = vehicleConfig.spriteRenderScale ?? 1.22;
  drawVehicleGroundShadow(context, vehicleConfig.width * shadowScale, vehicleConfig.length * shadowScale);
  if (vehicleConfig.id === PLAYER_DANFO.id) {
    context.translate(0, danfoBodyMotion.offsetY);
  }

  const activeSprite =
    vehicleConfig.id === PLAYER_DANFO.id
      ? playerDanfoSprite
      : purchasedVehicleSprites.get(vehicleConfig.id);

  if (
    vehicleConfig.id !== PLAYER_DANFO.id &&
    !activeSprite &&
    vehicleConfig.spriteUrl
  ) {
    requestMappedCanvasImage({
      source: vehicleConfig.spriteUrl,
      target: purchasedVehicleSprites,
      key: vehicleConfig.id,
    });
  }

  if (activeSprite) {
    const spriteScale = vehicleConfig.spriteRenderScale ?? 1.22;
    const spriteWidth = vehicleConfig.width * spriteScale;
    const spriteLength = vehicleConfig.length * spriteScale;

    drawCustomizedVehicle(context, activeSprite, vehicleConfig, customizationState.vehicles[vehicleConfig.id] ?? {}, spriteWidth, spriteLength);

    if (player.isColliding && showGrid.value) {
      context.strokeStyle = "#ff3b30";
      context.lineWidth = 4;
      context.strokeRect(
        -vehicleConfig.width / 2,
        -vehicleConfig.length / 2,
        vehicleConfig.width,
        vehicleConfig.length,
      );
    }

    context.restore();
    return;
  }

  context.fillStyle = vehicleConfig.colour;
  context.strokeStyle = player.isColliding && showGrid.value
    ? "#d63333"
    : vehicleConfig.outlineColour;
  context.lineWidth = 5;

  context.fillRect(
    -vehicleConfig.width / 2,
    -vehicleConfig.length / 2,
    vehicleConfig.width,
    vehicleConfig.length,
  );

  context.strokeRect(
    -vehicleConfig.width / 2,
    -vehicleConfig.length / 2,
    vehicleConfig.width,
    vehicleConfig.length,
  );

  context.fillStyle =
    vehicleConfig.frontMarkerColour;

  context.fillRect(
    -vehicleConfig.width / 2 + 9,
    -vehicleConfig.length / 2 + 9,
    vehicleConfig.width - 18,
    9,
  );

  context.restore();
}

function updateCamera(deltaSeconds) {
  if (observerMode.value) {
    let horizontal = 0;
    let vertical = 0;
    if (pressedKeys.has("a") || pressedKeys.has("arrowleft")) horizontal -= 1;
    if (pressedKeys.has("d") || pressedKeys.has("arrowright")) horizontal += 1;
    if (pressedKeys.has("w") || pressedKeys.has("arrowup")) vertical -= 1;
    if (pressedKeys.has("s") || pressedKeys.has("arrowdown")) vertical += 1;
    camera.x = clamp(camera.x + horizontal * observerPanSpeed * deltaSeconds, WORLD_MIN_X, WORLD_MAX_X - CAMERA_WIDTH);
    camera.y = clamp(camera.y + vertical * observerPanSpeed * deltaSeconds, WORLD_MIN_Y, WORLD_MAX_Y - CAMERA_HEIGHT);
    return;
  }

  const targetX = clamp(
    player.x - CAMERA_WIDTH / 2,
    WORLD_MIN_X,
    WORLD_MAX_X - CAMERA_WIDTH,
  );

  const targetY = clamp(
    player.y - CAMERA_HEIGHT / 2,
    WORLD_MIN_Y,
    WORLD_MAX_Y - CAMERA_HEIGHT,
  );

  const followAmount =
    1 - Math.exp(-9 * deltaSeconds);

  camera.x +=
    (targetX - camera.x) * followAmount;

  camera.y +=
    (targetY - camera.y) * followAmount;
}

function renderMap() {
  const canvas = canvasReference.value;

  if (!canvas) {
    return;
  }

  const context =
    canvas.getContext("2d");

  if (!context) {
    return;
  }

  const pixelRatio = viewport.pixelRatio;
  const scale = viewport.scale;
  const offsetX = viewport.offsetX;
  const offsetY = viewport.offsetY;
  const renderCameraX = interpolateValue(
    camera.previousX,
    camera.x,
  );
  const renderCameraY = interpolateValue(
    camera.previousY,
    camera.y,
  );

  context.setTransform(
    1,
    0,
    0,
    1,
    0,
    0,
  );

  context.clearRect(
    0,
    0,
    canvas.width,
    canvas.height,
  );

  context.fillStyle = "#111418";

  context.fillRect(
    0,
    0,
    canvas.width,
    canvas.height,
  );

  context.setTransform(
    pixelRatio * scale,
    0,
    0,
    pixelRatio * scale,
    pixelRatio *
      (offsetX - renderCameraX * scale),
    pixelRatio *
      (offsetY - renderCameraY * scale),
  );

  drawStaticMapLayer(context);
  drawTowTruckBases(context);

  if (showGrid.value) {
    labelledLandmarks.forEach((building) => {
      drawBuildingLabel(context, building);
    });
  }


  drawWorldDestinationIndicators(context);
  drawPopulationVehicles(context);
  drawMutiuStreetRace(context);
  drawTowTrucks(context);
  drawActiveStopZone(context);
  drawPlayerDanfo(context);
  drawElevatedBridgeLayer(context);
  drawNightOverlay(context);
  drawAllVehicleHeadlights(context);
  drawPlayerVehicleSignalLights(context);
  drawCollisionSpace(context);
  drawRouteProposals(context);
  drawTrafficSpawnPoints(context);
  drawWorldGrid(context);
}

function resizeCanvas() {
  const canvas = canvasReference.value;

  if (!canvas) {
    return;
  }

  const dimensions = getCameraDimensions(window.matchMedia("(pointer: coarse)").matches);
  if (CAMERA_WIDTH !== dimensions.width || CAMERA_HEIGHT !== dimensions.height) {
    CAMERA_WIDTH = dimensions.width;
    CAMERA_HEIGHT = dimensions.height;
    camera.x = clamp(player.x - CAMERA_WIDTH / 2, WORLD_MIN_X, WORLD_MAX_X - CAMERA_WIDTH);
    camera.y = clamp(player.y - CAMERA_HEIGHT / 2, WORLD_MIN_Y, WORLD_MAX_Y - CAMERA_HEIGHT);
    camera.previousX = camera.x;
    camera.previousY = camera.y;
  }

  const bounds = canvas.getBoundingClientRect();

  const pixelRatio = Math.min(
    window.devicePixelRatio || 1,
    getRenderPixelRatioLimit(
      performanceMonitor.adaptiveScale,
    ),
  );
  const scale = Math.min(
    bounds.width / CAMERA_WIDTH,
    bounds.height / CAMERA_HEIGHT,
  );
  const renderedWidth = CAMERA_WIDTH * scale;
  const renderedHeight = CAMERA_HEIGHT * scale;

  viewport.width = bounds.width;
  viewport.height = bounds.height;
  viewport.scale = scale;
  viewport.offsetX = (bounds.width - renderedWidth) / 2;
  viewport.offsetY = (bounds.height - renderedHeight) / 2;
  viewport.pixelRatio = pixelRatio;

  canvas.width = Math.round(
    bounds.width * pixelRatio,
  );

  canvas.height = Math.round(
    bounds.height * pixelRatio,
  );
  // A paused world needs one redraw after resize, not a permanent frame loop.
  if (props.paused) {
    renderMap();
    pausedFrameRendered = true;
  }
}

function updateServiceModalAvailability() {
  const service =
    nearbyBankParking.value
      ? { id: nearbyBankParking.value.id, type: "bank" }
      : nearbyFuelPump.value
      ? { id: nearbyFuelPump.value.id, type: "fuel" }
      : nearbyHealthService.value
        ? { id: nearbyHealthService.value.id, type: "health" }
        : nearbyFoodService.value
          ? { id: nearbyFoodService.value.id, type: "food" }
      : nearbyDealership.value
          ? { id: nearbyDealership.value.id, type: "dealership" }
        : nearbyEstateAgency.value
          ? { id: nearbyEstateAgency.value.id, type: "estate-agency" }
        : nearbyBusinessOffice.value
          ? { id: nearbyBusinessOffice.value.id, type: "business-office" }
        : nearbyRaceCircuit.value
          ? { id: nearbyRaceCircuit.value.id, type: "race-circuit" }
          : null;

  if (!service) {
    currentServiceZoneId = null;
    return;
  }

  if (
    !activeServiceModal.value &&
    serviceSpeedAllowed.value &&
    currentServiceZoneId !== service.id
  ) {
    pressedKeys.clear();
    player.speed = 0;
    currentServiceZoneId = service.id;
    activeServiceModal.value = service.type;
    if (service.type === "estate-agency") {
      handleObjectiveEvent("estate-agency-visited");
    } else if (service.type === "business-office") {
      handleObjectiveEvent("business-office-visited");
    }
  }
}

function closeServiceModal() {
  activeServiceModal.value = null;
}

function replaceMapArray(target, source) {
  target.splice(0, target.length, ...source);
}

function applyWorldMapData(mapData) {
  replaceMapArray(districts, mapData.districts);
  replaceMapArray(roads, mapData.roads);
  replaceMapArray(barriers, mapData.barriers);
  replaceMapArray(landmarks, mapData.landmarks);
  replaceMapArray(buildings, mapData.buildings);
  replaceMapArray(
    obstacles,
    mapData.id === "mainland"
      ? mapData.obstacles
      : [...mapData.obstacles, ...edgeBorderTiles],
  );
  replaceMapArray(busStops, mapData.busStops);
  replaceMapArray(fuelPumps, mapData.fuelPumps);
  replaceMapArray(repairZones, mapData.repairZones);
  replaceMapArray(
    beachParkingZones,
    mapData.beachParkingZones ?? [],
  );
  replaceMapArray(bankParkingZones, mapData.bankParkingZones);
  replaceMapArray(
    dealershipParkingZones,
    mapData.dealershipParkingZones,
  );
  replaceMapArray(
    estateAgencyParkingZones,
    mapData.estateAgencyParkingZones,
  );
  replaceMapArray(
    businessOfficeParkingZones,
    mapData.businessOfficeParkingZones,
  );
  replaceMapArray(homeParkingZones, mapData.homeParkingZones);
  replaceMapArray(healthParkingZones, mapData.healthParkingZones);
  replaceMapArray(foodParkingZones, mapData.foodParkingZones);
  replaceMapArray(mapTravelZones, mapData.mapTravelZones);
  replaceMapArray(raceZones, mapData.raceZones ?? []);
  replaceMapArray(
    labelledLandmarks,
    mapData.buildings.filter((building) => building.isLandmark),
  );
  replaceMapArray(staticServiceZones, [
    ...mapData.fuelPumps,
    ...mapData.repairZones,
    ...(mapData.beachParkingZones ?? []),
    ...mapData.bankParkingZones,
    ...mapData.dealershipParkingZones,
    ...mapData.estateAgencyParkingZones,
    ...mapData.businessOfficeParkingZones,
    ...mapData.homeParkingZones,
    ...mapData.healthParkingZones,
    ...mapData.foodParkingZones,
    ...mapData.mapTravelZones,
    ...(mapData.raceZones ?? []),
  ]);
  Object.assign(playerStart, mapData.playerStart);
  rebuildObstacleSpatialIndex();
  staticMapTiles.clear();
}



function handleMapTravel() {
  pressedKeys.clear();
  player.speed = 0;
  saveActiveVehicleCondition();
  emit("return-mainland", {
    id: activeVehicleConfig.value.id,
    fuel: hudState.fuel,
    damage: hudState.damage,
    gearIndex: player.gearIndex,
    health: playerStatus.health,
    energy: playerStatus.energy,
    money: economyState.money,
    currentDay: gameClock.day,
    minuteOfDay: gameClock.minuteOfDay,
    ownedVehicleIds: [...economyState.ownedVehicleIds],
    economyState: JSON.parse(JSON.stringify(economyState)),
    bankSavingsState: JSON.parse(JSON.stringify(bankSavingsState)),
    stockMarketState: JSON.parse(JSON.stringify(stockMarketState)),
    travelCrimeState: { ...crimeState },
    travelPropertyState: JSON.parse(JSON.stringify(propertyState)),
    travelLifeState: JSON.parse(JSON.stringify(lifeObligationState)),
    customizationState: JSON.parse(JSON.stringify(customizationState)),
  });
}



function handleDebugGoToCoastalCity() {
  showGrid.value = true;
  observerMode.value = false;
  centreCameraOnPlayer();
}

function handleDebugStartRace() {
  // Street racing is intentionally deferred until the city road layout is
  // approved. There is no dedicated circuit in World 2.
}

function moveToActiveHome() {
  const homeZone = activeHomeParkingZone.value;
  if (!homeZone || sleepState.overlayVisible) return;
  pressedKeys.clear();
  player.speed = 0;
  player.isParked = true;
  stopPlayerVehicleEngine();
  sleepState.overlayVisible = true;
  sleepState.overlayFading = false;
  window.clearTimeout(sleepWarmupTimer);
  window.clearTimeout(sleepFadeTimer);
  sleepWarmupTimer = window.setTimeout(() => {
    player.x = homeZone.x + homeZone.width / 2;
    player.y = homeZone.y + homeZone.height / 2;
    player.rotation = playerStart.rotation;
    player.previousX = player.x;
    player.previousY = player.y;
    player.previousRotation = player.rotation;
    centreCameraOnPlayer();
    sleepState.overlayFading = true;
    sleepFadeTimer = window.setTimeout(() => {
      sleepState.overlayVisible = false;
      sleepState.overlayFading = false;
    }, 320);
  }, 360);
}

function openSleepModal() {
  if (
    nearbyHomeParking.value &&
    serviceSpeedAllowed.value &&
    !sleepState.overlayVisible
  ) {
    pressedKeys.clear();
    player.speed = 0;
    sleepState.modalOpen = true;
  }
}

function handleSoundSettingsChange(settings) {
  const updatedSettings =
    setPlayerVehicleAudioSettings(settings);

  soundVolume.value = updatedSettings.volume;
  soundMuted.value = updatedSettings.muted;
  refreshMusicVolume();
}

function updateGameSimulation(deltaSeconds) {
  if (worldTransition.active || mutiuEncounter.mode) {
    pressedKeys.clear();
    player.speed = 0;
  }
  player.previousX = player.x;
  player.previousY = player.y;
  player.previousRotation = player.rotation;
  camera.previousX = camera.x;
  camera.previousY = camera.y;

  const elapsedGameMinutes =
    deltaSeconds * GAME_TIME_CONFIG.gameMinutesPerRealSecond;

  updatePlayerEnergy({
    status: playerStatus,
    elapsedGameMinutes,
    absoluteGameMinute:
      getAbsoluteGameMinute(gameClock) + elapsedGameMinutes,
    config: PLAYER_STATUS_CONFIG,
  });

  if (
    !economyState.gameOver &&
    isPlayerVehicleEngineStarted()
  ) {
    hudState.fuel = clamp(
      hudState.fuel -
        DANFO_ECONOMY_CONFIG.fuelIdleConsumptionPerSecond *
          deltaSeconds,
      0,
      100,
    );

    if (hudState.fuel <= 0) {
      stopPlayerVehicleEngine();
    }
  }

  const playerCollisionBox = getVehicleCollisionShape(
    player,
    activeVehicleConfig.value,
  );

  trafficSimulationAccumulator += deltaSeconds;
  const shouldUpdateTraffic =
    trafficSimulationAccumulator + 0.000001 >=
    TRAFFIC_SIMULATION_STEP;

  if (shouldUpdateTraffic) {
    const trafficDeltaSeconds = Math.min(
      trafficSimulationAccumulator,
      MAX_FRAME_DELTA_SECONDS,
    );
    trafficSimulationAccumulator = 0;

    updateTrafficLights(
      trafficLightState,
      trafficDeltaSeconds,
    );
    updateHighwayLights(
      highwayLightState,
      trafficDeltaSeconds,
    );

    activeTowTruckBuffer.length = 0;
    towTruckState.trucks.forEach((truck) => {
      if (truck.status !== "parked") {
        activeTowTruckBuffer.push(truck);
      }
    });

    const trafficScale = performanceMonitor.trafficScale;
    populationPlayerProxy.x = player.x;
    populationPlayerProxy.y = player.y;
    populationPlayerProxy.width = activeVehicleConfig.value.width;
    populationPlayerProxy.length = activeVehicleConfig.value.length;
    populationPlayerProxy.rotation = player.rotation;
    populationPlayerProxy.speed = Math.abs(player.speed ?? 0);
    populationViewPosition.x = camera.x + CAMERA_WIDTH / 2;
    populationViewPosition.y = camera.y + CAMERA_HEIGHT / 2;
    runtimeTrafficConfig.initialVehicleCount = Math.round(
      POPULATION_TRAFFIC_CONFIG.initialVehicleCount * trafficScale,
    );
    runtimeTrafficConfig.overnightVehicleCount = Math.round(
      POPULATION_TRAFFIC_CONFIG.overnightVehicleCount * trafficScale,
    );
    runtimeTrafficConfig.morningRushVehicleCount = Math.round(
      POPULATION_TRAFFIC_CONFIG.morningRushVehicleCount * trafficScale,
    );
    runtimeTrafficConfig.daytimeVehicleCount = Math.round(
      POPULATION_TRAFFIC_CONFIG.daytimeVehicleCount * trafficScale,
    );
    runtimeTrafficConfig.eveningRushVehicleCount = Math.round(
      POPULATION_TRAFFIC_CONFIG.eveningRushVehicleCount * trafficScale,
    );

    if (!streetRaceIsRunning()) {
      try {
        updatePopulationTraffic({
          state: populationState,
          routes: activePopulationRoutes.value,
          vehicleTypes: POPULATION_VEHICLE_TYPES,
          minuteOfDay: gameClock.minuteOfDay,
          trafficPeriod: currentTrafficPeriod.value,
          deltaSeconds: trafficDeltaSeconds,
          player: populationPlayerProxy,
          viewPosition: populationViewPosition,
          externalVehicles: activeTowTruckBuffer,
          playerCollisionBox,
          canOccupyWorld: canPopulationVehicleOccupy,
          trafficLights: TRAFFIC_LIGHTS,
          trafficLightState,
          trafficLightConfig: TRAFFIC_LIGHT_CONFIG,
          highwayLights: HIGHWAY_LIGHTS,
          highwayLightState,
          highwayLightConfig: HIGHWAY_LIGHT_CONFIG,
          busStops,
          config: runtimeTrafficConfig,
        });
        updateAiTrafficHorns(trafficDeltaSeconds);
        trafficUpdateErrorLogged = false;
      } catch (error) {
        if (!trafficUpdateErrorLogged) {
          console.error("Population traffic update failed", error);
          trafficUpdateErrorLogged = true;
        }
      }

      updateTowTrucks({
        state: towTruckState,
        trafficState: populationState,
        roads,
        trafficLights: ALL_SIGNAL_LIGHTS,
        playerCollisionBox,
        canOccupyWorld: canVehicleOccupy,
        deltaSeconds: trafficDeltaSeconds,
        config: TOW_TRUCK_CONFIG,
        gameClock,
        viewBounds: {
          x: camera.x,
          y: camera.y,
          width: CAMERA_WIDTH,
          height: CAMERA_HEIGHT,
        },
      });
    }
  }

  if (!economyState.gameOver) {
    // The player is always controlled by keyboard input.
    // Route selection must never lock player movement.
    if (!observerMode.value && !activeServiceModal.value) {
      const fuelDepleted = hudState.fuel <= 0;
      const vehicleDisabled =
        hudState.damage >= 100 ||
        playerStatus.health <= 0 ||
        playerStatus.energy <= 0 ||
        fineState.vehicleImpounded ||
        sleepState.overlayVisible;

      if (illegalStreetRaceState.status === "countdown") {
        player.speed = 0;
      } else if (fuelDepleted && Math.abs(player.speed) > 0.1) {
        stopPlayerVehicleEngine();
        updatePlayerVehicle({
          vehicle: player,
          pressedKeys: EMPTY_PLAYER_INPUT,
          deltaSeconds,
          config: activeVehicleConfig.value,
          canOccupy: canPlayerOccupy,
        });
      } else if (vehicleDisabled || fuelDepleted) {
        player.speed = 0;
        stopPlayerVehicleEngine();
      } else if (!isPlayerVehicleEngineStarted()) {
        // START / I controls ignition. Throttle cannot move the vehicle until
        // the engine has started (including any damage retries).
        player.speed = 0;
      } else {
        const previousPlayerX = player.x;
        const previousPlayerY = player.y;
        const impactSpeedKmh = displayedSpeed.value;
        playerTrafficCollisionDetected = false;
        const movementResult = updatePlayerVehicle({
          steeringBias: intoxicationSteering(player, playerStatus, deltaSeconds),
          vehicle: player,
          pressedKeys,
          deltaSeconds,
          config: activeVehicleConfig.value,
          canOccupy: canPlayerOccupy,
        });
        const distanceTravelled = Math.hypot(
          player.x - previousPlayerX,
          player.y - previousPlayerY,
        );

        if (distanceTravelled > 0.01) {
          if (isDrivingDanfo.value) {
            vehicleState.lastDanfoDrivenDay = gameClock.day;
          } else if (isDrivingBrt.value) {
            vehicleState.lastBrtDrivenDay = gameClock.day;
          }
        }

        if (!streetRaceIsRunning()) {
          processPlayerTrafficLightViolations(
            {
              x: previousPlayerX,
              y: previousPlayerY,
            },
            {
              x: player.x,
              y: player.y,
            },
          );
        }
        updateDriverLicenceTestProgress();

        if (
          movementResult.collided &&
          playerTrafficCollisionDetected &&
          !trafficCollisionFineActive
        ) {
          issueOutstandingFine({
            state: fineState,
            amount: DANFO_ECONOMY_CONFIG.vehicleCollisionFine,
            label: "Vehicle collision fine",
            gameDay: gameClock.day,
            gameTime: displayedGameTime.value,
          });
          addCrime(crimeState, "collision");
          recordDriverLicenceCollision(driverLicenceState);
          trafficCollisionFineActive = true;
        } else if (!movementResult.collided) {
          trafficCollisionFineActive = false;
          motoEaziCollisionActive = false;
        }

        if (movementResult.collided) {
          if (!motoEaziCollisionActive) {
            recordMotoEaziCollision(motoEaziState);
            motoEaziCollisionActive = true;
          }

          if (routeState.status === "active") {
            routeCareerState.collisionDuringRoute = true;
          }

          playPlayerVehicleHitSound();
          if (impactSpeedKmh >= 20) {
            playGameSound("tyreSkid", {
              loop: false,
              cooldownMilliseconds: 900,
            });
          }

          if (playerTrafficCollisionDetected) {
            hornNearestAiVehicleAfterCollision();
          }
        }

        hudState.fuel = clamp(
          hudState.fuel -
            distanceTravelled *
              DANFO_ECONOMY_CONFIG.fuelConsumptionPerWorldUnit,
          0,
          100,
        );

        if (hudState.fuel <= 0) {
      stopPlayerVehicleEngine();
    }

        if (movementResult.damage > 0) {
          applyCollisionHealthLoss({
            status: playerStatus,
            collisionDamage: movementResult.damage,
            maximumCollisionDamage:
              activeVehicleConfig.value.collisionDamageMaximum,
            config: PLAYER_STATUS_CONFIG,
          });

          hudState.damage = clamp(
            hudState.damage + movementResult.damage,
            0,
            100,
          );

          if (hudState.damage >= 100) {
            player.speed = 0;
            stopPlayerVehicleEngine();
          }
        }
      }
    }

    updatePlayerVehicleEngineSound(
      player.speed,
      activeVehicleMaximumSpeed.value,
      pressedKeys.has("w") ||
        pressedKeys.has("arrowup") ||
        (
          activeVehicleConfig.value
            .gears[player.gearIndex]?.direction < 0 &&
          (
            pressedKeys.has("s") ||
            pressedKeys.has("arrowdown")
          )
        ),
      deltaSeconds,
    );

    updateServiceModalAvailability();

    if (!nearbyHomeParking.value) {
      homeParkingProcessed = false;
    } else if (
      serviceSpeedAllowed.value &&
      !homeParkingProcessed
    ) {
      if (
        economyState.selectedPrivateVehicleId &&
        vehicleState.activeVehicleId !==
          economyState.selectedPrivateVehicleId
      ) {
        switchPlayerVehicle(economyState.selectedPrivateVehicleId);
      }
      homeParkingProcessed = true;
      handleObjectiveEvent("home-arrived");
    }

    const previousDay = gameClock.day;

    updateGameClock(
      gameClock,
      deltaSeconds,
      GAME_TIME_CONFIG,
    );

    updateMutiuEncounter({
      state: mutiuEncounter,
      day: gameClock.day,
      minuteOfDay: gameClock.minuteOfDay,
      deltaSeconds,
      blocked:
        props.paused ||
        worldTransition.active ||
        Boolean(activeServiceModal.value) ||
        Boolean(phoneCallState.activeCall) ||
        sleepState.overlayVisible ||
        economyState.gameOver ||
        raceState.status === "active" ||
        streetRaceIsRunning(),
    });

    updatePhoneCallScheduler({
      state: phoneCallState,
      deltaSeconds,
      playerSpeed: player.speed,
      engineStarted: isPlayerVehicleEngineStarted(),
      blocked:
        props.paused ||
        worldTransition.active ||
        Boolean(activeServiceModal.value) ||
        sleepState.overlayVisible ||
        economyState.gameOver ||
        raceState.status === "active" ||
        streetRaceIsRunning() ||
        mutiuEncounter.mode === "introduction",
      context: {
        currentDay: gameClock.day,
        currentJob: employmentState.selectedJob,
        motoEaziActive:
          motoEaziState.stage !== "idle",
        quickLoanBalance: economyState.quickLoanBalance,
        bankLoanBalance: economyState.bankLoanBalance,
      },
    });

    if (gameClock.day !== previousDay) {
      offerBankLoan({
        economyState,
        currentDay: gameClock.day,
        config: DANFO_ECONOMY_CONFIG,
      });
      processBankSavingsDay(bankSavingsState, gameClock.day);
      processStockMarketUpdate();
      maybeOfferBankColdCall();

      const danfoFeesDue =
        isDrivingDanfo.value ||
        vehicleState.lastDanfoDrivenDay === previousDay;
      const brtTaxDue =
        isDrivingBrt.value ||
        vehicleState.lastBrtDrivenDay === previousDay;

      if (danfoFeesDue) {
        processDailyGarageFees({
          economyState,
          currentDay: gameClock.day,
          config: DANFO_ECONOMY_CONFIG,
        });
      } else if (brtTaxDue) {
        processDailyBrtTax({
          economyState,
          currentDay: gameClock.day,
          config: DANFO_ECONOMY_CONFIG,
        });
      } else {
        // Private-car and no-driving days are settled without Danfo/BRT fees,
        // so choosing a driving job later cannot charge those days retroactively.
        economyState.lastProcessedDay = Math.max(
          economyState.lastProcessedDay,
          gameClock.day,
        );
      }

      processCurrentLifeObligations();
      processCurrentPropertyMortgage();
      processCurrentRentalIncome();
      processCurrentBusinessIncome();

      if (economyState.gameOver) {
        pressedKeys.clear();
        player.speed = 0;
      }
    }

    recordCoastalMapProgress();
    updatePlayerBridgeState();
    updateActiveRace(deltaSeconds);
    updateMutiuStreetRace(deltaSeconds);

    const routeEvent =
      economyState.gameOver ||
      !employmentState.selectedJob ||
      routeState.status !== "active"
        ? null
        : updateDanfoRoute({
            routeState,
            routes: availableRoutes.value,
            busStops,
            vehicle: player,
            speedKmh: displayedSpeed.value,
            deltaSeconds,
            config: DANFO_ROUTE_CONFIG,
          });

    if (routeEvent) {
      const passengerResult = processDanfoStop({
        passengerState,
        route: routeEvent.route,
        stop: routeEvent.stop,
        stopIndex: routeEvent.stopIndex,
        config: activePassengerConfig.value,
      });
      const stopSoundSequence = ["busStopArrival"];
      if (passengerResult.exitedCount > 0) {
        stopSoundSequence.push("passengerAlight");
      }
      if (passengerResult.boardedCount > 0) {
        stopSoundSequence.push("passengerBoard");
      }
      if (
        employmentState.selectedJob === "danfo" &&
        passengerResult.fareEarned > 0
      ) {
        stopSoundSequence.push("fareCollected");
      }
      if (routeEvent.type === "route-complete") {
        stopSoundSequence.push("routeComplete");
      }
      playGameSoundSequence(stopSoundSequence);

      if (passengerResult.boardedCount > 0) {
        handleObjectiveEvent(
          employmentState.selectedJob === "brt"
            ? "brt-passenger-boarded"
            : "danfo-passenger-boarded",
          passengerResult.boardedCount,
        );
        handleObjectiveEvent(
          "passenger-boarded",
          passengerResult.boardedCount,
        );
      }

      if (employmentState.selectedJob === "danfo") {
        const payment = chargeAgberoPickup({
          economyState, currentDay: gameClock.day,
          boardedCount: passengerResult.boardedCount, config: DANFO_ECONOMY_CONFIG,
        });
        if (payment) agberoPayment.value = { ...payment, id: ++agberoPaymentSequence };
        addPassengerFare(
          economyState,
          passengerResult.fareEarned,
        );
        handleObjectiveEvent(
          "income-earned",
          passengerResult.fareEarned,
        );
      }

      if (routeEvent.type === "route-complete") {
        handleObjectiveEvent("route-completed");
        handleObjectiveEvent(
          employmentState.selectedJob === "brt"
            ? "brt-route-completed"
            : "danfo-route-completed",
        );

        if (!routeCareerState.collisionDuringRoute) {
          handleObjectiveEvent("safe-route-completed");
        }

        if (
          !routeCareerState.collisionDuringRoute &&
          !routeCareerState.trafficViolationDuringRoute
        ) {
          handleObjectiveEvent("clean-route-completed");
        }

        if (playerStatus.energy >= 25) {
          handleObjectiveEvent("energy-safe-route-completed");
        }

        if (
          fineState.outstandingAmount <
          PLAYER_WARNING_CONFIG.fineAmount
        ) {
          handleObjectiveEvent("fine-safe-route-completed");
        }

        if (
          gameClock.minuteOfDay >= 18 * 60 ||
          gameClock.minuteOfDay < 6 * 60
        ) {
          handleObjectiveEvent("night-route-completed");
        }

        if (employmentState.selectedJob === "brt") {
          const brtSalary = getBrtRouteSalary(routeEvent.route, busStops);
          creditIncome({
            economyState,
            amount: brtSalary,
            type: "brt-salary",
            label: `BRT SALARY · ${routeEvent.route.name}`,
            config: DANFO_ECONOMY_CONFIG,
          });
          economyState.lastRouteBonus = brtSalary;
          handleObjectiveEvent(
            "income-earned",
            brtSalary,
          );
        } else {
          economyState.lastRouteBonus = 0;
        }

        recordHomeArrival();
      }
    }

    if (
      !isDrivingDanfo.value &&
      !isDrivingBrt.value
    ) {
      updateMotoEaziOffers({
        state: motoEaziState,
        requests: MOTO_EAZI_REQUESTS,
        deltaSeconds,
      });
      const motoEaziEvent = updateMotoEaziJob({
        state: motoEaziState,
        vehicle: player,
        speedKmh: displayedSpeed.value,
        deltaSeconds,
      });

      if (motoEaziEvent?.type === "request-complete") {
        activeObjectiveNotice.value = {
          title: `${motoEaziEvent.stars} STAR RIDE · Rating ${motoEaziEvent.driverRating.toFixed(1)}`,
          noticeLabel: "MOTO EAZI COMPLETE",
        };
        playGameSound(motoEaziEvent.stars >= 4 ? "confirm" : "warning");
        if (objectiveNoticeTimer !== null) window.clearTimeout(objectiveNoticeTimer);
        objectiveNoticeTimer = window.setTimeout(() => {
          activeObjectiveNotice.value = null;
          objectiveNoticeTimer = null;
        }, 4200);
        addMotoEaziFare(
          economyState,
          motoEaziEvent.fare,
        );
        handleObjectiveEvent(
          "income-earned",
          motoEaziEvent.fare,
        );
      }
    }
  }

  updatePassengerFeedback(
    passengerState,
    deltaSeconds,
  );

  updateEconomyFeedback(
    economyState,
    deltaSeconds,
  );

  updateCamera(deltaSeconds);

  if (shouldUpdateTraffic) {
    lightOverlayCamera.x = camera.x;
    lightOverlayCamera.y = camera.y;
  }
}

function animationLoop(timestamp) {
  animationFrameId = null;
  const frameWorkStartedAt = performance.now();
  const frameDeltaSeconds = Math.min(
    Math.max(0, (timestamp - previousTimestamp) / 1000),
    MAX_FRAME_DELTA_SECONDS,
  );
  previousTimestamp = timestamp;

  if (props.paused) {
    simulationAccumulator = 0;
    trafficSimulationAccumulator = 0;
    renderInterpolationAlpha = 1;
    trafficRenderInterpolationAlpha = 1;
    if (!pausedFrameRendered) {
      renderMap();
      pausedFrameRendered = true;
    }
    return;
  }

  pausedFrameRendered = false;
  simulationAccumulator += frameDeltaSeconds;

  const simulationStartedAt = performance.now();
  let simulationStepCount = 0;
  while (
    simulationAccumulator >= FIXED_SIMULATION_STEP &&
    simulationStepCount < MAX_SIMULATION_STEPS_PER_FRAME
  ) {
    updateGameSimulation(FIXED_SIMULATION_STEP);
    simulationAccumulator -= FIXED_SIMULATION_STEP;
    simulationStepCount += 1;
  }

  if (simulationStepCount >= MAX_SIMULATION_STEPS_PER_FRAME) {
    simulationAccumulator = Math.min(
      simulationAccumulator,
      FIXED_SIMULATION_STEP,
    );
  }

  renderInterpolationAlpha = clamp(
    simulationAccumulator / FIXED_SIMULATION_STEP,
    0,
    1,
  );
  trafficRenderInterpolationAlpha = clamp(
    trafficSimulationAccumulator / TRAFFIC_SIMULATION_STEP,
    0,
    1,
  );
  const simulationFinishedAt = performance.now();
  updateDanfoBodyMotion(danfoBodyMotion, frameDeltaSeconds, {
    enabled: !touchMotionQuery.matches && activeVehicleConfig.value.id === PLAYER_DANFO.id,
    speed: player.speed,
    engineOn: isPlayerVehicleEngineStarted(),
    braking: pressedKeys.has("s") || pressedKeys.has("arrowdown"),
  });
  renderMap();
  const renderFinishedAt = performance.now();

  const performanceSampleChanged = recordPerformanceFrame(
    performanceMonitor,
    {
      timestamp,
      frameMs: Math.max(
        frameDeltaSeconds * 1000,
        renderFinishedAt - frameWorkStartedAt,
      ),
      simulationMs:
        simulationFinishedAt - simulationStartedAt,
      renderMs: renderFinishedAt - simulationFinishedAt,
      adaptiveEnabled:
        performanceSettings.adaptivePerformance,
    },
  );

  if (performanceSampleChanged) {
    if (performanceSettings.showPerformanceMonitor && showGrid.value) {
      performanceDisplay.fps = performanceMonitor.fps;
      performanceDisplay.frameMs = performanceMonitor.frameMs;
      performanceDisplay.simulationMs =
        performanceMonitor.simulationMs;
      performanceDisplay.renderMs = performanceMonitor.renderMs;
      performanceDisplay.trafficScale =
        performanceMonitor.trafficScale;
      performanceDisplay.activeVehicles =
        populationState.vehicles.length;
      performanceDisplay.visibleVehicles =
        populationState.vehicles.reduce((count, vehicle) => {
          const bounds = getPopulationVehicleCollisionBox(vehicle);
          return count + Number(isVisible(bounds));
        }, 0);
      performanceDisplay.tileCacheMisses =
        performanceMonitor.tileCacheMisses;
    }
    performanceMonitor.tileCacheMisses = 0;

    if (
      Math.abs(
        appliedAdaptivePixelScale -
          performanceMonitor.adaptiveScale,
      ) >= 0.049
    ) {
      appliedAdaptivePixelScale =
        performanceMonitor.adaptiveScale;
      resizeCanvas();
    }
  }

  animationFrameId =
    window.requestAnimationFrame(
      animationLoop,
    );
}

watch(
  () => props.paused,
  (paused) => {
    if (!paused && animationFrameId === null) {
      animationFrameId = window.requestAnimationFrame(animationLoop);
    }
    pressedKeys.clear();
    simulationAccumulator = 0;
    trafficSimulationAccumulator = 0;
    pausedFrameRendered = false;
    previousTimestamp =
      typeof performance === "undefined"
        ? 0
        : performance.now();

    if (paused) {
      updatePlayerVehicleEngineSound(
        player.speed,
        activeVehicleMaximumSpeed.value,
        false,
      );
    }
  },
);

watch(
  () => performanceSettings.renderQuality,
  () => {
    resizeCanvas();
  },
);

watch(
  () => gameClock.day,
  (currentDay) => {
    updateObjectiveDeadlines({
      state: objectiveState,
      definitions: OBJECTIVE_DEFINITIONS,
      currentDay,
    });
    syncDailyQuestDay(dailyQuestState, currentDay);
  },
);

function handleRouteSelection(routeId) {
  const selectedJobVehicleIsActive =
    (employmentState.selectedJob === "danfo" && isDrivingDanfo.value) ||
    (employmentState.selectedJob === "brt" && isDrivingBrt.value);

  if (
    economyState.gameOver ||
    !employmentState.selectedJob ||
    !selectedJobVehicleIsActive
  ) {
    return;
  }

  const selected = selectDanfoRoute(
    routeState,
    routeId,
    availableRoutes.value,
  );

  if (!selected) {
    return;
  }

  handleObjectiveEvent("route-selected");
  routeCareerState.collisionDuringRoute = false;
  routeCareerState.trafficViolationDuringRoute = false;

  if (
    isPlayerVehicleEngineStarted() ||
    isPlayerVehicleEngineStarting()
  ) {
    handleObjectiveEvent("engine-started");
  }

  // A selected driving route always replaces a previously searched place.
  manualMapDestination.value = null;

  const route = getSelectedRoute(
    routeState,
    availableRoutes.value,
  );

  if (route) {
    startDanfoPassengerRoute({
      passengerState,
      route,
      config: activePassengerConfig.value,
    });
  }
}

function handleChooseAnotherRoute() {
  pressedKeys.clear();
  clearDanfoPassengerRoute(passengerState);
  clearLastRouteBonus(economyState);
  returnToRouteSelection(routeState);
  refreshDanfoRouteOffers();
}

function toggleObserverMode() {
  observerMode.value = !observerMode.value;
  pressedKeys.clear();
  player.speed = 0;
}


function clearSavedState() {
  clearSaveSlot();
  if (typeof window !== "undefined") window.location.reload();
}

function saveGame() {
  if (typeof window === "undefined") {
    return false;
  }

  saveActiveVehicleCondition();
  const world2State = {
    version: 1,
    savedAt: new Date().toISOString(),
    currentMapId: currentMapId.value,
    player: {
      x: player.x,
      y: player.y,
      rotation: player.rotation,
      speed: player.speed,
      gearIndex: player.gearIndex,
    },
    vehicleState: { ...vehicleState },
    hudState: { ...hudState },
    vehicleConditionStates: JSON.parse(
      JSON.stringify(vehicleConditionStates),
    ),
    playerStatus: { ...playerStatus },
    playerInventory: JSON.parse(JSON.stringify(playerInventory)),
    equippedFoodId: equippedFoodId.value,
    crimeState: { ...crimeState },
    gameClock: { ...gameClock },
    routeState: JSON.parse(JSON.stringify(routeState)),
    passengerState: JSON.parse(JSON.stringify(passengerState)),
    economyState: JSON.parse(JSON.stringify(economyState)),
    bankSavingsState: JSON.parse(JSON.stringify(bankSavingsState)),
    stockMarketState: JSON.parse(JSON.stringify(stockMarketState)),
    customizationState: JSON.parse(JSON.stringify(customizationState)),
    fineState: JSON.parse(JSON.stringify(fineState)),
    driverLicenceState: JSON.parse(JSON.stringify(driverLicenceState)),
    objectiveState: JSON.parse(JSON.stringify(objectiveState)),
    dailyQuestState: JSON.parse(JSON.stringify(dailyQuestState)),
    routeCareerState: { ...routeCareerState },
    lifeObligationState: JSON.parse(
      JSON.stringify(lifeObligationState),
    ),
    propertyState: JSON.parse(JSON.stringify(propertyState)),
    businessState: JSON.parse(JSON.stringify(businessState)),
    raceState: JSON.parse(JSON.stringify(raceState)),
    playerBridgeState: { ...playerBridgeState },
    employmentState: { ...employmentState },
    motoEaziState: JSON.parse(JSON.stringify(motoEaziState)),
  };

  try {
    const existingSave = JSON.parse(
      window.localStorage.getItem(getSaveStorageKey()) || "{}",
    );
    window.localStorage.setItem(
      getSaveStorageKey(),
      JSON.stringify({
        ...existingSave,
        version: 1,
        savedAt: world2State.savedAt,
        currentMapId: "coastal-city",
        world2State,
      }),
    );
    window.dispatchEvent(new CustomEvent('tcg:game-saved'));
    return true;
  } catch (error) {
    console.error("Unable to save game", error);
    return false;
  }
}

function restoreSavedGame() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const storedSaveData = JSON.parse(
      window.localStorage.getItem(getSaveStorageKey()),
    );
    const saveData =
      storedSaveData?.world2State ?? storedSaveData;

    if (!saveData || saveData.version !== 1) {
      return false;
    }

    migrateLocationLabels(saveData);
    Object.assign(player, saveData.player ?? {});
    player.previousX = player.x;
    player.previousY = player.y;
    player.previousRotation = player.rotation;
    Object.assign(vehicleState, saveData.vehicleState ?? {});
    Object.assign(hudState, saveData.hudState ?? {});
    if (saveData.vehicleConditionStates) {
      Object.keys(vehicleConditionStates).forEach((vehicleId) => {
        delete vehicleConditionStates[vehicleId];
      });
      Object.assign(
        vehicleConditionStates,
        saveData.vehicleConditionStates,
      );
    } else {
      vehicleConditionStates[vehicleState.activeVehicleId] = {
        fuel: hudState.fuel,
        damage: hudState.damage,
        gearIndex: player.gearIndex,
      };
    }
    Object.assign(playerStatus, saveData.playerStatus ?? {});
    Object.assign(playerInventory, saveData.playerInventory ?? {});
    equippedFoodId.value = saveData.equippedFoodId ?? null;
    Object.assign(gameClock, saveData.gameClock ?? {});
    restoreCrimeState(crimeState, saveData.crimeState);
    Object.assign(routeState, saveData.routeState ?? {});
    Object.assign(passengerState, saveData.passengerState ?? {});
    Object.assign(economyState, { lastAgberoTicketDay: 0, quickLoanInterestRemaining: 0, bankLoanInterestRemaining: 0 }, saveData.economyState ?? {});
    normaliseLoanState(economyState, DANFO_ECONOMY_CONFIG);
    restoreBankSavingsState(
      bankSavingsState,
      saveData.bankSavingsState,
      gameClock.day,
    );
    restoreStockMarketState(stockMarketState, saveData.stockMarketState);
    restoreCustomizationState(customizationState, saveData.customizationState);
    processStockMarketUpdate();
    Object.assign(fineState, saveData.fineState ?? {});
    restoreDriverLicenceState(
      driverLicenceState,
      saveData.driverLicenceState,
    );
    restoreObjectiveState(
      objectiveState,
      saveData.objectiveState,
      OBJECTIVE_DEFINITIONS,
    );
    restoreDailyQuestState(
      dailyQuestState,
      saveData.dailyQuestState,
      gameClock.day,
    );
    Object.assign(
      routeCareerState,
      saveData.routeCareerState ?? {},
    );
    restoreLifeObligationState(
      lifeObligationState,
      saveData.lifeObligationState,
      LIFE_OBLIGATION_CONFIG,
    );
    restorePropertyState(propertyState, saveData.propertyState);
    currentMapId.value = "coastal-city";
    applyWorldMapData(MAINLAND_MAP_DATA);
    restoreBusinessState(
      businessState,
      saveData.businessState,
      gameClock.day,
    );
    restoreRaceState(raceState, saveData.raceState);
    Object.assign(
      playerBridgeState,
      saveData.playerBridgeState ?? {
        bridgeId: null,
        elevation: 0,
        phase: "ground",
      },
    );
    Object.assign(employmentState, saveData.employmentState ?? {});
    restoreMotoEaziState(
      motoEaziState,
      saveData.motoEaziState,
      MOTO_EAZI_REQUESTS,
      gameClock.minuteOfDay,
    );

    if (!saveData.objectiveState) {
      if (employmentState.selectedJob) {
        [
          "welcome-read",
          "find-job-opened",
          "job-selected",
        ].forEach((type) => {
          recordObjectiveEvent({
            state: objectiveState,
            definitions: OBJECTIVE_DEFINITIONS,
            type,
            currentDay: gameClock.day,
          });
        });
      }

      if (routeState.selectedRouteId) {
        [
          "route-selected",
          "engine-started",
        ].forEach((type) => {
          recordObjectiveEvent({
            state: objectiveState,
            definitions: OBJECTIVE_DEFINITIONS,
            type,
            currentDay: gameClock.day,
          });
        });
      }

      if (routeState.status === "complete" || routeState.completedRouteId) {
        recordObjectiveEvent({
          state: objectiveState,
          definitions: OBJECTIVE_DEFINITIONS,
          type: "route-completed",
          currentDay: gameClock.day,
        });
      }
    }

    [
      [hudState.damage >= 60, "high-damage"],
      [
        playerStatus.health <= PLAYER_WARNING_CONFIG.health,
        "low-health",
      ],
      [
        playerStatus.energy <= PLAYER_WARNING_CONFIG.energy,
        "low-energy",
      ],
      [
        fineState.outstandingAmount >= PLAYER_WARNING_CONFIG.fineAmount,
        "high-fines",
      ],
      [
        fineState.vehicleImpounded,
        "vehicle-impounded",
      ],
      [economyState.loanBalance > 0, "loan-taken"],
    ].forEach(([condition, type]) => {
      if (condition) {
        recordObjectiveEvent({
          state: objectiveState,
          definitions: OBJECTIVE_DEFINITIONS,
          type,
          currentDay: gameClock.day,
        });
      }
    });

    if (
      objectiveState.entries["new-arrival-sleep"]?.status === "completed" &&
      activateSchoolFees({
        state: lifeObligationState,
        currentDay: gameClock.day,
        config: LIFE_OBLIGATION_CONFIG,
      })
    ) {
      recordObjectiveEvent({
        state: objectiveState,
        definitions: OBJECTIVE_DEFINITIONS,
        type: "school-fees-requested",
        currentDay: gameClock.day,
      });
    }

    processCurrentLifeObligations();
    processCurrentPropertyMortgage();
    processCurrentRentalIncome();
    processCurrentBusinessIncome();

    camera.x = clamp(
      player.x - CAMERA_WIDTH / 2,
      0,
      Math.max(0, WORLD_WIDTH - CAMERA_WIDTH),
    );
    camera.y = clamp(
      player.y - CAMERA_HEIGHT / 2,
      0,
      Math.max(0, WORLD_HEIGHT - CAMERA_HEIGHT),
    );
    camera.previousX = camera.x;
    camera.previousY = camera.y;
    lightOverlayCamera.x = camera.x;
    lightOverlayCamera.y = camera.y;
    return true;
  } catch (error) {
    console.error("Unable to load saved game", error);
    return false;
  }
}

defineExpose({
  transmission: computed(() => activeVehicleConfig.value.transmission),
  dailyQuests: dailyQuestViews,
  storyObjective: currentTaskPresentation,
  questDay: computed(() => gameClock.day),
  handleTouchInput({ key, down }) {
    const event = { key, repeat: false, preventDefault() {} };
    if (down) handleKeyDown(event);
    else handleKeyUp(event);
  },
  saveGame,
  loadGame: restoreSavedGame,
});

function handleMechanicCall() {
  if (economyState.gameOver) {
    return;
  }

  const result = purchaseRepairs({
    economyState,
    currentDamage: hudState.damage,
    config: DANFO_ECONOMY_CONFIG,
    mobileCallout: true,
  });

  hudState.damage = result.damage;

  if (result.success) {
    handleObjectiveEvent("vehicle-repaired");
    playGameSound("mechanicRepair", { loop: false });
  }
}

function handleFuelAttendantCall() {
  if (economyState.gameOver) return;

  const quote = roadsideFuelQuote.value;
  if (
    quote.deliveredFuelPercent <= 0 ||
    economyState.money < quote.cost
  ) {
    return;
  }

  chargeExpense({
    economyState,
    amount: quote.cost,
    type: "roadside-fuel-delivery",
    label: `ROADSIDE FUEL · ${quote.distanceTiles.toFixed(1)} TILES`,
    config: DANFO_ECONOMY_CONFIG,
  });
  const fuelBeforeDelivery = hudState.fuel;
  hudState.fuel = clamp(
    hudState.fuel + quote.deliveredFuelPercent,
    0,
    100,
  );
  saveActiveVehicleCondition();

  if (fuelBeforeDelivery <= 25) {
    handleObjectiveEvent("low-fuel-refuelled");
  }
  playGameSound("fuelPump", { loop: false });
}

function handleTrafficReport() {
  reportViewportTraffic({
    state: towTruckState,
    trafficState: populationState,
    trafficLights: ALL_SIGNAL_LIGHTS,
    viewBounds: {
      x: camera.x,
      y: camera.y,
      width: CAMERA_WIDTH,
      height: CAMERA_HEIGHT,
    },
  });
  playGameSound("confirm");
}

function purchaseHealthTreatment({
  provider,
  cost,
  type,
  useCoupon = false,
}) {
  const applyCoupon = Boolean(useCoupon) && lifeObligationState.discountCoupons > 0;
  const payableCost = Math.round(cost * (applyCoupon ? 0.5 : 1));
  if (
    playerStatus.health >= PLAYER_STATUS_CONFIG.maximumHealth ||
    economyState.money < payableCost
  ) {
    return false;
  }

  chargeExpense({
    economyState,
    amount: payableCost,
    type,
    label: `${provider.toUpperCase()} TREATMENT`,
    config: DANFO_ECONOMY_CONFIG,
  });
  if (applyCoupon) {
    lifeObligationState.discountCoupons -= 1;
  }
  restorePlayerHealth(playerStatus, PLAYER_STATUS_CONFIG);
  handleObjectiveEvent("health-restored");
  return true;
}

function handleHealthTreatment(options = {}) {
  const service = nearbyHealthService.value;

  if (!service) {
    return;
  }

  if (
    purchaseHealthTreatment({
      provider: service.provider,
      cost: treatmentCost.value,
      type: "medical-treatment",
      useCoupon: Boolean(options?.useCoupon),
    })
  ) {
    closeServiceModal();
  }
}

function handleDoctorCall() {
  purchaseHealthTreatment({
    provider: "Mobile Doctor",
    cost: PLAYER_STATUS_CONFIG.doctorCallCost,
    type: "mobile-doctor-treatment",
  });
}

function handlePlayerFaint() {
  const hospital =
    healthParkingZones.find((zone) => {
      return zone.providerType === "public-hospital";
    }) ?? healthParkingZones[0];

  const hospitalCost = PLAYER_STATUS_CONFIG.faintHospitalCost;
  const shortfall = Math.max(0, hospitalCost - economyState.money);

  if (shortfall > 0) {
    addEmergencyBankLoan({
      economyState,
      amount: shortfall,
      config: DANFO_ECONOMY_CONFIG,
    });
  }

  chargeExpense({
    economyState,
    amount: hospitalCost,
    type: "hospital-emergency",
    label: "FAINTED · HOSPITAL BILL",
    config: DANFO_ECONOMY_CONFIG,
  });

  stopPlayerVehicleEngine();
  player.speed = 0;
  if (hospital) {
    player.x = hospital.x + hospital.width / 2;
    player.y = hospital.y + hospital.height / 2;
    player.previousX = player.x;
    player.previousY = player.y;
  }
  playerStatus.energy = PLAYER_STATUS_CONFIG.faintRecoveryEnergy;
  energyDepleted.value = false;
  playerStatus.health = Math.max(playerStatus.health, 50);
  centreCameraOnPlayer();
  saveActiveVehicleCondition();
  showPlayerWarning(
    "health",
    "YOU FAINTED",
    `You woke at the hospital with ${PLAYER_STATUS_CONFIG.faintRecoveryEnergy}% energy. Bill: ₦${PLAYER_STATUS_CONFIG.faintHospitalCost.toLocaleString()}.`,
  );
}

function handleEnergyDepleted() {
  pressedKeys.clear();
  stopPlayerVehicleEngine();
  player.speed = 0;
  energyDepleted.value = true;
}

function handleFoodPurchase(itemId) {
  const item = availableFoodItems.value.find((candidate) => {
    return candidate.id === itemId;
  });

  if (!item || economyState.money < item.price) {
    return;
  }

  chargeExpense({
    economyState,
    amount: item.price,
    type: "food-purchase",
    label: item.label.toUpperCase(),
    config: DANFO_ECONOMY_CONFIG,
  });
  addInventoryItem(playerInventory, item.id);
}

function handleInventoryConsumption(itemId) {
  const item = FOOD_ITEMS.find((candidate) => {
    return candidate.id === itemId;
  });

  if (
    !item ||
    !consumeInventoryItem(playerInventory, item.id)
  ) {
    return;
  }

  consumeFood({
    status: playerStatus,
    item,
    absoluteGameMinute: getAbsoluteGameMinute(gameClock),
    config: PLAYER_STATUS_CONFIG,
  });
  playGameSound(
    ["bottled-water", "energy-drink", "dry-gin"].includes(item.id)
      ? "drink"
      : "eatFood",
    { loop: false },
  );

  if (playerStatus.energy > PLAYER_WARNING_CONFIG.energy) {
    handleObjectiveEvent("energy-restored");
  }
  saveGame();
}

function handlePocketFoodUse() {
  if (equippedFoodItem.value) {
    handleInventoryConsumption(equippedFoodItem.value.id);
  }
}

function handlePocketFoodCycle() {
  const items = inventoryItems.value;
  if (items.length <= 1) return;
  const currentIndex = items.findIndex((item) => {
    return item.id === equippedFoodId.value;
  });
  equippedFoodId.value =
    items[(currentIndex + 1 + items.length) % items.length].id;
}

function handleFinePayment() {
  const amount = fineState.outstandingAmount;

  if (amount <= 0 || economyState.money < amount) {
    return;
  }

  chargeExpense({
    economyState,
    amount,
    type: "road-fines-paid",
    label: "OUTSTANDING ROAD FINES PAID",
    config: DANFO_ECONOMY_CONFIG,
  });
  clearOutstandingFines(fineState);
  handleObjectiveEvent("fines-cleared");
}

function handleRentPayment() {
  const amount = lifeObligationView.value.rent.amountDue;

  if (
    !["due", "grace", "overdue"].includes(
      lifeObligationState.rent.status,
    ) ||
    economyState.money < amount
  ) {
    return;
  }

  chargeExpense({
    economyState,
    amount,
    type: "weekly-rent",
    label: "WEEKLY HOME RENT",
    config: DANFO_ECONOMY_CONFIG,
  });
  payWeeklyRent({
    state: lifeObligationState,
    currentDay: gameClock.day,
  });
  queuePhoneCall(
    phoneCallState,
    "landlord-rent-paid",
    { priority: true },
  );
  handleObjectiveEvent("rent-paid");
}

function handleSchoolFeesPayment(requestedAmount) {
  const remaining =
    lifeObligationView.value.schoolFees.remainingAmount;
  const amount = Math.min(
    remaining,
    Math.max(0, Math.round(Number(requestedAmount) || 0)),
  );

  if (amount <= 0 || economyState.money < amount) {
    return;
  }

  const result = paySchoolFees({
    state: lifeObligationState,
    requestedAmount: amount,
    currentDay: gameClock.day,
  });

  if (!result.success) {
    return;
  }

  chargeExpense({
    economyState,
    amount: result.amount,
    type: "family-school-fees",
    label: "SISTER SCHOOL FEES",
    config: DANFO_ECONOMY_CONFIG,
  });

  if (result.completed) {
    handleObjectiveEvent("school-fees-paid");
  }
}

function handleFamilyRequestPayment(requestedAmount) {
  const familyView = lifeObligationView.value.familyRequests;
  const activeRequest = familyView.entries.find((entry) => entry.id === familyView.activeId);
  if (!activeRequest) return;

  const remaining = Math.max(0, Number(activeRequest.amount ?? 0) - Number(activeRequest.paidAmount ?? 0));
  const amount = Math.min(remaining, Math.max(0, Math.round(Number(requestedAmount) || 0)));
  if (amount <= 0 || economyState.money < amount) return;

  const result = payFamilyRequest({
    state: lifeObligationState,
    requestedAmount: amount,
    currentDay: gameClock.day,
    config: LIFE_OBLIGATION_CONFIG,
  });
  if (!result.success) return;

  chargeExpense({
    economyState,
    amount: result.amount,
    type: "family-request",
    label: `${result.definition.contactName.toUpperCase()} · ${result.definition.title.toUpperCase()}`,
    config: DANFO_ECONOMY_CONFIG,
  });

  if (result.completed && result.reward?.type === "coupon") {
    lifeObligationState.discountCoupons += Math.max(1, Number(result.reward.quantity) || 1);
    lifeObligationState.notificationRevision += 1;
  } else if (result.completed && result.reward?.type === "food") {
    addInventoryItem(
      playerInventory,
      result.reward.itemId,
      Math.max(1, Number(result.reward.quantity) || 1),
    );
  }
}

function resetWorldTrafficAfterSleep() {
  Object.assign(
    populationState,
    createPopulationTrafficState(),
  );
  Object.assign(
    towTruckState,
    createTowTruckState(TOW_TRUCK_BASES, TOW_TRUCK_CONFIG),
  );
  trafficLightState.elapsedSeconds = 0;
  highwayLightState.elapsedSeconds = 0;
}

function handleSleep(hours) {
  const safeHours = clamp(Number(hours) || 0, 1, 8);
  sleepState.modalOpen = false;
  sleepState.overlayVisible = true;
  sleepState.overlayFading = false;
  pressedKeys.clear();
  player.speed = 0;
  player.isParked = true;
  stopPlayerVehicleEngine();
  handleObjectiveEvent("slept-at-home");

  window.clearTimeout(sleepWarmupTimer);
  window.clearTimeout(sleepFadeTimer);
  if (worldTransitionTimer !== null) {
    window.clearInterval(worldTransitionTimer);
    worldTransitionTimer = null;
  }
  if (playerWarningTimer !== null) {
    window.clearTimeout(playerWarningTimer);
    playerWarningTimer = null;
    activePlayerWarning.value = null;
  }

  advanceIntoxication(playerStatus,getAbsoluteGameMinute(gameClock),{crashEnergy:PLAYER_STATUS_CONFIG.dryGinCrashEnergy});
  const previousDay = gameClock.day;
  updateGameClock(
    gameClock,
    safeHours * 60 / GAME_TIME_CONFIG.gameMinutesPerRealSecond,
    GAME_TIME_CONFIG,
  );
  advanceIntoxication(playerStatus,getAbsoluteGameMinute(gameClock),{sleeping:true,crashEnergy:PLAYER_STATUS_CONFIG.dryGinCrashEnergy});
  restoreEnergyFromSleep(
    playerStatus,
    safeHours * getHomeSleepMultiplier(propertyState),
    PLAYER_STATUS_CONFIG,
  );
  if (playerStatus.energy > PLAYER_WARNING_CONFIG.energy) {
    handleObjectiveEvent("energy-restored");
  }
  resetWorldTrafficAfterSleep();

  if (gameClock.day !== previousDay) {
    offerBankLoan({
      economyState,
      currentDay: gameClock.day,
      config: DANFO_ECONOMY_CONFIG,
    });
    processBankSavingsDay(bankSavingsState, gameClock.day);
    processStockMarketUpdate();

    const danfoFeesDue =
      isDrivingDanfo.value ||
      vehicleState.lastDanfoDrivenDay === previousDay;
    const brtTaxDue =
      isDrivingBrt.value ||
      vehicleState.lastBrtDrivenDay === previousDay;

    if (danfoFeesDue) {
      processDailyGarageFees({
        economyState,
        currentDay: gameClock.day,
        config: DANFO_ECONOMY_CONFIG,
      });
    } else if (brtTaxDue) {
      processDailyBrtTax({
        economyState,
        currentDay: gameClock.day,
        config: DANFO_ECONOMY_CONFIG,
      });
    } else {
      // Private-car and no-driving days are settled without Danfo/BRT fees,
      // so choosing a driving job later cannot charge those days retroactively.
      economyState.lastProcessedDay = Math.max(
        economyState.lastProcessedDay,
        gameClock.day,
      );
    }

    processCurrentLifeObligations();
    processCurrentPropertyMortgage();
    processCurrentRentalIncome();
    processCurrentBusinessIncome();
  }

  sleepWarmupTimer = window.setTimeout(() => {
    sleepState.overlayFading = true;
    sleepFadeTimer = window.setTimeout(() => {
      sleepState.overlayVisible = false;
      sleepState.overlayFading = false;
    }, 1400);
  }, 900);
}

function centreCameraOnPlayer() {
  camera.x = clamp(
    player.x - CAMERA_WIDTH / 2,
    WORLD_MIN_X,
    WORLD_MAX_X - CAMERA_WIDTH,
  );
  camera.y = clamp(
    player.y - CAMERA_HEIGHT / 2,
    WORLD_MIN_Y,
    WORLD_MAX_Y - CAMERA_HEIGHT,
  );
  camera.previousX = camera.x;
  camera.previousY = camera.y;
}

function getPersonalJobVehicleId() {
  return (
    economyState.selectedPrivateVehicleId ??
    economyState.ownedVehicleIds.find((vehicleId) => vehicleId !== PLAYER_DANFO.id) ??
    null
  );
}

function handleJobSelection(jobId) {
  if (jobId === "brt" && !["A", "B", "C"].includes(driverLicenceState.rating)) {
    playGameSound("warning");
    return;
  }
  const personalVehicleId = getPersonalJobVehicleId();
  if (jobId === "moto-eazi" && !personalVehicleId) {
    playGameSound("warning");
    return;
  }
  const targetVehicleId =
    jobId === "brt" ? PLAYER_BRT.id : jobId === "moto-eazi" ? personalVehicleId : PLAYER_DANFO.id;
  const vehicleChangeRequired = vehicleState.activeVehicleId !== targetVehicleId;
  if (jobId === employmentState.selectedJob && !vehicleChangeRequired) return;

  clearDanfoPassengerRoute(passengerState);
  clearLastRouteBonus(economyState);
  returnToRouteSelection(routeState);
  activeServiceModal.value = null;
  currentServiceZoneId = null;
  employmentState.selectedJob = jobId;
  handleObjectiveEvent("job-selected");
  if (jobId === "danfo") refreshDanfoRouteOffers();

  if (vehicleChangeRequired) {
    pressedKeys.clear();
    switchPlayerVehicle(targetVehicleId);
    if (jobId === "brt") {
      placePlayerBrtAtTerminal();
    } else {
      const homeZone = activeHomeParkingZone.value;
      player.x = homeZone ? homeZone.x + homeZone.width / 2 : playerStart.x;
      player.y = homeZone ? homeZone.y + homeZone.height / 2 : playerStart.y;
      player.rotation = playerStart.rotation;
    }
  }
  player.previousX = player.x;
  player.previousY = player.y;
  player.previousRotation = player.rotation;
  passengerState.capacity = activePassengerConfig.value.capacity;
  centreCameraOnPlayer();
}
function placePlayerBrtAtTerminal() {
  const candidates = [
    // Central frontage, west bay, east bay, then access-lane fallbacks.
    { x: 39.5, y: 3.5, rotation: Math.PI / 2 },
    { x: 35.5, y: 2.5, rotation: Math.PI },
    { x: 42.5, y: 2.5, rotation: Math.PI },
    { x: 35.5, y: 6.5, rotation: 0 },
    { x: 35.5, y: 10.5, rotation: 0 },
  ];

  const minimumBrtDistanceSquared =
    (GRID_SIZE * 3) ** 2;

  const selectedCandidate =
    candidates.find((candidate) => {
      const position = {
        ...player,
        x: candidate.x * GRID_SIZE,
        y: candidate.y * GRID_SIZE,
        rotation: candidate.rotation,
      };
      const collisionShape = getVehicleCollisionShape(
        position,
        PLAYER_BRT,
      );
      const tooCloseToAiBrt =
        populationState.vehicles.some((vehicle) => {
          if (!vehicle.isBrt) {
            return false;
          }

          const differenceX = vehicle.x - position.x;
          const differenceY = vehicle.y - position.y;
          return (
            differenceX * differenceX +
              differenceY * differenceY <
            minimumBrtDistanceSquared
          );
        });

      return (
        !tooCloseToAiBrt &&
        canVehicleOccupy(collisionShape) &&
        !populationTrafficStateOverlaps(
          collisionShape,
          populationState,
        )
      );
    }) ?? candidates[candidates.length - 1];

  player.x = selectedCandidate.x * GRID_SIZE;
  player.y = selectedCandidate.y * GRID_SIZE;
  player.rotation = selectedCandidate.rotation;
}

function switchPlayerVehicle(vehicleId) {
  const nextConfig = getPlayerVehicleConfig(vehicleId);
  saveActiveVehicleCondition();
  stopPlayerVehicleEngine();
  vehicleState.activeVehicleId = nextConfig.id;
  const savedCondition =
    vehicleConditionStates[nextConfig.id] ?? {
      fuel: 100,
      damage: 0,
      gearIndex: nextConfig.startingGearIndex,
    };
  vehicleConditionStates[nextConfig.id] = savedCondition;
  hudState.fuel = clamp(savedCondition.fuel, 0, 100);
  hudState.damage = clamp(savedCondition.damage, 0, 100);
  player.speed = 0;
  player.gearIndex = clamp(
    savedCondition.gearIndex,
    0,
    nextConfig.gears.length - 1,
  );
  player.isParked = true;
  player.shiftCooldown = 0;
  player.width = nextConfig.width;
  player.length = nextConfig.length;
}

function saveActiveVehicleCondition() {
  const vehicleId = vehicleState.activeVehicleId;
  if (!vehicleId) return;
  vehicleConditionStates[vehicleId] = {
    fuel: hudState.fuel,
    damage: hudState.damage,
    gearIndex: player.gearIndex,
  };
}

function handleCarOwnerCall() {
  handleJobSelection("danfo");
}

function handleVehiclePurchase(vehicleId) {
  const vehicle = PURCHASABLE_CARS.find((candidate) => {
    return candidate.id === vehicleId;
  });

  const result = purchasePlayerVehicle({
    economyState,
    vehicle,
    atDealership:
      Boolean(nearbyDealership.value) &&
      serviceSpeedAllowed.value,
    config: DANFO_ECONOMY_CONFIG,
  });

  if (result.success) {
    handleObjectiveEvent("vehicle-purchased");
    closeServiceModal();
  }
}

function handlePropertyPurchase({ propertyId, paymentMethod }) {
  const result = purchaseProperty({
    state: propertyState,
    propertyId,
    paymentMethod,
    money: economyState.money,
    savings: bankSavingsState.balance,
    currentDay: gameClock.day,
  });

  if (!result.success) return;

  if (result.cashAmount > 0) chargeExpense({
    economyState,
    amount: result.cashAmount,
    type:
      paymentMethod === "mortgage"
        ? "property-deposit"
        : "property-purchase",
    label: `${result.property.name.toUpperCase()} ${
      paymentMethod === "mortgage" ? "DEPOSIT" : "PURCHASE"
    }`,
    config: DANFO_ECONOMY_CONFIG,
  });
  if (result.savingsAmount > 0) withdrawSavingsForExpense(bankSavingsState, result.savingsAmount, "PROPERTY PAYMENT FROM SAVINGS");
  endWeeklyRent(lifeObligationState);
  handleObjectiveEvent(
    propertyId === "wealthy-estate-home"
      ? "wealthy-home-purchased"
      : "first-home-purchased",
  );
  closeServiceModal();
}

function handleBusinessOfficePurchase() {
  const result = purchaseBusinessOffice({
    state: businessState,
    money: economyState.money,
    savings: bankSavingsState.balance,
    currentDay: gameClock.day,
    ownedPropertyIds: propertyState.ownedPropertyIds,
  });
  if (!result.success) return;

  if (result.cashAmount > 0) chargeExpense({
    economyState,
    amount: result.cashAmount,
    type: "business-office-purchase",
    label: "IKEJA LGA BUSINESS OFFICE",
    config: DANFO_ECONOMY_CONFIG,
  });
  handleObjectiveEvent("business-office-purchased");
}

function handleBusinessAssetPurchase(assetId) {
  const result = purchaseBusinessAsset({
    state: businessState,
    assetId,
    money: economyState.money,
  });
  if (!result.success) return;

  if (result.cashAmount > 0) chargeExpense({
    economyState,
    amount: result.cashAmount,
    type: "business-vehicle-purchase",
    label: `${result.asset.name.toUpperCase()} ADDED TO FLEET`,
    config: DANFO_ECONOMY_CONFIG,
  });
  handleObjectiveEvent(
    assetId === "fleet-danfo"
      ? "business-danfo-purchased"
      : "business-lease-car-purchased",
  );
}

function handleRaceStart() {
  if (
    currentMapId.value !== "coastal-city" ||
    !nearbyRaceCircuit.value ||
    economyState.money < COASTAL_CIRCUIT.entryFee ||
    !startRace(raceState)
  ) {
    return;
  }

  chargeExpense({
    economyState,
    amount: COASTAL_CIRCUIT.entryFee,
    type: "race-entry",
    label: "COASTAL CIRCUIT ENTRY",
    config: DANFO_ECONOMY_CONFIG,
  });
  closeServiceModal();
  pressedKeys.clear();
  player.speed = 0;
  player.x = COASTAL_CIRCUIT.start.x;
  player.y = COASTAL_CIRCUIT.start.y;
  player.rotation = COASTAL_CIRCUIT.start.rotation;
  player.previousX = player.x;
  player.previousY = player.y;
  player.previousRotation = player.rotation;
  centreCameraOnPlayer();
}

function handleTrackedObjectiveSelection(objectiveId) {
  setTrackedObjective(
    objectiveState,
    objectiveId,
    OBJECTIVE_DEFINITIONS,
  );
}

function handleObjectiveRewardClaim(objectiveId) {
  const reward = claimObjectiveReward(
    objectiveState,
    objectiveId,
    OBJECTIVE_DEFINITIONS,
  );

  if (!reward) {
    return;
  }

  if (reward.money > 0) {
    creditIncome({
      economyState,
      amount: reward.money,
      type: "objective-reward",
      label: "OBJECTIVE REWARD",
      config: DANFO_ECONOMY_CONFIG,
    });
  }
}

function handleMapDestinationSelection(locationId) {
  manualMapDestination.value =
    MOTO_EAZI_LOCATIONS.find((location) => {
      return location.id === locationId;
    }) ?? null;
}

function handleStartDrivingTest() {
  const usableStops = busStops.filter((stop) => {
    return Number.isFinite(stop.x) && Number.isFinite(stop.y);
  });
  if (usableStops.length < 3) return;

  const selectedStops = [
    usableStops[0],
    usableStops[Math.floor(usableStops.length / 2)],
    usableStops[usableStops.length - 1],
  ];
  if (beginDriverLicenceTest(driverLicenceState, selectedStops)) {
    manualMapDestination.value = null;
    playGameSound("confirm");
  }
}

function maybeOfferBankColdCall() {
  if (
    economyState.bankLoanEligible &&
    economyState.bankLoanBalance <= 0 &&
    gameClock.day - economyState.lastBankColdCallDay >= 2 &&
    mutiuEncounter.mode !== "incoming-call" &&
    !phoneCallState.activeCall
  ) {
    economyState.lastBankColdCallDay = gameClock.day;
    bankColdCallVisible.value = true;
    queuePhoneCall(
      phoneCallState,
      "bank-loan-ad",
      { priority: true },
    );
  }
}

function handleIncomingCallAccept(call) {
  resolvePhoneCall(phoneCallState, call?.instanceId);
  if (call?.kind === "bank-loan") {
    bankColdCallVisible.value = false;
    playGameSound("confirm");
    return;
  }
  if (call?.kind === "mutiu-race") {
    acceptMutiuRaceInvitation();
  }
}

function handleIncomingCallDecline(call) {
  resolvePhoneCall(phoneCallState, call?.instanceId);
  if (call?.kind === "bank-loan") {
    bankColdCallVisible.value = false;
    return;
  }
  if (call?.kind === "mutiu-race") {
    declineMutiuRaceInvitation();
  }
}

function updateDriverLicenceTestProgress() {
  const target = driverLicenceTarget.value;
  if (!target) return;
  if (Math.hypot(player.x - target.x, player.y - target.y) > GRID_SIZE * 0.7) {
    return;
  }
  const result = advanceDriverLicenceTest(driverLicenceState);
  if (result?.complete) {
    playGameSound(result.passed ? "confirm" : "warning");
  }
}

function handleWaitForMotoEaziRequest() {
  if (employmentState.selectedJob === "moto-eazi" && !isDrivingDanfo.value && !isDrivingBrt.value && economyState.ownedVehicleIds.length > 0) {
    waitForMotoEaziRequest(
      motoEaziState,
      MOTO_EAZI_REQUESTS,
      gameClock.minuteOfDay,
    );
  }
}

function handleAcceptMotoEaziRequest(requestId) {
  if (employmentState.selectedJob === "moto-eazi" && !isDrivingDanfo.value && !isDrivingBrt.value) {
    manualMapDestination.value = null;
    acceptMotoEaziRequest(motoEaziState, requestId);
  }
}

function handleRejectMotoEaziRequest(requestId) {
  rejectMotoEaziRequest(motoEaziState, requestId);
}

function handleSavingsDeposit(amount) {
  depositIntoSavings(bankSavingsState, economyState, amount);
}

function handleSavingsWithdrawal(amount) {
  withdrawFromSavings(bankSavingsState, economyState, amount);
}

function handleBuyStock(companyId) {
  const price = buyStock(stockMarketState, companyId, economyState.money);
  if (!price) return;
  chargeExpense({
    economyState,
    amount: price,
    type: "stock-purchase",
    label: "Stock purchase",
    config: DANFO_ECONOMY_CONFIG,
  });
  saveGame();
}

function handleSellStock(companyId) {
  const proceeds = sellStock(stockMarketState, companyId);
  if (!proceeds) return;
  creditIncome({
    economyState,
    amount: proceeds,
    type: "stock-sale",
    label: "Stock sale",
    config: DANFO_ECONOMY_CONFIG,
  });
  saveGame();
}

function handleTakeLoan(amount) {
  const result = borrowBankLoan({
    economyState,
    amount,
    atBank:
      Boolean(nearbyBankParking.value) &&
      serviceSpeedAllowed.value,
    config: DANFO_ECONOMY_CONFIG,
  });

  if (result.success) {
    handleObjectiveEvent("loan-taken");
    closeServiceModal();
  }
}

function handlePhoneBankLoan() {
  const result = borrowQuickLoan({
    economyState,
    config: DANFO_ECONOMY_CONFIG,
  });

  if (result.success) {
    handleObjectiveEvent("loan-taken");
    playGameSound("confirm");
  }
}

function handleFuelPurchase(payload) {
  const requestedLitres = typeof payload === "object" ? payload.requestedLitres : payload;
  const useCoupon = Boolean(payload?.useCoupon) && lifeObligationState.discountCoupons > 0;
  const fuelBeforePurchase = hudState.fuel;
  const result = purchaseFuel({
    economyState,
    currentFuel: hudState.fuel,
    requestedLitres,
    config: DANFO_ECONOMY_CONFIG,
    discountRate: useCoupon ? 0.5 : 0,
  });

  if (result.success) {
    if (useCoupon) {
      lifeObligationState.discountCoupons -= 1;
    }
    hudState.fuel = result.fuel;
    if (fuelBeforePurchase <= 25) {
      handleObjectiveEvent("low-fuel-refuelled");
    }
    playGameSound("fuelPump", { loop: false });
    closeServiceModal();
  }
}

function handleLoanRepayment({ amount, receiver, loanType }) {
  const result = repayBankLoan({
    economyState,
    amount,
    receiver,
    loanType,
    config: DANFO_ECONOMY_CONFIG,
  });

  if (result.success && economyState.loanBalance <= 0) {
    handleObjectiveEvent("loan-repaid");
  }
}

function canStartCurrentPlayerVehicle() {
  return (
    !economyState.gameOver &&
    hudState.fuel > 0 &&
    hudState.damage < 100 &&
    playerStatus.health > 0 &&
    playerStatus.energy > 0 &&
    !fineState.vehicleImpounded &&
    !sleepState.modalOpen &&
    !sleepState.overlayVisible
  );
}

function startCurrentPlayerVehicle() {
  if (
    isPlayerVehicleEngineStarted() ||
    isPlayerVehicleEngineStarting() ||
    !canStartCurrentPlayerVehicle()
  ) {
    return false;
  }

  player.isParked = false;
  player.gearIndex =
    activeVehicleConfig.value.transmission === "automatic"
      ? activeVehicleConfig.value.firstDriveGearIndex
      : activeVehicleConfig.value.neutralGearIndex;

  const startRequested =
    requestPlayerVehicleEngineStart(hudState.damage);
  if (startRequested) {
    handleObjectiveEvent("engine-started");
  }
  return startRequested;
}

function handleKeyDown(event) {
  if (props.paused) return;
  const key =
    event.key.toLowerCase();
  const targetTagName =
    event.target?.tagName?.toLowerCase();
  const isTextEntryTarget =
    event.target?.isContentEditable ||
    ["input", "textarea", "select"].includes(
      targetTagName,
    );

  // Phone and modal fields own their keystrokes while focused.
  if (isTextEntryTarget) {
    return;
  }

  // World travel owns the vehicle until the loading overlay finishes.
  // Ignore ignition and movement input while simulation movement is locked.
  if (worldTransition.active) {
    event.preventDefault();
    return;
  }

  if (
    key === "z" &&
    !event.repeat
  ) {
    event.preventDefault();
    handlePocketFoodUse();
    return;
  }

  if (key === "o") {
    event.preventDefault();
    toggleObserverMode();
    return;
  }

  if (observerMode.value && key === "home") {
    event.preventDefault();
    camera.x = clamp(
      player.x - CAMERA_WIDTH / 2,
      WORLD_MIN_X,
      WORLD_MAX_X - CAMERA_WIDTH,
    );
    camera.y = clamp(
      player.y - CAMERA_HEIGHT / 2,
      WORLD_MIN_Y,
      WORLD_MAX_Y - CAMERA_HEIGHT,
    );
    return;
  }

  if (economyState.gameOver) {
    stopPlayerVehicleEngine();
    return;
  }

  if (
    sleepState.modalOpen ||
    sleepState.overlayVisible
  ) {
    return;
  }

  if (key === "i") {
    event.preventDefault();

    if (event.repeat) {
      return;
    }

    if (
      isPlayerVehicleEngineStarted() ||
      isPlayerVehicleEngineStarting()
    ) {
      if (Math.abs(player.speed) > 1) {
        return;
      }

      player.isParked = true;
      player.speed = 0;
      player.gearIndex =
        activeVehicleConfig.value.neutralGearIndex;
      stopPlayerVehicleEngine();
    } else {
      startCurrentPlayerVehicle();
    }
    return;
  }

  if (activeServiceModal.value) {
    return;
  }

  if (key === "h") {
    event.preventDefault();

    if (!event.repeat) {
      playPlayerVehicleHorn();
    }
    return;
  }

  if (
    activeVehicleConfig.value.transmission === "manual" &&
    (key === "q" || key === "e")
  ) {
    event.preventDefault();

    if (key === "q") {
      shiftGearDown(player, activeVehicleConfig.value);
    } else {
      shiftGearUp(player, activeVehicleConfig.value);
    }
    return;
  }

  if ((key === "r" || key === "v") && nearbyRepairService.value) {
    event.preventDefault();
    if (!serviceSpeedAllowed.value) return;

    const useCoupon = key === "v" && lifeObligationState.discountCoupons > 0;
    const result = purchaseRepairs({
      economyState,
      currentDamage: hudState.damage,
      config: DANFO_ECONOMY_CONFIG,
      discountRate: useCoupon ? 0.5 : 0,
    });

    hudState.damage = result.damage;
    if (result.success) {
      if (useCoupon) lifeObligationState.discountCoupons -= 1;
      playGameSound("mechanicRepair", { loop: false });
      handleObjectiveEvent("vehicle-repaired");
    }
    return;
  }

  const movementKeys = [
    "w",
    "a",
    "s",
    "d",
    "arrowup",
    "arrowdown",
    "arrowleft",
    "arrowright",
  ];

  if (!movementKeys.includes(key)) {
    return;
  }

  event.preventDefault();

  pressedKeys.add(key);
}

function handleKeyUp(event) {
  pressedKeys.delete(
    event.key.toLowerCase(),
  );
}

onMounted(() => {
  if (props.vehicleSnapshot?.id) {
    switchPlayerVehicle(props.vehicleSnapshot.id);
    hudState.fuel = clamp(
      props.vehicleSnapshot.fuel ?? hudState.fuel,
      0,
      100,
    );
    hudState.damage = clamp(
      props.vehicleSnapshot.damage ?? hudState.damage,
      0,
      100,
    );
    player.gearIndex = clamp(
      props.vehicleSnapshot.gearIndex ?? player.gearIndex,
      0,
      activeVehicleConfig.value.gears.length - 1,
    );
    playerStatus.health = clamp(
      props.vehicleSnapshot.health ?? playerStatus.health,
      0,
      100,
    );
    playerStatus.energy = clamp(
      props.vehicleSnapshot.energy ?? playerStatus.energy,
      0,
      100,
    );
    if (props.vehicleSnapshot.economyState) Object.assign(economyState, props.vehicleSnapshot.economyState);
    normaliseLoanState(economyState, DANFO_ECONOMY_CONFIG);
    if (props.vehicleSnapshot.travelCrimeState) restoreCrimeState(crimeState, props.vehicleSnapshot.travelCrimeState);
    if (props.vehicleSnapshot.travelPropertyState) restorePropertyState(propertyState, props.vehicleSnapshot.travelPropertyState);
    if (props.vehicleSnapshot.travelLifeState) restoreLifeObligationState(lifeObligationState, props.vehicleSnapshot.travelLifeState, LIFE_OBLIGATION_CONFIG);
    economyState.money =
      props.vehicleSnapshot.money ?? economyState.money;
    if (Array.isArray(props.vehicleSnapshot.ownedVehicleIds)) {
      economyState.ownedVehicleIds = [...new Set(props.vehicleSnapshot.ownedVehicleIds)];
    }
    if (props.vehicleSnapshot.customizationState) restoreCustomizationState(customizationState, props.vehicleSnapshot.customizationState);
    if (props.vehicleSnapshot.bankSavingsState) restoreBankSavingsState(bankSavingsState, props.vehicleSnapshot.bankSavingsState, props.vehicleSnapshot.currentDay);
    if (props.vehicleSnapshot.stockMarketState) {
      restoreStockMarketState(stockMarketState, props.vehicleSnapshot.stockMarketState);
    }
    gameClock.day =
      props.vehicleSnapshot.currentDay ?? gameClock.day;
    gameClock.minuteOfDay =
      props.vehicleSnapshot.minuteOfDay ??
      gameClock.minuteOfDay;
  }
  player.x = playerStart.x;
  player.y = playerStart.y;
  player.rotation = playerStart.rotation;
  player.previousX = player.x;
  player.previousY = player.y;
  player.previousRotation = player.rotation;
  centreCameraOnPlayer();
  player.speed = 0;
  stopPlayerVehicleEngine();
  worldTransition.active = true;
  worldTransition.eyebrow = props.startRace ? "RACE NIGHT" : "TRAVELLING";
  worldTransition.label = "Coast City";
  worldTransition.message = props.startRace
    ? "Warming up Coast City"
    : "Preparing Coast City";
  worldTransition.totalSeconds = 10;
  worldTransition.remainingSeconds = 10;
  const arrivalStartedAt = performance.now();
  worldTransitionTimer = window.setInterval(() => {
    const elapsedSeconds =
      (performance.now() - arrivalStartedAt) / 1000;
    worldTransition.remainingSeconds = Math.max(
      0,
      10 - elapsedSeconds,
    );
    if (elapsedSeconds < 10) return;
    window.clearInterval(worldTransitionTimer);
    worldTransitionTimer = null;
    if (props.startRace) {
      beginMutiuStreetRace();
    }
    worldTransition.active = false;
  }, 100);

  loadCanvasImage(playerDanfoSpriteUrl, (image) => {
    playerDanfoSprite = image;
  });
  loadCanvasImage(asphaltTileUrl, (image) => {
    asphaltTileImage = image;
    invalidateStaticMapCache();
  });
  loadCanvasImage(untarredRoadTileUrl, (image) => {
    untarredRoadTileImage = image;
    invalidateStaticMapCache();
  });
  loadCanvasImage(busStopCanopyUrl, (image) => {
    busStopCanopyImage = image;
    invalidateStaticMapCache();
  });
  loadCanvasImage(grassTileUrl, (image) => {
    grassTileImage = image;
    invalidateStaticMapCache();
  });
  loadCanvasImage(trafficLightConcreteUrl, (image) => {
    trafficLightConcreteImage = image;
    invalidateStaticMapCache();
  });
  loadCanvasImage(parkingBayTileUrl, (image) => {
    parkingBayTileImage = image;
    invalidateStaticMapCache();
  });
  loadCanvasImage(beachSandTileUrl, (image) => {
    beachSandTileImage = image;
    invalidateStaticMapCache();
  });
  [
    beachPropUmbrellaLoungersUrl,
    beachPropSocialUrl,
    beachPropSurfUrl,
    beachPropKioskUrl,
  ].forEach((url, index) => {
    loadCanvasImage(url, (image) => {
      beachPropImages[index] = image;
      invalidateStaticMapCache();
    });
  });
  loadCanvasImage(shorelineTransitionTileUrl, (image) => {
    shorelineTransitionTileImage = image;
    invalidateStaticMapCache();
  });
  loadCanvasImage(TOW_TRUCK_ASSETS.truck, (image) => {
    towTruckSpriteImage = image;
  });
  loadCanvasImage(TOW_TRUCK_ASSETS.parkingTile, (image) => {
    towYardTileImage = image;
  });
  const playerCollisionBox = getVehicleCollisionShape(
    player,
    activeVehicleConfig.value,
  );

  seedPopulationTraffic({
    state: populationState,
    routes: activePopulationRoutes.value,
    vehicleTypes: POPULATION_VEHICLE_TYPES,
    minuteOfDay: gameClock.minuteOfDay,
    trafficPeriod: currentTrafficPeriod.value,
    playerCollisionBox,
    canOccupyWorld: canPopulationVehicleOccupy,
    config: POPULATION_TRAFFIC_CONFIG,
  });

  resizeCanvas();

  resizeObserver =
    new ResizeObserver(() => {
      resizeCanvas();
    });

  resizeObserver.observe(
    canvasReference.value,
  );

  window.addEventListener(
    "keydown",
    handleKeyDown,
  );

  window.addEventListener(
    "keyup",
    handleKeyUp,
  );

  previousTimestamp =
    performance.now();

  animationFrameId =
    window.requestAnimationFrame(
      animationLoop,
    );
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  disposePlayerVehicleAudio();
  invalidateStaticMapCache();
  pendingCanvasImages.clear();
  landmarkSprites.clear();
  genericBuildingSprites.clear();
  populationVehicleSprites.clear();
  purchasedVehicleSprites.clear();
  window.clearTimeout(sleepWarmupTimer);
  window.clearTimeout(sleepFadeTimer);
  if (playerWarningTimer !== null) {
    window.clearTimeout(playerWarningTimer);
    playerWarningTimer = null;
  }
  if (objectiveNoticeTimer !== null) {
    window.clearTimeout(objectiveNoticeTimer);
    objectiveNoticeTimer = null;
  }
  if (illegalStreetRaceResetTimer !== null) {
    window.clearTimeout(illegalStreetRaceResetTimer);
    illegalStreetRaceResetTimer = null;
  }
  if (pendingStaticPrewarm !== null) {
    if (typeof window.cancelIdleCallback === "function") {
      window.cancelIdleCallback(pendingStaticPrewarm);
    } else {
      window.clearTimeout(pendingStaticPrewarm);
    }
    pendingStaticPrewarm = null;
  }

  window.removeEventListener(
    "keydown",
    handleKeyDown,
  );

  window.removeEventListener(
    "keyup",
    handleKeyUp,
  );

  if (animationFrameId !== null) {
    window.cancelAnimationFrame(
      animationFrameId,
    );
  }
});
// Observe successful transactions only; never replay the saved ledger.
function recordMarketReceipt(event) {
  sampleMarketDeposits(stockMarketState, gameClock.day, gameClock.minuteOfDay, bankSavingsState.balance);
  recordStockTransaction(stockMarketState, event, {
    day: gameClock.day,
    foodSeller: nearbyFoodService.value?.sellerType,
    fuelPump: nearbyFuelPump.value?.id,
  });
}
observeTransactions(economyState, recordMarketReceipt);
observeTransactions(bankSavingsState, recordMarketReceipt);
</script>

<template>
  <section class="world-map">
    <canvas
      ref="canvasReference"
      class="world-map__canvas"
      aria-label="Total City Grind world"
    />

    <aside
      v-if="illegalStreetRaceState.status !== 'idle'"
      class="world-map__illegal-race"
      aria-live="polite"
    >
      <small>MUTIU ILLEGAL · ATLANTIC CROWN</small>

      <strong
        v-if="illegalStreetRaceState.status === 'countdown'"
        class="world-map__illegal-race-countdown"
      >
        {{ Math.max(1, Math.ceil(illegalStreetRaceState.countdownSeconds)) }}
      </strong>

      <template v-else-if="illegalStreetRaceState.status === 'active'">
        <strong>PLACE {{ illegalStreetRaceLivePlace }} / 5</strong>
        <span>{{ illegalStreetRaceState.elapsedSeconds.toFixed(1) }}s</span>
      </template>

      <template v-else>
        <strong>
          FINISHED · PLACE {{ illegalStreetRaceState.playerPlace }} / 5
        </strong>
        <span>
          {{ illegalStreetRaceState.elapsedSeconds.toFixed(2) }}s ·
          ₦{{ illegalStreetRaceState.reward.toLocaleString() }}
        </span>
      </template>
    </aside>

    <aside
      v-if="performanceSettings.showPerformanceMonitor && showGrid"
      class="world-map__performance"
      aria-label="Performance monitor"
    >
      <strong>{{ performanceDisplay.fps.toFixed(0) }} FPS</strong>
      <span>Frame {{ performanceDisplay.frameMs.toFixed(1) }} ms</span>
      <span>Simulation {{ performanceDisplay.simulationMs.toFixed(1) }} ms</span>
      <span>Render {{ performanceDisplay.renderMs.toFixed(1) }} ms</span>
      <span>
        Traffic {{ performanceDisplay.visibleVehicles }}/{{ performanceDisplay.activeVehicles }}
        · {{ Math.round(performanceDisplay.trafficScale * 100) }}%
      </span>
      <span>Tile misses {{ performanceDisplay.tileCacheMisses }}</span>
    </aside>

    <div
      v-if="fatigueStrength > 0"
      class="world-map__fatigue"
      :style="{
        '--fatigue-blur': `${2 + fatigueStrength * 8}px`,
        '--fatigue-opacity': 0.08 + fatigueStrength * 0.3,
      }"
      aria-hidden="true"
    />

    <TrafficLight
      v-for="lightHead in visibleTrafficLightHeads"
      :key="lightHead.id"
      :x="lightHead.x"
      :y="lightHead.y"
      :rotation="lightHead.rotation"
      :scale="lightHead.scale"
      :signal="lightHead.signal"
      :label="lightHead.label"
    />

    <HighwayLight
      v-for="lightHead in visibleHighwayLightHeads"
      :key="lightHead.id"
      :x="lightHead.x"
      :y="lightHead.y"
      :rotation="lightHead.rotation"
      :scale="lightHead.scale"
      :signal="lightHead.signal"
      :label="lightHead.label"
    />

    <div v-if="observerMode" class="world-map__observer">
      OBSERVER MODE · WASD/ARROWS PAN · HOME PLAYER · O EXIT
    </div>

    <div v-if="showGrid" class="world-map__district">
      {{
        currentDistrict?.name ??
        "Outside District"
      }}
      · X{{ currentGridCell.x }}
      Y{{ currentGridCell.y }}
    </div>

    <PlayerStatusHud
      :intoxication="playerStatus.intoxication || 0"
      :health="playerStatus.health"
      :energy="playerStatus.energy"
      :show-energy="hudPreferences.energyBar"
      :fuel="hudState.fuel"
      :damage="hudState.damage"
    />

    <PassengerOccupancyHud
      v-if="hudPreferences.passengerOccupancy"
      :occupied-seats="occupiedSeatCount"
      :capacity="passengerState.capacity"
    />





    <Transition name="objective-notice">
      <div
        v-if="activeObjectiveNotice"
        class="world-map__objective-notice"
        role="status"
        aria-live="polite"
      >
        <i class="fa-solid fa-circle-check" aria-hidden="true" />
        <span>
          <small>{{ activeObjectiveNotice.noticeLabel }}</small>
          <strong>{{ activeObjectiveNotice.title }}</strong>
          <em v-if="activeObjectiveNotice.reward?.money">
            Reward ready: &#8358;{{ activeObjectiveNotice.reward.money.toLocaleString() }}
          </em>
        </span>
      </div>
    </Transition>

    <Transition name="player-warning">
      <div
        v-if="activePlayerWarning"
        class="world-map__player-warning"
        :class="`world-map__player-warning--${activePlayerWarning.type}`"
        role="alert"
        aria-live="assertive"
      >
        <span class="world-map__player-warning-sign">!</span>
        <span>
          <strong>{{ activePlayerWarning.label }}</strong>
          <small>{{ activePlayerWarning.detail }}</small>
        </span>
      </div>
    </Transition>

    <div class="driving-hud-row">
    <VehicleHud
      v-if="hudPreferences.vehicleDashboard"
      :speed="displayedSpeed"
      :gear="displayedGear"
      :fuel="hudState.fuel"
      :damage="hudState.damage"
      :transmission="activeVehicleConfig.transmission"
      :engine-on="isPlayerVehicleEngineStarted()"
      :engine-starting="isPlayerVehicleEngineStarting()"
      :energy="playerStatus.energy"
      :health="playerStatus.health"
      :impounded="fineState.vehicleImpounded"
      :pocket-item="equippedFoodItem"
      :pocket-quantity="equippedFoodItem?.quantity ?? 0"
      @use-pocket-item="handlePocketFoodUse"
      @cycle-pocket-item="handlePocketFoodCycle"
    />
    <RouteNavigationHud
      v-if="routeState.status === 'active' && activeRouteStop"
      :angle="navigationAngleDegrees"
      :target-label="activeRouteStop.label"
      :distance="navigationDistanceMetres"
      :vehicle-type="employmentState.selectedJob"
    />
    </div>

    <RouteHud
      class="route-hud--desktop"
      v-if="hudPreferences.routeGuide && employmentState.selectedJob && routeState.status === 'active'"
      :route="activeRoute"
      :current-stop="activeRouteStop"
      :following-stop="followingRouteStop"
      :current-stop-index="routeState.currentStopIndex"
      :hold-progress="stopHoldProgress"
      :inside-stop="isInsideActiveStop"
      :speed-allowed="isStopSpeedAllowed"
    />

    <EnergyDepletedModal
      v-if="energyDepleted"
      :has-food="inventoryItems.length > 0"
      :hospital-cost="PLAYER_STATUS_CONFIG.faintHospitalCost"
      @clinic="handlePlayerFaint"
    />


    <AgberoPaymentToast :payment="agberoPayment" />

    <PassengerFeedback
      v-if="hudPreferences.feedback && passengerState.lastStopResult"
      :result="passengerState.lastStopResult"
    />

    <EconomyFeedback
      v-if="
        hudPreferences.feedback &&
        economyState.lastTransaction &&
        economyState.lastTransaction.type !== 'agbero-payment' &&
        routeState.status !== 'complete' &&
        !economyState.gameOver
      "
      :transaction="economyState.lastTransaction"
    />

    <EconomyServicePrompt
      v-if="hudPreferences.servicePrompts && nearbyRepairService"
      service-type="repair"
      :cost="repairPurchaseCost"
      :speed-allowed="serviceSpeedAllowed"
      :discount-coupons="lifeObligationState.discountCoupons"
    />

    <RouteComplete
      v-if="routeState.status === 'complete' && completedRoute"
      :route="completedRoute"
      :bonus="employmentState.selectedJob === 'brt' ? economyState.lastRouteBonus : 0"
      :reward-label="
        employmentState.selectedJob === 'brt'
          ? 'BRT SALARY'
          : 'ROUTE BONUS'
      "
      @continue="handleChooseAnotherRoute"
    />

    <DanfoGameOver
      v-if="economyState.gameOver"
      :money="economyState.money"
      :garage-fee="DANFO_ECONOMY_CONFIG.dailyGarageFee"
      :car-owner-fee="DANFO_ECONOMY_CONFIG.dailyCarOwnerFee"
    />

    <FuelPurchaseModal
      v-if="activeServiceModal === 'fuel'"
      :current-fuel="hudState.fuel"
      :money="economyState.money"
      :config="DANFO_ECONOMY_CONFIG"
      :discount-coupons="lifeObligationState.discountCoupons"
      @close="closeServiceModal"
      @purchase="handleFuelPurchase"
    />

    <BankServicesModal
      v-if="activeServiceModal === 'bank'"
      :money="economyState.money"
      :savings-balance="bankSavingsState.balance"
      :savings-rate="bankSavingsState.weeklyRate"
      :current-day="gameClock.day"
      :existing-balance="economyState.bankLoanBalance"
      :interest-rate="DANFO_ECONOMY_CONFIG.bankLoanInterestRate"
      :minimum-amount="DANFO_ECONOMY_CONFIG.minimumLoanAmount"
      :maximum-amount="DANFO_ECONOMY_CONFIG.maximumLoanAmount"
      :eligible="economyState.bankLoanEligible"
      @close="closeServiceModal"
      @submit="handleTakeLoan"
      @deposit="handleSavingsDeposit"
      @withdraw="handleSavingsWithdrawal"
    />

    <CarDealershipModal
      v-if="activeServiceModal === 'dealership'"
      :vehicles="PURCHASABLE_CARS"
      :owned-vehicle-ids="economyState.ownedVehicleIds"
      :money="economyState.money"
      @close="closeServiceModal"
      @purchase="handleVehiclePurchase"
    />

    <EstateAgencyModal
      v-if="activeServiceModal === 'estate-agency'"
      :properties="PROPERTY_CATALOGUE"
      :property-state="propertyState"
      :money="economyState.money"
      @close="closeServiceModal"
      @purchase="handlePropertyPurchase"
    />

    <BusinessOfficeModal
      v-if="activeServiceModal === 'business-office'"
      :business-state="businessView"
      :owned-property-ids="propertyState.ownedPropertyIds"
      :money="economyState.money"
      @close="closeServiceModal"
      @buy-office="handleBusinessOfficePurchase"
      @buy-asset="handleBusinessAssetPurchase"
    />

    <RaceCircuitModal
      v-if="activeServiceModal === 'race-circuit'"
      :race-state="raceState"
      :money="economyState.money"
      @close="closeServiceModal"
      @start="handleRaceStart"
    />

    <aside
      v-if="raceState.status === 'active'"
      class="world-map__race-hud"
      aria-label="Circuit time trial"
    >
      <small>COASTAL TIME TRIAL</small>
      <strong>{{ raceState.elapsedSeconds.toFixed(2) }}s</strong>
      <span>
        CHECKPOINT
        {{ Math.min(raceState.checkpointIndex + 1, COASTAL_CIRCUIT.checkpoints.length) }}
        / {{ COASTAL_CIRCUIT.checkpoints.length }}
      </span>
    </aside>

    <HealthTreatmentModal
      v-if="activeServiceModal === 'health'"
      :provider="nearbyHealthService?.provider ?? 'Medical centre'"
      :cost="treatmentCost"
      :health="playerStatus.health"
      :money="economyState.money"
      :discount-coupons="lifeObligationState.discountCoupons"
      @close="closeServiceModal"
      @treat="handleHealthTreatment"
    />

    <FoodPurchaseModal
      v-if="activeServiceModal === 'food'"
      :seller-label="nearbyFoodService?.sellerLabel ?? 'Food shop'"
      :items="availableFoodItems"
      :money="economyState.money"
      :energy="playerStatus.energy"
      @close="closeServiceModal"
      @purchase="handleFoodPurchase"
    />

    <button
      v-if="
        nearbyHomeParking &&
        serviceSpeedAllowed &&
        !sleepState.overlayVisible
      "
      class="world-map__sleep-button"
      type="button"
      @click="openSleepModal"
    >
      <i class="fa-solid fa-bed" aria-hidden="true" />
      Sleep at home
    </button>

    <button
      v-if="canMoveToOwnedHome && serviceSpeedAllowed && !sleepState.overlayVisible"
      class="world-map__sleep-button world-map__travel-button"
      type="button"
      @click="moveToActiveHome"
    >
      <i class="fa-solid fa-house" aria-hidden="true" />
      Move to {{ activeHomeName }}
    </button>

    <button
      v-if="nearbyMapTravel && serviceSpeedAllowed"
      class="world-map__sleep-button world-map__travel-button"
      type="button"
      @click="handleMapTravel"
    >
      <i class="fa-solid fa-city" aria-hidden="true" />
      Return to Mainland Lagos
    </button>

    <SleepModal
      v-if="sleepState.modalOpen"
      @close="sleepState.modalOpen = false"
      @sleep="handleSleep"
    />

    <CharacterEncounter
      v-if="mutiuEncounter.mode === 'introduction'"
      :character="CHARACTER_DEFINITIONS.mutiu"
      eyebrow="NEW CONTACT"
      title="Mr-Wire"
      message="Hello, my name is Mr-Wire. If you need extra cash on the side, call me. Night work only—and come with a fast car."
      @close="closeMutiuEncounter"
    />

    <GamePhone
      :customization-vehicle="activeVehicleConfig"
      :customization-state="customizationState"
      @customize-vehicle="handleCustomizeVehicle"
      v-if="phoneVisible"
      :game-time="displayedGameTime"
      :current-day="gameClock.day"
      :traffic-period="currentTrafficPeriod.label"
      :garage-fee="DANFO_ECONOMY_CONFIG.dailyGarageFee"
      :money="economyState.money"
      :savings-balance="bankSavingsState.balance"
      :stock-market="stockMarketView"
      :stock-adviser="stockMarketState.adviser"
      :player-name="propertyState.playerName"
      :net-worth="playerNetWorth"
      :routes="offeredRoutes"
      :route-status="routeState.status"
      :active-route="activeRoute"
      :current-stop="activeRouteStop"
      :following-stop="followingRouteStop"
      :current-stop-index="routeState.currentStopIndex"
      :navigation-angle="navigationAngleDegrees"
      :navigation-target="navigationTarget"
      :damage="hudState.damage"
      :health="playerStatus.health"
      :energy="playerStatus.energy"
      :repair-cost="mobileRepairCost"
      :doctor-call-cost="PLAYER_STATUS_CONFIG.doctorCallCost"
      :fuel="hudState.fuel"
      :roadside-fuel-cost="roadsideFuelQuote.cost"
      :roadside-fuel-percent="roadsideFuelQuote.deliveredFuelPercent"
      :roadside-fuel-distance="roadsideFuelQuote.distanceTiles"
      :transactions="bankMessageFeed"
      :outstanding-fines="fineState.outstandingAmount"
      :fine-entries="fineState.entries"
      :vehicle-impounded="fineState.vehicleImpounded"
      :loan-offer-received="economyState.loanOfferReceived"
      :loan-balance="economyState.quickLoanBalance"
      :large-loan-balance="economyState.bankLoanBalance"
      :large-loan-eligible="economyState.bankLoanEligible"
      :bank-loan-amount="DANFO_ECONOMY_CONFIG.quickLoanAmount"
      :bank-loan-interest-rate="DANFO_ECONOMY_CONFIG.quickLoanInterestRate"
      :incoming-call="phoneCallState.activeCall"
      :map-locations="MOTO_EAZI_LOCATIONS"
      :car-catalogue="PURCHASABLE_CARS"
      :owned-vehicle-ids="economyState.ownedVehicleIds"
      :active-vehicle-id="vehicleState.activeVehicleId"
      :home-parking-available="
        Boolean(nearbyHomeParking) && serviceSpeedAllowed
      "
      :moto-eazi-unlocked="economyState.ownedVehicleIds.length > 0"
      :moto-eazi-offers="motoEaziState.offers"
      :moto-eazi-waiting="motoEaziState.waitingForOffers"
      :moto-eazi-active-request="motoEaziState.activeRequest"
      :moto-eazi-stage="motoEaziState.stage"
      :moto-eazi-target="motoEaziTarget"
      :moto-eazi-completed-count="
        motoEaziState.completedRequestIds.length
      "
      :moto-eazi-driver-rating="motoEaziState.driverRating"
      :moto-eazi-ride-elapsed-seconds="motoEaziState.rideElapsedSeconds"
      :moto-eazi-ride-expected-seconds="motoEaziState.rideExpectedSeconds"
      :moto-eazi-ride-collision-count="motoEaziState.rideCollisionCount"
      :moto-eazi-projected-stars="motoEaziState.projectedStars"
      :moto-eazi-last-result="motoEaziState.lastRideResult"
      :sound-volume="soundVolume"
      :sound-muted="soundMuted"
      :current-job="employmentState.selectedJob"
      :driver-licence="driverLicenceState"
      :job-required="!employmentState.selectedJob"
      :inventory-items="inventoryItems"
      :debug-visible="showGrid"
      :observer-mode="observerMode"
      :current-map-id="currentMapId"
      :race-active="
        raceState.status === 'active' ||
        streetRaceIsRunning()
      "
      :show-world-travel-debug="false"
      :show-race-debug="false"
      :objectives="objectiveViews"
      :objective-categories="OBJECTIVE_CATEGORIES"
      :tracked-objective-id="objectiveState.trackedObjectiveId"
      :life-obligations="lifeObligationView"
      :property-state="propertyState"
      :property-catalogue="PROPERTY_CATALOGUE"
      :traffic-report="towTruckState.trafficReport"
      @select-route="handleRouteSelection"
      @select-job="handleJobSelection"
      @start-driving-test="handleStartDrivingTest"
      @track-objective="handleTrackedObjectiveSelection"
      @claim-objective-reward="handleObjectiveRewardClaim"
      @objective-event="handlePhoneObjectiveEvent"
      @pay-rent="handleRentPayment"
      @pay-school-fees="handleSchoolFeesPayment"
      @pay-family-request="handleFamilyRequestPayment"
      @call-mechanic="handleMechanicCall"
      @call-doctor="handleDoctorCall"
      @call-fuel-attendant="handleFuelAttendantCall"
      @report-traffic="handleTrafficReport"
      @call-car-owner="handleCarOwnerCall"
      @call-mutiu="handleMutiuCall"
      @pay-fines="handleFinePayment"
      @repay-loan="handleLoanRepayment"
      @take-bank-loan="handlePhoneBankLoan"
      @cancel-stock-adviser="handleCancelStockAdviser"
      @subscribe-stock-adviser="handleSubscribeStockAdviser"
      @read-stock-adviser="handleReadStockAdviser"
      @buy-stock="handleBuyStock"
      @sell-stock="handleSellStock"
      @list-property-rental="handleRentalListing"
      @remove-property-rental="handleRentalRemoval"
      @rental-action="handleLateRentalAction"
      @accept-incoming-call="handleIncomingCallAccept"
      @decline-incoming-call="handleIncomingCallDecline"
      @select-map-destination="handleMapDestinationSelection"
      @wait-moto-eazi-request="handleWaitForMotoEaziRequest"
      @accept-moto-eazi-request="handleAcceptMotoEaziRequest"
      @reject-moto-eazi-request="handleRejectMotoEaziRequest"
      @change-sound-settings="handleSoundSettingsChange"
      @consume-inventory-item="handleInventoryConsumption"
      @toggle-debug="showGrid = !showGrid"
      @toggle-observer="toggleObserverMode"
      @save-game="saveGame"
      @debug-go-coastal-city="handleDebugGoToCoastalCity"
      @debug-start-race="handleDebugStartRace"
      @clear-saved-state="clearSavedState"
    />

    <div
      v-if="worldTransition.active"
      class="world-map__transition-overlay"
      role="status"
      aria-live="polite"
    >
      <div class="world-map__transition-card">
        <i class="fa-solid fa-city" aria-hidden="true" />
        <small>{{ worldTransition.eyebrow }}</small>
        <strong>{{ worldTransition.label }}</strong>
        <p>
          {{ worldTransition.message }}…
          {{ Math.ceil(worldTransition.remainingSeconds) }}s
        </p>
        <div class="world-map__transition-track">
          <span
            :style="{
              width: `${
                100 -
                (worldTransition.remainingSeconds /
                  worldTransition.totalSeconds) *
                  100
              }%`,
            }"
          />
        </div>
      </div>
    </div>

    <div
      v-if="sleepState.overlayVisible"
      class="world-map__sleep-overlay"
      :class="{ 'world-map__sleep-overlay--fading': sleepState.overlayFading }"
      aria-label="Sleeping"
    >
      <span v-if="!sleepState.overlayFading">Sleeping...</span>
    </div>

    <div
      v-if="false"
      class="world-map__controls"
    >
      W accelerate · S brake/reverse · A/D steer
      <template v-if="activeVehicleConfig.transmission === 'manual'">
        · Q/E change gear
      </template>
      <template v-else>
        · automatic gears
      </template>
    </div>

  </section>
</template>

<style scoped>
.world-map {
  position: relative;
  touch-action: none;
  overscroll-behavior: none;
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #111418;
}

.world-map__canvas {
  touch-action: none;
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
  display: block;
  width: 100%;
  height: 100%;
}

.world-map__player-warning {
  position: absolute;
  z-index: 6000;
  top: 168px;
  left: 50%;
  display: flex;
  width: min(480px, calc(100% - 32px));
  align-items: center;
  gap: 12px;
  padding: 11px 16px;
  border: 1px solid #e5b854;
  background:
    repeating-linear-gradient(135deg, rgb(255 255 255 / 3%) 0 2px, transparent 2px 8px),
    linear-gradient(180deg, rgb(54 48 36 / 97%), rgb(29 27 23 / 97%));
  color: #f5ead0;
  box-shadow: 0 2px 8px rgb(23 33 58 / 10%);
  pointer-events: none;
  transform: translateX(-50%);
  clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px);
}

.world-map__objective-notice {
  position: absolute;
  z-index: 6200;
  top: 205px;
  left: 50%;
  display: grid;
  grid-template-columns: 38px 1fr;
  width: min(390px, calc(100% - 32px));
  align-items: center;
  gap: 10px;
  padding: 11px 14px;
  border: 1px solid #9fc14e;
  color: #f4f0e5;
  background:
    repeating-linear-gradient(135deg, rgb(255 255 255 / 2%) 0 2px, transparent 2px 8px),
    linear-gradient(180deg, rgb(49 53 37 / 97%), rgb(23 25 19 / 97%));
  box-shadow: var(--hud-shadow);
  pointer-events: none;
  transform: translateX(-50%);
  clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px);
}

.world-map__objective-notice > i {
  color: #afd15b;
  font-size: 27px;
}

.world-map__objective-notice > span {
  display: grid;
  gap: 1px;
}

.world-map__objective-notice small {
  color: #a9c75e;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.12em;
}

.world-map__objective-notice strong {
  font-size: 14px;
}

.world-map__objective-notice em {
  color: #d5bd70;
  font-size: 10px;
  font-style: normal;
}

.objective-notice-enter-active,
.objective-notice-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.objective-notice-enter-from,
.objective-notice-leave-to {
  opacity: 0;
  transform: translate(-50%, -10px);
}

.world-map__player-warning-sign {
  display: grid;
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  place-items: center;
  border: 2px solid currentColor;
  color: #f3c64e;
  font-size: 22px;
  font-weight: 1000;
  line-height: 1;
  clip-path: polygon(50% 0, 100% 100%, 0 100%);
}

.world-map__player-warning strong,
.world-map__player-warning small {
  display: block;
}

.world-map__player-warning strong {
  color: #f3c64e;
  font-size: 14px;
  letter-spacing: 0.08em;
}

.world-map__player-warning small {
  margin-top: 2px;
  color: #d9d0bc;
  font-size: 12px;
}

.world-map__player-warning--fine,
.world-map__player-warning--health {
  border-color: #d95b4c;
}

.world-map__player-warning--fine .world-map__player-warning-sign,
.world-map__player-warning--fine strong,
.world-map__player-warning--health .world-map__player-warning-sign,
.world-map__player-warning--health strong {
  color: #ef6a5a;
}

.player-warning-enter-active,
.player-warning-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.player-warning-enter-from,
.player-warning-leave-to {
  opacity: 0;
  transform: translate(-50%, -10px);
}

.world-map__performance {
  position: absolute;
  z-index: 35;
  right: auto;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: grid;
  min-width: 170px;
  gap: 3px;
  padding: 10px 12px;
  border: 1px solid rgb(141 211 255 / 72%);
  border-radius: 9px;
  color: #dff5ff;
  background: rgb(4 25 52 / 88%);
  box-shadow: 0 2px 8px rgb(23 33 58 / 10%);
  font-size: 11px;
  pointer-events: none;
}

.world-map__performance strong {
  color: #ffcf3c;
  font-size: 15px;
}

.world-map__fatigue {
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: none;
  background: rgb(8 10 16 / var(--fatigue-opacity));
  transition: background 500ms ease;
}

.world-map__sleep-button {
  position: absolute;
  right: auto;
  bottom: 118px;
  left: 50%;
  z-index: 18;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border: 1px solid var(--hud-metal-light);
  border-radius: 0;
  background:
    repeating-linear-gradient(135deg, rgb(255 255 255 / 2%) 0 2px, transparent 2px 8px),
    linear-gradient(180deg, var(--hud-panel), var(--hud-panel-deep));
  color: #d8cfb6;
  box-shadow: var(--hud-shadow);
  font: inherit;
  font-weight: 800;
  cursor: pointer;
  transform: translateX(-50%);
  clip-path: polygon(7px 0, 100% 0, 100% calc(100% - 7px), calc(100% - 7px) 100%, 0 100%, 0 7px);
}

.world-map__travel-button {
  bottom: 174px;
}

.world-map__travel-button:disabled {
  color: #8f8876;
  cursor: not-allowed;
  opacity: 0.82;
}

.world-map__race-hud {
  position: absolute;
  z-index: 90;
  top: 150px;
  left: 50%;
  display: grid;
  min-width: 210px;
  padding: 10px 18px;
  border: 1px solid var(--hud-metal-light);
  color: #ddd5bd;
  background:
    repeating-linear-gradient(135deg, rgb(255 255 255 / 2%) 0 2px, transparent 2px 8px),
    linear-gradient(180deg, var(--hud-panel), var(--hud-panel-deep));
  box-shadow: var(--hud-shadow);
  text-align: center;
  transform: translateX(-50%);
}

.world-map__race-hud small {
  color: #d9c66d;
  letter-spacing: 0.12em;
}

.world-map__race-hud strong {
  font-size: 28px;
}

.world-map__illegal-race {
  position: absolute;
  z-index: 6200;
  top: 18px;
  left: 50%;
  display: grid;
  min-width: 300px;
  padding: 12px 20px;
  border: 1px solid #d4bd62;
  color: #f4f0df;
  background:
    linear-gradient(135deg, #171711f2, #302b1df2);
  box-shadow: 0 2px 8px rgb(23 33 58 / 10%);
  text-align: center;
  transform: translateX(-50%);
}

.world-map__illegal-race small {
  color: #d4bd62;
  font-size: 10px;
  letter-spacing: 0.12em;
}

.world-map__illegal-race strong {
  margin-top: 4px;
  font-size: 20px;
}

.world-map__illegal-race span {
  color: #cfc8af;
  font-size: 13px;
}

.world-map__illegal-race-countdown {
  color: #f2c438;
  font-size: 44px !important;
}

.world-map__transition-overlay {
  position: absolute;
  z-index: 99999;
  inset: 0;
  display: grid;
  place-items: center;
  background: #000000;
}

.world-map__transition-card {
  display: grid;
  width: min(520px, calc(100vw - 40px));
  padding: 30px;
  border: 1px solid var(--hud-metal-light);
  color: #ddd5bd;
  background:
    repeating-linear-gradient(135deg, rgb(255 255 255 / 2%) 0 2px, transparent 2px 9px),
    linear-gradient(180deg, var(--hud-panel), var(--hud-panel-deep));
  box-shadow: var(--hud-shadow);
  text-align: center;
  gap: 8px;
}

.world-map__transition-card > i {
  color: #d9c66d;
  font-size: 44px;
}

.world-map__transition-card small {
  color: #d9c66d;
  letter-spacing: 0.16em;
}

.world-map__transition-card strong {
  font-size: 27px;
}

.world-map__transition-card p {
  display: none;
}

.world-map__transition-track {
  height: 8px;
  overflow: hidden;
  border: 1px solid #716b57;
  background: #151611;
}

.world-map__transition-track span {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #829b36, #d9c66d);
  transition: width 100ms linear;
}

.world-map__sleep-overlay {
  position: absolute;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  background: #000000;
  color: #ffffff;
  font-size: 24px;
  font-weight: 900;
  opacity: 1;
  transition: opacity 1.4s ease;
}

.world-map__sleep-overlay--fading {
  opacity: 0;
  pointer-events: none;
}

.world-map__district,
.world-map__observer,
.world-map__controls {
  position: absolute;
  padding: 10px 14px;
  border: 2px solid var(--game-panel-border);
  border-radius: 12px;
  color: #ffffff;
  z-index: 10;
  background: linear-gradient(
    180deg,
    rgb(37 105 196 / 94%),
    rgb(10 46 112 / 94%)
  );
  box-shadow: var(--game-panel-shadow);
  font-weight: 800;
}

.world-map__observer {
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  pointer-events: none;
  font-size: 14px;
}

.world-map__district {
  top: 110px;
  left: 16px;
  font-size: 16px;
}

.world-map__controls {
  right: 304px;
  bottom: 16px;
  font-size: 13px;
  pointer-events: none;
}

.world-map__district {
  pointer-events: none;
}

@media (max-width: 800px) {
  .world-map__controls {
    right: 267px;
    max-width: 270px;
  }
}
</style>









