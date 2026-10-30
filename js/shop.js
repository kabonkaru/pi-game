/* ==========================================================================
   shop.js  -  the Shop screen, drop-rates / collection windows and the
   chest-opening sequence (tension -> explosion -> reveal -> summary).
   Pull maths lives in gacha.js; items/rates/costs live in gacha-data.js.
   Pulls are paid + saved in ONE write BEFORE the animation, so closing the tab
   mid-sequence can never lose coins or items.
   ========================================================================== */
(function (root) {
  'use strict';
  const NS = root.PiGame;
  const { RARITIES, SHOP, ITEMS, BANNERS } = NS.gacha;
  const L = NS.gachaLogic;
  const { wallet } = NS.store;
  const audio = NS.audio;

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const reduceMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const RANK = Object.keys(RARITIES);                         // common, epic, legendary, mythic, godly (low -> high)

  let A = null;                                               // hooks from app.js
  let rng = Math.random;
  let bannerId = 'standard';
  let busy = false;

  /* ------------------------------------------------------------ shop screen */
  const fmt = (n) => (A ? A.fmtCoins(n) : String(n));
  const itemTheme = (id) => A.themeById(id);

  function renderTabs() {
    $('#banner-tabs').innerHTML = Object.keys(BANNERS).map((id) => {
      const b = BANNERS[id], live = L.canPull(b);
      return '<button class="tab" role="tab" data-banner="' + id + '" aria-selected="' + String(id === bannerId) + '">' + b.name +
        (live ? '' : ' <span class="lock-ico" data-icon="lock"></span>') + '</button>';
    }).join('');
    A.mountIcons($('#banner-tabs'));
  }

  function renderBanner() {
    const b = BANNERS[bannerId], live = L.canPull(b);
    const have = b.pool.filter((id) => wallet.owns(id)).length;
    const feat = b.featured.map((id) => {
      const t = itemTheme(id);
      return '<span class="feat rarity-' + ITEMS[id].rarity + '"><span class="swatch ' + t.swatch + '"></span><b>' + ITEMS[id].name + '</b><i>' + RARITIES[ITEMS[id].rarity].label + '</i></span>';
    }).join('');
    $('#banner-card').className = 'banner' + (live ? '' : ' is-locked');
    $('#banner-card').innerHTML =
      '<div class="banner-art" aria-hidden="true"><span class="banner-chest" data-icon="chest"></span></div>' +
      '<div class="banner-info"><h3>' + b.name + '</h3><p>' + b.blurb + '</p>' +
      '<div class="feat-row"><small>FEATURED</small>' + feat + '</div>' +
      '<small class="progress">COLLECTED ' + have + ' / ' + b.pool.length + '</small></div>' +
      (live ? '' : '<div class="banner-lock"><span class="lock-ico" data-icon="lock"></span><b>LOCKED</b><small>COMING SOON</small></div>');
    A.mountIcons($('#banner-card'));
    renderPull();
  }

  function renderPull() {
    const b = BANNERS[bannerId], live = L.canPull(b), coins = wallet.coins();
    $('#pull-row').innerHTML = SHOP.PULL_OPTIONS.map((n) => {
      const cost = L.pullCost(n), ok = live && coins >= cost;
      return '<button class="btn pull-btn' + (n === 1 ? '' : ' btn-primary') + '" data-pull="' + n + '"' + (ok ? '' : ' disabled') + '>' +
        '<span>PULL x' + n + '</span><small><span class="coin-inline"><span data-icon="coin"></span><b>' + fmt(cost) + '</b></span></small></button>';
    }).join('');
    A.mountIcons($('#pull-row'));
    const msg = $('#pull-msg');
    if (!live) msg.textContent = 'This banner is not open yet.';
    else if (coins < SHOP.PULL_COST) msg.textContent = 'Need ' + fmt(SHOP.PULL_COST - coins) + ' more Pi Coins for a pull. Play a run to earn them!';
    else msg.textContent = 'Duplicates refund ' + fmt(Math.round(SHOP.PULL_COST * SHOP.DUPLICATE_REFUND)) + ' Pi Coins.';
    $('#shop-coins').textContent = fmt(coins);
  }

  function render() { renderTabs(); renderBanner(); }

  /* --------------------------------------------------- rates + collection */
  function openRates() {
    const b = BANNERS[bannerId], rr = L.bannerRates(b), ir = L.itemRates(b);
    const pct = (x) => (Math.round(x * 100) / 100) + '%';
    $('#rates-body').innerHTML =
      '<p class="modal-note">' + b.name + '</p>' +
      '<table class="rates"><tbody>' + Object.keys(rr).map((r) =>
        '<tr class="rarity-' + r + '"><th>' + RARITIES[r].label + '</th><td>' + pct(rr[r]) + '</td></tr>').join('') + '</tbody></table>' +
      '<h3 class="modal-sub">PER ITEM</h3><ul class="rate-items">' + b.pool.map((id) =>
        '<li class="rarity-' + ITEMS[id].rarity + '"><span>' + ITEMS[id].name + '</span><b>' + pct(ir[id]) + '</b></li>').join('') + '</ul>' +
      '<p class="modal-note">A duplicate refunds ' + fmt(Math.round(SHOP.PULL_COST * SHOP.DUPLICATE_REFUND)) + ' Pi Coins. Pulls so far: ' + fmt(wallet.pulls()) + '.</p>';
    A.openModal('rates-modal');
  }

  function openCollection() {
    const ids = Object.keys(ITEMS).sort((a, b) => RARITIES[ITEMS[a].rarity].rank - RARITIES[ITEMS[b].rarity].rank);
    $('#collection-body').innerHTML = '<div class="coll">' + ids.map((id) => {
      const n = wallet.count(id), t = itemTheme(id), it = ITEMS[id];
      return '<div class="coll-card rarity-' + it.rarity + (n ? '' : ' unowned') + '"><span class="swatch ' + t.swatch + '"></span>' +
        '<i>' + RARITIES[it.rarity].label + '</i><b>' + it.name + '</b><small>' + (n ? (n > 1 ? 'OWNED x' + n : 'OWNED') : 'NOT YET') + '</small></div>';
    }).join('') + '</div>';
    A.openModal('collection-modal');
  }

  /* ------------------------------------------------------- the pull sequence */
  const pv = { open: false, skip: false, g: null, S: 4, W: 0, H: 0, parts: [], t0: 0, raf: 0, hooks: [], st: null };

  const sleep = (ms) => new Promise((res) => {
    if (pv.skip) { res(); return; }
    const id = setTimeout(() => { pv.hooks = pv.hooks.filter((h) => h !== done); res(); }, ms);
    const done = () => { clearTimeout(id); res(); };
    pv.hooks.push(done);
  });
  const waitTap = () => new Promise((res) => {
    if (pv.skip) { res(); return; }
    const done = () => { $('#pull-stage').removeEventListener('click', done); pv.hooks = pv.hooks.filter((h) => h !== done); res(); };
    $('#pull-stage').addEventListener('click', done); pv.hooks.push(done);
  });
  function skipAll() { pv.skip = true; pv.hooks.slice().forEach((h) => h()); }

  const rc = (r) => RARITIES[r].color;
  const rect = (g, c, x, y, w, h) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };
  function disc(g, c, cx, cy, r) {
    g.fillStyle = c; cx = Math.round(cx); cy = Math.round(cy);
    for (let dy = -r; dy <= r; dy++) { const k = Math.round(Math.sqrt(Math.max(0, r * r - dy * dy))); g.fillRect(cx - k, cy + dy, 2 * k + 1, 1); }
  }

  function chest(g, cx, by, open, glow) {
    const x0 = cx - 15;
    rect(g, '#3a2210', x0, by - 14, 30, 14); rect(g, '#8a5a2b', x0 + 1, by - 13, 28, 12); rect(g, '#7a4d22', x0 + 1, by - 8, 28, 1);
    rect(g, '#ffd23f', x0 + 4, by - 14, 3, 14); rect(g, '#ffd23f', x0 + 23, by - 14, 3, 14);
    if (open > 0) { g.globalAlpha = Math.min(1, open * 1.5); rect(g, glow, x0 + 2, by - 15, 26, 2); g.globalAlpha = 1; }
    rect(g, '#ffd23f', cx - 3, by - 12, 6, 6); rect(g, '#3a2210', cx - 1, by - 10, 2, 3);
    const ly = by - 22 - Math.round(open * 9), tilt = Math.round(open * 3);
    rect(g, '#3a2210', x0 + tilt, ly, 30 - tilt * 2, 8); rect(g, '#a06a33', x0 + 1 + tilt, ly + 1, 28 - tilt * 2, 6);
    rect(g, '#ffd23f', x0 + 4 + tilt, ly, 3, 8); rect(g, '#ffd23f', x0 + 23 - tilt, ly, 3, 8);
  }

  function burst(n, x, y, color, power) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283, v = (0.5 + Math.random()) * power;
      pv.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - power * 0.35, life: 0.8 + Math.random() * 0.9, age: 0, c: Math.random() < 0.25 ? '#ffffff' : color });
    }
  }

  function frame(now) {
    if (!pv.open) return;
    pv.raf = requestAnimationFrame(frame);
    const g = pv.g, st = pv.st, dt = Math.min(0.05, (now - (pv.last || now)) / 1000); pv.last = now;
    g.clearRect(0, 0, pv.W, pv.H);
    const cx = Math.round(pv.W / 2), by = Math.round(pv.H * 0.5);
    if (!st) return;
    const col = st.col, sh = st.shake ? Math.round((Math.random() * 2 - 1) * st.shake) : 0, sv = st.shake ? Math.round((Math.random() * 2 - 1) * st.shake * 0.5) : 0;
    if (st.glow > 0) {                                                       // glow halo + light rays
      for (let i = 4; i >= 1; i--) { g.globalAlpha = st.glow * 0.1; disc(g, col, cx, by - 12, 14 + i * 7 + st.glow * 10); }
      g.globalAlpha = 1;
    }
    if (st.rays > 0) {
      g.globalAlpha = Math.min(0.55, st.rays * 0.55); g.fillStyle = col;
      for (let i = 0; i < 14; i++) {
        const a = i * 0.4488 + now / 2600, len = Math.max(pv.W, pv.H) * st.rays;
        for (let k = 8; k < len; k += 1) { const wdt = 1 + Math.floor(k / 30); g.fillRect(Math.round(cx + Math.cos(a) * k), Math.round(by - 12 + Math.sin(a) * k), wdt, 1); }
      }
      g.globalAlpha = 1;
    }
    if (st.suck > 0) {                                                       // godly: matter spirals into the chest
      for (let i = 0; i < 46; i++) {
        const a = i * 0.75 + now / 300, r = (1 - st.suck) * (24 + i * 2.2) + 4;
        g.globalAlpha = 0.9; rect(g, i % 3 ? '#ffffff' : '#8be9ff', cx + Math.cos(a) * r, by - 12 + Math.sin(a) * r * 0.7, 1, 1);
      }
      g.globalAlpha = 1;
    }
    chest(g, cx + sh, by + st.y + sv, st.open, col);
    for (const p of pv.parts) {                                              // explosion particles
      p.age += dt; p.vy += 55 * dt; p.x += p.vx * dt * 60 * 0.3; p.y += p.vy * dt * 60 * 0.3;
      g.globalAlpha = Math.max(0, 1 - p.age / p.life); rect(g, p.c, p.x, p.y, 2, 2);
    }
    g.globalAlpha = 1;
    pv.parts = pv.parts.filter((p) => p.age < p.life);
  }

  const BUILD = { common: 900, epic: 1300, legendary: 1700, mythic: 2100, godly: 2900 };

  async function playOne(res, i, total) {
    const st = (pv.st = { y: -120, open: 0, glow: 0, rays: 0, suck: 0, shake: 0, col: '#aab4c3' });
    const fast = total > 1 && RANK.indexOf(res.rarity) < 2;                  // multi-pulls rush through the boring ones
    const T = reduceMotion() ? 450 : Math.round(BUILD[res.rarity] * (fast ? 0.6 : 1));
    const cardEl = $('#pull-card'); cardEl.hidden = true; cardEl.className = 'pull-card';
    $('#pull-count').textContent = total > 1 ? (i + 1) + ' / ' + total : '';
    $('#pull-stage').classList.toggle('godly', res.rarity === 'godly');
    $('#pull-flash').className = 'pull-flash';

    audio.duck(true); audio.sfx('pull_rumble');
    // 1) the chest drops in
    const t0 = performance.now();
    while (st.y < 0 && !pv.skip) { const k = Math.min(1, (performance.now() - t0) / 280); st.y = Math.round(-120 * (1 - k) * (1 - k)); await sleep(16); if (k >= 1) st.y = 0; }
    st.y = 0;
    // 2) tension: shake grows, the glow climbs through the rarities up to the one you got, ticks speed up
    const rank = RANK.indexOf(res.rarity), ticks = 7 + rank * 3, build0 = performance.now();
    let tk = 0;
    while (!pv.skip) {
      const k = Math.min(1, (performance.now() - build0) / T);
      st.shake = reduceMotion() ? 0 : k * 3; st.glow = 0.2 + k * 0.8;
      st.col = rc(RANK[Math.min(rank, Math.floor(k * (rank + 1)))]);
      if (res.rarity === 'godly') st.suck = k;
      while (tk < ticks && k >= 1 - Math.pow(1 - (tk + 1) / ticks, 1.8)) { audio.sfx('pull_tick', { n: (tk + 1) / ticks }); tk++; }
      if (k >= 1) break;
      await sleep(16);
    }
    // 3) explosion
    st.col = rc(res.rarity); st.suck = 0; st.shake = reduceMotion() ? 0 : 7 + rank * 2; st.glow = 1; st.rays = 0.2;
    audio.sfx('pull_boom', { rarity: res.rarity });
    if (!reduceMotion() && !pv.skip) { $('#pull-flash').className = 'pull-flash go ' + res.rarity; burst(40 + rank * 45, pv.W / 2, pv.H * 0.5 - 12, st.col, 3 + rank * 0.8); }
    for (let k = 0; k < 1 && !pv.skip; k += 0.12) { st.open = k; st.rays = 0.2 + k * 0.6; st.shake = Math.max(0, st.shake - 0.8); await sleep(24); }
    st.open = 1; st.shake = 0; st.rays = 0.8;
    // 4) reveal
    audio.duck(false); audio.sfx('pull_reveal', { rarity: res.rarity });
    showCard(res);
    if (res.fakeout && !pv.skip) await fakeout(res);
    if (total === 1 || RANK.indexOf(res.rarity) >= 2 || res.isNew || res.fakeout) await waitTap(); else await Promise.race([sleep(1100), waitTap()]);
    cardEl.hidden = true; st.open = 0; st.rays = 0; st.glow = 0;
  }

  function cardHTML(res, mini) {
    const t = itemTheme(res.id), it = ITEMS[res.id], r = RARITIES[res.rarity];
    return '<div class="pc rarity-' + res.rarity + (mini ? ' mini' : '') + '" data-id="' + res.id + '">' +
      '<div class="pc-rar">' + r.label + '</div><span class="pc-sw swatch ' + t.swatch + '"></span><div class="pc-name">' + it.name + '</div>' +
      (res.isNew ? '<div class="pc-tag is-new">NEW!</div>' : '<div class="pc-tag dupe">DUPLICATE <span class="coin-inline"><span data-icon="coin"></span><b>+' + res.refund + '</b></span></div>') + '</div>';
  }
  function showCard(res) {
    const el = $('#pull-card'); el.innerHTML = cardHTML(res, false); el.hidden = false; el.className = 'pull-card pop rarity-' + res.rarity;
    A.mountIcons(el);
    $('#pull-hint').textContent = res.isNew ? 'TAP TO CONTINUE' : 'TAP TO CONTINUE';
  }

  async function fakeout(res) {                                              // 1% of duplicates: "upgrade!?" ... "just kidding"
    const el = $('#pull-card'), pc = $('.pc', el), rar = $('.pc-rar', el), up = RARITIES[res.fakeout];
    await sleep(700); if (pv.skip) return;
    audio.sfx('fakeout_up'); el.classList.add('fo-up'); rar.textContent = 'UPGRADE?!'; pv.st.col = rc(res.fakeout); pv.st.glow = 1; pv.st.rays = 1;
    pc.style.setProperty('--rc', up.color); burst(80, pv.W / 2, pv.H * 0.5 - 12, up.color, 4);
    await sleep(1300); if (pv.skip) return;
    audio.sfx('fakeout_drop'); el.classList.remove('fo-up'); el.classList.add('fo-drop'); rar.textContent = 'FAKE-OUT!'; pv.st.col = rc(res.rarity); pv.st.glow = 0.5; pv.st.rays = 0.3;
    pc.style.removeProperty('--rc');
    await sleep(900); rar.textContent = RARITIES[res.rarity].label; el.classList.remove('fo-drop');
  }

  async function runSequence(results, n) {
    pv.open = true; pv.skip = false; pv.parts = []; pv.last = 0;
    const ov = $('#pull'); ov.hidden = false; $('#app').inert = true;
    const cv = $('#pull-cv'); pv.S = Math.max(4, Math.min(7, Math.round(Math.min(innerWidth, innerHeight) / 90)));
    pv.W = cv.width = Math.ceil(innerWidth / pv.S); pv.H = cv.height = Math.ceil(innerHeight / pv.S); pv.g = cv.getContext('2d');
    $('#pull-summary').hidden = true; $('#pull-stage').hidden = false; $('#pull-skip').hidden = false; $('#pull-card').hidden = true;
    cancelAnimationFrame(pv.raf); pv.raf = requestAnimationFrame(frame);
    for (let i = 0; i < results.length && !pv.skip; i++) await playOne(results[i], i, results.length);
    // summary
    pv.st = null; pv.hooks = []; audio.duck(false); pv.g.clearRect(0, 0, pv.W, pv.H);
    $('#pull-stage').hidden = true; $('#pull-skip').hidden = true; $('#pull-stage').classList.remove('godly');
    const refund = results.reduce((s, r) => s + r.refund, 0), fresh = results.filter((r) => r.isNew).length;
    const sorted = results.slice().sort((a, b) => RANK.indexOf(b.rarity) - RANK.indexOf(a.rarity));
    $('#sum-title').textContent = n === 1 ? 'YOU GOT' : 'x' + n + ' RESULTS';
    $('#sum-grid').innerHTML = sorted.map((r) => cardHTML(r, true)).join('');
    $('#sum-note').textContent = fresh + ' new' + (refund ? '  -  ' + fmt(refund) + ' Pi Coins refunded' : '');
    A.mountIcons($('#sum-grid'));
    const again = $('#sum-again'), cost = L.pullCost(n), can = wallet.coins() >= cost && L.canPull(BANNERS[bannerId]);
    again.textContent = 'PULL x' + n + ' AGAIN'; again.disabled = !can; again.dataset.n = n;
    $('#pull-summary').hidden = false; $('#sum-done').focus();
    audio.sfx(fresh ? 'unlock' : 'coin');
  }

  function closePull() {
    pv.open = false; cancelAnimationFrame(pv.raf); $('#pull').hidden = true; $('#app').inert = false; busy = false;
    audio.duck(false); render(); A.refreshAll();
  }

  async function doPull(n) {
    if (busy) return;
    const b = BANNERS[bannerId];
    if (!L.canPull(b)) { audio.sfx('reject'); A.toast('This banner is not open yet'); return; }
    let res;
    try { res = L.pullMany(rng, wallet.inventory(), b, n); } catch (e) { return; }
    if (!wallet.commitPull(res.cost, res.added, res.refund, n)) { audio.sfx('reject'); A.toast('Not enough Pi Coins'); render(); return; }
    busy = true;                                                             // coins + items are already saved here
    await runSequence(res.results, n);
  }

  /* ------------------------------------------------------------------ init */
  function init(hooks) {
    A = hooks;
    $('#btn-shop').addEventListener('click', () => A.go('shop'));
    $('#banner-tabs').addEventListener('click', (e) => {
      const t = e.target.closest('[data-banner]');
      if (!t) return;
      bannerId = t.dataset.banner; audio.sfx(L.canPull(BANNERS[bannerId]) ? 'toggle_on' : 'reject'); render();
    });
    $('#pull-row').addEventListener('click', (e) => { const b = e.target.closest('[data-pull]'); if (b && !b.disabled) doPull(+b.dataset.pull); });
    $('#btn-rates').addEventListener('click', openRates);
    $('#btn-collection').addEventListener('click', openCollection);
    $('#pull-skip').addEventListener('click', (e) => { e.stopPropagation(); skipAll(); });
    $('#sum-done').addEventListener('click', closePull);
    $('#sum-again').addEventListener('click', (e) => { const n = +e.currentTarget.dataset.n; closePull(); doPull(n); });
    $('#sum-grid').addEventListener('click', (e) => {                        // tap a NEW card to wear it
      const c = e.target.closest('.pc'); const id = c && c.dataset.id;
      if (id && c.querySelector('.is-new')) { A.equipTheme(id); A.toast('Wearing ' + ITEMS[id].name); }
    });
    document.addEventListener('keydown', (e) => {
      if (!pv.open) return;
      if (e.key === 'Escape') { e.preventDefault(); if (!$('#pull-summary').hidden) closePull(); else skipAll(); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!$('#pull-stage').hidden) $('#pull-stage').click(); }
    });
    wallet.onChange(() => { const s = $('#shop-coins'); if (s) s.textContent = fmt(wallet.coins()); if (!busy && $('#screen-shop').classList.contains('is-active')) renderPull(); });
    render();
  }

  NS.shop = { init, render, isOpen: () => pv.open, setRng: (fn) => { rng = fn || Math.random; }, doPull, setBanner: (id) => { bannerId = id; render(); } };
})(typeof window !== 'undefined' ? window : globalThis);
