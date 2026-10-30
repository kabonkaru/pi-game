const D = require('../js/gacha-data.js'), G = require('../js/gacha.js'), a = require('assert');
const rng32 = (s) => () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const std = D.BANNERS.standard;
// roster = spec
const cnt = {}; std.pool.forEach((id) => { const r = D.ITEMS[id].rarity; cnt[r] = (cnt[r] || 0) + 1; });
a.deepEqual(cnt, { common: 5, epic: 3, legendary: 3, godly: 1 });
a.equal(D.ITEMS.dark.rarity, 'legendary'); a.equal(D.ITEMS.light.rarity, 'legendary'); a.equal(D.ITEMS.terminal.rarity, 'legendary'); a.equal(D.ITEMS.singularity.rarity, 'godly');
a.equal(Object.values(std.rates).reduce((x, y) => x + y, 0), 100);
// costs
a.deepEqual(D.SHOP.PULL_OPTIONS.map(G.pullCost), [100, 500, 1000]);
// distribution over 200k fresh pulls (never owning anything -> every pull is "new")
let r = rng32(7), seen = {}, N = 200000; for (let i = 0; i < N; i++) { const p = G.pullOne(r, {}, std); seen[p.rarity] = (seen[p.rarity] || 0) + 1; }
const pct = Object.fromEntries(Object.entries(seen).map(([k, v]) => [k, +(v / N * 100).toFixed(2)])); console.log('observed %:', JSON.stringify(pct));
Object.entries(std.rates).forEach(([k, v]) => a.ok(Math.abs(pct[k] - v) < 0.6, k + ' within tolerance'));
const ir = G.itemRates(std); a.ok(Math.abs(ir['plain-ruby'] - 12) < 1e-9); a.ok(Math.abs(Object.values(ir).reduce((x, y) => x + y, 0) - 100) < 1e-9);
// duplicate refund = 50, new items refund 0
const inv = { dark: 1 }; let dupe = null; r = rng32(3); while (!dupe) { const p = G.pullOne(r, inv, std); if (p.id === 'dark') dupe = p; }
a.equal(dupe.refund, 50); a.equal(dupe.isNew, false); const nw = G.pullOne(() => 0.0001, {}, std); a.equal(nw.isNew, true); a.equal(nw.refund, 0);
// fake-out: ~1% of duplicates, only when a higher tier exists, never on new items
r = rng32(11); let d = 0, f = 0; const all = Object.fromEntries(std.pool.map((i) => [i, 1]));
for (let i = 0; i < 300000; i++) { const p = G.pullOne(r, all, std); d++; if (p.fakeout) { f++; a.ok(D.RARITIES[p.fakeout].rank === D.RARITIES[p.rarity].rank + 1); a.notEqual(p.rarity, 'godly'); } }
console.log('fake-out rate among duplicates:', (f / d * 100).toFixed(2) + '%'); a.ok(Math.abs(f / d * 100 - 1 * (1 - std.rates.godly / 100)) < 0.25, '~1% (godly dupes can not fake out)');
a.equal(G.pullOne(rng32(5), {}, std).fakeout, null);
// batches: earlier wins count as owned
const batch = G.pullMany(() => 0.0001, {}, std, 10);                      // rng ~0 always hits the same first common
a.equal(batch.results.length, 10); a.equal(batch.results.filter((x) => x.isNew).length, 1); a.equal(batch.refund, 9 * 50); a.equal(batch.cost, 1000); a.deepEqual(Object.keys(batch.added), ['plain-ruby']);
// event banner is locked
const ev = D.BANNERS['event-halloween']; a.equal(G.canPull(ev), ev.status === 'live'); if (ev.status !== 'live') a.throws(() => G.pullMany(rng32(1), {}, ev, 1)); a.equal(G.canPull(std), true);
const c2 = {}; ev.pool.forEach((id) => { a.ok(D.ITEMS[id], id + ' has an item'); c2[D.ITEMS[id].rarity] = (c2[D.ITEMS[id].rarity] || 0) + 1; }); a.deepEqual(c2, { common: 5, epic: 1, legendary: 3, godly: 1 }); a.equal(Object.values(ev.rates).reduce((x, y) => x + y, 0), 100);
// collecting everything takes a while: expected pulls to complete the standard set (simulation)
let tot = 0, runs = 300; for (let k = 0; k < runs; k++) { const have = {}; let n = 0; const rr = rng32(1000 + k); while (Object.keys(have).length < std.pool.length) { const p = G.pullOne(rr, have, std); have[p.id] = 1; n++; } tot += n; }
console.log('avg pulls to complete the standard banner:', Math.round(tot / runs), '(= ' + Math.round(tot / runs * 100) + ' Pi Coins before refunds)');
console.log('ALL GACHA TESTS PASSED');
