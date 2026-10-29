/* ==========================================================================
   facts-data.js  -  DATA + tiny helpers: fun facts and tips (v1.6.0)
   general -> shown on the loading screen
   stats   -> Game Over: facts / cheers picked by how the run went
   tips    -> Game Over: gameplay tips
   Add entries by copying a line. Keep text <= 160 chars, plain text only (no HTML).
   Placeholders: {digits} (scored digits), {decimals} (digits + 2, because 3.14 is a free warm-up), {combo} (best streak).
   `when` (optional, all must match): digitsMin, digitsMax, mode ('zen' | 'timer'), reason ('wrong' | 'time' | 'timeout' | 'complete'), comboMin.
   `label` (optional) replaces the default tag (PI FACT / TIP). `source` = where you verified it.
   Works in the browser (window.PiGame.facts) and in Node (module.exports); see tests/factstest.js.
   ========================================================================== */
(function (root) {
  'use strict';

  const general = [
    { id: 'g001', text: 'Pi Day is March 14 (3.14). The first celebration was organized in 1988 by physicist Larry Shaw at the San Francisco Exploratorium.', source: 'https://en.wikipedia.org/wiki/Pi_Day' },
    { id: 'g002', text: "March 14 is also Albert Einstein's birthday. He was born on Pi Day in 1879, in Ulm, Germany.", source: 'https://www.yahoo.com/lifestyle/articles/deseret-news-archives-ve-celebrating-161653611.html' },
    { id: 'g003', text: 'In 1897 the Indiana House passed a bill often described as setting pi to 3.2, 67 to 0. The Senate postponed it indefinitely, so it never became law.', source: 'https://en.wikipedia.org/wiki/Indiana_pi_bill' },
    { id: 'g004', text: 'Unofficially, Akira Haraguchi recited 100,000 decimals of pi in 2005, and later topped 117,000, according to the Guardian.', source: 'https://www.livescience.com/physics-mathematics/mathematics/12-surprising-facts-about-pi-to-chew-on-this-pi-day' },
    { id: 'g005', text: 'People have known about pi for a very long time. The ancient Babylonians were aware of it nearly 4,000 years ago.', source: 'https://www.livescience.com/physics-mathematics/mathematics/12-surprising-facts-about-pi-to-chew-on-this-pi-day' },
    { id: 'g006', text: "NASA's JPL uses 15 decimals of pi (3.141592653589793) for its most accurate interplanetary navigation.", source: 'https://www.sciencealert.com/happy-pi-day-can-you-use-pi-to-solve-these-nasa-rocket-science-problems' },
  ];

  const stats = [
    { id: 's001', label: 'MATH', text: '3.14 is already within about 0.05% of the real pi. Every extra digit makes the circle sharper.', when: { digitsMax: 7 }, source: 'computed: (pi - 3.14) / pi = 0.0507%' },
    { id: 's002', label: 'MATH', text: 'With 10 decimals of pi, the circumference of the Earth is off by only about 1 millimetre.', when: { digitsMin: 8 }, source: 'computed: 12,742 km x 1e-10 = 1.27 mm' },
    { id: 's003', text: 'You reached {decimals} decimals. JPL navigates with 15. Cut pi there and a circle 25 billion miles wide is off by only about 1.5 inches.', when: { digitsMin: 13 }, source: 'https://www.sciencealert.com/happy-pi-day-can-you-use-pi-to-solve-these-nasa-rocket-science-problems' },
    { id: 's004', text: '{decimals} decimals! NASA\'s Marc Rayman says 39 or 40 are enough to measure the observable universe to within one hydrogen atom.', when: { digitsMin: 37 }, source: 'https://www.sciencealert.com/happy-pi-day-can-you-use-pi-to-solve-these-nasa-rocket-science-problems' },
    { id: 's005', text: 'The Guinness record is 70,000 decimals, recited blindfolded by Rajveer Meena in 2015 in nearly 10 hours. You made {decimals}.', when: { digitsMin: 51 }, source: 'https://guinnessworldrecords.com/world-records/most-pi-places-memorised' },
    { id: 's006', text: 'Before Meena, the record was 67,890 decimals, set by Lu Chao of China in 2005. It took about 24 hours.', when: { digitsMin: 61 }, source: 'https://www.indiatvnews.com/news/india/youth-memorises-70000-pi-digits-guinness-record-55066.html' },
    { id: 's007', label: 'DID YOU KNOW?', text: 'Most people only remember a handful of digits of Pi, like 3.14159!', when: { digitsMax: 9 } },
    { id: 's008', label: 'GREAT JOB!', text: "You've gone well beyond what most people can recite from memory.", when: { digitsMin: 10, digitsMax: 30 } },
    { id: 's009', label: 'MEMORY WALL BROKEN!', text: "You broke past the 'Memory Wall'! Very few people can recite 30+ digits of Pi.", when: { digitsMin: 31, digitsMax: 50 } },
    { id: 's010', label: 'LEGENDARY RECALL!', text: 'Memory athletes train for exactly this kind of streak.', when: { digitsMin: 51 } },
    { id: 's011', label: 'COMBO', text: 'Your best streak was {combo} digits in a row. Long streaks unlock the 3x and 5x combo bonuses.', when: { comboMin: 20 } },
  ];

  const tips = [
    { id: 't001', text: "Try chunking digits into groups of 3 or 4 in your mind (e.g., '141', '592', '653')!" },
    { id: 't002', text: 'Memory athletes often turn pairs of digits into images. Record holder Rajveer Meena reportedly prepared digit pairs to recall them fast.', source: 'https://makezine.com/article/home/fun-games/pi-day-memory-skills/' },
    { id: 't003', text: 'Zen resets the clock to 10s on every correct digit, so a steady rhythm beats a sprint.', when: { mode: 'zen' } },
    { id: 't004', text: 'In Timer, a digit typed within 0.25s adds +0.40s to the clock. Keep a steady rhythm and the clock refills.', when: { mode: 'timer' } },
    { id: 't005', text: 'One wrong key ends a Zen run. Slow down on the digits you mix up, and speed up on the ones you know.', when: { mode: 'zen', reason: 'wrong' } },
    { id: 't006', text: 'Out of time? A wrong digit resets your combo. Press DEL to fix it instead of guessing on.', when: { mode: 'timer', reason: 'time' } },
  ];

  /** does this entry apply to this run? ctx = { digits, mode, reason, combo } */
  function match(e, ctx) {
    const w = e.when || {};
    return (w.digitsMin == null || ctx.digits >= w.digitsMin) && (w.digitsMax == null || ctx.digits <= w.digitsMax) &&
      (w.mode == null || w.mode === ctx.mode) && (w.reason == null || w.reason === ctx.reason) && (w.comboMin == null || (ctx.combo || 0) >= w.comboMin);
  }

  /** random matching entry, no repeats until all matching ones were shown (`used` is a Set kept by the caller) */
  function pick(list, ctx, used, rnd) {
    const all = list.filter((e) => match(e, ctx));
    if (!all.length) return null;
    let pool = all.filter((e) => !used.has(e.id));
    if (!pool.length) { all.forEach((e) => used.delete(e.id)); pool = all; }
    const e = pool[Math.floor((rnd || Math.random)() * pool.length)];
    used.add(e.id);
    return e;
  }

  /** fill {digits} / {decimals} / {combo}; the result is only ever shown with textContent */
  function fill(text, ctx) {
    const d = ctx.digits || 0;
    return String(text).replace(/\{(digits|decimals|combo)\}/g, (m, k) => (k === 'decimals' ? d + 2 : (k === 'digits' ? d : (ctx.combo || 0))));
  }

  const api = { general, stats, tips, match, pick, fill };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.PiGame = root.PiGame || {}; root.PiGame.facts = api; }
})(typeof window !== 'undefined' ? window : globalThis);
