# Total City Grind — map and place reference

Last refreshed: 2026-10-04. Source-code inventory, not a runtime test.

## Use and maintenance

Start here for location, stop, route and housing questions. Search the named source file only when detail is missing or the code has changed. Update this reference in the same change as any renamed place, moved building, stop, route or parking change. Source code remains authoritative; this document is not a claim that every defined feature is available to players.

## Maps and coordinates

Mainland is active. Coast City (map two) is locked. Sango Otta is an extension of the mainland, not map two. Lagoon View Residence is on the mainland in Alimosho LGA.

One tile = 120 world units. Coordinates below are global tile coordinates (top-left), not district-local coordinates. Add the district offset to local coordinates; do not confuse a bus stop with its nearby building. District names describe the game's layout, not verified real-world administrative boundaries.

| Area | Source identifier | Global origin | Definition |
| --- | --- | --- | --- |
| Ifako-Ijaiye LGA | startingResidential | X0 Y0 | `src/world/data/startingResidential.js` |
| Ikeja LGA | workHub | X32 Y0 | `src/world/data/workHub.js` |
| Alimosho LGA | wealthyResidential | X0 Y18 | `src/world/data/wealthyResidential.js` |
| Mushin LGA | nightlife | X32 Y18 | `src/world/data/nightlife.js` |
| Sango Otta | northern-residential | X11 Y-68 | `src/world/data/northernResidential.js` |

## Mainland bus stops

30 distinct physical stops: 29 used by Danfo routes and 23 by BRT routes. Counts below are based on route membership, not the older per-stop route tags. Both services reuse stops. Sango Otta currently defines no bus stops.

| Stop | Area | Tile | Danfo | BRT | Stable ID |
| --- | --- | --- | --- | --- | --- |
| Alakuko | Ifako-Ijaiye LGA | X6 Y6 | Yes | Yes | `res-stop-home` |
| Ahmadiyya | Ifako-Ijaiye LGA | X14 Y4 | Yes | Yes | `res-stop-garage` |
| Abule Egba | Ifako-Ijaiye LGA | X20 Y6 | Yes | Yes | `res-stop-clinic` |
| Meiran | Ifako-Ijaiye LGA | X5 Y9 | Yes | — | `res-stop-loop` |
| Abule Oki | Ifako-Ijaiye LGA | X21 Y9 | Yes | Yes | `res-stop-estate` |
| Pleasure | Ifako-Ijaiye LGA | X30 Y9 | Yes | Yes | `res-stop-east` |
| Ile Epo | Ikeja LGA | X33 Y6 | Yes | Yes | `work-stop-west` |
| Iyana Ipaja | Ikeja LGA | X43 Y6 | Yes | Yes | `work-stop-terminal-a` |
| Dopemu | Ikeja LGA | X40 Y11 | Yes | Yes | `work-stop-terminal-b` |
| Mangoro | Ikeja LGA | X50 Y9 | Yes | Yes | `work-stop-office` |
| Agege | Ikeja LGA | X50 Y3 | Yes | Yes | `work-stop-market` |
| Ikeja Along | Ikeja LGA | X56 Y6 | Yes | — | `work-stop-east` |
| Sogunle | Ikeja LGA | X41 Y15 | Yes | Yes | `work-stop-dealer` |
| Oshodi | Ikeja LGA | X51 Y11 | Yes | Yes | `work-stop-interchange` |
| Gowon Estate | Alimosho LGA | X13 Y20 | Yes | — | `wealth-stop-olowo-epo` |
| Akowonjo | Alimosho LGA | X31 Y20 | Yes | — | `wealth-stop-waterway` |
| Egbeda | Alimosho LGA | X8 Y22 | Yes | — | `wealth-stop-north` |
| Shasha | Alimosho LGA | X21 Y22 | Yes | Yes | `wealth-stop-circle` |
| Idimu | Alimosho LGA | X18 Y26 | Yes | Yes | `wealth-stop-shopping` |
| Igando | Alimosho LGA | X3 Y30 | Yes | Yes | `wealth-stop-hospital` |
| Ikotun | Alimosho LGA | X12 Y33 | Yes | Yes | `wealth-stop-south` |
| Ejigbo | Alimosho LGA | X27 Y30 | Yes | Yes | `wealth-stop-hotel` |
| Mushin | Mushin LGA | X45 Y20 | Yes | — | `night-stop-old-airport` |
| Ladipo | Mushin LGA | X38 Y22 | Yes | Yes | `night-stop-work-link` |
| Isolo | Mushin LGA | X34 Y25 | Yes | Yes | `night-stop-clubs` |
| Ilupeju | Mushin LGA | X43 Y25 | Yes | Yes | `night-stop-circle` |
| Palmgrove | Mushin LGA | X54 Y25 | Yes | — | `night-stop-restaurants` |
| Ojuelegba | Mushin LGA | X42 Y30 | Yes | Yes | `night-stop-harbour` |
| Yaba | Mushin LGA | X51 Y30 | Yes | Yes | `night-stop-events` |
| Oyingbo | Mushin LGA | X53 Y33 | — | Yes | `night-stop-south-terminal` |

