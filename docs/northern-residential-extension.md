# Sango Otta

A seamless mainland extension north of Starting Residential, entered by driving north along Estate Spine (columns 24-25). No map transition or gate is used. Original city coordinates remain unchanged.

## Homes and access

180 additional single-room homes: W01-W90 west of the road, E01-E90 east. Each has its own labelled parking bay. There are 15 streets, each with six homes on each side. Each six-home terrace uses the four-room house asset plus a two-room crop, retaining dry mud foundations and the parking tile asset.

Two residential collector lanes connect the parking access streets to Estate Spine at the north and south ends. Parking opens into a two-tile-wide access aisle. Boundary strips leave the through-road open. No new bus stops, AI residential routes or traffic signals are added.

The new-game picker includes Sango Otta and a street selector; the original 20 starter rooms remain available. Selected northern homes use the existing rental, sleeping, parking and save mechanisms.

## Traffic and bounds

Only north-estate-gate is relocated, from row -1 to row -70. Its original north-estate-to-west-south-avenue route now travels straight down the extended spine into the existing city. Other spawn points, traffic weights and vehicle count settings remain unchanged. No route turns into the housing streets.

The northern world minimum, population staging and camera restore bounds allow negative rows. Coast City retains its original northern bound. Static map tiles already support signed coordinates and use a bounded LRU cache; the extension reuses existing artwork. No performance claim has been measured.

## Brake lights

The player Danfo's rear-light glow is moved eight world units toward the rear, in both maps. Other vehicles retain their existing lamp offsets.

## Validation

Source review only. No tests, builds, game sessions or benchmarks run, per user request.

The player-facing district name is Sango Otta. Internal home and district IDs remain unchanged to preserve saved homes and shared tenancy records. Empty ground uses complete 1×4 dry-mud strips, rotated for vertical spaces. Roads, parking, houses and boundaries are reserved before placing strips; remaining cells keep grass. Mud is rendered in the existing static terrain cache.
