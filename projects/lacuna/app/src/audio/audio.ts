// All sound is SYNTHESIZED with the Web Audio API — no audio files, so it's original,
// tiny, offline, and licence-free.
//
// Two worlds kept deliberately separate so the music never sounds like a game cue:
//   • SFX live in the MID band (~390–990 Hz): per-player placement triads voiced as warm,
//     soft synth tones, plus a tiny click.
//   • Music lives LOW (drones + plucks ≤ ~330 Hz) and HIGH (sparkles ≥ 1046 Hz), and moves
//     through a slow chord progression with a long intensity swell for shape.

export type SfxName = "select" | "place" | "pickup" | "collect" | "harvest" | "click" | "win";

// Each flower COLOUR has its own root note; the PLAYER decides the quality — the GOLD seat
// always plays the triad MAJOR and the SILVER seat plays the same root in MINOR (so on by
// seat parity: even seats major, odd seats minor). The interaction arpeggiates that triad in
// thirds: select a flower = root, place the pawn = third, and taking the flowers rings the
// fifth a beat later. Roots sit clear of the music's bands (~349–660 Hz → fifths ≤ ~989).
const COLOR_ROOTS = [349.23, 392.0, 440.0, 493.88, 523.25, 587.33, 659.25]; // F4 G4 A4 B4 C5 D5 E5
function triadFor(color: number, player: number): number[] {
  const root = COLOR_ROOTS[((color % COLOR_ROOTS.length) + COLOR_ROOTS.length) % COLOR_ROOTS.length];
  const major = (((player % 2) + 2) % 2) === 0; // Gold seat (0) → major, Silver seat (1) → minor
  return [root, root * Math.pow(2, (major ? 4 : 3) / 12), root * Math.pow(2, 7 / 12)];
}

// The warm synth voice: a small stack of oscillators per note — a triangle fundamental, a
// gently detuned sine for chorus shimmer, and a faint sub-octave sine for body. `mult`
// scales the frequency, `detune` is in cents, `amp` its relative level.
const WARM_VOICES: { type: OscillatorType; mult: number; detune: number; amp: number }[] = [
  { type: "triangle", mult: 1, detune: 0, amp: 0.6 },
  { type: "sine", mult: 1, detune: 7, amp: 0.45 }, // chorus shimmer
  { type: "sine", mult: 0.5, detune: 0, amp: 0.3 }, // sub-octave body
];

// Music registers (A/C pentatonic — consonant over the whole bass progression), kept clear
// of the SFX band above.
const LOW_SCALE = [130.81, 146.83, 164.81, 196.0, 220.0, 261.63, 293.66, 329.63]; // C3..E4
const HIGH_SPARKLE = [1046.5, 1174.66, 1318.51, 1567.98]; // C6 D6 E6 G6
const PROG_BASS = [110.0, 87.31, 130.81, 98.0]; // A2 F2 C3 G2 — a gentle vi–IV–I–V loop

const MUSIC_MAX = 0.23; // musicGain level at full volume
const SFX_MAX = 0.78; // sfxGain level at full volume

type Win = typeof window & { webkitAudioContext?: typeof AudioContext };

class AudioEngine {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private delay: DelayNode | null = null;
  private padTimer: ReturnType<typeof setTimeout> | null = null;
  private harmonyTimer: ReturnType<typeof setTimeout> | null = null;
  private droneNodes: AudioScheduledSourceNode[] = [];
  private droneSub: OscillatorNode | null = null;
  private droneRoot: OscillatorNode | null = null;
  private droneFifth: OscillatorNode | null = null;
  private chordIndex = 0;
  music = true;
  sfx = true;
  musicVolume = 0.7;
  sfxVolume = 0.8;

