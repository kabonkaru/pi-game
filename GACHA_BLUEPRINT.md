# Gacha & Shop: blueprint (planned, not built yet)

**Status:** planning only. v1.4.1 adds *inert* scaffolding so the update drops in cleanly:
`js/gacha-data.js` (rarities, banners, costs), `gacha: { rarity, banner }` on each entry of `THEMES` in `js/app.js`, and the `--rarity-*` / `--shop-rainbow` CSS tokens. **Nothing in the game reads them yet, and Phosphor and Hapi Halloween stay purchasable with Pi Coins exactly as today.**

## 1. Design summary

| Topic | Decision |
| --- | --- |
| Currency | **Pi Coin**, earned by typing runs (today: 1% of the final score, see `COINS_PER_SCORE`) |
| Shop entry | A **rainbow-outlined shop icon** on the main UI (`--shop-rainbow` token) |
| Pull cost | **100 Pi Coins per pull**; x1 / x5 / x10 (500 / 1,000 total unless a bundle discount is decided) |
| Duplicates | Refund **50%** = **50 Pi Coins**. **1%** of duplicates trigger a "fake-out" upgrade animation to a higher-tier reward |
| Defaults | Deep Space and Dreamy Day stop being the defaults. New defaults are a **plain dark / plain light gradient** with a **chill default BGM** |
| Pull VFX | Inspired by Vampire Survivors chest openings: build-up tension, shop BGM, dramatic explosion and reveal |

## 2. Banners and tiers

**Standard banner: "Cosmic Beginnings"**

| Rarity | Items | Theme id (today) |
| --- | --- | --- |
| Common x5 | plain-colour themes using the default BGM | (new, names TBD) |
| Epic | Deep Space | `dark` |
| Legendary | Dreamy Day | `light` |
| Mythic | Phosphor | `terminal` |
| Godly | **Singularity**: reactive black hole / cosmic theme | (new) |

**Event banner: "Hapi Halloween"**: *LOCKED / Coming Soon*. Featured **Mythic**: Hapi Halloween (`halloween`).

## 3. Theme and music decoupling

Today a theme and its track are welded together (`THEMES[i].bgm`, with AUTO following the theme). For the shop:
- Keep `bgm` on the item as its *bundled* track, but track the two ownerships separately so a Common colour theme can use the default chill track while owning no other music.
- Add a `chill-default` track to `TRACKS` in `js/audio.js` (calm, low-intensity) and make it the fallback when an item has `bgm: null`.
- Add new plain defaults `default-dark` and `default-light` to `THEMES` (CSS only, no scene; use the existing token set below).

## 4. State (localStorage)

| Key | Today | Planned |
| --- | --- | --- |
| `pigame.settings.v1` | theme, bgm, volumes, switches | unchanged |
| `pigame.scores.v2` | leaderboards | unchanged |
| `pigame.wallet.v1` | `{ coins, owned: [themeId] }` | keep; map `terminal` -> `phosphor`, `halloween` -> `hapi-halloween` on migration |
| `pigame.gacha.v1` | n/a | **new:** `{ inventory: { itemId: count }, pulls: n, history: [last 50 pulls], seenIntro: bool }` |

Rules for the migration: never delete or reduce anything a player already owns, and bump keys (`.v2`) instead of reshaping old ones.

## 5. CSS token contract

A theme is a `:root[data-theme="id"]` block in `css/style.css`. To be valid it defines **all** of these (see the Deep Space block for values):

- Background: `--bg-a --bg-b --bg-c`, `--grid`, `--star1..3`, `--blob1..3`
- Text and lines: `--text --muted --line --line-strong`
- Surfaces: `--surface --surface-2 --surface-solid --shadow --shadow-solid --glow`
- Keys and buttons: `--key --key-hi --key-shadow --key-text --fn --fn-shadow --fn-text --btn-bg --btn-shadow --btn-text --on-accent`
- Mode cards: `--c-timer-a/b/s --c-zen-a/b/s --c-guide-a/b/s`
- Status: `--silver --good --bad --gold --gold-bg`
- LCD: `--lcd-bg --lcd-text --lcd-dim --lcd-bad --lcd-glow`
- Brand: `--pi-1 --pi-2 --pi-3`, `--sk-a --sk-b`
- Typography: `--font-pixel --font-body --font-display` and size multipliers `--pf --tf --df`

Reserved for the shop (already defined in `:root`): `--rarity-common`, `--rarity-epic`, `--rarity-legendary`, `--rarity-mythic`, `--rarity-godly` (a gradient), `--shop-rainbow` (a conic gradient for the icon outline).

A theme may also register a pixel-art scene in `SCENES` (`js/fx.js`). Plain Common themes should not.

## 6. Pull sequence (VFX and audio plan)

1. **Idle:** a chest or capsule on a dim stage, with a new `shop` BGM track.
2. **Build-up (about 2s):** the chest shakes harder, the rim glow cycles colours, rising tick sounds and a drum roll.
3. **Tease:** the glow settles on the rarity colour (Common grey, Epic purple, Legendary gold, Mythic red). Godly: the screen darkens and warps toward a black hole.
4. **Explosion:** white flash, particle burst in the rarity colour, big bass hit and a rarity-specific stinger.
5. **Reveal:** the item card stamps in with its rarity banner, then a "WEAR IT" button.
6. **x5 / x10:** cards reveal one after another (faster), then a summary grid. A **Skip** button is always available.
7. **Duplicate:** the card shatters into "+50 Pi Coins". With a 1% chance it plays the fake-out: an upgrade animation toward a higher rarity.

Honour `prefers-reduced-motion` (shorter, no screen shake) and the existing shake and SFX settings.

## 7. Open questions (need your decision before building)

1. **Drop rates** per rarity, and whether there is a **pity** counter. (`BANNERS.*.rates` is `null` until decided.)
2. Is the 1% **fake-out** only a prank (the upgrade animation, then it falls back to the normal duplicate refund) or a real upgrade to a higher-tier item?
3. Do x5 / x10 pulls get a **discount**, or is it exactly 100 per pull?
4. What happens to players who **already bought** Phosphor or Halloween with coins: they keep them (recommended)? Are Deep Space and Dreamy Day granted to everyone who has been using them?
5. Are the 5 Common plain colours a fixed list? (names and hues)
6. How does **Singularity** react: to typing speed, combo, score? (design and performance budget)
7. When does the **Halloween event banner** unlock (a date, or a version)?
8. Earn rate: today ~65 coins for a typical 6,500-point run, so about one pull per 1.5 runs. Is that the intended pace?
9. If Pi Coins are ever sold for real money, loot-box rules apply in some regions. As long as coins are earned by play only, this plan avoids that.

## 8. Suggested build order

1. Pure logic `js/gacha.js` (RNG, duplicate refund, fake-out roll) with Node unit tests.
2. `pigame.gacha.v1` store plus migration of `wallet.owned`.
3. Plain default themes and the `chill-default` track; move Deep Space / Dreamy Day into the pool.
4. Shop screen and the rainbow shop icon.
5. Pull sequence VFX and audio.
6. Singularity theme and the event banner.
