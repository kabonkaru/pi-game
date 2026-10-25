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

## Pi Coins

**Pi Coin** is the in-game currency. Hover (or tap) the coin in the top bar to read its description.

- You earn Pi Coins at the end of every run. Currently **1% of your final score** (a placeholder rule you can tune).
- You spend them on themes. Each theme comes bundled with its own music track.
- Coins and unlocks are saved in your browser's `localStorage` (this is a client-side game, so they are not tamper-proof).

### Themes

Every theme has its own animated pixel-art world, fonts, UI shapes and music, so they are far more than colour swaps.

| Theme | World and look | Music | Price |
| --- | --- | --- | --- |
| **Deep Space** | stars, a ringed planet, a moon and shooting stars | Deep Space (slow, dreamy pads and bells) | free |
| **Dreamy Day** | pixel sun, drifting clouds, layered hills with flowers, a hot-air balloon and birds; soft rounded UI | Dreamy Day (sunny music-box melody, bouncy bass) | free |
| **Phosphor** | handheld console: four shades of green, LCD pixel grid, flat boxy UI, and a side-scrolling world where a little π runner hops over blocks | Phosphor (driving minor-key 8-bit with drums) | 3,140 Pi Coins |
| **Hapi Halloween** | giant moon, ghosts, bats, a haunted house, dead trees, tombstones, a pumpkin patch, a cobweb with a dangling spider; gothic titles | Haunted Waltz (spooky 3/4 music box, organ drone, bell tolls) | 9,420 Pi Coins |

Unlocking a locked theme asks for confirmation first, and shows your balance and how many coins you are short.

### Developer cheat

For testing, **tapping the logo 10 times in a row** (from the menu) gives **+100 Pi Coins**. It is controlled by `DEV_LOGO_COINS` in `CONFIG` at the top of `js/app.js`. **Set it to `false` before a public release.**

## Controls

- Tap/click the on-screen keypad, or type `0-9` and `.` (numpad works too)
- `Backspace` = DEL, `Esc` = back to the menu

## Settings (gear icon)

- **Theme:** a dropdown of every theme. Locked themes show their price; choosing one opens the purchase confirmation. The swatch next to it previews your current theme.
- **Music:** an on/off (mute) toggle, a **background track** dropdown (*Auto* follows your theme, *None* is silent, or pick any track you own) and a volume slider.
- **Sound FX:** an on/off (mute) toggle and a volume slider.
- **Screen shake:** a small wobble of the *page content* (never the browser window). It starts **off** automatically if your OS asks for reduced motion.
- Reset scores (your Pi Coins and unlocks are kept).

## Project layout

```
index.html        page + all screens
css/style.css     themes (CSS variables), layout, shine effect, responsive rules
js/pi.js          pi digits (computed with BigInt) + pure game rules   (unit-testable)
js/score.js       scoring, combo and survival clock                   (unit-testable)
js/store.js       settings, leaderboards and Pi Coin wallet (localStorage)
js/audio.js       Web Audio synth: SFX + three generative BGM tracks
js/fx.js          pixel icons, Deep Space parallax, the pixel-art theme scenes, particles, shine/tilt, shake
js/app.js         screens, game loop, input, results, theme shop, settings
favicon.svg
```

`js/` scripts load in the order `pi → score → store → audio → fx → app` (see the bottom of `index.html`).

## Customising

- **Scoring and clocks** (base points, speed and combo tiers, decay window, Zen's `ZEN_MS`, Timer's `TIMER_MS` cap and the `TIME_ADD` bonus table, length bonus): the `SCORING` block at the top of `js/score.js`.
- **Game constants** (Timer length, shake strength, coins per score, dev cheat): `CONFIG` at the top of `js/app.js`.
- **Themes and prices:** the `THEMES` list in `js/app.js`.
- **Add a theme:**
  1. Copy a `:root[data-theme="..."]` block in `css/style.css`, rename it and set the colours and fonts (`--font-pixel`, `--font-body`, `--font-display`, and the size multipliers `--pf`, `--tf`, `--df`).
  2. Add a scene to `SCENES` in `js/fx.js` (an `init` that builds sprites/positions and a `draw` that paints one frame in big pixels). Deep Space is the only theme that doesn't use one.
  3. Add an entry to `THEMES` in `js/app.js` (id, name, price, swatch class, music track, top-bar icon, tagline) and a matching `.sw-...` swatch gradient in `css/style.css`.
  4. Optionally add a track to `TRACKS` in `js/audio.js` with its own step function.
- **Change the music:** each track has its tempo and echo in `TRACKS` in `js/audio.js`, and its own chord progressions and patterns just above the `Audio8` class.
- **Fonts:** loaded from Google Fonts (all OFL licensed): *Press Start 2P* and *VT323* (Deep Space), *Pixelify Sans* (Dreamy Day), *Silkscreen* (Phosphor) and *Jacquard 12* (Hapi Halloween). If a font looks too big or small, tune that theme's `--pf` / `--tf` / `--df` multipliers. To work offline, download the font files, add `@font-face` rules to `css/style.css`, and remove the Google Fonts `<link>` tags in `index.html`.

## Saved data (localStorage keys)

| Key | Holds |
| --- | --- |
| `pigame.settings.v1` | music/sfx/shake switches, volumes, theme, music track |
| `pigame.scores.v2` | the two top-10 leaderboards (v1.1 reset the boards because the scoring changed; old `pigame.scores.v1` data is left untouched) |
| `pigame.wallet.v1` | Pi Coin balance and unlocked themes |

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

- **v1.4**: new clock rules (Zen resets to 10.0s on every correct digit; Timer is a 3:00 bank with speed-based time bonuses, capped at 3:00), Game Over tips and facts, a locked Chaos mode teaser, The Pi opens from the π logo, header theme toggle removed, Settings rebuilt with theme and track dropdowns and volume sliders.
- **v1.3**: themes rebuilt with their own pixel-art scenes, fonts and UI (Dreamy Day, a handheld-style Phosphor), new locked **Hapi Halloween** theme (9,420 coins) with the Haunted Waltz music.
- **v1.2**: Pi Coins and wallet, locked **Phosphor** theme (3,140 coins) with confirmation, a unique BGM per theme, a music track selector, new Dreamy Day music.
- **v1.1**: new scoring system (speed tiers, combos, length bonus), 10-second survival clock for Zen, score breakdown on the results screen.
- **v1.0**: Timer, Zen and The Pi modes, top-10 leaderboards, Deep Space and Dreamy Day themes, generative music.

## Ideas for next

- Chaos mode (glitches, inverted controls, fading digits, extra lives)
- Install as a phone app (add a web app manifest + service worker for PWA)
- More themes to buy with Pi Coins, seasonal events, daily challenge, sharing your score as an image
