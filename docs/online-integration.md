# Local online integration

> Update 2026-10-04: online balances, purchases and monetary save fields now use the server wallet. See [Local server economy](SERVER_ECONOMY.md) for current behavior and remaining simulation limits; older prototype notes below describe the preceding integration.

Start from the game folder with `npm run dev:connected`. This starts Backender (3001), the game server (3000), and Vite (5173) in one terminal. Stop existing instances on these ports first. Ctrl+C stops the processes launched by this command. Nothing is installed as an operating-system service.

Open **Online city** on the title screen, create an account or sign in, then choose **Enter city / continue account**. A new account chooses one of the 200 rooms and pays first rent; an existing account resumes its server save. The Online city panel is also available while paused and shows connections, save status, and implementation progress. Offline Play and its three local slots remain separate.

## Responsibilities

| System | Current connection |
| --- | --- |
| Identity | Backender signup, password login, refresh, logout; server verifies access token |
| Homes | Backender atomically allocates one home per account; one tenant per home, including first payment |
| Starting money | Server-side one-time 50,000 grant less catalogue rent during the tenancy transaction |
| Saves | Account snapshot through authenticated game server to Backender; optimistic revision prevents stale overwrites |
| Economy | Money, fares, savings, loans, stocks and fees persisted in snapshots; calculations still client-side |
| Progress | Jobs, quests, routes, properties, businesses, family obligations, subscriptions and clock persisted |
| Possessions | Inventory, vehicle condition, owned cars and cosmetics persisted |
| Mainland multiplayer | Account identities and live poses at 10 Hz; remote cars rendered, non-colliding |
| Coast City | Saves connected; multiplayer presence pending |
| NPC traffic, shared stock market | Still separate local simulations; authoritative shared simulation pending |

Game saves queue cloud uploads and autosave every 30 seconds. On upload failure the account's local save remains, and the panel says **Local save only — sync failed**. A later save retries. A revision conflict stops uploads until the account is reopened; reopening deliberately loads the server version. Closing a browser cannot guarantee delivery of the last upload: use Save and wait for **Saved on Backender** before closing. Local account saves use separate keys and do not overwrite offline slots.

First-home claim is idempotent: if the game closes after payment but before its initial save, reopening uses the existing tenancy without another payment. Local save deletion never releases a shared tenancy. Moving homes, tenancy cancellation, eviction, and server-timed weekly rent are not implemented yet.

## Configuration and data

- Game `.env.local`: public anonymous key and service URLs only; ignored by Git.
- Server `.env`: Backender URL, anonymous key and private service key; authentication enabled, capacity 100.
- Backender `.env`: anonymous key, service key, JWT secret and allowed browser origins.
- Backender `data/backender.json`: local users, sessions, profiles, exclusive `homes` and revisioned `gameStates`.
- Backender `data-catalog/homes.json`: server-owned catalogue copied from the game's home definitions. Run `npm run sync:homes` after changing home IDs or rents, then restart Backender. Existing tenancy prices remain unchanged.

The new `POST /api/game` endpoint accepts `bootstrap`, `claim`, and `save`, derives the player ID from authentication, and calls private Backender `/rest/v1/rpc/game_state`. Browser clients cannot call this RPC with an anonymous key. Supabase migration still needs the equivalent RPC/schema for homes and game snapshots; the earlier profiles-only SQL is not sufficient for this integration.

This is a local development integration, not an authoritative multiplayer economy. Snapshot values remain client-originated and cannot be trusted for competitive play. Move purchases, rewards, loans, rent renewals and stock transactions to validated server commands before public multiplayer. The server capacity is configured for 100; it has not been load-tested. Other players currently display vehicle type and name, not equipped cosmetics; traffic and collision results are not shared.

For phone access on a LAN, replace loopback browser URLs with the PC's LAN address, bind the services/Vite to the LAN interface, and add the exact browser origin to both service allowlists. A public HTTPS deployment needs publicly reachable HTTPS/WSS services; it cannot reach your PC's loopback URLs.

No tests, builds, servers or game sessions were run for this change, per request.
