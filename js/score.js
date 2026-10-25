/* ==========================================================================
   score.js  -  v1.1 scoring + survival clock (pure logic, no DOM, no timers)
   Every method takes `now` (ms, performance.now()) so it is Node-testable.
   ========================================================================== */
(function (root) {
  'use strict';

  const SCORING = {
    BASE: 100,
    SPEED: [                       // delta between key presses, in ms
      { max: 200, mult: 1.5, tier: 'S' },
      { max: 450, mult: 1.2, tier: 'A' },
      { max: Infinity, mult: 1.0, tier: 'B' },
    ],
    COMBO: [                       // combo = digits in the current streak
      { upTo: 10, mult: 1.0 }, { upTo: 25, mult: 1.5 }, { upTo: 50, mult: 2.0 },
      { upTo: 100, mult: 3.0 }, { upTo: Infinity, mult: 5.0 },
    ],
    COMBO_DECAY_MS: 8000,          // no correct digit for 8 s -> combo resets
    ZEN_MS: 10000,                 // Zen: every correct digit FULLY resets the clock to this
    TIMER_MS: 180000,              // Timer mode: 3:00 bank, hard cap (time never exceeds this)
    TIME_ADD: [                    // Timer mode: time added per correct digit, by gap since your last key
      { max: 250, ms: 400, tier: 'S' },       // < 0.25s
      { max: 500, ms: 200, tier: 'A' },       // 0.25s - 0.50s
      { max: 1000, ms: 50, tier: 'B' },       // 0.50s - 1.00s
      { max: Infinity, ms: 0, tier: '-' },    // slower than 1.00s
    ],
    LENGTH_BONUS: 500,             // per digit, added to the final score
  };

  const speedOf = (dt) => SCORING.SPEED.find((t) => dt < t.max);        // < 0.20 s = S, < 0.45 s = A, else B
  const comboOf = (n) => SCORING.COMBO.find((t) => n <= t.upTo);        // 1-10, 11-25, ...
  const timeAddOf = (dt) => SCORING.TIME_ADD.find((t) => dt <= t.max && (dt < t.max || t.max === 1000)) || SCORING.TIME_ADD[3];

  class ScoreKeeper {
    constructor(opts) {
      this.mode = opts && opts.mode === 'timer' ? 'timer' : 'zen';
      this.maxMs = this.mode === 'timer' ? SCORING.TIMER_MS : SCORING.ZEN_MS;
      this.strokeScore = 0;        // sum of keystroke points
      this.totalDigits = 0;        // scored digits (high-water mark, so DEL + retype can't farm points)
      this.currentCombo = 0;
      this.maxCombo = 0;
      this.speedTier = '-';
      this.lastKeyAt = null;       // any accepted key (speed baseline)
      this.lastCorrectAt = 0;      // last newly-scored digit (combo decay)
      this.deadline = 0;           // clock end time (0 = not started yet)
    }

    get lengthBonus() { return this.totalDigits * SCORING.LENGTH_BONUS; }
    get totalScore() { return this.strokeScore + this.lengthBonus; }

    /** the final "4" of 3.14 was pressed: speed baseline + (Zen) the 10s clock starts */
    start(now) {
      this.lastKeyAt = now;
      if (this.mode === 'zen') this.deadline = now + SCORING.ZEN_MS;
    }
    /** Timer mode: the clock starts on the first digit after 3.14 */
    beginTimer(now) {
      if (this.mode === 'timer' && !this.deadline) this.deadline = now + SCORING.TIMER_MS;
    }
    touch(now) { this.lastKeyAt = now; }          // DEL etc.: moves the speed baseline

    /** ms left on the clock (the full bank before it starts) */
    left(now) { return this.deadline ? this.deadline - now : this.maxMs; }
    expired(now) { return this.deadline > 0 && this.left(now) <= 0; }

    /** returns true if the combo just decayed (so the UI can refresh) */
    decay(now) {
      if (this.currentCombo > 0 && now - this.lastCorrectAt > SCORING.COMBO_DECAY_MS) {
        this.currentCombo = 0; this.speedTier = '-';
        return true;
      }
      return false;
    }

    /** `digitNo` = engine.score after the press (how many scored digits are on screen) */
    onCorrect(now, digitNo) {
      const dt = this.lastKeyAt === null ? Infinity : now - this.lastKeyAt;
      this.lastKeyAt = now;
      if (digitNo <= this.totalDigits) return { isNew: false, points: 0 };   // retyped after DEL
      this.decay(now);
      this.currentCombo++;
      this.maxCombo = Math.max(this.maxCombo, this.currentCombo);
      const sp = speedOf(dt);
      const cb = comboOf(this.currentCombo);
      const points = Math.round(SCORING.BASE * sp.mult * cb.mult);
      this.strokeScore += points;
      this.totalDigits = digitNo;
      this.lastCorrectAt = now;
      this.speedTier = sp.tier;
      let timeAdded = 0;                                     // ms actually added to the Timer-mode clock
      if (this.deadline) {
        if (this.mode === 'zen') {
          this.deadline = now + SCORING.ZEN_MS;              // Zen: full reset to 10.0s, never incremental
        } else {
          const before = this.deadline;
          this.deadline = Math.min(now + SCORING.TIMER_MS, before + timeAddOf(dt).ms);   // capped at 3:00
          timeAdded = this.deadline - before;
        }
      }
      return { isNew: true, points, tier: sp.tier, speedMult: sp.mult, comboMult: cb.mult, timeAdded };
    }

    onWrong(now) { this.lastKeyAt = now; this.currentCombo = 0; this.speedTier = '-'; }

    summary() {
      return { strokeScore: this.strokeScore, totalDigits: this.totalDigits,
               lengthBonus: this.lengthBonus, totalScore: this.totalScore, maxCombo: this.maxCombo };
    }
  }

  const api = { SCORING, ScoreKeeper };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.PiGame = root.PiGame || {}; root.PiGame.score = api; }
})(typeof window !== 'undefined' ? window : globalThis);
