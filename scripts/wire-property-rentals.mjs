import fs from "node:fs";
function edit(path, fn) { const s = fs.readFileSync(path, "utf8"); const n = fn(s); if (n === s) throw new Error(`No change: ${path}`); fs.writeFileSync(path, n); }

edit("src/world/components/WorldMap.vue", s => s
  .replace('} from "../../property/systems/propertySystem.js";', '} from "../../property/systems/propertySystem.js";\nimport { listOwnedHome, removeVacantListing, handleLateTenant, processRentalDay } from "../../property/systems/propertyRentalSystem.js";')
  .replace('function processCurrentBusinessIncome() {', `function processCurrentRentalIncome() {
  processRentalDay(propertyState, gameClock.day).forEach((event) => {
    if (event.amount > 0) creditIncome({ economyState, amount: event.amount, type: "property-rent", label: "PROPERTY RENT", config: DANFO_ECONOMY_CONFIG });
    showPlayerWarning("property-rent", event.type === "late" ? "RENT DELAYED" : "REALTOR UPDATE", event.text);
  });
}

function handleRentalListing({ propertyId, weeklyRent }) {
  listOwnedHome({ propertyState, propertyId, weeklyRent, currentDay: gameClock.day });
}
function handleRentalRemoval(propertyId) { removeVacantListing(propertyState, propertyId, gameClock.day); }
function handleLateRentalAction({ propertyId, action }) { handleLateTenant(propertyState, propertyId, action, gameClock.day); }

function processCurrentBusinessIncome() {`)
  .replace(/processCurrentPropertyMortgage\(\);\r?\n(\s*)processCurrentBusinessIncome\(\);/g, 'processCurrentPropertyMortgage();\n$1processCurrentRentalIncome();\n$1processCurrentBusinessIncome();')
  .replace(':life-obligations="lifeObligationView"', ':life-obligations="lifeObligationView"\n      :property-state="propertyState"\n      :property-catalogue="PROPERTY_CATALOGUE"')
  .replace('@pay-family-request="handleFamilyRequestPayment"', '@pay-family-request="handleFamilyRequestPayment"\n      @list-property-rental="handleRentalListing"\n      @remove-property-rental="handleRentalRemoval"\n      @resolve-late-rent="handleLateRentalAction"'));

edit("src/phone/components/GamePhone.vue", s => s
  .replace('  trafficReport: {', `  propertyState: { type: Object, default: () => ({ activeHomeId: "starter-rental", ownedPropertyIds: [], rentals: { listings: {}, messages: [] } }) },
  propertyCatalogue: { type: Array, default: () => [] },
  trafficReport: {`)
  .replace('  "debug-start-race",', '  "debug-start-race",\n  "list-property-rental",\n  "remove-property-rental",\n  "resolve-late-rent",')
  .replace('const transferAmount = ref("");', 'const transferAmount = ref("");\nconst rentalAmounts = ref({});')
  .replace('                <button class="game-phone__conversation" type="button" @click="openMessageContact(\'sister\')">', `<button class="game-phone__conversation" type="button" @click="openMessageContact('realtor')">
                  <span class="game-phone__contact-avatar game-phone__contact-avatar--work"><i class="fa-solid fa-house-circle-check" /></span>
                  <span class="game-phone__conversation-details"><strong>Realtor</strong><small>Manage owned homes and tenants</small></span>
                  <i class="fa-solid fa-chevron-right" />
                </button>

                <button class="game-phone__conversation" type="button" @click="openMessageContact('sister')">`)
  .replace('            <template v-else-if="activeMessageContactId === \'megapay-bank\'">', `<template v-else-if="activeMessageContactId === 'realtor'">
              <header class="game-phone__messages-heading"><span class="game-phone__eyebrow">PROPERTY</span><strong>Your Realtor</strong><small>List vacant owned homes and manage tenants</small></header>
              <div v-for="message in [...(propertyState.rentals?.messages ?? [])].reverse()" :key="message.day + message.text" class="game-phone__message-bubble">{{ message.text }}<time>Day {{ message.day }}</time></div>
              <section v-for="property in propertyCatalogue.filter(p => propertyState.ownedPropertyIds.includes(p.id))" :key="property.id" class="game-phone__rental-card">
                <strong>{{ property.name }}</strong>
                <small v-if="propertyState.activeHomeId === property.id">CURRENT HOME · Move out before listing</small>
                <template v-else-if="!propertyState.rentals?.listings?.[property.id]">
                  <input v-model.number="rentalAmounts[property.id]" type="number" min="1000" step="1000" placeholder="Weekly rent">
                  <button type="button" @click="$emit('list-property-rental', { propertyId: property.id, weeklyRent: rentalAmounts[property.id] })">PUT ON MARKET</button>
                </template>
                <template v-else>
                  <small>{{ propertyState.rentals.listings[property.id].status.toUpperCase() }} · {{ formatMoney(propertyState.rentals.listings[property.id].weeklyRent) }}/week · {{ propertyState.rentals.listings[property.id].chance }}% tenant chance</small>
                  <button v-if="propertyState.rentals.listings[property.id].status === 'listed'" type="button" @click="$emit('remove-property-rental', property.id)">REMOVE LISTING</button>
                  <div v-if="propertyState.rentals.listings[property.id].status === 'late'" class="game-phone__rental-actions">
                    <button type="button" @click="$emit('resolve-late-rent', { propertyId: property.id, action: 'patient' })">BE PATIENT</button>
                    <button type="button" @click="$emit('resolve-late-rent', { propertyId: property.id, action: 'remind' })">SEND REMINDER</button>
                    <button type="button" @click="$emit('resolve-late-rent', { propertyId: property.id, action: 'evict' })">EVICT</button>
                  </div>
                </template>
              </section>
              <div v-if="!propertyState.ownedPropertyIds.length" class="game-phone__empty-app"><i class="fa-solid fa-house" /><strong>You do not own a rentable home</strong><small>The starter house belongs to your landlord.</small></div>
            </template>

            <template v-else-if="activeMessageContactId === 'megapay-bank'">`)
  .replace('</style>', `.game-phone__rental-card { display:grid; gap:8px; margin:10px 0; padding:12px; border:3px solid #14213d; border-radius:14px; background:#fffaf0; box-shadow:3px 4px 0 #14213d; }
.game-phone__rental-card input,.game-phone__rental-card button { min-height:38px; border:2px solid #14213d; border-radius:9px; padding:7px; font:inherit; }
.game-phone__rental-card button { background:#ffd43b; font-weight:800; }
.game-phone__rental-actions { display:grid; gap:6px; }
</style>`));

console.log("Wired Realtor rental UI and daily rental processing.");
