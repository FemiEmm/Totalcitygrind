# Starting Residential — four-room-row capacity audit

## Result

- Horizontal 4×2 lots only: maximum **3 blocks, 12 rooms, 12 parking spaces**.
- Allow the same asset and parking layout to rotate 90 degrees: maximum **5 blocks, 20 rooms, 20 parking spaces**.
- The existing First Step Flat and Mainland Terrace remain, with their two existing home-parking zones. Including those gives **22 player homes/parking zones** in the mixed-layout proposal. This is not a count of remaining decorative houses.

## Assumptions

The district is 32×18 tiles. One tile is 120 world units. A block occupies 8 tiles: four one-tile rooms and four one-tile parking spaces. Decorative residential buildings may be removed. All existing roads (including perimeter roads and dirt tracks), landmark lots, named homes, parking/service zones, bus stops, pumps, traffic-light pads, barriers and the tow bay at (9,9) are preserved. No land from adjacent districts is used.

Each parking space must have direct access to a full-width existing road tile along the frontage. Highway and dirt-road frontage are not accepted as residential driveway access. No extra access aisle is assumed inside the 8-tile footprint: cars enter/back out directly onto the existing street.

## Non-overlapping proposal

Coordinates identify each lot's top-left grid tile (zero-based).

| Site | Column,row | Footprint | Parking faces | Access road | Rooms/spaces |
|---|---|---|---|---|---|
| A | 7, 5 | 4 × 2 | south | community-avenue | 4 |
| B | 27, 5 | 4 × 2 | south | community-avenue | 4 |
| C | 4, 11 | 4 × 2 | north | west-loop-north | 4 |
| D | 11, 9 | 2 × 4 | east | middle-loop-north, middle-loop-west | 4 |
| E | 21, 10 | 2 × 4 | west | middle-loop-north, middle-loop-east | 4 |

See starting-residential-parking-plan.svg for the layout. The JSON companion includes alternative candidates and affected decorative building IDs.

## Method and limits

Enumerated all integer-grid 4×2 and 2×4 rectangles inside the district, excluded overlap with preserved geometry, then selected an exact maximum non-overlapping subset. There are 5 possible horizontal placements and 17 total placements including rotated candidates; alternatives overlap, so they cannot all be built together. The best footprint-only arrangement also contains 5 blocks, so relaxing frontage alone does not increase the total under these reservations.

The final road map is used, not just the district's local road list. Generated residential building counts are not used as a proxy for available rectangular land.

This is a geometry/planning audit. Vehicle turning, reversing, visibility, traffic behavior and artwork placement have not been play-tested. Demolition may remove an entire decorative building whose lot extends beyond one proposed footprint; room and parking construction must still stay inside the proposed lots. More capacity requires changing the footprint, moving preserved facilities, or revising roads—not merely deleting more decorative houses.

No game code or map changed. No game tests run.
