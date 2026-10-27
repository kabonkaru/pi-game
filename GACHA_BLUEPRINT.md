# Gacha & Shop

**Status: built in v1.5.** This file records how it works, the decisions that were made where the original plan was open, and what is still open.

## 1. How it works

| Topic | Implementation |
| --- | --- |
| Currency | **Pi Coin**, earned by typing runs (`COINS_PER_SCORE` in `js/app.js`, today 1% of the final score) |
| Shop | The **rainbow-outlined chest icon** in the header (hidden during a run) opens the Shop screen |
| Pull cost | **100 Pi Coins** per pull. **x1 / x5 / x10** cost 100 / 500 / 1,000 (no bundle discount) |
| Duplicates | Refund **50%** = **50 Pi Coins**. **1%** of duplicates play the cosmetic **fake-out** (the card seems to upgrade a tier, then falls back to the normal duplicate) |
| Defaults | New players start on plain **Midnight** (dark) or **Daylight** (light), following their OS setting, with the **Chill** track |
| Pull sequence | Chest drops in, tension build (shake, glow climbing through the rarities, accelerating ticks, music ducked), explosion (flash, particles, boom), reveal card, summary. **Skip** is always available |
| Safety | Coins and items are saved in **one write before** the animation starts, so closing the tab mid-pull never loses anything |

## 2. Banners and items

**Cosmic Beginnings** (live): 5 Common plain colours (Ruby, Ocean, Mint, Grape, Sunny) with the Chill track, **Epic** Deep Space, **Legendary** Dreamy Day, **Mythic** Phosphor, **Godly** Singularity (a black hole that reacts to your typing).

**Hapi Halloween** (event, *locked / coming soon*): Mythic Hapi Halloween. The banner tab shows a lock. To open it, set its `status` to `'live'` in `js/gacha-data.js`.

### Drop rates (`BANNERS.*.rates`)

| Rarity | Rate | Items |
| --- | --- | --- |
| Common | 62% (12.4% each) | 5 |
| Epic | 24% | 1 |
| Legendary | 9% | 1 |
| Mythic | 4% | 1 |
| Godly | 1% | 1 |

The Shop's **Drop rates** window shows these live. Completing the 9-item banner takes about **100 pulls** on average (about 10,000 Pi Coins before duplicate refunds). At about 65 Pi Coins per typical run, tune `COINS_PER_SCORE` or the rates if that feels too slow.

## 3. Decisions made (change them in one place)

1. Rates as above; **no pity** system.
2. Fake-out is **cosmetic only**.
3. **No multi-pull discount.**
4. **Returning players keep everything:** themes bought before the Shop, plus Deep Space and Dreamy Day (they were free defaults). One-time migration, never takes anything away.
5. **Direct buying is gone:** Phosphor and Hapi Halloween are no longer sold for coins. Players who already own them keep them.
6. Items are keyed by **theme id** (`dark` = Deep Space, `light` = Dreamy Day, `terminal` = Phosphor, `halloween`, `singularity`, `plain-*`).
7. **Music follows ownership:** a track is available when you own a theme that bundles it. Chill is always available. The Shop's own track is internal.

## 4. Where things live

| File | Role |
| --- | --- |
| `js/gacha-data.js` | **Data only:** rarities, items, banners, rates, `SHOP` constants. Edit this to rebalance |
| `js/gacha.js` | **Pure logic:** rolls, duplicates, refunds, fake-out, batches (unit-tested in Node) |
| `js/store.js` | The wallet: `{ coins, inv: { themeId: count }, pulls, mig }` in `pigame.wallet.v1`, with an atomic `commitPull` and the one-time migration |
| `js/shop.js` | Shop screen, drop-rates and collection windows, the chest-opening sequence |
| `js/fx.js` | Themes' scenes, including the reactive Singularity (`SCENES.singularity`, `react()`) |
| `js/audio.js` | Tracks: Chill, Shop, Event Horizon; effects `pull_*`, `fakeout_*`; `duck()` |
| `css/style.css` | Hue-based plain themes, Singularity, rarity colours (`--rarity-*`), the rainbow shop button |

### Theme token contract

A theme is a `:root[data-theme="id"]` block that defines **all** of these (see Deep Space for values):
`--bg-a/b/c`, `--grid`, `--star1..3`, `--blob1..3`, `--text --muted --line --line-strong`, `--surface --surface-2 --surface-solid --shadow --shadow-solid --glow`, `--key --key-hi --key-shadow --key-text --fn --fn-shadow --fn-text --btn-bg --btn-shadow --btn-text --on-accent`, `--c-timer-a/b/s --c-zen-a/b/s --c-guide-a/b/s`, `--silver --good --bad --gold --gold-bg`, `--lcd-bg --lcd-text --lcd-dim --lcd-bad --lcd-glow`, `--pi-1..3`, `--sk-a --sk-b`, and the fonts `--font-pixel --font-body --font-display` with multipliers `--pf --tf --df`.
**Shortcut for plain colours:** copy a `plain-*` rule, set `--h` (hue) and `--s` (saturation), and every token derives from them.

## 5. Adding a new item

1. Add a theme block in CSS (or a plain colour with `--h`/`--s`) and a `.sw-...` swatch.
2. Add it to `THEMES` in `js/app.js` and to `ITEMS` and a banner `pool` in `js/gacha-data.js`.
3. If it has a scene, add it to `SCENES` in `js/fx.js`; if it has a track, add it to `TRACKS` in `js/audio.js`.
4. Run the Node tests (`gachatest.js`) to confirm the roster and rates still sum to 100.

## 6. Dev tools

While `DEV_LOGO_COINS` is `true` in `CONFIG` (`js/app.js`): tap the logo 10 times for coins, and in the console use `__piGame.dev.coins(1000)`, `__piGame.dev.grant('singularity')`, `__piGame.dev.grantAll()`. **Set it to `false` before a public release.**

## 7. Still open

1. A **pity** counter or a guarantee on x10?
2. Should the fake-out ever be a *real* upgrade?
3. The **Halloween event** date, and whether it should be buyable again outside the event.
4. Earn rate vs. grind: is about 1.5 runs per pull right?
5. Singularity polish (jets, a lensing distortion pass) and its performance on low-end phones.
6. If Pi Coins are ever sold for real money, loot-box rules apply in some regions. While coins are earned by play only, this design avoids that.