  // Lazily build the graph (must follow a user gesture; browsers block autoplay).
  private ensure(): boolean {
    if (this.ctx) return true;
    const AC = window.AudioContext || (window as Win).webkitAudioContext;
    if (!AC) return false;
    const ctx = new AC();
    this.ctx = ctx;
    const master = ctx.createGain();
    master.gain.value = 0.85;
    master.connect(ctx.destination);

    // Feedback delay → a soft "room" tail. Music sends to it generously; SFX only a touch.
    const delay = ctx.createDelay(1.0);
    delay.delayTime.value = 0.33;
    const fb = ctx.createGain();
    fb.gain.value = 0.33;
    delay.connect(fb);
    fb.connect(delay);
    const wet = ctx.createGain();
    wet.gain.value = 0.5;
    delay.connect(wet);
    wet.connect(master);
    this.delay = delay;

    const musicGain = ctx.createGain();
    musicGain.gain.value = 0.0001;
    musicGain.connect(master);
    musicGain.connect(delay);
    this.musicGain = musicGain;

    const sfxGain = ctx.createGain();
    sfxGain.gain.value = SFX_MAX * this.sfxVolume;
    // A gentle limiter so the nightfall "symphony" (many overlapping warm chords) never clips.
    const sfxComp = ctx.createDynamicsCompressor();
    sfxComp.threshold.value = -12;
    sfxComp.knee.value = 24;
    sfxComp.ratio.value = 4;
    sfxComp.attack.value = 0.003;
    sfxComp.release.value = 0.25;
    sfxGain.connect(sfxComp);
    sfxComp.connect(master);
    const sfxWet = ctx.createGain();
    sfxWet.gain.value = 0.06; // a hint of tail; placement stays crisp/dry
    sfxGain.connect(sfxWet);
    sfxWet.connect(delay);
    this.sfxGain = sfxGain;
    return true;
  }

  // Call on the first user gesture: resumes the context and (if enabled) starts music.
  // IMPORTANT: start the drones only AFTER resume() resolves — oscillators started while the
  // context is still suspended can be dropped by the browser, and since startMusic() then
  // holds padTimer, music would never retry. Awaiting resume avoids that race.
  unlock(): void {
    if (!this.ensure()) return;
    this.whenRunning(() => {
      if (this.music) this.startMusic();
    });
  }

  setMusic(on: boolean): void {
    this.music = on;
    if (!this.ctx) return;
    if (on) this.whenRunning(() => this.startMusic());
    else this.stopMusic();
  }

  // Run `fn` once the context is actually running (resuming it first if needed). Guards the
  // autoplay race where work scheduled on a suspended context is silently dropped.
  private whenRunning(fn: () => void): void {
    const ctx = this.ctx;
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume().then(fn, fn);
    else fn();
  }

  setSfx(on: boolean): void {
    this.sfx = on;
  }

  setMusicVolume(v: number): void {
    this.musicVolume = Math.max(0, Math.min(1, v));
    if (!this.ctx || !this.musicGain || !this.music) return;
    const t = this.ctx.currentTime;
    this.musicGain.gain.cancelScheduledValues(t);
    this.musicGain.gain.setValueAtTime(Math.max(0.0001, this.musicGain.gain.value), t);
    this.musicGain.gain.linearRampToValueAtTime(Math.max(0.0001, MUSIC_MAX * this.musicVolume), t + 0.3);
  }

