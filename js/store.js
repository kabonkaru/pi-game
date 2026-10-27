/* ==========================================================================
   store.js  -  settings + leaderboards (localStorage, with a memory fallback
   for browsers that block storage, e.g. some private modes)
   ========================================================================== */
(function (root) {
  'use strict';

  const KEY_SETTINGS = 'pigame.settings.v1';
  const KEY_SCORES = 'pigame.scores.v2';
  const KEY_WALLET = 'pigame.wallet.v1';
  const MAX_COINS = 999999999;
  const BOARD_SIZE = 10;
  const MAX_NAME = 12;
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const memory = {};
  function read(key) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : null;
    } catch (e) {
      return memory[key] || null;
    }
  }
  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      memory[key] = value;
    }
  }
  function media(q) {
    return typeof matchMedia === 'function' && matchMedia(q).matches;
  }

  /** "Oct-23-2026" (MMM-DD-YYYY) */
  function fmtDate(d) {
    return MONTHS[d.getMonth()] + '-' + String(d.getDate()).padStart(2, '0') + '-' + d.getFullYear();
  }

  function cleanName(raw) {
    const chars = Array.from(String(raw || '')
      .replace(/[\u0000-\u001f\u007f|]/g, '')
      .trim());
    return (chars.slice(0, MAX_NAME).join('').trim()) || 'PLAYER';
  }

  /* ---------------------------- settings ---------------------------------- */
  const settingsListeners = [];
  function settingsDefaults() {
    return {
      music: true,
      sfx: true,
      shake: !media('(prefers-reduced-motion: reduce)'),
      theme: media('(prefers-color-scheme: light)') ? 'default-light' : 'default-dark',
      bgm: 'auto',               // 'auto' = follow the theme, 'none' = silent, or a track id
      musicVol: 70,              // 0-100
      sfxVol: 80,
    };
  }
  let settingsCache = Object.assign(settingsDefaults(), read(KEY_SETTINGS) || {});

  const settings = {
    get(key) { return settingsCache[key]; },
    all() { return Object.assign({}, settingsCache); },
    set(key, value) {
      settingsCache[key] = value;
      write(KEY_SETTINGS, settingsCache);
      settingsListeners.forEach((fn) => fn(key, value));
    },
    onChange(fn) { settingsListeners.push(fn); },
  };

  /* ---------------------------- leaderboards ------------------------------ */
  function loadScores() {
    const raw = read(KEY_SCORES) || {};
    const out = { timer: [], zen: [], lastName: '' };
    ['timer', 'zen'].forEach((mode) => {
      const rows = (Array.isArray(raw[mode]) ? raw[mode] : [])
        .filter((e) => e && Number.isInteger(e.score))
        .map((e) => ({ name: cleanName(e.name), score: e.score, date: String(e.date || '-') }));
      rows.sort((a, b) => b.score - a.score);
      out[mode] = rows.slice(0, BOARD_SIZE);
    });
    out.lastName = typeof raw.lastName === 'string' ? raw.lastName.slice(0, MAX_NAME) : '';
    return out;
  }
  let scoreCache = loadScores();

  const scores = {
    BOARD_SIZE,
    MAX_NAME,
    list(mode) { return scoreCache[mode]; },
    best(mode) { return scoreCache[mode].length ? scoreCache[mode][0].score : 0; },
    lastName() { return scoreCache.lastName; },
    qualifies(mode, score) {
      const list = scoreCache[mode];
      return score > 0 && (list.length < BOARD_SIZE || score > list[list.length - 1].score);
    },
    /** Adds an entry, returns its (0-based) rank, or -1 if it didn't make the top 10. */
    add(mode, name, score, when) {
      const entry = { name: cleanName(name), score, date: fmtDate(when || new Date()) };
      const list = scoreCache[mode];
      list.push(entry);
      list.sort((a, b) => b.score - a.score);   // stable: older ties stay above newer
      const idx = list.indexOf(entry);
      list.length = Math.min(list.length, BOARD_SIZE);
      scoreCache.lastName = entry.name;
      write(KEY_SCORES, scoreCache);
      return idx < BOARD_SIZE ? idx : -1;
    },
    reset() {
      scoreCache = { timer: [], zen: [], lastName: scoreCache.lastName };
      write(KEY_SCORES, scoreCache);
    },
  };

  /* ------------------------------ Pi Coins + collection --------------------- */
  const MIGRATION = 2;               // bump when the wallet shape changes
  function cleanInv(obj) {
    const out = {};
    if (obj && typeof obj === 'object') {
      Object.keys(obj).forEach((id) => {
        const n = obj[id];
        if (/^[a-z0-9-]{1,32}$/.test(id) && Number.isInteger(n) && n > 0 && n < 1e6) out[id] = n;
      });
    }
    return out;
  }
  function loadWallet() {
    const raw = read(KEY_WALLET) || {};
    const coins = Number.isInteger(raw.coins) && raw.coins >= 0 ? Math.min(raw.coins, MAX_COINS) : 0;
    const legacy = (Array.isArray(raw.owned) ? raw.owned : []).filter((id) => typeof id === 'string' && id.length <= 32).slice(0, 50);
    const inv = cleanInv(raw.inv);
    const pulls = Number.isInteger(raw.pulls) && raw.pulls >= 0 ? raw.pulls : 0;
    const w = { coins, inv, pulls, mig: MIGRATION };
    if (raw.mig !== MIGRATION) {
      // one-time move to the collection: nothing a player owns is ever taken away
      legacy.forEach((id) => { if (!w.inv[id]) w.inv[id] = 1; });                       // themes bought with coins before the shop
      const returning = !!(read(KEY_SETTINGS) || read(KEY_SCORES)) || coins > 0 || legacy.length > 0;
      if (returning) ['dark', 'light'].forEach((id) => { if (!w.inv[id]) w.inv[id] = 1; });   // Deep Space + Dreamy Day were free defaults
      write(KEY_WALLET, w);
    }
    return w;
  }
  let walletCache = loadWallet();
  const walletListeners = [];
  function saveWallet() {
    write(KEY_WALLET, walletCache);
    walletListeners.forEach((fn) => fn(walletCache.coins));
  }

  const wallet = {
    coins() { return walletCache.coins; },
    pulls() { return walletCache.pulls; },
    inventory() { return Object.assign({}, walletCache.inv); },
    count(id) { return walletCache.inv[id] || 0; },
    owns(id) { return (walletCache.inv[id] || 0) > 0; },
    onChange(fn) { walletListeners.push(fn); },
    add(n) {
      n = Math.floor(n);
      if (!(n > 0)) return walletCache.coins;
      walletCache.coins = Math.min(MAX_COINS, walletCache.coins + n);
      saveWallet();
      return walletCache.coins;
    },
    /** one atomic write: pay for the pulls, keep the new items, refund the duplicates. false = can't afford it */
    commitPull(cost, added, refund, nPulls) {
      cost = Math.floor(cost); refund = Math.floor(refund || 0);
      if (!(cost >= 0) || cost > walletCache.coins) return false;
      walletCache.coins = Math.min(MAX_COINS, walletCache.coins - cost + refund);
      Object.keys(added || {}).forEach((id) => { walletCache.inv[id] = (walletCache.inv[id] || 0) + 1; });
      walletCache.pulls += nPulls || 0;
      saveWallet();
      return true;
    },
    /** dev helper (used by the DEV tools only) */
    grant(id) { walletCache.inv[id] = (walletCache.inv[id] || 0) + 1; saveWallet(); },
  };

  const api = { settings, scores, wallet, fmtDate, cleanName };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.PiGame = root.PiGame || {};
    root.PiGame.store = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
