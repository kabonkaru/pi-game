/* ==========================================================================
   audio.js  -  everything you hear is synthesised live with the Web Audio API
   (no audio files to download or license).

   * SFX : chiptune blips. Key presses climb a pentatonic scale as your score
           grows, so a long run literally sounds like it is going up.
   * BGM : "space dreamy" generative loop - slow pad, soft pulse-wave arpeggio,
           twinkling bells and a gentle heartbeat, all through echo + reverb.
   Browsers only allow audio after a user gesture, so call audio.unlock() from
   the first tap / key press.
   ========================================================================== */
(function (root) {
  'use strict';

  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
  const PENT = [0, 2, 4, 7, 9];

  /* ---- the song ----------------------------------------------------------- */
  const BPM = 76;
  const STEP = 60 / BPM / 4;                       // one 16th note, in seconds
  const CHORDS = {
    maj7: [0, 4, 7, 11],
    m7: [0, 3, 7, 10],
    m9: [0, 3, 7, 10, 14],
    six: [0, 4, 7, 9],
    add9: [0, 4, 7, 14],
  };
  // two 4-bar progressions that alternate (root MIDI note, chord type)
  const PROGRESSIONS = [
    [[53, 'maj7'], [48, 'maj7'], [45, 'm9'], [43, 'six']],   // F  C  Am  G
    [[50, 'm9'], [45, 'm7'], [53, 'maj7'], [48, 'add9']],    // Dm Am F  C
  ];
  // arpeggio patterns: index into the chord tones, null = rest (16 steps)
  const ARP_PATTERNS = [
    [0, null, 1, null, 2, null, 3, null, 2, null, 1, null, 4, null, 2, null],
    [0, null, null, 2, null, 3, null, null, 1, null, null, 3, null, 2, null, null],
    [0, 1, 2, 3, null, null, 4, 3, 2, 1, null, null, 0, null, 2, null],
  ];

  class Audio8 {
    constructor() {
      this.ctx = null;
      this.musicOn = true;
      this.sfxOn = true;
      this.intensity = 0;        // 0..1, brightens the arpeggio during hot streaks
      this.timer = null;
      this.step = 0;
      this.nextTime = 0;
    }

    /* ---------------------------------------------------------- setup ----- */
    unlock() {
      if (!this.ctx) {
        const AC = root.AudioContext || root.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this._build();
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      if (this.musicOn) this.startBgm();
    }

    _build() {
      const c = this.ctx;
      this.master = c.createGain();
      this.master.gain.value = 0.9;
      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.knee.value = 18;
      comp.ratio.value = 6;
      comp.attack.value = 0.004;
      comp.release.value = 0.2;
      this.master.connect(comp);
      comp.connect(c.destination);

      this.sfxBus = c.createGain();
      this.sfxBus.gain.value = this.sfxOn ? 0.85 : 0;
      this.sfxBus.connect(this.master);

      this.musicBus = c.createGain();
      this.musicBus.gain.value = 0;
      this.musicBus.connect(this.master);

      // echo (feedback delay with a dark loop) for the dreamy tails
      this.delayIn = c.createGain();
      const delay = c.createDelay(1.5);
      delay.delayTime.value = (60 / BPM) * 0.75;           // dotted eighth
      const fb = c.createGain();
      fb.gain.value = 0.42;
      const dlp = c.createBiquadFilter();
      dlp.type = 'lowpass';
      dlp.frequency.value = 2200;
      const delayOut = c.createGain();
      delayOut.gain.value = 0.55;
      this.delayIn.connect(delay);
      delay.connect(dlp);
      dlp.connect(fb);
      fb.connect(delay);
      dlp.connect(delayOut);
      delayOut.connect(this.musicBus);

      // reverb (generated noise impulse)
      this.verbIn = c.createGain();
      const conv = c.createConvolver();
      conv.buffer = this._impulse(2.8, 2.6);
      const verbOut = c.createGain();
      verbOut.gain.value = 0.6;
      this.verbIn.connect(conv);
      conv.connect(verbOut);
      verbOut.connect(this.musicBus);

      this.pulse25 = this._pulse(0.25);
      this.pulse125 = this._pulse(0.125);
      this.noise = this._noiseBuffer();
    }

    _impulse(seconds, decay) {
      const c = this.ctx;
      const len = Math.floor(c.sampleRate * seconds);
      const buf = c.createBuffer(2, len, c.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = buf.getChannelData(ch);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
      return buf;
    }

    _noiseBuffer() {
      const c = this.ctx;
      const buf = c.createBuffer(1, c.sampleRate, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      return buf;
    }

    /** classic NES-style pulse wave with the given duty cycle */
    _pulse(duty) {
      const N = 64;
      const real = new Float32Array(N);
      const imag = new Float32Array(N);
      for (let n = 1; n < N; n++) {
        real[n] = Math.sin(2 * Math.PI * n * duty) / (n * Math.PI);
        imag[n] = (1 - Math.cos(2 * Math.PI * n * duty)) / (n * Math.PI);
      }
      return this.ctx.createPeriodicWave(real, imag);
    }

    /* ------------------------------------------------------- settings ----- */
    setMusic(on) {
      this.musicOn = on;
      if (!this.ctx) return;
      if (on) this.startBgm();
      else this.stopBgm();
    }

    setSfx(on) {
      this.sfxOn = on;
      if (!this.ctx) return;
      const g = this.sfxBus.gain;
      g.cancelScheduledValues(this.ctx.currentTime);
      g.setTargetAtTime(on ? 0.85 : 0, this.ctx.currentTime, 0.02);
    }

    setIntensity(x) {
      this.intensity = Math.max(0, Math.min(1, x));
    }

    suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend(); }
    resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }

    /* ---------------------------------------------------- voice helper ---- */
    _voice(dest, o) {
      const c = this.ctx;
      const t = o.t;
      const osc = c.createOscillator();
      if (o.wave) osc.setPeriodicWave(o.wave);
      else osc.type = o.type || 'square';
      osc.frequency.setValueAtTime(o.freq, t);
      if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(o.slideTo, t + o.dur);
      if (o.detune) osc.detune.value = o.detune;

      const g = c.createGain();
      const vol = o.vol == null ? 0.1 : o.vol;
      const a = o.a == null ? 0.005 : o.a;
      const r = o.r == null ? 0.08 : o.r;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + a);
      g.gain.setValueAtTime(vol, t + Math.max(a, o.dur));
      g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur + r);

      let node = osc;
      if (o.lp) {
        const f = c.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = o.lp;
        osc.connect(f);
        node = f;
      }
      node.connect(g);
      g.connect(dest);
      if (o.delay) { const s = c.createGain(); s.gain.value = o.delay; g.connect(s); s.connect(this.delayIn); }
      if (o.verb) { const s = c.createGain(); s.gain.value = o.verb; g.connect(s); s.connect(this.verbIn); }

      osc.start(t);
      osc.stop(t + o.dur + r + 0.05);
    }

    _noise(dest, t, dur, vol, hp, lp) {
      const c = this.ctx;
      const src = c.createBufferSource();
      src.buffer = this.noise;
      let node = src;
      if (hp) { const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp; node.connect(f); node = f; }
      if (lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; node.connect(f); node = f; }
      const g = c.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      node.connect(g);
      g.connect(dest);
      src.start(t);
      src.stop(t + dur + 0.02);
    }

    /* ------------------------------------------------------------ SFX ----- */
    sfx(name, o) {
      if (!this.ctx || !this.sfxOn) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();
      o = o || {};
      const t = this.ctx.currentTime;
      const out = this.sfxBus;
      const arp = (notes, gap, type, vol, dur) => {
        notes.forEach((n, i) => {
          this._voice(out, { freq: midi(n), t: t + i * gap, dur: dur || gap * 0.9, type: type || 'square', vol: vol || 0.1, r: 0.12 });
        });
      };

      switch (name) {
        case 'hover':
          this._voice(out, { freq: 1320, t, dur: 0.02, type: 'triangle', vol: 0.03, r: 0.03 });
          break;
        case 'click':
          this._voice(out, { freq: 520, slideTo: 800, t, dur: 0.05, wave: this.pulse25, vol: 0.09, r: 0.05 });
          break;
        case 'back':
          this._voice(out, { freq: 480, slideTo: 300, t, dur: 0.06, wave: this.pulse25, vol: 0.09, r: 0.05 });
          break;
        case 'del':
          this._voice(out, { freq: 330, slideTo: 200, t, dur: 0.05, type: 'square', vol: 0.08, r: 0.04 });
          break;
        case 'toggle_on':
          arp([72, 79], 0.07, 'square', 0.08);
          break;
        case 'toggle_off':
          arp([79, 72], 0.07, 'square', 0.08);
          break;
        case 'start':
          arp([67, 72, 76], 0.06, 'square', 0.09);
          break;
        case 'go': // the Timer clock just started
          this._voice(out, { freq: 220, slideTo: 1100, t, dur: 0.22, type: 'sawtooth', vol: 0.07, r: 0.1, lp: 3000 });
          arp([84, 88, 91], 0.05, 'triangle', 0.08);
          break;
        case 'warm': { // typing 3 . 1 4  ->  a tiny rising chord
          const semis = [0, 4, 7, 12][Math.min(o.n || 0, 3)];
          this._voice(out, { freq: midi(72 + semis), t, dur: 0.07, wave: this.pulse25, vol: 0.12, r: 0.1 });
          break;
        }
        case 'key': { // climbs a pentatonic scale over 3 octaves, then wraps
          const n = o.n || 0;
          const semis = PENT[n % 5] + 12 * Math.floor((n % 15) / 5);
          const f = midi(60 + semis);
          this._voice(out, { freq: f, t, dur: 0.06, wave: this.pulse25, vol: 0.15, r: 0.09 });
          this._voice(out, { freq: f * 2, t, dur: 0.04, type: 'triangle', vol: 0.06, r: 0.1 });
          break;
        }
        case 'milestone':
          arp([72, 76, 79, 84, 88], 0.055, 'square', 0.1);
          arp([60, 64, 67, 72, 76], 0.055, 'triangle', 0.1);
          break;
        case 'wrong':
          this._voice(out, { freq: 190, slideTo: 60, t, dur: 0.28, type: 'sawtooth', vol: 0.13, r: 0.08, lp: 1600 });
          this._noise(out, t, 0.18, 0.12, 300, 3000);
          break;
        case 'reject':
          this._voice(out, { freq: 130, t, dur: 0.06, wave: this.pulse125, vol: 0.12, r: 0.04 });
          this._voice(out, { freq: 110, t: t + 0.09, dur: 0.07, wave: this.pulse125, vol: 0.12, r: 0.05 });
          break;
        case 'warn':
          this._voice(out, { freq: o.urgent ? 1760 : 988, t, dur: 0.04, type: 'square', vol: 0.07, r: 0.04 });
          break;
        case 'over':
          arp([67, 64, 60, 55], 0.14, 'triangle', 0.16, 0.13);
          arp([55, 52, 48, 43], 0.14, 'square', 0.06, 0.13);
          break;
        case 'record':
          arp([60, 60, 60, 64, 67, 72, 76, 79, 84], 0.085, 'square', 0.09);
          arp([48, 48, 48, 52, 55, 60, 64, 67, 72], 0.085, 'triangle', 0.1);
          break;
        case 'perfect':
          arp([60, 64, 67, 72, 76, 79, 84, 88, 91, 96], 0.07, 'square', 0.09);
          arp([48, 52, 55, 60, 64, 67, 72, 76, 79, 84], 0.07, 'triangle', 0.1);
          break;
        case 'save':
          this._voice(out, { freq: 988, t, dur: 0.07, wave: this.pulse25, vol: 0.12, r: 0.05 });
          this._voice(out, { freq: 1319, t: t + 0.07, dur: 0.25, wave: this.pulse25, vol: 0.12, r: 0.2 });
          break;
        default:
          break;
      }
    }

    /* ------------------------------------------------------------ BGM ----- */
    startBgm() {
      if (!this.ctx || this.timer) return;
      const now = this.ctx.currentTime;
      this.musicBus.gain.cancelScheduledValues(now);
      this.musicBus.gain.setValueAtTime(this.musicBus.gain.value, now);
      this.musicBus.gain.linearRampToValueAtTime(0.6, now + 2);
      this.step = 0;
      this.nextTime = now + 0.1;
      this.timer = setInterval(() => this._schedule(), 40);
    }

    stopBgm() {
      if (!this.ctx) return;
      clearInterval(this.timer);
      this.timer = null;
      const now = this.ctx.currentTime;
      this.musicBus.gain.cancelScheduledValues(now);
      this.musicBus.gain.setValueAtTime(this.musicBus.gain.value, now);
      this.musicBus.gain.linearRampToValueAtTime(0, now + 0.4);
    }

    _schedule() {
      const c = this.ctx;
      if (this.nextTime < c.currentTime - 0.5) this.nextTime = c.currentTime + 0.05; // after a long pause
      while (this.nextTime < c.currentTime + 0.3) {
        this._playStep(this.step, this.nextTime);
        this.nextTime += STEP;
        this.step++;
      }
    }

    _chordAt(bar) {
      const prog = PROGRESSIONS[Math.floor(bar / 4) % PROGRESSIONS.length];
      const [root, type] = prog[bar % 4];
      return { root, tones: CHORDS[type] };
    }

    _playStep(step, t) {
      const s = step % 16;
      const bar = Math.floor(step / 16);
      const { root, tones } = this._chordAt(bar);
      const out = this.musicBus;
      const barLen = STEP * 16;
      const padRoot = root < 47 ? root + 12 : root;

      if (s === 0) {
        // pad: two slightly detuned triangles per chord tone
        tones.forEach((iv) => {
          [-7, 7].forEach((det) => {
            this._voice(out, { freq: midi(padRoot + iv), t, dur: barLen * 0.95, type: 'triangle', vol: 0.028, a: 0.9, r: 1.3, detune: det, lp: 1100, verb: 0.55 });
          });
        });
        // bass
        let bass = 36 + (root % 12);
        if (bass < 40) bass += 12;
        this._voice(out, { freq: midi(bass), t, dur: barLen * 0.9, type: 'triangle', vol: 0.12, a: 0.02, r: 0.4 });
      }

      // soft heartbeat
      if (s === 0 || s === 8) {
        this._voice(out, { freq: 110, slideTo: 42, t, dur: 0.12, type: 'sine', vol: s === 0 ? 0.09 : 0.05, r: 0.05 });
      }
      // shimmer on the off-beats
      if (s === 2 || s === 6 || s === 10 || s === 14) {
        this._noise(out, t, 0.04, 0.012, 7000, null);
      }

      // arpeggio (soft pulse wave through echo + reverb)
      const pat = ARP_PATTERNS[(bar * 7 + Math.floor(bar / 4)) % ARP_PATTERNS.length];
      const idx = pat[s];
      if (idx != null && Math.random() > 0.1) {
        const pool = tones.map((iv) => padRoot + 12 + iv).concat(tones.map((iv) => padRoot + 24 + iv));
        const note = pool[idx % pool.length];
        this._voice(out, {
          freq: midi(note), t, dur: STEP * 1.6, wave: this.pulse25,
          vol: 0.04 + this.intensity * 0.02, a: 0.01, r: 0.25,
          lp: 1800 + this.intensity * 2600, delay: 0.6, verb: 0.3,
        });
      }

      // twinkling bells
      if (s % 2 === 0 && Math.random() < 0.1 + this.intensity * 0.06) {
        const pool = tones.map((iv) => padRoot + 24 + iv);
        const note = pool[Math.floor(Math.random() * pool.length)] + (Math.random() < 0.3 ? 12 : 0);
        this._voice(out, { freq: midi(note), t, dur: 0.05, type: 'sine', vol: 0.05, a: 0.004, r: 1.6, delay: 0.7, verb: 0.6 });
        this._voice(out, { freq: midi(note) * 2, t, dur: 0.03, type: 'triangle', vol: 0.015, a: 0.004, r: 0.9, delay: 0.5, verb: 0.5 });
      }
    }
  }

  const NS = (root.PiGame = root.PiGame || {});
  NS.audio = new Audio8();
})(typeof window !== 'undefined' ? window : globalThis);
