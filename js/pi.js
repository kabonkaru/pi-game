/* ==========================================================================
   pi.js  -  pi digits + pure game rules (no DOM, no timers)
   Works in the browser (window.PiGame.pi) and in Node (module.exports) so the
   rules can be unit-tested.
   ========================================================================== */
(function (root) {
  'use strict';

  const WARMUP = '3.14'; // not scored; Timer clock starts on the digit after it

  /**
   * Returns pi as a string "3.14159..." with exactly `decimals` decimals.
   * Machin's formula on BigInt, so the digits are computed (never typed by
   * hand) and are always correct.
   */
  function computePi(decimals) {
    const guard = 12n;
    const one = 10n ** (BigInt(decimals) + guard);
    const atanInv = (xn) => {            // arctan(1/x) scaled by `one`
      const x = BigInt(xn);
      const x2 = x * x;
      let term = one / x;
      let total = term;
      let k = 1n;
      let sign = -1n;
      while (term > 0n) {
        term /= x2;
        k += 2n;
        total += sign * (term / k);
        sign = -sign;
      }
      return total;
    };
    const pi = 4n * (4n * atanInv(5) - atanInv(239));
    const s = (pi / 10n ** guard).toString();
    return s[0] + '.' + s.slice(1);
  }

  class PiEngine {
    constructor(mode, piStr) {
      this.mode = mode;               // 'timer' | 'zen'
      this.pi = piStr;
      this.typed = '';
      this.started = false;           // Timer: has the clock started?
      this.justStarted = false;       // true only for the press that started it
      this.over = false;
      this.reason = '';               // 'time' | 'wrong' | 'timeout' | 'complete'
      this.wrongChar = '';            // Zen: the digit that ended the run
      this.expectedChar = '';
    }

    get correctLen() {
      let n = 0;
      const max = Math.min(this.typed.length, this.pi.length);
      while (n < max && this.typed[n] === this.pi[n]) n++;
      return n;
    }

    get score() {
      return Math.max(0, this.correctLen - WARMUP.length);
    }

    finish(reason) {
      if (!this.over) {
        this.over = true;
        this.reason = reason;
      }
    }

    /** -> ignore | reject | warmup_ok | warmup_done | ok | wrong | wrong_over | complete */
    press(ch) {
      this.justStarted = false;
      if (this.over || !'0123456789.'.includes(ch) || ch.length !== 1) return 'ignore';
      const n = this.typed.length;

      // warm-up: "3.14" only accepts the right key
      if (n < WARMUP.length) {
        if (ch === this.pi[n]) {
          this.typed += ch;
          return this.typed.length === WARMUP.length ? 'warmup_done' : 'warmup_ok';
        }
        return 'reject';
      }
      if (n >= this.pi.length) return 'ignore';

      if (this.mode === 'zen') {
        if (ch === this.pi[n]) {
          this.typed += ch;
          if (this.typed.length === this.pi.length) {
            this.finish('complete');
            return 'complete';
          }
          return 'ok';
        }
        this.wrongChar = ch;
        this.expectedChar = this.pi[n];
        this.finish('wrong');
        return 'wrong_over';
      }

      // timer mode: wrong digits stay (shown red) until deleted
      if (!this.started) {
        this.started = true;
        this.justStarted = true;
      }
      this.typed += ch;
      if (this.correctLen === this.typed.length) {
        if (this.typed.length === this.pi.length) {
          this.finish('complete');
          return 'complete';
        }
        return 'ok';
      }
      return 'wrong';
    }

    backspace() {
      if (this.over || !this.typed) return false;
      if (this.mode === 'zen') {
        if (this.typed.length >= WARMUP.length) return false; // no take-backs in Zen
      } else if (this.started && this.typed.length <= WARMUP.length) {
        return false;                                         // can't delete 3.14 once running
      }
      this.typed = this.typed.slice(0, -1);
      return true;
    }
  }

  const api = { WARMUP, computePi, PiEngine };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.PiGame = root.PiGame || {};
    root.PiGame.pi = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
