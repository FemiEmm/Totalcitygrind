# Police hotspots

Six fixed police pickups watch these mainland tiles:

| Parked tile | Watched tile |
| --- | --- |
| X2 Y20 | X2 Y19 |
| X22 Y15 | X22 Y16 |
| X36 Y10 | X35 Y10 |
| X57 Y28 | X58 Y28 |
| X23 Y26 | X24 Y26 |
| X44 Y9 | X45 Y9 |

The hidden score increases once per existing red-light crossing (+1), vehicle collision incident (+2), or accepted illegal street race start (+5). Legal circuit races do not add crime. Mainland remote-player collisions and parked police cars use vehicle collision handling. Decorative obstacles do not count as other cars.

Entering a watched tile with score >= 50 arrests the player. Only the player's car stops; traffic continues. The bribe costs score × ₦100 and requires enough cash. Paying clears the score. Choosing the station fades to black, moves the car into an available police bay, and fades back to a detention countdown. All six station bays occupied means the player must retry or pay the bribe.

Detention takes 1,440 in-game minutes, approximately 24 real minutes with the current clock. It advances while gameplay is running, not while paused/backgrounded. Driving and ignition are locked. Energy drain is suspended during police custody. Normal daily economy processing still occurs. Finishing detention clears the score and releases the car where it is parked.

Crime is saved in both maps and transferred between them. Arrest decisions, transfers and release save immediately; offline detention checkpoints save each game hour. Online account saving includes this state. Backender atomically reserves police bays per account and releases the reservation when a free-state account save arrives. The game server's movement connection rejoins after station teleportation to avoid treating the transfer as ordinary driving.

Restart Backender and the game server for the new `police-bay` action. Enforcement remains part of the existing client-driven gameplay prototype, not an authoritative anti-cheat system. No tests, builds or game sessions run for this change.
