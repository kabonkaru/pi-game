# π Pi Game

An 8-bit pi typing game that runs in the browser. Type as many digits of pi as you can, chase speed and combo bonuses, earn **Pi Coins**, and unlock new themes with their own chiptune soundtracks. It has parallax stars, pixel-perfect juice, and a calculator-style keypad that works with touch, mouse and keyboard.

No build step, no dependencies, no audio files: it is plain HTML + CSS + JavaScript, and every sound is synthesised live with the Web Audio API.

## Play it

**Quickest:** double-click `index.html`.

**Better (a tiny local server):**

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

**GitHub Pages:** push the project, then *Settings → Pages → Deploy from a branch → `main` / `(root)`*. Everything uses relative paths, so it works from a sub-path such as `https://you.github.io/pi-game/`.

> Browsers only allow sound after a first tap or key press, so the music starts the moment you interact with the page.
> After deploying an update, hard-refresh (Ctrl+Shift+R) so the browser doesn't serve cached files.

## Modes

| Mode | Rules |
| --- | --- |
| **Zen** (Sudden Death) | A 10.0-second clock starts after `3.14`. **Every correct digit fully resets it to 10.0s.** A wrong key, or the clock reaching 0.0s, ends the run instantly. |
| **Timer** (3-Min Run) | A 3:00 clock counts down in real time. It starts on the first digit after `3.14` and can never go above 3:00. Each correct digit **adds time based on how fast you typed it** (table below). It ends when the clock hits 0:00. A wrong digit turns **red** and doesn't score; press `DEL` to fix it (a wrong key also resets your combo). |
| **Chaos** (Lives & Modifiers) | *Locked, coming soon:* random visual glitches, inverted controls, fading digits and extra lives. |
| **The Pi** | A reference page with pi up to 1000 digits. Tap or click the big **π logo** on the main menu to open it. |

`3.14` is a free warm-up and is never scored.

**Timer-mode time bonus** (gap since your previous key):

| Gap | Tier | Time added |
| --- | --- | --- |
| under 0.25s | S | +0.40s |
| 0.25s – 0.50s | A | +0.20s |
| 0.50s – 1.00s | B | +0.05s |
| over 1.00s | slow | +0.00s |

A **+0.40s** style popup appears under the clock whenever time is added. Deleting a digit and retyping it earns neither points nor time.

## Scoring

Every correct digit is worth `round(100 × speed multiplier × combo multiplier)`.

| Speed tier (time since your previous key) | Multiplier |
| --- | --- |
| **S**: under 0.20s | 1.5× |
| **A**: 0.20s – 0.45s | 1.2× |
| **B**: over 0.45s | 1.0× |

| Combo (correct digits in a row) | Multiplier |
| --- | --- |
| 1 – 10 | 1.0× |
| 11 – 25 | 1.5× |
| 26 – 50 | 2.0× |
| 51 – 100 | 3.0× |
| 101+ | 5.0× |

- The combo resets on a wrong key, or after **8 seconds** without a correct digit.
- **Length bonus:** every digit you reach adds **+500** to the final score, so long runs beat short bursts.
- **Final score = keystroke points + (digits × 500).** The result screen shows the breakdown, your max combo and your high score.
- Deleting a digit and retyping it earns nothing, so there is no way to farm points.
- The speed multiplier tiers for **score** (0.20s / 0.45s) are separate from the time-bonus tiers for the **Timer clock** (0.25s / 0.50s / 1.00s).

### Game Over tips

The results screen shows a random tip or fact picked by how many digits you reached (0-9, 10-30, 31-50, 51+). They live in the `FEEDBACK` list in `js/app.js`. The facts were checked: NASA's JPL uses 15 decimal places of pi for interplanetary navigation; Indiana's House passed a 1897 bill that would have set pi to about 3.2 and the Senate shelved it; and the Guinness record is 70,000 digits recited blindfolded in nearly 10 hours.

Each mode has its own **top 10** leaderboard (name up to 12 characters, score, date as `MMM-DD-YYYY`), saved in your browser's `localStorage`.

## Pi Coins and the Shop

**Pi Coin** is the in-game currency. Hover (or tap) the coin in the top bar to read its description.

- You earn Pi Coins at the end of every run. Currently **1% of your final score** (a placeholder rule you can tune with `COINS_PER_SCORE`).
- You spend them in the **Shop** (the rainbow-outlined chest icon in the top bar). A pull costs **100 Pi Coins**; you can do **x1, x5 or x10**.
- A **duplicate** refunds **50 Pi Coins**. About 1 in 100 duplicates plays a "fake-out" upgrade animation before falling back to the normal refund.
- Each pull plays a chest-opening sequence: tension, explosion, reveal. **Skip** is always available, and your coins and items are saved *before* it starts.
- **Drop rates** and your **Collection** are one tap away inside the Shop.
- Coins and your collection are saved in your browser's `localStorage` (this is a client-side game, so they are not tamper-proof).