## Mainland Danfo routes

Source: `src/danfo/data/danfoRoutes.js`. Stops shown in travel order.

| Route | Name | Stops |
| --- | --- | --- |
| R1 | Alakuko to Agege | Alakuko → Ahmadiyya → Abule Oki → Ile Epo → Iyana Ipaja → Agege |
| R2 | Abule Egba to Mangoro | Abule Egba → Abule Oki → Ile Epo → Dopemu → Mangoro |
| R3 | Meiran to Dopemu | Meiran → Ahmadiyya → Abule Oki → Ile Epo → Dopemu |
| R4 | Abule Oki to Ejigbo | Abule Oki → Pleasure → Shasha → Idimu → Ejigbo |
| W1 | Market and Office Shuttle | Agege → Mangoro → Oshodi → Ikeja Along |
| W2 | Ikeja LGA Crosstown | Ile Epo → Iyana Ipaja → Dopemu → Mangoro → Agege → Ikeja Along |
| W3 | Terminal Connector | Iyana Ipaja → Agege → Mangoro → Oshodi → Sogunle |
| N1 | Ikeja LGA to Mushin LGA | Iyana Ipaja → Mangoro → Agege → Oshodi → Ladipo → Isolo → Ilupeju → Palmgrove |
| N2 | Mushin to Yaba | Mushin → Ladipo → Isolo → Ilupeju → Ojuelegba → Yaba |
| N3 | Ojuelegba Club Loop | Ojuelegba → Yaba → Palmgrove → Ilupeju → Isolo |
| H1 | Igando to Oshodi | Igando → Ikotun → Idimu → Shasha → Ejigbo → Sogunle → Oshodi |
| H2 | Akowonjo to Idimu | Akowonjo → Egbeda → Shasha → Ejigbo → Idimu |
| H3 | Egbeda to Abule Egba | Egbeda → Shasha → Igando → Pleasure → Abule Oki → Abule Egba |
| H4 | Ejigbo to Yaba | Ejigbo → Idimu → Sogunle → Oshodi → Ilupeju → Yaba |
| H5 | Gowon Estate to Agege | Gowon Estate → Egbeda → Shasha → Abule Oki → Ile Epo → Iyana Ipaja → Agege |
| HW1 | Mainland Highway Express | Gowon Estate → Egbeda → Shasha → Oshodi → Ladipo → Mushin |
| HW2 | Akowonjo–Ojuelegba Express | Akowonjo → Shasha → Idimu → Oshodi → Ilupeju → Ojuelegba |
| HW3 | Igando–Yaba Express | Igando → Ikotun → Idimu → Sogunle → Oshodi → Yaba |
| HW4 | West–East Highway Line | Meiran → Ahmadiyya → Abule Oki → Ile Epo → Oshodi → Ilupeju → Palmgrove |
| HW5 | Lagos Grand Trunk | Alakuko → Abule Egba → Pleasure → Shasha → Sogunle → Oshodi → Ladipo → Isolo → Ojuelegba |
| X1 | Four LGA Grand Line | Alakuko → Abule Egba → Abule Oki → Ile Epo → Iyana Ipaja → Oshodi → Shasha → Idimu → Ejigbo → Ladipo → Isolo → Ojuelegba |
| X2 | City Discovery Line | Akowonjo → Egbeda → Igando → Pleasure → Meiran → Agege → Mangoro → Ilupeju → Yaba |
| X3 | Mainland Complete | Mushin → Ladipo → Palmgrove → Oshodi → Sogunle → Idimu → Shasha → Egbeda → Gowon Estate |

## Mainland BRT routes

