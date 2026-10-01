import fs from "node:fs";

function replaceOnce(source, search, replacement, file) {
  search = search.replaceAll("\n+", "\n");
  replacement = replacement.replaceAll("\n+", "\n");
  if (!source.includes(search)) throw new Error(`Missing anchor in ${file}: ${search.slice(0, 80)}`);
  return source.replace(search, replacement);
}

for (const file of [
  "src/world/components/WorldMap.vue",
  "src/world2/components/WorldMap2.vue",
]) {
  let source = fs.readFileSync(file, "utf8");

  source = replaceOnce(
    source,
    '} from "../../economy/systems/bankSavings.js";',
    `} from "../../economy/systems/bankSavings.js";\n+import {\n+  buyStock,\n+  createStockMarketState,\n+  getStockMarketView,\n+  restoreStockMarketState,\n+  sellStock,\n+  updateStockMarketForDay,\n+} from "../../economy/systems/stockMarket.js";`,
    file,
  );

  source = replaceOnce(
    source,
    "const bankSavingsState = reactive(createBankSavingsState(gameClock.day));",
    `const bankSavingsState = reactive(createBankSavingsState(gameClock.day));\n+const stockMarketState = reactive(createStockMarketState());\n+const stockMarketView = computed(() => getStockMarketView(stockMarketState));`,
    file,
  );

  source = replaceOnce(
    source,
    "      processBankSavingsDay(bankSavingsState, gameClock.day);",
    `      processBankSavingsDay(bankSavingsState, gameClock.day);\n+      updateStockMarketForDay(stockMarketState, gameClock.day);`,
    file,
  );

  source = replaceOnce(
    source,
    "    bankSavingsState: JSON.parse(JSON.stringify(bankSavingsState)),",
    `    bankSavingsState: JSON.parse(JSON.stringify(bankSavingsState)),\n+    stockMarketState: JSON.parse(JSON.stringify(stockMarketState)),`,
    file,
  );

  source = replaceOnce(
    source,
    `    restoreBankSavingsState(\n+      bankSavingsState,\n+      saveData.bankSavingsState,\n+      gameClock.day,\n+    );`,
    `    restoreBankSavingsState(\n+      bankSavingsState,\n+      saveData.bankSavingsState,\n+      gameClock.day,\n+    );\n+    restoreStockMarketState(stockMarketState, saveData.stockMarketState);\n+    updateStockMarketForDay(stockMarketState, gameClock.day);`,
    file,
  );

  const savingsHandler = `function handleSavingsWithdrawal(amount) {\n+  withdrawFromSavings(bankSavingsState, economyState, amount);\n+}`;
  source = replaceOnce(
    source,
    savingsHandler,
    `${savingsHandler}\n+\n+function handleBuyStock(companyId) {\n+  const price = buyStock(stockMarketState, companyId, economyState.money);\n+  if (!price) return;\n+  chargeExpense({\n+    economyState,\n+    amount: price,\n+    type: "stock-purchase",\n+    label: "Stock purchase",\n+    config: DANFO_ECONOMY_CONFIG,\n+  });\n+}\n+\n+function handleSellStock(companyId) {\n+  const proceeds = sellStock(stockMarketState, companyId);\n+  if (!proceeds) return;\n+  creditIncome({\n+    economyState,\n+    amount: proceeds,\n+    type: "stock-sale",\n+    label: "Stock sale",\n+    config: DANFO_ECONOMY_CONFIG,\n+  });\n+}`,
    file,
  );

  source = replaceOnce(
    source,
    '      :money="economyState.money"',
    `      :money="economyState.money"\n+      :stock-market="stockMarketView"`,
    file,
  );

  source = replaceOnce(
    source,
    '      @take-bank-loan="handlePhoneBankLoan"',
    `      @take-bank-loan="handlePhoneBankLoan"\n+      @buy-stock="handleBuyStock"\n+      @sell-stock="handleSellStock"`,
    file,
  );

  // Empty-input simulation retains collision checks and rolling resistance while fuel runs out.
  source = source.replace(
    /const vehicleDisabled =\n([\s\S]*?)hudState\.fuel <= 0 \|\|\n([\s\S]*?);\n\n(\s*)if \(vehicleDisabled\) \{/,
    (match, before, after, indent) => `const fuelDepleted = hudState.fuel <= 0;\n${indent}const vehicleDisabled =\n${before}${after};\n\n${indent}if (fuelDepleted && Math.abs(player.speed) > 0.1) {\n${indent}  stopPlayerVehicleEngine();\n${indent}  updatePlayerVehicle({\n${indent}    vehicle: player,\n${indent}    pressedKeys: EMPTY_PLAYER_INPUT,\n${indent}    deltaSeconds,\n${indent}    config: activeVehicleConfig.value,\n${indent}    canOccupy: canPlayerOccupy,\n${indent}  });\n${indent}} else if (vehicleDisabled || fuelDepleted) {`,
  );

  source = source.replace(
    /if \(hudState\.fuel <= 0\) \{\n\s*player\.speed = 0;\n\s*stopPlayerVehicleEngine\(\);\n\s*\}/,
    `if (hudState.fuel <= 0) {\n      stopPlayerVehicleEngine();\n    }`,
  );

  const pressedKeysAnchor = "const pressedKeys = new Set();";
  source = replaceOnce(
    source,
    pressedKeysAnchor,
    `${pressedKeysAnchor}\n+const EMPTY_PLAYER_INPUT = new Set();`,
    file,
  );

  fs.writeFileSync(file, source);
}

// Mainland travel carries ownership and the portfolio into Coast City.
{
  const file = "src/world/components/WorldMap.vue";
  let source = fs.readFileSync(file, "utf8");
  source = replaceOnce(
    source,
    "      currentDay,\n    },\n  });",
    `      currentDay,\n+      ownedVehicleIds: [...economyState.ownedVehicleIds],\n+      stockMarketState: JSON.parse(JSON.stringify(stockMarketState)),\n+    },\n+  });`,
    file,
  );
  source = replaceOnce(
    source,
    "  economyState.money = snapshot.money ?? economyState.money;",
    `  economyState.money = snapshot.money ?? economyState.money;\n+  if (Array.isArray(snapshot.ownedVehicleIds)) {\n+    economyState.ownedVehicleIds = [...new Set(snapshot.ownedVehicleIds)];\n+  }\n+  if (snapshot.stockMarketState) {\n+    restoreStockMarketState(stockMarketState, snapshot.stockMarketState);\n+  }`,
    file,
  );
  source = replaceOnce(
    source,
    "  saveActiveVehicleCondition();\n+}",
    `  saveActiveVehicleCondition();\n+  player.speed = 0;\n+  stopPlayerVehicleEngine();\n+}`,
    file,
  );
  fs.writeFileSync(file, source);
}

// World 2 restores ownership immediately, and every arrival starts with the engine off.
{
  const file = "src/world2/components/WorldMap2.vue";
  let source = fs.readFileSync(file, "utf8");
  const moneyAnchor = "    economyState.money = snapshot.money ?? economyState.money;";
  source = replaceOnce(
    source,
    moneyAnchor,
    `${moneyAnchor}\n+    if (Array.isArray(snapshot.ownedVehicleIds)) {\n+      economyState.ownedVehicleIds = [...new Set(snapshot.ownedVehicleIds)];\n+    }\n+    if (snapshot.stockMarketState) {\n+      restoreStockMarketState(stockMarketState, snapshot.stockMarketState);\n+    }`,
    file,
  );
  const arrivalAnchor = "    centreCameraOnPlayer();";
  source = replaceOnce(
    source,
    arrivalAnchor,
    `${arrivalAnchor}\n+    player.speed = 0;\n+    stopPlayerVehicleEngine();`,
    file,
  );
  fs.writeFileSync(file, source);
}

// Calling at night on a non-race night must never use the daytime rejection recording.
for (const file of [
  "src/world/components/WorldMap.vue",
  "src/world2/components/WorldMap2.vue",
]) {
  let source = fs.readFileSync(file, "utf8");
  source = source.replace(
    /if \(\n\s*\(minuteOfDay >= 18 \* 60 \|\| minuteOfDay < 6 \* 60\) &&\n\s*raceOfferedOnDay\(gameClock\.day\) &&\n\s*!hasCompletedMutiuRaceOnDay\(gameClock\.day\)\n\s*\) \{([\s\S]*?)\} else \{\n\s*queuePhoneCall\(\n\s*phoneCallState,\n\s*"mutiu-day-rejection",\n\s*\{ priority: true \},\n\s*\);\n\s*\}/,
    (match, success) => `const isNight = minuteOfDay >= 18 * 60 || minuteOfDay < 6 * 60;\n\n  if (\n    isNight &&\n    raceOfferedOnDay(gameClock.day) &&\n    !hasCompletedMutiuRaceOnDay(gameClock.day)\n  ) {${success}} else if (!isNight) {\n    queuePhoneCall(\n      phoneCallState,\n      "mutiu-day-rejection",\n      { priority: true },\n    );\n  } else {\n    showPlayerWarning(\n      "info",\n      "NO RACE TONIGHT",\n      "Mutiu has no race running tonight. Try another night.",\n    );\n  }`,
  );
  fs.writeFileSync(file, source);
}

// Remove the remaining premature east-highway centre divider.
{
  const file = "src/world/data/workHub.js";
  let source = fs.readFileSync(file, "utf8");
  source = source.replace(/\n\s*\{\n\s*id: "lagoon-centre-median-east-b",\n\s*\.\.\.gridRect\(16, 17\.95, 9, 0\.1\),\n\s*\},?/, "");
  fs.writeFileSync(file, source);
}


