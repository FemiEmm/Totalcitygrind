<script setup>
import { rebaseCityDates } from "../../time/systems/rebaseCityDates.js";
import { syncSharedClock } from "../../time/systems/sharedClock.js";
import { toRaw } from "vue";
import { patchServerState } from "../../network/patchServerState.js";
import {usePassengerPopulation} from '../../danfo/population/usePassengerPopulation.js';
import {useHeist} from '../../heist/useHeist.js';
import HeistPanel from '../../heist/HeistPanel.vue';
import { installLocalStudio } from "../../game/localStudio.js";
import { useHousing } from '../../housing/useHousing.js';
import { useClub } from '../../club/useClub.js';
import ClubOverlay from '../../club/ClubOverlay.vue';
import { createClubAudio } from '../../club/clubAudio.js';
import { drawClubRoof, isClubLit, clubLightBounds } from '../../club/renderRoof.js';
import { advanceIntoxication, addIntoxication, intoxicationSteering } from '../../player/systems/intoxication.js';
import { useGovernment } from '../../government/useGovernment.js';
import GovernmentOverlay from '../../government/GovernmentOverlay.vue';
import { adjustedRent } from '../../government/rules.js';
import { useCareers } from "../../careers/useCareers.js";
import CareerOverlay from "../../careers/CareerOverlay.vue";
import wastePileUrl from "../../assets/props/waste-pile.png";
import { COAST_CITY_ENABLED, COAST_CITY_LOCK_MESSAGE } from "../../game/worldAvailability.js";
import { migrateLocationLabels } from "../../game/migrateLocationLabels.js";
import PoliceArrest from '../../police/PoliceArrest.vue';
import policeCarUrl from '../../assets/population/police-pickup.png';
import { gameRequest, getPlaceAds, reportBalanceForAntiCheat } from '../../network/connection.js';
import { getSaveAccount } from '../../game/saveSlots.js';
import { createCrimeState, restoreCrimeState, addCrime, POLICE_POSTS, POLICE_OBSTACLES, checkPoliceHotspot } from "../../police/policeSystem.js";
import { calculateNetWorth } from "../../wealth/netWorth.js";
import wealthCatalogue from "../../wealth/catalogue.json";
import { connection } from "../../network/connection.js";
import { activeAdForBillboard, realWorldAdDate, realWorldAdSlot } from '../../advertising/billboards.js';
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
import { drawMainlandGrass, drawMainlandMud } from '../systems/mainlandTerrain.js';
import { northernRoadSpeedMultiplier } from '../systems/roadSurface.js';
import ShareApp from '../../phone/components/ShareApp.vue';
import sangoSoilUrl from '../../assets/environment/sango-soil-topdown-1x1.png';
import sangoTreeUrl from '../../assets/environment/sango-tree-topdown-1x1.png';
import {northernForestTiles} from '../data/worldMap.js';
import dryMudRowUrl from "../../assets/ground/residential/muddy-ground-1x4-dry.png";
import parkingBayTileUrl from "../../assets/roads/parking-bay-tile.png";
import { getCameraDimensions, GRID_COLUMNS, GRID_ROWS, GRID_SIZE, WORLD_HEIGHT, WORLD_MAX_X, WORLD_MAX_Y, WORLD_MIN_X, WORLD_MIN_Y, WORLD_WIDTH } from "../data/mapConstants";

import {
  buildings,
  barriers,
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
  drivingSchoolParkingZones,
  healthParkingZones,
  landmarks,
  mapTravelZones,
  obstacles,
  playerStart,
  repairZones,
  raceZones,
  roads,
  policeParkingZones,
  publicParkingZones,
  trafficLightConcretePads,
} from "../data/worldMap";
import { COASTAL_POPULATION_ROUTES } from "../data/coastalWorldMap.js";

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
import wealthyHomeTreesUrl from "../../assets/buildings/wealthy-home-trees.png";
import { PROPERTY_CATALOGUE } from "../../property/data/properties.js";
import {
  createPropertyState,
  getHomeSleepMultiplier,
  processPropertyMortgageDay,
  purchaseProperty,
  restorePropertyState,
} from "../../property/systems/propertySystem.js";
import { listOwnedHome, removeVacantListing, handleLateTenant, processRentalDay } from "../../property/systems/propertyRentalSystem.js";
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
import { createRaceState, restoreRaceState, startRace, updateRace } from "../../racing/systems/raceSystem.js";
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
  prepareDriverLicenceSchoolNavigation,
  DRIVER_LICENCE_TEST_FEE,
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
  BRT_ROUTES,
  getBrtRouteSalary,
  PLAYER_BRT,
} from "../../employment/data/brtEmployment.js";
import AgberoPaymentToast from "../../danfo/components/AgberoPaymentToast.vue";
import PassengerFeedback from "../../danfo/components/PassengerFeedback.vue";
import RouteComplete from "../../danfo/components/RouteComplete.vue";
import { DANFO_PASSENGER_CONFIG } from "../../danfo/data/danfoPassengerConfig.js";
import {
  DANFO_ROUTE_CONFIG,
  DANFO_ROUTES,
  pickRandomDanfoRoutes,
} from "../../danfo/data/danfoRoutes.js";
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
import { POPULATION_ROUTES } from "../../population/data/populationRoutes.js";
import { DRIVING_TEST_ROUTES } from "../../player/data/drivingTestRoutes.js";
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
} from "../../population/data/trafficLights.js";
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
  updateTowTrucks,
} from "../../population/systems/towTruckSystem.js";
import {
  canVehicleOccupy,
  solidVehiclesOverlap,
  solidVehicleOverlapsRectangle,
  findObstacleCollision,
  getSolidVehicleBounds,
  rebuildObstacleSpatialIndex,
} from "../systems/worldCollision";
import { MAP_DRIVING_LOCATIONS } from "../../motoEazi/data/motoEaziLocations.js";
import { MOTO_EAZI_REQUESTS } from "../../motoEazi/data/motoEaziRequests.js";
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
});
const emit = defineEmits(["enter-world2"]);

