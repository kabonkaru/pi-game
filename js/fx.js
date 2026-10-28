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
    chest: [                      // treasure chest (the shop)
      '..#########..',
      '.###########.',
      '#############',
      '#############',
      '.............',
      '#############',
      '#####...#####',
      '#####.#.#####',
      '#############',
      '#############',
      '#############',
    ],
    gb: [                         // handheld console
      '#########',
      '#.......#',
      '#.#####.#',
      '#.#...#.#',
      '#.#####.#',
      '#.......#',
      '#.#...#.#',
      '#.......#',
      '#########',
    ],
    pumpkin: [
      '.....##....',
      '..#######..',
      '.#########.',
      '###.###.###',
      '###.###.###',
      '###########',
      '##.#.#.#.##',
      '###########',
      '.#########.',
      '..#######..',
      '...#####...',
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
  /* ================================================ theme scenes (pixel art) ==
     One low-res canvas (#scene) drawn in "big pixels". Deep Space keeps its own
     stars/planet/moon layers; every other theme paints its own world here.     */
  const rng = (a) => () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const wrap = (v, m) => ((v % m) + m) % m;
  const rect = (g, c, x, y, w, h) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };
  const disc = (g, c, cx, cy, rx, ry) => {
    ry = ry == null ? rx : ry; g.fillStyle = c; cx = Math.round(cx); cy = Math.round(cy);
    rx = Math.round(rx); ry = Math.max(1, Math.round(ry));
    for (let dy = -ry; dy <= ry; dy++) {
      const k = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry + 0.01))));
      g.fillRect(cx - k, cy + dy, 2 * k + 1, 1);
    }
  };
  const pline = (g, c, x0, y0, x1, y1) => {
    g.fillStyle = c; x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (let n = 0; n < 400; n++) {
      g.fillRect(x0, y0, 1, 1);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  };
  const ridgeY = (base, amp, f1, f2, off, ph, x) =>
    Math.round(base + amp * (0.6 * Math.sin((x + off) * f1 + ph) + 0.4 * Math.sin((x + off) * f2 + ph * 1.7)));
  const ridge = (g, c, w, h, base, amp, f1, f2, off, ph) => {
    g.fillStyle = c;
    for (let x = 0; x < w; x++) { const y = ridgeY(base, amp, f1, f2, off, ph, x); g.fillRect(x, y, 1, h - y); }
  };
  const sprite = (w, h, draw) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')); return c;
  };
  const cloudSprite = (w, h, top, shade) => sprite(w, h, (g) => {
    const b = h - 2;
    disc(g, top, w * 0.3, b - h * 0.3, w * 0.2, h * 0.3);
    disc(g, top, w * 0.52, b - h * 0.42, w * 0.24, h * 0.42);
    disc(g, top, w * 0.76, b - h * 0.26, w * 0.18, h * 0.26);
    rect(g, top, w * 0.12, b - 1, Math.round(w * 0.76), 3);
    g.globalCompositeOperation = 'source-atop';
    rect(g, shade, 0, h - 3, w, 3);
  });
  const sparkle = (g, c, x, y, a) => {
    g.globalAlpha = a; g.fillStyle = c; x = Math.round(x); y = Math.round(y);
    g.fillRect(x, y, 1, 1); g.fillRect(x - 1, y, 1, 1); g.fillRect(x + 1, y, 1, 1); g.fillRect(x, y - 1, 1, 1); g.fillRect(x, y + 1, 1, 1);
    g.globalAlpha = 1;
  };

  const SCENES = {};

  /* ---------------------------------------------------------- DREAMY DAY ---- */
  SCENES.light = {
    init(sc) {
      const r = rng(11), w = sc.w, h = sc.h;
      const c1 = cloudSprite(30, 12, '#ffffff', '#d8e6ff'), c2 = cloudSprite(20, 9, '#ffffff', '#e2ecff'), c3 = cloudSprite(40, 15, '#ffffff', '#cfdffc');
      const balloon = sprite(13, 19, (g) => {
        disc(g, '#ff8fb8', 6, 6, 6, 6);
        g.globalCompositeOperation = 'source-atop';
        rect(g, '#ffe066', 4, 0, 2, 13); rect(g, '#ffe066', 9, 0, 1, 13); rect(g, '#b79bff', 0, 0, 2, 13);
        g.globalCompositeOperation = 'source-over';
        pline(g, '#7a5a3a', 3, 11, 5, 15); pline(g, '#7a5a3a', 9, 11, 7, 15);
        rect(g, '#b07a45', 4, 15, 5, 3); rect(g, '#7a4f2a', 4, 17, 5, 1);
      });
      return {
        balloon,
        clouds: Array.from({ length: 9 }, (_, i) => ({ s: [c2, c1, c3][i % 3], x: r() * (w + 60), y: 4 + r() * h * 0.42, v: 1.5 + r() * 3.5, d: 6 + (i % 3) * 8 })),
        flowers: Array.from({ length: Math.ceil(w / 6) }, () => ({ x: r() * w, c: ['#ff8fb8', '#ffe066', '#ffffff', '#b79bff'][Math.floor(r() * 4)], ph: r() * 6 })),
        birds: Array.from({ length: 4 }, () => ({ x: r() * w, y: h * (0.16 + r() * 0.3), v: 5 + r() * 5, ph: r() * 6 })),
        sparks: Array.from({ length: 16 }, () => ({ x: r() * w, y: r() * h * 0.62, ph: r() * 6, f: 0.8 + r() * 1.5 })),
      };
    },
    draw(sc, t, px, py) {
      const g = sc.ctx, w = sc.w, h = sc.h, S = sc.state, ox = px * 3, oy = py * 1.5;
      const sx = w * 0.8 - ox * 0.5, sy = h * 0.15 - oy * 0.5;
      g.globalAlpha = 0.22; disc(g, '#fff4b0', sx, sy, 17); g.globalAlpha = 0.38; disc(g, '#fff4b0', sx, sy, 13); g.globalAlpha = 1;
      for (let i = 0; i < 12; i++) {
        const a = i * Math.PI / 6 + t * 0.15;
        pline(g, '#ffe27a', sx + Math.cos(a) * 11, sy + Math.sin(a) * 11, sx + Math.cos(a) * 15, sy + Math.sin(a) * 15);
      }
      disc(g, '#ffd84d', sx, sy, 8); disc(g, '#fff0a0', sx - 2, sy - 2, 4);

      for (const c of S.clouds) {
        const cw = c.s.width, x = wrap(c.x + t * c.v - ox * c.d * 0.3, w + cw + 20) - cw;
        g.globalAlpha = c.d > 14 ? 1 : 0.82;
        g.drawImage(c.s, Math.round(x), Math.round(c.y - oy * c.d * 0.2));
      }
      g.globalAlpha = 1;
      ridge(g, '#c8c4f5', w, h, h * 0.7, 7, 0.045, 0.11, ox * 1.2, 0);
      const bx = wrap(t * 1.6 + w * 0.3, w + 40) - 20;
      g.drawImage(S.balloon, Math.round(bx - ox), Math.round(h * 0.38 + Math.sin(t * 0.7) * 3 - oy));
      ridge(g, '#aee8c8', w, h, h * 0.78, 6, 0.06, 0.15, ox * 2.4, 2);
      ridge(g, '#8fdcab', w, h, h * 0.87, 5, 0.08, 0.2, ox * 4, 4);
      for (const f of S.flowers) {
        const y = ridgeY(h * 0.87, 5, 0.08, 0.2, ox * 4, 4, f.x), sw = Math.round(Math.sin(t * 1.5 + f.ph));
        rect(g, '#4fb877', f.x, y - 3, 1, 3); rect(g, f.c, f.x + sw - (sw < 0 ? 0 : 0), y - 5, 2, 2);
      }
      for (const b of S.birds) {
        const x = Math.round(wrap(b.x + t * b.v, w + 20) - 10), y = Math.round(b.y + Math.sin(t * 1.3 + b.ph) * 2);
        const up = Math.sin(t * 9 + b.ph) > 0; g.fillStyle = '#4a5a8a';
        const pts = up ? [[-2, -1], [-1, 0], [0, 0], [1, 0], [2, -1]] : [[-2, 1], [-1, 0], [0, 0], [1, 0], [2, 1]];
        for (const p of pts) g.fillRect(x + p[0], y + p[1], 1, 1);
      }
      for (const s of S.sparks) { const a = Math.sin(t * s.f + s.ph); if (a > 0.82) sparkle(g, '#ffffff', s.x, s.y, (a - 0.82) * 5); }
    },
  };

  /* ---------------------------------------------- PHOSPHOR (handheld LCD) ---- */
  const GB = ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'];
  SCENES.terminal = {
    init(sc) {
      const r = rng(5), w = sc.w, h = sc.h;
      const cloud = cloudSprite(26, 10, GB[2], GB[2]);
      const pine = sprite(9, 15, (g) => {
        for (let i = 0; i < 4; i++) rect(g, GB[1], 4 - i - 0, 1 + i * 3, 1 + i * 2 + 1, 3);
        rect(g, GB[0], 4, 12, 1, 3);
      });
      const bush = sprite(13, 7, (g) => { disc(g, GB[1], 4, 4, 4, 3); disc(g, GB[1], 9, 4, 4, 3); rect(g, GB[1], 2, 4, 9, 3); rect(g, GB[0], 2, 6, 9, 1); });
      const block = sprite(7, 7, (g) => { rect(g, GB[0], 0, 0, 7, 7); rect(g, GB[2], 1, 1, 5, 5); rect(g, GB[0], 3, 2, 1, 1); rect(g, GB[0], 3, 4, 1, 1); });
      const runA = ['########', '.##..##.', '.##..##.', '.##..##.', '.#....#.', '##....##'];
      const runB = ['########', '.##..##.', '.##..##.', '.##..##.', '..#..#..', '..#..#..'];
      const mk = (rows) => sprite(8, 6, (g) => rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') rect(g, GB[0], x, y, 1, 1); })));
      return {
        cloud, pine, bush, block, run: [mk(runA), mk(runB)],
        clouds: Array.from({ length: 5 }, () => ({ x: r() * (w + 40), y: 6 + r() * h * 0.35, v: 1 + r() * 2 })),
        deco: Array.from({ length: Math.ceil(w / 22) + 2 }, (_, i) => ({ x: i * 22 + r() * 12, k: r() < 0.55 ? 'pine' : 'bush' })),
        obs: Array.from({ length: 12 }, (_, i) => 90 + i * (95 + (i * 37) % 40)),
      };
    },
    draw(sc, t, px) {
      const g = sc.ctx, w = sc.w, h = sc.h, S = sc.state, ox = t * 24, gy = h - 10;
      for (let y = 0; y < 8; y++) {                         // LCD vignette: dithered top edge
        g.fillStyle = GB[2];
        for (let x = (y & 1); x < w; x += (y < 2 ? 1 : y < 5 ? 2 : 4)) { if (y > 5 && (x & 3) !== (y & 3) - 2) continue; g.fillRect(x, y, 1, 1); }
      }
      for (const c of S.clouds) g.drawImage(S.cloud, Math.round(wrap(c.x + t * c.v - px * 2, w + 50) - 26), Math.round(c.y));
      ridge(g, GB[2], w, h, h * 0.62, 9, 0.05, 0.13, ox * 0.15 + px * 2, 1);
      for (const d of S.deco) {
        const x = wrap(d.x * 1 - ox * 0.5 - px * 4, w + 60) - 20, spr = d.k === 'pine' ? S.pine : S.bush;
        g.drawImage(spr, Math.round(x), Math.round(gy - spr.height + 1));
      }
      rect(g, GB[1], 0, gy, w, h - gy); rect(g, GB[0], 0, gy, w, 1);
      for (let x = -wrap(ox, 8); x < w; x += 8) { rect(g, GB[0], x, gy + 4, 1, 3); rect(g, GB[0], x + 4, gy + 7, 1, 3); }
      rect(g, GB[0], 0, gy + 3, w, 1); rect(g, GB[0], 0, gy + 7, w, 1);
      const rx = Math.round(w * 0.22); let lift = 0;
      for (const o of S.obs) {
        const x = wrap(o - ox, 1500) - 20;
        if (x > -8 && x < w) g.drawImage(S.block, Math.round(x), gy - 6);
        const dist = x - rx; if (dist > -8 && dist < 22) lift = Math.max(lift, 14 * (1 - Math.pow((dist - 7) / 15, 2)));
      }
      g.drawImage(S.run[Math.floor(t * 8) % 2], rx, Math.round(gy - 6 - Math.max(0, lift)));
    },
  };

  /* ------------------------------------------------------- HAPI HALLOWEEN ---- */
  const deadTree = (w, h, seed) => sprite(w, h, (g) => {
    const r = rng(seed), c = '#0d0418';
    const branch = (x, y, a, len, d) => {
      if (d === 0 || len < 2.5) return;
      const x2 = x + Math.cos(a) * len, y2 = y - Math.sin(a) * len;
      pline(g, c, x, y, x2, y2); if (d > 3) pline(g, c, x + 1, y, x2 + 1, y2);
      branch(x2, y2, a + 0.5 + r() * 0.4, len * 0.72, d - 1); branch(x2, y2, a - 0.5 - r() * 0.4, len * 0.72, d - 1);
    };
    branch(w / 2, h - 1, Math.PI / 2, h * 0.27, 6);
  });
  const pumpkin = (g, cx, by, r, lit, t, ph) => {
    const ry = Math.round(r * 0.8), cy = by - ry, lr = Math.round(r * 0.62);
    if (lit) {
      const f = 0.14 + 0.07 * Math.sin(t * 9 + ph) * Math.sin(t * 5.3 + ph * 2);
      g.globalAlpha = Math.max(0.05, f); disc(g, '#ff9a1f', cx, cy, r * 2.1, ry * 2.1); g.globalAlpha = 1;
    }
    for (const dx of [-0.42, 0.42]) disc(g, '#b34400', cx + dx * r, cy, lr + 1, ry);
    disc(g, '#b34400', cx, cy, lr + 1, ry + 1);
    for (const dx of [-0.42, 0.42]) disc(g, '#ff7a00', cx + dx * r, cy, lr, ry - 1);
    disc(g, '#ff8f1f', cx, cy, lr, ry);
    disc(g, '#ffb347', cx - r * 0.18, cy - ry * 0.45, Math.max(1, r * 0.16), Math.max(1, ry * 0.2));
    pline(g, '#c24d00', cx - r * 0.3, cy - ry * 0.7, cx - r * 0.34, cy + ry * 0.7); pline(g, '#c24d00', cx + r * 0.3, cy - ry * 0.7, cx + r * 0.34, cy + ry * 0.7);
    rect(g, '#2f6b24', cx - 1, cy - ry - 3, 3, 4); rect(g, '#4f9a38', cx, cy - ry - 3, 1, 3);
    if (lit) {
      const c = '#ffd23f', e = Math.max(2, Math.round(r * 0.2));
      for (const ex of [-0.4, 0.4]) for (let i = 0; i < e; i++) rect(g, c, cx + ex * r - i, cy - ry * 0.35 + i, 1 + i * 2, 1);
      rect(g, c, cx, cy + 1, 1, 1); rect(g, c, cx - 1, cy + 2, 3, 1);
      const mw = Math.round(r * 1.0), my = cy + Math.round(ry * 0.42);
      for (let i = 0; i < mw; i++) rect(g, c, cx - mw / 2 + i, my + (i % 4 < 2 ? 0 : 1), 1, 2);
    }
  };
  const ghost = (g, x, y, t, a) => {
    g.globalAlpha = a; x = Math.round(x); y = Math.round(y);
    disc(g, '#efeaff', x, y, 6, 6); rect(g, '#efeaff', x - 6, y, 13, 9);
    for (let i = 0; i < 13; i++) rect(g, '#efeaff', x - 6 + i, y + 9, 1, 1 + (Math.floor((i + Math.floor(t * 6)) / 2) % 2));
    rect(g, '#d6cff2', x + 4, y - 2, 2, 11);
    rect(g, '#1a0a2e', x - 3, y - 1, 2, 3); rect(g, '#1a0a2e', x + 1, y - 1, 2, 3); rect(g, '#1a0a2e', x - 1, y + 4, 3, 2);
    g.globalAlpha = 1;
  };
  const bat = (g, x, y, t, ph) => {
    x = Math.round(x); y = Math.round(y); g.fillStyle = '#0a0214';
    g.fillRect(x - 1, y - 1, 3, 3); g.fillRect(x - 1, y - 2, 1, 1); g.fillRect(x + 1, y - 2, 1, 1);
    const f = Math.sin(t * 14 + ph);
    for (let k = 1; k <= 4; k++) {
      const dy = Math.round(f * k * 0.7) + (k > 2 ? 1 : 0);
      g.fillRect(x - 1 - k, y + dy, 1, 2); g.fillRect(x + 1 + k, y + dy, 1, 2);
    }
  };
  const house = (g, x, y, t) => {
    const D = '#12051f';
    rect(g, D, x, y - 16, 26, 16);
    for (let k = 0; k < 9; k++) rect(g, D, x - 2 + Math.round(k * 1.6), y - 17 - k, Math.round(30 - k * 3.2), 1);
    rect(g, D, x + 19, y - 27, 7, 13); for (let k = 0; k < 4; k++) rect(g, D, x + 19 + k, y - 28 - k, 7 - k * 2, 1);
    rect(g, D, x + 4, y - 27, 3, 6);
    const wins = [[4, 12], [11, 12], [4, 6], [21, 22]];
    wins.forEach((p, i) => {
      const on = Math.sin(t * 2.3 + i * 2.1) > -0.55; if (!on) return;
      rect(g, Math.sin(t * 11 + i) > 0.3 ? '#ff9d2b' : '#ffd23f', x + p[0], y - p[1], 3, 4);
    });
    rect(g, '#2a0f4a', x + 11, y - 6, 4, 6);
  };
  const tomb = (g, x, base, wd, ht, c) => {
    rect(g, c, x, base - ht + Math.floor(wd / 2), wd, ht - Math.floor(wd / 2)); disc(g, c, x + (wd - 1) / 2, base - ht + Math.floor(wd / 2), Math.floor(wd / 2));
    rect(g, '#2a1450', x + Math.floor(wd / 2), base - ht + 3, 1, 4); rect(g, '#2a1450', x + Math.floor(wd / 2) - 1, base - ht + 4, 3, 1);
  };

  SCENES.halloween = {
    init(sc) {
      const r = rng(31), w = sc.w, h = sc.h, gy = h - 7;
      const n = Math.max(5, Math.min(12, Math.round(w / 24)));
      return {
        gy,
        cloud: cloudSprite(36, 12, '#3b1a63', '#2a0f4a'), tree: deadTree(38, 50, 9), tree2: deadTree(30, 38, 4),
        stars: Array.from({ length: 30 }, () => ({ x: r() * w, y: r() * h * 0.55, c: r() < 0.5 ? '#ffe9b0' : '#c9a6ff', ph: r() * 6 })),
        clouds: Array.from({ length: 4 }, () => ({ x: r() * (w + 60), y: 4 + r() * h * 0.3, v: 1.5 + r() * 2.5 })),
        pumps: Array.from({ length: n }, (_, i) => ({ x: (i + 0.5) * (w / n) + (r() - 0.5) * 8, r: 6 + Math.floor(r() * 9), lit: r() < 0.7, ph: r() * 6 })),
        tombs: Array.from({ length: 5 }, () => ({ x: r() * w, ht: 8 + Math.floor(r() * 5), wd: 7 + 2 * Math.floor(r() * 2) })),
        ghosts: Array.from({ length: 3 }, (_, i) => ({ x: r() * w, y: h * (0.22 + i * 0.13), v: 3 + r() * 3, ph: r() * 6 })),
        bats: Array.from({ length: 5 }, () => ({ x: r() * w, y: h * (0.08 + r() * 0.3), v: 8 + r() * 8, ph: r() * 6, a: 3 + r() * 5 })),
      };
    },
    draw(sc, t, px, py) {
      const g = sc.ctx, w = sc.w, h = sc.h, S = sc.state, gy = S.gy, ox = px * 3, oy = py * 1.5;
      for (const s of S.stars) { const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 1.6 + s.ph)); g.globalAlpha = a; rect(g, s.c, s.x - ox * 0.3, s.y, 1, 1); }
      g.globalAlpha = 1;
      const mx = w * 0.7 - ox * 0.6, my = h * 0.2 - oy * 0.6, mr = Math.max(11, Math.min(20, w * 0.1));
      g.globalAlpha = 0.14; disc(g, '#ff9a1f', mx, my, mr * 1.9); g.globalAlpha = 0.22; disc(g, '#ffb347', mx, my, mr * 1.45); g.globalAlpha = 1;
      disc(g, '#ffb347', mx, my, mr); disc(g, '#ffd27a', mx - mr * 0.25, my - mr * 0.25, mr * 0.6);
      disc(g, '#e8923a', mx + mr * 0.35, my + mr * 0.2, mr * 0.18); disc(g, '#e8923a', mx - mr * 0.3, my + mr * 0.45, mr * 0.12); disc(g, '#e8923a', mx + mr * 0.1, my - mr * 0.5, mr * 0.1);
      for (const c of S.clouds) { g.globalAlpha = 0.9; g.drawImage(S.cloud, Math.round(wrap(c.x + t * c.v - ox * 1.2, w + 60) - 36), Math.round(c.y - oy)); }
      g.globalAlpha = 1;
      const fb = h * 0.7;
      ridge(g, '#241046', w, h, fb, 6, 0.05, 0.13, ox * 1.2, 1);
      const hx = Math.round(w * 0.12 - ox * 1.2); house(g, hx, ridgeY(fb, 6, 0.05, 0.13, ox * 1.2, 1, hx + 13) + 2, t);
      for (const gh of S.ghosts) ghost(g, wrap(gh.x + t * gh.v, w + 30) - 15, gh.y + Math.sin(t * 1.4 + gh.ph) * 4, t, 0.78);
      for (const b of S.bats) bat(g, wrap(b.x + t * b.v, w + 30) - 15, b.y + Math.sin(t * 2 + b.ph) * b.a, t, b.ph);
      ridge(g, '#180a30', w, h, h * 0.8, 5, 0.07, 0.17, ox * 2.4, 3);
      g.drawImage(S.tree, Math.round(w * 0.78 - ox * 2.4), Math.round(h * 0.8 - 44 - oy));
      g.drawImage(S.tree2, Math.round(w * 0.02 - ox * 2.4), Math.round(h * 0.8 - 32 - oy));
      for (const tb of S.tombs) tomb(g, Math.round(tb.x - ox * 3), Math.round(ridgeY(h * 0.8, 5, 0.07, 0.17, ox * 2.4, 3, tb.x) + 4), tb.wd, tb.ht, '#3a2468');
      g.globalAlpha = 0.1;
      for (let band = 0; band < 2; band++) for (let x = 0; x < w; x += 2) rect(g, '#c4a3ff', x, gy - 12 - band * 6 + Math.round(Math.sin((x + t * (6 + band * 4)) * 0.12) * 2), 2, 4 + band);
      g.globalAlpha = 1;
      rect(g, '#0a0414', 0, gy, w, h - gy);
      for (const p of S.pumps) pumpkin(g, Math.round(p.x - ox * 5), gy + 2, p.r, p.lit, t, p.ph);
      const wc = '#d9c9f5'; g.globalAlpha = 0.7;
      for (const e of [[26, 0], [24, 9], [17, 17], [9, 24], [0, 26]]) pline(g, wc, 0, 0, e[0], e[1]);
      for (const rr of [8, 15, 22]) for (let k = 0; k < 4; k++) { const a0 = k * Math.PI / 8, a1 = a0 + Math.PI / 8; pline(g, wc, Math.cos(a0) * rr, Math.sin(a0) * rr, Math.cos(a1) * rr * 0.96, Math.sin(a1) * rr * 0.96); }
      const spx = 18, spy = 16 + Math.sin(t * 0.9) * 7; pline(g, wc, spx, 0, spx, spy); g.globalAlpha = 1;
      disc(g, '#12051f', spx, spy, 2); for (const d of [-1, 1]) { pline(g, '#12051f', spx + d * 2, spy, spx + d * 4, spy - 2); pline(g, '#12051f', spx + d * 2, spy + 1, spx + d * 4, spy + 3); }
      rect(g, '#ff7a00', spx, spy - 1, 1, 1);
    },
  };


  /* ---------------------------------------------------------- SINGULARITY ---- */
  // A black hole that reacts to the game: every correct digit makes the disk flare, a high combo spins it
  // faster and burns it hotter (orange -> white -> ice blue), a wrong key sends a red shockwave + glitch.
  const rgb3 = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  const heatMix = (c1, c2, k) => { const a = rgb3(c1), b = rgb3(c2); return 'rgb(' + a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(',') + ')'; };
  SCENES.singularity = {
    init(sc) {
      const r = rng(77), w = sc.w, h = sc.h, R = Math.max(8, Math.floor(Math.min(w, h) * 0.1)), maxR = Math.hypot(w, h) * 0.6;
      return {
        R, maxR, last: 0, energy: 0, spin: 1, heat: 0, combo: 0, shock: null, shockColor: '#ff4d6d', glitch: 0,
        stars: Array.from({ length: 170 }, () => ({ a: r() * 6.283, r: R * 1.6 + r() * maxR, z: 0.4 + r() * 0.6 })),
        disk: Array.from({ length: 300 }, () => ({ a: r() * 6.283, k: 1.35 + r() * 1.5, j: r() })),
      };
    },
    react(S, kind, v) {
      if (kind === 'key') { S.energy = Math.min(1, S.energy + 0.2); S.combo = v || 0; }
      else if (kind === 'wrong') { S.shock = 0; S.shockColor = '#ff4d6d'; S.glitch = 0.5; S.energy = 0; S.combo = 0; }
      else if (kind === 'milestone') { S.shock = 0; S.shockColor = '#8be9ff'; S.energy = 1; }
      else if (kind === 'over') { S.energy = 0; S.combo = 0; }
    },
    draw(sc, t, px, py) {
      const g = sc.ctx, w = sc.w, h = sc.h, S = sc.state, R = S.R, dt = Math.min(0.1, S.last ? t - S.last : 0.033);
      S.last = t;
      S.energy = Math.max(0, S.energy - dt * 1.6);
      S.glitch = Math.max(0, S.glitch - dt);
      S.spin += ((1 + Math.min(3.2, S.combo / 22) + S.energy * 1.2) - S.spin) * Math.min(1, dt * 2.5);
      S.heat += ((Math.min(1, S.combo / 70) + S.energy * 0.35) - S.heat) * Math.min(1, dt * 2);
      const heat = Math.min(1, S.heat), cx = w * 0.5 - px * 2, cy = h * 0.3 - py * 1.2;     // sits behind the LCD so you can watch it while typing
      const inner = heatMix('#ffd9a0', '#ffffff', heat), midc = heatMix('#ff8a3d', '#9be7ff', heat), outer = heatMix('#8a2be2', '#5b6cff', heat);

      for (const s of S.stars) {                                                   // starfield spiralling in
        s.a += (0.05 + 9 / (s.r + 8)) * S.spin * dt; s.r -= (0.8 + S.energy * 3) * dt * (60 / (s.r + 30));
        if (s.r < R * 1.15) { s.r = S.maxR; s.a = Math.random() * 6.283; }
        g.globalAlpha = s.z * Math.min(1, (s.r - R) / (R * 2));
        rect(g, s.r < R * 3 ? midc : '#cfd8ff', cx + Math.cos(s.a) * s.r, cy + Math.sin(s.a) * s.r * 0.78, 1, 1);
      }
      g.globalAlpha = 1;
      const diskPass = (back) => {                                                  // back half behind the hole, front half over it
        for (const p of S.disk) {
          p.a += (0.9 / p.k) * S.spin * dt;
          const sn = Math.sin(p.a); if ((sn < 0) !== back) continue;
          const r = R * p.k, dop = 0.5 + 0.5 * Math.cos(p.a + 0.6);                // bright on the side coming toward us
          g.globalAlpha = Math.min(1, (0.25 + 0.75 * dop) * (0.55 + S.energy * 0.6));
          rect(g, p.k < 1.9 ? (p.j < 0.5 ? inner : midc) : outer, cx + Math.cos(p.a) * r, cy + sn * r * 0.26, 1, 1);
        }
        g.globalAlpha = 1;
      };
      diskPass(true);
      for (let i = 0; i < 52; i++) {                                                // lensed halo arcs over and under the hole
        const f = (i / 51) * Math.PI, fl = 0.55 + 0.45 * Math.sin(t * 3 + i * 0.6 + S.energy * 6);
        g.globalAlpha = (0.35 + 0.5 * fl) * (0.7 + S.energy * 0.3);
        rect(g, i % 3 ? midc : inner, cx + Math.cos(f) * R * 1.6, cy - Math.sin(f) * R * 1.5, 1, 1);
        g.globalAlpha *= 0.55; rect(g, midc, cx + Math.cos(f) * R * 1.45, cy + Math.sin(f) * R * 0.95, 1, 1);
      }
      g.globalAlpha = 1;
      g.globalAlpha = 0.28; disc(g, '#5b6cff', cx, cy, R * 1.5, R * 1.5); g.globalAlpha = 1;      // faint glow, then the horizon itself
      disc(g, '#000000', cx, cy, R);
      for (let i = 0; i < 90; i++) { const a = i / 90 * 6.283; g.globalAlpha = 0.5 + 0.4 * S.energy; rect(g, '#e8f6ff', cx + Math.cos(a) * (R + 1), cy + Math.sin(a) * (R + 1), 1, 1); }   // photon ring
      g.globalAlpha = 1;
      diskPass(false);

      if (S.shock !== null) {                                                       // shockwave ring
        S.shock += dt * 70; const a = Math.max(0, 1 - S.shock / (Math.hypot(w, h) * 0.5));
        if (a <= 0) S.shock = null; else {
          g.globalAlpha = a * 0.8;
          for (let i = 0; i < 160; i++) { const an = i / 160 * 6.283; rect(g, S.shockColor, cx + Math.cos(an) * S.shock, cy + Math.sin(an) * S.shock * 0.85, 1, 1); }
          g.globalAlpha = 1;
        }
      }
      if (S.glitch > 0) {                                                           // digital tearing on a wrong key
        for (let i = 0; i < 5; i++) {
          const y = Math.floor(Math.random() * (h - 6)), bh = 2 + Math.floor(Math.random() * 5), dx = Math.round((Math.random() * 2 - 1) * 8 * S.glitch * 2);
          g.drawImage(sc.cv, 0, y, w, bh, dx, y, w, bh);
        }
      }
    },
  };

  class SceneBG {
    constructor(canvas) { this.cv = canvas; this.ctx = canvas.getContext('2d'); this.id = null; this.state = null; this.last = -1e9; this.resize(); }
    resize() {
      const S = Math.max(3, Math.min(5, Math.round(Math.min(innerWidth, innerHeight) / 160)));
      this.w = Math.ceil(innerWidth / S); this.h = Math.ceil(innerHeight / S);
      this.cv.width = this.w; this.cv.height = this.h;
      this.setTheme(this.id);
    }
    setTheme(id) {
      this.id = SCENES[id] ? id : null;
      this.state = this.id ? SCENES[this.id].init(this) : null;
      this.last = -1e9;
      this.ctx.clearRect(0, 0, this.w, this.h);
    }
    react(kind, v) {                               // the game pokes the scene (singularity reacts to typing)
      const s = this.id && SCENES[this.id];
      if (s && s.react && this.state) s.react(this.state, kind, v);
    }
    render(t, px, py, force) {
      if (!this.id || (!force && t - this.last < 32)) return;
      this.last = t; this.ctx.globalAlpha = 1; this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.clearRect(0, 0, this.w, this.h);
      SCENES[this.id].draw(this, t / 1000, px, py);
    }
  }

  class Background {
    constructor() {
      this.scene = new SceneBG(document.getElementById('scene'));
      this.sceneId = null;
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
      this.syncTheme();

      let rt = 0, lw = innerWidth, lh = innerHeight;      // v1.5.1: debounce; ignore the mobile URL bar (small height-only change)
      addEventListener('resize', () => {
        clearTimeout(rt);
        rt = setTimeout(() => {
          if (innerWidth === lw && Math.abs(innerHeight - lh) < 120) return;
          lw = innerWidth; lh = innerHeight; this.resize();
        }, 200);
      });
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

    react(kind, v) { this.scene.react(kind, v); }

    syncTheme() {                                  // non-space themes paint their own scene
      const id = document.documentElement.dataset.theme;
      this.sceneId = SCENES[id] ? id : null;
      this.scene.setTheme(this.sceneId);
      if (this.sceneId && this.reduce) this.scene.render(0, 0, 0, true);
    }

    onTheme() {
      this.readColors();
      this.drawArt();
      this.syncTheme();
    }

    resize() {
      if (this.scene) { this.scene.resize(); if (this.sceneId && this.reduce) this.scene.render(0, 0, 0, true); }
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
      if (this.sceneId) { this.scene.render(t, this.px, this.py); return; }
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
    const anim = (el._shake = el.animate(frames, { duration: 70 + px * 12, easing: 'linear' }));
    // a moving element can briefly enlarge the page's scrollable area -> never let a scrollbar flash in
    document.body.classList.add('is-shaking');
    const done = () => { if (el._shake === anim) document.body.classList.remove('is-shaking'); };
    anim.onfinish = done; anim.oncancel = done;
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
