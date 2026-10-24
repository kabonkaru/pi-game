/* ==========================================================================
   store.js  -  settings + leaderboards (localStorage, with a memory fallback
   for browsers that block storage, e.g. some private modes)
   ========================================================================== */
(function (root) {
  'use strict';

  const KEY_SETTINGS = 'pigame.settings.v1';
  const KEY_SCORES = 'pigame.scores.v1';
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
      theme: media('(prefers-color-scheme: light)') ? 'light' : 'dark',
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

  const api = { settings, scores, fmtDate, cleanName };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.PiGame = root.PiGame || {};
    root.PiGame.store = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
