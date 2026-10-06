# Neighbourhood waste collection

50 persistent locations replace the two perimeter-road rows: 30 in Sango Otta (one on each side of all 15 streets), plus 5 each in Ifako-Ijaiye, Ikeja, Alimosho and Mushin.

Locations were selected from the map's building, road, barrier, parking, bus stop and traffic-light geometry. Tow yards are also excluded. No roads, houses or parking bays are moved or removed. Existing narrow gaps beside decorative houses use smaller piles (16 world pixels); open pockets use 48 pixels. Sprite sizes match the space reserved for them. Sango Otta piles sit beside the ends of house terraces, outside the parking row and access roads. Mainland positions are dispersed around existing houses. The approach calculation uses an approximately 246×86 clear truck envelope and a maximum 210-pixel collection reach.

On a LAWMA shift in the waste truck, approaching a pile shows the same RouteHud loading progress component used for passengers. Stop within reach for 1.25 simulation seconds to collect automatically. Moving resets progress. A yellow pile highlight becomes green while stopped nearby. Successful collection removes the pile and records ₦1,500 through the existing treasury wage system; unpaid wages remain owed. Failed online collection can be retried and does not hide the pile prematurely. Every removed pile respawns five in-game days (7,200 game minutes) after its removal. Until someone is employed at LAWMA, automatic cleanup visits one of the 50 locations every 144 game minutes, making a full round in five game days without awarding wages. Piles just reaching their respawn time are left for a later visit. Any LAWMA employment stops automatic cleanup, including between shifts and while that employee is offline. The last employee quitting or deleting their account resumes cleanup with a fresh interval.

New waste-v2 IDs prevent collection history from the old road locations from hiding newly placed piles. The game and Backender use identical wasteLocations.js files. Restart Backender after updating.

Map geometry was read for placement; no tests, builds, browser sessions or game launches were run.

Offline timing uses the saved game clock, including sleep. Online timing uses a persistent shared clock at one real second per game minute (five game days = two real hours), independent of individual players sleeping. Shared collection and cleanup are persisted in Backender; elapsed cleanup is caught up on career requests. Old daily collection records are replaced by the new lifecycle.