Source: `src/employment/data/brtEmployment.js`. Stops shown in travel order.

| Route | Name | Stops |
| --- | --- | --- |
| BRT-A | Alakuko–Iyana Ipaja Service | Alakuko → Ahmadiyya → Abule Oki → Ile Epo → Iyana Ipaja |
| BRT-B | Iyana Ipaja–Alimosho Express | Iyana Ipaja → Agege → Mangoro → Oshodi → Sogunle → Ejigbo → Shasha → Idimu → Ikotun → Pleasure → Abule Oki → Abule Egba → Alakuko |
| BRT-C | Igando–Dopemu Service | Igando → Ikotun → Idimu → Shasha → Ejigbo → Sogunle → Oshodi → Dopemu |
| BRT-D | Oyingbo–Alimosho Cross-City | Oyingbo → Yaba → Ojuelegba → Ilupeju → Ladipo → Oshodi → Sogunle → Ejigbo → Shasha → Idimu → Ikotun → Pleasure → Abule Oki → Alakuko |
| BRT-E | All Lagos Grand Trunk | Alakuko → Abule Egba → Pleasure → Shasha → Idimu → Ejigbo → Sogunle → Oshodi → Ladipo → Isolo → Ojuelegba → Yaba → Oyingbo |

## Named mainland landmarks

Footprints are building rectangles in tiles; parking is separate. Decorative generated houses are covered under Housing. IDs are internal keys, not necessarily current display names.

| Map label | Area | Tile | Footprint | ID | Source |
| --- | --- | --- | --- | --- | --- |
| PLAYER HOME | Ifako-Ijaiye LGA | X5 Y4 | 2 × 2 | `player-home` | `src/world/data/startingResidential.js` |
| AHMADIYYA GARAGE | Ifako-Ijaiye LGA | X13 Y3 | 4 × 1 | `danfo-garage` | `src/world/data/startingResidential.js` |
| MECHANIC | Ifako-Ijaiye LGA | X15 Y6 | 2 × 1 | `residential-mechanic` | `src/world/data/startingResidential.js` |
| PETROL STATION | Ifako-Ijaiye LGA | X20 Y3 | 3 × 2 | `residential-petrol-station` | `src/world/data/startingResidential.js` |
| ABULE EGBA HOSPITAL | Ifako-Ijaiye LGA | X27 Y3 | 2 × 2 | `community-clinic` | `src/world/data/startingResidential.js` |
| FOOD SHOP | Ifako-Ijaiye LGA | X9 Y4 | 1 × 1 | `residential-food-shop` | `src/world/data/startingResidential.js` |
| MAINLAND TERRACE | Ifako-Ijaiye LGA | X14 Y11 | 2 × 2 | `mainland-terrace-home` | `src/world/data/startingResidential.js` |
| BOLADE DRIVING SCHOOL | Ifako-Ijaiye LGA | X8 Y11 | 1 × 2 | `mainland-driving-school` | `src/world/data/startingResidential.js` |
| BUS TERMINAL | Ikeja LGA | X36 Y4 | 6 × 2 | `central-bus-terminal` | `src/world/data/workHub.js` |
| MANGORO OFFICES | Ikeja LGA | X50 Y5 | 3 × 2 | `office-hub` | `src/world/data/workHub.js` |
| AGEGE MARKET | Ikeja LGA | X47 Y2 | 3 × 2 | `central-market` | `src/world/data/workHub.js` |
| MANGORO RESTAURANTS | Ikeja LGA | X51 Y14 | 2 × 2 | `work-restaurant` | `src/world/data/workHub.js` |
| SUPERMARKET | Ikeja LGA | X50 Y2 | 2 × 2 | `work-supermarket` | `src/world/data/workHub.js` |
| BANK | Ikeja LGA | X48 Y15 | 3 × 1 | `work-bank` | `src/world/data/workHub.js` |
| SOGUNLE CAR DEALERSHIP | Ikeja LGA | X37 Y15 | 4 × 1 | `car-dealership` | `src/world/data/workHub.js` |
| ESTATE AGENCY | Ikeja LGA | X43 Y15 | 1 × 1 | `estate-agency` | `src/world/data/workHub.js` |
| PETROL STATION | Ikeja LGA | X32 Y15 | 3 × 1 | `work-petrol-station` | `src/world/data/workHub.js` |
| SUPERMARKET | Alimosho LGA | X14 Y25 | 3 × 2 | `wealthy-shopping-centre` | `src/world/data/wealthyResidential.js` |
| UPSCALE RESTAURANT | Alimosho LGA | X21 Y28 | 3 × 1 | `wealthy-restaurant` | `src/world/data/wealthyResidential.js` |
| IGANDO CLINIC | Alimosho LGA | X2 Y28 | 2 × 2 | `private-hospital` | `src/world/data/wealthyResidential.js` |
| EJIGBO HOTEL | Alimosho LGA | X26 Y28 | 2 × 2 | `luxury-hotel` | `src/world/data/wealthyResidential.js` |
| PETROL STATION | Alimosho LGA | X27 Y20 | 3 × 2 | `wealthy-petrol-station` | `src/world/data/wealthyResidential.js` |
| LAGOON VIEW RESIDENCE | Alimosho LGA | X5 Y20 | 2 × 2 | `lagoon-view-residence` | `src/world/data/wealthyResidential.js` |
| NIGHT CLUB | Mushin LGA | X36 Y28 | 2 × 2 | `night-club` | `src/world/data/nightlife.js` |
| CITY HOTEL | Mushin LGA | X41 Y28 | 3 × 2 | `nightlife-hotel` | `src/world/data/nightlife.js` |
| LIVE MUSIC | Mushin LGA | X41 Y20 | 2 × 1 | `live-music-club` | `src/world/data/nightlife.js` |
| YABA EVENT CENTRE | Mushin LGA | X44 Y29 | 2 × 2 | `event-centre` | `src/world/data/nightlife.js` |
| PETROL STATION | Mushin LGA | X54 Y20 | 3 × 2 | `nightlife-petrol-station` | `src/world/data/nightlife.js` |
| POLICE STATION | Mushin LGA | X52 Y28 | 1 × 2 | `nightlife-police-station` | `src/world/data/nightlife.js` |