### Banners

| Banner | Contents | Status |
| --- | --- | --- |
| **Cosmic Beginnings** | 5 Common plain colours, Epic Deep Space, Legendary Dreamy Day, Mythic Phosphor, Godly Singularity | live |
| **Hapi Halloween** | Mythic Hapi Halloween | locked, coming soon |

Rates: Common 62% (12.4% each), Epic 24%, Legendary 9%, Mythic 4%, Godly 1%. See [`docs/GACHA_BLUEPRINT.md`](docs/GACHA_BLUEPRINT.md) for the full design and what is still open.

### Themes

Every theme has its own fonts, UI shape and music, and the bigger ones have an animated pixel-art world.

| Theme | Rarity | World and look | Music |
| --- | --- | --- | --- |
| **Midnight** / **Daylight** | default (free) | plain dark / light gradient, follows your OS setting | Chill |
| **Ruby, Ocean, Mint, Grape, Sunny** | Common | plain colour gradients (each is one hue) | Chill |
| **Deep Space** | Epic | stars, a ringed planet, a moon and shooting stars | Deep Space |
| **Dreamy Day** | Legendary | pixel sun, drifting clouds, layered hills with flowers, a hot-air balloon and birds; soft rounded UI | Dreamy Day |
| **Phosphor** | Mythic | handheld console: four shades of green, LCD pixel grid, a side-scrolling world with a π runner | Phosphor |
| **Hapi Halloween** | Mythic (event) | giant moon, ghosts, bats, a haunted house, pumpkins, cobwebs; gothic titles | Haunted Waltz |
| **Singularity** | Godly | a **black hole that reacts to your typing**: the disk flares on every digit, spins faster and burns hotter as your combo climbs, and a wrong key sends a red shockwave | Event Horizon |

**Existing players keep everything:** themes they already bought, plus Deep Space and Dreamy Day (they used to be free defaults).

## Controls

- Tap/click the on-screen keypad, or type `0-9` and `.` (numpad works too)
- `Backspace` = DEL, `Esc` = back to the menu

## Settings (gear icon)

- **General tab:**
  - **Themes**: opens its own window with a card for every theme (swatch, rarity, lock). Tap an owned theme to wear it. Tapping a locked one takes you to the Shop.
  - **Audio & BGM**: opens its own window with the music mute toggle and volume, the background-track list (*Auto* follows your theme, *None* is silent, or any track you own; a track unlocks with the theme that bundles it, and Chill is always available) and the sound-effects toggle and volume.
  - **Screen shake**: a small wobble of the *page content* (never the browser window). It starts **off** automatically if your OS asks for reduced motion.
  - Reset scores (your Pi Coins and unlocks are kept).
- **About Us tab:** what the game is, a privacy note, credits, and the version. Fill in `ABOUT.developer` and `ABOUT.repo` in `CONFIG` (`js/app.js`) to show a "Made by" line and a source-code link.

Windows never touch the screen edges, hide the native scrollbar, and fade at the top or bottom edge when there is more to scroll. `Esc` closes only the top-most window.

## Project layout

```
index.html        page + all screens
css/style.css     themes (CSS variables), layout, shine effect, responsive rules
js/pi.js          pi digits (computed with BigInt) + pure game rules   (unit-testable)
js/score.js       scoring, combo and survival clock                   (unit-testable)
js/gacha-data.js  data only: shop items, banners, drop rates, costs
js/gacha.js       pure pull logic: rolls, duplicates, refunds, fake-out  (unit-testable)
js/store.js       settings, leaderboards and Pi Coin wallet (localStorage)
js/audio.js       Web Audio synth: SFX + three generative BGM tracks
js/fx.js          pixel icons, Deep Space parallax, the pixel-art theme scenes (incl. the reactive Singularity), particles, shine/tilt, shake
js/shop.js        the Shop screen, drop rates, collection and the chest-opening sequence
js/app.js         screens, game loop, input, results, theme shop, settings
favicon.svg
docs/GACHA_BLUEPRINT.md   how the Gacha & Shop works, decisions and open questions
```

`js/` scripts load in the order `pi → score → gacha-data → gacha → store → audio → fx → shop → app` (see the bottom of `index.html`).

## Customising

