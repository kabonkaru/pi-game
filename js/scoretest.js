const { ScoreKeeper } = require('../js/score.js'); const a = require('assert');
let k, t, n, r;
// ---- Zen: FULL reset to 10.0s on every correct digit, never incremental
k = new ScoreKeeper({ mode: 'zen' }); k.start(1000); a.equal(k.left(1000), 10000);
k.onCorrect(1100, 1); a.equal(k.left(1100), 10000, 'instant digit -> exactly 10.0');
k.onCorrect(7100, 2); a.equal(k.left(7100), 10000, 'after 6s of thinking -> back to exactly 10.0');
a.equal(k.expired(7100 + 9999), false); a.equal(k.expired(7100 + 10000), true, '0.0s = game over');
// ---- Timer: the clock starts on the first digit, at the full 3:00 (cap), so that digit adds nothing
k = new ScoreKeeper({ mode: 'timer' }); k.start(0); a.equal(k.deadline, 0, 'not running during warm-up'); a.equal(k.left(50), 180000);
k.beginTimer(600); r = k.onCorrect(600, 1); a.equal(r.timeAdded, 0, 'at the cap nothing is added'); a.equal(k.left(600), 180000);
// ---- each tier adds exactly its bonus (burn 5s first so there is room under the cap)
const run = () => { k = new ScoreKeeper({ mode: 'timer' }); k.start(0); k.beginTimer(0); t = 0; n = 0; t += 5000; k.onCorrect(t, ++n); };
const gap = (ms, want, label) => { t += ms; const res = k.onCorrect(t, ++n); a.equal(res.timeAdded, want, label); };
run();
gap(200, 400, 'S  0.200s -> +0.40'); gap(249, 400, 'S  0.249s -> +0.40');
gap(250, 200, 'A  0.250s -> +0.20'); gap(499, 200, 'A  0.499s -> +0.20');
gap(500, 50, 'B  0.500s -> +0.05'); gap(1000, 50, 'B  1.000s -> +0.05');
gap(1001, 0, 'slow 1.001s -> +0'); gap(5000, 0, 'slow 5s -> +0');
// ---- the clock never goes above 3:00, however fast you type
k = new ScoreKeeper({ mode: 'timer' }); k.start(0); k.beginTimer(0); t = 0; n = 0;
for (let i = 0; i < 400; i++) { t += 100; k.onCorrect(t, ++n); a.ok(k.left(t) <= 180000); }
a.equal(k.left(t), 180000, 'fast typing refills to exactly the cap');
// ---- real drain: a steady 0.7s/digit typist (B tier, +0.05) loses 0.65s per digit
k = new ScoreKeeper({ mode: 'timer' }); k.start(0); k.beginTimer(0); t = 0; n = 0;
for (let i = 0; i < 20; i++) { t += 700; k.onCorrect(t, ++n); }
a.ok(Math.abs(k.left(t) - (180000 - 0.65 * 1000 * 19 - 0)) < 700 + 1, 'about 0.65s lost per digit'); console.log('0.7s/digit typist, 20 digits: ' + (k.left(t) / 1000).toFixed(2) + 's left');
// ---- timer expires at 0.0
k = new ScoreKeeper({ mode: 'timer' }); k.start(0); k.beginTimer(0); a.equal(k.expired(179999), false); a.equal(k.expired(180000), true);
// ---- scoring unchanged: 100 x speed x combo; +500 per digit; DEL + retype is worth nothing
k = new ScoreKeeper({ mode: 'timer' }); k.start(0); k.beginTimer(10);
a.equal(k.onCorrect(160, 1).points, 150); a.equal(k.onCorrect(460, 2).points, 120); a.equal(k.onCorrect(1060, 3).points, 100);
a.equal(k.totalScore, 370 + 3 * 500); const dl = k.deadline; r = k.onCorrect(1100, 3); a.equal(r.isNew, false); a.equal(r.timeAdded || 0, 0); a.equal(k.deadline, dl);
// combo tiers + 8s decay
k = new ScoreKeeper({ mode: 'zen' }); k.start(0); t = 0; const got = {}; for (let i = 1; i <= 101; i++) { t += 1000; got[i] = k.onCorrect(t, i).points; }
a.deepEqual([got[10], got[11], got[25], got[26], got[50], got[51], got[100], got[101]], [100, 150, 150, 200, 200, 300, 300, 500]);
k.onCorrect(t + 8001, 102); a.equal(k.currentCombo, 1, 'combo restarts after 8s');
console.log('ALL SCORE/TIMER TESTS PASSED');
