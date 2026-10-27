const a = require('assert'); const mk = (init) => { const m = Object.assign({}, init); global.localStorage = { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = v; }, _m: m }; delete require.cache[require.resolve('../js/store.js')]; return require('../js/store.js'); };
// brand-new visitor: nothing granted
let S = mk({}); a.deepEqual(S.wallet.inventory(), {}); a.equal(S.wallet.coins(), 0); a.equal(S.settings.get('theme'), 'default-dark');
// returning v1.4 player (has settings + scores, bought Phosphor): keeps everything + Deep Space + Dreamy Day
S = mk({ 'pigame.settings.v1': JSON.stringify({ theme: 'terminal' }), 'pigame.scores.v2': '{}', 'pigame.wallet.v1': JSON.stringify({ coins: 120, owned: ['terminal'] }) });
a.deepEqual(Object.keys(S.wallet.inventory()).sort(), ['dark', 'light', 'terminal']); a.equal(S.wallet.coins(), 120); a.ok(S.wallet.owns('terminal'));
// migration is persisted and runs once
const saved = JSON.parse(localStorage.getItem('pigame.wallet.v1')); a.equal(saved.mig, 2); a.ok(saved.inv.dark === 1);
S = mk({ 'pigame.wallet.v1': JSON.stringify(Object.assign(saved, { inv: { terminal: 1 } })) }); a.deepEqual(S.wallet.inventory(), { terminal: 1 }, 'already migrated: nothing re-granted');
// atomic pull commit
S = mk({ 'pigame.wallet.v1': JSON.stringify({ coins: 1000, mig: 2, inv: { dark: 1 } }) });
a.equal(S.wallet.commitPull(1000, { light: 1, terminal: 1 }, 100, 10), true); a.equal(S.wallet.coins(), 100); a.equal(S.wallet.count('light'), 1); a.equal(S.wallet.pulls(), 10);
a.equal(S.wallet.commitPull(101, { 'plain-ruby': 1 }, 0, 1), false, 'cannot overspend'); a.equal(S.wallet.coins(), 100); a.equal(S.wallet.owns('plain-ruby'), false, 'nothing granted when the payment fails');
const disk = JSON.parse(localStorage.getItem('pigame.wallet.v1')); a.equal(disk.coins, 100); a.equal(disk.inv.terminal, 1);   // coins + items in ONE write
// junk in storage is ignored
S = mk({ 'pigame.wallet.v1': JSON.stringify({ coins: -5, mig: 2, inv: { 'BAD ID!': 3, ok: 2, neg: -1, big: 1e9 } }) }); a.equal(S.wallet.coins(), 0); a.deepEqual(S.wallet.inventory(), { ok: 2 });
console.log('ALL STORE/MIGRATION TESTS PASSED');