- **Scoring and clocks** (base points, speed and combo tiers, decay window, Zen's `ZEN_MS`, Timer's `TIMER_MS` cap and the `TIME_ADD` bonus table, length bonus): the `SCORING` block at the top of `js/score.js`.
- **Game constants** (Timer length, shake strength, coins per score): `CONFIG` at the top of `js/app.js`.
- **Shop numbers** (pull cost, x1/x5/x10, refund, fake-out chance, drop rates, banners, items): `js/gacha-data.js`. **Themes:** the `THEMES` list in `js/app.js`.
- **Add a theme:**
  1. Add a `:root[data-theme="..."]` block in `css/style.css` (a plain colour needs only `--h` and `--s`; see the token list in the blueprint) and a `.sw-...` swatch.
  2. Add it to `THEMES` in `js/app.js`, and to `ITEMS` and a banner `pool` in `js/gacha-data.js`.
  3. Optionally add a scene to `SCENES` in `js/fx.js` and a track to `TRACKS` in `js/audio.js`.
- **Change the music:** each track has its tempo and echo in `TRACKS` in `js/audio.js`, and its own chord progressions and patterns just above the `Audio8` class.
- **Fonts:** loaded from Google Fonts (all OFL licensed): *Press Start 2P* and *VT323* (Deep Space), *Pixelify Sans* (Dreamy Day), *Silkscreen* (Phosphor) and *Jacquard 12* (Hapi Halloween). If a font looks too big or small, tune that theme's `--pf` / `--tf` / `--df` multipliers. To work offline, download the font files, add `@font-face` rules to `css/style.css`, and remove the Google Fonts `<link>` tags in `index.html`.

## Saved data (localStorage keys)

| Key | Holds |
| --- | --- |
| `pigame.settings.v1` | music/sfx/shake switches, volumes, theme, music track |
| `pigame.scores.v2` | the two top-10 leaderboards (v1.1 reset the boards because the scoring changed; old `pigame.scores.v1` data is left untouched) |
| `pigame.wallet.v1` | Pi Coin balance, your collection (`inv`: theme id to count) and pull count, written in one go so a pull is atomic |

## Testing the rules in Node

`js/pi.js` and `js/score.js` have no DOM dependency:

```js
const { computePi, PiEngine } = require('./js/pi.js');
const game = new PiEngine('zen', computePi(1000));
[...'3.14159'].forEach((c) => game.press(c));
console.log(game.score); // 3

const { ScoreKeeper } = require('./js/score.js');
const k = new ScoreKeeper({ mode: 'zen' });
k.start(0);                // you typed the 4 of 3.14 at t = 0 ms
k.onCorrect(150, 1);       // first digit 150 ms later: S tier, 1.5x
console.log(k.totalScore); // 150 + 1 * 500 = 650
```

## Changelog

- **v1.5**: the **Gacha & Shop**: rainbow shop icon, Cosmic Beginnings banner (x1/x5/x10 pulls, duplicate refunds, fake-out), drop rates and collection windows, a chest-opening sequence with shop music. New themes: plain Midnight/Daylight defaults, five Common colours and the Godly **Singularity** (a black hole that reacts to your typing). New Chill, Shop and Event Horizon tracks. Direct theme buying is replaced by pulls; existing players keep everything. Hapi Halloween moves to a locked event banner.
- **v1.4.1**: hotfix. Settings is now a short menu with a **Themes** window, an **Audio & BGM** window and an **About Us** tab (the dropdowns are gone). Fixed scrollbars flashing in during screen shake. Settings windows no longer reach the screen edges and use a soft scroll fade instead of a scrollbar. Added inert scaffolding and a [blueprint](docs/GACHA_BLUEPRINT.md) for the Gacha & Shop update.
- **v1.4**: new clock rules (Zen resets to 10.0s on every correct digit; Timer is a 3:00 bank with speed-based time bonuses, capped at 3:00), Game Over tips and facts, a locked Chaos mode teaser, The Pi opens from the π logo, header theme toggle removed, Settings rebuilt with theme and track dropdowns and volume sliders.
- **v1.3**: themes rebuilt with their own pixel-art scenes, fonts and UI (Dreamy Day, a handheld-style Phosphor), new locked **Hapi Halloween** theme (9,420 coins) with the Haunted Waltz music.
- **v1.2**: Pi Coins and wallet, locked **Phosphor** theme (3,140 coins) with confirmation, a unique BGM per theme, a music track selector, new Dreamy Day music.
- **v1.1**: new scoring system (speed tiers, combos, length bonus), 10-second survival clock for Zen, score breakdown on the results screen.
- **v1.0**: Timer, Zen and The Pi modes, top-10 leaderboards, Deep Space and Dreamy Day themes, generative music.

## Ideas for next

- The Hapi Halloween event banner, a pity counter, more themes for the pool (see [`docs/GACHA_BLUEPRINT.md`](docs/GACHA_BLUEPRINT.md))
- Chaos mode (glitches, inverted controls, fading digits, extra lives)
- Install as a phone app (add a web app manifest + service worker for PWA)
- More themes to buy with Pi Coins, seasonal events, daily challenge, sharing your score as an image
