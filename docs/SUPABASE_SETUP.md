> Packaging update: the maintained service copies are now in services/backender and services/game-server in this repository. See [Render deployment](RENDER_DEPLOYMENT.md). The owner reported the schema 2 migration succeeded. Original sibling folders remain for local fallback only. No cloud services have been deployed.

# Supabase database setup

Project: https://lseyihysmngwvgnzvdpf.supabase.co

## Current work: database and transaction protection

The frontend calls the multiplayer server and Backender. Backender owns account authentication and game transactions; Supabase stores their PostgreSQL records. This keeps the existing username/password and optional-email accounts. These accounts are in the private accounts table, not the Supabase Authentication dashboard. The publishable key is not a database write credential.

The first migration, 202610060001_backender_storage.sql, has already been applied by the owner. The next migration is:

supabase/migrations/202610060002_game_tables.sql

Run its complete contents once in Supabase SQL Editor. It creates separate tables and changes the schema version to 2 in a single transaction. If the temporary cloud adapter already contains data, it stops without removing anything; an explicit data migration is then needed. This is intentional for the fresh-game launch. It never reads or uploads the local Backender JSON file.

The new Backender code requires schema version 2. Apply the migration before starting that version. No cloud migration or deployment was performed by the coding agent.

## Tables

All tables are in tcg_private, with RLS enabled and no permissions for public, anon or authenticated. Do not expose this schema through the Data API.

- accounts: one account per row, unique case-insensitive username and optional email, private password hashes and signup agreement.
- profiles: one public/game profile per account; financial projection is written by game actions.
- auth_sessions: hashed tokens, account reference and unique refresh hash.
- wallets and wallet_components: wallet control data and individual financial components, including cash, savings, stocks, inventory, cosmetics and progression. Amount constraints reject invalid cash/savings values.
- game_saves: one revisioned save per player.
- home_reservations: one row per starter room, unique player reservation and nonnegative rent.
- properties and housing_accounts: ownership, exclusive tenant/occupant records, bills, mortgage and housing receipts.
- police_reservations: exclusive police parking reservations.
- careers, career_notices, government_accounts, wage_claims, election_candidates and election_votes: employment, enforcement and government records.
- passengers and passenger_sessions: individual shared passengers and player journeys.
- heist_accounts, club_accounts and club_events: player and shared activity records.
- site_visits: individual visit deduplication entries.
- shared_state: domain metadata such as election configuration, waste lifecycle and passenger baseline. It does not hold whole account or wallet collections.
- wallet_ledger: append-only financial entries with account, sequence, amount, cash and savings after the entry.
- processed_requests: immutable action fingerprints and responses, unique per player/request ID.
- store_meta: schema version and a shared transaction lock/revision.

The old empty store_sections table is retained for inspection. The new adapter never reads or writes it. Domain records retain JSONB payloads where game state is flexible; identity, occupancy, revisions and financial receipt constraints are enforced by SQL.

## Transaction behaviour

A game action, its wallet changes, housing changes, save projection and retry receipt commit together. Failure rolls back everything. HTTP success is sent only after COMMIT. PostgreSQL errors never fall back to local file storage.

Explicit commands require a request ID and timestamp. Within the 15-minute retry window, identical retries return the previous result with the current wallet. Reusing an ID with changed action details is rejected. Expired requests are rejected. Older receipts stay in PostgreSQL, so reusing their IDs cannot apply another payment even after they leave the in-memory retry window. Server position/context is excluded from fingerprints because it can change between retries. Server-timed status/heartbeat operations instead use their domain progression cursors.

The profile PATCH API only accepts display_name. Browser save uploads have their money, inventory, stocks, owned vehicles and other financial fields replaced with authoritative wallet data. Passenger acknowledgements also use the wallet's applied event cursor. The starting grant and initial rent are issued together once and recorded in the ledger.

## Connection and later hosting

Backender needs STORAGE_DRIVER=postgres and DATABASE_URL. Use Supabase Connect > Session pooler for the PostgreSQL URI. Enter the password in the private environment setting, URL-encoding reserved characters. Never put it in Git, chat or a VITE variable. Keep TLS certificate verification enabled; DATABASE_CA_FILE can point to the Supabase CA certificate when needed.

The prepared local backender/.env.supabase.local still needs DATABASE_URL. Ordinary npm run dev:connected continues using the existing local file database. npm run dev:supabase uses the private Supabase environment but still runs the two servers on the PC; it is not a cloud deployment.

For the eventual PC-independent launch, host Backender and total-city-grind-server on cloud services, with Supabase as their database and Netlify as the frontend. Both service packages are now included under services/ in this repository; cloud hosting is still unfinished. BACKEND_SERVICE_ROLE_KEY is the private Backender API key, not a Supabase publishable key. No database credential belongs in the multiplayer browser client.

## Remaining limits

The existing cross-player settlement rules still hydrate current domain records and serialize their changes with one world transaction lock. Historic ledger entries are not loaded; only recent retry payloads are loaded. Narrower per-domain/account transactions require a separate refactor of shared payroll, rental, passenger and election settlement. This implementation has not been established as suitable for 100 concurrent players.

Server-owned balances prevent direct HTML/save balance editing from creating spendable money. This does not claim complete anti-cheat: movement and some health, fuel and offence reports still originate on clients and need further server simulation/validation.

No tests, builds, syntax checks, browser checks or live database checks were run, as requested. The SQL and runtime changes remain unverified until the owner authorizes verification.
