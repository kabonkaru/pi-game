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
    VERSION: '1.5.5',
    ABOUT: { developer: '', repo: '' },   // shown in Settings > About Us only when filled in
    COINS_PER_SCORE: 0.01,   // PLACEHOLDER: Pi Coins earned per run = final score x this
    DECIMALS: 1000,          // digits after "3."
    SHAKE: { key: 2, milestone: 6, wrong: 9, finish: 12 },   // pixels (inside the page only)
  };

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  /* ------------------------ themes (each bundles a music track) ------------------------ */
  const THEMES = [
    { id: 'default-dark',  name: 'MIDNIGHT',       tag: 'DEFAULT',   rarity: 'default',   swatch: 'sw-default-dark',  bgm: 'chill', free: true, meta: '#10131c', tagline: 'how many digits can you remember?' },
    { id: 'default-light', name: 'DAYLIGHT',       tag: 'DEFAULT',   rarity: 'default',   swatch: 'sw-default-light', bgm: 'chill', free: true, meta: '#eef3fb', tagline: 'how many digits can you remember?' },
    { id: 'plain-ruby',    name: 'RUBY',           tag: 'COMMON',    rarity: 'common',    swatch: 'sw-plain-ruby',    bgm: 'chill', meta: '#1a080e', tagline: 'seeing red? keep typing' },
    { id: 'plain-ocean',   name: 'OCEAN',          tag: 'COMMON',    rarity: 'common',    swatch: 'sw-plain-ocean',   bgm: 'chill', meta: '#071a24', tagline: 'dive into the digits' },
    { id: 'plain-mint',    name: 'MINT',           tag: 'COMMON',    rarity: 'common',    swatch: 'sw-plain-mint',    bgm: 'chill', meta: '#06231a', tagline: 'cool head, fresh digits' },
    { id: 'plain-grape',   name: 'GRAPE',          tag: 'COMMON',    rarity: 'common',    swatch: 'sw-plain-grape',   bgm: 'chill', meta: '#140a24', tagline: 'sweet digits ahead' },
    { id: 'plain-sun',     name: 'SUNNY',          tag: 'COMMON',    rarity: 'common',    swatch: 'sw-plain-sun',     bgm: 'chill', meta: '#241c06', tagline: 'sunny side up' },
    { id: 'dark',          name: 'DEEP SPACE',     tag: 'EPIC',      rarity: 'epic',      swatch: 'sw-dark',          bgm: 'deep-space', meta: '#05041a', tagline: 'how many digits can you remember?' },
    { id: 'light',         name: 'DREAMY DAY',     tag: 'LEGENDARY', rarity: 'legendary', swatch: 'sw-light',         bgm: 'dreamy-day', meta: '#cfe6ff', tagline: 'sunny skies and a few digits of pi' },
    { id: 'singularity',   name: 'SINGULARITY',    tag: 'GODLY', rarity: 'godly',     swatch: 'sw-singularity',   bgm: 'singularity', meta: '#000000', tagline: 'stare into the void' },
    { id: 'halloween',     name: 'HAPI HALLOWEEN', tag: 'MYTHIC',    rarity: 'mythic',    swatch: 'sw-halloween',     bgm: 'haunted',    meta: '#0b0218', tagline: 'HaPi Halloween, woo!' },
    { id: 'terminal',      name: 'PHOSPHOR',       tag: 'MYTHIC', rarity: 'mythic',    swatch: 'sw-terminal',      bgm: 'phosphor',   meta: '#9bbc0f', tagline: 'press start to remember pi' },
    { id: 'hw-pumpkin', name: 'PUMPKIN', tag: 'COMMON', rarity: 'common', swatch: 'sw-hw-pumpkin', bgm: 'trick', meta: '#1e0f02', tagline: 'trick or type!' },
    { id: 'hw-witch', name: 'WITCHING HOUR', tag: 'COMMON', rarity: 'common', swatch: 'sw-hw-witch', bgm: 'trick', meta: '#150a22', tagline: 'midnight digits brew best' },
    { id: 'hw-slime', name: 'TOXIC SLIME', tag: 'COMMON', rarity: 'common', swatch: 'sw-hw-slime', bgm: 'trick', meta: '#0d1a05', tagline: 'slime time, keep typing' },
    { id: 'hw-blood', name: 'BLOOD MOON', tag: 'COMMON', rarity: 'common', swatch: 'sw-hw-blood', bgm: 'trick', meta: '#1c060a', tagline: 'the moon is watching' },
    { id: 'hw-fog', name: 'GRAVEYARD FOG', tag: 'COMMON', rarity: 'common', swatch: 'sw-hw-fog', bgm: 'trick', meta: '#0c1517', tagline: 'something is out there' },
    { id: 'hw-backrooms', name: 'THE BACKROOMS', tag: 'LEGENDARY', rarity: 'legendary', swatch: 'sw-hw-backrooms', bgm: 'backrooms', meta: '#8a7430', tagline: 'you noclipped out of reality' },
    { id: 'hw-eldritch', name: 'ELDRITCH SKY', tag: 'GODLY', rarity: 'godly', swatch: 'sw-hw-eldritch', bgm: 'eldritch', meta: '#05020a', tagline: 'it knows your digits' },
    { id: 'hw-manor', name: 'HAUNTED MANOR', tag: 'EPIC', rarity: 'epic', swatch: 'sw-hw-manor', bgm: 'manor', meta: '#1a0f12', tagline: "the portraits are watching" },
    { id: 'hw-carnival', name: 'CURSED CARNIVAL', tag: 'MYTHIC', rarity: 'mythic', swatch: 'sw-hw-carnival', bgm: 'carnival', meta: '#1a0830', tagline: "step right up... if you dare" },
    { id: 'ex-neon', name: 'NEON GRID', tag: 'EPIC', rarity: 'epic', swatch: 'sw-ex-neon', bgm: 'chill', meta: '#12002e', tagline: "type like it's 1985" },
    { id: 'ex-sea', name: 'DEEP SEA', tag: 'LEGENDARY', rarity: 'legendary', swatch: 'sw-ex-sea', bgm: 'chill', meta: '#020b1c', tagline: "digits float up like bubbles" },
    { id: 'ex-aurora', name: 'AURORA', tag: 'MYTHIC', rarity: 'mythic', swatch: 'sw-ex-aurora', bgm: 'chill', meta: '#050c1a', tagline: "a sky full of digits" },
  ];
  const themeById = (id) => THEMES.find((t) => t.id === id);
  const isOwned = (t) => !!t.free || wallet.owns(t.id);
  const currentTheme = () => themeById(document.documentElement.dataset.theme) || THEMES[0];
  const fmtCoins = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  const PI = computePi(CONFIG.DECIMALS);
  const el = {
    stage: $('#stage'),
    modeChip: $('#mode-chip'), clock: $('#clock'), meter: $('#meter-fill'),
    lcd: $('#lcd'), lcdText: $('#lcd-text'), lcdPop: $('#lcd-pop'),
    score: $('#score'), best: $('#best'), combo: $('#combo'), tier: $('#tier'), clockPop: $('#clock-pop'), hint: $('#hint'),
    keypad: $('#keypad'), flash: $('#flash'),
    settings: $('#settings'),
  };

  const state = {
    screen: 'menu', engine: null, round: 0,
    warned: -1, keeper: null, lastTip: '',
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
    const prev = state.screen;
    state.round++;                            // cancels any pending "show result"
    $$('.screen').forEach((s) => s.classList.toggle('is-active', s.dataset.screen === name));
    state.screen = name;
    document.body.dataset.screen = name;
    window.scrollTo(0, 0);
    if (name === 'menu') refreshMenu();
    if (name === 'board') showBoard(state.boardTab);
    if (name === 'shop') { audio.setTrack('shop'); PiGame.shop.render(); }   // the shop has its own music
    else if (prev === 'shop') syncBgm();
  }

  function refreshMenu() {
    $('#best-timer').textContent = scores.best('timer');
    $('#best-zen').textContent = scores.best('zen');
  }

  /* -------------------------------- game --------------------------------- */
  function startGame(mode) {
    state.round++;
    state.engine = new PiEngine(mode, PI);
    state.warned = -1;
    state.keeper = new ScoreKeeper({ mode });      // owns the clock: Zen resets to 10s, Timer is a 3:00 bank
    state.best = scores.best(mode);
    audio.setIntensity(0);
    el.modeChip.textContent = mode === 'timer' ? 'TIMER' : 'ZEN';
    el.clockPop.textContent = '';
    el.modeChip.dataset.mode = mode;
    el.clock.textContent = mode === 'timer' ? fmtClock(SCORING.TIMER_MS / 1000) : (SCORING.ZEN_MS / 1000).toFixed(1) + 's';
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
      text = 'Every correct digit resets the clock to ' + (SCORING.ZEN_MS / 1000) + 's.';
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
    const k = state.keeper;
    if (eng.justStarted) { k.beginTimer(now); audio.sfx('go'); }       // Timer mode: the 3:00 clock starts on this digit
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
    if (background) {                                                          // Singularity reacts to your typing
      if (hit && hit.isNew) background.react(eng.score % 10 === 0 ? 'milestone' : 'key', k.currentCombo);
      else if (ev === 'wrong' || ev === 'wrong_over') background.react('wrong');
    }
    render(ev === 'ok' || ev === 'warmup_ok' || ev === 'warmup_done' || ev === 'complete');
    if (hit && hit.isNew) {                   // speed-tier popup
      el.tier.classList.remove('pop'); void el.tier.offsetWidth; el.tier.classList.add('pop');
      if (hit.tier === 'S' && eng.score % 5 !== 0) fx.floatText(el.lcdPop, 'S +' + hit.points, 'good');
      if (hit.timeAdded > 0) {                // Timer mode: show the time earned by this digit
        el.clockPop.textContent = '+' + (hit.timeAdded / 1000).toFixed(2) + 's';
        el.clockPop.classList.remove('go'); void el.clockPop.offsetWidth; el.clockPop.classList.add('go');
      }
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
      if (background) background.react('over');
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
    const k = state.keeper;
    if (!k.deadline) return;                    // Timer mode: the clock hasn't started yet
    const left = k.left(now);
    if (left <= 0) {
      el.clock.textContent = eng.mode === 'timer' ? '00:00' : '0.0s'; setMeter(0);
      finishRound(eng.mode === 'timer' ? 'time' : 'timeout');
      return;
    }
    const sec = Math.ceil(left / 1000);
    if (eng.mode === 'timer') {                 // 3:00 bank: big mm:ss, warnings in the last 10s
      el.clock.textContent = fmtClock(sec);
      el.clock.classList.toggle('danger', left <= 10000);
      if (sec <= 10 && sec !== state.warned) { state.warned = sec; audio.sfx('warn', { urgent: sec <= 3 }); }
      if (sec > 10) state.warned = -1;
    } else {                                    // Zen: 10.0s, resets on every correct digit
      el.clock.textContent = (left / 1000).toFixed(1) + 's';
      el.clock.classList.toggle('danger', left <= 3000);
      if (sec <= 3 && sec !== state.warned) { state.warned = sec; audio.sfx('warn', { urgent: true }); }
      if (sec > 3) state.warned = -1;
    }
    setMeter(left / k.maxMs);
  }

  /* ------------------------------- results ------------------------------- */
  // Game Over feedback: [label, text], chosen by how many digits you reached.
  // (Fact-checked: NASA/JPL = 15 decimal places; Indiana 1897 = passed the House, shelved by the Senate;
  //  Guinness record = 70,000 digits, blindfolded, nearly 10 hours.)
  const FEEDBACK = [
    { max: 9, items: [
      ['DID YOU KNOW?', 'Most people only remember a handful of digits of Pi, like 3.14159!'],
      ['TIP', "Try chunking digits into groups of 3 or 4 in your mind (e.g., '141', '592', '653')!"],
    ] },
    { max: 30, items: [
      ['GREAT JOB!', "You've gone well beyond what most people can recite from memory."],
      ['PI FACT', "NASA's JPL uses just 15 decimal places of Pi for its highest-precision interplanetary navigation!"],
    ] },
    { max: 50, items: [
      ['MEMORY WALL BROKEN!', "You broke past the 'Memory Wall'! Very few people can recite 30+ digits of Pi."],
      ['PI FACT', "In 1897, Indiana's House passed a bill that would have set Pi to about 3.2. The Senate shelved it, so it never became law!"],
    ] },
    { max: Infinity, items: [
      ['LEGENDARY RECALL!', 'Memory athletes train for exactly this kind of streak.'],
      ['PI FACT', 'The Guinness record for memorizing Pi is 70,000 digits, recited blindfolded in nearly 10 hours!'],
    ] },
  ];
  function pickTip(digits) {
    const group = FEEDBACK.find((g) => digits <= g.max);
    let i = Math.floor(Math.random() * group.items.length);
    if (group.items.length > 1 && state.lastTip === group.max + ':' + i) i = (i + 1) % group.items.length;   // don't repeat back-to-back
    state.lastTip = group.max + ':' + i;
    return group.items[i];
  }

  function showResult() {
    const eng = state.engine;
    const mode = eng.mode, sum = state.keeper.summary(), score = sum.totalScore;
    const prevBest = scores.best(mode);
    const [title, sub] = {
      time: ["TIME'S UP!", 'Your clock ran out.'],
      wrong: ['GAME OVER', 'You typed ' + eng.wrongChar + ' - the next digit was ' + eng.expectedChar + '.'],
      timeout: ['TOO SLOW!', 'No correct digit within 10 seconds.'],
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
    const tip = pickTip(sum.totalDigits), box0 = $('#res-tip');
    box0.textContent = '';
    const tb = document.createElement('b'), tt = document.createElement('span');
    tb.textContent = tip[0]; tt.textContent = tip[1];
    box0.appendChild(tb); box0.appendChild(tt);
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
    $$('[data-tab]').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === mode)));   // leaderboard tabs only (Settings tabs use data-stab)
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
    const tg = $('.tagline');
    if (tg) tg.textContent = t.tagline;
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t.meta);
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

  function refreshCoins() { $('#coin-count').textContent = fmtCoins(wallet.coins()); $('#themes-coins').textContent = fmtCoins(wallet.coins()); }

  const trackOwners = (id) => THEMES.filter((x) => x.bgm === id);
  function trackOwned(id) { return trackOwners(id).some(isOwned); }
  function trackFor() {
    const pick = settings.get('bgm');
    if (pick !== 'auto' && pick !== 'none' && audio.TRACKS[pick] && !audio.TRACKS[pick].hidden && trackOwned(pick)) return pick;
    return currentTheme().bgm;                                // AUTO: the track bundled with the theme
  }
  function applyMusic() { audio.setMusic(!!settings.get('music') && settings.get('bgm') !== 'none'); }
  function syncBgm() { audio.setTrack(trackFor()); applyMusic(); renderBgm(); }

  function updateAudioSummary() {
    const pick = settings.get('bgm'), on = settings.get('music') && pick !== 'none';
    $('#audio-current').textContent = (on ? 'Music on - ' : 'Music off - ') + (pick === 'none' ? 'NONE' : pick === 'auto' ? 'AUTO' : audio.TRACKS[trackFor()].name);
  }

  function renderBgm() {                                      // "Audio & BGM" window: track list
    const host = $('#bgm-list');
    if (!host) return;
    const pick = settings.get('bgm');
    const chosen = pick === 'none' || (pick !== 'auto' && audio.TRACKS[pick] && !audio.TRACKS[pick].hidden && trackOwned(pick)) ? pick : 'auto';
    const rows = [{ id: 'auto', name: 'AUTO', sub: 'Follows your theme', locked: false }, { id: 'none', name: 'NONE', sub: 'Silent', locked: false }].concat(
      Object.keys(audio.TRACKS).filter((id) => !audio.TRACKS[id].hidden)
        .sort((a, b) => THEMES.findIndex((t) => t.bgm === a) - THEMES.findIndex((t) => t.bgm === b)).map((id) => {   // same order as the themes (default music first)
        const owners = trackOwners(id);
        return { id, name: audio.TRACKS[id].name, locked: !owners.some(isOwned),
                 sub: owners.some((t) => t.free) ? 'Default music' : 'Bundled with ' + owners.map((t) => t.name).join(' / ') };
      }));
    host.innerHTML = rows.map((r) =>
      '<button class="bgm-opt' + (r.locked ? ' locked' : '') + '" role="radio" data-bgm="' + r.id + '" aria-checked="' + String(r.id === chosen) + '">' +
      '<span><b>' + r.name + '</b><small>' + (r.locked ? 'Locked - find it in the Shop' : r.sub) + '</small></span>' +
      (r.locked ? '<span class="lock-ico" data-icon="lock"></span>' : '') + '</button>').join('');
    fx.icons.mount(host);
    updateAudioSummary();
  }

  function renderThemes() {                                   // "Themes" window: theme cards
    const host = $('#theme-grid');
    if (!host) return;
    const cur = currentTheme().id;
    host.innerHTML = THEMES.map((t) => {
      const owned = isOwned(t);
      return '<button class="theme-card rarity-' + t.rarity + (owned ? '' : ' locked') + '" data-theme-id="' + t.id + '" aria-pressed="' + String(owned && cur === t.id) + '">' +
        '<span class="swatch ' + t.swatch + '">' + (owned ? '' : '<span class="lock" data-icon="lock"></span>') + '</span>' +
        '<span class="t-name">' + t.name + '</span><span class="t-tag">' + t.tag + '</span>' +
        (owned ? (cur === t.id ? '<span class="t-worn">WEARING</span>' : '') : '<span class="t-price">FIND IN SHOP</span>') + '</button>';
    }).join('');
    fx.icons.mount(host);
    $('#themes-current').textContent = currentTheme().name;
  }

  function initShop() {
    wallet.onChange(() => refreshCoins());

    $('#theme-grid').addEventListener('click', (e) => {
      const card = e.target.closest('[data-theme-id]');
      const t = card && themeById(card.dataset.themeId);
      if (!t) return;
      if (isOwned(t)) { equipTheme(t.id); audio.sfx('toggle_on'); return; }
      audio.sfx('reject'); toast(t.name + ' comes from the Shop');          // locked: send them to the shop
      $$('dialog[open]').forEach((d) => d.close()); go('shop');
    });
    $('#bgm-list').addEventListener('click', (e) => {
      const b = e.target.closest('[data-bgm]');
      if (!b) return;
      const id = b.dataset.bgm;
      if (id !== 'auto' && id !== 'none' && !trackOwned(id)) {
        audio.sfx('reject');
        toast('Find ' + trackOwners(id).map((t) => t.name).join(' / ') + ' in the Shop to get this track');
        return;
      }
      settings.set('bgm', id);
      syncBgm();
    });

    PiGame.shop.init({
      fmtCoins, themeById, toast, go, equipTheme, openModal,
      mountIcons: (scope) => fx.icons.mount(scope),
      refreshAll: () => { refreshCoins(); renderThemes(); renderBgm(); },
    });

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

  }

  /* ---- modal helpers: sub-windows, tabs, scroll fade, About ---- */
  function openModal(id) {
    const d = $('#' + id);
    if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
    updateFades(d);
    window.requestAnimationFrame(() => updateFades(d));
  }
  function selectTab(name) {
    $$('[data-stab]').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.stab === name)));
    $('#spanel-general').hidden = name !== 'general';
    $('#spanel-about').hidden = name !== 'about';
    const body = $('#settings .modal-body'); body.scrollTop = 0;
    updateFades($('#settings'));
  }
  // soft top/bottom fade that tells you "there is more": --fade-top / --fade-bot are 0 at the ends of the scroll
  function updateFades(root) { $$('.fade-scroll', root).forEach((b) => b._fade && b._fade()); }
  function initFades() {
    $$('.fade-scroll').forEach((b) => {
      const upd = () => {
        const max = b.scrollHeight - b.clientHeight;
        b.style.setProperty('--fade-top', b.scrollTop > 2 ? '30px' : '0px');
        b.style.setProperty('--fade-bot', max > 2 && b.scrollTop < max - 2 ? '30px' : '0px');
      };
      b._fade = upd;
      b.addEventListener('scroll', upd, { passive: true });
      if ('ResizeObserver' in window) new ResizeObserver(upd).observe(b);
      upd();
    });
  }
  function initAbout() {
    const v = 'v' + CONFIG.VERSION;
    $('#app-ver').textContent = v; $('#about-ver').textContent = v;
    if (CONFIG.ABOUT.developer) { $('#about-dev').textContent = CONFIG.ABOUT.developer; $('#about-made').hidden = false; }
    if (CONFIG.ABOUT.repo) { $('#about-repo').href = CONFIG.ABOUT.repo; $('#about-repo-wrap').hidden = false; }
  }

  function initSettings() {
    const sw = { music: $('#set-music'), sfx: $('#set-sfx'), shake: $('#set-shake') };
    Object.keys(sw).forEach((key) => {
      setSwitch(sw[key], settings.get(key));
      sw[key].addEventListener('click', () => {
        const on = !settings.get(key);
        settings.set(key, on);
        setSwitch(sw[key], on);
        if (key === 'music') { applyMusic(); $('#set-music-vol').disabled = !on; updateAudioSummary(); }
        if (key === 'sfx') { audio.setSfx(on); $('#set-sfx-vol').disabled = !on; if (on) audio.sfx('toggle_on'); }
        if (key === 'shake' && on) shake(CONFIG.SHAKE.wrong);
        if (key === 'music' && on) audio.unlock();
      });
    });
    audio.musicOn = settings.get('music') && settings.get('bgm') !== 'none';
    audio.sfxOn = settings.get('sfx');

    // volume sliders (the mute toggles above switch them off)
    [['musicVol', '#set-music-vol', 'setMusicVolume', 'music'], ['sfxVol', '#set-sfx-vol', 'setSfxVolume', 'sfx']].forEach(([key, sel, fn, onKey]) => {
      const r = $(sel), out = $('#' + r.id.replace('set-', '') + '-out');
      r.value = settings.get(key); out.textContent = r.value + '%'; r.disabled = !settings.get(onKey);
      audio[fn](+r.value);
      r.addEventListener('input', () => { out.textContent = r.value + '%'; audio[fn](+r.value); settings.set(key, +r.value); });
      r.addEventListener('change', () => { if (key === 'sfxVol') audio.sfx('toggle_on'); });     // let you hear the level
    });

    $('#btn-settings').addEventListener('click', () => {
      selectTab('general');
      openModal('settings');
    });
    $('#settings-close').addEventListener('click', () => el.settings.close());
    $$('dialog.modal').forEach((d) => {                       // click the dark backdrop to close just that window
      d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
    });
    $$('[data-close]').forEach((b) => b.addEventListener('click', () => $('#' + b.dataset.close).close()));
    $('#open-themes').addEventListener('click', () => openModal('themes-modal'));
    $('#open-audio').addEventListener('click', () => openModal('audio-modal'));
    $$('[data-stab]').forEach((t) => t.addEventListener('click', () => selectTab(t.dataset.stab)));
    initFades();
    initAbout();

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
      const soon = e.target.closest('[data-soon]');
      if (soon) {                                   // locked teaser card: wiggle + toast
        audio.sfx('reject'); toast('CHAOS MODE: COMING SOON!');
        soon.classList.remove('wiggle'); void soon.offsetWidth; soon.classList.add('wiggle');
        return;
      }
      const start = e.target.closest('[data-start]');
      if (start) startGame(start.dataset.start);
    });
    $('#btn-again').addEventListener('click', () => startGame(state.lastResult ? state.lastResult.mode : 'timer'));
    $$('[data-tab]').forEach((t) => t.addEventListener('click', () => showBoard(t.dataset.tab)));

    // UI sounds: click on press, a soft tick on hover (mouse only)
    const clickable = '.btn, .chip, .menu-card, .icon-btn, .tab, .brand, .hero-pi, .switch, .coin-chip, .select select';
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
      if (document.querySelector('dialog[open]') || PiGame.shop.isOpen()) return;     // any open window swallows the game keys
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
    const start = saved && isOwned(saved) ? saved.id : 'default-dark';   // never start in a theme you haven't unlocked
    if (settings.get('theme') !== start) settings.set('theme', start);
    applyTheme(start);
    renderThemes();
    initShop();
    refreshCoins();
    initTips();
    syncBgm();
    const keys = bindKeypad();
    bindGlobal(keys);
    showBoard('timer');
    refreshMenu();
    window.setInterval(tick, 50);
  }

  // v1.5.1: lock page scroll while any dialog or the chest overlay is open
  const syncLock = () => document.documentElement.classList.toggle('modal-open',
    !!document.querySelector('dialog[open]') || !$('#pull').hidden);
  new MutationObserver(syncLock).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['open', 'hidden'] });

  boot();

  // tiny hook for automated tests / debugging (harmless in production)
  window.__piGame = { state, go, startGame, onDigit, PI };
  installCheats();

  /* ---- console cheats (v1.5.2): type these in the browser console ---- */
  function installCheats() {
    const K = { scores: 'pigame.scores.v2', wallet: 'pigame.wallet.v1', settings: 'pigame.settings.v1' };
    window.coins = (n) => {                                   // coins(251) = +251 Pi Coins
      n = Math.floor(Number(n));
      if (!(n > 0)) return 'coins(n): n must be a positive number';
      wallet.add(n); refreshCoins(); audio.sfx('coin');
      return '+' + fmtCoins(n) + ' Pi Coins. Balance: ' + fmtCoins(wallet.coins());
    };
    window.unlockall = (on) => {                              // unlockall(true) = every theme; unlockall(false) = relock all (coins kept)
      if (on === false) {
        const w = JSON.parse(localStorage.getItem(K.wallet) || '{}');
        w.inv = {}; localStorage.setItem(K.wallet, JSON.stringify(w)); location.reload();
        return 'relocking all themes...';
      }
      let n = 0;
      THEMES.forEach((t) => { if (!t.free && !wallet.owns(t.id)) { wallet.grant(t.id); n++; } });
      renderThemes(); renderBgm();
      return n ? 'Unlocked ' + n + ' theme(s).' : 'Everything was already unlocked.';
    };
    window.totalreset = () => {                               // totalreset() = delete scores, Pi Coins and the theme collection
      if (!window.confirm('Delete ALL Pi Game data (scores, Pi Coins and theme collection)?')) return 'cancelled';
      localStorage.setItem(K.scores, '{}');
      localStorage.setItem(K.wallet, JSON.stringify({ coins: 0, inv: {}, pulls: 0, mig: 2 }));   // mig:2 so the old free-theme migration does not re-run
      const s = JSON.parse(localStorage.getItem(K.settings) || '{}'); s.theme = 'default-dark'; s.bgm = 'auto';
      localStorage.setItem(K.settings, JSON.stringify(s)); location.reload();
      return 'resetting...';
    };
  }

  /* ---- one shared tooltip for [data-tip] (desktop hover only) ---- */
  function initTips() {
    const tip = document.createElement('div');
    tip.className = 'tip'; tip.setAttribute('role', 'tooltip'); tip.hidden = true;
    document.body.appendChild(tip);
    const hide = () => { tip.hidden = true; };
    document.addEventListener('pointerover', (e) => {
      if (e.pointerType !== 'mouse') return;
      const t = e.target.closest && e.target.closest('[data-tip]');
      if (!t) { hide(); return; }
      tip.textContent = t.dataset.tip; tip.hidden = false;
      const r = t.getBoundingClientRect(), w = tip.offsetWidth;
      tip.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + 'px';
      tip.style.top = (r.bottom + 10) + 'px';
    });
    document.addEventListener('pointerout', (e) => { if (!e.relatedTarget) hide(); });
    document.addEventListener('pointerdown', hide);
  }
})();
