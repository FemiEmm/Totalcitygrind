import fs from "node:fs";

function replaceOnce(source, search, replacement, file) {
  search = search.replaceAll("\n+", "\n");
  replacement = replacement.replaceAll("\n+", "\n");
  if (!source.includes(search)) throw new Error(`Missing anchor in ${file}: ${search.slice(0, 90)}`);
  return source.replace(search, replacement);
}

// Correct the first-pass prop placement and complete travel state transfer.
for (const file of ["src/world/components/WorldMap.vue", "src/world2/components/WorldMap2.vue"]) {
  let source = fs.readFileSync(file, "utf8");
  source = source.replace('\n      :stock-market="stockMarketView"\n      :garage-fee=', '\n      :garage-fee=');
  source = replaceOnce(
    source,
    '      :money="economyState.money"\n      :routes="offeredRoutes"',
    '      :money="economyState.money"\n      :stock-market="stockMarketView"\n      :routes="offeredRoutes"',
    file,
  );
  fs.writeFileSync(file, source);
}

{
  const file = "src/world/components/WorldMap.vue";
  let source = fs.readFileSync(file, "utf8");
  source = replaceOnce(
    source,
    "      currentDay: gameClock.day,\n    },\n  });",
    "      currentDay: gameClock.day,\n      ownedVehicleIds: [...economyState.ownedVehicleIds],\n      stockMarketState: JSON.parse(JSON.stringify(stockMarketState)),\n    },\n  });",
    file,
  );
  source = replaceOnce(
    source,
    "  economyState.money = snapshot.money ?? economyState.money;\n  gameClock.day",
    "  economyState.money = snapshot.money ?? economyState.money;\n  if (Array.isArray(snapshot.ownedVehicleIds)) {\n    economyState.ownedVehicleIds = [...new Set(snapshot.ownedVehicleIds)];\n  }\n  if (snapshot.stockMarketState) {\n    restoreStockMarketState(stockMarketState, snapshot.stockMarketState);\n  }\n  gameClock.day",
    file,
  );
  source = replaceOnce(
    source,
    "  saveActiveVehicleCondition();\n}\n\ndefineExpose({",
    "  saveActiveVehicleCondition();\n  player.speed = 0;\n  stopPlayerVehicleEngine();\n}\n\ndefineExpose({",
    file,
  );
  fs.writeFileSync(file, source);
}

{
  const file = "src/world2/components/WorldMap2.vue";
  let source = fs.readFileSync(file, "utf8");
  source = replaceOnce(
    source,
    "    economyState.money = snapshot.money ?? economyState.money;",
    "    economyState.money = snapshot.money ?? economyState.money;\n    if (Array.isArray(snapshot.ownedVehicleIds)) {\n      economyState.ownedVehicleIds = [...new Set(snapshot.ownedVehicleIds)];\n    }\n    if (snapshot.stockMarketState) {\n      restoreStockMarketState(stockMarketState, snapshot.stockMarketState);\n    }",
    file,
  );
  source = replaceOnce(
    source,
    "    centreCameraOnPlayer();\n    beginWorldTransition({",
    "    centreCameraOnPlayer();\n    player.speed = 0;\n    stopPlayerVehicleEngine();\n    beginWorldTransition({",
    file,
  );
  source = source.replace(
    /if \(hudState\.fuel <= 0\) \{\n\s*player\.speed = 0;\n\s*stopPlayerVehicleEngine\(\);\n\s*\}/,
    "if (hudState.fuel <= 0) {\n      stopPlayerVehicleEngine();\n    }",
  );
  source = replaceOnce(
    source,
    `      const vehicleDisabled =
        hudState.damage >= 100 ||
        hudState.fuel <= 0 ||
        playerStatus.health <= 0 ||
        playerStatus.energy <= 0 ||
        fineState.vehicleImpounded ||
        sleepState.overlayVisible;

      if (illegalStreetRaceState.status === "countdown") {
        player.speed = 0;
      } else if (vehicleDisabled) {
        player.speed = 0;
        stopPlayerVehicleEngine();`,
    `      const fuelDepleted = hudState.fuel <= 0;
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
        stopPlayerVehicleEngine();`,
    file,
  );
  fs.writeFileSync(file, source);
}

// Fix Mutiu: the daytime recording only plays during daytime.
for (const [file, successAction] of [
  ["src/world/components/WorldMap.vue", "emitWorld2Travel(true);"],
  ["src/world2/components/WorldMap2.vue", "beginMutiuStreetRace();"],
]) {
  let source = fs.readFileSync(file, "utf8");
  const oldBlock = `  if (
    (minuteOfDay >= 18 * 60 || minuteOfDay < 6 * 60) &&
    raceOfferedOnDay(gameClock.day) &&
    !hasCompletedMutiuRaceOnDay(gameClock.day)
  ) {
    ${successAction}
  } else {
    queuePhoneCall(
      phoneCallState,
      "mutiu-day-rejection",
      { priority: true },
    );
  }`;
  const newBlock = `  const isNight = minuteOfDay >= 18 * 60 || minuteOfDay < 6 * 60;

  if (
    isNight &&
    raceOfferedOnDay(gameClock.day) &&
    !hasCompletedMutiuRaceOnDay(gameClock.day)
  ) {
    ${successAction}
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
      "Mutiu has no race running tonight. Try another night.",
    );
  }`;
  source = replaceOnce(source, oldBlock.replaceAll("\n+", "\n"), newBlock.replaceAll("\n+", "\n"), file);
  fs.writeFileSync(file, source);
}

