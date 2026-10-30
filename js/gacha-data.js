/* ==========================================================================
   gacha-data.js  -  DATA ONLY: items, banners, rates and shop constants.
   Edit the numbers here to rebalance the shop (see docs/GACHA_BLUEPRINT.md).
   Works in the browser (window.PiGame.gacha) and in Node (module.exports).
   An item id is also its theme id (the THEMES list in app.js).
   ========================================================================== */
(function (root) {
  'use strict';

  /** rarity ladder, lowest to highest; `css` is the matching colour token in style.css */
  const RARITIES = {      // v1.6.1: four ranks. Internal keys kept: common = C, epic = B, legendary = A, godly = S
    common:    { rank: 1, label: 'RANK C', css: '--rarity-common',    color: '#aab4c3' },
    epic:      { rank: 2, label: 'RANK B', css: '--rarity-epic',      color: '#b366ff' },
    legendary: { rank: 3, label: 'RANK A', css: '--rarity-legendary', color: '#ffb938' },
    godly:     { rank: 4, label: 'RANK S', css: '--rarity-godly',     color: '#8be9ff' },
  };

  const SHOP = {
    CURRENCY: 'Pi Coin',
    PULL_COST: 100,            // Pi Coins per single pull
    PULL_OPTIONS: [1, 5, 10],  // x1, x5, x10 (total = n * PULL_COST, no bundle discount)
    DUPLICATE_REFUND: 0.5,     // a duplicate refunds 50% of a pull = 50 Pi Coins
    FAKEOUT_CHANCE: 0.01,      // 1% of duplicates play the cosmetic "fake-out" upgrade animation
  };

  /** every theme that can come out of a pull */
  const ITEMS = {
    "plain-ruby": { rarity: "common", name: "RUBY DUNES" },
    "plain-ocean": { rarity: "common", name: "OCEAN BAY" },
    "plain-mint": { rarity: "common", name: "MINT WOODS" },
    "plain-grape": { rarity: "common", name: "GRAPE DUSK" },
    "plain-sun": { rarity: "common", name: "SUNNY MEADOW" },
    "hw-pumpkin": { rarity: "common", name: "PUMPKIN PATCH" },
    "hw-witch": { rarity: "common", name: "WITCH MOON" },
    "hw-slime": { rarity: "common", name: "SLIME SWAMP" },
    "hw-blood": { rarity: "common", name: "BLOOD MOON" },
    "hw-fog": { rarity: "common", name: "FOGGY GRAVEYARD" },
    "ex-neon": { rarity: "epic", name: "NEON GRID" },
    "ex-sea": { rarity: "epic", name: "DEEP SEA" },
    "ex-aurora": { rarity: "epic", name: "AURORA" },
    "hw-manor": { rarity: "epic", name: "HAUNTED MANOR" },
    "dark": { rarity: "legendary", name: "DEEP SPACE" },
    "light": { rarity: "legendary", name: "DREAMY DAY" },
    "terminal": { rarity: "legendary", name: "PHOSPHOR" },
    "halloween": { rarity: "legendary", name: "HAPI HALLOWEEN" },
    "hw-carnival": { rarity: "legendary", name: "CURSED CARNIVAL" },
    "hw-backrooms": { rarity: "legendary", name: "THE BACKROOMS" },
    "singularity": { rarity: "godly", name: "SINGULARITY" },
    "hw-eldritch": { rarity: "godly", name: "ELDRITCH SKY" },
  };

  const BANNERS = {
    standard: {
      id: 'standard', name: 'COSMIC BEGINNINGS', status: 'live',
      blurb: 'Plain colours, neon grids, deep seas, auroras, deep space, sunny days, a handheld and a black hole.',
      pool: ['plain-ruby', 'plain-ocean', 'plain-mint', 'plain-grape', 'plain-sun', 'ex-neon', 'ex-sea', 'ex-aurora', 'dark', 'light', 'terminal', 'singularity'],
      featured: ['singularity'],
      rates: { common: 60, epic: 25, legendary: 12, godly: 3 },     // percent per rarity (sums to 100)
    },
    'event-halloween': {
      id: 'event-halloween', name: 'PI FRIGHT!', status: 'live',     // "coming-soon" = locked, "live" = open
      blurb: "Ha'Pi' Halloween!! Haunt the Manor, ride the Cursed Carnival, creep through the yellow Backrooms and dare an Eldritch pull. Spooky themes with their own haunted music!",
      pool: ['hw-pumpkin', 'hw-witch', 'hw-slime', 'hw-blood', 'hw-fog', 'hw-manor', 'halloween', 'hw-carnival', 'hw-backrooms', 'hw-eldritch'], featured: ['hw-eldritch'],
      rates: { common: 55, epic: 22, legendary: 18, godly: 5 },      // placeholder: tune in the balance pass
    },
  };

  const api = { RARITIES, SHOP, ITEMS, BANNERS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.PiGame = root.PiGame || {}; root.PiGame.gacha = Object.assign(root.PiGame.gacha || {}, api); }
})(typeof window !== 'undefined' ? window : globalThis);
