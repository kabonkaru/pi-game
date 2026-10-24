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
    SURVIVAL_MAX_MS: 10000,
    SURVIVAL_REFILL_MS: 250,       // per correct digit (try 500-1000 if runs feel too short)
    LENGTH_BONUS: 500,             // per digit, added to the final score
  };

  const speedOf = (dt) => SCORING.SPEED.find((t) => dt < t.max);        // < 0.20 s = S, < 0.45 s = A, else B
  const comboOf = (n) => SCORING.COMBO.find((t) => n <= t.upTo);        // 1-10, 11-25, ...

  class ScoreKeeper {
    constructor(opts) {
      this.survival = !!(opts && opts.survival);
      this.strokeScore = 0;        // sum of keystroke points
      this.totalDigits = 0;        // scored digits (high-water mark, so DEL + retype can't farm points)
      this.currentCombo = 0;
      this.maxCombo = 0;
      this.speedTier = '-';
      this.lastKeyAt = null;       // any accepted key (speed baseline)
      this.lastCorrectAt = 0;      // last newly-scored digit (combo decay)
      this.deadline = 0;           // survival clock (0 = not started)
    }

    get lengthBonus() { return this.totalDigits * SCORING.LENGTH_BONUS; }
    get totalScore() { return this.strokeScore + this.lengthBonus; }

    /** call on the press of the final "4" of 3.14: starts the baseline (+ survival clock) */
    start(now) {
      this.lastKeyAt = now;
      if (this.survival) this.deadline = now + SCORING.SURVIVAL_MAX_MS;
    }
    touch(now) { this.lastKeyAt = now; }          // DEL etc.: moves the speed baseline

    /** survival: ms left (always the full window when not survival) */
    left(now) { return this.survival && this.deadline ? this.deadline - now : SCORING.SURVIVAL_MAX_MS; }
    expired(now) { return this.survival && this.deadline > 0 && this.left(now) <= 0; }

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
      if (this.survival && this.deadline) {
        this.deadline = now + Math.min(SCORING.SURVIVAL_MAX_MS, this.left(now) + SCORING.SURVIVAL_REFILL_MS);
      }
      return { isNew: true, points, tier: sp.tier, speedMult: sp.mult, comboMult: cb.mult };
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
