# Total City Grind

Map, stops, routes, named places and housing: [Game world reference](docs/GAME_WORLD_REFERENCE.md).

A single-player Lagos city-life and driving game built with Vue, Vite, and Electron.

## Development

```sh
npm install
npm run dev
```

## Builds

```sh
npm run build
npm run desktop:build
```

The Windows installer is written to `desktop-release`.

Gameplay is landscape only. Phones get multitouch steering and pedals, engine,
horn, and manual gear buttons. Rotating to portrait pauses gameplay; rotate back
and tap Resume. Fullscreen is available only through the manual Settings control.

This release starts a new save generation, including inventory and tour progress.
Old saves are not imported or recovered. New progress can still be saved in three
slots. Clearing a slot no longer creates hidden recovery backups.

Phones default to performance rendering (1x canvas pixel ratio), with adaptive
performance enabled. Menus do not initialize the world until a game or tour starts.

Online wallet authority and cloud migration notes: [Local server economy](docs/SERVER_ECONOMY.md).
