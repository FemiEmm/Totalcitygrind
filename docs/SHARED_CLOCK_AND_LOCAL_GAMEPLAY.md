# Shared clock and local gameplay

Implemented 2026-10-07. Source review only; no runtime tests or builds run.

## Routing

Authenticated browser requests to Backender /api/game now handle bootstrap, room claims, saves, rankings, account deletion, housing actions, day-close/session checkpoints, government status/voting and club/career status. Caller identity comes from the authenticated token; client-supplied world evidence is cleared. Backender retains financial/domain validation. Position-dependent mutations (club purchases, career activity/enforcement, governor office commands and heists) still use the multiplayer service. Existing checkpoint financial validation is unchanged; this is not a new anti-cheat authority implementation.

Housing/government status polling is now once per minute; club status once per 15 seconds. Financial settlement processes the requesting account instead of every account per request. Other players receive their receipts on their next settlement. Ad listing requests now include the public API key. Authenticated HTTP calls retry once with a refreshed token on 401; server-initiated socket disconnections attempt reconnection.

## Time

Online city time is derived from a fixed epoch: 2026-10-07 00:00 UTC corresponds to day 1 at 06:00. One real second equals one game minute. Both frontend and backend use that epoch. The client uses monotonic time between /public/clock synchronizations (once per minute). No per-second time requests, no clock reset at server restart, and no clock advancement from sleep. Offline games retain their local running clock. Changing the epoch or rate requires coordinated frontend/backend changes and save migration. Older online save date fields are rebased once to preserve relative deadlines during conversion.

## Sleep and debug

Sleep begins locally while stopped at home. It makes no housing/sleep request, does not run the old sleep robbery action, and restores energy at the existing home recovery rate plus health at 12.5 points per game hour. End sleep now keeps recovery already earned. City simulation continues without time skipping. Fixed-duration options are removed. Health/energy simulation remains on the device; values can still be included in ordinary progress saves. God Mode is a session-only Debugger toggle that keeps health and energy full; it does not protect vehicle damage, fuel or money.

## Visuals

Building footprints have cached drop shadows. Player headlights use the rendered vehicle length so the Danfo beam starts at the front rather than the windscreen.

## Deployment

Deploy Backender before the frontend because the new frontend requires /api/game and /public/clock. No new environment variables or SQL migrations are needed. Supabase remains the persistent database.
