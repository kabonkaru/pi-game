/* ==========================================================================
   app.js  -  wires everything together: screens, game loop, juice,
   leaderboards, settings + themes.
   ========================================================================== */
(function () {
  'use strict';

  const { PiEngine, computePi, WARMUP } = PiGame.pi;
  const { settings, scores } = PiGame.store;
  const audio = PiGame.audio;
  const fx = PiGame.fx;

  /* ------------------------------ config -------------------------------- */
  const CONFIG = {
    TIMER_SECONDS: 180,      // Timer mode length
    ZEN_THINK_SECONDS: 10,   // Zen mode: time allowed per digit
    DECIMALS: 1000,          // digits after "3."
    SHAKE: { key: 2, milestone: 6, wrong: 9, finish: 12 },   // pixels (inside the page only)
  };

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const PI = computePi(CONFIG.DECIMALS);
  const el = {
    stage: $('#stage'),
    modeChip: $('#mode-chip'), clock: $('#clock'), meter: $('#meter-fill'),
    lcd: $('#lcd'), lcdText: $('#lcd-text'), lcdPop: $('#lcd-pop'),
    score: $('#score'), best: $('#best'), combo: $('#combo'), hint: $('#hint'),
    keypad: $('#keypad'), flash: $('#flash'),
    settings: $('#settings'),
  };

  const state = {
    screen: 'menu', engine: null, round: 0,
    deadline: 0, think: 0, warned: -1,
    combo: 0, best: 0, boardTab: 'timer', lastResult: null,
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
    state.deadline = 0; state.think = 0; state.warned = -1; state.combo = 0;
    state.best = scores.best(mode);
    audio.setIntensity(0);
    el.modeChip.textContent = mode === 'timer' ? 'TIMER' : 'ZEN';
    el.modeChip.dataset.mode = mode;
    el.clock.textContent = mode === 'timer' ? fmtClock(CONFIG.TIMER_SECONDS) : '--';
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
    el.score.textContent = eng.score;
    el.best.textContent = Math.max(state.best, eng.score);
    el.combo.textContent = state.combo;
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
      text = CONFIG.ZEN_THINK_SECONDS + ' seconds per digit. Do not blink.';
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
    if (eng.mode === 'zen' && (ev === 'warmup_done' || ev === 'ok')) {
      state.think = now + CONFIG.ZEN_THINK_SECONDS * 1000;
    }

    if (ev === 'reject') {
      render();
      el.hint.textContent = 'Not 3.14 - try again.';
      el.hint.className = 'hint bad';
      audio.sfx('reject'); lcdFlash('bad'); flash('bad'); shake(CONFIG.SHAKE.wrong);
      burstFrom(keyEl, { n: 8, colors: ['#ff5470', '#ffffff'] });
      return;
    }

    if (ev === 'ok') state.combo++;
    else if (ev === 'wrong' || ev === 'wrong_over') state.combo = 0;
    audio.setIntensity(Math.min(1, state.combo / 60));
    render(ev === 'ok' || ev === 'warmup_ok' || ev === 'warmup_done' || ev === 'complete');

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
          burstFrom(keyEl, { n: 7 + Math.min(10, Math.floor(state.combo / 8)) });
          shake(CONFIG.SHAKE.key);
          if (state.combo > 0 && state.combo % 5 === 0) fx.floatText(el.lcdPop, 'COMBO x' + state.combo, 'good');
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
    if (state.engine.backspace()) { audio.sfx('del'); render(); }
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
    } else {
      if (!state.think) return;
      const left = state.think - now;
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
      setMeter(left / (CONFIG.ZEN_THINK_SECONDS * 1000));
    }
  }

  /* ------------------------------- results ------------------------------- */
  function showResult() {
    const eng = state.engine;
    const mode = eng.mode, score = eng.score;
    const [title, sub] = {
      time: ["TIME'S UP!", 'Your 3 minutes are over.'],
      wrong: ['GAME OVER', 'You typed ' + eng.wrongChar + ' - the next digit was ' + eng.expectedChar + '.'],
      timeout: ['TOO SLOW!', 'No digit within ' + CONFIG.ZEN_THINK_SECONDS + ' seconds.'],
      complete: ['PERFECT PI!', 'All ' + CONFIG.DECIMALS + ' decimals. Legend.'],
    }[eng.reason] || ['GAME OVER', ''];

    $('#res-title').textContent = title;
    $('#res-sub').textContent = sub;
    $('#res-score').textContent = score;
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

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'light' ? '#cfe6ff' : '#05041a');
    fx.icons.set($('#btn-theme [data-icon]'), theme === 'light' ? 'moon' : 'sun');
    $('#btn-theme').setAttribute('aria-label', theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
    $$('[data-theme-pick]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.themePick === theme)));
    if (background) background.onTheme();
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
      const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
      settings.set('theme', next);
      applyTheme(next);
      audio.sfx(next === 'light' ? 'toggle_on' : 'toggle_off');
    });
    $$('[data-theme-pick]').forEach((b) => b.addEventListener('click', () => {
      settings.set('theme', b.dataset.themePick);
      applyTheme(b.dataset.themePick);
    }));

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
    const clickable = '.btn, .chip, .menu-card, .icon-btn, .tab, .brand, button.theme-card, .switch';
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
    applyTheme(document.documentElement.dataset.theme || settings.get('theme'));
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