## Civic sites and parking

Source: `src/world/data/civicSites.js`.

| Place | Building tile | Building size | Parking |
| --- | --- | --- | --- |
| Sango Otta School | X39 Y-9 | 2 × 2 | 10 bays: X41–45 Y-8 and X41–45 Y-5 |
| LASTMA Office | X49 Y-4 | 1 × 2 | L1: X51 Y-3; L2: X52 Y-3 |
| LAWMA Depot | X54 Y-9 | 2 × 2 | Waste truck bay: X56 Y-8, size 2 × 4; truck centre X57 Y-6; separate 4 × 4 turning yard at X54 Y-4 |
| Governor Residence | X46 Y-4 | 2 × 2 | GOV: X48 Y-4; south-facing bay with side access to the forecourt |

## Workplace parking additions

These are the additional courts from `src/world/data/workplaceParking.js`, not an exhaustive replacement for district service-bay definitions. Fuel, food, hospital, bank and other existing bays remain in the respective district files. Bank heist bay: **X49 Y14** (`work-bank-loan-parking`).

| Workplace key | Parking label | Global tile |
| --- | --- | --- |
| ahmadiyya-garage | GARAGE | X13 Y4 |
| bus-terminal | TERMINAL | X33 Y5 |
| agege-market | MARKET | X47 Y5 |
| ejigbo-hotel | HOTEL | X26 Y30 |
| night-club | CLUB | X36 Y30 |
| live-music | MUSIC | X42 Y21 |
| city-hotel | HOTEL | X44 Y28 |
| yaba-events | EVENTS | X45 Y28 |

## Housing

- Original single rooms: 20, labels A1–A4, B1–B4, C1–C4, D1–D4, E1–E4; Ifako-Ijaiye LGA.
- Sango Otta: 180 rooms, W01–W90 and E01–E90, across 15 streets (six rooms per side per street).
- Combined starter room catalogue: 200 rooms. Availability depends on occupancy.
- Purchasable mainland homes: 15, listed below. Decorative buildings are not automatically purchasable.
- No property tax; owned-home bills are ₦30,000 NEPA + ₦15,000 waste per game week.

Sources: `src/property/data/starterHomes.js`, `src/property/data/northernEstateHomes.js`, `src/property/data/properties.js`, `src/property/data/expandedHomes.js`, `src/housing/rules.js`.