const canvasReference = ref(null);
const showGrid = ref(false);
const observerMode = ref(false);
const currentMapId = ref("mainland");
const worldTransition = reactive({
  active: false,
  remainingSeconds: 0,
  totalSeconds: 10,
  label: "",
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
  landmarks: [...landmarks],
  buildings: [...buildings],
  obstacles: [...obstacles],
  busStops: [...busStops],
  fuelPumps: [...fuelPumps],
  repairZones: [...repairZones],
  raceZones: [...raceZones],
  policeParkingZones: [...policeParkingZones],
  publicParkingZones: [...publicParkingZones],
  bankParkingZones: [...bankParkingZones],
  dealershipParkingZones: [...dealershipParkingZones],
  estateAgencyParkingZones: [...estateAgencyParkingZones],
  businessOfficeParkingZones: [...businessOfficeParkingZones],
  homeParkingZones: [...homeParkingZones],
  healthParkingZones: [...healthParkingZones],
  foodParkingZones: [...foodParkingZones],
  drivingSchoolParkingZones: [...drivingSchoolParkingZones],
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
if(getSaveAccount())syncSharedClock(gameClock,GAME_TIME_CONFIG);
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
watch(
  () => economyState.money,
  (money) => {
    if (connection.user?.id && Number(money) > 100_000_000) void reportBalanceForAntiCheat(money).catch(() => {});
  },
);
function blockReviewedTransaction() {
  if (!connection.transactionsLocked) return false;
  connection.error = 'Transactions are temporarily unavailable while account activity is reviewed.';
  return true;
}
const bankSavingsState = reactive(createBankSavingsState(gameClock.day));
const customizationState = reactive(createCustomizationState());
function handleCustomizeVehicle({ kind, id }) {
  if (blockReviewedTransaction()) return;
  const result = applyCustomization(customizationState, activeVehicleConfig.value.id, kind, id, economyState.money);
  if (!result.ok) return;
  if (result.price > 0) chargeExpense({ economyState, amount: result.price, type: 'vehicle-customization', label: result.label, config: DANFO_ECONOMY_CONFIG });
}
const agberoPayment = ref(null);
let agberoPaymentSequence = 0;
const stockMarketState = reactive(createStockMarketState());
const stockMarketView = computed(() => getStockMarketView(stockMarketState));
const bankMessageFeed = computed(() => {
  return bankSavingsState.messages
    .filter(message => message.direction === "notice")
    .sort((left, right) => Number(right.createdAt || 0) - Number(left.createdAt || 0));
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
  if (blockReviewedTransaction()) return;
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
  currentMapId.value === "mainland"
    ? POPULATION_ROUTES
    : COASTAL_POPULATION_ROUTES,
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
  processGodModeFinances();
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

function processCurrentPropertyMortgage() { void housing.act(); }

function processCurrentRentalIncome() { /* Housing settles online rent receipts and offline bills. */ }

function handleRentalListing({propertyId,weeklyRent}) { void housing.act({op:'list',propertyId,weeklyRent}); }
function handleRentalRemoval(propertyId) { void housing.act({op:'unlist',propertyId}); }
function handleLateRentalAction() { showPlayerWarning('housing','HOUSING','Manage your houses in the Housing app.'); }

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

const PLAYER_WARNING_CONFIG = Object.freeze({
  fineAmount: 12000,
  health: 25,
  energy: PLAYER_STATUS_CONFIG.lowEnergyThreshold,
  displayMilliseconds: 5200,
});
const activePlayerWarning = ref(null);
const firstRoutePrompt=ref(false);
const shareWelcomeVisible = ref(false);
const shareRewardAmount = computed(() => economyState.firstShareRewardClaimed ? 20000 : 50000);
function handleShareReward({ complete }) {
  const amount = shareRewardAmount.value;
  const receipt = creditIncome({ economyState, amount, type: 'share-reward', label: amount === 50000 ? 'FIRST SHARE REWARD' : 'SHARE REWARD', config: DANFO_ECONOMY_CONFIG });
  if (!receipt) { complete({ error: 'Rewards are currently unavailable for this account.' }); return; }
  economyState.firstShareRewardClaimed = true;
  saveGame();
  complete({ amount });
}
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
const policeError = ref('');
let policeStationRequest = false;
let policeSprite = null;
let lastCustodySaveMinute = null;
const policeMinute = computed(() => getAbsoluteGameMinute(gameClock));
function freezeForPolice() {
  pressedKeys.clear(); player.speed = 0; stopPlayerVehicleEngine(); activeServiceModal.value = null;
}
function payPoliceBribe() {
  if (blockReviewedTransaction()) return;
  if(crimeState.heistCustody || (heist.active.value && heist.view.value?.account.loot > 0))return;
  if (policeStationRequest || crimeState.status !== 'arrested' || economyState.money < crimeState.bribe) return;
  chargeExpense({ economyState, amount:crimeState.bribe, type:'police-bribe', label:'POLICE BRIBE', config:DANFO_ECONOMY_CONFIG });
  crimeState.score = heist.locked()?100:0; crimeState.status = 'free'; crimeState.bribe = 0; policeError.value = ''; saveGame();
}
async function goToPoliceStation() {
  if (policeStationRequest || crimeState.status !== 'arrested') return;
  policeStationRequest = true; policeError.value = '';
  try {
    const available = policeParkingZones.filter(zone => ![...populationState.vehicles, ...connection.players].some(car => Math.abs(car.x-(zone.x+zone.width/2)) < 75 && Math.abs(car.y-(zone.y+zone.height/2)) < 90));
    let bayId = available[0]?.id;
    if (getSaveAccount()) bayId = (await gameRequest('police-bay', { availableBayIds:available.map(zone=>zone.id) })).bayId;
    if (!bayId) throw new Error('All police parking bays are occupied. Try again shortly.');
    crimeState.bayId = bayId; crimeState.status = 'transfer'; crimeState.fadeSeconds = 0;
    freezeForPolice(); saveGame();
  } catch (error) { policeError.value = error.message; }
  finally { policeStationRequest = false; }
}
function updatePolice(deltaSeconds) {
  if (currentMapId.value !== 'mainland') return;
  if (careers.local.aiTrafficEnabled && crimeState.status === 'free' && checkPoliceHotspot(crimeState, player)) {
    freezeForPolice(); saveGame();
  }
  if (crimeState.status !== 'free') freezeForPolice();
  if (crimeState.status === 'transfer') {
    crimeState.fadeSeconds += deltaSeconds;
    if (crimeState.fadeSeconds >= .6 && !crimeState.releaseMinute) {
      const bay = policeParkingZones.find(zone=>zone.id === crimeState.bayId);
      if (!bay) { crimeState.status = 'arrested'; policeError.value = 'Police parking is unavailable.'; saveGame(); return; }
      player.x = bay.x + bay.width/2; player.y = bay.y + bay.height/2; player.rotation = 0;
      player.previousX = player.x; player.previousY = player.y; player.previousRotation = 0;
      crimeState.releaseMinute = policeMinute.value + 24*60;
      centreCameraOnPlayer(); saveGame();
      if (getSaveAccount()) window.dispatchEvent(new CustomEvent('tcg:police-teleport'));
    }
    if (crimeState.fadeSeconds >= 1.2) { crimeState.status = 'detained'; saveGame(); }
  }
  if (crimeState.status === 'detained') {
    if (lastCustodySaveMinute === null) lastCustodySaveMinute = policeMinute.value;
    if (policeMinute.value - lastCustodySaveMinute >= 60) { lastCustodySaveMinute = policeMinute.value; saveGame(); }
  } else lastCustodySaveMinute = null;
  if (crimeState.status === 'detained' && policeMinute.value >= crimeState.releaseMinute) {
    crimeState.status = 'free'; crimeState.score = heist.locked()?100:0; crimeState.heistCustody = false; crimeState.bribe = 0; crimeState.releaseMinute = 0; crimeState.bayId = null;
    saveGame();
  }
}
function drawParkedPolice(context) {
  if (currentMapId.value !== 'mainland') return;
  for (const post of POLICE_POSTS) {
    if (!isVisible({ x:post.x-60, y:post.y-60, width:120, height:120 })) continue;
    context.save(); context.translate(post.x,post.y); context.rotate(post.rotation);
    drawVehicleGroundShadow(context,42,94);
    if (policeSprite) context.drawImage(policeSprite,364,38,539,1178,-26,-57,52,114);
    else { context.fillStyle='#173154'; context.fillRect(-21,-47,42,94); }
    context.restore();
  }
}

const employmentState = reactive({
  selectedJob: null,
});

const godMode = ref(false);
function processGodModeFinances() {
  if (!godMode.value || !propertyState.starterHomeId) return;
  let changed = false;
  const day = Math.floor(gameClock.day);
  if (day > (Number(economyState.lastGodModeIncomeDay) || 0)) {
    const receipt = creditIncome({ economyState, amount: 100000, type: 'god-mode-allowance', label: 'GOD MODE DAILY ALLOWANCE', config: DANFO_ECONOMY_CONFIG });
    if (receipt) { economyState.lastGodModeIncomeDay = day; changed = true; }
  }
  const rent = lifeObligationState.rent;
  if (rent.status !== 'owned' && day >= rent.nextDueDay) {
    const amount = rent.amount + rent.lateFee;
    if (amount > 0 && economyState.money >= amount) {
      const receipt = chargeExpense({ economyState, amount, type: 'weekly-rent', label: 'GOD MODE AUTO RENT', config: DANFO_ECONOMY_CONFIG });
      if (receipt) {
        payWeeklyRent({ state: lifeObligationState, currentDay: day });
        handleObjectiveEvent('rent-paid');
        changed = true;
      }
    }
  }
  if (changed) saveGame();
}
watch(godMode, enabled => {
  if (!enabled) return;
  processGodModeFinances();
  // Other rented homes already collect rent through the housing settlement flow.
  void housing.act();
});
watch(() => [playerStatus.health, playerStatus.energy, godMode.value], () => {
  if(godMode.value){playerStatus.health=PLAYER_STATUS_CONFIG.maximumHealth;playerStatus.energy=PLAYER_STATUS_CONFIG.maximumEnergy;}
}, {flush:"sync"});
const sleepState = reactive({
  sleeping: false,
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
  surfaceSpeedMultiplier: position => currentMapId.value === "mainland" ? northernRoadSpeedMultiplier(position) : 1,
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
    ? BRT_ROUTES
    : DANFO_ROUTES;
});

const danfoRouteOffers = ref(pickRandomDanfoRoutes());

const offeredRoutes = computed(() => {
  return employmentState.selectedJob === "brt"
    ? BRT_ROUTES
    : danfoRouteOffers.value;
});

function refreshDanfoRouteOffers() {
  danfoRouteOffers.value = pickRandomDanfoRoutes();
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
  if (currentMapId.value !== "mainland") return [];
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
  if (currentMapId.value !== "mainland") return [];
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

const drivingSchoolZone = computed(() => drivingSchoolParkingZones[0] ?? null);
const driverLicenceTarget = computed(() => {
  if (["travelling-to-school", "failed"].includes(driverLicenceState.testStatus)) {
    const zone = drivingSchoolZone.value;
    if (!zone) return null;
    return { ...getStopCentre(zone), label: "Bolade Driving School", districtName: "Driving school", markerType: "driving-school" };
  }
  if (driverLicenceState.testStatus !== "active") return null;
  const stopId = driverLicenceState.testStopIds[driverLicenceState.testStopIndex];
  const stop = busStops.find((item) => item.id === stopId);
  if (!stop) return null;
  return { ...getStopCentre(stop), label: `Checkpoint ${driverLicenceState.testStopIndex + 1}`, districtName: "Licence test", markerType: "driving-test" };
});

const navigationTarget = computed(() => {
  if (driverLicenceTarget.value) {
    return driverLicenceTarget.value;
  }

  if (motoEaziTarget.value) {
    return motoEaziTarget.value;
  }

  if (driverLicenceTarget.value) {
    drawMotoEaziWorldMarker(context, driverLicenceTarget.value, "pickup", elapsedSeconds);
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
  if (propertyState.starterHomeRisk?.missingCarPart) return 12000;
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
let dryMudRowImage = null;
let sangoSoilImage=null,sangoTreeImage=null;
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
const billboardAdSprites = new Map();
const billboardAdBookings = ref([]);
let billboardRefreshTimer = null;
let billboardSlotTimer = null;
let billboardLastSlotKey = '';
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
  ...bankParkingZones,
  ...businessOfficeParkingZones,
  ...mapTravelZones,
  ...raceZones,
  ...dealershipParkingZones,
  ...estateAgencyParkingZones,
  ...homeParkingZones,
  ...healthParkingZones,
  ...foodParkingZones,
  ...drivingSchoolParkingZones,
  ...policeParkingZones,
  ...publicParkingZones,
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
  image.crossOrigin = "anonymous";

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

function currentBillboardBooking(billboardId) {
  return activeAdForBillboard(billboardAdBookings.value, billboardId, new Date());
}

async function refreshBillboardAds() {
  try {
    const result = await getPlaceAds(realWorldAdDate());
    billboardAdBookings.value = Array.isArray(result?.ads) ? result.ads : [];
    for (const booking of billboardAdBookings.value) {
      if (!booking?.imageUrl) continue;
      requestMappedCanvasImage({
        source: booking.imageUrl,
        target: billboardAdSprites,
        key: booking.imageUrl,
        invalidateStaticMap: true,
      });
    }
    invalidateStaticMapCache();
  } catch {
    // Billboards remain usable as PLACE AD HERE placeholders if refresh fails.
  }
}

function refreshBillboardSlot() {
  const key = `${realWorldAdDate()}:${realWorldAdSlot()}`;
  if (key !== billboardLastSlotKey) {
    billboardLastSlotKey = key;
    invalidateStaticMapCache();
    void refreshBillboardAds();
  }
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
  if (careers.local.aiTrafficEnabled && currentMapId.value === 'mainland' && POLICE_OBSTACLES.some(post => solidVehicleOverlapsRectangle(collisionShape,post))) {
    playerTrafficCollisionDetected = true;
    return false;
  }
  if (!canVehicleOccupy(collisionShape)) {
    return false;
  }

  const overlapsTraffic = populationTrafficStateOverlaps(
    collisionShape,
    populationState,
  );

  if (overlapsTraffic) {
    playerTrafficCollisionDetected = true;
  }

  const remoteCollision = connection.players.some(peer => solidVehiclesOverlap(collisionShape, getVehicleCollisionShape(peer, getPlayerVehicleConfig(peer.vehicleId))));
  if (remoteCollision) playerTrafficCollisionDetected = true;
  return !overlapsTraffic && !remoteCollision;
}

function canPopulationVehicleOccupy(collisionShape) {
  const bounds = getSolidVehicleBounds(collisionShape);
  const offMapStagingDistance = GRID_SIZE * 3;
  const insidePopulationStagingBounds = (
    bounds.x >= -offMapStagingDistance &&
    bounds.y >= WORLD_MIN_Y - offMapStagingDistance &&
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
  if (currentMapId.value !== "mainland") return;
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
  if (currentMapId.value !== "mainland") return;
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
  const firstRow = Math.max(Math.floor(WORLD_MIN_Y / GRID_SIZE), Math.floor(camera.y / GRID_SIZE));
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

function drawRoadDivider(context, road) {
  const roadThickness = Math.min(road.width, road.height);

  if (
    road.surface === "mud" ||
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
        if (horizontal) {
          context.fillRect(
            start,
            road.y + divider.offset - divider.width / 2,
            end - start,
            divider.width,
          );
        } else {
          context.fillRect(
            road.x + divider.offset - divider.width / 2,
            start,
            divider.width,
            end - start,
          );
        }
      });
    });
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

function staticItemTouchesTile(item, tileBounds) {
  return (
    item.x < tileBounds.x + tileBounds.width &&
    item.x + item.width > tileBounds.x &&
    item.y < tileBounds.y + tileBounds.height &&
    item.y + item.height > tileBounds.y
  );
}

function drawStaticRoadSurface(context, road) {
  // Mainland dirt is already drawn in the shared ground layer, with blended verges.
  if (currentMapId.value === "mainland" && (road.surface === "mud" || road.type === "dirt")) return;
  const surfaceImage = road.surface === "mud" ? sangoSoilImage :
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
    road.surface === "mud" || road.type === "dirt"
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

function drawBridgeDeckDetails(context, road) {
  if (road.type !== "bridge") return;
  context.save();
  context.strokeStyle = "rgb(12 18 22 / 72%)";
  context.lineWidth = 16;
  context.strokeRect(
    road.x + 5,
    road.y + 5,
    road.width - 10,
    road.height - 10,
  );
  context.strokeStyle = "#bbb6a7";
  context.lineWidth = 5;
  context.strokeRect(
    road.x + 9,
    road.y + 9,
    road.width - 18,
    road.height - 18,
  );
  context.restore();
}

function getCoastalNoDriveOutlineAreas() {
  if (currentMapId.value !== "coastal-city") return [];
  const buildingAreas = buildings.map((building) => ({
    id: building.id,
    x: building.lotX ?? building.x,
    y: building.lotY ?? building.y,
    width: building.lotWidth ?? building.width,
    height: building.lotHeight ?? building.height,
  }));
  const fixedBarriers = barriers.filter((barrier) => {
    return !barrier.id?.startsWith("ocean-");
  });
  return [
    ...buildingAreas,
    ...fixedBarriers,
    {
      id: "coastal-ocean-boundary",
      x: 58 * GRID_SIZE,
      y: 0,
      width: 6 * GRID_SIZE,
      height: WORLD_HEIGHT,
    },
  ];
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
    drawBridgeDeckDetails(context, bridgeDeck);
    drawRoadDivider(context, bridgeDeck);
  });

  populationState.vehicles.forEach((vehicle) => {
    if (
      vehicle.routeId?.includes("bridge-city") &&
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

  // One continuous grass surface for Sango and its surrounding woodland.
  if (currentMapId.value === 'mainland' && tileY < 0) {
    drawMainlandGrass(context, { x: 0, y: -71 * GRID_SIZE, width: WORLD_WIDTH, height: 71 * GRID_SIZE });
  }
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

    if (currentMapId.value === "mainland") {
      drawMainlandGrass(context, districtBounds);
      return; // Mud is composited once below, across district boundaries.
    }
    context.fillStyle =
      (district.id !== "coastal-ocean" &&
        grassTileImage &&
        context.createPattern(grassTileImage, "repeat")) ||
      district.ground;
    context.fillRect(
      district.worldX,
      district.worldY,
      district.width,
      district.height,
    );
    for (const patch of district.mudGroundPatches ?? []) {
      const bounds = { x: district.worldX + patch.x, y: district.worldY + patch.y, width: patch.width, height: patch.height };
      if (!staticItemTouchesTile(bounds, tileBounds)) continue;
      context.save();
      context.translate(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
      if (patch.vertical) context.rotate(Math.PI / 2);
      const width = 4 * GRID_SIZE, height = GRID_SIZE;
      context.fillStyle = '#aa783f';
      context.fillRect(-width / 2, -height / 2, width, height);
      if (dryMudRowImage) context.drawImage(dryMudRowImage,
        dryMudRowImage.width * .02, dryMudRowImage.height * .15,
        dryMudRowImage.width * .955, dryMudRowImage.height * .68,
        -width / 2, -height / 2, width, height);
      context.restore();
    }
  });

  if (currentMapId.value === 'mainland') {
    const mudRegions = [
      ...roads.filter(road => road.surface === 'mud' || road.type === 'dirt'),
      ...districts.flatMap(district => (district.mudGroundPatches ?? []).map(patch => ({
        x: district.worldX + patch.x, y: district.worldY + patch.y,
        width: patch.width, height: patch.height,
      }))),
      // Keep existing residential earth footprints, but blend them into neighboring ground.
      ...buildings.filter(building => building.isLandmark && building.singleRoomRow),
    ];
    drawMainlandMud(context, tileBounds, mudRegions);
  }

  edgeBorderTiles.forEach((tile) => {
    if (!staticItemTouchesTile(tile, tileBounds)) {
      return;
    }

    context.fillStyle = tile.colour;
    context.fillRect(
      tile.x,
      tile.y,
      tile.width,
      tile.height,
    );
  });

  if(currentMapId.value==='mainland'&&sangoTreeImage){
    for(const tile of northernForestTiles){
      if(!staticItemTouchesTile(tile,tileBounds))continue;
      for(const tree of tile.trees){context.save();context.translate(tree.x,tree.y);context.rotate(tree.rotation);context.drawImage(sangoTreeImage,-tree.size/2,-tree.size/2,tree.size,tree.size);context.restore();}
    }
  }
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
      drawBridgeDeckDetails(context, road);
    }
  });

  orderedRoads.forEach((road) => {
    if (staticItemTouchesTile(road, tileBounds)) {
      drawRoadDivider(context, road);
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
  context.fillStyle = "#d7c9a8";
  context.fillRect(barrier.x, barrier.y, barrier.width, barrier.height);
  context.strokeStyle = "#303236";
  context.lineWidth = 3;
  context.strokeRect(barrier.x, barrier.y, barrier.width, barrier.height);
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

  if (building.billboardId) {
    const x = building.lotX ?? building.x;
    const y = building.lotY ?? building.y;
    const width = building.lotWidth ?? building.width;
    const height = building.lotHeight ?? building.height;
    const inset = Math.max(8, Math.min(width, height) * 0.045);
    context.save();
    context.fillStyle = '#ffffff';
    context.fillRect(x, y, width, height);
    context.strokeStyle = '#111111';
    context.lineWidth = 7;
    context.strokeRect(x + 3.5, y + 3.5, width - 7, height - 7);
    const booking = currentBillboardBooking(building.billboardId);
    const sprite = booking?.imageUrl ? billboardAdSprites.get(booking.imageUrl) : null;
    if (booking?.imageUrl && !sprite) {
      requestMappedCanvasImage({ source: booking.imageUrl, target: billboardAdSprites, key: booking.imageUrl, invalidateStaticMap: true });
    }
    if (sprite) {
      drawImageContained(context, sprite, x + inset, y + inset, width - inset * 2, height - inset * 2);
    } else {
      context.fillStyle = '#111111';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.font = `bold ${Math.max(16, Math.floor(Math.min(width, height) * 0.12))}px Basic`;
      context.fillText('PLACE AD HERE', x + width / 2, y + height / 2, width - inset * 2);
    }
    context.restore();
    return;
  }

  context.save();
  context.fillStyle='rgba(0,0,0,0.24)';
  context.shadowColor='rgba(0,0,0,0.38)';context.shadowBlur=14;
  context.shadowOffsetX=8;context.shadowOffsetY=10;
  context.fillRect(building.x+6,building.y+6,building.width-12,building.height-12);
  context.restore();
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
    if (building.singleRoomRow) {
      const vertical = building.spriteRotationQuarterTurns % 2 === 1;
      const crop = building.spriteSourceFraction;
      context.save();
      context.translate(building.x + building.width / 2, building.y + building.height / 2);
      context.rotate((building.spriteRotationQuarterTurns ?? 0) * Math.PI / 2);
      const width = vertical ? building.height : building.width;
      const height = vertical ? building.width : building.height;
      // Mainland earth foundations are already blended into the cached ground layer.
      if (currentMapId.value !== 'mainland') {
        context.fillStyle = '#aa783f';
        context.fillRect(-width / 2, -height / 2, width, height);
        if (dryMudRowImage) {
          context.drawImage(dryMudRowImage,
            dryMudRowImage.width * 0.02, dryMudRowImage.height * 0.15,
            dryMudRowImage.width * 0.955, dryMudRowImage.height * 0.68,
            -width / 2, -height / 2, width, height);
        }
      }
      const roofInset = height * 0.045;
      context.drawImage(landmarkSprite,
        crop.x * landmarkSprite.width, crop.y * landmarkSprite.height,
        crop.width * landmarkSprite.width, crop.height * landmarkSprite.height,
        -width / 2 + roofInset, -height / 2 + roofInset, width - roofInset * 2, height - roofInset * 2);
      context.restore();
    } else {
      drawImageContained(context, landmarkSprite, building.x, building.y, building.width, building.height);
    }
    if (building.id === "lagoon-view-residence") {
      const treeSprite = landmarkSprites.get(wealthyHomeTreesUrl);
      if (!treeSprite) requestMappedCanvasImage({ source: wealthyHomeTreesUrl, target: landmarkSprites, key: wealthyHomeTreesUrl, invalidateStaticMap: true });
      else {
        const size = Math.min(building.width, building.height) * 0.38;
        [[-0.1,-0.08],[0.72,-0.08],[-0.1,0.72],[0.72,0.72]].forEach(([px, py]) => drawImageContained(context, treeSprite, building.x + building.width * px, building.y + building.height * py, size, size));
      }
    }
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
      -building.width / 2,
      -building.height / 2,
      building.width,
      building.height,
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

  if (driverLicenceTarget.value) {
    drawMotoEaziWorldMarker(context, driverLicenceTarget.value, "pickup", elapsedSeconds);
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
  if (zone.parkingFront) {
    if (checkVisibility && !isVisible(zone)) return;
    context.save();
    context.translate(zone.x + zone.width / 2, zone.y + zone.height / 2);
    context.rotate(({ south: 0, north: Math.PI, east: -Math.PI / 2, west: Math.PI / 2 })[zone.parkingFront]);
    if (parkingBayTileImage) {
      context.drawImage(parkingBayTileImage, -zone.width / 2, -zone.height / 2, zone.width, zone.height);
    } else {
      context.fillStyle = '#303338';
      context.fillRect(-zone.width / 2, -zone.height / 2, zone.width, zone.height);
    }
    context.restore();
    // Labels stay upright for every row orientation.
    context.save();
    context.fillStyle = '#f4eee0';
    context.font = 'bold 16px Basic, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(zone.shortLabel, zone.x + zone.width / 2, zone.y + zone.height / 2);
    context.restore();
    return;
  }

  if (zone.kind === "world-travel") {
    drawMapTravelGateway(context, zone);
    return;
  }
  if (checkVisibility && !isVisible(zone)) {
    return;
  }

  context.save();

  if (parkingBayTileImage) {
    context.drawImage(
      parkingBayTileImage,
      zone.x,
      zone.y,
      zone.width,
      zone.height,
    );
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
  context.save();
  context.translate(renderTransform.x, renderTransform.y);
  context.rotate(renderTransform.rotation);
  if (playerBridgeState.elevation > 0) {
    const elevationScale =
      1 + playerBridgeState.elevation * 0.055;
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
  const startY = -(vehicle.lightLength ?? vehicle.length) / 2 + 3;
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
      lightLength: activeVehicleConfig.value.length * (activeVehicleConfig.value.spriteRenderScale ?? 1),
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

const remoteTransforms = new Map();
function drawOnlinePlayers(context) {
  const present = new Set(connection.players.map(p => p.id));
  for (const id of remoteTransforms.keys()) if (!present.has(id)) remoteTransforms.delete(id);
  for (const peer of connection.players) {
    if (!isVisible({ x: peer.x - 100, y: peer.y - 100, width: 200, height: 200 })) continue;
    const config = getPlayerVehicleConfig(peer.vehicleId);
    if (!config) continue;
    const now = performance.now();
    const transform = remoteTransforms.get(peer.id) || { x: peer.x, y: peer.y, rotation: peer.rotation, at: now };
    const blend = 1 - Math.exp(-Math.min(250, now - transform.at) / 80);
    transform.x += (peer.x - transform.x) * blend; transform.y += (peer.y - transform.y) * blend;
    const angle = Math.atan2(Math.sin(peer.rotation - transform.rotation), Math.cos(peer.rotation - transform.rotation));
    transform.rotation += angle * blend; transform.at = now; remoteTransforms.set(peer.id, transform);
    const sprite = peer.vehicleId === PLAYER_DANFO.id ? playerDanfoSprite : purchasedVehicleSprites.get(peer.vehicleId);
    if (!sprite && config.spriteUrl) requestMappedCanvasImage({ source: config.spriteUrl, target: purchasedVehicleSprites, key: peer.vehicleId });
    const scale = config.spriteRenderScale ?? 1.22;
    context.save(); context.translate(transform.x, transform.y); context.rotate(transform.rotation);
    drawVehicleGroundShadow(context, config.width * scale, config.length * scale);
    if (sprite) drawCustomizedVehicle(context, sprite, config, {}, config.width * scale, config.length * scale);
    else { context.fillStyle = '#ffdb3b'; context.fillRect(-config.width/2, -config.length/2, config.width, config.length); }
    context.restore();
    context.save(); context.font = 'bold 12px Basic, sans-serif'; context.textAlign = 'center';
    const labelWidth = context.measureText(peer.name).width + 14;
    context.fillStyle = '#17213a'; context.fillRect(transform.x-labelWidth/2, transform.y-config.length-15, labelWidth, 20);
    context.fillStyle = '#fff8df'; context.fillText(peer.name, transform.x, transform.y-config.length); context.restore();
  }
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

const clubAudio=createClubAudio();
watch(() => props.paused, paused => { if(paused)clubAudio.stop(); });

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
  drawCareerWaste(context);
  drawPopulationVehicles(context);
  if (careers.local.aiTrafficEnabled) drawParkedPolice(context);
  drawOnlinePlayers(context);
  drawTowTrucks(context);
  drawActiveStopZone(context);
  drawPlayerDanfo(context);
  drawElevatedBridgeLayer(context);
  drawNightOverlay(context);
  const clubBuilding=labelledLandmarks.find(b=>b.id==='night-club');
  if(clubBuilding&&isVisible(clubLightBounds(clubBuilding)))drawClubRoof(context,clubBuilding,gameClock.minuteOfDay,club.events.value,club.now());
  // Use the real viewport, not isVisible's extra off-screen rendering margin.
  const clubOnScreen=clubBuilding&&clubBuilding.x+clubBuilding.width>renderCameraX&&clubBuilding.x<renderCameraX+CAMERA_WIDTH&&clubBuilding.y+clubBuilding.height>renderCameraY&&clubBuilding.y<renderCameraY+CAMERA_HEIGHT;
  clubAudio.update(!props.paused&&clubOnScreen&&isClubLit(gameClock.minuteOfDay,club.events.value,club.now()));
  drawAllVehicleHeadlights(context);
  drawPlayerVehicleSignalLights(context);
  drawCollisionSpace(context);
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
  if(club.modal.value || government.modal.value || careers.modal.value || careers.state.lesson || careers.state.shift || careers.notice.value) return;
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
  replaceMapArray(policeParkingZones, mapData.policeParkingZones ?? []);
  replaceMapArray(publicParkingZones, mapData.publicParkingZones ?? []);
  replaceMapArray(mapTravelZones, mapData.mapTravelZones);
  replaceMapArray(raceZones, mapData.raceZones ?? []);
  replaceMapArray(
    labelledLandmarks,
    mapData.buildings.filter((building) => building.isLandmark),
  );
  replaceMapArray(staticServiceZones, [
    ...mapData.fuelPumps,
    ...mapData.repairZones,
    ...mapData.bankParkingZones,
    ...mapData.dealershipParkingZones,
    ...mapData.estateAgencyParkingZones,
    ...mapData.businessOfficeParkingZones,
    ...mapData.homeParkingZones,
    ...mapData.healthParkingZones,
    ...mapData.foodParkingZones,
    ...(mapData.drivingSchoolParkingZones ?? []),
    ...mapData.mapTravelZones,
    ...(mapData.policeParkingZones ?? []),
    ...(mapData.publicParkingZones ?? []),
    ...(mapData.raceZones ?? []),
  ]);
  Object.assign(playerStart, mapData.playerStart);
  rebuildObstacleSpatialIndex();
  staticMapTiles.clear();
}



function handleMapTravel() {
  emitWorld2Travel(false);
}



function handleDebugGoToCoastalCity() {
  emitWorld2Travel(false);
}

function handleDebugStartRace() {
  emitWorld2Travel(true);
}

function handleMutiuCall() {
  if(!COAST_CITY_ENABLED){void heist.act();return;}
  const minuteOfDay =
    ((gameClock.minuteOfDay % (24 * 60)) + 24 * 60) %
    (24 * 60);

  const isNight = minuteOfDay >= 18 * 60 || minuteOfDay < 6 * 60;

  if (
    isNight &&
    (raceOfferedOnDay(gameClock.day) || isMutiuGuaranteedCallWindow(gameClock.day, minuteOfDay)) &&
    !hasCompletedMutiuRaceOnDay(gameClock.day)
  ) {
    emitWorld2Travel(true);
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
  if(!COAST_CITY_ENABLED)return;
  resolveMutiuInvitation(mutiuEncounter, true, gameClock.day);
  playGameSound("confirm");
  emitWorld2Travel(true);
}

function emitWorld2Travel(startRaceOnArrival) {
  if (!COAST_CITY_ENABLED) {
    showPlayerWarning('info', 'COAST CITY', COAST_CITY_LOCK_MESSAGE);
    return;
  }
  pressedKeys.clear();
  player.speed = 0;
  const config = activeVehicleConfig.value;
  emit("enter-world2", {
    startRace: startRaceOnArrival,
    vehicle: {
      id: config.id,
      name: config.name ?? (
        config.id === PLAYER_BRT.id ? "BRT" : "Danfo"
      ),
      spriteUrl:
        config.id === PLAYER_DANFO.id
          ? playerDanfoSpriteUrl
          : config.spriteUrl,
      fuel: hudState.fuel,
      damage: hudState.damage,
      gearIndex: player.gearIndex,
      gear: displayedGear.value,
      transmission: config.transmission,
      width: config.width,
      length: config.length,
      health: playerStatus.health,
      energy: playerStatus.energy,
      occupiedSeats: occupiedSeatCount.value,
      passengerCapacity: passengerState.capacity,
      money: economyState.money,
      gameTime: displayedGameTime.value,
      minuteOfDay: gameClock.minuteOfDay,
      currentDay: gameClock.day,
      ownedVehicleIds: [...economyState.ownedVehicleIds],
      economyState: JSON.parse(JSON.stringify(economyState)),
      bankSavingsState: JSON.parse(JSON.stringify(bankSavingsState)),
      stockMarketState: JSON.parse(JSON.stringify(stockMarketState)),
      travelCrimeState: { ...crimeState },
      travelPropertyState: JSON.parse(JSON.stringify(propertyState)),
      travelLifeState: JSON.parse(JSON.stringify(lifeObligationState)),
    customizationState: JSON.parse(JSON.stringify(customizationState)),
    },
  });
}

function moveToActiveHome() {
  if(heist.active.value){showPlayerWarning('heist','BANK JOB','Drive home yourself to finish the heist.');return;}
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
  if(sleepState.sleeping){
    pressedKeys.clear();player.speed=0;
    const hours=deltaSeconds*GAME_TIME_CONFIG.gameMinutesPerRealSecond/60;
    restoreEnergyFromSleep(playerStatus,hours*getHomeSleepMultiplier(propertyState),PLAYER_STATUS_CONFIG);
    playerStatus.health=Math.min(PLAYER_STATUS_CONFIG.maximumHealth,playerStatus.health+hours*12.5);
  }
  club.update();
  heist.update(deltaSeconds);
  government.update();
  careers.update(economyState.gameOver ? 0 : deltaSeconds * GAME_TIME_CONFIG.gameMinutesPerRealSecond, economyState.gameOver ? 0 : deltaSeconds);
  if (careers.notice.value) { pressedKeys.clear(); player.speed = 0; stopPlayerVehicleEngine(); }
  updatePolice(deltaSeconds);
  if (crimeState.status === "detained" && economyState.gameOver) {
    if(getSaveAccount())syncSharedClock(gameClock,GAME_TIME_CONFIG);else updateGameClock(gameClock,deltaSeconds,GAME_TIME_CONFIG);
  }
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

  advanceIntoxication(playerStatus,getAbsoluteGameMinute(gameClock)+elapsedGameMinutes,{sleeping:sleepState.sleeping,crashEnergy:PLAYER_STATUS_CONFIG.dryGinCrashEnergy});
  if (crimeState.status === "free" && !sleepState.sleeping && !godMode.value) updatePlayerEnergy({
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

    try {
      if (careers.local.aiTrafficEnabled) updatePopulationTraffic({
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
      trafficLights:
        currentMapId.value === "mainland" ? TRAFFIC_LIGHTS : [],
      trafficLightState,
      trafficLightConfig: TRAFFIC_LIGHT_CONFIG,
      highwayLights:
        currentMapId.value === "mainland" ? HIGHWAY_LIGHTS : [],
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
      trafficLights:
        currentMapId.value === "mainland" ? ALL_SIGNAL_LIGHTS : [],
      playerCollisionBox,
      canOccupyWorld: canVehicleOccupy,
      deltaSeconds: trafficDeltaSeconds,
      config: { ...TOW_TRUCK_CONFIG, surfaceSpeedMultiplier: runtimeTrafficConfig.surfaceSpeedMultiplier },
      gameClock,
      viewBounds: {
        x: camera.x,
        y: camera.y,
        width: CAMERA_WIDTH,
        height: CAMERA_HEIGHT,
      },
    });
  }

  if (!economyState.gameOver) {
    // The player is always controlled by keyboard input.
    // Route selection must never lock player movement.
    if (!observerMode.value && !activeServiceModal.value) {
      const fuelDepleted = hudState.fuel <= 0;
      const vehicleDisabled =
        crimeState.status !== "free" || Boolean(careers.notice.value) ||
        hudState.damage >= 100 ||
                playerStatus.health <= 0 ||
        playerStatus.energy <= 0 ||
        fineState.vehicleImpounded ||
        propertyState.starterHomeRisk?.missingCarPart ||
        sleepState.overlayVisible;

      if (fuelDepleted && Math.abs(player.speed) > 0.1) {
        stopPlayerVehicleEngine();
        updatePlayerVehicle({
          vehicle: player,
          pressedKeys: EMPTY_PLAYER_INPUT,
          deltaSeconds,
          config: activeVehicleConfig.value,
          speedMultiplier: currentMapId.value === "mainland" ? northernRoadSpeedMultiplier(player) : 1,
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
          speedMultiplier: currentMapId.value === "mainland" ? northernRoadSpeedMultiplier(player) : 1,
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
          player.speed = 0;
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

    if (crimeState.status === "free") updateServiceModalAvailability();

    if (!nearbyHomeParking.value) {
      homeParkingProcessed = false;
    } else if (
      serviceSpeedAllowed.value &&
      !homeParkingProcessed
    ) {
      if (
        !careers.state.shift &&
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

    if(getSaveAccount())syncSharedClock(gameClock,GAME_TIME_CONFIG);
    else updateGameClock(gameClock,deltaSeconds,GAME_TIME_CONFIG);

    if(COAST_CITY_ENABLED) updateMutiuEncounter({
      state: mutiuEncounter,
      day: gameClock.day,
      minuteOfDay: gameClock.minuteOfDay,
      deltaSeconds,
      blocked:
        crimeState.status !== "free" ||
        props.paused ||
        worldTransition.active ||
        Boolean(activeServiceModal.value) ||
        Boolean(phoneCallState.activeCall) ||
        sleepState.overlayVisible ||
        economyState.gameOver ||
        raceState.status === "active",
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
      void syncOnlineEconomyDayClose(previousDay);
      processGodModeFinances();
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

    const routeEvent = passengerPopulation.update(deltaSeconds,
      crimeState.status !== 'free' || economyState.gameOver || !employmentState.selectedJob || !(isDrivingDanfo.value || isDrivingBrt.value) || !!careers.state.shift);
    if (routeEvent) {
      const passengerResult = routeEvent.result;
      const stopSoundSequence = routeEvent.type === "boarding" ? [] : ["busStopArrival"];
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
        const onlineRoute = Boolean(getSaveAccount());
        const payment = chargeAgberoPickup({
          economyState, currentDay: gameClock.day,
          boardedCount: passengerResult.chargeAgbero ? passengerResult.boardedCount : 0, config: DANFO_ECONOMY_CONFIG,
          optimistic: onlineRoute,
        });
        if (payment) agberoPayment.value = { ...payment, id: ++agberoPaymentSequence };
        addPassengerFare(
          economyState,
          passengerResult.fareEarned,
          { optimistic: onlineRoute },
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
            optimistic: Boolean(getSaveAccount()),
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
      saveGame();
    }

    if (
      !careers.state.shift &&
      !isDrivingDanfo.value &&
      !isDrivingBrt.value
    ) {
      {
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

  if (document.hidden && godMode.value) {
    simulationAccumulator = 0;
    animationFrameId = window.requestAnimationFrame(animationLoop);
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
  if(!employmentState.selectedJob&&isDrivingDanfo.value)handleJobSelection('danfo');
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
    routeState.tripId=crypto.randomUUID(); passengerPopulation.wake();
    startDanfoPassengerRoute({
      passengerState,
      route,
      config: activePassengerConfig.value,
    });
  }
}

function handleChooseAnotherRoute() {
  passengerPopulation.wake();
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
  if(getSaveAccount())syncSharedClock(gameClock,GAME_TIME_CONFIG);
  if (typeof window === "undefined") {
    return false;
  }

  saveActiveVehicleCondition();
  const saveData = {
    clockVersion: getSaveAccount() ? 1 : 0,
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
    vehicleConditionStates: vehicleConditionStates,
    playerStatus: { ...playerStatus },
    playerInventory: playerInventory,
    equippedFoodId: equippedFoodId.value,
    heistState:getSaveAccount()?null:heist.offline.value,
    heistLocal:{...heist.local},
    housingState:getSaveAccount()?null:housing.offline.value,
    housingLocal:{...housing.local},
    clubState: getSaveAccount()?null:club.offline.value,
    clubLocal: {...club.local},
    governmentState: getSaveAccount() ? null : government.offline.value,
    governmentLocal: government.local,
    careerState: careers.state,
    careerLocal: { ...careers.local },
    crimeState: { ...crimeState },
    gameClock: { ...gameClock },
    routeState: routeState,
    passengerPool: getSaveAccount()?null:passengerPopulation.pool.value,
    passengerPopulationLocal:{...passengerPopulation.local},
    passengerState: passengerState,
    economyState: economyState,
    bankSavingsState: bankSavingsState,
    stockMarketState: stockMarketState,
    customizationState: customizationState,
    fineState: fineState,
    driverLicenceState: driverLicenceState,
    objectiveState: objectiveState,
    dailyQuestState: dailyQuestState,
    routeCareerState: { ...routeCareerState },
    lifeObligationState: lifeObligationState,
    propertyState: propertyState,
    businessState: businessState,
    raceState: raceState,
    playerBridgeState: { ...playerBridgeState },
    employmentState: { ...employmentState },
    motoEaziState: motoEaziState,
  };

  try {
    window.localStorage.setItem(
      getSaveStorageKey(),
      JSON.stringify(saveData, (_key, value) => toRaw(value)),
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
    const saveData = JSON.parse(
      window.localStorage.getItem(getSaveStorageKey()),
    );

    if (!saveData || saveData.version !== 1) {
      return false;
    }

    if(getSaveAccount() && saveData.clockVersion!==1 && saveData.gameClock){
      const old={...saveData.gameClock},city={...old};syncSharedClock(city,GAME_TIME_CONFIG);
      rebaseCityDates(saveData,city.day-old.day,(city.day-old.day)*1440+city.minuteOfDay-old.minuteOfDay);
      saveData.gameClock=city;saveData.clockVersion=1;
    }
    migrateLocationLabels(saveData);
    heist.restore(saveData.heistState,saveData.heistLocal);
    housing.restore(saveData.housingState,saveData.housingLocal);
    club.restore(saveData.clubState,saveData.clubLocal);
    government.restore(saveData.governmentState, saveData.governmentLocal);
    careers.restore(saveData.careerState, saveData.careerLocal);
    if (!careers.local.aiTrafficEnabled) clearAiTraffic();
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
    if(getSaveAccount())syncSharedClock(gameClock,GAME_TIME_CONFIG);
    restoreCrimeState(crimeState, saveData.crimeState);
    Object.assign(routeState, saveData.routeState ?? {});
    Object.assign(passengerState, saveData.passengerState ?? {});
    passengerPopulation.restore(saveData.passengerPool,saveData.passengerPopulationLocal);
    Object.assign(economyState, { firstShareRewardClaimed: false, lastGodModeIncomeDay: 0, lastAgberoTicketDay: 0, quickLoanInterestRemaining: 0, bankLoanInterestRemaining: 0 }, saveData.economyState ?? {});
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
    // World 2 has its own component and data. Restoring the mainland
    // component must never replace its arrays with another world's data.
    currentMapId.value = "mainland";
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
      WORLD_MIN_Y,
      WORLD_MAX_Y - CAMERA_HEIGHT,
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

function restoreTravelVehicleState(snapshot = {}) {
  if (snapshot.id) {
    switchPlayerVehicle(snapshot.id);
  }
  hudState.fuel = clamp(snapshot.fuel ?? hudState.fuel, 0, 100);
  hudState.damage = clamp(snapshot.damage ?? hudState.damage, 0, 100);
  player.gearIndex = clamp(
    snapshot.gearIndex ?? player.gearIndex,
    0,
    activeVehicleConfig.value.gears.length - 1,
  );
  playerStatus.health = clamp(
    snapshot.health ?? playerStatus.health,
    0,
    100,
  );
  playerStatus.energy = clamp(
    snapshot.energy ?? playerStatus.energy,
    0,
    100,
  );
  if (snapshot.economyState) Object.assign(economyState, snapshot.economyState);
  normaliseLoanState(economyState, DANFO_ECONOMY_CONFIG);
  if (snapshot.travelCrimeState) restoreCrimeState(crimeState, snapshot.travelCrimeState);
  if (snapshot.travelPropertyState) restorePropertyState(propertyState, snapshot.travelPropertyState);
  if (snapshot.travelLifeState) restoreLifeObligationState(lifeObligationState, snapshot.travelLifeState, LIFE_OBLIGATION_CONFIG);
  economyState.money = snapshot.money ?? economyState.money;
  if (Array.isArray(snapshot.ownedVehicleIds)) {
    economyState.ownedVehicleIds = [...new Set(snapshot.ownedVehicleIds)];
  }
  if (snapshot.customizationState) restoreCustomizationState(customizationState, snapshot.customizationState);
  if (snapshot.bankSavingsState) restoreBankSavingsState(bankSavingsState, snapshot.bankSavingsState, snapshot.currentDay);
  if (snapshot.stockMarketState) {
    restoreStockMarketState(stockMarketState, snapshot.stockMarketState);
  }
  gameClock.day = snapshot.currentDay ?? gameClock.day;
  gameClock.minuteOfDay =
    snapshot.minuteOfDay ?? gameClock.minuteOfDay;
  saveActiveVehicleCondition();
  player.speed = 0;
  stopPlayerVehicleEngine();
}

function beginNewGame({ homeId, playerName, onlineTenancy }) {
  const baseHome = STARTER_HOMES.find(item => item.id === homeId);
  const home=baseHome?{...baseHome,weeklyRent:onlineTenancy?.weeklyRent??adjustedRent(baseHome,government.view.value.rentPercent)}:null;
  const zone = homeParkingZones.find(item => item.homeId === homeId);
  if (!home || !zone) return false;
  const online = Boolean(getSaveAccount());
  if (online) {
    // Claim already assigned this room and charged first rent on the server.
    if (!onlineTenancy || onlineTenancy.homeId !== homeId || onlineTenancy.playerId !== getSaveAccount()) return false;
    if (connection.home?.homeId !== homeId || connection.wallet?.state?.propertyState?.starterHomeId !== homeId) return false;
    if (propertyState.starterHomeId && propertyState.starterHomeId !== homeId) return false;
  } else if (propertyState.starterHomeId || economyState.money < home.weeklyRent) return false;
  propertyState.starterHomeId = homeId;
  propertyState.playerName = String(playerName || 'Driver').trim().slice(0, 24) || 'Driver';
  propertyState.activeHomeId = 'starter-rental';
  if (online) applyOnlineWallet();
  else chargeExpense({ economyState, amount: home.weeklyRent, type: 'weekly-rent', label: 'FIRST RENT - ' + home.name.toUpperCase(), config: DANFO_ECONOMY_CONFIG });
  Object.assign(lifeObligationState.rent, { amount: home.weeklyRent, lastPaidDay: gameClock.day, nextDueDay: gameClock.day + 7, status: 'current', lateFee: 0 });
  player.x = zone.x + zone.width / 2;
  player.y = zone.y + zone.height / 2;
  player.rotation = ({ north: 0, east: Math.PI / 2, south: Math.PI, west: -Math.PI / 2 })[home.front];
  player.previousX = player.x;
  player.previousY = player.y;
  player.previousRotation = player.rotation;
  player.speed = 0;
  player.isParked = true;
  stopPlayerVehicleEngine();
  centreCameraOnPlayer();
  firstRoutePrompt.value=true;
  shareWelcomeVisible.value = !economyState.firstShareRewardClaimed;
  saveGame();
  return true;
}

defineExpose({
  isGodMode: () => godMode.value,
  getNetworkPose: () => ({ x: player.x, y: player.y, rotation: player.rotation, speed: props.paused ? 0 : player.speed, vehicleId: activeVehicleConfig.value.id }),
  beginNewGame,
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
  restoreTravelVehicleState,
});

function handleMechanicCall() {
  if (blockReviewedTransaction()) return;
  if (economyState.gameOver) return;
  if (propertyState.starterHomeRisk?.missingCarPart) {
    const replacementCost = 12000;
    if (economyState.money < replacementCost) return;
    chargeExpense({ economyState, amount: replacementCost, type: "stolen-car-part-replacement", label: "REPLACEMENT CAR PART", config: DANFO_ECONOMY_CONFIG });
    propertyState.starterHomeRisk.missingCarPart = false;
    playGameSound("mechanicRepair", { loop: false });
    showPlayerWarning("vehicle", "REPLACEMENT PART FITTED", "Your vehicle can start again.");
    saveGame();
    return;
  }
  const result = purchaseRepairs({ economyState, currentDamage: hudState.damage, config: DANFO_ECONOMY_CONFIG, mobileCallout: true });
  hudState.damage = result.damage;
  if (result.success) {
    playGameSound("mechanicRepair", { loop: false });
    handleObjectiveEvent("vehicle-repaired");
  }
}
function handleFuelAttendantCall() {
  if (blockReviewedTransaction()) return;
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

function purchaseHealthTreatment({
  provider,
  cost,
  type,
  useCoupon = false,
}) {
  if (blockReviewedTransaction()) return;
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
  if (blockReviewedTransaction()) return;
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
  if (blockReviewedTransaction()) return;
  purchaseHealthTreatment({
    provider: "Mobile Doctor",
    cost: PLAYER_STATUS_CONFIG.doctorCallCost,
    type: "mobile-doctor-treatment",
  });
}

async function handlePlayerFaint() {
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
  if (blockReviewedTransaction()) return;
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
    ["bottled-water", "energy-drink", "dry-gin"].includes(
      item.id,
    )
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
  if (blockReviewedTransaction()) return;
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
  if (blockReviewedTransaction()) return;
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
  if (blockReviewedTransaction()) return;
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
  if (blockReviewedTransaction()) return;
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



function handleSleep() {
 if(heist.active.value){showPlayerWarning('heist','BANK JOB','Finish the bank job before sleeping.');return;}
 if(!nearbyHomeParking.value||!serviceSpeedAllowed.value)return;
 sleepState.modalOpen=false;sleepState.sleeping=true;
 sleepState.overlayVisible=true;sleepState.overlayFading=false;
 pressedKeys.clear();player.speed=0;player.isParked=true;stopPlayerVehicleEngine();
 handleObjectiveEvent('slept-at-home');
}
function endSleep(){
 sleepState.sleeping=false;sleepState.overlayVisible=false;sleepState.overlayFading=false;
 if(playerStatus.energy>PLAYER_WARNING_CONFIG.energy)handleObjectiveEvent('energy-restored');
 saveGame();
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
  if (careers.state.shift || careers.state.lesson) { showPlayerWarning("career", "ON DUTY", "Finish your class or shift first."); return; }
  if (
    jobId === "brt" &&
    !["A", "B", "C"].includes(driverLicenceState.rating)
  ) {
    playGameSound("warning");
    return;
  }

  const personalVehicleId = getPersonalJobVehicleId();
  if (jobId === "moto-eazi" && !personalVehicleId) {
    playGameSound("warning");
    return;
  }

  const targetVehicleId =
    jobId === "brt"
      ? PLAYER_BRT.id
      : jobId === "moto-eazi"
        ? personalVehicleId
        : PLAYER_DANFO.id;
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
      if (homeZone) {
        player.x = homeZone.x + homeZone.width / 2;
        player.y = homeZone.y + homeZone.height / 2;
      } else {
        player.x = playerStart.x;
        player.y = playerStart.y;
      }
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
  if (blockReviewedTransaction()) return;
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

async function handlePropertyPurchase({propertyId,paymentMethod}) {
  if (blockReviewedTransaction()) return;
 if(await housing.act({op:'buy',propertyId,paymentMethod})){
  handleObjectiveEvent(propertyId==='wealthy-estate-home'?'wealthy-home-purchased':'first-home-purchased');
  closeServiceModal();
 }else showPlayerWarning('housing','HOUSING',housing.error.value);
}

function handleBusinessOfficePurchase() {
  if (blockReviewedTransaction()) return;
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
  if (blockReviewedTransaction()) return;
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
  if (blockReviewedTransaction()) return;
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
  if (blockReviewedTransaction()) return;
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
    MAP_DRIVING_LOCATIONS.find((location) => {
      return location.id === locationId;
    }) ?? null;
}

function handleStartDrivingTest() {
  if (blockReviewedTransaction()) return;
  if (prepareDriverLicenceSchoolNavigation(driverLicenceState)) {
    manualMapDestination.value = null;
    playGameSound("confirm");
  }
}

function tryBeginDrivingTestAtSchool() {
  if (!["travelling-to-school", "failed"].includes(driverLicenceState.testStatus)) return false;
  const zone = drivingSchoolZone.value;
  if (!zone || Math.hypot(player.x - (zone.x + zone.width / 2), player.y - (zone.y + zone.height / 2)) > GRID_SIZE * 0.62) return false;
  if (Math.abs(player.speed) > 1 || economyState.money < DRIVER_LICENCE_TEST_FEE) return false;
  chargeExpense({ economyState, amount: DRIVER_LICENCE_TEST_FEE, type: "driving-test", label: "DRIVING TEST", config: DANFO_ECONOMY_CONFIG });
  const route = DRIVING_TEST_ROUTES[(gameClock.day + driverLicenceState.offenceCount) % DRIVING_TEST_ROUTES.length];
  if (beginDriverLicenceTest(driverLicenceState, route)) {
    manualMapDestination.value = null;
    playGameSound("confirm");
    return true;
  }
  return false;
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
  if (tryBeginDrivingTestAtSchool()) return;
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
  if (blockReviewedTransaction()) return;
  depositIntoSavings(bankSavingsState, economyState, amount);
}

function handleSavingsWithdrawal(amount) {
  if (blockReviewedTransaction()) return;
  withdrawFromSavings(bankSavingsState, economyState, amount);
}

function handleBuyStock(companyId) {
  if (blockReviewedTransaction()) return;
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
  if (blockReviewedTransaction()) return;
  const basis=(stockMarketState.investedPrincipal[companyId]||0)/Math.max(1,stockMarketState.holdings[companyId]||0);
  const proceeds = sellStock(stockMarketState, companyId);
  if (!proceeds) return;
  government.earn(Math.max(0,proceeds-basis));
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
  if (blockReviewedTransaction()) return;
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
  if (blockReviewedTransaction()) return;
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
  if (blockReviewedTransaction()) return;
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

  if (!result.success) return result;

  if (useCoupon) lifeObligationState.discountCoupons -= 1;
  hudState.fuel = result.fuel;
  playGameSound("fuelPump", { loop: false });
  closeServiceModal();


  if (fuelBeforePurchase <= 25) {
    handleObjectiveEvent("low-fuel-refuelled");
  }
  return result;
}

function handleLoanRepayment({ amount, receiver, loanType }) {
  if (blockReviewedTransaction()) return;
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
    crimeState.status === "free" &&
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
  if(club.modal.value){pressedKeys.clear();return;}
  if (crimeState.status !== "free") { pressedKeys.clear(); return; }
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

  // Do not treat letters typed into the phone as driving shortcuts.
  // Previously keys such as A, D, I, H, Q, E and R were intercepted here.
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

let wasteSprite = null;
function drawCareerWaste(context) {
 if (currentMapId.value !== 'mainland') return;
 for (const spot of careers.waste.value) {
  const size=spot.size??48;
  if (!isVisible({x:spot.x-size/2,y:spot.y-size/2,width:size,height:size})) continue;
  if(careers.duty.value==='lawma'){
   const active=careers.nearbyWaste.value?.id===spot.id;
   context.save();context.fillStyle=active&&careers.closestWaste.value?'rgb(72 204 96 / 17%)':'rgb(255 205 45 / 15%)';
   context.fillRect(spot.x-size/2,spot.y-size/2,size,size);
   context.strokeStyle=active&&careers.closestWaste.value?'#48cc60':'#ffcd2d';context.lineWidth=active?2:1;
   context.strokeRect(spot.x-size/2,spot.y-size/2,size,size);context.restore();
  }
  if(wasteSprite) context.drawImage(wasteSprite,spot.x-size/2,spot.y-size/2,size,size);
 }
}
function clearAiTraffic(){
 for(const obstacle of POLICE_OBSTACLES) obstacle.blocksVehicles=careers.local.aiTrafficEnabled;
 rebuildObstacleSpatialIndex();
 Object.assign(populationState,createPopulationTrafficState());
 Object.assign(towTruckState,createTowTruckState(TOW_TRUCK_BASES,TOW_TRUCK_CONFIG));
}
function toggleAiTraffic(){careers.local.aiTrafficEnabled=!careers.local.aiTrafficEnabled;clearAiTraffic();saveGame();}

function applyOnlineWallet(){
 if(!getSaveAccount()||!connection.wallet)return;
 const state=connection.wallet.state;
 for(const [target,key] of [[economyState,'economyState'],[bankSavingsState,'bankSavingsState'],[stockMarketState,'stockMarketState'],[customizationState,'customizationState'],[playerInventory,'playerInventory'],[propertyState,'propertyState'],[businessState,'businessState'],[lifeObligationState,'lifeObligationState'],[objectiveState,'objectiveState'],[dailyQuestState,'dailyQuestState']])if(state[key])patchServerState(target,state[key]);
 if(connection.wallet.moto)patchServerState(motoEaziState,connection.wallet.moto);
 syncSharedClock(gameClock,GAME_TIME_CONFIG);
}
// Online economy is locally authoritative during the in-game day. Server wallet
// snapshots are only applied during bootstrap; incidental multiplayer/domain
// responses must not overwrite the player's unsynced daytime balance.

let onlineDayCloseBusy=false;
let queuedOnlineDayClose=null;
function captureOnlineFinancialState(){
 return JSON.parse(JSON.stringify({
  economyState:toRaw(economyState),
  bankSavingsState:toRaw(bankSavingsState),
  stockMarketState:toRaw(stockMarketState),
  customizationState:toRaw(customizationState),
  playerInventory:toRaw(playerInventory),
  propertyState:toRaw(propertyState),
  businessState:toRaw(businessState),
  lifeObligationState:toRaw(lifeObligationState),
  objectiveState:toRaw(objectiveState),
  dailyQuestState:toRaw(dailyQuestState),
 }));
}
async function syncOnlineEconomyDayClose(closedDay){
 if(!getSaveAccount())return true;
 // Make one local checkpoint first, then send that exact snapshot together with
 // the day's financial state. This replaces the former economy call + cloud
 // save call with one server request at the in-game day boundary.
 if(!saveGame())return false;
 let snapshot=null;
 try{snapshot=JSON.parse(window.localStorage.getItem(getSaveStorageKey()));}catch{/* handled below */}
 if(!snapshot){
  showPlayerWarning('bank','DAY END SYNC','Could not prepare the day-end checkpoint. Your local save is retained.');
  return false;
 }
 const packet={closedDay,financialState:captureOnlineFinancialState(),closingBalance:Math.round(economyState.money),snapshot,revision:connection.revision};
 if(onlineDayCloseBusy){queuedOnlineDayClose=packet;return false;}
 onlineDayCloseBusy=true;
 try{
  const result=await gameRequest('economy',{op:'day-close',...packet});
  if(Number.isInteger(result.revision))connection.revision=result.revision;
  if(result.updatedAt)connection.lastSaved=result.updatedAt;
  connection.save='Saved at day end';
  connection.error='';
  return true;
 }catch(e){
  if(e?.status===409)connection.save='Day-end save conflict · reopen Online';
  queuedOnlineDayClose=packet;
  showPlayerWarning('bank','DAY END SYNC','Could not sync the day yet. Your local save is retained.');
  return false;
 }finally{
  onlineDayCloseBusy=false;
  if(queuedOnlineDayClose&&queuedOnlineDayClose.closedDay!==closedDay){
   const next=queuedOnlineDayClose;queuedOnlineDayClose=null;void syncOnlineEconomyDayClose(next.closedDay);
  }
 }
}

const passengerPopulation=usePassengerPopulation({player,route:routeState,passengers:passengerState,
 pay:async()=>({success:true}),
 onPaid(){ saveGame(); },
 onPaymentError:(message)=>showPlayerWarning('bank','ROUTE PAYMENT',message)
});
const heist=useHeist({
 player,crime:crimeState,ready:()=>!!propertyState.starterHomeId,minute:()=>getAbsoluteGameMinute(gameClock),money:()=>economyState.money,home:()=>activeHomeParkingZone.value,
 blocked:()=>props.paused||crimeState.status!=='free'||sleepState.overlayVisible||worldTransition.active||!!careers.state.shift||!!careers.state.lesson||economyState.gameOver,
 freeze:freezeForPolice,
 arrest:()=>{crimeState.heistCustody=true;if(crimeState.status==='free')crimeState.status='arrested';freezeForPolice();if(crimeState.status==='arrested')void goToPoliceStation();},
 pay:(amount,label)=>{if(amount>0)creditIncome({economyState,amount,type:'heist-income',label,config:DANFO_ECONOMY_CONFIG});else if(amount<0)chargeExpense({economyState,amount:-amount,type:'heist-confiscation',label,config:DANFO_ECONOMY_CONFIG});},save:()=>saveGame(),
});
const housing=useHousing({
 heistActive:()=>heist.active.value,
 property:propertyState,ready:()=>!!propertyState.starterHomeId,day:()=>gameClock.day,
 money:()=>economyState.money,savings:()=>bankSavingsState.balance,
 pay:r=>{if(r.amount>0)creditIncome({economyState,amount:r.amount,type:'property-rent',label:r.label,config:DANFO_ECONOMY_CONFIG});else if(r.amount<0)chargeExpense({economyState,amount:-r.amount,type:'housing-expense',label:r.label,config:DANFO_ECONOMY_CONFIG});if(!getSaveAccount()&&r.savings<0)withdrawSavingsForExpense(bankSavingsState,-r.savings,r.label);},
 warn:text=>showPlayerWarning('theft','HOME ROBBERY',text),
 moved:homeId=>{
  if(homeId==='starter-rental'){
   const home=STARTER_HOMES.find(h=>h.id===propertyState.starterHomeId);
   lifeObligationState.rent.status='current';lifeObligationState.rent.amount=home?.weeklyRent||20000;lifeObligationState.rent.lateFee=0;lifeObligationState.rent.missedPayments=0;lifeObligationState.rent.lastLateFeeDueDay=null;lifeObligationState.rent.nextDueDay=gameClock.day+7;
  }else endWeeklyRent(lifeObligationState);
 },save:()=>saveGame(),
});
const club=useClub({
 player,ready:()=>!!propertyState.starterHomeId,money:()=>economyState.money,name:()=>propertyState.playerName,
 blocked:()=>currentMapId.value!=='mainland'||crimeState.status!=='free'||economyState.gameOver||sleepState.overlayVisible||worldTransition.active||!!careers.state.shift||!!careers.state.lesson,
 consume:drink=>{
  chargeExpense({economyState,amount:drink.price,type:'club-drink',label:drink.name.toUpperCase(),config:DANFO_ECONOMY_CONFIG});
  advanceIntoxication(playerStatus,getAbsoluteGameMinute(gameClock),{crashEnergy:PLAYER_STATUS_CONFIG.dryGinCrashEnergy});
  addIntoxication(playerStatus,drink.intoxication);playGameSound('drink',{loop:false});
 },save:()=>saveGame(),
});
watch(()=>club.modal.value,value=>{if(value){activeServiceModal.value=null;careers.modal.value=null;government.modal.value=false;pressedKeys.clear();player.speed=0;}});
const government=useGovernment({
 player,day:()=>gameClock.day,money:()=>economyState.money,name:()=>propertyState.playerName,
 // Government access belongs to active gameplay, not starter-rental metadata.
 ready:()=>!props.paused,
 blocked:()=>currentMapId.value!=='mainland'||crimeState.status!=='free'||economyState.gameOver||sleepState.overlayVisible||worldTransition.active||!!careers.state.shift||!!careers.state.lesson,
 pay:(amount,label,type)=>{if(amount>0)creditIncome({economyState,amount,type,label,config:DANFO_ECONOMY_CONFIG});else chargeExpense({economyState,amount:-amount,type:'government-expense',label,config:DANFO_ECONOMY_CONFIG});},
 crime:amount=>{crimeState.score+=amount;},save:()=>saveGame(),
 rent:percent=>{const home=STARTER_HOMES.find(h=>h.id===propertyState.starterHomeId);if(home&&propertyState.activeHomeId==='starter-rental')lifeObligationState.rent.amount=adjustedRent(home,percent);},
});
watch(()=>government.modal.value,value=>{if(value){activeServiceModal.value=null;careers.modal.value=null;pressedKeys.clear();}});
const careers=useCareers({
 player, minute:()=>getAbsoluteGameMinute(gameClock),
 blocked:()=>currentMapId.value!=='mainland'||crimeState.status!=='free'||economyState.gameOver||sleepState.overlayVisible||worldTransition.active||raceState.status==='active',
 vehicle:()=>vehicleState.activeVehicleId,
 report:()=>({crime:crimeState.score,fines:fineState.outstandingAmount}),
 publicPay:(amount,label)=>government.publicWage(amount,label),
 truckBayClear:()=>![...populationState.vehicles,...connection.players].some(p=>Math.abs(p.x-57*120)<150&&Math.abs(p.y+6*120)<270),
 pay:(amount,label)=>{if(amount>0)creditIncome({economyState,amount,type:'career-income',label,config:DANFO_ECONOMY_CONFIG});else chargeExpense({economyState,amount:-amount,type:'career-expense',label,config:DANFO_ECONOMY_CONFIG});},
 save:()=>saveGame(),
 swap:(id,pose)=>{
  clearDanfoPassengerRoute(passengerState);returnToRouteSelection(routeState);
  switchPlayerVehicle(id);if(pose){Object.assign(player,pose);player.previousX=player.x;player.previousY=player.y;player.previousRotation=player.rotation;centreCameraOnPlayer();}
  activeServiceModal.value=null;pressedKeys.clear();
  if(getSaveAccount())window.dispatchEvent(new CustomEvent('tcg:police-teleport'));
 },
 resolve:result=>{
  if(result.choice==='station'){crimeState.score=Math.max(crimeState.score,result.crime||50);crimeState.status='arrested';crimeState.releaseMinute=0;void goToPoliceStation();}
  else if(result.service==='lastma'){clearOutstandingFines(fineState);}
  else if(result.choice==='bribe'){crimeState.score=heist.locked()?100:0;}
 },
});
watch(()=>connection.presence,status=>{if(status==='In city'){void heist.act();void housing.act();void careers.refresh();void government.act();void club.act();}});
watch(()=>careers.modal.value,value=>{if(value){activeServiceModal.value=null;pressedKeys.clear();}});
let disposeLocalStudio = () => {};
let godModeBackgroundTimer = null;
let backgroundTickAt = 0;
function releaseBackgroundInput() { pressedKeys.clear(); }
function updateGodModeInBackground() {
  const now = performance.now();
  const elapsed = backgroundTickAt ? Math.min(1, Math.max(0, (now - backgroundTickAt) / 1000)) : 0;
  backgroundTickAt = now;
  if (!document.hidden || !godMode.value || props.paused || !elapsed) return;
  // Best effort only: mobile operating systems may suspend background tabs entirely.
  let remaining = elapsed;
  while (remaining > 0.001) {
    const step = Math.min(FIXED_SIMULATION_STEP, remaining);
    updateGameSimulation(step);
    remaining -= step;
  }
  previousTimestamp = now;
}
onMounted(() => {
  window.addEventListener('blur', releaseBackgroundInput);
  godModeBackgroundTimer = window.setInterval(updateGodModeInBackground, 250);
  billboardLastSlotKey = `${realWorldAdDate()}:${realWorldAdSlot()}`;
  void refreshBillboardAds();
  billboardRefreshTimer = window.setInterval(() => { void refreshBillboardAds(); }, 10 * 60 * 1000);
  billboardSlotTimer = window.setInterval(refreshBillboardSlot, 30 * 1000);
  disposeLocalStudio = installLocalStudio({
    online: () => Boolean(getSaveAccount()), player, economy: economyState,
    status: playerStatus, hud: hudState, clock: gameClock, licence: driverLicenceState,
    locations: () => [
      { id: 'club', label: 'Night club', x: 36 * GRID_SIZE, y: 30 * GRID_SIZE, width: GRID_SIZE, height: GRID_SIZE },
      { ...dealershipParkingZones[0], id: 'dealership' },
      { id: 'driving-road', label: 'Danfo avenue — eastbound lane', x: 12 * GRID_SIZE, y: 8 * GRID_SIZE, width: GRID_SIZE, height: GRID_SIZE },
      { id: 'brt-road', label: 'BRT avenue — eastbound lane', x: 40 * GRID_SIZE, y: 8 * GRID_SIZE, width: GRID_SIZE, height: GRID_SIZE },
      ...labelledLandmarks.map(site => ({ ...site, id: 'landmark:' + site.id })),
    ],
    close: () => { closeServiceModal(); club.modal.value = false; },
    stop: () => { pressedKeys.clear(); stopPlayerVehicleEngine(); },
    centre: centreCameraOnPlayer,
    job: handleJobSelection, route: handleRouteSelection,
    routes: () => availableRoutes.value.map(route => ({ id: route.id, name: route.name })),
    celebrate: () => club.act('buy', 'one-million-crown'),
    dealership: () => { activeServiceModal.value = 'dealership'; },
    vehicle: id => { if (!economyState.ownedVehicleIds.includes(id)) throw new Error('Buy this vehicle first.'); switchPlayerVehicle(id); },
    vehicleId: () => vehicleState.activeVehicleId,
    ignition: startCurrentPlayerVehicle,
    input: (key, down) => { const event = { key, repeat: false, preventDefault() {} }; if (down) handleKeyDown(event); else handleKeyUp(event); },
    events: () => club.events.value.map(event => ({ ...event })), paused: () => props.paused,
  });
  if(!COAST_CITY_ENABLED)mutiuEncounter.mode=null;
  heist.start();
  housing.start();
  club.start();
  government.start();
  loadCanvasImage(wastePileUrl,image=>{wasteSprite=image;});
  for(const obstacle of POLICE_OBSTACLES) obstacle.blocksVehicles=careers.local.aiTrafficEnabled;
  loadCanvasImage(policeCarUrl, image => { policeSprite = image; });
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
  loadCanvasImage(sangoSoilUrl,image=>{sangoSoilImage=image;invalidateStaticMapCache();});
  loadCanvasImage(sangoTreeUrl,image=>{sangoTreeImage=image;invalidateStaticMapCache();});
  loadCanvasImage(dryMudRowUrl, (image) => {
    dryMudRowImage = image;
    invalidateStaticMapCache();
  });
  loadCanvasImage(parkingBayTileUrl, (image) => {
    parkingBayTileImage = image;
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

  if (careers.local.aiTrafficEnabled) seedPopulationTraffic({
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
  window.clearInterval(godModeBackgroundTimer);
  window.removeEventListener('blur', releaseBackgroundInput);
  disposeLocalStudio();
  clubAudio.dispose();
  passengerPopulation.stop();
  heist.stop();
  housing.stop();
  club.stop();
  government.stop();
  careers.stop();
  resizeObserver?.disconnect();
  disposePlayerVehicleAudio();
  invalidateStaticMapCache();
  pendingCanvasImages.clear();
  landmarkSprites.clear();
  genericBuildingSprites.clear();
  billboardAdSprites.clear();
  if (billboardRefreshTimer !== null) window.clearInterval(billboardRefreshTimer);
  if (billboardSlotTimer !== null) window.clearInterval(billboardSlotTimer);
  billboardRefreshTimer = null;
  billboardSlotTimer = null;
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
  government.track(event);
  sampleMarketDeposits(stockMarketState, gameClock.day, gameClock.minuteOfDay, bankSavingsState.balance);
  recordStockTransaction(stockMarketState, event, {
    day: gameClock.day,
    foodSeller: nearbyFoodService.value?.sellerType,
    fuelPump: nearbyFuelPump.value?.id,
  });
}
observeTransactions(economyState, recordMarketReceipt);
observeTransactions(bankSavingsState, recordMarketReceipt);
function handlePlayerTransferSent(amount) {
  if (blockReviewedTransaction()) return;
  const value = Math.max(0, Math.round(Number(amount) || 0));
  if (!value || value > economyState.money) return;
  chargeExpense({ economyState, amount: value, type: "player-transfer", label: "PLAYER TRANSFER SENT", config: DANFO_ECONOMY_CONFIG });
  saveGame();
}

function handlePlayerTransferReceived(amount) {
  if (blockReviewedTransaction()) return;
  const value = Math.max(0, Math.round(Number(amount) || 0));
  if (!value) return;
  creditIncome({ economyState, amount: value, type: "player-transfer", label: "PLAYER TRANSFER RECEIVED", config: DANFO_ECONOMY_CONFIG });
  saveGame();
}

function handlePlaceAdPurchased(amount) {
  if (blockReviewedTransaction()) return;
  const value = Math.max(0, Math.round(Number(amount) || 0));
  if (!value || value > economyState.money) return;
  chargeExpense({ economyState, amount: value, type: "place-ad", label: "PLACEAD BOOKING", config: DANFO_ECONOMY_CONFIG });
  saveGame();
}

</script>

<template>
  <section class="world-map">
    <ClubOverlay :club="club" :money="economyState.money" :intoxication="playerStatus.intoxication || 0" />
    <GovernmentOverlay :government="government" />
    <CareerOverlay :career="careers" :bars="{health:playerStatus.health,energy:playerStatus.energy,fuel:hudState.fuel,damage:hudState.damage}" />
    <HeistPanel v-if="heist.active.value || heist.locked()" compact :minute="policeMinute" :view="heist.view.value" :busy="heist.busy.value" :error="heist.error.value" @action="heist.act" />
    <PoliceArrest :state="crimeState" :money="economyState.money" :minute="policeMinute" :error="policeError" @bribe="payPoliceBribe" @station="goToPoliceStation" />
    <canvas
      ref="canvasReference"
      class="world-map__canvas"
      aria-label="Total City Grind world"
    />

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
      :status-label="passengerPopulation.activity.value"
      :inside-stop="isInsideActiveStop"
      :speed-allowed="isStopSpeedAllowed"
    />

    <EnergyDepletedModal
      v-if="energyDepleted"
      :has-food="inventoryItems.length > 0"
      :hospital-cost="PLAYER_STATUS_CONFIG.faintHospitalCost"
      @clinic="handlePlayerFaint"
    />


    <div v-if="firstRoutePrompt" class="first-route-prompt" role="dialog" aria-modal="true" aria-label="Your first route">
      <section><h2>Your first route</h2><p>Open your phone, go to Messages, click Danfo Owner, and pick your first route.</p><button type="button" @click="firstRoutePrompt=false">Got it</button></section>
    </div>
    <AgberoPaymentToast :payment="agberoPayment" />

    <aside v-if="passengerPopulation.error.value" style="position:absolute;bottom:100px;left:50%;transform:translateX(-50%);max-width:75%;padding:8px;background:#fff7dc;color:#17213a;z-index:5100;border-radius:10px" role="status">Passengers: {{passengerPopulation.error.value}}</aside>
    <PassengerFeedback
      v-if="hudPreferences.feedback && passengerState.lastStopResult"
      :result="passengerState.lastStopResult"
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
      <i
        :class="[
          'fa-solid',
          currentMapId === 'mainland' ? 'fa-bridge' : 'fa-city',
        ]"
        aria-hidden="true"
      />
      {{ !COAST_CITY_ENABLED ? COAST_CITY_LOCK_MESSAGE : currentMapId === "mainland" ? "Travel to Coast City" : "Return to Mainland Lagos" }}
    </button>

    <div v-if="shareWelcomeVisible && !firstRoutePrompt && !paused" class="first-route-prompt share-welcome" role="dialog" aria-modal="true" aria-label="Share Total City Grind">
      <section><ShareApp :reward-amount="shareRewardAmount" @shared="handleShareReward" /><button type="button" @click="shareWelcomeVisible = false">Continue to city</button></section>
    </div>
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
      message="Hello, my name is Mr-Wire. Check my messages if you need work."
      @close="closeMutiuEncounter"
    />

    <GamePhone
      :share-reward-amount="shareRewardAmount" @share-completed="handleShareReward"
      :intoxication="playerStatus.intoxication || 0"
      :government="government.view.value" :government-unread="government.unread.value" :government-busy="government.busy.value" :government-error="government.error.value" @government-action="government.act"
      :career-state="careers.state" :career-minute="careers.minute.value" :career-occupied="careers.occupied.value" :career-busy="careers.busy.value" :career-error="careers.error.value"
      :ai-traffic-enabled="careers.local.aiTrafficEnabled" @toggle-ai-traffic="toggleAiTraffic" @career-action="careers.act"
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
      :transactions="economyState.transactions"
      :bank-messages="bankMessageFeed"
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
      :map-locations="MAP_DRIVING_LOCATIONS"
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
      :god-mode="godMode"
      :observer-mode="observerMode"
      :current-map-id="currentMapId"
      :race-active="raceState.status === 'active'"
      :objectives="objectiveViews"
      :objective-categories="OBJECTIVE_CATEGORIES"
      :tracked-objective-id="objectiveState.trackedObjectiveId"
      :life-obligations="lifeObligationView"
      :property-state="propertyState"
      :property-catalogue="PROPERTY_CATALOGUE"
      :heist-minute="policeMinute" :heist-view="heist.view.value" :heist-busy="heist.busy.value" :heist-error="heist.error.value" @heist-action="heist.act"
      :housing-view="housing.view.value" :housing-busy="housing.busy.value" :housing-error="housing.error.value" @housing-action="housing.act"
      @select-route="handleRouteSelection"
      @select-job="handleJobSelection"
      @start-driving-test="handleStartDrivingTest"
      @track-objective="handleTrackedObjectiveSelection"
      @claim-objective-reward="handleObjectiveRewardClaim"
      @objective-event="handlePhoneObjectiveEvent"
      @pay-rent="handleRentPayment"
      @pay-school-fees="handleSchoolFeesPayment"
      @pay-family-request="handleFamilyRequestPayment"
      @list-property-rental="handleRentalListing"
      @remove-property-rental="handleRentalRemoval"
      @resolve-late-rent="handleLateRentalAction"
      @call-mechanic="handleMechanicCall"
      @call-doctor="handleDoctorCall"
      @call-fuel-attendant="handleFuelAttendantCall"
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
      @accept-incoming-call="handleIncomingCallAccept"
      @decline-incoming-call="handleIncomingCallDecline"
      @select-map-destination="handleMapDestinationSelection"
      @wait-moto-eazi-request="handleWaitForMotoEaziRequest"
      @accept-moto-eazi-request="handleAcceptMotoEaziRequest"
      @reject-moto-eazi-request="handleRejectMotoEaziRequest"
      @change-sound-settings="handleSoundSettingsChange"
      @consume-inventory-item="handleInventoryConsumption"
      @toggle-debug="showGrid = !showGrid"
      @toggle-god-mode="godMode = !godMode"
      @toggle-observer="toggleObserverMode"
      @save-game="saveGame"
      @debug-go-coastal-city="handleDebugGoToCoastalCity"
      @debug-start-race="handleDebugStartRace"
      @player-transfer-sent="handlePlayerTransferSent"
      @player-transfer-received="handlePlayerTransferReceived"
      @place-ad-purchased="handlePlaceAdPurchased"
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
        <small>TRAVELLING</small>
        <strong>{{ worldTransition.label }}</strong>
        <p>
          Loading roads and warming up traffic…
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
      <div v-if="!sleepState.overlayFading"><p>Sleeping…</p><p v-if="sleepState.sleeping">Health {{Math.round(playerStatus.health)}}% · Energy {{Math.round(playerStatus.energy)}}%</p><button v-if="sleepState.sleeping" type="button" @click="endSleep">End sleep now</button></div>
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
.share-welcome > section { max-height:calc(100dvh - 32px); overflow-y:auto; }
.share-welcome .share-app { height:auto; }
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

.world-map__transition-overlay {
  position: absolute;
  z-index: 500;
  inset: 0;
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at 70% 30%, rgb(29 90 125 / 45%), transparent 42%),
    rgb(5 12 20 / 94%);
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
  margin: 4px 0 12px;
  color: #aaa38d;
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

.world-map__sleep-overlay button {padding:14px 24px;border:0;border-radius:12px;background:#ffde48;color:#19253d;font:inherit;cursor:pointer;}
.world-map__sleep-overlay > div {text-align:center;}
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



















<style scoped>
.first-route-prompt{position:absolute;inset:0;z-index:12000;display:grid;place-items:center;background:#17213a99;padding:24px}.first-route-prompt section{max-width:360px;padding:24px;border-radius:20px;background:#fff7dc;color:#17213a}.first-route-prompt h2{margin:0 0 12px}.first-route-prompt button{padding:12px 24px;border:0;border-radius:12px;background:#ffdf35;font:inherit;font-weight:bold}
</style>
