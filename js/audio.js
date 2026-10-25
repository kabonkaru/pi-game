/* ==========================================================================
   audio.js  -  everything you hear is synthesised live with the Web Audio API
   (no audio files to download or license).

   * SFX : chiptune blips. Key presses climb a pentatonic scale as your score
           grows, so a long run literally sounds like it is going up.
   * BGM : three generative tracks, one bundled with each theme:
           DEEP SPACE (dark)  - slow "space dreamy" pad, soft arpeggio, bells
           DREAMY DAY (light) - sunny music-box melody over a bouncy bass
           PHOSPHOR (retro)   - driving 8-bit minor-key chip tune with drums
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

  /* ---- track list (one per theme bundle) ---------------------------------- */
  const TRACKS = {
    'deep-space': { name: 'DEEP SPACE', bpm: 76, echo: 0.75 },
    'dreamy-day': { name: 'DREAMY DAY', bpm: 92, echo: 0.75 },
    'phosphor':   { name: 'PHOSPHOR',   bpm: 118, echo: 0.5 },
    'haunted':    { name: 'HAUNTED WALTZ', bpm: 126, echo: 0.75 },
  };
  CHORDS.m = [0, 3, 7];                // plain triads for PHOSPHOR
  CHORDS.maj = [0, 4, 7];
  CHORDS.dim = [0, 3, 6, 9];

  // DREAMY DAY: C G Am F / F C G Em, major pentatonic music-box melody
  const DAY_PROGS = [
    [[48, 'maj7'], [43, 'six'], [45, 'm7'], [41, 'maj7']],
    [[41, 'add9'], [48, 'maj7'], [43, 'six'], [40, 'm7']],
  ];
  const DAY_PENT = [72, 74, 76, 79, 81, 84, 86, 88];           // C5 D5 E5 G5 A5 C6 D6 E6
  const DAY_MOTIFS = [
    [0, null, 2, null, 4, null, 2, null, 3, null, null, 1, null, null, 0, null],
    [4, null, null, 3, null, 2, null, null, 1, null, 2, null, 4, null, null, null],
    [0, 1, 2, null, null, 4, null, 3, null, null, 2, null, 1, null, null, null],
  ];

  // PHOSPHOR: A minor.  Am F C G / Am Dm E Am
  const PHOS_PROGS = [
    [[45, 'm'], [41, 'maj'], [48, 'maj'], [43, 'maj']],
    [[45, 'm'], [50, 'm'], [52, 'maj'], [45, 'm']],
  ];
  const PHOS_LEAD = [69, 72, 74, 76, 79, 81];                  // A minor pentatonic A4..A5

  // HAUNTED WALTZ: A harmonic minor in 3/4 (12 steps per bar): Am Am Dm Dm E E Am G#dim
  const HAL_PROG = [[45, 'm'], [45, 'm'], [50, 'm'], [50, 'm'], [52, 'maj'], [52, 'maj'], [45, 'm'], [44, 'dim']];
  const HAL_NAT = [69, 71, 72, 74, 76, 77, 79, 81, 83];          // A natural minor, A4..B5
  const HAL_HARM = [69, 71, 72, 74, 76, 77, 80, 81, 83];         // harmonic minor (G# for the E and G#dim bars)

  class Audio8 {
    constructor() {
      this.ctx = null;
      this.musicOn = true;
      this.sfxOn = true;
      this.musicVol = 70;        // 0-100 (sliders); 70 matches the old fixed loudness
      this.sfxVol = 80;
      this.intensity = 0;        // 0..1, brightens the arpeggio during hot streaks
      this.timer = null;
      this.step = 0;
      this.nextTime = 0;
      this.track = 'deep-space';
      this.stepLen = 60 / TRACKS['deep-space'].bpm / 4;
      this.TRACKS = TRACKS;
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
      this.sfxBus.gain.value = this.sfxOn ? this._sfxLevel() : 0;
      this.sfxBus.connect(this.master);

      this.musicBus = c.createGain();
      this.musicBus.gain.value = 0;
      this.musicBus.connect(this.master);

      // echo (feedback delay with a dark loop) for the dreamy tails
      this.delayIn = c.createGain();
      const delay = c.createDelay(1.5);
      delay.delayTime.value = (60 / BPM) * 0.75;           // dotted eighth (re-tuned per track)
      this.delay = delay;
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
      this._applyTrack();
    }

    _applyTrack() {
      const tr = TRACKS[this.track];
      this.stepLen = 60 / tr.bpm / 4;
      if (this.delay) this.delay.delayTime.setValueAtTime((60 / tr.bpm) * tr.echo, this.ctx.currentTime);
    }

    /** switch BGM track; if music is playing, fade out and restart on the new track */
    setTrack(id) {
      if (!TRACKS[id] || id === this.track) return;
      this.track = id;
      this.stepLen = 60 / TRACKS[id].bpm / 4;
      if (this.ctx && this.timer) {
        this.stopBgm();
        clearTimeout(this._swap);
        this._swap = setTimeout(() => { if (this.musicOn) this.startBgm(); }, 450);
      }
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
    _musicLevel() { const v = this.musicVol / 100; return 1.2 * v * v; }     // squared = feels linear to the ear
    _sfxLevel() { const v = this.sfxVol / 100; return 1.33 * v * v; }

    setMusicVolume(v) {
      this.musicVol = Math.max(0, Math.min(100, v));
      if (this.ctx && this.timer) this.musicBus.gain.setTargetAtTime(this._musicLevel(), this.ctx.currentTime, 0.05);
    }
    setSfxVolume(v) {
      this.sfxVol = Math.max(0, Math.min(100, v));
      if (this.ctx && this.sfxOn) this.sfxBus.gain.setTargetAtTime(this._sfxLevel(), this.ctx.currentTime, 0.02);
    }

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
      g.setTargetAtTime(on ? this._sfxLevel() : 0, this.ctx.currentTime, 0.02);
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
        case 'coin':
          this._voice(out, { freq: midi(83), t, dur: 0.07, wave: this.pulse25, vol: 0.11, r: 0.05 });
          this._voice(out, { freq: midi(88), t: t + 0.07, dur: 0.22, wave: this.pulse25, vol: 0.11, r: 0.2 });
          break;
        case 'unlock':
          arp([72, 76, 79, 84, 88, 91], 0.07, 'square', 0.09);
          arp([60, 64, 67, 72], 0.07, 'triangle', 0.1);
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
      this.musicBus.gain.linearRampToValueAtTime(this._musicLevel(), now + 2);
      this._applyTrack();
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
        this.nextTime += this.stepLen;
        this.step++;
      }
    }

    _chordAt(bar) {
      const prog = PROGRESSIONS[Math.floor(bar / 4) % PROGRESSIONS.length];
      const [root, type] = prog[bar % 4];
      return { root, tones: CHORDS[type] };
    }

    _playStep(step, t) {
      if (this.track === 'dreamy-day') this._stepDreamyDay(step, t);
      else if (this.track === 'phosphor') this._stepPhosphor(step, t);
      else if (this.track === 'haunted') this._stepHaunted(step, t);
      else this._stepDeepSpace(step, t);
    }

    /* ---------------------------------------------- DEEP SPACE (original) -- */
    _stepDeepSpace(step, t) {
      const s = step % 16;
      const bar = Math.floor(step / 16);
      const { root, tones } = this._chordAt(bar);
      const out = this.musicBus;
      const barLen = this.stepLen * 16;
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
          freq: midi(note), t, dur: this.stepLen * 1.6, wave: this.pulse25,
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

    /* ------------------------------------------------------- DREAMY DAY ---- */
    _stepDreamyDay(step, t) {
      const s = step % 16;
      const bar = Math.floor(step / 16);
      const L = this.stepLen;
      const out = this.musicBus;
      const [root, type] = DAY_PROGS[Math.floor(bar / 4) % DAY_PROGS.length][bar % 4];
      const tones = CHORDS[type];
      const padRoot = root < 47 ? root + 12 : root;
      let bass = 36 + (root % 12);
      if (bass < 40) bass += 12;

      if (s === 0) {                                   // airy pad
        tones.forEach((iv) => {
          this._voice(out, { freq: midi(padRoot + iv), t, dur: L * 15, type: 'triangle', vol: 0.03, a: 0.3, r: 1.0, lp: 2200, verb: 0.4, detune: Math.random() * 10 - 5 });
        });
      }
      const hop = { 0: 0, 6: 7, 8: 12, 14: 7 }[s];     // bouncy bass: root, 5th, octave, 5th
      if (hop != null) {
        this._voice(out, { freq: midi(bass + hop), t, dur: L * 1.4, type: 'triangle', vol: 0.1, a: 0.01, r: 0.15, lp: 900 });
      }
      if (s === 0 || s === 8) this._voice(out, { freq: 120, slideTo: 50, t, dur: 0.09, type: 'sine', vol: s === 0 ? 0.06 : 0.035, r: 0.04 });
      if (s % 2 === 0) this._noise(out, t, 0.035, s % 4 === 2 ? 0.018 : 0.008, 8000, null);   // shaker

      const pat = DAY_MOTIFS[(bar + Math.floor(bar / 4)) % DAY_MOTIFS.length];
      const idx = pat[s];
      if (idx != null && Math.random() > 0.08) {       // music-box melody
        const note = DAY_PENT[idx + (bar % 8 >= 4 ? 1 : 0)];
        this._voice(out, { freq: midi(note), t, dur: L * 1.3, wave: this.pulse125, vol: 0.04 + this.intensity * 0.02, a: 0.006, r: 0.3, lp: 3200 + this.intensity * 2400, delay: 0.5, verb: 0.3 });
        this._voice(out, { freq: midi(note + 12), t, dur: 0.03, type: 'sine', vol: 0.012, a: 0.004, r: 0.8, verb: 0.5 });
      }
      if (s % 4 === 2 && Math.random() < 0.1 + this.intensity * 0.05) {   // sparkle
        const note = padRoot + 24 + tones[Math.floor(Math.random() * tones.length)];
        this._voice(out, { freq: midi(note), t, dur: 0.05, type: 'sine', vol: 0.045, a: 0.004, r: 1.4, delay: 0.6, verb: 0.5 });
      }
    }

    /* ---------------------------------------------------- HAUNTED WALTZ ---- */
    _stepHaunted(step, t) {
      const s = step % 12;
      const bar = Math.floor(step / 12);
      const L = this.stepLen;
      const out = this.musicBus;
      const [root, type] = HAL_PROG[bar % HAL_PROG.length];
      const tones = CHORDS[type];
      const padRoot = root < 47 ? root + 12 : root;
      let bass = 36 + (root % 12);
      if (bass < 40) bass += 12;

      if (s === 0) {                                   // oom: organ-ish bass on beat 1
        this._voice(out, { freq: midi(bass), t, dur: L * 3.6, type: 'triangle', vol: 0.12, a: 0.01, r: 0.2, lp: 700 });
      }
      if (s === 4 || s === 8) {                        // pah-pah: plucked chord on beats 2 and 3
        tones.forEach((iv) => {
          this._voice(out, { freq: midi(padRoot + iv), t, dur: L * 2.2, wave: this.pulse25, vol: 0.026, a: 0.005, r: 0.15, lp: 1800, verb: 0.25 });
        });
      }
      if (s === 0 && bar % 2 === 0) {                  // eerie organ drone (two detuned saws)
        [0, 7].forEach((iv, k) => {
          this._voice(out, { freq: midi(padRoot - 12 + iv), t, dur: L * 24, type: 'sawtooth', vol: 0.014, a: 0.8, r: 1.5, lp: 500, verb: 0.5, detune: k ? 9 : -9 });
        });
      }
      if (s === 0 && bar % 4 === 0) {                  // church bell toll (inharmonic partials)
        [[1, 0.05], [2.76, 0.025], [5.4, 0.012]].forEach((p) => {
          this._voice(out, { freq: midi(57) * p[0], t, dur: 0.05, type: 'sine', vol: p[1], a: 0.004, r: 3.5, verb: 0.6 });
        });
      }

      // music-box melody: random walk on the scale, snapping to chord tones on strong beats
      const scale = root % 12 === 4 || root % 12 === 8 ? HAL_HARM : HAL_NAT;
      const hit = { 0: 1, 4: 0.55, 8: 0.55, 6: 0.22, 10: 0.22 }[s];
      if (hit && Math.random() < hit + this.intensity * 0.1) {
        if (this._melo == null) this._melo = 4;
        this._melo = Math.max(0, Math.min(scale.length - 1, this._melo + Math.floor(Math.random() * 5) - 2));
        if (s === 0) {                                 // strong beat: nearest chord tone
          const pcs = tones.map((iv) => (padRoot + iv) % 12);
          let best = this._melo;
          for (let d = 0; d < scale.length; d++) {
            const up = this._melo + d, down = this._melo - d;
            if (up < scale.length && pcs.includes(scale[up] % 12)) { best = up; break; }
            if (down >= 0 && pcs.includes(scale[down] % 12)) { best = down; break; }
          }
          this._melo = best;
        }
        const note = scale[this._melo];
        this._voice(out, { freq: midi(note), t, dur: L * 1.5, wave: this.pulse125, vol: 0.045, a: 0.004, r: 0.6, lp: 3800, delay: 0.75, verb: 0.35 });
        this._voice(out, { freq: midi(note + 12), t, dur: 0.03, type: 'sine', vol: 0.012, a: 0.004, r: 0.9, verb: 0.5 });
      }

      if (s === 0 && bar % 8 === 5 && Math.random() < 0.5) {   // theremin-style wail
        this._voice(out, { freq: midi(81), slideTo: midi(82.5), t, dur: L * 10, type: 'sine', vol: 0.02, a: 0.5, r: 0.8, delay: 0.75, verb: 0.6 });
      }
      if (s === 10 && Math.random() < 0.12) {                  // bat flutter
        for (let i = 0; i < 3; i++) this._noise(out, t + i * 0.05, 0.03, 0.02, 5000, null);
      }
      if (s === 0 && bar % 8 === 0 && Math.random() < 0.6) {   // wind
        this._noise(out, t, L * 20, 0.028, 200, 900);
      }
      if (s === 6 && bar % 4 === 2 && Math.random() < 0.3) {   // door creak
        this._voice(out, { freq: 180, slideTo: 230, t, dur: 0.35, type: 'sawtooth', vol: 0.015, a: 0.05, r: 0.1, lp: 700 });
      }
    }

    /* --------------------------------------------------------- PHOSPHOR ---- */
    _stepPhosphor(step, t) {
      const s = step % 16;
      const bar = Math.floor(step / 16);
      const L = this.stepLen;
      const out = this.musicBus;
      const [root, type] = PHOS_PROGS[Math.floor(bar / 4) % PHOS_PROGS.length][bar % 4];
      const tones = CHORDS[type];
      const padRoot = root < 47 ? root + 12 : root;
      let bass = 36 + (root % 12);
      if (bass < 40) bass += 12;
      const breakdown = bar % 8 === 7;                 // every 8th bar the drums drop out

      if (!breakdown) {
        if (s === 0 || s === 8 || (s === 6 && bar % 2 === 1)) {                          // kick
          this._voice(out, { freq: 150, slideTo: 45, t, dur: 0.1, type: 'sine', vol: s === 6 ? 0.08 : 0.13, r: 0.04 });
        }
        if (s === 4 || s === 12) {                                                       // snare
          this._noise(out, t, 0.11, 0.07, 1200, 7000);
          this._voice(out, { freq: 210, slideTo: 120, t, dur: 0.06, type: 'triangle', vol: 0.05, r: 0.05 });
        }
      }
      if (s % 2 === 0) this._noise(out, t, 0.025, s % 4 === 2 ? 0.02 : 0.01, 9000, null); // hats

      if (s % 2 === 0) {                                                                 // square bass, 8ths
        const n = bass + (s % 8 === 6 ? 12 : 0);
        this._voice(out, { freq: midi(n), t, dur: L * 1.7, wave: this.pulse125, vol: 0.075, a: 0.004, r: 0.05, lp: 1100 });
      }
      if (s === 0) {                                                                     // buzzy pad
        tones.forEach((iv) => {
          this._voice(out, { freq: midi(padRoot + iv), t, dur: L * 15, type: 'sawtooth', vol: 0.014, a: 0.15, r: 0.6, lp: 800, verb: 0.3 });
        });
      }

      const pool = tones.map((iv) => padRoot + 12 + iv);                                 // 16th arpeggio
      pool.push(pool[0] + 12);
      if (Math.random() > 0.12) {
        const note = pool[[0, 1, 2, 3, 2, 1, 2, 3][s % 8]];
        this._voice(out, { freq: midi(note), t, dur: L * 0.85, wave: this.pulse25, vol: 0.026 + this.intensity * 0.014, a: 0.003, r: 0.05, lp: 2400 + this.intensity * 2400, delay: 0.22 });
      }

      if (s % 4 === 0 && bar % 2 === 1 && Math.random() < 0.3 + this.intensity * 0.15) { // lead beeps
        const lead = root === 52 ? [69, 76, 81] : PHOS_LEAD;                             // E bar: avoid the G natural
        const note = lead[Math.floor(Math.random() * lead.length)];
        this._voice(out, { freq: midi(note), t, dur: L * 1.6, type: 'square', vol: 0.035, a: 0.004, r: 0.25, lp: 3000, delay: 0.55, verb: 0.25 });
      }
      if (s === 15 && Math.random() < 0.3) {                                             // data chirp
        this._voice(out, { freq: midi(93), slideTo: midi(81), t, dur: 0.06, type: 'square', vol: 0.02, r: 0.04 });
      }
    }
  }

  const NS = (root.PiGame = root.PiGame || {});
  NS.audio = new Audio8();
})(typeof window !== 'undefined' ? window : globalThis);
