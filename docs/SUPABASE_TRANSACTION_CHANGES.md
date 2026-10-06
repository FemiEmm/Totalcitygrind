# Database and transaction changes — 6 October 2026

Scope: launch steps 1 and 2 only. No deployment or repository move.

## Files

Game repository:
- supabase/migrations/202610060002_game_tables.sql
- docs/SUPABASE_SETUP.md
- docs/SUPABASE_TRANSACTION_CHANGES.md

Backender repository:
- src/storage/layout.js: fixed table/domain mapping.
- src/storage/records.js: hydrate records and persist only changed rows; financial history remains in the ledger table.
- src/storage/postgres.js and src/store.js: require schema 2 and use row-based storage within an atomic world transaction.
- src/economy/requests.js: deterministic request fingerprint.
- src/economy/authority.js and src/economy/actions.js: persistent ledger sequences and post-transaction savings balances.
- src/game.js: broader retry protection, trusted passenger acknowledgements, opening grant/rent ledger.
- src/index.js: restrict profile writes to display name and translate uniqueness conflicts.

## Owner action

Run the new migration in Supabase SQL Editor after the previously applied first migration. It refuses to discard existing cloud alpha data. Configure the private database connection on Backender when proceeding to hosting.

## Boundaries

Custom Backender authentication is retained. Database access is private. No local account data is migrated or deleted. Offline file storage is preserved. The shared settlement lock is retained for correctness, so this is not a completed concurrency/scaling refactor or a claim of full anti-cheat.

All changes are untested at the owner's request.

## Repository packaging update

The maintained Backender implementation now lives in services/backender within the game repository. The multiplayer package lives in services/game-server. Original sibling folders were preserved for local fallback. See RENDER_DEPLOYMENT.md before configuring hosted services.
