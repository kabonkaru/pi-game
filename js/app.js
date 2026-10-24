/* ==========================================================================
   app.js  -  wires everything together: screens, game loop, juice,
   leaderboards, settings + themes.
   ========================================================================== */
(function () {
  'use strict';

  const { PiEngine, computePi, WARMUP } = PiGame.pi;
  const { ScoreKeeper, SCORING } = PiGame.score;
  const { settings, scores, wallet } = PiGame.store;
  const audio = PiGame.audio;
  const fx = PiGame.fx;

  /* ------------------------------ config -------------------------------- */
  const CONFIG = {
    TIMER_SECONDS: 180,      // Timer mode length
    COINS_PER_SCORE: 0.01,   // PLACEHOLDER: Pi Coins earned per run = final score x this
    DEV_LOGO_COINS: true,    // DEV TEST: tap the logo 10 times = +100 Pi Coins (set to false before release!)
    LOGO_TAPS: 1, LOGO_REWARD: 100, LOGO_WINDOW_MS: 2500,
    DECIMALS: 1000,          // digits after "3."
    SHAKE: { key: 2, milestone: 6, wrong: 9, finish: 12 },   // pixels (inside the page only)
  };

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  /* ------------------------ themes (each bundles a music track) ------------------------ */
  const THEMES = [
    { id: 'dark',     name: 'DEEP SPACE', tag: 'DARK',      swatch: 'sw-dark',     bgm: 'deep-space', cost: 0,    icon: 'moon', meta: '#05041a' },
    { id: 'light',    name: 'DREAMY DAY', tag: 'LIGHT',     swatch: 'sw-light',    bgm: 'dreamy-day', cost: 0,    icon: 'sun',  meta: '#cfe6ff' },
    { id: 'terminal', name: 'PHOSPHOR',   tag: 'RETRO CRT', swatch: 'sw-terminal', bgm: 'phosphor',   cost: 3140, icon: 'term', meta: '#000a02' },
  ];
  const themeById = (id) => THEMES.find((t) => t.id === id);
  const isOwned = (t) => t.cost === 0 || wallet.owns(t.id);
  const currentTheme = () => themeById(document.documentElement.dataset.theme) || THEMES[0];
  const fmtCoins = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  const PI = computePi(CONFIG.DECIMALS);
  const el = {
    stage: $('#stage'),
    modeChip: $('#mode-chip'), clock: $('#clock'), meter: $('#meter-fill'),
    lcd: $('#lcd'), lcdText: $('#lcd-text'), lcdPop: $('#lcd-pop'),
    score: $('#score'), best: $('#best'), combo: $('#combo'), tier: $('#tier'), hint: $('#hint'),
    keypad: $('#keypad'), flash: $('#flash'),
    settings: $('#settings'),
  };

  const state = {
    screen: 'menu', engine: null, round: 0,
    deadline: 0, warned: -1, keeper: null,          // deadline = Timer-mode 3:00 clock
    best: 0, boardTab: 'timer', lastResult: null,
  };

  /* ---------------------------- tiny helpers ----------------------------- */
  const fmtClock = (s) => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  const shake = (px) => { if (settings.get('shake')) fx.shake(el.stage, px); };

  function flash(kind) {
    el.flash.className = '';
    void el.flash.offsetWidth;                // restart the animation
    el.flash.className = kind === 'bad' ? 'f-bad' : 'f-gold';
  }
  function lcdFlash(kind) {
    el.lcd.classList.remove('flash-bad', 'flash-gold');
    void el.lcd.offsetWidth;
    el.lcd.classList.add(kind === 'bad' ? 'flash-bad' : 'flash-gold');
  }
  function accentColors() {
    const cs = getComputedStyle(document.documentElement);
    const mode = state.engine && state.engine.mode === 'zen';
    return mode
      ? [cs.getPropertyValue('--c-zen-a'), cs.getPropertyValue('--c-zen-b'), '#ffffff']
      : [cs.getPropertyValue('--c-timer-a'), cs.getPropertyValue('--c-timer-b'), '#ffffff'];
  }
  function burstFrom(node, opts) {
    if (!node) return;
    const r = node.getBoundingClientRect();
    particles.burst(r.left + r.width / 2, r.top + r.height / 3, Object.assign({ colors: accentColors() }, opts));
  }

  /* ------------------------------ screens -------------------------------- */
  function go(name) {
    state.round++;                            // cancels any pending "show result"
    $$('.screen').forEach((s) => s.classList.toggle('is-active', s.dataset.screen === name));
    state.screen = name;
    document.body.dataset.screen = name;
    window.scrollTo(0, 0);
    if (name === 'menu') refreshMenu();
    if (name === 'board') showBoard(state.boardTab);
  }

  function refreshMenu() {
    $('#best-timer').textContent = scores.best('timer');
    $('#best-zen').textContent = scores.best('zen');
  }

  /* -------------------------------- game --------------------------------- */
  function startGame(mode) {
    state.round++;
    state.engine = new PiEngine(mode, PI);
    state.deadline = 0; state.warned = -1;
    state.keeper = new ScoreKeeper({ survival: mode === 'zen' });   // Zen = 10s survival clock
    state.best = scores.best(mode);
    audio.setIntensity(0);
    el.modeChip.textContent = mode === 'timer' ? 'TIMER' : 'ZEN';
    el.modeChip.dataset.mode = mode;
    el.clock.textContent = mode === 'timer' ? fmtClock(CONFIG.TIMER_SECONDS) : '10.0s';
    el.clock.classList.remove('danger');
    setMeter(1);
    $$('.screen').forEach((s) => s.classList.toggle('is-active', s.dataset.screen === 'game'));
    state.screen = 'game';
    document.body.dataset.screen = 'game';
    window.scrollTo(0, 0);
    render();
    audio.sfx('start');
  }

  function setMeter(frac) {
    frac = Math.max(0, Math.min(1, frac));
    el.meter.style.width = (frac * 100).toFixed(1) + '%';
    el.meter.className = frac > 0.5 ? '' : frac > 0.25 ? 'mid' : 'low';
  }

  function render(popLast) {
    const eng = state.engine;
    const cl = eng.correctLen;
    const good = eng.typed.slice(0, cl);
    const bad = eng.typed.slice(cl) + eng.wrongChar;
    let html;
    if (!good && !bad) {
      html = '<span class="ghost">0</span>';
    } else {
      const lastIsGood = !bad;
      const head = lastIsGood ? good.slice(0, -1) : good;
      html = head;
      if (lastIsGood) html += '<span' + (popLast ? ' class="pop"' : '') + '>' + good.slice(-1) + '</span>';
      if (bad) html += '<span class="bad">' + bad + '</span>';
    }
    el.lcdText.innerHTML = '<div class="lcd-inner">' + html + '</div>';
    const k = state.keeper;
    el.score.textContent = k.totalScore;
    el.best.textContent = Math.max(state.best, k.totalScore);
    el.combo.textContent = k.currentCombo;
    el.tier.textContent = k.speedTier;
    el.tier.dataset.tier = k.speedTier;
    updateHint();
  }

  function updateHint() {
    const eng = state.engine;
    const n = eng.typed.length;
    let text = '', cls = '';
    if (eng.over) {
      text = {
        time: "TIME'S UP!",
        wrong: 'Wrong! The next digit was ' + eng.expectedChar,
        timeout: 'Too slow!',
        complete: 'ALL ' + CONFIG.DECIMALS + ' DIGITS!',
      }[eng.reason] || '';
      cls = eng.reason === 'wrong' || eng.reason === 'timeout' ? 'bad' : 'warn';
    } else if (n < WARMUP.length) {
      text = 'Type 3.14 to begin. ' + (eng.mode === 'timer'
        ? 'The clock starts on the next digit.' : 'One wrong digit ends the run.');
    } else if (eng.mode === 'timer' && !eng.started) {
      text = 'Now type the next digit - the clock starts!';
    } else if (eng.mode === 'timer' && eng.correctLen < n) {
      text = 'Wrong digit! Press DEL to fix it.'; cls = 'bad';
    } else if (eng.mode === 'zen') {
      text = 'Survive! Every correct digit adds ' + (SCORING.SURVIVAL_REFILL_MS / 1000) + 's.';
    } else {
      text = 'Keep going!';
    }
    el.hint.textContent = text;
    el.hint.className = 'hint ' + cls;
  }

  const MILESTONES = { 10: 'NICE!', 20: 'GREAT!', 30: 'WOW!', 40: 'SUPER!', 50: 'AMAZING!', 75: 'INSANE!', 100: 'LEGEND!' };
  function milestoneText(score) {
    if (MILESTONES[score]) return MILESTONES[score];
    return score >= 100 && score % 50 === 0 ? 'UNREAL!' : score + ' DIGITS!';
  }

  function onDigit(ch, keyEl) {
    if (state.screen !== 'game') return;
    const eng = state.engine;
    if (eng.over) return;
    const ev = eng.press(ch);
    if (ev === 'ignore') return;
    const now = performance.now();
    if (eng.justStarted) { state.deadline = now + CONFIG.TIMER_SECONDS * 1000; audio.sfx('go'); }
    // ---- v1.1 scoring: speed tier x combo tier, survival clock refill ----
    const k = state.keeper;
    let hit = null;
    if (ev === 'warmup_done') k.start(now);
    else if (ev === 'ok' || ev === 'complete') hit = k.onCorrect(now, eng.score);
    else if (ev === 'wrong' || ev === 'wrong_over') k.onWrong(now);

    if (ev === 'reject') {
      render();
      el.hint.textContent = 'Not 3.14 - try again.';
      el.hint.className = 'hint bad';
      audio.sfx('reject'); lcdFlash('bad'); flash('bad'); shake(CONFIG.SHAKE.wrong);
      burstFrom(keyEl, { n: 8, colors: ['#ff5470', '#ffffff'] });
      return;
    }

    audio.setIntensity(Math.min(1, k.currentCombo / 60));
    render(ev === 'ok' || ev === 'warmup_ok' || ev === 'warmup_done' || ev === 'complete');
    if (hit && hit.isNew) {                   // speed-tier popup
      el.tier.classList.remove('pop'); void el.tier.offsetWidth; el.tier.classList.add('pop');
      if (hit.tier === 'S' && eng.score % 5 !== 0) fx.floatText(el.lcdPop, 'S +' + hit.points, 'good');
    }

    switch (ev) {
      case 'warmup_ok':
      case 'warmup_done':
        audio.sfx('warm', { n: eng.typed.length - 1 });
        burstFrom(keyEl, { n: 5 });
        shake(CONFIG.SHAKE.key);
        break;
      case 'ok':
        audio.sfx('key', { n: eng.score });
        if (eng.score % 10 === 0) {
          audio.sfx('milestone');
          flash('gold'); lcdFlash('gold');
          fx.floatText(el.lcdPop, milestoneText(eng.score), 'big');
          burstFrom(keyEl, { n: 36, speed: 5.5, size: 6, life: 52 });
          shake(CONFIG.SHAKE.milestone);
        } else {
          burstFrom(keyEl, { n: 7 + Math.min(10, Math.floor(k.currentCombo / 8)) });
          shake(CONFIG.SHAKE.key);
          if (k.currentCombo > 0 && k.currentCombo % 5 === 0) fx.floatText(el.lcdPop, 'COMBO x' + k.currentCombo, 'good');
        }
        break;
      case 'wrong':
        audio.sfx('wrong'); flash('bad'); lcdFlash('bad');
        fx.floatText(el.lcdPop, 'OOPS!', 'bad');
        burstFrom(keyEl, { n: 12, colors: ['#ff5470', '#ffffff', '#ffb3c0'], gravity: 0.2 });
        shake(CONFIG.SHAKE.wrong);
        break;
      case 'wrong_over':
        audio.sfx('wrong'); flash('bad'); lcdFlash('bad');
        burstFrom(keyEl, { n: 24, colors: ['#ff5470', '#ffffff'], gravity: 0.2 });
        shake(CONFIG.SHAKE.finish);
        finishRound();
        break;
      case 'complete':
        audio.sfx('perfect'); flash('gold'); lcdFlash('gold');
        burstFrom(keyEl, { n: 60, speed: 7, size: 7, life: 70 });
        shake(CONFIG.SHAKE.finish);
        finishRound();
        break;
      default:
        break;
    }
  }

  function onBack() {
    if (state.screen !== 'game') return;
    if (state.engine.backspace()) { state.keeper.touch(performance.now()); audio.sfx('del'); render(); }
  }

  function finishRound(reason) {
    const eng = state.engine;
    if (reason) {
      eng.finish(reason);
      audio.sfx('over'); flash('bad'); lcdFlash('bad');
      shake(CONFIG.SHAKE.finish);
    } else if (eng.reason === 'wrong') {
      window.setTimeout(() => audio.sfx('over'), 350);
    }
    audio.setIntensity(0);
    render();
    const round = state.round;
    window.setTimeout(() => { if (round === state.round && state.screen === 'game') showResult(); }, 1150);
  }

  function tick() {
    if (state.screen !== 'game') return;
    const eng = state.engine;
    if (!eng || eng.over) return;
    const now = performance.now();
    if (state.keeper.decay(now)) render();     // 8s without a correct digit: combo drops
    if (eng.mode === 'timer') {
      if (!eng.started) return;
      const left = state.deadline - now;
      if (left <= 0) {
        el.clock.textContent = '00:00'; setMeter(0);
        finishRound('time');
        return;
      }
      const sec = Math.ceil(left / 1000);
      el.clock.textContent = fmtClock(sec);
      el.clock.classList.toggle('danger', left <= 10000);
      if (sec <= 10 && sec !== state.warned) { state.warned = sec; audio.sfx('warn', { urgent: sec <= 3 }); }
      setMeter(left / (CONFIG.TIMER_SECONDS * 1000));
    } else {                                    // Zen: survival clock (10.0s max, +0.25s per digit)
      const kp = state.keeper;
      if (!kp.deadline) return;
      const left = kp.left(now);
      if (left <= 0) {
        el.clock.textContent = '0.0s'; setMeter(0);
        finishRound('timeout');
        return;
      }
      el.clock.textContent = (left / 1000).toFixed(1) + 's';
      el.clock.classList.toggle('danger', left <= 3000);
      const sec = Math.ceil(left / 1000);
      if (sec <= 3 && sec !== state.warned) { state.warned = sec; audio.sfx('warn', { urgent: true }); }
      if (sec > 3) state.warned = -1;
      setMeter(left / SCORING.SURVIVAL_MAX_MS);
    }
  }

  /* ------------------------------- results ------------------------------- */
  function showResult() {
    const eng = state.engine;
    const mode = eng.mode, sum = state.keeper.summary(), score = sum.totalScore;
    const prevBest = scores.best(mode);
    const [title, sub] = {
      time: ["TIME'S UP!", 'Your 3 minutes are over.'],
      wrong: ['GAME OVER', 'You typed ' + eng.wrongChar + ' - the next digit was ' + eng.expectedChar + '.'],
      timeout: ['TOO SLOW!', 'Your survival timer ran out.'],
      complete: ['PERFECT PI!', 'All ' + CONFIG.DECIMALS + ' decimals. Legend.'],
    }[eng.reason] || ['GAME OVER', ''];

    $('#res-title').textContent = title;
    $('#res-sub').textContent = sub;
    $('#res-score').textContent = score;
    $('#res-break').innerHTML =
      '<dt>KEYSTROKES</dt><dd>' + sum.strokeScore + '</dd>' +
      '<dt>DIGITS ' + sum.totalDigits + ' x ' + SCORING.LENGTH_BONUS + '</dt><dd>+' + sum.lengthBonus + '</dd>' +
      '<dt>MAX COMBO</dt><dd>' + sum.maxCombo + '</dd>' +
      '<dt>HIGH SCORE</dt><dd>' + Math.max(prevBest, score) + (score > prevBest ? ' NEW!' : '') + '</dd>';
    const earned = Math.floor(score * CONFIG.COINS_PER_SCORE);       // Pi Coins for this run
    if (earned > 0) wallet.add(earned);
    const rc = $('#res-coins');
    rc.innerHTML = earned > 0 ? '<span data-icon="coin"></span>+' + fmtCoins(earned) + ' PI COIN' : '';
    fx.icons.mount(rc);
    state.lastResult = { mode, score, saved: false };

    const box = $('#res-save');
    box.innerHTML = '';
    if (scores.qualifies(mode, score)) {
      box.innerHTML =
        '<div class="r-new">NEW TOP 10! ENTER YOUR NAME</div>' +
        '<form id="save-form" autocomplete="off"><input id="name-input" maxlength="' + scores.MAX_NAME + '" ' +
        'placeholder="YOUR NAME" aria-label="Your name (12 characters max)" spellcheck="false">' +
        '<button class="btn btn-primary shiny" type="submit">SAVE</button></form>';
      const input = $('#name-input');
      input.value = scores.lastName();
      $('#save-form').addEventListener('submit', (e) => { e.preventDefault(); saveScore(); });
      if (matchMedia('(pointer: fine)').matches) window.setTimeout(() => { input.focus(); input.select(); }, 450);
      audio.sfx('record');
    } else {
      const msg = score <= 0 ? 'Score at least 1 point to join the leaderboard.'
        : 'Beat ' + scores.list(mode)[scores.list(mode).length - 1].score + ' to enter the top 10.';
      box.innerHTML = '<div class="r-msg">' + msg + '</div>';
    }
    renderBoard($('#res-board'), mode, -1);
    state.screen = 'result';
    $$('.screen').forEach((s) => s.classList.toggle('is-active', s.dataset.screen === 'result'));
    document.body.dataset.screen = 'result';
    window.scrollTo(0, 0);
  }

  function saveScore() {
    const r = state.lastResult;
    if (!r || r.saved) return;
    r.saved = true;
    const rank = scores.add(r.mode, $('#name-input').value, r.score);
    $('#res-save').innerHTML = '<div class="r-saved">SAVED!' + (rank >= 0 ? " YOU'RE #" + (rank + 1) : '') + '</div>';
    renderBoard($('#res-board'), r.mode, rank);
    audio.sfx('save');
    particles.burst(innerWidth / 2, innerHeight / 3, { n: 40, speed: 5, size: 6, life: 60, colors: ['#ffe066', '#ff7be5', '#4df5d2', '#ffffff'] });
  }

  /* ---------------------------- leaderboards ----------------------------- */
  function renderBoard(host, mode, highlight) {
    const list = scores.list(mode);
    const rows = ['<div class="b-row b-head"><span class="b-rank">#</span><span>NAME</span><span class="b-score">SCORE</span><span class="b-date">DATE</span></div>'];
    for (let i = 0; i < scores.BOARD_SIZE; i++) {
      const e = list[i];
      const cls = 'b-row' + (i < 3 ? ' r' + (i + 1) : '') + (e ? '' : ' empty') + (i === highlight ? ' hl' : '');
      rows.push(
        '<div class="' + cls + '"><span class="b-rank">' + (i + 1) + '</span>' +
        '<span class="b-name"></span><span class="b-score">' + (e ? e.score : '-') + '</span>' +
        '<span class="b-date">' + (e ? e.date : '-') + '</span></div>');
    }
    host.innerHTML = rows.join('');
    // names are user text: set with textContent (never as HTML)
    $$('.b-name', host).forEach((n, i) => { n.textContent = list[i] ? list[i].name : '-'; });
  }

  function showBoard(mode) {
    state.boardTab = mode;
    $$('.tab').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === mode)));
    renderBoard($('#board-list'), mode, -1);
  }

  /* -------------------------------- guide -------------------------------- */
  function buildGuide() {
    const dec = PI.slice(2);
    const lines = ['<div class="d-line"><span class="d-idx">&nbsp;</span><span class="d-groups"><span class="d-start">3.</span></span></div>'];
    for (let i = 0; i < dec.length; i += 20) {
      const chunk = dec.slice(i, i + 20);
      let groups = '';
      for (let j = 0; j < chunk.length; j += 5) groups += '<span>' + chunk.slice(j, j + 5) + '</span>';
      lines.push('<div class="d-line"><span class="d-idx">' + (i + 1) + '-' + (i + chunk.length) + '</span><span class="d-groups">' + groups + '</span></div>');
    }
    $('#pi-digits').innerHTML = lines.join('');
  }

  /* ------------------------------- settings ------------------------------ */
  function setSwitch(btn, on) {
    btn.setAttribute('aria-checked', String(on));
    $('.sw-label', btn).textContent = on ? 'ON' : 'OFF';
  }

  function applyTheme(id) {
    const t = themeById(id) || THEMES[0];
    document.documentElement.dataset.theme = t.id;
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t.meta);
    const owned = THEMES.filter(isOwned);                     // the top button cycles the themes you own
    const next = owned[(owned.indexOf(t) + 1) % owned.length];
    fx.icons.set($('#btn-theme [data-icon]'), next.icon);
    $('#btn-theme').setAttribute('aria-label', 'Switch to ' + next.name + ' theme');
    if (background) background.onTheme();
  }

  function equipTheme(id) {
    const t = themeById(id);
    if (!t || !isOwned(t)) return;
    settings.set('theme', t.id);
    applyTheme(t.id);
    renderThemes();
    syncBgm();
  }

  /* --------------------------- Pi Coins + theme shop --------------------------- */
  function toast(text) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.setAttribute('role', 'status');
    t.textContent = text;
    document.body.appendChild(t);
    window.setTimeout(() => t.remove(), 2700);
  }

  function refreshCoins() { $('#coin-count').textContent = fmtCoins(wallet.coins()); }

  function trackOwned(id) { const t = THEMES.find((x) => x.bgm === id); return !!t && isOwned(t); }
  function trackFor() {
    const pick = settings.get('bgm');
    if (pick !== 'auto' && audio.TRACKS[pick] && trackOwned(pick)) return pick;
    return currentTheme().bgm;                                // AUTO: the track bundled with the theme
  }
  function syncBgm() { audio.setTrack(trackFor()); renderBgm(); }

  function renderBgm() {
    const host = $('#bgm-list');
    if (!host) return;
    const pick = settings.get('bgm');
    const chosen = pick !== 'auto' && audio.TRACKS[pick] && trackOwned(pick) ? pick : 'auto';
    const rows = [{ id: 'auto', name: 'AUTO', sub: 'Follows your theme', locked: false }].concat(
      THEMES.map((t) => ({ id: t.bgm, name: audio.TRACKS[t.bgm].name, sub: 'Bundled with ' + t.name, locked: !isOwned(t), theme: t.name })));
    host.innerHTML = rows.map((r) =>
      '<button class="bgm-opt' + (r.locked ? ' locked' : '') + '" role="radio" data-bgm="' + r.id + '" aria-checked="' + String(r.id === chosen) + '">' +
      '<span><b>' + r.name + '</b><small>' + (r.locked ? 'Locked - unlock the ' + r.theme + ' theme' : r.sub) + '</small></span>' +
      (r.locked ? '<span class="lock-ico" data-icon="lock"></span>' : '') + '</button>').join('');
    fx.icons.mount(host);
  }

  function renderThemes() {
    const host = $('#theme-list');
    if (!host) return;
    const cur = currentTheme().id;
    const skeleton = '<div class="theme-card skeleton" aria-disabled="true"><span class="swatch"></span><span class="sk-line"></span><span class="sk-line short"></span><em>COMING SOON</em></div>';
    host.innerHTML = THEMES.map((t) => {
      const owned = isOwned(t);
      return '<button class="theme-card' + (owned ? '' : ' locked') + '" data-theme-id="' + t.id + '" aria-pressed="' + String(owned && cur === t.id) + '">' +
        '<span class="swatch ' + t.swatch + '">' + (owned ? '' : '<span class="lock" data-icon="lock"></span>') + '</span>' +
        '<span class="t-name">' + t.name + '</span><span class="t-tag">' + t.tag + '</span>' +
        (owned ? '' : '<span class="t-price"><span data-icon="coin"></span><b>' + fmtCoins(t.cost) + '</b></span>') + '</button>';
    }).join('') + skeleton + skeleton;
    fx.icons.mount(host);
  }

  const buy = { theme: null };
  function refreshConfirm() {
    const th = buy.theme;
    if (!th) return;
    const have = wallet.coins(), need = th.cost - have;
    const msg = $('#confirm-msg'), ok = $('#confirm-ok');
    $('#confirm-cost').textContent = fmtCoins(th.cost);
    $('#confirm-have').textContent = fmtCoins(have);
    if (need > 0) {
      msg.textContent = 'Not enough Pi Coins - you need ' + fmtCoins(need) + ' more.';
      msg.className = 'c-msg bad';
      ok.disabled = true; ok.textContent = 'NOT ENOUGH';
    } else {
      msg.textContent = 'Spend ' + fmtCoins(th.cost) + ' Pi Coins? It is yours forever.';
      msg.className = 'c-msg';
      ok.disabled = false; ok.textContent = 'UNLOCK';
    }
  }
  function openConfirm(theme) {
    buy.theme = theme;
    $('#confirm-swatch').className = 'swatch ' + theme.swatch;
    $('#confirm-name').textContent = theme.name + ' + ' + audio.TRACKS[theme.bgm].name + ' music';
    refreshConfirm();
    const dlg = $('#confirm');
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
  }
  function closeConfirm() {
    const dlg = $('#confirm');
    if (typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open');
    buy.theme = null;
  }
  function doUnlock() {
    const th = buy.theme;
    if (!th) return;
    if (!wallet.unlock(th.id, th.cost)) { audio.sfx('reject'); refreshConfirm(); return; }   // not enough coins
    closeConfirm();
    audio.sfx('unlock');
    particles.burst(innerWidth / 2, innerHeight / 3, { n: 60, speed: 6, size: 6, life: 60, colors: ['#ffe066', '#39ff14', '#ffffff'] });
    toast(th.name + ' UNLOCKED!');
    equipTheme(th.id);                                        // wear it right away (its music follows in AUTO)
  }

  function initShop() {
    wallet.onChange(() => { refreshCoins(); refreshConfirm(); });

    $('#theme-list').addEventListener('click', (e) => {
      const card = e.target.closest('[data-theme-id]');
      const t = card && themeById(card.dataset.themeId);
      if (!t) return;
      if (isOwned(t)) equipTheme(t.id); else openConfirm(t);
    });
    $('#bgm-list').addEventListener('click', (e) => {
      const b = e.target.closest('[data-bgm]');
      if (!b) return;
      const id = b.dataset.bgm;
      if (id !== 'auto' && !trackOwned(id)) {
        audio.sfx('reject');
        toast('Unlock the ' + THEMES.find((x) => x.bgm === id).name + ' theme to get this track');
        return;
      }
      settings.set('bgm', id);
      syncBgm();
    });

    $('#confirm-ok').addEventListener('click', doUnlock);
    $('#confirm-cancel').addEventListener('click', closeConfirm);
    $('#confirm-close').addEventListener('click', closeConfirm);
    $('#confirm').addEventListener('click', (e) => { if (e.target === $('#confirm')) closeConfirm(); });
    $('#confirm').addEventListener('cancel', () => { buy.theme = null; });   // Esc key

    // coin chip: hover on desktop, tap-to-toggle on phones
    const btn = $('#btn-coin'), tip = $('#coin-tip');
    let hideTimer = 0;
    const showTip = (on) => {
      tip.classList.toggle('show', on);
      btn.setAttribute('aria-expanded', String(on));
      window.clearTimeout(hideTimer);
      if (on) hideTimer = window.setTimeout(() => showTip(false), 5000);
    };
    btn.addEventListener('click', () => showTip(!tip.classList.contains('show')));
    document.addEventListener('pointerdown', (e) => { if (!e.target.closest('#coin-wrap')) showTip(false); });

    // DEV: tap the logo 10 times in a row for free Pi Coins
    if (CONFIG.DEV_LOGO_COINS) {
      const logo = $('.brand');
      let taps = 0, last = 0;
      logo.addEventListener('click', () => {
        const now = performance.now();
        taps = now - last > CONFIG.LOGO_WINDOW_MS ? 1 : taps + 1;
        last = now;
        if (taps < CONFIG.LOGO_TAPS) return;
        taps = 0;
        wallet.add(CONFIG.LOGO_REWARD);
        audio.sfx('coin');
        toast('+' + CONFIG.LOGO_REWARD + ' PI COINS (DEV)');
        burstFrom(btn, { n: 28, speed: 4.5, colors: ['#ffe066', '#fff6b0', '#ffffff'] });
      });
    }
  }

  function initSettings() {
    const sw = { music: $('#set-music'), sfx: $('#set-sfx'), shake: $('#set-shake') };
    Object.keys(sw).forEach((key) => {
      setSwitch(sw[key], settings.get(key));
      sw[key].addEventListener('click', () => {
        const on = !settings.get(key);
        settings.set(key, on);
        setSwitch(sw[key], on);
        if (key === 'music') audio.setMusic(on);
        if (key === 'sfx') { audio.setSfx(on); if (on) audio.sfx('toggle_on'); }
        if (key === 'shake' && on) shake(CONFIG.SHAKE.wrong);
        if (key === 'music' && on) audio.unlock();
      });
    });
    audio.musicOn = settings.get('music');
    audio.sfxOn = settings.get('sfx');

    $('#btn-settings').addEventListener('click', () => {
      if (typeof el.settings.showModal === 'function') el.settings.showModal();
      else el.settings.setAttribute('open', '');
    });
    $('#settings-close').addEventListener('click', () => el.settings.close());
    el.settings.addEventListener('click', (e) => { if (e.target === el.settings) el.settings.close(); });

    $('#btn-theme').addEventListener('click', () => {
      const owned = THEMES.filter(isOwned);
      const next = owned[(owned.indexOf(currentTheme()) + 1) % owned.length];
      equipTheme(next.id);
      audio.sfx(next.id === 'light' ? 'toggle_on' : 'toggle_off');
    });

    $('#btn-reset-scores').addEventListener('click', (e) => {
      const b = e.currentTarget;
      if (b.dataset.armed) {
        scores.reset(); refreshMenu(); showBoard(state.boardTab);
        b.textContent = 'RESET SCORES'; delete b.dataset.armed;
      } else {
        b.dataset.armed = '1'; b.textContent = 'TAP AGAIN TO CONFIRM';
        window.setTimeout(() => { b.textContent = 'RESET SCORES'; delete b.dataset.armed; }, 3000);
      }
    });
  }

  /* -------------------------------- input -------------------------------- */
  function bindKeypad() {
    const keys = {};
    $$('.key', el.keypad).forEach((k) => {
      k.classList.add('shiny');
      if (k.dataset.key) keys[k.dataset.key] = k;
      k.addEventListener('pointerdown', (e) => {
        e.preventDefault();                       // no focus, no ghost click, no double-tap zoom
        k.classList.add('is-down');
        const up = () => { k.classList.remove('is-down'); };
        k.addEventListener('pointerup', up, { once: true });
        k.addEventListener('pointercancel', up, { once: true });
        k.addEventListener('pointerleave', up, { once: true });
        if (k.dataset.key) onDigit(k.dataset.key, k);
        else if (k.dataset.act === 'del') onBack();
        else if (k.dataset.act === 'reset') { audio.sfx('click'); startGame(state.engine.mode); }
      });
    });
    return keys;
  }

  function bindGlobal(keys) {
    // navigation + start buttons (event delegation)
    document.addEventListener('click', (e) => {
      const nav = e.target.closest('[data-nav]');
      if (nav) {
        if (nav.dataset.board) state.boardTab = nav.dataset.board;
        go(nav.dataset.nav);
        return;
      }
      const start = e.target.closest('[data-start]');
      if (start) startGame(start.dataset.start);
    });
    $('#btn-again').addEventListener('click', () => startGame(state.lastResult ? state.lastResult.mode : 'timer'));
    $$('.tab').forEach((t) => t.addEventListener('click', () => showBoard(t.dataset.tab)));

    // UI sounds: click on press, a soft tick on hover (mouse only)
    const clickable = '.btn, .chip, .menu-card, .icon-btn, .tab, .brand, button.theme-card, .switch, .coin-chip, .bgm-opt';
    document.addEventListener('pointerdown', (e) => {
      audio.unlock();
      if (e.target.closest && e.target.closest(clickable)) audio.sfx('click');
    });
    let lastHover = 0;
    document.addEventListener('pointerover', (e) => {
      if (e.pointerType !== 'mouse') return;
      const t = e.target.closest && e.target.closest(clickable);
      if (!t || t.contains(e.relatedTarget)) return;
      const now = performance.now();
      if (now - lastHover > 70) { lastHover = now; audio.sfx('hover'); }
    });

    // keyboard
    document.addEventListener('keydown', (e) => {
      audio.unlock();
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (el.settings.open) return;
      if (e.key === 'Escape' && state.screen !== 'menu') { audio.sfx('back'); go('menu'); return; }
      if (state.screen !== 'game') return;
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        const k = $('[data-act="del"]', el.keypad);
        k.classList.add('is-down'); window.setTimeout(() => k.classList.remove('is-down'), 80);
        onBack();
        return;
      }
      let ch = '';
      if (/^[0-9]$/.test(e.key)) ch = e.key;
      else if (e.key === '.' || e.code === 'NumpadDecimal') ch = '.';
      if (!ch) return;
      e.preventDefault();
      if (e.repeat) return;                       // holding a key shouldn't flood digits
      const k = keys[ch];
      if (k) { k.classList.add('is-down'); window.setTimeout(() => k.classList.remove('is-down'), 80); }
      onDigit(ch, k);
    });

    // pause the music when the tab is hidden
    document.addEventListener('visibilitychange', () => { document.hidden ? audio.suspend() : audio.resume(); });
  }

  /* --------------------------------- boot -------------------------------- */
  let background = null;
  const particles = new fx.Particles($('#fx'));

  function boot() {
    fx.icons.mount();
    fx.initShine();
    background = new fx.Background();
    buildGuide();
    initSettings();
    const saved = themeById(document.documentElement.dataset.theme || settings.get('theme'));
    const start = saved && isOwned(saved) ? saved.id : 'dark';   // never start in a theme you haven't unlocked
    if (settings.get('theme') !== start) settings.set('theme', start);
    applyTheme(start);
    renderThemes();
    initShop();
    refreshCoins();
    syncBgm();
    const keys = bindKeypad();
    bindGlobal(keys);
    showBoard('timer');
    refreshMenu();
    window.setInterval(tick, 50);
  }

  boot();

  // tiny hook for automated tests / debugging (harmless in production)
  window.__piGame = { state, go, startGame, onDigit, PI };
})();
