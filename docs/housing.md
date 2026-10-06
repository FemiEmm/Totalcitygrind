# Housing update

> Update 2026-10-04: online balances, purchases and monetary save fields now use the server wallet. See [Local server economy](SERVER_ECONOMY.md) for current behavior and remaining simulation limits; older prototype notes below describe the preceding integration.

15 purchasable homes: Mainland Terrace and 13 Alimosho residences at ₦5 million each; Lagoon View at ₦10 million. All have labelled off-road home bays. Original buildings and traffic roads are retained. The new Alimosho courts replace grass only.

Housing phone app: Available homes and My houses, outright/mortgage purchase, move into vacant owned homes, return to the starter room, list/unlist vacant homes at a positive whole-naira weekly price, and rent another online player's listing. Existing tenants keep their agreed price. Online ownership and occupancy are allocated transactionally in Backender; competing purchases/rentals cannot take the same home. Purchases add to the portfolio; Move in selects the active home. Starter room reservations are retained as a return destination.

Owner bills start seven game days after purchase: ₦30,000 NEPA plus ₦15,000 waste per owned home, including rented-out homes. No property tax. Bills draw from carried cash; unpaid amounts remain owed. Mortgages can draw cash and savings. Rent goes to the owning player's receipt ledger, even if that owner is offline. Rental renewals follow the tenant's advancing game days. Public online accounts still use the existing prototype client-reported economy; this is not a hardened authoritative economy.

Sleep rolls once per game week: Sango Otta starter rooms 15%, ordinary owned/rented larger homes 5%, Lagoon View 0%. On a successful roll 10–75% of carried cash is stolen; savings are excluded. Only home sleep triggers the roll. The previous daily cash/car-part theft has been removed. Mainland-style homes recover energy 10% faster, Lagoon View 20%.

Existing owned homes are imported once. If legacy accounts claim the same formerly non-exclusive house, the first imported owner retains it; later duplicate owners receive their property value minus outstanding mortgage as an equity refund. New shared tenancies require online players; the old simulated NPC rental income is replaced by actual tenant payments. Offline games retain buying, listing, moving, bills, mortgages and robbery; there are no other players to accept offline listings.

Client saves include offline housing state and receipt/message watermarks. Online state lives in Backender. Account deletion releases houses and tenancies. Restart Backender and the game server after updating. Parking export: data-catalog/housing-parking.json. Wealth catalogues updated. No tests, builds or game/browser launches were run.
