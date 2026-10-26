/* ==========================================================================
   gacha-data.js  -  DATA ONLY blueprint for the upcoming Gacha & Shop update.
   Nothing in the game reads this yet (v1.4.x). See docs/GACHA_BLUEPRINT.md.
   Works in the browser (window.PiGame.gacha) and in Node (module.exports).
   ========================================================================== */
(function (root) {
  'use strict';

  /** rarity ladder, lowest to highest (the colours are the --rarity-* CSS tokens) */
  const RARITIES = {
    common:    { rank: 1, label: 'COMMON',    css: '--rarity-common' },
    epic:      { rank: 2, label: 'EPIC',      css: '--rarity-epic' },
    legendary: { rank: 3, label: 'LEGENDARY', css: '--rarity-legendary' },
    mythic:    { rank: 4, label: 'MYTHIC',    css: '--rarity-mythic' },
    godly:     { rank: 5, label: 'GODLY',     css: '--rarity-godly' },
  };

  const SHOP = {
    ENABLED: false,            // flip to true when the shop ships
    CURRENCY: 'Pi Coin',
    PULL_COST: 100,            // Pi Coins per single pull
    PULL_OPTIONS: [1, 5, 10],  // x1, x5, x10  (total = n * PULL_COST unless a bundle discount is decided)
    DUPLICATE_REFUND: 0.5,     // a duplicate refunds 50% of a pull = 50 Pi Coins
    FAKEOUT_CHANCE: 0.01,      // 1% of duplicates play the "fake-out" upgrade animation
  };

  /** every item a pull can return; `theme` is the id used by THEMES in app.js (null = not built yet) */
  const ITEMS = {
    'plain-1': { rarity: 'common',    name: 'TBD (plain colour #1)', theme: null, bgm: 'chill-default' },
    'plain-2': { rarity: 'common',    name: 'TBD (plain colour #2)', theme: null, bgm: 'chill-default' },
    'plain-3': { rarity: 'common',    name: 'TBD (plain colour #3)', theme: null, bgm: 'chill-default' },
    'plain-4': { rarity: 'common',    name: 'TBD (plain colour #4)', theme: null, bgm: 'chill-default' },
    'plain-5': { rarity: 'common',    name: 'TBD (plain colour #5)', theme: null, bgm: 'chill-default' },
    'deep-space':  { rarity: 'epic',      name: 'DEEP SPACE', theme: 'dark',     bgm: 'deep-space' },
    'dreamy-day':  { rarity: 'legendary', name: 'DREAMY DAY', theme: 'light',    bgm: 'dreamy-day' },
    'phosphor':    { rarity: 'mythic',    name: 'PHOSPHOR',   theme: 'terminal', bgm: 'phosphor' },
    'singularity': { rarity: 'godly',     name: 'SINGULARITY', theme: null,      bgm: null },   // reactive black-hole / cosmic theme, to be designed
    'hapi-halloween': { rarity: 'mythic', name: 'HAPI HALLOWEEN', theme: 'halloween', bgm: 'haunted' },
  };

  const BANNERS = {
    standard: {
      name: 'Cosmic Beginnings', status: 'planned',
      pool: ['plain-1', 'plain-2', 'plain-3', 'plain-4', 'plain-5', 'deep-space', 'dreamy-day', 'phosphor', 'singularity'],
      rates: null,             // TBD: drop rates per rarity are not decided yet
    },
    'event-halloween': {
      name: 'Hapi Halloween', status: 'coming-soon',   // shows as LOCKED in the shop
      pool: ['hapi-halloween'], featured: ['hapi-halloween'],
      rates: null,
    },
  };

  const api = { RARITIES, SHOP, ITEMS, BANNERS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.PiGame = root.PiGame || {}; root.PiGame.gacha = api; }
})(typeof window !== 'undefined' ? window : globalThis);
