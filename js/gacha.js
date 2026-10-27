/* ==========================================================================
   gacha.js  -  pure pull logic (no DOM, no storage). The caller supplies the
   random function and the current inventory, so it is fully unit-testable.
   ========================================================================== */
(function (root) {
  'use strict';
  const D = typeof module !== 'undefined' && module.exports ? require('./gacha-data.js') : root.PiGame.gacha;
  const { RARITIES, SHOP, ITEMS, BANNERS } = D;

  const pullCost = (n) => n * SHOP.PULL_COST;
  const canPull = (banner) => !!banner && banner.status === 'live';

  /** rarity -> percent actually present in this banner (rarities with no item are skipped) */
  function bannerRates(banner) {
    const have = {};
    banner.pool.forEach((id) => { have[ITEMS[id].rarity] = (have[ITEMS[id].rarity] || 0) + 1; });
    const out = {};
    let total = 0;
    Object.keys(banner.rates).forEach((r) => { if (have[r]) { out[r] = banner.rates[r]; total += banner.rates[r]; } });
    Object.keys(out).forEach((r) => { out[r] = (out[r] / total) * 100; });
    return out;
  }
  /** per-item percent, for the "drop rates" screen */
  function itemRates(banner) {
    const rr = bannerRates(banner), out = {};
    banner.pool.forEach((id) => {
      const r = ITEMS[id].rarity, n = banner.pool.filter((x) => ITEMS[x].rarity === r).length;
      out[id] = rr[r] / n;
    });
    return out;
  }

  function rollRarity(rng, rates) {
    const keys = Object.keys(rates);
    let x = rng() * keys.reduce((s, k) => s + rates[k], 0);
    for (const k of keys) { x -= rates[k]; if (x < 0) return k; }
    return keys[keys.length - 1];
  }

  /**
   * One pull. `inv` is { itemId: count } and is NOT changed here.
   * -> { id, rarity, isNew, refund, fakeout }   fakeout = rarity it pretends to upgrade to (or null)
   */
  function pullOne(rng, inv, banner) {
    const rarity = rollRarity(rng, bannerRates(banner));
    const pool = banner.pool.filter((id) => ITEMS[id].rarity === rarity);
    const id = pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
    const isNew = !(inv[id] > 0);
    let fakeout = null;
    if (!isNew && rng() < SHOP.FAKEOUT_CHANCE) {
      const up = Object.keys(RARITIES).find((r) => RARITIES[r].rank === RARITIES[rarity].rank + 1);
      if (up) fakeout = up;                                   // nothing is higher than godly
    }
    return { id, rarity, isNew, refund: isNew ? 0 : Math.round(SHOP.PULL_COST * SHOP.DUPLICATE_REFUND), fakeout };
  }

  /**
   * n pulls in a row. Items won earlier in the batch count as owned for the later pulls.
   * -> { results, added: { id: count }, refund, cost }
   */
  function pullMany(rng, inv, banner, n) {
    if (!canPull(banner)) throw new Error('banner is not live');
    const seen = Object.assign({}, inv), added = {}, results = [];
    let refund = 0;
    for (let i = 0; i < n; i++) {
      const r = pullOne(rng, seen, banner);
      results.push(r);
      if (r.isNew) { seen[r.id] = 1; added[r.id] = 1; } else refund += r.refund;
    }
    return { results, added, refund, cost: pullCost(n) };
  }

  const api = { pullCost, canPull, bannerRates, itemRates, pullOne, pullMany };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.PiGame = root.PiGame || {}; root.PiGame.gachaLogic = api; }
})(typeof window !== 'undefined' ? window : globalThis);