// Remove the premature divider segment still crossing the east highway.
{
  const file = "src/world/data/workHub.js";
  let source = fs.readFileSync(file, "utf8");
  source = source.replace(/\n\s*\{\n\s*id: "lagoon-centre-median-east-b",\n\s*\.\.\.gridRect\(16, 17\.95, 9, 0\.1\),\n\s*\},?/, "");
  fs.writeFileSync(file, source);
}

// Phone launcher and simple one-unit buy/sell market.
{
  const file = "src/phone/data/phoneApps.js";
  let source = fs.readFileSync(file, "utf8");
  source = replaceOnce(
    source,
    `  Object.freeze({
    id: "contacts",`,
    `  Object.freeze({
    id: "stocks",
    label: "Stocks",
    iconClass: "fa-solid fa-chart-line",
    colour: "#2ea44f",
  }),
  Object.freeze({
    id: "contacts",`,
    file,
  );
  fs.writeFileSync(file, source.replaceAll("\n+", "\n"));
}

{
  const file = "src/phone/components/GamePhone.vue";
  let source = fs.readFileSync(file, "utf8");
  source = replaceOnce(
    source,
    `  money: {
    type: Number,
    default: 0,
  },`,
    `  money: {
    type: Number,
    default: 0,
  },
  stockMarket: {
    type: Array,
    default: () => [],
  },`,
    file,
  );
  source = replaceOnce(
    source,
    '  "take-bank-loan",',
    '  "take-bank-loan",\n  "buy-stock",\n  "sell-stock",',
    file,
  );
  source = replaceOnce(
    source,
    `const formattedMoney = computed(() => {
  return formatMoney(props.money);
});`,
    `const formattedMoney = computed(() => {
  return formatMoney(props.money);
});

const stockPortfolioValue = computed(() => {
  return props.stockMarket.reduce((total, company) => total + Number(company.value || 0), 0);
});`,
    file,
  );
  source = replaceOnce(
    source,
    `          <div
            v-else-if="activeApp.id === 'moto-eazi'"`,
    `          <div
            v-else-if="activeApp.id === 'stocks'"
            class="game-phone__stocks"
          >
            <header class="game-phone__messages-heading">
              <span class="game-phone__eyebrow">STOCK MARKET</span>
              <strong>Your portfolio</strong>
              <small>{{ formatMoney(stockPortfolioValue) }} invested</small>
            </header>

            <article
              v-for="company in stockMarket"
              :key="company.id"
              class="game-phone__stock-card"
            >
              <div class="game-phone__stock-heading">
                <span><b>{{ company.symbol }}</b><small>{{ company.name }}</small></span>
                <span><b>{{ formatMoney(company.price) }}</b><small :class="company.changePercent >= 0 ? 'is-gain' : 'is-loss'">{{ company.changePercent >= 0 ? '+' : '' }}{{ company.changePercent.toFixed(1) }}%</small></span>
              </div>
              <small>You own {{ company.quantity }} · {{ formatMoney(company.value) }}</small>
              <div class="game-phone__stock-actions">
                <button type="button" :disabled="money < company.price" @click="$emit('buy-stock', company.id)">Buy 1</button>
                <button type="button" :disabled="company.quantity <= 0" @click="$emit('sell-stock', company.id)">Sell 1</button>
              </div>
            </article>
          </div>

          <div
            v-else-if="activeApp.id === 'moto-eazi'"`,
    file,
  );
  source = replaceOnce(
    source,
    "</style>",
    `.game-phone__stocks { display: grid; gap: 12px; }
.game-phone__stock-card { border: 3px solid #14213d; border-radius: 16px; background: #fffaf0; padding: 12px; box-shadow: 0 4px 0 #14213d; display: grid; gap: 9px; }
.game-phone__stock-heading { display: flex; justify-content: space-between; gap: 10px; }
.game-phone__stock-heading > span { display: grid; gap: 2px; }
.game-phone__stock-heading > span:last-child { text-align: right; }
.game-phone__stock-heading small { font-size: 0.72rem; }
.game-phone__stock-heading .is-gain { color: #168a46; }
.game-phone__stock-heading .is-loss { color: #d53535; }
.game-phone__stock-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.game-phone__stock-actions button { border: 2px solid #14213d; border-radius: 10px; background: #ffd43b; color: #14213d; font: inherit; font-weight: 900; padding: 9px; }
.game-phone__stock-actions button:last-child { background: #e8f1ff; }
.game-phone__stock-actions button:disabled { opacity: 0.38; }

</style>`,
    file,
  );
  fs.writeFileSync(file, source.replaceAll("\n+", "\n"));
}


