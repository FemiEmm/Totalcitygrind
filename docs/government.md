# Government and elections

> Update 2026-10-04: online balances, purchases and monetary save fields now use the server wallet. See [Local server economy](SERVER_ECONOMY.md) for current behavior and remaining simulation limits; older prototype notes below describe the preceding integration.

Governor residence: building tiles X46–47/Y−4..−3 (2×2). Parking tile X46/Y−2. Forecourt X46–47/Y−2..−1 connects to the northern mainland road. Existing roads and AI spawn gates stay intact.

Elections use real calendar weeks in Africa/Lagos (UTC+1, no DST). Forms cost ₦10,000,000 and are available Monday–Saturday while parked at the residence. Sunday voting runs 00:00–23:59:59. One vote per account per week, including a candidate voting for themselves. Most votes wins; ties (including zero votes) favour the earlier nomination, then account ID. Form fees enter the treasury. When nobody runs, DIDEJADE OWOWOLU is governor. Results are resolved on the next server request after the boundary; phone polling refreshes every 15 seconds while visible. No background timer advances the simulation.

Tax has a separate clock: each player's seven in-game days, starting day 1. It starts at 15% of earned income, assessed when that game week ends. Unpaid tax is collected from available cash on subsequent government updates. Loans, savings withdrawals, asset principal and looted treasury funds are excluded; fares, job earnings, rewards, rental/fleet income, savings interest and realised positive stock gains are counted. Existing saves start tracking new income, with no retrospective tax. Rates at assessment time apply to that game week's earnings; late-reported earnings use the same assessed rate.

Government funding covers police, LASTMA, LAWMA collections, every Abule Egba Hospital job, and school teachers. Private clinics and other employers keep their existing payroll. Earned public wages enter a FIFO arrears queue; available treasury funds pay it, including partial payments. Paid wages arrive through persistent receipts. The treasury begins at zero; it is funded by tax and nomination fees. Looting transfers the selected amount to the governor and adds 100 crime per successful withdrawal.

Only the current elected governor, parked at the residence, can change tax (0–100%), set a uniform mainland single-room rent adjustment (−100% to +10,000% from the original rent), or loot. Rent policy applies to rows A–E, including new tenancies and current rent obligations; it does not compound and excludes Sango Otta. The picker displays current online prices. Unaffordable rooms cannot consume the starting grant.

Online state persists in Backender's government section. The game server injects authenticated identity and live vehicle position; Backender controls election time, nominations, votes, governor permissions, treasury mutation and wage allocation transactionally. Money and earnings remain client mirrors, consistent with the existing prototype economy, not a cheat-proof authoritative economy. The offline game uses the same rules in its local save and has no other player candidates. Receipt watermarks prevent ordinary reconnects from applying transfers or crime twice.

No tests, builds, servers or browser sessions were run for this change, per request.
