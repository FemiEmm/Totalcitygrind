# Big People Club

> Update 2026-10-04: online balances, purchases and monetary save fields now use the server wallet. See [Local server economy](SERVER_ECONOMY.md) for current behavior and remaining simulation limits; older prototype notes below describe the preceding integration.

The interface contains only the two tabs and ranking rows (rank, name, wealth). The extra brand banner, wealth summary, explanations, threshold message and timestamp have been removed.

The phone's crown icon opens BPC in both cities. Millionaires shows the top 50 from 50 fictional founders plus qualifying players. Haleeko Mangote starts at ₦200 billion; the lowest founder is Damilola Owolabi at ₦20 million. As players join, the top-50 cutoff can rise. Ties share a rank; at equal wealth, players appear before founders.

Player rankings includes all Backender profiles, including offline players, with 25 rows per page and your own row highlighted. Online rankings use the most recent account saves, not locally unsaved balances. Opening BPC or selecting Player rankings fetches updated rankings; there is no background polling. Offline play shows the founders and local net worth, and shows a short sign-in prompt only on the unavailable player tab.

Net worth is cash plus savings, shares at the saved market price, owned properties and private vehicles at catalogue value, the business office and managed fleet assets, minus quick/bank loan balances and the remaining mortgage. Aggregate loan balances and mortgage arrears are not subtracted twice. Rented homes, the leased starter Danfo, employer BRT, consumables and cosmetics are excluded. Negative net worth is allowed.

Backender calculates and caches net worth when an account is saved. Existing accounts without cached wealth are calculated from their latest snapshot on first ranking read. The authenticated `rankings` game API returns only account ID, display name, net worth, rank and update time. The current integration still relies on client-originated saves; server calculation of the leaderboard does not make those source balances authoritative.

When asset prices or the net-worth calculation change, run `npm run sync:bpc` and restart Backender. Existing cached rankings update on each player's next save. The sync command copies the shared pure calculator and generated catalogue into Backender; its runtime does not depend on the game source tree.

Source reviewed only; no tests, builds or game sessions run, as requested.
