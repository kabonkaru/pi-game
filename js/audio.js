/* ==========================================================================
   audio.js  -  everything you hear is synthesised live with the Web Audio API
   (no audio files to download or license).

   * SFX : chiptune blips. Key presses climb a pentatonic scale as your score
           grows, so a long run literally sounds like it is going up.
   * BGM : generative tracks (see TRACKS), one bundled with each theme:
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
    'chill':      { name: 'CHILL',         bpm: 72,  echo: 0.75 },                  // default for plain themes
    'singularity': { name: 'EVENT HORIZON', bpm: 60, echo: 0.75 },
    'trick':      { name: 'TRICK OR TREAT',   bpm: 112, echo: 0.75 },   // Pi Fright! (v1.5.5): one track per tier
    'manor':      { name: 'MANOR HOURS',      bpm: 66,  echo: 0.75 },
    'backrooms':  { name: 'FLUORESCENT HUM',  bpm: 54,  echo: 0.75 },
    'carnival':   { name: 'CURSED CALLIOPE',  bpm: 132, echo: 0.5 },
    'eldritch':   { name: 'ELDRITCH DRONE',   bpm: 48,  echo: 0.75 },
    'shop':       { name: 'SHOP',          bpm: 104, echo: 0.75, hidden: true },   // plays in the shop only (not in the picker)
  };
  CHORDS.m7 = CHORDS.m7 || [0, 3, 7, 10];
  CHORDS.dom7 = [0, 4, 7, 10];
  CHORDS.m9 = [0, 3, 7, 10, 14];
  CHORDS.maj9 = [0, 4, 7, 11, 14];
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

  // CHILL (lo-fi): Dm9 G7 Cmaj7 Am7 / Fmaj7 Dm7 G7 Cmaj7
  const CHILL_PROG = [[50, 'm9'], [43, 'dom7'], [48, 'maj7'], [45, 'm7'], [41, 'maj7'], [50, 'm7'], [43, 'dom7'], [48, 'maj7']];
  const CHILL_PENT = [62, 65, 67, 69, 72, 74, 77];                // D minor pentatonic-ish, D4..F5
  // SHOP: bright and a little mysterious. Cmaj7 Am7 Fmaj7 G7
  const SHOP_PROG = [[48, 'maj7'], [45, 'm7'], [41, 'maj7'], [43, 'dom7']];
  const SHOP_PENT = [72, 74, 76, 79, 81, 84];
  // EVENT HORIZON: a slow drone around D, stacked fifths
  const HORIZON_PING = [74, 77, 81, 86, 88];

  // v1.5.5: tracks for Pi Fright! (Trick or Treat is the Common Halloween track)
  const TRICK_PROG = [[45, 'm'], [50, 'm'], [52, 'maj'], [45, 'm']];                           // A harmonic minor
  const TRICK_SCALE = [69, 71, 72, 74, 76, 77, 80, 81, 83, 84];
  const MANOR_PROG = [[50, 'm'], [46, 'maj'], [43, 'm'], [45, 'maj']];                         // Dm Bb Gm A
  const CAR_PROG = [[50, 'm'], [45, 'maj'], [50, 'm'], [43, 'm'], [45, 'maj'], [50, 'm']];     // D minor oom-pah
  const CAR_SCALE = [62, 64, 65, 67, 69, 70, 73, 74, 76, 77, 79, 81];                          // D harmonic minor

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
      const lim = c.createDynamicsCompressor();             // v1.5.2: safety limiter so 200% volume cannot clip
      lim.threshold.value = -3; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.1;
      comp.connect(lim);
      lim.connect(c.destination);

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
    _musicLevel() { const v = this.musicVol / 100; return v <= 1 ? 1.2 * v * v : 1.2 * v; }     // squared = feels linear to the ear
    _sfxLevel() { const v = this.sfxVol / 100; return v <= 1 ? 1.33 * v * v : 1.33 * v; }

    setMusicVolume(v) {
      this.musicVol = Math.max(0, Math.min(200, v));
      if (this.ctx && this.timer) this.musicBus.gain.setTargetAtTime(this._musicLevel(), this.ctx.currentTime, 0.05);
    }
    setSfxVolume(v) {
      this.sfxVol = Math.max(0, Math.min(200, v));
      if (this.ctx && this.sfxOn) this.sfxBus.gain.setTargetAtTime(this._sfxLevel(), this.ctx.currentTime, 0.02);
    }

    /** lower the music while something dramatic happens (the chest opening) */
    duck(on) {
      if (!this.ctx || !this.timer) return;
      this.musicBus.gain.setTargetAtTime(on ? this._musicLevel() * 0.22 : this._musicLevel(), this.ctx.currentTime, 0.12);
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
        case 'pull_tick': {                          // chest build-up: pitch climbs with o.n (0..1)
          const n = o.n || 0;
          this._voice(out, { freq: midi(60 + Math.round(n * 19)), t, dur: 0.05, wave: this.pulse25, vol: 0.06 + n * 0.05, r: 0.04 });
          break;
        }
        case 'pull_rumble':
          this._noise(out, t, 1.0, 0.1, 40, 500);
          this._voice(out, { freq: 50, slideTo: 90, t, dur: 1.0, type: 'sine', vol: 0.1, a: 0.1, r: 0.2 });
          break;
        case 'pull_boom': {                          // the explosion; bigger for higher rarities
          const k = { common: 0.6, epic: 0.75, legendary: 0.9, mythic: 1.05, godly: 1.3 }[o.rarity] || 0.7;
          this._voice(out, { freq: 140, slideTo: 32, t, dur: 0.45, type: 'sine', vol: 0.2 * k, r: 0.2 });
          this._noise(out, t, 0.4, 0.14 * k, 200, 5000);
          this._voice(out, { freq: midi(48), slideTo: midi(96), t, dur: 0.25, type: 'sawtooth', vol: 0.05 * k, r: 0.15, lp: 3000 });
          break;
        }
        case 'pull_reveal': {                        // rarity stinger
          const r = o.rarity || 'common';
          if (r === 'common') arp([72, 76], 0.08, 'triangle', 0.09, 0.2);
          else if (r === 'epic') arp([64, 69, 73, 76], 0.08, 'triangle', 0.1, 0.25);
          else if (r === 'legendary') { arp([60, 64, 67, 72, 76, 79], 0.07, 'square', 0.08, 0.3); arp([48, 55, 60], 0.14, 'triangle', 0.1, 0.5); }
          else if (r === 'mythic') { arp([57, 60, 64, 69, 72, 76, 81], 0.065, 'square', 0.08, 0.35); arp([45, 52, 57, 64], 0.12, 'sawtooth', 0.04, 0.6); }
          else { arp([48, 55, 60, 67, 72, 79, 84, 91, 96], 0.085, 'sine', 0.1, 0.7); arp([36, 43, 48], 0.25, 'sawtooth', 0.05, 1.2); this._noise(out, t, 1.2, 0.05, 100, 900); }
          break;
        }
        case 'fakeout_up': arp([60, 64, 67, 71, 74, 78, 81, 85], 0.07, 'square', 0.08, 0.2); break;
        case 'fakeout_drop':                         // sad trombone
          [58, 57, 56, 54].forEach((n, i) => this._voice(out, { freq: midi(n), t: t + i * 0.22, dur: i === 3 ? 0.7 : 0.2, type: 'sawtooth', vol: 0.07, a: 0.02, r: 0.12, lp: 900 }));
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
      else if (this.track === 'chill') this._stepChill(step, t);
      else if (this.track === 'shop') this._stepShop(step, t);
      else if (this.track === 'singularity') this._stepHorizon(step, t);
      else if (this.track === 'trick') this._stepTrick(step, t);
      else if (this.track === 'manor') this._stepManor(step, t);
      else if (this.track === 'backrooms') this._stepBackrooms(step, t);
      else if (this.track === 'carnival') this._stepCarnival(step, t);
      else if (this.track === 'eldritch') this._stepEldritch(step, t);
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

    /* ------------------------------------------------------------ CHILL ---- */
    _stepChill(step, t) {
      const s = step % 16, bar = Math.floor(step / 16), L = this.stepLen, out = this.musicBus;
      const [root, type] = CHILL_PROG[bar % CHILL_PROG.length];
      const tones = CHORDS[type];
      const padRoot = root < 47 ? root + 12 : root;
      let bass = 36 + (root % 12); if (bass < 38) bass += 12;
      const swing = s % 4 === 2 ? L * 0.3 : 0;                                    // lazy lo-fi swing on the off-8ths
      if (s === 0 || s === 10) {                                                  // soft electric-piano chord, gently strummed
        tones.forEach((iv, i) => this._voice(out, { freq: midi(padRoot + iv), t: t + i * 0.014, dur: L * (s === 0 ? 9 : 5), type: 'triangle', vol: 0.026, a: 0.02, r: 0.7, lp: 1500, verb: 0.35 }));
      }
      if (s === 0 || s === 8) this._voice(out, { freq: midi(bass), t, dur: L * 3, type: 'sine', vol: 0.1, a: 0.01, r: 0.2, lp: 500 });
      if (s === 14 && bar % 2 === 1) this._voice(out, { freq: midi(bass + 7), t, dur: L * 1.5, type: 'sine', vol: 0.06, a: 0.01, r: 0.15, lp: 500 });
      if (s === 0 || s === 10) this._voice(out, { freq: 115, slideTo: 48, t, dur: 0.12, type: 'sine', vol: 0.06, r: 0.05 });   // soft kick
      if (s === 8) this._noise(out, t, 0.09, 0.03, 1400, 6000);                                                           // rim/snare
      if (s % 2 === 0) this._noise(out, t + swing, 0.03, s % 4 === 0 ? 0.008 : 0.005, 8000, null);                        // hat
      if (Math.random() < 0.12) this._noise(out, t, 0.01, 0.004, 3000, null);                                              // vinyl crackle
      if (s % 2 === 0 && Math.random() < 0.22) {                                                                          // sparse melody
        const note = CHILL_PENT[Math.floor(Math.random() * CHILL_PENT.length)];
        this._voice(out, { freq: midi(note), t: t + swing, dur: L * 2, type: 'sine', vol: 0.035, a: 0.01, r: 0.6, lp: 2400, delay: 0.7, verb: 0.4 });
      }
    }

    /* ------------------------------------------------------------- SHOP ---- */
    _stepShop(step, t) {
      const s = step % 16, bar = Math.floor(step / 16), L = this.stepLen, out = this.musicBus;
      const [root, type] = SHOP_PROG[bar % SHOP_PROG.length];
      const tones = CHORDS[type];
      const padRoot = root < 47 ? root + 12 : root;
      let bass = 36 + (root % 12); if (bass < 40) bass += 12;
      if ([0, 3, 6, 8, 11, 14].includes(s)) {                                     // bouncy bass: root / fifth
        this._voice(out, { freq: midi(bass + (s === 6 || s === 14 ? 7 : 0)), t, dur: L * 1.5, wave: this.pulse25, vol: 0.06, a: 0.004, r: 0.08, lp: 900 });
      }
      if (s === 0 || s === 8) this._voice(out, { freq: 140, slideTo: 50, t, dur: 0.1, type: 'sine', vol: 0.08, r: 0.04 });
      if (s === 4 || s === 12) this._noise(out, t, 0.08, 0.04, 1500, 7000);
      if (s % 2 === 0) this._noise(out, t, 0.02, 0.008, 9000, null);
      if (Math.random() < 0.8) {                                                  // twinkling arpeggio
        const pool = tones.map((iv) => padRoot + 12 + iv);
        const note = pool[[0, 1, 2, 3, 2, 1, 3, 2][s % 8] % pool.length] + (s % 8 > 5 ? 12 : 0);
        this._voice(out, { freq: midi(note), t, dur: L * 0.9, wave: this.pulse125, vol: 0.026 + this.intensity * 0.01, a: 0.003, r: 0.08, lp: 3200, delay: 0.5, verb: 0.2 });
      }
      if (s % 4 === 0 && Math.random() < 0.4) {                                   // glockenspiel
        const note = SHOP_PENT[Math.floor(Math.random() * SHOP_PENT.length)];
        this._voice(out, { freq: midi(note), t, dur: 0.03, type: 'sine', vol: 0.05, a: 0.003, r: 1.0, delay: 0.5, verb: 0.4 });
        this._voice(out, { freq: midi(note + 12), t, dur: 0.02, type: 'sine', vol: 0.014, a: 0.003, r: 0.6, verb: 0.4 });
      }
      if (s === 15 && Math.random() < 0.3) this._voice(out, { freq: midi(96), t, dur: 0.03, type: 'sine', vol: 0.03, a: 0.002, r: 0.5, verb: 0.5 });   // coin glint
    }

    /* ----------------------------------------------------- EVENT HORIZON ---- */
    _stepHorizon(step, t) {
      const s = step % 16, bar = Math.floor(step / 16), L = this.stepLen, out = this.musicBus;
      if (s === 0 && bar % 4 === 0) {                                              // deep drone + stacked fifths
        [[26, 0.05, 'sine'], [26, 0.02, 'sawtooth'], [33, 0.025, 'sine']].forEach((v, k) => {
          this._voice(out, { freq: midi(v[0]), t, dur: L * 62, type: v[2], vol: v[1], a: 2.5, r: 3, lp: v[2] === 'sawtooth' ? 260 : 900, detune: k === 1 ? 7 : 0, verb: 0.5 });
        });
        [57, 64, 71].forEach((n, k) => this._voice(out, { freq: midi(n), t: t + k * 0.8, dur: L * 56, type: 'sine', vol: 0.016, a: 3, r: 3, lp: 2200, verb: 0.7, detune: k * 4 - 4 }));
      }
      if (s === 0 || s === 6) {                                                    // heartbeat of the singularity
        this._voice(out, { freq: 90, slideTo: 38, t, dur: 0.18, type: 'sine', vol: s === 0 ? 0.09 : 0.055, r: 0.1, lp: 300 });
      }
      if (s === 0 && bar % 2 === 0) this._noise(out, t, L * 15, 0.012, 80, 500);   // distant wind of the accretion disk
      if (s % 4 === 2 && Math.random() < 0.16 + this.intensity * 0.1) {            // pings falling toward the horizon
        const note = HORIZON_PING[Math.floor(Math.random() * HORIZON_PING.length)];
        this._voice(out, { freq: midi(note), slideTo: midi(note - 1), t, dur: 0.05, type: 'sine', vol: 0.03, a: 0.01, r: 2.2, delay: 0.75, verb: 0.7 });
      }
      if (s === 8 && bar % 8 === 5) this._voice(out, { freq: midi(62), slideTo: midi(50), t, dur: L * 7, type: 'sine', vol: 0.03, a: 0.4, r: 1.2, verb: 0.6 });   // time dilation
    }

    /* ---------------------------------------------------- TRICK OR TREAT ---- */
    _stepTrick(step, t) {
      const s = step % 16, bar = Math.floor(step / 16), L = this.stepLen, out = this.musicBus;
      const [root, type] = TRICK_PROG[bar % TRICK_PROG.length], tones = CHORDS[type];
      let bass = 36 + (root % 12); if (bass < 38) bass += 12;
      if (s === 0 || s === 6 || s === 8 || s === 14) this._voice(out, { freq: midi(bass + (s === 6 || s === 14 ? 7 : 0)), t, dur: L * 1.2, type: 'triangle', vol: 0.11, a: 0.004, r: 0.1, lp: 800 });   // bouncy pizzicato bass
      if (s % 4 === 2) tones.forEach((iv) => this._voice(out, { freq: midi(root + 24 + iv), t, dur: L * 0.8, wave: this.pulse125, vol: 0.018, a: 0.003, r: 0.08, lp: 2600, verb: 0.2 }));   // off-beat stabs
      if (s === 4 || s === 12) this._noise(out, t, 0.03, 0.05, 2500, 8000);                                   // finger snaps
      if (s % 2 === 0) this._noise(out, t, 0.02, s % 4 === 0 ? 0.012 : 0.007, 8500, null);
      const hit = { 0: 0.9, 2: 0.4, 4: 0.6, 6: 0.4, 8: 0.7, 10: 0.4, 12: 0.6, 14: 0.5 }[s];
      if (hit && Math.random() < hit) {                                                                          // xylophone melody
        if (this._tm == null) this._tm = 4;
        this._tm = Math.max(0, Math.min(TRICK_SCALE.length - 1, this._tm + Math.floor(Math.random() * 5) - 2));
        const n = TRICK_SCALE[this._tm];
        this._voice(out, { freq: midi(n), t, dur: 0.03, type: 'sine', vol: 0.06, a: 0.002, r: 0.22, delay: 0.4, verb: 0.25 });
        this._voice(out, { freq: midi(n + 12), t, dur: 0.02, type: 'triangle', vol: 0.02, a: 0.002, r: 0.1 });
      }
      if (s === 15 && bar % 4 === 3 && Math.random() < 0.5) this._voice(out, { freq: midi(88), slideTo: midi(76), t, dur: 0.25, type: 'sine', vol: 0.03, a: 0.01, r: 0.3, verb: 0.5 });   // a little "boo" swoop
    }

    /* ----------------------------------------------------------- MANOR HOURS ---- */
    _stepManor(step, t) {
      const s = step % 16, bar = Math.floor(step / 16), L = this.stepLen, out = this.musicBus;
      const [root, type] = MANOR_PROG[bar % MANOR_PROG.length], tones = CHORDS[type];
      const padRoot = root < 47 ? root + 12 : root;
      if (s === 0) {
        tones.forEach((iv) => this._voice(out, { freq: midi(padRoot + iv), t, dur: L * 15, type: 'triangle', vol: 0.02, a: 0.8, r: 1.2, lp: 700, verb: 0.5, detune: Math.random() * 8 - 4 }));   // organ pad
        this._voice(out, { freq: midi(root - 12), t, dur: L * 14, type: 'sine', vol: 0.08, a: 0.05, r: 0.6, lp: 400 });
      }
      const pool = tones.map((iv) => padRoot + 12 + iv).concat(tones.map((iv) => padRoot + 24 + iv));
      if (s % 2 === 0 && Math.random() < 0.85) this._voice(out, { freq: midi(pool[[0, 1, 2, 3, 2, 1, 2, 1][s % 8] % pool.length]), t, dur: 0.04, wave: this.pulse125, vol: 0.035, a: 0.002, r: 0.35, lp: 3500, delay: 0.4, verb: 0.35 });   // harpsichord
      if (s % 4 === 0) {                                                                                         // the clock: tick, tock
        this._noise(out, t, 0.012, s % 8 === 0 ? 0.03 : 0.018, 2500, 7000);
        if (s % 8 === 0) this._voice(out, { freq: 170, slideTo: 120, t, dur: 0.05, type: 'sine', vol: 0.05, r: 0.08 });
      }
      if (s === 0 && bar % 8 === 3 && Math.random() < 0.6) this._noise(out, t, L * 14, 0.06, 30, 240);        // thunder far away
      if (s === 0 && bar % 4 === 0) this._noise(out, t, L * 16, 0.018, 300, 1100);                             // wind in the halls
    }

    /* ------------------------------------------------------- FLUORESCENT HUM ---- */
    _stepBackrooms(step, t) {
      const s = step % 16, bar = Math.floor(step / 16), L = this.stepLen, out = this.musicBus;
      if (s === 0 && bar % 4 === 0) {                                                                            // the hum never stops
        [[34, 0.05, 'sine', 0], [46, 0.022, 'sine', 5], [58, 0.012, 'sine', -6], [46, 0.01, 'sawtooth', 9]].forEach((v) =>
          this._voice(out, { freq: midi(v[0]), t, dur: L * 62, type: v[2], vol: v[1], a: 1.5, r: 2, lp: v[2] === 'sawtooth' ? 380 : 1200, detune: v[3] }));
      }
      if (s === 0 && bar % 2 === 0) [60, 64, 67, 71].forEach((n) => this._voice(out, { freq: midi(n), t, dur: L * 30, type: 'triangle', vol: 0.008, a: 1, r: 1.5, lp: 900, verb: 0.6, detune: Math.random() * 60 - 30 }));   // far-off, out-of-tune mall muzak
      if (s % 4 === 2 && Math.random() < 0.12) this._voice(out, { freq: midi(84 + Math.floor(Math.random() * 12)), t, dur: 0.05, type: 'sine', vol: 0.025, a: 0.01, r: 2.4, delay: 0.75, verb: 0.7 });   // echoing pings
      if (Math.random() < 0.05) this._noise(out, t, 0.008, 0.025, 4000, null);                                  // tube flicker
      if (s === 8 && bar % 8 === 5) this._voice(out, { freq: 70, slideTo: 40, t, dur: 0.4, type: 'sine', vol: 0.06, a: 0.01, r: 0.5, verb: 0.4 });   // a door, somewhere
    }

    /* ------------------------------------------------------- CURSED CALLIOPE ---- */
    _stepCarnival(step, t) {
      const s = step % 16, bar = Math.floor(step / 16), L = this.stepLen, out = this.musicBus;
      const [root, type] = CAR_PROG[bar % CAR_PROG.length], tones = CHORDS[type];
      let bass = 36 + (root % 12); if (bass < 38) bass += 12;
      if (s === 0 || s === 8) this._voice(out, { freq: midi(bass + (s === 8 ? 7 : 0)), t, dur: L * 3, type: 'triangle', vol: 0.12, a: 0.005, r: 0.12, lp: 700 });   // oom
      if (s === 4 || s === 12) {                                                                                 // pah
        tones.forEach((iv) => this._voice(out, { freq: midi(root + 12 + iv), t, dur: L * 2, wave: this.pulse25, vol: 0.022, a: 0.004, r: 0.1, lp: 2200, detune: Math.random() * 30 - 15 }));
        this._noise(out, t, 0.06, 0.04, 1500, 7000);
      }
      if (s % 2 === 0) this._noise(out, t, 0.02, 0.01, 9000, null);
      if (s % 2 === 0 && (s % 8 !== 6 || Math.random() < 0.6)) {                                                 // warped calliope lead
        if (this._cm == null) this._cm = 4;
        this._cm = Math.max(0, Math.min(CAR_SCALE.length - 1, this._cm + Math.floor(Math.random() * 5) - 2));
        const n = CAR_SCALE[this._cm] + (Math.random() < 0.04 ? 6 : 0);                                          // now and then, a wrong note
        [-18, 18].forEach((det) => this._voice(out, { freq: midi(n), t, dur: L * 1.5, wave: this.pulse125, vol: 0.024, a: 0.006, r: 0.12, lp: 3400, detune: det, slideTo: s === 14 ? midi(n - 1) : 0, delay: 0.3 }));
      }
      if (s === 10 && Math.random() < 0.15) this._voice(out, { freq: midi(100), t, dur: 0.03, type: 'sine', vol: 0.03, a: 0.002, r: 1.2, verb: 0.5 });   // a bell
    }

    /* ------------------------------------------------------ ELDRITCH DRONE ---- */
    _stepEldritch(step, t) {
      const s = step % 16, bar = Math.floor(step / 16), L = this.stepLen, out = this.musicBus;
      if (s === 0 && bar % 4 === 0) {                                                                            // sub-drone with a grinding minor second
        [[23, 0.06, 0], [24, 0.04, 7], [35, 0.02, -5]].forEach((v) => this._voice(out, { freq: midi(v[0]), t, dur: L * 62, type: 'sine', vol: v[1], a: 3, r: 3, lp: 500, detune: v[2], verb: 0.4 }));
        [47, 48, 54, 59].forEach((n, k) => this._voice(out, { freq: midi(n), t: t + k * 1.1, dur: L * 54, type: 'triangle', vol: 0.011, a: 4, r: 4, lp: 1100, verb: 0.8, detune: k * 7 - 10 }));   // choir cluster
      }
      if (s === 0 && bar % 3 === 1 && Math.random() < 0.5) this._voice(out, { freq: midi(76), slideTo: midi(62), t, dur: L * 10, type: 'sine', vol: 0.03, a: 0.5, r: 1.5, delay: 0.75, verb: 0.7 });   // something calling
      if (s === 0 && bar % 8 === 6) { this._voice(out, { freq: midi(40), t, dur: 0.05, type: 'sine', vol: 0.08, a: 0.005, r: 4, lp: 500, verb: 0.7 }); this._voice(out, { freq: midi(40) * 2.76, t, dur: 0.05, type: 'sine', vol: 0.03, a: 0.005, r: 3, verb: 0.7 }); }   // slow bell
      if (s % 8 === 4 && Math.random() < 0.25) this._noise(out, t, L * 6, 0.025, 60, 260);                       // scraping under the floor
      if (s % 8 === 0) this._voice(out, { freq: 60, slideTo: 32, t, dur: 0.4, type: 'sine', vol: 0.07, r: 0.3, lp: 200 });   // the slow pulse
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
