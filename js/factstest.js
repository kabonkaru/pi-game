const F = require('../js/facts-data.js'), a = require('assert');
const CATS = ['general', 'stats', 'tips'], KEYS = ['digitsMin', 'digitsMax', 'mode', 'reason', 'comboMin'], MAXLEN = 160, TARGET = 100;
const ids = new Set(); let noSource = 0;
CATS.forEach((c) => {
  a.ok(Array.isArray(F[c]) && F[c].length >= 2, c + ': at least 2 template entries');
  F[c].forEach((e) => {
    a.ok(e.id && !ids.has(e.id), 'unique id ' + e.id); ids.add(e.id);
    a.ok(typeof e.text === 'string' && e.text.trim().length > 0, e.id + ': text');
    a.ok(e.text.length <= MAXLEN, e.id + ': text over ' + MAXLEN + ' chars (' + e.text.length + ')');
    a.ok(!/[<>]/.test(e.text), e.id + ': plain text only');
    (e.text.match(/\{[^}]*\}/g) || []).forEach((p) => a.ok(['{digits}', '{decimals}', '{combo}'].includes(p), e.id + ': unknown placeholder ' + p));
    Object.keys(e.when || {}).forEach((k) => a.ok(KEYS.includes(k), e.id + ': unknown when.' + k));
    if (c !== 'tips' && !e.source && /\d{2}|%|record|NASA|Guinness/i.test(e.text) && c === 'general') noSource++;
  });
  console.log(c + ': ' + F[c].length + ' / ' + TARGET + ' entries');
});
if (noSource) console.log('note: ' + noSource + ' general fact(s) have no `source` - verify before shipping');
// every possible run finds at least one stat entry
['zen', 'timer'].forEach((mode) => ['wrong', 'time', 'timeout', 'complete'].forEach((reason) => {
  for (let d = 0; d <= 1000; d++) a.ok(F.stats.some((e) => F.match(e, { digits: d, mode, reason, combo: 0 })), 'no stat entry for ' + [mode, reason, d]);
}));
// pick: no repeats until every matching entry was shown once, then it starts over
const used = new Set(), ctx = { digits: 60, mode: 'timer', reason: 'time', combo: 30 }, n = F.stats.filter((e) => F.match(e, ctx)).length, seen = new Set();
for (let i = 0; i < n; i++) seen.add(F.pick(F.stats, ctx, used).id);
a.equal(seen.size, n, 'a full cycle shows each matching entry once'); a.ok(F.pick(F.stats, ctx, used), 'cycle restarts');
a.equal(F.pick([], ctx, new Set()), null);
a.equal(F.fill('{digits} / {decimals} / {combo}', { digits: 5, combo: 9 }), '5 / 7 / 9');
console.log('ALL FACTS TESTS PASSED');
