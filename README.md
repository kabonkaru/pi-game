# π Pi Game

An 8-bit pi typing game that runs in the browser. Type as many digits of pi as you can, with a space-dreamy chiptune soundtrack, parallax stars, pixel-perfect juice, and a calculator-style keypad that works with touch, mouse and keyboard.

No build step, no dependencies, no audio files: it is plain HTML + CSS + JavaScript.

## Play it

**Quickest:** double-click `index.html`.

**Better (a tiny local server):**

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

**GitHub Pages:** push the project, then *Settings → Pages → Deploy from a branch → `main` / `(root)`*. Everything uses relative paths, so it works from a sub-path such as `https://you.github.io/pi-game/`.

> Browsers only allow sound after a first tap or key press, so the music starts the moment you interact with the page.

## Modes

| Mode | Rules |
| --- | --- |
| **Timer** | 3 minutes. The clock starts on the first digit *after* `3.14`. A wrong digit turns **red** and doesn't score; press `DEL` to fix it. |
| **Zen** | No clock, but one wrong digit ends the run, and you get **10 seconds** to think of each next digit. |
| **The Pi** | A reference page with pi up to 1000 digits. |

Scoring ignores `3.14`: `3.141592653` is **7 points**. Each mode has its own **top 10** leaderboard (name up to 12 characters, score, date as `MMM-DD-YYYY`), saved in your browser's `localStorage`.

## Controls

- Tap/click the on-screen keypad, or type `0-9` and `.` (numpad works too)
- `Backspace` = DEL, `Esc` = back to the menu

## Settings (gear icon)

- **Music** (space dreamy 8-bit) and **Sound FX**, each on/off
- **Screen shake**: a small wobble of the *page content* (never the browser window). It starts **off** automatically if your OS asks for reduced motion
- **Theme**: Deep Space (dark) / Dreamy Day (light), plus 3 "coming soon" placeholders
- Reset scores

## Project layout

```
index.html        page + all screens
css/style.css     themes (CSS variables), layout, shine effect, responsive rules
js/pi.js          pi digits (computed with BigInt) + pure game rules  (unit-testable)
js/store.js       settings + leaderboards (localStorage)
js/audio.js       Web Audio synth: SFX + generative "space dreamy" BGM
js/fx.js          pixel icons, parallax background, particles, shine/tilt, shake
js/app.js         screens, game loop, input, results, settings
favicon.svg
```

## Customising

- **Game constants** (timer length, Zen think time, shake strength): `CONFIG` at the top of `js/app.js`.
- **Add a theme:** copy a `:root[data-theme="..."]` block in `css/style.css`, add a palette to `PALETTES` in `js/fx.js` (for the pixel planet), and replace one of the `.skeleton` cards in `index.html` with a `data-theme-pick="your-theme"` button.
- **Change the music:** edit `PROGRESSIONS`, `ARP_PATTERNS` and `BPM` in `js/audio.js`.
- **Fonts:** loaded from Google Fonts (*Press Start 2P* and *VT323*, both OFL licensed). To work offline, download the two font files, add `@font-face` rules to `css/style.css`, and remove the Google Fonts `<link>` tags in `index.html`.

## Testing the rules in Node

`js/pi.js` has no DOM dependency:

```js
const { computePi, PiEngine } = require('./js/pi.js');
const pi = computePi(1000);
const game = new PiEngine('zen', pi);
[...'3.14159'].forEach((c) => game.press(c));
console.log(game.score); // 3
```

## Ideas for next

- Install as a phone app (add a web app manifest + service worker for PWA)
- More themes, daily challenge, sharing your score as an image