  setSfxVolume(v: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, v));
    if (this.ctx && this.sfxGain) this.sfxGain.gain.value = SFX_MAX * this.sfxVolume;
  }

  // ── Music ──────────────────────────────────────────────────────────────────────
  private startMusic(): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicGain || this.padTimer != null) return;
    const t = ctx.currentTime;
    this.musicGain.gain.cancelScheduledValues(t);
    this.musicGain.gain.setValueAtTime(Math.max(0.0001, this.musicGain.gain.value), t);
    this.musicGain.gain.linearRampToValueAtTime(Math.max(0.0001, MUSIC_MAX * this.musicVolume), t + 4);

    // A low triangle through a slowly-swept lowpass; returns the osc so the harmony loop
    // can retune it as the chord changes.
    const drone = (freq: number, detune: number, gain: number, cutoff: number): OscillatorNode => {
      const o = ctx.createOscillator();
      o.type = "triangle";
      o.frequency.value = freq;
      o.detune.value = detune;
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = cutoff;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.04 + Math.random() * 0.04;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 240;
      lfo.connect(lfoGain);
      lfoGain.connect(f.frequency);
      const g = ctx.createGain();
      g.gain.value = gain;
      o.connect(f);
      f.connect(g);
      g.connect(this.musicGain!);
      o.start();
      lfo.start();
      this.droneNodes.push(o, lfo);
      return o;
    };
    this.chordIndex = 0;
    const root = PROG_BASS[0];
    this.droneSub = drone(root / 2, 0, 0.05, 200); // sub-bass — warmth & depth
    this.droneRoot = drone(root, -4, 0.06, 600); // root
    this.droneFifth = drone(root * 1.5, 5, 0.05, 600); // a fifth above

    this.startAirPad(); // airy filtered-noise wash
    this.harmonyTimer = setTimeout(() => this.advanceHarmony(), 16000 + Math.random() * 8000);

    const tick = () => {
      if (!this.ctx || !this.music) {
        this.padTimer = null;
        return;
      }
      const now = this.ctx.currentTime;
      // A slow ~75s swell shapes density, loudness, and how often chords/sparkles appear.
      const intensity = 0.5 + 0.5 * Math.sin((now * 2 * Math.PI) / 75);
      // Gentle dynamic shape: ride the music bus between ~80–100% of the set volume.
      const target = MUSIC_MAX * this.musicVolume * (0.8 + 0.2 * intensity);
      this.musicGain!.gain.cancelScheduledValues(now);
      this.musicGain!.gain.setValueAtTime(Math.max(0.0001, this.musicGain!.gain.value), now);
      this.musicGain!.gain.linearRampToValueAtTime(Math.max(0.0001, target), now + 6);

      const n = 1 + Math.round(intensity * 2); // 1–3 plucks per window
      for (let i = 0; i < n; i++) {
        const f = LOW_SCALE[Math.floor(Math.random() * LOW_SCALE.length)];
        this.pluck(f, now + Math.random() * 5.5, 0.04 + 0.03 * intensity);
      }
      if (Math.random() < 0.3 + 0.35 * intensity) this.chord(now + Math.random() * 3);
      if (Math.random() < 0.15 + 0.3 * intensity)
        this.sparkle(HIGH_SPARKLE[Math.floor(Math.random() * HIGH_SPARKLE.length)], now + Math.random() * 5);

      this.padTimer = setTimeout(tick, 5000 + Math.random() * 4000);
    };
    tick();
  }

  // Move the drone (and so the harmony) one step along the bass progression, gliding the
  // oscillators smoothly to the new chord — this is the sense of "progression".
  private advanceHarmony(): void {
    const ctx = this.ctx;
    if (!ctx || !this.music) {
      this.harmonyTimer = null;
      return;
    }
    this.chordIndex = (this.chordIndex + 1) % PROG_BASS.length;
    const root = PROG_BASS[this.chordIndex];
    const t = ctx.currentTime;
    const glide = (o: OscillatorNode | null, f: number) => {
      if (!o) return;
      o.frequency.cancelScheduledValues(t);
      o.frequency.setValueAtTime(o.frequency.value, t);
      o.frequency.exponentialRampToValueAtTime(Math.max(1, f), t + 3.5);
    };
    glide(this.droneSub, root / 2);
    glide(this.droneRoot, root);
    glide(this.droneFifth, root * 1.5);
    this.harmonyTimer = setTimeout(() => this.advanceHarmony(), 16000 + Math.random() * 9000);
  }

  private startAirPad(): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicGain) return;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 2), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 420;
    f.Q.value = 0.6;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.06;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 140;
    lfo.connect(lfoGain);
    lfoGain.connect(f.frequency);
    const g = ctx.createGain();
    g.gain.value = 0.02;
    src.connect(f);
    f.connect(g);
    g.connect(this.musicGain);
    src.start();
    lfo.start();
    this.droneNodes.push(src, lfo);
  }

  // A soft low chord swell on the CURRENT progression root — gentle harmonic movement.
  private chord(when: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicGain) return;
    const r = PROG_BASS[this.chordIndex];
    for (const freq of [r, r * 1.5, r * 2]) {
      const o = ctx.createOscillator();
      o.type = "triangle";
      o.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, when);
      g.gain.linearRampToValueAtTime(0.045, when + 2.6);
      g.gain.exponentialRampToValueAtTime(0.0001, when + 8);
      o.connect(g);
      g.connect(this.musicGain);
      g.connect(this.delay!);
      o.start(when);
      o.stop(when + 8.2);
    }
  }

  // A faint, very high two-partial sparkle (well above the SFX band) into the delay tail.
  private sparkle(freq: number, when: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicGain) return;
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = freq;
    const o2 = ctx.createOscillator();
    o2.type = "sine";
    o2.frequency.value = freq * 2.01;
    const g2 = ctx.createGain();
    g2.gain.value = 0.35;
    o2.connect(g2);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(0.03, when + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 3.4);
    g2.connect(g);
    o.connect(g);
    g.connect(this.musicGain);
    g.connect(this.delay!);
    o.start(when);
    o.stop(when + 3.5);
    o2.start(when);
    o2.stop(when + 3.5);
  }

  private pluck(freq: number, when: number, gain: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicGain) return;
    const o = ctx.createOscillator();
    o.type = "triangle"; // softer than the SFX sines, in a lower register
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(gain, when + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 2.4);
    o.connect(g);
    g.connect(this.musicGain);
    g.connect(this.delay!);
    o.start(when);
    o.stop(when + 2.5);
  }

  private stopMusic(): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicGain) return;
    const t = ctx.currentTime;
    this.musicGain.gain.cancelScheduledValues(t);
    this.musicGain.gain.setValueAtTime(Math.max(0.0001, this.musicGain.gain.value), t);
    this.musicGain.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    if (this.padTimer != null) {
      clearTimeout(this.padTimer);
      this.padTimer = null;
    }
    if (this.harmonyTimer != null) {
      clearTimeout(this.harmonyTimer);
      this.harmonyTimer = null;
    }
    for (const o of this.droneNodes) {
      try {
        o.stop(t + 1.7);
      } catch {
        /* already stopped */
      }
    }
    this.droneNodes = [];
    this.droneSub = this.droneRoot = this.droneFifth = null;
  }

  // ── SFX ────────────────────────────────────────────────────────────────────────
  play(name: SfxName, color = 0, player = 0): void {
    if (!this.sfx || !this.ensure()) return;
    if (this.ctx!.state === "suspended") void this.ctx!.resume();
    const tri = triadFor(color, player);
    switch (name) {
      case "select":
        this.note(tri[0]); // root of the terz — selecting a flower
        break;
      case "place":
        // The third is the lead, over a soft root so the interval reads unmistakably as
        // MAJOR (Gold) or MINOR (Silver) — this is where the per-player quality is heard.
        this.note(tri[1]);
        this.note(tri[0], 0.13);
        break;
      case "collect":
        this.note(tri[2], 0.3, 0.5); // fifth — the flowers land ~half a second later
        break;
      case "pickup":
        for (const f of tri) this.note(f, 0.18); // the whole chord (reclaiming your own pawn)
        break;
      case "harvest":
        // Nightfall: each leftover flower rings a SINGLE warm note — its colour's root — as
        // it's claimed; the roots span a clean diatonic scale, so in sequence they play out
        // as a melodic final symphony. Sent through the reverb tail to bloom into the music.
        this.note(tri[0], 0.2, 0, true);
        break;
      case "click":
        this.blip([1180], 0.05, 0.1, "triangle"); // tiny tick
        break;
      case "win":
        this.winFanfare(player);
        break;
    }
  }

  // The voice of the placement triad: a WARM, SOFT synth tone — a triangle fundamental plus a
  // gently detuned sine and a faint sub-octave, run through a mellow lowpass with a soft
  // swell-in and a long, smooth release (rounded and pillowy, never percussive). `delaySec`
  // schedules it ahead of now; `tail` adds a reverb send (used by the win flourish).
  private note(freq: number, gain = 0.3, delaySec = 0, tail = false): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime + delaySec;

    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = Math.min(3000, freq * 5); // roll off the highs for warmth
    lp.Q.value = 0.4;

    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.linearRampToValueAtTime(gain, t + 0.04); // soft swell-in (not a pluck)
    out.gain.exponentialRampToValueAtTime(0.0001, t + 1.4); // long, smooth tail
    lp.connect(out);
    out.connect(this.sfxGain);
    if (tail && this.delay) out.connect(this.delay);

    for (const v of WARM_VOICES) {
      const o = ctx.createOscillator();
      o.type = v.type;
      o.frequency.value = freq * v.mult;
      o.detune.value = v.detune;
      const g = ctx.createGain();
      g.gain.value = v.amp;
      o.connect(g);
      g.connect(lp);
      o.start(t);
      o.stop(t + 1.5);
    }
  }

  private blip(freqs: number[], dur: number, gain: number, type: OscillatorType): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;
    for (const freq of freqs) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(gain, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(this.sfxGain);
      o.start(t);
      o.stop(t + dur + 0.02);
    }
  }

  // The win flourish: a rising arpeggio in the winner's quality, voiced on the warm synth
  // with a reverb tail so it rings out.
  private winFanfare(player: number): void {
    if (!this.ctx) return;
    const tri = triadFor(4, player); // a C-rooted triad in the winner's quality
    const notes = [tri[0], tri[1], tri[2], tri[2] * 1.5, tri[2] * 2]; // rising flourish
    notes.forEach((f, i) => this.note(f, 0.24, i * 0.14, true));
  }

  // Dev-only introspection for the playtest probe (not used in app logic).
  snapshot(): Record<string, unknown> {
    return {
      ctxState: this.ctx?.state ?? "none",
      music: this.music,
      musicVolume: this.musicVolume,
      musicGain: this.musicGain?.gain.value ?? null,
      droneCount: this.droneNodes.length,
      padActive: this.padTimer != null,
    };
  }
}

export const audio = new AudioEngine();