| Home | Area | Price | Parking tile |
| --- | --- | --- | --- |
| Mainland Terrace | Ifako-Ijaiye LGA | ₦5,000,000 | X16 Y12 |
| Lagoon View Residence | Alimosho LGA | ₦10,000,000 | X8 Y21 |
| Alimosho Residence 1 | Alimosho LGA | ₦5,000,000 | X10 Y22 |
| Alimosho Residence 2 | Alimosho LGA | ₦5,000,000 | X13 Y22 |
| Alimosho Residence 3 | Alimosho LGA | ₦5,000,000 | X19 Y22 |
| Alimosho Residence 4 | Alimosho LGA | ₦5,000,000 | X2 Y27 |
| Alimosho Residence 5 | Alimosho LGA | ₦5,000,000 | X7 Y25 |
| Alimosho Residence 6 | Alimosho LGA | ₦5,000,000 | X10 Y25 |
| Alimosho Residence 7 | Alimosho LGA | ₦5,000,000 | X13 Y25 |
| Alimosho Residence 8 | Alimosho LGA | ₦5,000,000 | X22 Y25 |
| Alimosho Residence 9 | Alimosho LGA | ₦5,000,000 | X7 Y28 |
| Alimosho Residence 10 | Alimosho LGA | ₦5,000,000 | X10 Y28 |
| Alimosho Residence 11 | Alimosho LGA | ₦5,000,000 | X13 Y28 |
| Alimosho Residence 12 | Alimosho LGA | ₦5,000,000 | X16 Y28 |
| Alimosho Residence 13 | Alimosho LGA | ₦5,000,000 | X18 Y30 |

## Police posts and watched hotspots

Source: `src/police/policeSystem.js`. Parked car tile and watched tile are different. Heist interception uses the same six hotspots (`src/heist/rules.js`).

| Police car tile | Watched hotspot |
| --- | --- |
| X2 Y20 | X2 Y19 |
| X22 Y15 | X22 Y16 |
| X36 Y10 | X35 Y10 |
| X57 Y28 | X58 Y28 |
| X23 Y26 | X24 Y26 |
| X44 Y9 | X45 Y9 |

## Coast City — locked map two

These stops remain defined in code but are unavailable while Coast City is locked. Do not mix these with active mainland totals. Upper District, Lower District and Atlantic Waterfront are map-two areas.

Source: `src/world2/data/worldMap2.js`; routes: `src/world2/data/transitRoutes.js`.

| Stop | Declared tile | Danfo | BRT | ID |
| --- | --- | --- | --- | --- |
| Regency North | X10 Y15 | Yes | Yes | `crown-north-regency` |
| Eko Pearl North | X27 Y15 | Yes | Yes | `crown-north-eko-pearl` |
| Cedar Court North | X39 Y15 | Yes | Yes | `crown-north-cedar` |
| Kingsley North | X54 Y15 | Yes | Yes | `crown-north-kingsley` |
| Regency South | X10 Y20 | Yes | Yes | `crown-south-regency` |
| Eko Pearl South | X27 Y20 | Yes | Yes | `crown-south-eko-pearl` |
| Cedar Court South | X39 Y20 | Yes | Yes | `crown-south-cedar` |
| Kingsley South | X54 Y20 | Yes | Yes | `crown-south-kingsley` |
| Kensington West | X12 Y2 | Yes | — | `kensington-west` |
| Kensington East | X44 Y2 | Yes | — | `kensington-east` |
| Palm Court West | X15 Y13 | Yes | — | `palm-court-west` |
| Palm Court East | X44 Y13 | Yes | — | `palm-court-east` |
| Admiralty West | X15 Y23 | Yes | — | `admiralty-west` |
| Admiralty East | X44 Y23 | Yes | — | `admiralty-east` |
| Gold Coast Central | X30 Y34 | Yes | — | `gold-coast-central` |
| Gold Coast East | X48 Y34 | Yes | — | `gold-coast-east` |
| Coast City Beach | X11 Y34 | Yes | — | `coast-city-beach` |

Coastal totals: 17 Danfo stops, eight BRT stops. Nine Danfo routes (CC-D1–CC-D9), three BRT routes (CC-BRT-A–CC-BRT-C). Coordinates are the tile arguments in stop definitions; visual kerb offsets may be applied by the stop helpers.

## Quick source index

