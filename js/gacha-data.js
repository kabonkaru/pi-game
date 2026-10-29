/* ==========================================================================
   gacha-data.js  -  DATA ONLY: items, banners, rates and shop constants.
   Edit the numbers here to rebalance the shop (see docs/GACHA_BLUEPRINT.md).
   Works in the browser (window.PiGame.gacha) and in Node (module.exports).
   An item id is also its theme id (the THEMES list in app.js).
   ========================================================================== */
(function (root) {
  'use strict';

  /** rarity ladder, lowest to highest; `css` is the matching colour token in style.css */
  const RARITIES = {
    common:    { rank: 1, label: 'COMMON',    css: '--rarity-common',    color: '#aab4c3' },
    epic:      { rank: 2, label: 'EPIC',      css: '--rarity-epic',      color: '#b366ff' },
    legendary: { rank: 3, label: 'LEGENDARY', css: '--rarity-legendary', color: '#ffb938' },
    mythic:    { rank: 4, label: 'MYTHIC',    css: '--rarity-mythic',    color: '#ff4d6d' },
    godly:     { rank: 5, label: 'GODLY',     css: '--rarity-godly',     color: '#8be9ff' },
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
    'plain-ruby':  { rarity: 'common',    name: 'RUBY' },
    'plain-ocean': { rarity: 'common',    name: 'OCEAN' },
    'plain-mint':  { rarity: 'common',    name: 'MINT' },
    'plain-grape': { rarity: 'common',    name: 'GRAPE' },
    'plain-sun':   { rarity: 'common',    name: 'SUNNY' },
    'dark':        { rarity: 'epic',      name: 'DEEP SPACE' },
    'light':       { rarity: 'legendary', name: 'DREAMY DAY' },
    'singularity': { rarity: 'godly',     name: 'SINGULARITY' },
    'terminal':    { rarity: 'mythic',    name: 'PHOSPHOR' },
    'halloween':   { rarity: 'mythic',    name: 'HAPI HALLOWEEN' },
    'hw-pumpkin': { rarity: 'common', name: 'PUMPKIN' },
    'hw-witch': { rarity: 'common', name: 'WITCHING HOUR' },
    'hw-slime': { rarity: 'common', name: 'TOXIC SLIME' },
    'hw-blood': { rarity: 'common', name: 'BLOOD MOON' },
    'hw-fog': { rarity: 'common', name: 'GRAVEYARD FOG' },
    'hw-backrooms': { rarity: 'legendary', name: 'THE BACKROOMS' },
    'hw-eldritch': { rarity: 'godly', name: 'ELDRITCH SKY' },
    'hw-manor': { rarity: 'epic', name: 'HAUNTED MANOR' },
    'hw-carnival': { rarity: 'mythic', name: 'CURSED CARNIVAL' },
    'ex-neon': { rarity: 'epic', name: 'NEON GRID' },
    'ex-sea': { rarity: 'legendary', name: 'DEEP SEA' },
    'ex-aurora': { rarity: 'mythic', name: 'AURORA' },
  };

  const BANNERS = {
    standard: {
      id: 'standard', name: 'COSMIC BEGINNINGS', status: 'live',
      blurb: 'Plain colours, neon grids, deep seas, auroras, deep space, sunny days, a handheld and a black hole.',
      pool: ['plain-ruby', 'plain-ocean', 'plain-mint', 'plain-grape', 'plain-sun', 'dark', 'light', 'singularity', 'terminal', 'ex-neon', 'ex-sea', 'ex-aurora'],
      featured: ['singularity'],
      rates: { common: 62, epic: 24, legendary: 9, mythic: 4, godly: 1 },     // percent per rarity (sums to 100)
    },
    'event-halloween': {
      id: 'event-halloween', name: 'PI FRIGHT!', status: 'live',     // "coming-soon" = locked, "live" = open
      blurb: "Ha'Pi' Halloween!! Haunt the Manor, ride the Cursed Carnival, creep through the yellow Backrooms and dare an Eldritch pull. Spooky themes with their own haunted music!",
      pool: ['hw-pumpkin', 'hw-witch', 'hw-slime', 'hw-blood', 'hw-fog', 'hw-manor', 'hw-backrooms', 'halloween', 'hw-carnival', 'hw-eldritch'], featured: ['hw-eldritch'],
      rates: { common: 55, epic: 22, legendary: 12, mythic: 8, godly: 3 },      // placeholder: tune in the balance pass
    },
  };

  const api = { RARITIES, SHOP, ITEMS, BANNERS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.PiGame = root.PiGame || {}; root.PiGame.gacha = Object.assign(root.PiGame.gacha || {}, api); }
})(typeof window !== 'undefined' ? window : globalThis);
