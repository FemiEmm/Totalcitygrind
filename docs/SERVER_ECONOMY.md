> October 6 update: database schema 2 uses separate account, wallet, save, property and immutable receipt tables. See [Supabase setup](SUPABASE_SETUP.md) for the required migration and current scaling/anti-cheat limits. SQL and code have not been tested.

Supabase update (2026-10-06): an opt-in PostgreSQL storage bridge is now prepared. See [SUPABASE_SETUP.md](SUPABASE_SETUP.md). The file-storage description below applies to local mode. Supabase Auth migration and normalized high-concurrency tables remain separate work.

# Local server economy

Updated 2026-10-04. Implementation reviewed as source only; no tests, builds or game sessions were run for this change.

## Run locally

From the game folder, run `npm run dev:connected`. Restart all three processes after this update, then use **Play Online**. Offline play deliberately keeps its separate local economy.

## Authority boundary

Browser -> authenticated game server (/api/game) -> private Backender game_state RPC -> atomic JSON-store transaction.

Backender now owns a wallet per account in `wallets`. An uploaded save is projected from that wallet: cash, savings, debt, stock holdings/prices, inventory, cosmetics, properties, businesses, life obligations and monetary objective progress cannot be overwritten with browser values. Account wealth uses these protected fields. Ordinary user credentials cannot write profiles or call the private game RPC.

Clients send actions and catalogue IDs, not new balances or prices. The backend validates available money/ownership and calculates prices, fares and rewards. It covers savings transfers, stocks/adviser subscriptions, loans, vehicles, cosmetics, food, fuel, repairs, medical services, businesses, rent, family payments and objective claims. Existing housing, career, government, club and heist receipts settle into the same wallet transaction. Passenger fares and BRT route salaries settle from the server passenger session; Moto Eazi uses server-held offers and ride progress.

Receipt watermarks belong to the backend. A transaction commits the wallet and domain state together, or neither. Mutating UI actions carry a request ID and creation time; duplicates within the 15-minute retry window return their previous result. Old requests are rejected. Passenger steps and ride ticks use domain progression/receipt guards rather than storing a full response for every poll. A new request ID represents a new requested action, not a retry.

Financial time advances from connected career heartbeats, capped by elapsed server time. It does not catch up offline or accept uploaded calendar changes. Home sleep is a specific validated action limited to 1–8 game hours; it cannot occur during an active shift or class. Elections keep their existing real-world schedule. Shared waste, passenger redistribution and heist cooldowns retain their own existing server clocks.

## Existing accounts

Each account is migrated once from its existing Backender profile/save, not from a newly submitted browser save. Existing cash and possessions are retained; past client-originated data cannot be retroactively proven genuine. New accounts receive the starting grant and food once when claiming their first home. Back up the Backender data file before manual migration or deployment.

## Files and maintenance

- Frontend: `src/network/connection.js`, `src/world/components/WorldMap.vue` and online guards in the economy helpers.
- Game server: `../total-city-grind-server/src/gameApi.ts` authenticates the caller and supplies its current known vehicle position.
- Backender: `../backender/src/economy/authority.js`, `actions.js`, `locations.json`, `src/game.js` and `src/store.js`.
- `../backender/src/game-rules/` contains the server copies of relevant pure game rules/catalogues; image imports are replaced with empty strings. When changing prices or rules, update these server copies too. Do not copy the frontend getSaveAccount guards into backend rules. Service bay changes also require updating locations.json.

All three projects must be retained/deployed. Pushing only the frontend repository does not upload the sibling backend or game server.

## Moving to a cloud host

The browser API stays unchanged. Deploy the game server and Backender as Node services, keep Backender storage on persistent disk, and configure their private environment variables. Point the frontend's VITE_GAME_SERVER_URL and VITE_BACKEND_URL at the HTTPS endpoints and rebuild the frontend. Set allowed client origins to the deployed site. Service-role keys stay on the server, never in VITE variables or Git.

Backender's JSON store is for one process. Do not run multiple replicas writing the same file. Moving to Supabase additionally requires implementing the game_state RPC/domain logic and transactional wallet/ledger tables with database row locking and unique request/receipt constraints, plus blocking direct user financial writes through RLS. Changing URLs and keys alone is not that migration. Keep the same /api/game contract so the game UI does not need rewriting.

## Remaining boundaries

This change prevents forged balance/save writes from funding online purchases. It is not complete simulation anti-cheat:

- Position originates from the browser with existing movement checks; joining/teleportation, collisions, energy, fuel, damage, fines and crime still need stronger server simulation/validation. Service quantities use bounded reported condition; unit prices are server controlled.
- Collision-free, energy-safe, fine-safe and client-condition-only objective events are not accepted as proof for online cash rewards. Their server verification remains outstanding; local edits cannot unlock their payouts. Offline objectives keep their existing behavior.
- Stocks are protected per-account markets, not yet one global stock exchange. NPC traffic still runs locally.
- Disk persistence and account-wide settlement have not been load-tested. No claim of production readiness or full anti-cheat is made.

## Route payment recovery (2026-10-06)

Boarding remains local. Route payments use stable request IDs and timestamps and retry transient failures in the background. The game server retains up to two minutes of observed stationary positions, sampled at most four times per second per player, to validate delayed stop claims. Client-supplied proof is overwritten. Unconfirmed stops do not block later stops; fare calculation only includes previously confirmed boarding stops. BRT salary still requires every stop to be confirmed. Old receipts are not replayed as Agbero popups. Wallet responses include the latest 100 audited transactions for the phone, including grants and first rent. Deploy frontend, Backender and game server together. No runtime verification performed.
