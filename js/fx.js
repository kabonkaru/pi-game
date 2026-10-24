/* ==========================================================================
   fx.js  -  all the visual juice
   * icons      : tiny pixel icons drawn from ASCII bitmaps (crisp at any size)
   * Background : parallax stars / sparkles / shooting stars + pixel planets
   * Particles  : pixel confetti that bursts from the keys
   * shine      : credit-card style glare + tilt that follows the pointer
   * shake      : a small shake of a page element (never the whole window)
   ========================================================================== */
(function (root) {
  'use strict';

  const NS = (root.PiGame = root.PiGame || {});
  const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ===================================================== pixel icons ====== */
  function grid(w, h, fn) {
    const rows = [];
    for (let y = 0; y < h; y++) {
      let r = '';
      for (let x = 0; x < w; x++) r += fn(x - (w - 1) / 2, y - (h - 1) / 2, x, y) ? '#' : '.';
      rows.push(r);
    }
    return rows;
  }
  const ICONS = {
    pi: [
      '#############',
      '#############',
      '..###...###..',
      '..###...###..',
      '..###...###..',
      '..###...###..',
      '..###...###..',
      '..###...####.',
      '..###....####',
    ],
    note: [
      '...#.....',
      '...##....',
      '...#.#...',
      '...#..#..',
      '...#.....',
      '...#.....',
      '.###.....',
      '####.....',
      '.##......',
    ],
    speaker: [
      '...#.....',
      '..##..#..',
      '####...#.',
      '####.#.#.',
      '####.#.#.',
      '####.#.#.',
      '####...#.',
      '..##..#..',
      '...#.....',
    ],
    sun: [
      '....#....',
      '.#..#..#.',
      '...###...',
      '..#####..',
      '#.#####.#',
      '..#####..',
      '...###...',
      '.#..#..#.',
      '....#....',
    ],
    moon: grid(9, 9, (dx, dy) => {
      const outer = dx * dx + dy * dy <= 17;
      const cut = (dx - 2.4) * (dx - 2.4) + (dy + 1.6) * (dy + 1.6) <= 12;
      return outer && !cut;
    }),
    coin: [                       // Pi Coin: a disc with a pi cut out of it
      '...#####...',
      '..#######..',
      '.#########.',
      '###.....###',
      '####.#.####',
      '####.#.####',
      '####.#.####',
      '####.#..###',
      '.#########.',
      '..#######..',
      '...#####...',
    ],
    lock: [
      '..#####..',
      '.##...##.',
      '.#.....#.',
      '.#.....#.',
      '#########',
      '#########',
      '####.####',
      '####.####',
      '#########',
    ],
    term: [                       // ">_" prompt
      '#........',
      '##.......',
      '.##......',
      '..##.....',
      '.##......',
      '##.......',
      '#..#####.',
      '.........',
    ],
    gear: grid(11, 11, (dx, dy) => {
      const d = Math.sqrt(dx * dx + dy * dy);
      const ring = d <= 3.7 && d >= 1.8;
      const axis = (dx === 0 || dy === 0) && d <= 5 && d >= 3;
      const diag = Math.abs(dx) === Math.abs(dy) && Math.abs(dx) === 3;
      return ring || axis || diag;
    }),
  };

  function bitmapToPath(rows) {
    let d = '';
    rows.forEach((r, y) => {
      let x = 0;
      while (x < r.length) {
        if (r[x] === '#') {
          const s = x;
          while (x < r.length && r[x] === '#') x++;
          d += 'M' + s + ' ' + y + 'h' + (x - s) + 'v1h-' + (x - s) + 'z';
        } else x++;
      }
    });
    return d;
  }

  function iconSvg(name, fill) {
    const rows = ICONS[name];
    if (!rows) return '';
    return '<svg class="px" viewBox="0 0 ' + rows[0].length + ' ' + rows.length +
      '" shape-rendering="crispEdges" aria-hidden="true" focusable="false"><path fill="' +
      (fill || 'currentColor') + '" d="' + bitmapToPath(rows) + '"/></svg>';
  }

  const icons = {
    ICONS,
    set(el, name) { el.innerHTML = iconSvg(name); },
    mount(scope) {
      (scope || document).querySelectorAll('[data-icon]').forEach((el) => {
        if (el.dataset.icon === 'pi-hero') {
          el.innerHTML = iconSvg('pi', 'url(#piGrad)');
        } else {
          el.innerHTML = iconSvg(el.dataset.icon);
        }
      });
    },
  };

  /* ================================================ pixel planet art ====== */
  function hex(c) {
    return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  }
  function mix(a, b, t) {
    const A = hex(a), B = hex(b);
    return 'rgb(' + A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',') + ')';
  }

  const PALETTES = {
    dark: {
      planet: { bands: ['#7b5cff', '#9a7bff', '#ff7bd5', '#b66bff', '#ff9be6'], shade: '#1a0b45', ring: ['#ffd6f5', '#c7a4ff'] },
      moon: { base: '#d9d4ff', crater: '#a9a2e0', shade: '#4b4580' },
    },
    light: {
      planet: { bands: ['#ff9ec7', '#ffb7a0', '#ffd08a', '#ffa4d6', '#ffc2b5'], shade: '#b45c9a', ring: ['#ffffff', '#b9a7ff'] },
      moon: { base: '#fff6d9', crater: '#ecd9a4', shade: '#c9a96a' },
    },
  };

  PALETTES.terminal = {         // PHOSPHOR: green CRT planet + moon
    planet: { bands: ['#0b6b27', '#13a53f', '#39ff14', '#0f8a33', '#7dff6a'], shade: '#00170a', ring: ['#d8ff3a', '#2bd96b'] },
    moon: { base: '#b6ffb9', crater: '#5fcf78', shade: '#0b5a24' },
  };

  function drawPlanet(cv, pal) {
    const s = cv.width, ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, s, s);
    const cx = s / 2, cy = s / 2, R = s * 0.27, tilt = -0.38;
    const L = { x: -0.55, y: -0.6, z: 0.58 };
    const dot = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); };
    const ringAt = (x, y) => {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      const rx = dx * Math.cos(tilt) + dy * Math.sin(tilt);
      const ry = -dx * Math.sin(tilt) + dy * Math.cos(tilt);
      const a = s * 0.46, b = s * 0.13;
      const v = (rx * rx) / (a * a) + (ry * ry) / (b * b);
      return { on: v > 0.6 && v < 1, front: ry > 0, v };
    };
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
        const inside = dx * dx + dy * dy < R * R;
        const ring = ringAt(x, y);
        const ringColor = ring.v < 0.8 ? pal.ring[0] : pal.ring[1];
        if (inside) {
          if (ring.on && ring.front) { dot(x, y, ringColor); continue; }
          const nx = dx / R, ny = dy / R, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
          const lit = nx * L.x + ny * L.y + nz * L.z;
          const band = Math.floor((ny + 1) / 2 * pal.bands.length * 1.4 + Math.sin(nx * 3) * 0.6);
          const base = pal.bands[((band % pal.bands.length) + pal.bands.length) % pal.bands.length];
          dot(x, y, lit > 0.55 ? mix(base, '#ffffff', 0.25) : lit > 0.12 ? base : mix(base, pal.shade, 0.5));
        } else if (ring.on) {
          dot(x, y, ringColor);
        }
      }
    }
  }

  function drawMoon(cv, pal) {
    const s = cv.width, ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, s, s);
    const c = s / 2, R = s * 0.4;
    const craters = [[-0.35, -0.2, 0.22], [0.3, 0.1, 0.16], [-0.05, 0.45, 0.14], [0.2, -0.45, 0.1]];
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const dx = x + 0.5 - c, dy = y + 0.5 - c;
        if (dx * dx + dy * dy >= R * R) continue;
        const nx = dx / R, ny = dy / R;
        const lit = nx * -0.6 + ny * -0.6 + Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)) * 0.5;
        let col = lit > 0.1 ? pal.base : mix(pal.base, pal.shade, 0.55);
        for (const [cxn, cyn, r] of craters) {
          if ((nx - cxn) ** 2 + (ny - cyn) ** 2 < r * r) col = pal.crater;
        }
        ctx.fillStyle = col;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  /* ================================================= parallax background == */
  class Background {
    constructor() {
      this.cv = document.getElementById('stars');
      this.ctx = this.cv.getContext('2d');
      this.planet = document.getElementById('planet');
      this.moon = document.getElementById('moon');
      this.els = Array.from(document.querySelectorAll('[data-depth]'));
      this.px = this.py = this.tx = this.ty = 0;
      this.lastPointer = -1e9;
      this.shoot = null;
      this.nextShoot = 4000 + Math.random() * 4000;
      this.reduce = reduceMotion();
      this.readColors();
      this.resize();
      this.drawArt();

      addEventListener('resize', () => { this.resize(); });
      addEventListener('pointermove', (e) => {
        this.tx = (e.clientX / innerWidth) * 2 - 1;
        this.ty = (e.clientY / innerHeight) * 2 - 1;
        this.lastPointer = performance.now();
      }, { passive: true });
      this.frame = this.frame.bind(this);
      requestAnimationFrame(this.frame);
    }

    readColors() {
      const cs = getComputedStyle(document.documentElement);
      this.colors = [cs.getPropertyValue('--star1'), cs.getPropertyValue('--star2'), cs.getPropertyValue('--star3')]
        .map((c) => c.trim() || '#ffffff');
    }

    drawArt() {
      const theme = PALETTES[document.documentElement.dataset.theme] ? document.documentElement.dataset.theme : 'dark';
      drawPlanet(this.planet, PALETTES[theme].planet);
      drawMoon(this.moon, PALETTES[theme].moon);
    }

    onTheme() {
      this.readColors();
      this.drawArt();
    }

    resize() {
      this.dpr = Math.min(devicePixelRatio || 1, 2);
      this.w = innerWidth;
      this.h = innerHeight;
      this.cv.width = Math.floor(this.w * this.dpr);
      this.cv.height = Math.floor(this.h * this.dpr);
      const area = this.w * this.h;
      const defs = [
        { n: area / 12000, size: 2, depth: 10, speed: 5 },
        { n: area / 24000, size: 3, depth: 22, speed: 10 },
        { n: area / 70000, size: 4, depth: 40, speed: 18, plus: true },
      ];
      this.layers = defs.map((d) => ({
        ...d,
        stars: Array.from({ length: Math.max(6, Math.round(d.n)) }, () => ({
          x: Math.random() * this.w,
          y: Math.random() * this.h,
          c: Math.floor(Math.random() * 3),
          tw: 0.6 + Math.random() * 1.6,
          ph: Math.random() * 6.28,
        })),
      }));
      if (this.reduce) this.draw(0);
    }

    draw(t) {
      const { ctx, w, h } = this;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      for (const L of this.layers) {
        const u = L.size;
        for (const s of L.stars) {
          let x = s.x - this.px * L.depth;
          let y = s.y - this.py * L.depth - (t * 0.001 * L.speed);
          x = ((x % w) + w) % w;
          y = ((y % h) + h) % h;
          x = Math.round(x / u) * u;
          y = Math.round(y / u) * u;
          ctx.globalAlpha = this.reduce ? 0.8 : 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * 0.002 * s.tw + s.ph));
          ctx.fillStyle = this.colors[s.c];
          if (L.plus) {
            ctx.fillRect(x, y, u, u);
            ctx.fillRect(x - u, y, u, u);
            ctx.fillRect(x + u, y, u, u);
            ctx.fillRect(x, y - u, u, u);
            ctx.fillRect(x, y + u, u, u);
          } else {
            ctx.fillRect(x, y, u, u);
          }
        }
      }
      // shooting star
      if (this.shoot) {
        const s = this.shoot;
        for (let i = 0; i < 14; i++) {
          ctx.globalAlpha = Math.max(0, (1 - i / 14) * s.life);
          ctx.fillStyle = this.colors[0];
          ctx.fillRect(Math.round((s.x - s.vx * i * 0.9) / 3) * 3, Math.round((s.y - s.vy * i * 0.9) / 3) * 3, 3, 3);
        }
      }
      ctx.globalAlpha = 1;
    }

    frame(t) {
      requestAnimationFrame(this.frame);
      if (this.reduce) return;
      if (t - this.lastPointer > 2500) {            // no pointer lately: gentle auto-sway
        this.tx = Math.sin(t / 5200) * 0.55;
        this.ty = Math.cos(t / 6800) * 0.35;
      }
      this.px += (this.tx - this.px) * 0.05;
      this.py += (this.ty - this.py) * 0.05;
      for (const el of this.els) {
        const d = parseFloat(el.dataset.depth) || 0;
        el.style.translate = (-this.px * d).toFixed(1) + 'px ' + (-this.py * d).toFixed(1) + 'px';
      }
      // shooting stars
      if (!this.shoot && t > this.nextShoot) {
        this.shoot = { x: Math.random() * this.w * 0.7, y: Math.random() * this.h * 0.4, vx: 9, vy: 4, life: 1 };
      }
      if (this.shoot) {
        const s = this.shoot;
        s.x += s.vx; s.y += s.vy; s.life -= 0.012;
        if (s.life <= 0 || s.x > this.w + 60) {
          this.shoot = null;
          this.nextShoot = t + 5000 + Math.random() * 8000;
        }
      }
      this.draw(t);
    }
  }

  /* ======================================================== particles ===== */
  class Particles {
    constructor(canvas) {
      this.cv = canvas;
      this.ctx = canvas.getContext('2d');
      this.list = [];
      this.running = false;
      this.resize();
      addEventListener('resize', () => this.resize());
      this.loop = this.loop.bind(this);
    }

    resize() {
      this.dpr = Math.min(devicePixelRatio || 1, 2);
      this.cv.width = Math.floor(innerWidth * this.dpr);
      this.cv.height = Math.floor(innerHeight * this.dpr);
    }

    burst(x, y, opts) {
      if (reduceMotion()) return;
      const o = Object.assign({ n: 10, colors: ['#ffffff'], speed: 3.2, size: 5, gravity: 0.14, life: 38 }, opts);
      for (let i = 0; i < o.n && this.list.length < 500; i++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.5;
        const v = o.speed * (0.4 + Math.random());
        this.list.push({
          x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
          g: o.gravity, life: o.life * (0.6 + Math.random() * 0.6), max: o.life,
          s: Math.random() < 0.5 ? o.size : Math.max(2, o.size - 2),
          c: o.colors[Math.floor(Math.random() * o.colors.length)],
        });
      }
      if (!this.running) { this.running = true; this.last = 0; requestAnimationFrame(this.loop); }
    }

    loop(now) {
      const { ctx } = this;
      // time-based physics: particles live the same real time even if the frame rate dips
      const dt = this.last ? Math.min(3, (now - this.last) / 16.67) : 1;
      this.last = now;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      this.list = this.list.filter((p) => p.life > 0);
      for (const p of this.list) {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; p.life -= dt;
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life / (p.max * 0.5)));
        ctx.fillStyle = p.c;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s);
      }
      ctx.globalAlpha = 1;
      if (this.list.length) requestAnimationFrame(this.loop);
      else { this.running = false; this.last = 0; ctx.clearRect(0, 0, innerWidth, innerHeight); }
    }
  }

  /* ===================================================== shine + tilt ===== */
  function initShine() {
    document.addEventListener('pointermove', (e) => {
      const el = e.target.closest && e.target.closest('.shiny');
      if (!el) return;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      el.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
      el.style.setProperty('--my', (y * 100).toFixed(1) + '%');
      el.style.setProperty('--ang', (60 + x * 120).toFixed(0) + 'deg');
      if (el.classList.contains('tilt') && e.pointerType === 'mouse' && !reduceMotion()) {
        el.style.setProperty('--ry', ((x - 0.5) * 14).toFixed(2) + 'deg');
        el.style.setProperty('--rx', ((0.5 - y) * 10).toFixed(2) + 'deg');
      }
    }, { passive: true });
    document.addEventListener('pointerout', (e) => {
      const el = e.target.closest && e.target.closest('.tilt');
      if (el && !el.contains(e.relatedTarget)) {
        el.style.setProperty('--rx', '0deg');
        el.style.setProperty('--ry', '0deg');
      }
    });
  }

  /* ========================================================= shake ======== */
  /** shakes one element a few pixels (Web Animations API, auto-cleans) */
  function shake(el, px) {
    if (!el || !px || reduceMotion()) return;
    if (el._shake) el._shake.cancel();
    const frames = [];
    const n = 8;
    for (let i = 0; i < n; i++) {
      const k = 1 - i / n;
      frames.push({ transform: 'translate(' + ((Math.random() * 2 - 1) * px * k).toFixed(1) + 'px,' + ((Math.random() * 2 - 1) * px * k).toFixed(1) + 'px)' });
    }
    frames.push({ transform: 'translate(0,0)' });
    el._shake = el.animate(frames, { duration: 70 + px * 12, easing: 'linear' });
  }

  /** floating pixel text ("NICE!", "COMBO x20") that drifts up and fades */
  function floatText(host, text, cls) {
    if (!host) return;
    const el = document.createElement('span');
    el.className = 'float-text ' + (cls || '');
    el.textContent = text;
    el.style.setProperty('--dx', ((Math.random() * 2 - 1) * 28).toFixed(0) + 'px');
    host.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }

  NS.fx = { icons, Background, Particles, initShine, shake, floatText };
})(typeof window !== 'undefined' ? window : globalThis);