| Question | Read here |
| --- | --- |
| Assembled mainland / coordinate transforms | `src/world/data/worldMap.js` |
| Mainland dimensions / grid | `src/world/data/mapConstants.js` |
| Bus stop names / landmark labels / service bays | District source files listed above |
| Career workplaces and courses | `src/careers/catalogue.js` |
| Waste locations | `src/careers/wasteLocations.js` |
| Player housing availability and rent | `src/housing/rules.js`, `src/housing/useHousing.js` |
| Mr-Wire bank heist | `src/heist/rules.js`, `src/heist/useHeist.js` |
| Coast City layout and routes | `src/world2/data/worldMap2.js`, `src/world2/data/transitRoutes.js` |

## Local passengers

Updated 2026-10-06; source changes only, not runtime tested.

- Shared population limits and hourly redistribution are disabled. Each selected route generates local passengers independently.
- Danfo stops offer 2–8 passengers; BRT stops offer 5–16. Vehicle capacities remain 14 and 48 respectively.
- Boarding happens in a single batch after a 1.25-second stop, then navigation advances immediately. Boarding never waits for a network reply.
- Online fare amounts, Agbero charges and BRT salary are calculated separately by the backend. Payment receipts prevent repeat payments; no global NPC counts are updated.
- Old shared-population saves restart their active route at the first stop when loaded. New local passenger saves retain their route progress.
- Coast City remains locked.

Sources: `src/danfo/population/usePassengerPopulation.js`, `src/danfo/systems/danfoPassengers.js`, `services/backender/src/economy/transport.js`. Legacy population rules are inactive.

## Northern woodland and AI approaches — 2026-10-07

Code-only change, not runtime verified. Soil covers the former black northern gaps; eligible woodland tiles carry two or three tree sprites. Sango perimeter barriers are removed. Buildings, civic plots, roads and parking remain excluded from tree placement.

New roads use angular turns. West entry X2–3 at Y−69 descends via X8–9 and joins X18 at Y−2; a northern cross-link also serves the existing estate spine. East entry X60–61 at Y−69 turns west at Y−12/−11, north of the LAWMA office, then runs straight south through X58–59 into the mainland. The office branch remains at Y−2. LAWMA parking has moved west to X56–57, Y−8 through Y−5; its turning yard is X54–57, Y−4 through Y−1 and opens onto the straight road. These roads avoid the school and relocated truck bay. Outbound highway traffic exits at the northeast edge; a community route exits at the northwest edge via the estate spine. Existing estate housing access lanes do not carry new through routes. Spawn staging is Y−71, outside visible bounds.

Sources: `src/world/data/northernApproaches.js`, `worldMap.js`, `northernResidential.js`, `src/population/data/populationRoutes.js`. Tree/soil assets: `src/assets/environment/sango-tree-topdown-1x1.png` and `sango-soil-topdown-1x1.png`.

### Governor residence and tree collision — 2026-10-07

The governor residence uses a replacement transparent, fence-free building sprite (`src/assets/buildings/governors-house.png`) on its existing 2 × 2 footprint at X46 Y−4. GOV parking moved to X48 Y−4, with a paved side connection south to the forecourt. Only the new northern woodland trees have added individual trunk collision rectangles; existing decorative trees are unchanged. These obstacles use the existing spatial collision index. Source edits only; not runtime tested.

### Phone map and government parking — 2026-10-07

The client and Backender government interaction now both use GOV parking at X48 Y−4. The phone map catalogue includes Sango Otta School, LASTMA Office, LAWMA Depot and Governor Residence, with navigation targeting their first marked parking bay. Governor house/government are search aliases. All Sango home parking addresses are also searchable. Entries derive coordinates from civic/residential parking definitions, so bay moves update navigation automatically. Sources: `src/motoEazi/data/motoEaziLocations.js`, `src/government/rules.js`, `services/backender/src/government/rules.js`.


## Woodland approach terrain (2026-10-08)

The tree-filled gaps beside Sango Otta now use grass. Only roads in `src/world/data/northernApproaches.js` use a mud surface: the west and east edge approaches, their right-angle turns, and their mainland links. Player vehicles and AI traffic travel at 50% normal road speed on those approach rectangles; normal speed resumes off them. Sango estate streets and the existing city roads retain their surfaces. Surface detection: `src/world/systems/roadSurface.js`.

New woodland trees use circular collision areas at 90% of canopy diameter with `blocksVehicles: true`; player and AI vehicle collision checks use the existing obstacle spatial index.
