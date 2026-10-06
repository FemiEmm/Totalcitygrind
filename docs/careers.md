# School, careers and Me

> Update 2026-10-04: online balances, purchases and monetary save fields now use the server wallet. See [Local server economy](SERVER_ECONOMY.md) for current behavior and remaining simulation limits; older prototype notes below describe the preceding integration.

Implemented on the mainland only. No residential staffing. Coast City remains locked.

- Me: current courses, completed classes, certificates, employment, health, energy, fuel and damage.
- School: categories for Education, Medicine, Engineering, Public services, Business, Hospitality and Transport. Courses require 5 or 10 classes, each lasting 360 game minutes. Stay parked for credit; leaving cancels the current class. Classes are free for this first version.
- Workplace role capacities are in src/careers/catalogue.js. Each establishment has its own capacity. Online applications are committed atomically in Backender. Players can quit; certificates remain.
- Each workplace has a six-hour daily shift slot (00:00, 06:00, 12:00 or 18:00). The listed weekly salary is earned across five full shifts. Late starts and early departures pay only minutes actually worked. Only one shift per time slot is paid.
- Police and LASTMA duty swaps the player's vehicle; ending duty returns their previous vehicle to the workplace. Nearby stopped online players can be inspected, including private-car drivers. Blocking or close contact opens the inspection; the manual check button also remains available. Police arrests require crime 50+, and use the existing 24-hour station system. LASTMA checks unpaid traffic fines, with payment or bribe choices.
- LAWMA: 50 mainland roadside waste locations, 1,500 per collection, no idle shift salary. Piles disappear and return next game day. Online collection claims are atomic.
- Debugger: AI traffic toggle removes population traffic, private-citizen traffic, tow vehicles and parked police; real players remain. The choice is saved.

## LAWMA depot

Office: X54–55 / Y-9–-8 (2x2). Truck bay: X58–59 / Y-8–-5 (2x4). Turning yard: X54–59 / Y-4–-1 (6x4). Entrance opens the northern boundary at X54–57. Truck spawns centred at X59/Y-6 facing south. Existing road layout and AI spawn positions are retained. The truck body is 78 by 238 world units and fits inside the planned 1x3-tile allowance.

## Runtime and persistence

Game client, local game server and Backender were updated. Restart server and Backender to load their changes. Courses, jobs and receipts have their own Backender career records; successful saves acknowledge paid receipts. Vehicle permissions are checked against active duty. The prototype still uses the game's client-simulated economy, crime and game clock; this is not a complete server-authoritative economy migration.

No tests, builds or game launches were run, as requested. Placement and integration were reviewed in source only; actual turning and multiplayer behavior still need gameplay verification.

Public payroll now uses the government treasury for police, LASTMA, LAWMA, Abule Egba Hospital and school jobs. Unfunded earnings remain salary arrears; Government in Messages shows the amount owed. See government.md.
