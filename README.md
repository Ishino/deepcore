# Deepcore

An incremental drilling game for the browser. Kessra's old sun is swelling and the evacuation fleet has
gone. You are the last driller at Deepcore Camp: dig through layer after layer of rock for rare minerals,
excavate buried treasure, and ship the ore to build the **Meridian**, the last ship off the planet.

**Play:** https://OWNER.github.io/deepcore/ (8-Bit edition) · [Classic edition](https://OWNER.github.io/deepcore/classic.html)

## How it plays

- **Drill and hammer.** The rig drills on its own; tap the rock to hammer it faster, but fast hammering overheats the bit.
- **Layers and barriers.** Every formation is harder than the last, and each needs a better drill bit to break into.
- **Excavate.** Scanner pings reveal buried treasure beside the bit. Dig it out to draft one of three upgrade cards for the current claim.
- **Claims and storms.** Dust storms seal each claim after 25 minutes. Sealing pays core shards for the skill tree, and you stake the next claim on one of the sites you own.
- **Claim sites.** Each site on the claim map carries ore only down to its vein floor and has its own rich minerals and quirks. Buy surveys with credits to reach deeper ores.
- **The Meridian.** Ship ore to the shipyard to build its six stages. Shipped ore and finished stages survive every claim. Launch it to win, then keep playing in endless mode.

Progress saves in the browser (localStorage). The rig keeps drilling at half speed while you are away.

## Editions

| Page | Edition | Source |
| --- | --- | --- |
| `index.html` | 8-Bit: pixel camp, RPG windows, title screen and story intro | `src/pixel/shell.html`, `src/pixel/camp.js` |
| `classic.html` | Classic: the original dashboard layout | `src/game.html` |

Both editions run the same game code. `src/game.html` holds all game logic and balance; the 8-Bit
edition is generated from it, so a balance change only has to be made once.

## Building

Requires Node.js. The site is plain static HTML with no dependencies.

```bash
node tools/build.js
```

This writes `index.html` and `classic.html` at the repository root, which GitHub Pages serves as-is.
Commit the built pages together with the source change.

## Balance bot

`tools/balance-bot.js` plays the real game code headlessly like an active player (it hammers at a safe
rate, digs every treasure, drafts cards, ships ore, and buys upgrades, surveys and skills) and prints one
line per claim with depth, site, shards and ship progress.

```bash
node tools/balance-bot.js 14
```

The current tuning targets a launch-ready Meridian after about 12 claims of active play.
