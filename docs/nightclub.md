# Nightclub and intoxication

> Update 2026-10-04: online balances, purchases and monetary save fields now use the server wallet. See [Local server economy](SERVER_ECONOMY.md) for current behavior and remaining simulation limits; older prototype notes below describe the preceding integration.

The club keeps its existing 2×2 footprint and off-road CLUB parking bay at X36/Y30. The generated flat-roof asset replaces the original roof reference; the old asset is retained. Park and select Night Club to buy and immediately consume a drink.

| Drink | Price | Intoxication added |
| --- | ---: | ---: |
| Eko Reserve | ₦50,000 | 10% |
| Mainland Gold | ₦150,000 | 20% |
| Owanbe Rosé | ₦300,000 | 35% |
| Big Baller Noir | ₦600,000 | 60% |
| One Million Crown | ₦1,000,000 | 100% |

Intoxication stacks to 100%. Each drink resets the current intoxication recovery period to 600 game minutes; recovery is gradual. The status emoji is 🥴 at 30% or more. The expanded HUD and Me app display the level.

While moving, short left/right steering pulses apply 10% of normal steering input. Each pulse lasts 0.7 simulation seconds; the interval scales from approximately 12 seconds at low intoxication to 2 seconds at 100%. Player steering still works and the usual collision checks apply. Stopped vehicles do not turn. Pausing/backgrounding does not advance simulation effects.

Dry gin retains its immediate energy boost. Each dose expires after the existing three game hours, drops energy to 10 and adds 50 percentage points of intoxication. Repeated gin doses have independent expiry times. Old saves' single pending gin timer is retained. Sleep clears intoxication at twice the normal rate; five game hours asleep clears an existing ten-hour effect. A gin dose that expires during sleep adds intoxication at that point, with accelerated recovery for only the remaining sleep time. Home energy bonuses do not further accelerate intoxication recovery.

The club roof is blank by day and displays NIGHT CLUB from 18:00 to 06:00 game time. One Million Crown triggers a display reading [player name] is in the house. with neon chasing the screen perimeter for 30 real seconds. Multiple purchases queue their celebrations so each buyer gets 30 seconds. Online events and purchase receipts persist in Backender; nearby clients see updates on the next five-second poll. Status reads do not write to the backend database. Hidden clients stop polling. The existing server authenticates purchases and checks the live CLUB bay position. Wallet balances remain part of the existing mirrored prototype economy.

Save files retain intoxication, recovery timing, pending gin doses and receipt watermarks. Online receipts are acknowledged through the existing save flow. Club polling stops when the world unmounts. Roof animation runs inside the existing render loop and only draws when the building is visible.

No tests, build commands or browser/game launches were run, as requested.
